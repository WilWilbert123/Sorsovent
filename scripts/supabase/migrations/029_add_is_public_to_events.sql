-- Migration to add columns to public.events if needed
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
