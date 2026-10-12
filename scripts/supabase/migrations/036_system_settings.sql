-- Migration 036: System Settings Table for Admin Customizations
CREATE TABLE IF NOT EXISTS public.system_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read system settings" ON public.system_settings;
CREATE POLICY "Public read system settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage system settings" ON public.system_settings;
CREATE POLICY "Admin manage system settings" ON public.system_settings FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Realtime synchronization
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings; 
EXCEPTION 
  WHEN OTHERS THEN NULL; 
END $$;
