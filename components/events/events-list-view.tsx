"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { safeFormatDate, formatEventDate } from "@/lib/utils";
import { getCategoryEmoji } from "@/lib/map/emoji";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  Plus,
  Star,
  MessageSquare,
  CheckCircle2,
  Search,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { MarkEventDoneButton } from "@/components/events/mark-event-done-button";

interface EventsListViewProps {
  createdEvents: any[];
  attendingEvents: any[];
  allEvents: any[];
  completedEvents?: any[];
  currentUserId?: string;
}

const CATEGORY_FILTERS = [
  { id: "All", label: "All" },
  { id: "Sports", label: "🏀 Sports" },
  { id: "Food", label: "🍔 Food" },
  { id: "Music", label: "🎵 Music" },
  { id: "Nightlife", label: "🍻 Nightlife" },
  { id: "Community", label: "🤝 Community" },
  { id: "Arts", label: "🎨 Arts" },
  { id: "Tech", label: "💻 Tech" },
];

function getFallbackEventCover(category?: string, title?: string): string {
  const text = `${category || ""} ${title || ""}`.toLowerCase();
  if (text.includes("basket") || text.includes("hoop")) {
    return "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("pickle") || text.includes("tennis") || text.includes("badmin")) {
    return "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("soccer") || text.includes("footbal")) {
    return "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("sport") || text.includes("run") || text.includes("volley")) {
    return "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("food") || text.includes("eat") || text.includes("cafe") || text.includes("coffee")) {
    return "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("night") || text.includes("inuman") || text.includes("bar") || text.includes("party")) {
    return "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("beach") || text.includes("surf") || text.includes("island")) {
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop";
  }
  if (text.includes("tech") || text.includes("game") || text.includes("esport")) {
    return "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop";
  }
  return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop";
}

export function EventsListView({
  createdEvents = [],
  attendingEvents = [],
  allEvents = [],
  completedEvents = [],
  currentUserId,
}: EventsListViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "attending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [eventsList, setEventsList] = useState<any[]>(allEvents);
  const [createdList, setCreatedList] = useState<any[]>(createdEvents);
  const [attendingList, setAttendingList] = useState<any[]>(attendingEvents);
  const [completedList, setCompletedList] = useState<any[]>(completedEvents);

  useEffect(() => {
    setEventsList(allEvents);
  }, [allEvents]);

  useEffect(() => {
    setCreatedList(createdEvents);
  }, [createdEvents]);

  useEffect(() => {
    setAttendingList(attendingEvents);
  }, [attendingEvents]);

  useEffect(() => {
    setCompletedList(completedEvents);
  }, [completedEvents]);

  // Real-time synchronization for attendee counts & attendance status
  useEffect(() => {
    const supabase = createClient();

    const syncAttendeeCounts = async () => {
      const { data: latestEvents } = await supabase
        .from("events")
        .select("id, event_attendees(count)");

      if (latestEvents) {
        const countMap = new Map<string, number>();
        for (const ev of latestEvents) {
          countMap.set(ev.id, (ev as any).event_attendees?.[0]?.count ?? 0);
        }

        const updateEventListWithCounts = (list: any[]) =>
          list.map((ev) => ({
            ...ev,
            attendee_count: countMap.has(ev.id)
              ? countMap.get(ev.id)!
              : ev.attendee_count || 0,
          }));

        setEventsList((prev) => updateEventListWithCounts(prev));
        setCreatedList((prev) => updateEventListWithCounts(prev));
        setAttendingList((prev) => updateEventListWithCounts(prev));
      }

      if (currentUserId) {
        const { data: attendingRows } = await supabase
          .from("event_attendees")
          .select("event_id, events(*, event_attendees(count))")
          .eq("user_id", currentUserId);

        if (attendingRows) {
          const direct = attendingRows
            .map((r: any) => {
              if (!r.events) return null;
              return {
                ...r.events,
                attendee_count: r.events.event_attendees?.[0]?.count ?? 0,
              };
            })
            .filter(Boolean);

          const attMap = new Map<string, any>();
          for (const ev of direct) attMap.set(ev.id, ev);
          for (const ev of createdList) {
            if (!attMap.has(ev.id)) attMap.set(ev.id, ev);
          }
          setAttendingList(Array.from(attMap.values()));
        }
      }
    };

    const channel = supabase
      .channel("realtime-events-list-attendees")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_attendees",
        },
        () => {
          syncAttendeeCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, createdList]);

  const handleEventDeleted = (deletedId: string) => {
    setEventsList((prev) => prev.filter((e) => e.id !== deletedId));
    setCreatedList((prev) => prev.filter((e) => e.id !== deletedId));
    setAttendingList((prev) => prev.filter((e) => e.id !== deletedId));
    setCompletedList((prev) => prev.filter((e) => e.id !== deletedId));
  };

  const handleStatusChange = (eventId: string, newStatus: string) => {
    setCreatedList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );
    setAttendingList((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e))
    );

    if (newStatus === "completed") {
      const target =
        eventsList.find((e) => e.id === eventId) ||
        createdList.find((e) => e.id === eventId);
      if (target) {
        setEventsList((prev) => prev.filter((e) => e.id !== eventId));
        setCompletedList((prev) => [
          { ...target, status: "completed" },
          ...prev.filter((e) => e.id !== eventId),
        ]);
      }
    } else {
      const target =
        completedList.find((e) => e.id === eventId) ||
        createdList.find((e) => e.id === eventId);
      if (target) {
        setCompletedList((prev) => prev.filter((e) => e.id !== eventId));
        setEventsList((prev) => [
          { ...target, status: newStatus },
          ...prev.filter((e) => e.id !== eventId),
        ]);
      }
    }
  };

  const rawDisplayedEvents =
    activeTab === "my"
      ? createdList
      : activeTab === "attending"
      ? attendingList
      : activeTab === "completed"
      ? completedList
      : eventsList;

  const displayedEvents = useMemo(() => {
    return rawDisplayedEvents.filter((event) => {
      if (selectedCategory !== "All") {
        const cat = (event.category || "").toLowerCase();
        if (!cat.includes(selectedCategory.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hostProfile = Array.isArray(event.profiles)
          ? event.profiles[0]
          : event.profiles;
        const hostName =
          hostProfile?.display_name ||
          hostProfile?.full_name ||
          hostProfile?.username ||
          "";
        const matchTitle = event.title?.toLowerCase().includes(q);
        const matchLoc = event.location_name?.toLowerCase().includes(q);
        const matchCat = event.category?.toLowerCase().includes(q);
        const matchHost = hostName.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCat && !matchHost) return false;
      }
      return true;
    });
  }, [rawDisplayedEvents, selectedCategory, searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-4 pt-2.5 pb-20 sm:py-6 space-y-3.5 overflow-x-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 text-[#FF3366] flex items-center justify-center shrink-0">
            <CalendarDays className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground truncate">
              Events
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Discover and host gatherings in Sorsogon
            </p>
          </div>
        </div>

        <Link href="/events/create" className="shrink-0">
          <Button
            size="sm"
            className="h-9 px-3.5 rounded-full gap-1.5 text-xs font-bold bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] hover:opacity-95 text-white border-0 shadow-xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Create Event</span>
          </Button>
        </Link>
      </div>

      {/* Search + Category Filter Strip */}
      <div className="space-y-2">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, places, or hosts..."
            className="w-full pl-9 pr-9 h-10 rounded-2xl bg-card border-border/80 text-base sm:text-sm shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORY_FILTERS.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  active
                    ? "bg-foreground text-background shadow-2xs"
                    : "bg-card text-muted-foreground hover:text-foreground border border-border/70"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact Non-Truncated Segmented Filter Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-muted/70 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "all"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
          <span>Upcoming</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "all"
                ? "bg-white/20 text-white"
                : "bg-background text-muted-foreground"
            }`}
          >
            {eventsList.length}
          </span>
        </button>

        {currentUserId && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab("my")}
              className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "my"
                  ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-3.5 w-3.5 hidden sm:inline text-amber-400 fill-amber-400 shrink-0" />
              <span>Hosted</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "my"
                    ? "bg-white/20 text-white"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {createdList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("attending")}
              className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "attending"
                  ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-3.5 w-3.5 hidden sm:inline shrink-0" />
              <span>Going</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "attending"
                    ? "bg-white/20 text-white"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {attendingList.length}
              </span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={`flex items-center justify-center gap-1 py-2 px-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === "completed"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5 hidden sm:inline text-emerald-500 shrink-0" />
          <span>Past</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeTab === "completed"
                ? "bg-white/20 text-white"
                : "bg-background text-muted-foreground"
            }`}
          >
            {completedList.length}
          </span>
        </button>
      </div>

      {/* Events List */}
      {displayedEvents.length === 0 ? (
        <div className="text-center py-12 px-4 border border-dashed rounded-3xl bg-card/60 shadow-2xs space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm sm:text-base text-foreground">
              {searchQuery || selectedCategory !== "All"
                ? "No events match your filter"
                : activeTab === "my"
                ? "You haven't hosted any events yet"
                : activeTab === "attending"
                ? "You haven't joined any events yet"
                : activeTab === "completed"
                ? "No past events yet"
                : "No upcoming events found"}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {searchQuery || selectedCategory !== "All"
                ? "Try clearing your search or category filter."
                : activeTab === "my"
                ? "Host a gathering, sports run, or hangout for the Sorsogon community!"
                : activeTab === "completed"
                ? "Concluded events marked as done will appear here."
                : "Browse the Sorsogon Activity Map or create a new event!"}
            </p>
          </div>
          {searchQuery || selectedCategory !== "All" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="rounded-full text-xs h-8"
            >
              Reset Filters
            </Button>
          ) : (
            <Link
              href={activeTab === "my" ? "/events/create" : "/explore"}
              className="inline-block pt-1"
            >
              <Button
                size="sm"
                className="rounded-full text-xs font-bold bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white border-0 px-4 h-8.5"
              >
                {activeTab === "my" ? "Create an Event" : "Explore Map & Spots"}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayedEvents.map((event) => {
            const isCreator =
              currentUserId &&
              (event.creator_id === currentUserId ||
                event.organizer_id === currentUserId);
            const isCompleted = event.status === "completed";
            const emoji = getCategoryEmoji(event.category, event.title);
            const shortDateStr = formatEventDate(
              event.event_date,
              event.start_time,
              event.created_at,
              "MMM d"
            );
            const fullDateStr = formatEventDate(
              event.event_date,
              event.start_time,
              event.created_at,
              "EEE, MMM d, yyyy"
            );
            const timeStr = event.start_time
              ? safeFormatDate(event.start_time, "h:mm a")
              : "";
            const coverImg =
              event.cover_image_url ||
              event.cover_image ||
              getFallbackEventCover(event.category, event.title);

            const hostProfile = Array.isArray(event.profiles)
              ? event.profiles[0]
              : event.profiles;
            const hostName =
              hostProfile?.display_name ||
              hostProfile?.full_name ||
              hostProfile?.username ||
              "Organizer";
            const hostAvatar = hostProfile?.avatar_url;

            return (
              <div
                key={event.id}
                className={`rounded-3xl border border-border/80 bg-card/95 hover:border-primary/40 shadow-2xs hover:shadow-md transition-all overflow-hidden group ${
                  isCompleted ? "opacity-90 bg-muted/20" : ""
                }`}
              >
                <div className="p-3.5 sm:p-4 flex flex-col gap-3">
                  {/* Top Row: Cover Thumbnail + Event Info */}
                  <Link
                    href={`/events/${event.id}`}
                    className="flex items-start gap-3.5 min-w-0"
                  >
                    {/* Cover Thumbnail */}
                    <div className="relative w-24 h-24 sm:w-32 sm:h-24 rounded-2xl overflow-hidden bg-muted shrink-0 border border-border/60">
                      <img
                        src={coverImg}
                        alt={event.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {/* Price Badge */}
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/65 text-white backdrop-blur-md">
                        {event.price && Number(event.price) > 0
                          ? `₱${event.price}`
                          : "Free"}
                      </span>

                      {/* Short Date Overlay */}
                      {shortDateStr &&
                        shortDateStr !== "Date to be announced" && (
                          <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-white/95 text-slate-900 shadow-2xs">
                            {shortDateStr}
                          </span>
                        )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm shrink-0">{emoji}</span>
                        <h3
                          className={`font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors ${
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {event.title}
                        </h3>
                        {isCreator && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 border-primary/40 text-primary shrink-0"
                          >
                            Host
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-0.5 shrink-0 font-semibold"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Done
                          </Badge>
                        )}
                      </div>

                      {/* Date & Time Row */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 font-semibold text-foreground/90">
                          <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{fullDateStr}</span>
                        </span>
                        {timeStr && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{timeStr}</span>
                          </span>
                        )}
                      </div>

                      {/* Location & Attendees Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {event.location_name && (
                          <span className="inline-flex items-center gap-1 truncate max-w-[180px] sm:max-w-[260px]">
                            <MapPin className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate font-medium text-foreground/80">
                              {event.location_name}
                            </span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          <Users className="h-3 w-3 shrink-0" />
                          <span>{event.attendee_count || 0} going</span>
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Balanced Footer Row: Host on Left, Actions on Right */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-border/60">
                    {/* Left: Host Pill + Creator Actions */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-muted/65 border border-border/50 text-xs min-w-0">
                        {hostAvatar ? (
                          <img
                            src={hostAvatar}
                            alt={hostName}
                            className="h-4 w-4 rounded-full object-cover ring-1 ring-border shrink-0"
                          />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">
                            {hostName[0]?.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          Host:
                        </span>
                        <span className="font-bold text-foreground truncate max-w-[95px] sm:max-w-[150px] text-[11px]">
                          {hostName}
                        </span>
                      </span>

                      {isCreator && (
                        <div className="flex items-center gap-1 shrink-0">
                          <MarkEventDoneButton
                            eventId={event.id}
                            status={event.status}
                            compact
                            onStatusChange={(newStatus) =>
                              handleStatusChange(event.id, newStatus)
                            }
                          />
                          <DeleteEventButton
                            eventId={event.id}
                            eventTitle={event.title}
                            redirectToEvents={false}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            buttonText=""
                            onDeleted={() => handleEventDeleted(event.id)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: Chat + View Details Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link href={`/events/${event.id}/chat`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1.5 text-xs font-semibold h-8 px-3 rounded-xl cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          <span>Chat</span>
                        </Button>
                      </Link>
                      <Link href={`/events/${event.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs font-semibold h-8 px-3 rounded-xl border-border/80 cursor-pointer"
                        >
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3 opacity-70" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
