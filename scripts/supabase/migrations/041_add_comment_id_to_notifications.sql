-- Migration: Add comment_id to public.notifications for threaded comment and reply push notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON public.notifications(comment_id);
