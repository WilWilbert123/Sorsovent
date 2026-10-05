
-- Indexes for performance
CREATE INDEX IF NOT EXISTS events_location_idx ON public.events (latitude, longitude);
CREATE INDEX IF NOT EXISTS places_location_idx ON public.places (latitude, longitude);
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts (author_id);
CREATE INDEX IF NOT EXISTS events_creator_idx ON public.events (creator_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages (conversation_id);
