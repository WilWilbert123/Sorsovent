import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { CalendarDays, MapPin, Users, Clock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get events the user is attending or organizing
  let myEvents: any[] = [];
  let upcomingEvents: any[] = [];

  if (user) {
    const { data: attending } = await supabase
      .from("event_attendees")
      .select(`
        event_id,
        events (
          id, title, start_time, end_time, location_name, cover_image_url,
          attendee_count, category,
          profiles!events_organizer_id_fkey (username, full_name, avatar_url)
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    myEvents = (attending || []).map((a) => (a.events as any)).filter(Boolean);
  }

  const { data: upcoming } = await supabase
    .from("events")
    .select(`
      id, title, start_time, end_time, location_name, cover_image_url,
      attendee_count, category, price,
      profiles!events_organizer_id_fkey (username, full_name, avatar_url)
    `)
    .eq("is_public", true)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(12);

  upcomingEvents = upcoming || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Events</h1>
        <Link href="/events/create">
          <Button size="sm">+ Create Event</Button>
        </Link>
      </div>

      {/* My Events */}
      {myEvents.length > 0 && (
        <section className="mb-8">
          <h2 className="font-semibold text-lg mb-4">My Events</h2>
          <div className="space-y-3">
            {myEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section>
        <h2 className="font-semibold text-lg mb-4">Upcoming Events</h2>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No upcoming events</p>
            <p className="text-sm mt-1">Check back later or create one!</p>
          </div>
        )}
      </section>
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const startDate = event.start_time ? new Date(event.start_time) : null;
  return (
    <Link href={`/events/${event.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-all">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0 text-primary">
          {startDate ? (
            <>
              <span className="text-xs font-medium uppercase">{format(startDate, "MMM")}</span>
              <span className="text-xl font-bold leading-none">{format(startDate, "d")}</span>
            </>
          ) : (
            <CalendarDays className="h-6 w-6" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{event.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            {startDate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(startDate, "h:mm a")}
              </span>
            )}
            {event.location_name && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span className="truncate">{event.location_name}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.attendee_count || 0}
            </span>
          </div>
        </div>
        {event.category && (
          <Badge variant="secondary" className="shrink-0 text-xs">{event.category}</Badge>
        )}
      </div>
    </Link>
  );
}
