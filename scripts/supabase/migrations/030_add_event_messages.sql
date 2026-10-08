-- Create event_messages table for event group chats
CREATE TABLE IF NOT EXISTS public.event_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for event message retrieval
CREATE INDEX IF NOT EXISTS event_messages_event_idx ON public.event_messages (event_id, created_at);

-- Enable RLS
ALTER TABLE public.event_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public read access for event messages" ON public.event_messages;
CREATE POLICY "Allow public read access for event messages" ON public.event_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert for event messages" ON public.event_messages;
CREATE POLICY "Allow authenticated insert for event messages" ON public.event_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Enable Realtime for event_messages
DO $$ 
BEGIN 
  ALTER PUBLICATION supabase_realtime ADD TABLE public.event_messages; 
EXCEPTION WHEN OTHERS THEN NULL; 
END $$;
