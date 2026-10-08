-- Migration to ensure is_onboarded column exists on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT FALSE;
