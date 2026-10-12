import { createClient } from "@/lib/supabase/server";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RealtimeAttendeesList } from "@/components/events/realtime-attendees-list";

export default async function EventAttendeesPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> | { eventId: string } 
}) {
  const supabase = await createClient();
  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <Link href="/events"><Button>Back to Events</Button></Link>
      </div>
    );
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
        <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Event not found</h2>
        <Link href="/events"><Button>Back to Events</Button></Link>
      </div>
    );
  }

  const { data: attendees } = await supabase
    .from("event_attendees")
    .select(`
      user_id,
      status,
      profiles!event_attendees_user_id_fkey (
        username,
        full_name,
        avatar_url,
        bio
      )
    `)
    .eq("event_id", eventId)
    .in("status", ["attending", "going"]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold">Attendees</h1>
        <p className="text-muted-foreground">{event.title}</p>
      </div>

      <RealtimeAttendeesList
        eventId={eventId}
        initialAttendees={(attendees as any) || []}
      />
    </div>
  );
}

