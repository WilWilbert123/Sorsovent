import { createClient } from "@/lib/supabase/server";
import { Users, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function EventAttendeesPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", params.eventId)
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
      profiles!event_attendees_user_id_fkey (
        username,
        full_name,
        avatar_url,
        bio
      )
    `)
    .eq("event_id", params.eventId)
    .eq("status", "attending");

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href={`/events/${params.eventId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-bold">Attendees</h1>
        <p className="text-muted-foreground">{event.title}</p>
      </div>
      
      {!attendees || attendees.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No attendees yet</h2>
          <p className="text-muted-foreground mb-6">
            Be the first to RSVP to this event!
          </p>
          <Link href={`/events/${params.eventId}`}>
            <Button>View Event</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {attendees.map((a: any) => {
            const profile = a.profiles;
            if (!profile) return null;
            return (
              <div key={a.user_id} className="flex items-center justify-between p-4 border rounded-xl bg-card">
                <Link href={`/profile/${profile.username}`} className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{(profile.full_name || profile.username)[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-muted-foreground">@{profile.username}</p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
