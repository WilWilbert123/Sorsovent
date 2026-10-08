import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { safeFormatDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { MapView } from "@/components/map/map-view";
import { CalendarDays, MapPin, Users, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { DeleteEventButton } from "@/components/events/delete-event-button";
import { RSVPButton } from "@/components/events/rsvp-button";
import { MessageSquare, ShieldCheck } from "lucide-react";

export default async function UserEventDetailsPage({ 
  params 
}: { 
  params: Promise<{ eventId: string }> | { eventId: string } 
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isOrganizer = user.id === event.creator_id || user.id === event.organizer_id;

  const { data: attendance } = await supabase
    .from("event_attendees")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .single();

  const isAttending = isOrganizer || attendance?.status === "attending";

  const emoji = getCategoryEmoji(event.category, event.title);

  const eventDateVal = event.start_time || event.event_date || event.created_at;
  const formattedDate = safeFormatDate(eventDateVal, "MMMM d, yyyy", "Date to be announced");
  const startTimeStr = safeFormatDate(event.start_time || eventDateVal, "h:mm a");
  const endTimeStr = event.end_time ? safeFormatDate(event.end_time, "h:mm a") : "";

  // Map coordinates
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
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Navigation & Organizer Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          ← Back to Events
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {isAttending && (
            <Link href={`/events/${event.id}/chat`}>
              <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                <MessageSquare className="h-4 w-4" />
                Event Chat
              </Button>
            </Link>
          )}
          <Link href={`/events/${event.id}/attendees`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" />
              Attendees
            </Button>
          </Link>
          {isOrganizer && (
            <>
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20 py-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Organizer
              </Badge>
              <Link href={`/events/${event.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
              <DeleteEventButton eventId={event.id} eventTitle={event.title} />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl sm:text-3xl">{emoji}</span>
              <h1 className="text-2xl sm:text-3xl font-bold">{event.title}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-3">
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

            <div className="mt-8 pt-6 border-t space-y-3">
              <RSVPButton eventId={event.id} initialIsAttending={isAttending} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
