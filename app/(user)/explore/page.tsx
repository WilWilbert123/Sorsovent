import { createClient } from "@/lib/supabase/server";
import { SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";
import { formatEventDate, formatEventTime } from "@/lib/utils";
import { ExploreClient } from "@/components/explore/explore-client";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch upcoming events and active users in PARALLEL
  const [eventsRes, usersRes] = await Promise.all([
    supabase
      .from("events")
      .select("*, event_attendees(count)")
      .or("status.is.null,status.neq.completed")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("profiles")
      .select("id, username, full_name, display_name, avatar_url, bio")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const rawEvents = eventsRes.data || [];
  const hostIds = Array.from(
    new Set(rawEvents.map((e: any) => e.organizer_id || e.creator_id).filter(Boolean))
  );
  const hostMap = new Map();
  if (hostIds.length > 0) {
    const { data: hostProfiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, display_name, avatar_url")
      .in("id", hostIds);
    (hostProfiles || []).forEach((p: any) => hostMap.set(p.id, p));
  }

  const upcomingEvents = rawEvents.map((ev: any) => ({
    ...ev,
    profiles: hostMap.get(ev.organizer_id || ev.creator_id) || null,
    attendee_count: ev.event_attendees?.[0]?.count ?? 0,
  }));

  const activeUsers = usersRes.data || [];

  // Build map location pins from events + featured spots (deterministic fallback coordinates)
  const eventMapLocations = (upcomingEvents || []).map((event, idx) => {
    const formattedDate = formatEventDate(
      event.event_date,
      event.start_time,
      event.created_at,
      "EEE, MMM d, yyyy"
    );
    const formattedTime = formatEventTime(event.start_time, event.end_time);

    // Deterministic offset when event has no exact coordinates so pins don't stack
    const angle = idx * 1.35;
    const fallbackLat = 12.9743 + Math.cos(angle) * 0.012;
    const fallbackLng = 124.0044 + Math.sin(angle) * 0.012;

    return {
      id: event.id,
      eventId: event.id,
      isEvent: true,
      name: event.title,
      category: event.category || "Event",
      lat: event.latitude ? Number(event.latitude) : fallbackLat,
      lng: event.longitude ? Number(event.longitude) : fallbackLng,
      description: event.location_name || "Sorsogon, Philippines",
      eventDate: formattedDate !== "Date to be announced" ? formattedDate : undefined,
      eventTime: formattedTime !== "TBA" ? formattedTime : undefined,
      attendeeCount: event.attendee_count || 0,
      host: event.profiles || undefined,
    };
  });

  const allMapLocations = [...eventMapLocations, ...SORSOGON_FEATURED_LOCATIONS];

  return (
    <ExploreClient
      upcomingEvents={upcomingEvents}
      activeUsers={activeUsers}
      allMapLocations={allMapLocations}
    />
  );
}
