-- Enable RLS for event_attendees
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any exist
DROP POLICY IF EXISTS "Allow public read access for event_attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow users to insert their own attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow users to update their own attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "Allow users to delete their own attendance" ON public.event_attendees;

-- 1. Read: Everyone can view event attendees
CREATE POLICY "Allow public read access for event_attendees" ON public.event_attendees
  FOR SELECT USING (true);

-- 2. Insert: Users can register themselves as attendees
CREATE POLICY "Allow users to insert their own attendance" ON public.event_attendees
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Update: Users can update their own RSVP status
CREATE POLICY "Allow users to update their own attendance" ON public.event_attendees
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Delete: Users can unregister/leave an event
CREATE POLICY "Allow users to delete their own attendance" ON public.event_attendees
  FOR DELETE USING (auth.uid() = user_id);
