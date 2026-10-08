-- Create user_push_tokens table to store device FCM tokens for Push Notifications
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups by user_id
CREATE INDEX IF NOT EXISTS user_push_tokens_user_idx ON public.user_push_tokens (user_id);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow users to manage their push tokens" ON public.user_push_tokens;
CREATE POLICY "Allow users to manage their push tokens" ON public.user_push_tokens
  FOR ALL USING (auth.uid() = user_id);
