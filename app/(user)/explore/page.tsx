import { createClient } from "@/lib/supabase/server";
import { SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";
import { formatEventDate, formatEventTime } from "@/lib/utils";
import { ExploreClient } from "@/components/explore/explore-client";
import type { MapAttendee, MapLocation } from "@/components/map/map-view";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch upcoming events (including attendee profiles for map popups) and active users in PARALLEL
  const [eventsRes, usersRes] = await Promise.all([
    supabase
      .from("events")
      .select(
        `
        *,
        event_attendees(
          user_id,
          status,
          profiles(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `
      )
      .or("status.is.null,status.neq.completed")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("profiles")
      .select("id, username, full_name, display_name, avatar_url, bio")
      .order("created_at", { ascending: false })
      .limit(8),
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

  const upcomingEvents = rawEvents.map((ev: any) => {
    const validAttendees = (ev.event_attendees || []).filter(
      (a: any) => a && (a.status === "attending" || a.status === "going" || !a.status)
    );
    return {
      ...ev,
      profiles: hostMap.get(ev.organizer_id || ev.creator_id) || null,
      attendee_count: validAttendees.length,
      validAttendees,
    };
  });

  const activeUsers = usersRes.data || [];

  // Build map location pins from events + featured spots (deterministic fallback coordinates)
  const eventMapLocations: MapLocation[] = (upcomingEvents || []).map((event, idx) => {
    const formattedDate = formatEventDate(
      event.event_date,
      event.start_time,
      event.created_at,
      "EEE, MMM d"
    );
    const formattedTime = formatEventTime(event.start_time, event.end_time);

    // Deterministic offset when event has no exact coordinates so pins don't stack
    const angle = idx * 1.35;
    const fallbackLat = 12.9743 + Math.cos(angle) * 0.012;
    const fallbackLng = 124.0044 + Math.sin(angle) * 0.012;

    const attendees: MapAttendee[] = (event.validAttendees || []).map((a: any) => ({
      id: a.user_id,
      username: a.profiles?.username,
      full_name: a.profiles?.full_name,
      avatar_url: a.profiles?.avatar_url,
    }));

    return {
      id: `event-${event.id}`,
      eventId: event.id,
      isEvent: true,
      name: event.title,
      category: event.category || "Community",
      lat: event.latitude ? Number(event.latitude) : fallbackLat,
      lng: event.longitude ? Number(event.longitude) : fallbackLng,
      locationName: event.location_name || "Sorsogon, Philippines",
      description: event.description || event.location_name || "Sorsogon, Philippines",
      eventDate: formattedDate !== "Date to be announced" ? formattedDate : undefined,
      eventTime: formattedTime !== "TBA" ? formattedTime : undefined,
      attendeeCount: attendees.length,
      attendees,
      host: event.profiles || undefined,
    };
  });

  const allMapLocations: MapLocation[] = [
    ...eventMapLocations,
    ...SORSOGON_FEATURED_LOCATIONS.map((loc) => ({
      ...loc,
      isEvent: false,
    })),
  ];

  return (
    <ExploreClient
      upcomingEvents={upcomingEvents}
      activeUsers={activeUsers}
      allMapLocations={allMapLocations}
    />
  );
}
