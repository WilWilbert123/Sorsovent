-- Add social media columns to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
