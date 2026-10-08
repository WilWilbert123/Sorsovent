import { createClient } from "@/lib/supabase/server";
import { EventsListView } from "@/components/events/events-list-view";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let createdEvents: any[] = [];
  let attendingEvents: any[] = [];
  let allEvents: any[] = [];

  if (user) {
    // 1. Fetch created events
    const { data: created } = await supabase
      .from("events")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    createdEvents = created || [];

    // 2. Fetch attending events (all statuses)
    const { data: attendingRows } = await supabase
      .from("event_attendees")
      .select("event_id, events(*)")
      .eq("user_id", user.id);

    attendingEvents = (attendingRows || []).map((r: any) => r.events).filter(Boolean);
  }

  // 3. Fetch all upcoming events
  const { data: upcoming } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);

  allEvents = upcoming || [];

  return (
    <EventsListView
      createdEvents={createdEvents}
      attendingEvents={attendingEvents}
      allEvents={allEvents}
      currentUserId={user?.id}
    />
  );
}
