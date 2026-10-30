"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Map as MapIcon,
  CalendarDays,
  Users,
  MapPin,
  X,
  Plus,
  Navigation,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Clock,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapView, MapLocation, MapAttendee } from "@/components/map/map-view";
import { SORSOGON_CENTER, SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { formatEventDate, formatEventTime, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ExploreClientProps {
  upcomingEvents: any[];
  activeUsers: any[];
  allMapLocations: MapLocation[];
  initialView?: "discover" | "map";
}

const CATEGORIES = [
  { id: "All", label: "All" },
  { id: "Events", label: "🎉 Events" },
  { id: "Music", label: "🎵 Music" },
  { id: "Food", label: "🍔 Food" },
  { id: "Sports", label: "🏀 Sports" },
  { id: "Arts", label: "🎨 Arts" },
  { id: "Beach", label: "🏖️ Beach" },
  { id: "Nature", label: "🌿 Nature" },
  { id: "Tech", label: "💻 Tech" },
  { id: "Community", label: "👥 Community" },
];

export function ExploreClient({
  upcomingEvents: initialEvents,
  activeUsers,
  allMapLocations: initialMapLocations,
  initialView = "discover",
}: ExploreClientProps) {
  const [viewMode, setViewMode] = useState<"discover" | "map">(initialView);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>(initialMapLocations);

  // Interactive Map State
  const [activeCenter, setActiveCenter] = useState(SORSOGON_CENTER);
  const [activeZoom, setActiveZoom] = useState(11);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [showMobileCards, setShowMobileCards] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDiscoverMapExpanded, setIsDiscoverMapExpanded] = useState(false);

  // Real-time sync for events & attendees on Explore + Map
  const refreshLiveExploreData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
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
        .limit(20);

      if (error || !data) return;

      const hostIds = Array.from(
        new Set(data.map((ev: any) => ev.organizer_id || ev.creator_id).filter(Boolean))
      );

      const hostMap = new Map();
      if (hostIds.length > 0) {
        const { data: hostProfiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, display_name, avatar_url")
          .in("id", hostIds);
        (hostProfiles || []).forEach((p: any) => hostMap.set(p.id, p));
      }

      const updatedEvents = data.map((ev: any) => {
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

      setEvents(updatedEvents);

      const livePins: MapLocation[] = updatedEvents.map((ev: any, idx: number) => {
        const eventDate = formatEventDate(ev.event_date, ev.start_time, ev.created_at, "EEE, MMM d");
        const eventTime = formatEventTime(ev.start_time, ev.end_time);

        const angle = idx * 1.35;
        const fallbackLat = 12.9743 + Math.cos(angle) * 0.012;
        const fallbackLng = 124.0044 + Math.sin(angle) * 0.012;

        const attendees: MapAttendee[] = (ev.validAttendees || []).map((a: any) => ({
          id: a.user_id,
          username: a.profiles?.username,
          full_name: a.profiles?.full_name,
          avatar_url: a.profiles?.avatar_url,
        }));

        return {
          id: `event-${ev.id}`,
          eventId: ev.id,
          isEvent: true,
          name: ev.title,
          category: ev.category || "Community",
          lat: ev.latitude ? Number(ev.latitude) : fallbackLat,
          lng: ev.longitude ? Number(ev.longitude) : fallbackLng,
          locationName: ev.location_name || "Sorsogon, Philippines",
          description: ev.description || ev.location_name || "Sorsogon, Philippines",
          eventDate: eventDate !== "Date to be announced" ? eventDate : undefined,
          eventTime: eventTime !== "TBA" ? eventTime : undefined,
          attendeeCount: attendees.length,
          attendees,
          host: ev.profiles || undefined,
        };
      });

      setMapLocations([
        ...livePins,
        ...SORSOGON_FEATURED_LOCATIONS.map((loc) => ({
          ...loc,
          isEvent: false,
        })),
      ]);
    } catch (err) {
      console.error("Error syncing live explore data:", err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("realtime:explore_and_map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => refreshLiveExploreData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendees" },
        () => refreshLiveExploreData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshLiveExploreData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [viewMode, isSidebarOpen, isDiscoverMapExpanded]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedCategory !== "All" && selectedCategory !== "Events") {
        const cat = (ev.category || "").toLowerCase();
        if (!cat.includes(selectedCategory.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title?.toLowerCase().includes(q);
        const matchLoc = ev.location_name?.toLowerCase().includes(q);
        const matchCat = ev.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchCat) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const filteredMapLocations = useMemo(() => {
    return mapLocations.filter((loc) => {
      if (selectedCategory === "Events") {
        if (!loc.isEvent) return false;
      } else if (selectedCategory !== "All") {
        const cat = (loc.category || "").toLowerCase();
        if (!cat.includes(selectedCategory.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = loc.name?.toLowerCase().includes(q);
        const matchDesc = loc.description?.toLowerCase().includes(q);
        const matchVenue = loc.locationName?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchVenue) return false;
      }
      return true;
    });
  }, [mapLocations, selectedCategory, searchQuery]);

  const handleSelectLocation = (loc: MapLocation) => {
    setSelectedLocationId(loc.id);
    setActiveCenter({ lat: loc.lat, lng: loc.lng });
    setActiveZoom(15);
    setShowMobileCards(true);

    if (typeof document !== "undefined") {
      const cardEl = document.getElementById(`explore-map-card-${loc.id}`);
      cardEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const handleResetView = () => {
    setSelectedLocationId(null);
    setActiveCenter(SORSOGON_CENTER);
    setActiveZoom(11);
  };

  const selectedLocation = useMemo(
    () => filteredMapLocations.find((l) => l.id === selectedLocationId) || null,
    [filteredMapLocations, selectedLocationId]
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 pt-2 pb-4 sm:py-5 space-y-3.5 overflow-x-hidden">
      {/* Unified Top Bar: Title + Discover/Map Switcher + Search + Category Pills */}
      <div className="space-y-2.5 w-full min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 text-[#FF3366] flex items-center justify-center shrink-0">
              <Compass className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold tracking-tight truncate">
                Explore &amp; Map
              </h1>
            </div>
          </div>

          {/* Segmented View Toggle: Discover vs Full Map */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/80 border border-border/70">
              <button
                onClick={() => setViewMode("discover")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "discover"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 text-[#FF3366]" />
                <span>Discover</span>
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  viewMode === "map"
                    ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span>Map</span>
                <span
                  className={cn(
                    "text-[10px] px-1 rounded-full font-bold",
                    viewMode === "map"
                      ? "bg-white/20 text-white"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {filteredMapLocations.length}
                </span>
              </button>
            </div>

            <Link
              href="/events/create"
              className="hidden sm:inline-flex items-center gap-1 h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Pin Event</span>
            </Link>
          </div>
        </div>

        {/* Search Input (16px on mobile to prevent iOS auto-zoom) */}
        <div className="flex items-center gap-2 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, places, or categories in Sorsogon..."
              className="w-full pl-9 pr-8 h-10 rounded-xl bg-card border-border/80 text-base sm:text-sm shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {viewMode === "map" && (
            <button
              onClick={handleResetView}
              className="h-10 px-3 rounded-xl bg-card hover:bg-accent border border-border/80 text-xs font-semibold inline-flex items-center gap-1.5 text-foreground shrink-0 shadow-2xs cursor-pointer"
              title="Reset map to Sorsogon center"
            >
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Single-Row Horizontal Category Pills */}
        <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar pb-0.5">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer",
                  active
                    ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
                    : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border/70"
                )}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1: UNIFIED DISCOVER VIEW (Interactive Map + Events + People) */}
      {viewMode === "discover" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
          <div className="md:col-span-2 space-y-4 min-w-0 w-full">
            {/* Interactive Activity Map Section */}
            <section className="space-y-2 w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                  <MapPin className="h-4 w-4 text-[#FF3366] shrink-0" />
                  <span className="truncate">Live Activity Map</span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    ({filteredMapLocations.length})
                  </span>
                </h2>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedLocationId && (
                    <button
                      onClick={handleResetView}
                      className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md border border-border/70 bg-card cursor-pointer"
                    >
                      Reset Pin
                    </button>
                  )}
                  <button
                    onClick={() => setIsDiscoverMapExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-foreground bg-card hover:bg-accent border border-border/70 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    {isDiscoverMapExpanded ? (
                      <>
                        <Minimize2 className="h-3 w-3 text-primary" />
                        <span>Compact</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3 w-3 text-primary" />
                        <span>Expand</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    <MapIcon className="h-3 w-3" />
                    <span>Full Map</span>
                  </button>
                </div>
              </div>

              {/* Map Canvas */}
              <div
                className={cn(
                  "w-full rounded-2xl overflow-hidden border border-border/80 shadow-2xs relative bg-card transition-all duration-300",
                  isDiscoverMapExpanded ? "h-80 sm:h-96" : "h-48 sm:h-60"
                )}
              >
                <MapView
                  locations={filteredMapLocations}
                  center={activeCenter}
                  zoom={activeZoom}
                  selectedId={selectedLocationId || undefined}
                  onSelectLocation={handleSelectLocation}
                  compact={!isDiscoverMapExpanded}
                />
              </div>

              {/* Quick Horizontal Spot/Event Pills under the map */}
              {filteredMapLocations.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
                  {filteredMapLocations.slice(0, 10).map((loc) => {
                    const isSelected = selectedLocationId === loc.id;
                    const emoji = getCategoryEmoji(loc.category, loc.name);
                    return (
                      <button
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all shrink-0 cursor-pointer",
                          isSelected
                            ? "bg-primary/12 border-primary text-primary shadow-2xs"
                            : loc.isEvent
                            ? "bg-emerald-500/8 border-emerald-500/30 text-foreground hover:border-emerald-500/60"
                            : "bg-card border-border/70 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span>{emoji}</span>
                        <span className="max-w-[130px] truncate">{loc.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Selected Pin Detail Banner */}
              {selectedLocation && (
                <div className="p-3 rounded-2xl border border-primary/30 bg-card shadow-xs flex items-center justify-between gap-3 animate-in fade-in-50 duration-150">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">
                        {getCategoryEmoji(selectedLocation.category, selectedLocation.name)}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold truncate">
                        {selectedLocation.name}
                      </h3>
                      {selectedLocation.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          {selectedLocation.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {selectedLocation.locationName ||
                          selectedLocation.description ||
                          "Sorsogon"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {selectedLocation.eventId && (
                      <Link href={`/events/${selectedLocation.eventId}`}>
                        <Button size="sm" className="h-8 rounded-xl text-xs font-semibold">
                          View Event →
                        </Button>
                      </Link>
                    )}
                    <button
                      onClick={() => setSelectedLocationId(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                      aria-label="Close pin details"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Upcoming Events */}
            <section className="space-y-2.5 w-full min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                  <CalendarDays className="h-4 w-4 text-[#FF3366] shrink-0" />
                  <span className="truncate">Upcoming Events</span>
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    ({filteredEvents.length})
                  </span>
                </h2>
                <Link
                  href="/events"
                  className="text-xs text-primary hover:underline font-semibold shrink-0"
                >
                  View All →
                </Link>
              </div>

              {filteredEvents.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed bg-card/50 text-xs text-muted-foreground">
                  No matching events found. Try another category or search term.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 w-full min-w-0">
                  {filteredEvents.map((event) => {
                    const emoji = getCategoryEmoji(event.category, event.title);
                    const coverImage = event.cover_image_url || event.cover_image;
                    const isFree = !event.price || Number(event.price) === 0;
                    const dateFormatted = formatEventDate(
                      event.event_date,
                      event.start_time,
                      event.created_at,
                      "MMM d"
                    );

                    return (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="group flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0 p-2.5 sm:p-0 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden w-full min-w-0 active:scale-[0.99]"
                      >
                        {/* Thumbnail: Compact Square on Mobile, 16:9 on Desktop */}
                        <div className="h-20 w-20 sm:h-auto sm:w-full sm:aspect-[16/9] rounded-xl sm:rounded-none bg-muted relative shrink-0 overflow-hidden">
                          {coverImage ? (
                            <img
                              src={coverImage}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/8 text-primary">
                              <span className="text-2xl sm:text-3xl">{emoji}</span>
                            </div>
                          )}
                          <div className="absolute top-1.5 right-1.5 bg-background/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs border border-border/60">
                            {isFree ? "Free" : `₱${event.price}`}
                          </div>
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0 sm:p-3.5 flex flex-col justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0">{emoji}</span>
                              <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                                {event.title}
                              </h3>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">
                                {event.location_name || "Sorsogon"}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground min-w-0">
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-primary/10 px-1.5 py-0.5 rounded-md text-[10px]">
                                <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                                {dateFormatted}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[10px]">
                                <Users className="h-3 w-3 shrink-0" />
                                {event.attendee_count || 0}
                              </span>
                            </div>

                            {event.profiles && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[100px]">
                                {event.profiles.avatar_url ? (
                                  <img
                                    src={event.profiles.avatar_url}
                                    alt={
                                      event.profiles.display_name ||
                                      event.profiles.full_name ||
                                      event.profiles.username
                                    }
                                    className="h-3.5 w-3.5 rounded-full object-cover shrink-0 ring-1 ring-border"
                                  />
                                ) : (
                                  <span className="h-3.5 w-3.5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[8px] font-bold shrink-0">
                                    {(
                                      event.profiles.display_name ||
                                      event.profiles.full_name ||
                                      event.profiles.username ||
                                      "U"
                                    )[0]?.toUpperCase()}
                                  </span>
                                )}
                                <span className="truncate">
                                  {event.profiles.display_name ||
                                    event.profiles.full_name ||
                                    event.profiles.username}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* People to Discover: Horizontal Strip on Mobile, Sidebar on Desktop */}
          <div className="space-y-2.5 min-w-0 w-full">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-4 w-4 text-[#FF3366]" />
                Community Members
              </h2>
            </div>

            <div className="flex md:flex-col gap-2.5 w-full overflow-x-auto no-scrollbar pb-1">
              {activeUsers?.map((u) => {
                const name = u.full_name || u.display_name || u.username || "User";
                return (
                  <Link
                    key={u.id}
                    href={`/profile/${u.username}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/70 bg-card hover:border-primary/40 transition-all shrink-0 w-44 md:w-full active:scale-[0.98]"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold overflow-hidden text-primary border shrink-0">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        @{u.username}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: INTERACTIVE FULL MAP VIEW (Integrated inside Explore) */
        <div className="h-[calc(100dvh-14.5rem)] md:h-[calc(100dvh-11.5rem)] min-h-[400px] w-full flex flex-col md:flex-row relative bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden">
          {/* Desktop Sidebar Toggle when collapsed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex absolute top-3 left-3 z-30 bg-background/95 hover:bg-background text-foreground border shadow-md px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-2 backdrop-blur-sm transition-all cursor-pointer"
            >
              <PanelLeftOpen className="h-4 w-4 text-primary" />
              <span>Spots ({filteredMapLocations.length})</span>
            </button>
          )}

          {/* Desktop Left Locations Sidebar */}
          {isSidebarOpen && (
            <div className="hidden md:flex md:w-72 border-r bg-card p-3 flex-col gap-2.5 z-10 shrink-0 h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  {filteredMapLocations.length} Map Locations
                </span>
                <div className="flex items-center gap-1">
                  {selectedLocationId && (
                    <button
                      onClick={handleResetView}
                      className="text-[11px] text-primary hover:underline font-medium px-1.5 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsSidebarOpen(false)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    title="Collapse list"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 overflow-x-hidden">
                {filteredMapLocations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground border rounded-xl border-dashed">
                    No matching locations found.
                  </div>
                ) : (
                  filteredMapLocations.map((loc) => {
                    const isEvent = loc.isEvent;
                    const isSelected = selectedLocationId === loc.id;

                    return (
                      <div
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc)}
                        className={cn(
                          "w-full p-2.5 rounded-xl border transition-all cursor-pointer",
                          isSelected
                            ? "ring-2 ring-primary border-primary bg-primary/5 shadow-2xs"
                            : isEvent
                            ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60"
                            : "border-border/70 hover:border-primary/40 hover:bg-accent/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs shrink-0">
                              {isEvent ? "🎉" : "📍"}
                            </span>
                            <p className="font-semibold text-xs truncate">
                              {loc.name}
                            </p>
                          </div>
                          {loc.category && (
                            <span
                              className={cn(
                                "text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                                isEvent
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {loc.category}
                            </span>
                          )}
                        </div>

                        {(loc.locationName || loc.description) && (
                          <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                            <span className="truncate">
                              {loc.locationName || loc.description}
                            </span>
                          </p>
                        )}

                        {(loc.eventDate || loc.eventTime) && (
                          <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2 font-medium">
                            {loc.eventDate && (
                              <span className="inline-flex items-center gap-1 text-foreground font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <CalendarDays className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                                {loc.eventDate}
                              </span>
                            )}
                            {loc.eventTime && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {loc.eventTime}
                              </span>
                            )}
                          </div>
                        )}

                        {isEvent && (
                          <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                              <Users className="h-3 w-3" />
                              {loc.attendeeCount ?? 0} attending
                            </span>
                            {loc.eventId && (
                              <Link
                                href={`/events/${loc.eventId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] font-bold text-primary hover:underline shrink-0"
                              >
                                Open →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Map Canvas + Mobile Floating Bottom Spot Cards */}
          <div className="flex-1 h-full w-full relative">
            {/* Mobile Floating Bottom Horizontal Cards */}
            <div className="md:hidden absolute bottom-2.5 left-0 right-0 z-20 flex flex-col gap-1.5 pointer-events-none">
              <div className="px-2.5 flex items-center justify-between">
                <button
                  onClick={() => setShowMobileCards((prev) => !prev)}
                  className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/95 backdrop-blur-md border border-border/80 shadow-md text-[11px] font-semibold text-foreground"
                >
                  <MapPin className="h-3 w-3 text-[#FF3366]" />
                  <span>
                    {filteredMapLocations.length}{" "}
                    {filteredMapLocations.length === 1 ? "Spot" : "Spots"}
                  </span>
                  {showMobileCards ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>

                <Link
                  href="/events/create"
                  className="pointer-events-auto inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-semibold shadow-md"
                >
                  <Plus className="h-3 w-3" />
                  <span>Pin Event</span>
                </Link>
              </div>

              {showMobileCards && filteredMapLocations.length > 0 && (
                <div className="pointer-events-auto flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory px-2.5 pb-0.5 no-scrollbar">
                  {filteredMapLocations.map((loc) => {
                    const isEvent = loc.isEvent;
                    const isSelected = selectedLocationId === loc.id;

                    return (
                      <div
                        id={`explore-map-card-${loc.id}`}
                        key={loc.id}
                        onClick={() => handleSelectLocation(loc)}
                        className={cn(
                          "w-[255px] shrink-0 snap-center rounded-2xl border p-3 bg-background/95 backdrop-blur-md shadow-lg transition-all cursor-pointer flex flex-col justify-between",
                          isSelected
                            ? "ring-2 ring-primary border-primary"
                            : isEvent
                            ? "border-emerald-500/40"
                            : "border-border/80"
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs shrink-0">
                                {isEvent ? "🎉" : "📍"}
                              </span>
                              <h3 className="font-bold text-xs truncate text-foreground">
                                {loc.name}
                              </h3>
                            </div>
                            {loc.category && (
                              <span
                                className={cn(
                                  "text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0",
                                  isEvent
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : "bg-primary/10 text-primary"
                                )}
                              >
                                {loc.category}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-muted-foreground mt-1 truncate flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                            <span className="truncate">
                              {loc.locationName || loc.description || "Sorsogon"}
                            </span>
                          </p>
                        </div>

                        {isEvent ? (
                          <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-2 min-w-0">
                              {loc.eventDate && (
                                <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-emerald-500/10 px-1.5 py-0.5 rounded truncate">
                                  <CalendarDays className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  {loc.eventDate}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Users className="h-2.5 w-2.5" />
                                {loc.attendeeCount ?? 0}
                              </span>
                            </div>
                            {loc.eventId && (
                              <Link
                                href={`/events/${loc.eventId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-bold text-primary hover:underline shrink-0 text-[11px]"
                              >
                                Open →
                              </Link>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="truncate">Tap to focus pin</span>
                            <span className="text-primary font-semibold shrink-0">
                              Zoom →
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Interactive Map */}
            <MapView
              locations={filteredMapLocations}
              center={activeCenter}
              zoom={activeZoom}
              selectedId={selectedLocationId || undefined}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        </div>
      )}
    </div>
  );
}
