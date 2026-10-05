
CREATE TABLE IF NOT EXISTS public.saved_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'event' or 'post'
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (item_type = 'event' AND event_id IS NOT NULL AND post_id IS NULL) OR
    (item_type = 'post' AND post_id IS NOT NULL AND event_id IS NULL)
  )
);
