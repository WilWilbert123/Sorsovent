"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  Calendar,
  PlusCircle,
  Radio,
  Search,
  Users,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { MapView, MapLocation, MapAttendee } from "@/components/map/map-view";
import { SORSOGON_FEATURED_LOCATIONS, SORSOGON_CENTER } from "@/lib/map/mapbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/utils";

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeCenter, setActiveCenter] = useState(SORSOGON_CENTER);
  const [activeZoom, setActiveZoom] = useState(11);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveEvents, setLiveEvents] = useState<MapLocation[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Fetch live events from Supabase with realtime attendee details
  const fetchLiveEvents = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          location_name,
          latitude,
          longitude,
          category,
          event_date,
          start_time,
          end_time,
          created_at,
          creator_id,
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
        `)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .or("status.is.null,status.neq.completed");

      if (error) {
        console.error("Failed to load map events:", error.message || error);
        return;
      }

      if (data) {
        // Batch fetch host profiles
        const hostIds = Array.from(
          new Set(data.map((ev: any) => ev.organizer_id || ev.creator_id).filter(Boolean))
        );

        let hostMap = new Map();
        if (hostIds.length > 0) {
          const { data: hostProfiles } = await supabase
            .from("profiles")
            .select("id, username, full_name, display_name, avatar_url")
            .in("id", hostIds);
          (hostProfiles || []).forEach((p: any) => hostMap.set(p.id, p));
        }

        const mapped: MapLocation[] = data.map((ev: any) => {
          const eventDate = formatEventDate(ev.event_date, ev.start_time, ev.created_at, "EEE, MMM d, yyyy");
          const eventTime = formatEventTime(ev.start_time, ev.end_time);

          const attendees: MapAttendee[] = (ev.event_attendees || [])
            .filter((a: any) => a && (a.status === "attending" || a.status === "going" || !a.status))
            .map((a: any) => ({
              id: a.user_id,
              username: a.profiles?.username,
              full_name: a.profiles?.full_name,
              avatar_url: a.profiles?.avatar_url,
            }));

          const hostProfile = hostMap.get(ev.organizer_id || ev.creator_id);

          return {
            id: `event-${ev.id}`,
            eventId: ev.id,
            isEvent: true,
            name: ev.title,
            category: ev.category || "Community",
            lat: Number(ev.latitude),
            lng: Number(ev.longitude),
            locationName: ev.location_name || undefined,
            description: ev.description || undefined,
            eventDate: eventDate !== "Date to be announced" ? eventDate : undefined,
            eventTime: eventTime !== "TBA" ? eventTime : undefined,
            attendeeCount: attendees.length,
            attendees,
            host: hostProfile || undefined,
          };
        });

        setLiveEvents(mapped);
      }
    } catch (err) {
      console.error("Error fetching map events:", err);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveEvents();

    // Supabase Realtime channel subscription for instant map and attendee updates
    const supabase = createClient();
    const channel = supabase
      .channel("realtime:map_live_events_and_attendees")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          fetchLiveEvents();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendees" },
        () => {
          fetchLiveEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveEvents]);

  // Trigger resize event when sidebar toggles so map immediately adapts without gray space
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);


  // Combined locations: user events + featured landmarks
  const allLocations: MapLocation[] = [
    ...liveEvents,
    ...SORSOGON_FEATURED_LOCATIONS.map((loc) => ({
      ...loc,
      isEvent: false,
    })),
  ];

  // Dynamic category tabs
  const categoryFilters = [
    "All",
    "Events",
    "Beach",
    "Nature",
    "Adventure",
    "Sports",
    "Music",
    "Food",
    "Government",
  ];

  const filteredLocations = allLocations.filter((loc) => {
    // Category match
    if (selectedCategory === "Events") {
      if (!loc.isEvent) return false;
    } else if (selectedCategory !== "All") {
      if (loc.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = loc.name.toLowerCase().includes(q);
      const matchDesc = loc.description?.toLowerCase().includes(q);
      const matchVenue = loc.locationName?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchVenue) return false;
    }

    return true;
  });

  const handleSelectLocation = (loc: MapLocation) => {
    setSelectedLocationId(loc.id);
    setActiveCenter({ lat: loc.lat, lng: loc.lng });
    setActiveZoom(15);
  };

  return (
    <div className="h-[calc(100dvh-8.5rem)] md:h-[calc(100vh-4rem)] w-full flex flex-col md:flex-row relative bg-background overflow-hidden">
      {/* Floating Sidebar Toggle Button when collapsed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-3 left-3 z-30 bg-background/95 hover:bg-background text-foreground border shadow-md px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 backdrop-blur-sm transition-all"
        >
          <PanelLeftOpen className="h-4 w-4 text-primary" />
          <span>Show Places & Events</span>
        </button>
      )}

      {/* Sidebar Controls - Reduced Width (w-76 md:w-80) */}
      {isSidebarOpen && (
        <div className="w-full md:w-76 lg:w-80 border-b md:border-b-0 md:border-r bg-card p-3 sm:p-3.5 flex flex-col gap-3 z-10 shrink-0 shadow-sm max-h-[48vh] md:max-h-full transition-all">
          {/* Header & Live Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <Compass className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-sm leading-tight truncate">Sorsogon Live Map</h1>
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <Radio className="h-2.5 w-2.5 animate-pulse shrink-0" />
                  <span>Realtime Sync Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link href="/events/create">
                <Button size="sm" className="h-7 px-2 gap-1 text-[11px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                  <PlusCircle className="h-3 w-3" />
                  Pin
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground hidden md:inline-flex"
                title="Collapse sidebar to expand map"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pinned events & spots..."
              className="pl-8 h-7.5 text-xs bg-muted/40"
            />
          </div>

          {/* Categories */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Layers className="h-3 w-3" /> Filters
              </label>
              <span className="text-[10px] text-muted-foreground font-medium">
                {liveEvents.length} Live {liveEvents.length === 1 ? "Event" : "Events"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-18 overflow-y-auto no-scrollbar">
              {categoryFilters.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  className={`h-6.5 px-2 text-[10px] font-medium rounded-lg ${
                    cat === "Events" && selectedCategory === cat
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : ""
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "Events" ? `🎉 Events (${liveEvents.length})` : cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Locations & Events List - Proper pr-2.5 so cards don't touch scrollbar */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 overflow-x-hidden min-h-[140px]">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
              <span>Locations on Map ({filteredLocations.length})</span>
            </div>

            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border rounded-xl border-dashed">
                No places or events found for &quot;{selectedCategory}&quot;.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isEvent = loc.isEvent;
                const isSelected = selectedLocationId === loc.id;

                return (
                  <div
                    key={loc.id}
                    className={`w-full p-2.5 rounded-xl border transition-all group cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/10 shadow-sm"
                        : isEvent
                        ? "border-emerald-500/35 bg-emerald-950/10 hover:border-emerald-500 hover:bg-emerald-950/20"
                        : "border-border/60 hover:border-primary/50 hover:bg-accent/40"
                    }`}
                    onClick={() => handleSelectLocation(loc)}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{isEvent ? "🎉" : "📍"}</span>
                        <p className="font-semibold text-xs truncate group-hover:text-primary transition-colors">
                          {loc.name}
                        </p>
                      </div>
                      {loc.category && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isEvent
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {loc.category}
                        </span>
                      )}
                    </div>

                    {loc.locationName && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                        <span className="truncate">{loc.locationName}</span>
                      </p>
                    )}

                    {/* Event Date & Time */}
                    {(loc.eventDate || loc.eventTime) && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 font-medium">
                        {loc.eventDate && (
                          <span className="flex items-center gap-1 text-foreground font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{loc.eventDate}</span>
                          </span>
                        )}
                        {loc.eventTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{loc.eventTime}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Event Host / Creator */}
                    {loc.host && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                        <span className="text-[10px] text-muted-foreground font-medium">Host:</span>
                        <Link
                          href={loc.host.username ? `/profile/${encodeURIComponent(loc.host.username)}` : (loc.host.id ? `/profile/${loc.host.id}` : "#")}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-background hover:bg-emerald-500/10 border border-emerald-500/30 transition-colors group/host"
                        >
                          {loc.host.avatar_url ? (
                            <img
                              src={loc.host.avatar_url}
                              alt={loc.host.display_name || loc.host.full_name || loc.host.username || "Host"}
                              className="h-3.5 w-3.5 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0"
                            />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[8px] font-bold shrink-0">
                              {(loc.host.display_name || loc.host.full_name || loc.host.username || "H")[0]?.toUpperCase()}
                            </div>
                          )}
                          <span className="font-semibold text-foreground group-hover/host:text-primary transition-colors truncate max-w-[120px]">
                            {loc.host.display_name || loc.host.full_name || loc.host.username}
                          </span>
                        </Link>
                      </div>
                    )}

                    {loc.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {loc.description}
                      </p>
                    )}

                    {/* Realtime Attendees & Profile links */}
                    {isEvent && (
                      <div className="mt-2 pt-2 border-t border-emerald-500/20">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                            <Users className="h-3 w-3 shrink-0" />
                            <span>{loc.attendeeCount ?? 0} attending</span>
                          </span>
                          {loc.eventId && (
                            <Link
                              href={`/events/${loc.eventId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                            >
                              View Event →
                            </Link>
                          )}
                        </div>

                        {loc.attendees && loc.attendees.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium mr-1">Joined:</span>
                            {loc.attendees.slice(0, 4).map((att) => {
                              const name = att.full_name || att.username || "User";
                              const profileHref = att.username ? `/profile/${encodeURIComponent(att.username)}` : (att.id ? `/profile/${att.id}` : "#");
                              return (
                                <Link
                                  key={att.id}
                                  href={profileHref}
                                  onClick={(e) => e.stopPropagation()}
                                  title={`Visit ${name}'s profile`}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold bg-background hover:bg-emerald-500/10 border px-1.5 py-0.5 rounded-full transition-colors"
                                >
                                  {att.avatar_url ? (
                                    <img
                                      src={att.avatar_url}
                                      alt={name}
                                      className="h-3 w-3 rounded-full object-cover border border-emerald-500/40"
                                    />
                                  ) : (
                                    <div className="h-3 w-3 rounded-full bg-muted flex items-center justify-center text-[7px] font-bold">
                                      {(name[0] || "U").toUpperCase()}
                                    </div>
                                  )}
                                  <span className="max-w-[65px] truncate">{name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Reset View Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-7.5 shrink-0"
            onClick={() => {
              setSelectedLocationId(null);
              setActiveCenter(SORSOGON_CENTER);
              setActiveZoom(11);
            }}
          >
            <Navigation className="h-3.5 w-3.5" /> Reset Sorsogon View
          </Button>
        </div>
      )}

      {/* Map Display Container */}
      <div className="flex-1 h-full min-h-[400px] relative">
        <MapView
          locations={filteredLocations}
          center={activeCenter}
          zoom={activeZoom}
          selectedId={selectedLocationId || undefined}
          onSelectLocation={handleSelectLocation}
        />
      </div>
    </div>
  );
}
