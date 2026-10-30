import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { safeFormatDate, formatEventDate, formatEventTime } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Edit,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { DeleteEventButton } from "@/components/events/delete-event-button";
import { MarkEventDoneButton } from "@/components/events/mark-event-done-button";
import { RSVPButton } from "@/components/events/rsvp-button";
import { RealtimeAttendeeCount } from "@/components/events/realtime-attendee-count";
import { EventLocationMapCard } from "@/components/events/event-location-map-card";
import { ReportModal } from "@/components/moderation/report-modal";

export const dynamic = "force-dynamic";

function getFallbackEventBanner(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();
  if (text.includes("basket") || text.includes("hoop")) {
    return "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1000&auto=format&fit=crop";
  }
  if (text.includes("pickle") || text.includes("tennis") || text.includes("badmin")) {
    return "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=1000&auto=format&fit=crop";
  }
  if (text.includes("soccer") || text.includes("footbal")) {
    return "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1000&auto=format&fit=crop";
  }
  if (text.includes("food") || text.includes("eat") || text.includes("cafe") || text.includes("coffee")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop";
  }
  if (text.includes("night") || text.includes("inuman") || text.includes("bar") || text.includes("party")) {
    return "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000&auto=format&fit=crop";
  }
  if (text.includes("beach") || text.includes("surf") || text.includes("island")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop";
}

export default async function UserEventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }> | { eventId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const resolvedParams = await params;
  const eventId = resolvedParams?.eventId;

  if (!eventId) notFound();

  const { data: event } = await supabase
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
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const isOrganizer =
    user.id === event.creator_id || user.id === event.organizer_id;

  // Fetch Host / Creator Profile
  let hostProfile: {
    id: string;
    username: string | null;
    full_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null = null;

  const hostId = event.organizer_id || event.creator_id;
  if (hostId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, full_name, display_name, avatar_url")
      .eq("id", hostId)
      .maybeSingle();
    hostProfile = profile;
  }

  const hostName =
    hostProfile?.display_name ||
    hostProfile?.full_name ||
    hostProfile?.username ||
    "Event Host";
  const hostUsername = hostProfile?.username;
  const hostAvatar = hostProfile?.avatar_url;

  const { data: attendance } = await supabase
    .from("event_attendees")
    .select("status")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isAttending =
    isOrganizer ||
    attendance?.status === "attending" ||
    attendance?.status === "going";

  const attendeesList = (event.event_attendees || [])
    .filter(
      (a: any) =>
        a && (a.status === "attending" || a.status === "going" || !a.status)
    )
    .map((a: any) => ({
      id: a.user_id,
      username: a.profiles?.username,
      full_name: a.profiles?.full_name,
      avatar_url: a.profiles?.avatar_url,
    }));

  const initialAttendeeCount = attendeesList.length;

  const emoji = getCategoryEmoji(event.category, event.title);

  const formattedDate = formatEventDate(
    event.event_date,
    event.start_time,
    event.created_at,
    "EEE, MMM d, yyyy"
  );
  const startTimeStr = event.start_time
    ? safeFormatDate(event.start_time, "h:mm a")
    : "";
  const endTimeStr = event.end_time
    ? safeFormatDate(event.end_time, "h:mm a")
    : "";
  const eventTimeStr = formatEventTime(event.start_time, event.end_time);
  const bannerUrl =
    event.cover_image_url ||
    event.cover_image ||
    getFallbackEventBanner(event.category, event.title);

  // Map coordinates
  const lat = event.latitude || 12.9742;
  const lng = event.longitude || 124.0058;
  const mapLocations = [
    {
      id: `event-${event.id}`,
      eventId: event.id,
      isEvent: true,
      name: event.title,
      category: event.category || "Event",
      lat: lat,
      lng: lng,
      locationName: event.location_name || "Sorsogon, Philippines",
      description: event.description || undefined,
      eventDate:
        formattedDate !== "Date to be announced" ? formattedDate : undefined,
      eventTime: eventTimeStr !== "TBA" ? eventTimeStr : undefined,
      attendeeCount: initialAttendeeCount,
      attendees: attendeesList,
      host: hostProfile || undefined,
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-3.5 sm:px-4 pt-2.5 pb-20 sm:py-6 space-y-3.5 overflow-x-hidden">
      {/* Clean Single-Row Top Bar */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors shrink-0"
        >
          <span className="h-8 w-8 rounded-xl border border-border/80 bg-card flex items-center justify-center shadow-2xs">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span>Back to Events</span>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={`/events/${event.id}/attendees`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/80 cursor-pointer"
            >
              <Users className="h-3.5 w-3.5 text-primary" />
              <span>Attendees ({initialAttendeeCount})</span>
            </Button>
          </Link>

          {!isOrganizer && (
            <ReportModal
              targetId={event.id}
              targetType="event"
              targetTitle={event.title}
              triggerVariant="outline"
              triggerSize="sm"
            />
          )}
        </div>
      </div>

      {/* Completed Banner Notice */}
      {event.status === "completed" && (
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 rounded-2xl p-3 flex items-center gap-2.5">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-bold text-xs">Event Completed</p>
            <p className="text-[11px] opacity-90 truncate">
              This gathering has concluded and was marked as done by the host.
            </p>
          </div>
        </div>
      )}

      {/* Unified Hero Event Card (Cover Banner + Title + Info Grid + Host + RSVP & Chat) */}
      <div className="rounded-3xl border border-border/80 bg-card/95 shadow-xs overflow-hidden">
        {/* Cover Image Banner */}
        <div className="relative h-48 sm:h-64 bg-muted overflow-hidden">
          <img
            src={bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10 flex flex-col justify-between p-3.5 sm:p-5">
            {/* Top Badges */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/55 backdrop-blur-md text-white border border-white/15">
                <span>{emoji}</span>
                <span>{event.category || "Event"}</span>
              </span>

              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                {event.price && Number(event.price) > 0
                  ? `₱${event.price}`
                  : "Free Entry"}
              </span>
            </div>

            {/* Bottom Title Overlay */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {event.title}
                </h1>
                {event.status === "completed" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] py-0.5 px-2 bg-emerald-500/25 text-emerald-100 border-emerald-400/40 gap-1 font-semibold"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Done
                  </Badge>
                )}
              </div>
              <p className="text-xs text-white/85 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {event.location_name || "Sorsogon, Philippines"}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Hero Card Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* 2x2 Quick Info Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Date */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/45 border border-border/60 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </p>
                <p className="text-xs font-bold text-foreground truncate">
                  {formattedDate}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/45 border border-border/60 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Time
                </p>
                <p className="text-xs font-bold text-foreground truncate">
                  {startTimeStr || "TBA"}
                  {endTimeStr ? ` - ${endTimeStr}` : ""}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/45 border border-border/60 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </p>
                <p className="text-xs font-bold text-foreground truncate">
                  {event.location_name || "Sorsogon"}
                </p>
              </div>
            </div>

            {/* Attendees */}
            <Link
              href={`/events/${event.id}/attendees`}
              className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-muted/45 hover:bg-muted border border-border/60 min-w-0 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Going
                  </p>
                  <div className="text-xs font-bold text-foreground truncate">
                    <RealtimeAttendeeCount
                      eventId={event.id}
                      initialCount={initialAttendeeCount}
                      showIcon={false}
                    />
                  </div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
            </Link>
          </div>

          {/* Host Row */}
          {hostProfile && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/35 border border-border/60">
              <Link
                href={hostUsername ? `/profile/${hostUsername}` : "#"}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                {hostAvatar ? (
                  <img
                    src={hostAvatar}
                    alt={hostName}
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20 shrink-0"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs ring-2 ring-primary/20 shrink-0">
                    {hostName[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Hosted by
                    </span>
                    {isOrganizer && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.2 rounded-full">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {hostName}
                  </p>
                </div>
              </Link>

              {hostUsername && (
                <Link
                  href={`/profile/${hostUsername}`}
                  className="text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors shrink-0"
                >
                  View Profile
                </Link>
              )}
            </div>
          )}

          {/* Primary Action Bar: RSVP + Event Group Chat */}
          <RSVPButton eventId={event.id} initialIsAttending={isAttending} />

          {/* Organizer Management Controls (Cleanly separated if current user is host) */}
          {isOrganizer && (
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Host Controls
              </span>
              <div className="flex items-center gap-1.5">
                <MarkEventDoneButton
                  eventId={event.id}
                  status={event.status}
                  compact
                />
                <Link href={`/events/${event.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2.5 rounded-xl text-xs gap-1"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                </Link>
                <DeleteEventButton
                  eventId={event.id}
                  eventTitle={event.title}
                  size="sm"
                  buttonText="Delete"
                  className="h-8 px-2.5 rounded-xl text-xs gap-1"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About This Event Card */}
      <div className="rounded-3xl border border-border/80 bg-card/95 p-4 sm:p-5 shadow-2xs space-y-2">
        <h2 className="text-sm sm:text-base font-bold text-foreground">
          About this event
        </h2>
        <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed text-foreground/85">
          {event.description || "No description provided."}
        </p>
      </div>

      {/* Large Interactive Event Location Map Card */}
      <EventLocationMapCard
        locationName={event.location_name || "Sorsogon, Philippines"}
        lat={lat}
        lng={lng}
        selectedId={`event-${event.id}`}
        locations={mapLocations}
      />
    </div>
  );
}
