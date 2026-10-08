-- Migration to ensure full_name column exists on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
