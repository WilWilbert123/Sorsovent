-- Table for Event Chat Message Emoji Reactions
CREATE TABLE IF NOT EXISTS public.event_message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.event_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Index for fast lookup by message
CREATE INDEX IF NOT EXISTS event_message_reactions_msg_idx ON public.event_message_reactions (message_id);

-- Enable RLS
ALTER TABLE public.event_message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow public read for reactions" ON public.event_message_reactions;
CREATE POLICY "Allow public read for reactions" ON public.event_message_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert reactions" ON public.event_message_reactions;
CREATE POLICY "Allow authenticated insert reactions" ON public.event_message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Allow users delete own reactions" ON public.event_message_reactions;
CREATE POLICY "Allow users delete own reactions" ON public.event_message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- Safely add table to Realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'event_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_message_reactions;
  END IF;
END $$;
