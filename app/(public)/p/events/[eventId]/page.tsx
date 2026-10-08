import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { MapView } from "@/components/map/map-view";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PublicEventDetailsPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> | { eventId: string } 
}) {
  const supabase = await createClient();

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    notFound();
  }

  let organizer = null;
  const organizerId = event.organizer_id || event.creator_id;
  if (organizerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", organizerId)
      .single();
    organizer = profile;
  }

  const emoji = getCategoryEmoji(event.category, event.title);
  const eventDateVal = event.start_time || event.event_date || event.created_at;
  const formattedDate = safeFormatDate(eventDateVal, "MMMM d, yyyy", "Date to be announced");
  const startTimeStr = safeFormatDate(event.start_time || eventDateVal, "h:mm a");
  const endTimeStr = event.end_time ? safeFormatDate(event.end_time, "h:mm a") : "";

  const lat = event.latitude || 12.9742;
  const lng = event.longitude || 124.0058;
  const mapLocations = [
    {
      id: event.id,
      name: event.title,
      category: event.category || "Event",
      lat: lat,
      lng: lng,
      description: event.location_name || "Sorsogon Location",
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Events
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{emoji}</span>
              <h1 className="text-3xl font-bold">{event.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  {formattedDate}
                </span>
              </div>
              {event.category && (
                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5">
                  <span>{emoji}</span>
                  <span>{event.category}</span>
                </div>
              )}
            </div>
          </div>

          <div className="aspect-video bg-muted rounded-2xl overflow-hidden border shadow-sm">
            {(event.cover_image_url || event.cover_image) ? (
              <img src={event.cover_image_url || event.cover_image} alt={event.title} className="w-full h-full object-cover" />
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

          {/* Interactive Event Location Map */}
          <div>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Event Location
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {event.location_name || "Sorsogon, Philippines"}
            </p>
            <div className="h-64 rounded-2xl overflow-hidden border shadow-sm">
              <MapView locations={mapLocations} center={{ lat, lng }} zoom={14} />
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
                    {startTimeStr || "TBA"}
                    {endTimeStr && ` - ${endTimeStr}`}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl h-fit">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground mt-1">{event.location_name || "Sorsogon"}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-primary/10 p-2.5 rounded-xl h-fit">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Attendees</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.attendee_count || 0} people attending
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <Link href={`/auth/login?next=/events/${event.id}`}>
                <Button className="w-full text-lg h-12">Sign in to RSVP</Button>
              </Link>
              <p className="text-xs text-center text-muted-foreground mt-3">
                Join Sorsovent to attend events and chat with other attendees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
