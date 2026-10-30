-- =============================================================================
-- Migration 044: Comprehensive Application & Database Security Hardening
-- Remediates SEC-002, SEC-004, SEC-006, SEC-011, SEC-019, and SEC-020
-- =============================================================================

-- 0. Ensure prerequisite columns exist on public.events and public.profiles
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- 1. Ensure and lock search_path on SECURITY DEFINER functions (SEC-020)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE public.user_roles.user_id = $1
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_staff'
  ) THEN
    ALTER FUNCTION public.is_staff(UUID) SET search_path = public, pg_temp;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
  END IF;
END $$;

-- 2. Prevent Self-Unban & Enforce Safe URL Schemes on public.profiles (SEC-004 & SEC-011)
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent non-admin users from modifying their own `is_banned` flag inside `privacy_settings`
  IF (OLD.privacy_settings->>'is_banned') IS DISTINCT FROM (NEW.privacy_settings->>'is_banned') THEN
    IF current_setting('role', true) != 'service_role' AND NOT public.is_admin(auth.uid()) THEN
      -- Restore the previous is_banned value so normal profile/notification updates still succeed
      NEW.privacy_settings = jsonb_set(
        COALESCE(NEW.privacy_settings, '{}'::jsonb),
        '{is_banned}',
        COALESCE(OLD.privacy_settings->'is_banned', 'false'::jsonb),
        true
      );
    END IF;
  END IF;

  -- Reject dangerous URI schemes (javascript:, data:, vbscript:) on social/website columns
  IF NEW.website IS NOT NULL AND NEW.website ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in website field';
  END IF;
  IF NEW.facebook_url IS NOT NULL AND NEW.facebook_url ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in facebook_url field';
  END IF;
  IF NEW.instagram_url IS NOT NULL AND NEW.instagram_url ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in instagram_url field';
  END IF;
  IF NEW.twitter_url IS NOT NULL AND NEW.twitter_url ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in twitter_url field';
  END IF;
  IF NEW.tiktok_url IS NOT NULL AND NEW.tiktok_url ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in tiktok_url field';
  END IF;
  IF NEW.linkedin_url IS NOT NULL AND NEW.linkedin_url ~* '^\s*(javascript|data|vbscript):' THEN
    RAISE EXCEPTION 'Invalid URL scheme in linkedin_url field';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
  BEFORE UPDATE OR INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_security();

-- 3. Harden Event Group Chat (`public.event_messages`) RLS Policies (SEC-006)
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access for event messages" ON public.event_messages;
DROP POLICY IF EXISTS "Allow authenticated insert for event messages" ON public.event_messages;
DROP POLICY IF EXISTS "Event messages read access" ON public.event_messages;
DROP POLICY IF EXISTS "Event messages insert access" ON public.event_messages;

-- Allow reading event messages if the event is public OR the user is the host/attendee
CREATE POLICY "Event messages read access"
  ON public.event_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_messages.event_id
        AND (
          COALESCE(e.visibility, 'public') = 'public'
          OR e.creator_id = auth.uid()
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.event_attendees ea
      WHERE ea.event_id = event_messages.event_id
        AND ea.user_id = auth.uid()
    )
  );

-- Allow sending event messages only if authenticated, sender_id = auth.uid(), not banned, and host or attendee
CREATE POLICY "Event messages insert access"
  ON public.event_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT COALESCE((SELECT (p.privacy_settings->>'is_banned')::boolean FROM public.profiles p WHERE p.id = auth.uid()), false)
    AND (
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_messages.event_id
          AND e.creator_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.event_attendees ea
        WHERE ea.event_id = event_messages.event_id
          AND ea.user_id = auth.uid()
      )
    )
  );

-- 4. Harden `public.notifications` INSERT RLS Policy (SEC-002)
DROP POLICY IF EXISTS "System and users can insert notifications" ON public.notifications;
CREATE POLICY "System and users can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id IS NULL OR actor_id = auth.uid()
  );

-- 5. Dedicated `public.system_settings` Table for Serverless Persistence (SEC-019)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system settings" ON public.system_settings;
CREATE POLICY "Anyone can read system settings"
  ON public.system_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify system settings" ON public.system_settings;
CREATE POLICY "Only admins can modify system settings"
  ON public.system_settings FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
