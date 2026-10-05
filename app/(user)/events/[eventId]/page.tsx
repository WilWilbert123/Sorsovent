import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { CalendarDays, MapPin, Users, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function UserEventDetailsPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: event } = await supabase
    .from("events")
    .select(`
      *,
      profiles!events_organizer_id_fkey (username, full_name, avatar_url)
    `)
    .eq("id", params.eventId)
    .single();

  if (!event) notFound();

  const organizer = Array.isArray(event.profiles) ? event.profiles[0] : event.profiles;
  const isOrganizer = user.id === event.organizer_id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Events
        </Link>
        {isOrganizer && (
          <Link href={`/events/${event.id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit Event
            </Button>
          </Link>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  {format(new Date(event.start_time), "MMMM d, yyyy")}
                </span>
              </div>
              {event.category && (
                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium">
                  {event.category}
                </div>
              )}
            </div>
          </div>

          <div className="aspect-video bg-muted rounded-2xl overflow-hidden border">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <CalendarDays className="h-16 w-16 mb-4 opacity-20" />
                <p>No cover image provided</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">About this event</h2>
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                {event.description || "No description provided."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-2xl p-6 bg-card shadow-sm sticky top-24">
            <h3 className="font-bold text-lg mb-6">Event Details</h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl h-fit">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(event.start_time), "h:mm a")}
                    {event.end_time && ` - ${format(new Date(event.end_time), "h:mm a")}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl h-fit">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground mt-1">{event.location_name}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl h-fit">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Attendees</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.attendee_count} people attending
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t flex flex-col gap-3">
              <Button className="w-full text-lg h-12">I'm Going</Button>
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/events/${event.id}/chat`} className="w-full">
                  <Button variant="secondary" className="w-full">Event Chat</Button>
                </Link>
                <Link href={`/events/${event.id}/attendees`} className="w-full">
                  <Button variant="outline" className="w-full">Attendees</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
