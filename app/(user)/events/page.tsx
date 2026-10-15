import { createClient } from "@/lib/supabase/server";
import { EventsListView } from "@/components/events/events-list-view";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let createdEvents: any[] = [];
  let attendingEvents: any[] = [];
  let allEvents: any[] = [];

  // Fetch created, attending, upcoming, and completed events in PARALLEL to prevent waterfalls
  const [createdRes, attendingRowsRes, upcomingRes, completedRes] = await Promise.all([
    user
      ? supabase
          .from("events")
          .select("*, event_attendees(count)")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    user
      ? supabase
          .from("event_attendees")
          .select("event_id, events(*, event_attendees(count))")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),
    supabase
      .from("events")
      .select("*, event_attendees(count)")
      .or("status.is.null,status.neq.completed")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("events")
      .select("*, event_attendees(count)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const rawCreated = (createdRes.data || []) as any[];
  const rawAttending = (attendingRowsRes.data || [])
    .map((r: any) => r.events)
    .filter(Boolean) as any[];
  const rawUpcoming = (upcomingRes.data || []) as any[];
  const rawCompleted = (completedRes.data || []) as any[];

  // Collect all unique creator/organizer IDs across all fetched events
  const hostIds = Array.from(
    new Set(
      [...rawCreated, ...rawAttending, ...rawUpcoming, ...rawCompleted]
        .map((e) => e?.organizer_id || e?.creator_id)
        .filter(Boolean)
    )
  );

  const hostMap = new Map<string, any>();
  if (hostIds.length > 0) {
    const { data: hostProfiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, full_name, avatar_url")
      .in("id", hostIds);

    (hostProfiles || []).forEach((p: any) => {
      hostMap.set(p.id, p);
    });
  }

  const attachHostAndCount = (e: any) => {
    const hostProfile = hostMap.get(e?.organizer_id || e?.creator_id) || null;
    return {
      ...e,
      profiles: hostProfile,
      host: hostProfile,
      attendee_count: e?.event_attendees?.[0]?.count ?? 0,
    };
  };

  if (user) {
    createdEvents = rawCreated.map(attachHostAndCount);

    const directlyAttending = rawAttending.map(attachHostAndCount);

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

  allEvents = rawUpcoming.map(attachHostAndCount);
  const completedEvents = rawCompleted.map(attachHostAndCount);

  return (
    <EventsListView
      createdEvents={createdEvents}
      attendingEvents={attendingEvents}
      allEvents={allEvents}
      completedEvents={completedEvents}
      currentUserId={user?.id}
    />
  );
}
