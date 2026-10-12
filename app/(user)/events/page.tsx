import { createClient } from "@/lib/supabase/server";
import { EventsListView } from "@/components/events/events-list-view";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let createdEvents: any[] = [];
  let attendingEvents: any[] = [];
  let allEvents: any[] = [];

  if (user) {
    // 1. Fetch created events with attendee counts
    const { data: created } = await supabase
      .from("events")
      .select("*, event_attendees(count)")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    createdEvents = (created || []).map((e: any) => ({
      ...e,
      attendee_count: e.event_attendees?.[0]?.count ?? 0,
    }));

    // 2. Fetch attending events with attendee counts
    const { data: attendingRows } = await supabase
      .from("event_attendees")
      .select("event_id, events(*, event_attendees(count))")
      .eq("user_id", user.id);

    const directlyAttending = (attendingRows || [])
      .map((r: any) => {
        if (!r.events) return null;
        return {
          ...r.events,
          attendee_count: r.events.event_attendees?.[0]?.count ?? 0,
        };
      })
      .filter(Boolean);

    // Merge attending events ensuring no duplicates
    const attendingMap = new Map<string, any>();
    for (const ev of directlyAttending) {
      attendingMap.set(ev.id, ev);
    }
    // Creator is also attending their created events
    for (const ev of createdEvents) {
      if (!attendingMap.has(ev.id)) {
        attendingMap.set(ev.id, ev);
      }
    }

    attendingEvents = Array.from(attendingMap.values());
  }

  // 3. Fetch all upcoming events with attendee counts
  const { data: upcoming } = await supabase
    .from("events")
    .select("*, event_attendees(count)")
    .order("created_at", { ascending: false })
    .limit(30);

  allEvents = (upcoming || []).map((e: any) => ({
    ...e,
    attendee_count: e.event_attendees?.[0]?.count ?? 0,
  }));

  return (
    <EventsListView
      createdEvents={createdEvents}
      attendingEvents={attendingEvents}
      allEvents={allEvents}
      currentUserId={user?.id}
    />
  );
}
