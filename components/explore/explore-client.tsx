"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  CalendarDays,
  Users,
  MapPin,
  X,
  Plus,
  Navigation,
  Maximize2,
  Minimize2,
  Route,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MapView, MapLocation, MapAttendee } from "@/components/map/map-view";
import { SORSOGON_CENTER, SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { formatEventDate, formatEventTime, cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface ExploreClientProps {
  upcomingEvents: any[];
  activeUsers: any[];
  allMapLocations: MapLocation[];
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
}: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [events, setEvents] = useState<any[]>(initialEvents);
  const [mapLocations, setMapLocations] = useState<MapLocation[]>(initialMapLocations);

  // Interactive Map State (All on 1 unified screen)
  const [activeCenter, setActiveCenter] = useState(SORSOGON_CENTER);
  const [activeZoom, setActiveZoom] = useState(11);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectionKey, setSelectionKey] = useState(0);
  const [isMapTall, setIsMapTall] = useState(false);

  // Google Maps-style Route Directions State
  const [directionsTargetId, setDirectionsTargetId] = useState<string | undefined>(undefined);
  const [directionsRequestKey, setDirectionsRequestKey] = useState(0);

  // Real-time sync for events & attendees on Explore
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
          price: ev.price ? Number(ev.price) : 0,
          imageUrl: ev.cover_image_url || ev.cover_image || undefined,
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
  }, [isMapTall]);

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

  // Select location, expand map, update coordinates and force re-opening the popup
  const handleSelectLocation = useCallback((loc: MapLocation) => {
    setIsMapTall(true);
    setSelectedLocationId(loc.id);
    setSelectionKey((prev) => prev + 1);
    setActiveCenter({ lat: loc.lat, lng: loc.lng });
    setActiveZoom(15);

    if (typeof document !== "undefined") {
      const cardEl = document.getElementById(`explore-spot-card-${loc.id}`);
      cardEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, []);

  const handleDeselectLocation = useCallback(() => {
    setSelectedLocationId(null);
  }, []);

  // Smoothly focus event on map when clicked from the list below
  const handleFocusEventOnMap = useCallback(
    (event: any) => {
      const locId = `event-${event.id}`;
      const targetLoc = mapLocations.find(
        (l) => l.id === locId || l.eventId === event.id
      );
      if (targetLoc) {
        handleSelectLocation(targetLoc);
        if (typeof document !== "undefined") {
          const mapEl = document.getElementById("explore-map-section");
          mapEl?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    },
    [mapLocations, handleSelectLocation]
  );

  const handleTriggerDirections = useCallback((locId: string) => {
    setIsMapTall(true);
    setSelectedLocationId(locId);
    setSelectionKey((prev) => prev + 1);
    setDirectionsTargetId(locId);
    setDirectionsRequestKey((prev) => prev + 1);

    if (typeof document !== "undefined") {
      const mapEl = document.getElementById("explore-map-section");
      mapEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const handleResetView = useCallback(() => {
    setSelectedLocationId(null);
    setSelectionKey((prev) => prev + 1);
    setActiveCenter(SORSOGON_CENTER);
    setActiveZoom(11);
  }, []);

  return (
    <div className="w-full max-w-5xl mx-auto px-3.5 sm:px-4 pt-2 pb-6 sm:py-5 space-y-4 overflow-x-hidden">
      {/* Top Bar: Clean Title + Pin Event Button + Search + Category Pills */}
      <div className="space-y-2.5 w-full min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#FF5E3A]/15 to-[#FF3366]/15 text-[#FF3366] flex items-center justify-center shrink-0">
              <Compass className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">
              Explore
            </h1>
          </div>

          <Link
            href="/events/create"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Pin Event</span>
          </Link>
        </div>

        {/* Search Input (16px on mobile to prevent iOS Safari zoom) */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, places, or spots in Sorsogon..."
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

      {/* Unified Content Grid: Interactive Map + Spots + Events + People all on 1 screen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full min-w-0">
        <div className="md:col-span-2 space-y-5 min-w-0 w-full">
          {/* 1. Unified Interactive Map + Swipeable Spot Cards */}
          <section id="explore-map-section" className="space-y-2.5 w-full min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5 min-w-0">
                <MapPin className="h-4 w-4 text-[#FF3366] shrink-0" />
                <span className="truncate">Sorsogon Activity Map</span>
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  ({filteredMapLocations.length})
                </span>
              </h2>

              <div className="flex items-center gap-1.5 shrink-0">
                {(selectedLocationId || activeZoom !== 11) && (
                  <button
                    onClick={handleResetView}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Reset View</span>
                  </button>
                )}
                <button
                  onClick={() => setIsMapTall((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-accent border border-border/70 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                >
                  {isMapTall ? (
                    <>
                      <Minimize2 className="h-3 w-3 text-primary" />
                      <span>Compact</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3 w-3 text-primary" />
                      <span>Larger Map</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Map Canvas (Defaults to Satellite View + Switcher + Route Line) */}
            <div
              className={cn(
                "w-full rounded-2xl overflow-hidden border border-border/80 shadow-xs relative bg-card transition-all duration-300",
                isMapTall ? "h-[450px] sm:h-[510px]" : "h-[360px] sm:h-[420px]"
              )}
            >
              <MapView
                locations={filteredMapLocations}
                center={activeCenter}
                zoom={activeZoom}
                selectedId={selectedLocationId || undefined}
                selectionKey={selectionKey}
                defaultMapStyle="satellite"
                directionsTargetId={directionsTargetId}
                directionsRequestKey={directionsRequestKey}
                onSelectLocation={handleSelectLocation}
                onDeselectLocation={handleDeselectLocation}
                showZoomControl={true}
                compact={!isMapTall}
              />
            </div>

            {/* Horizontal Swipeable Spot & Event Cards synced with the Map */}
            {filteredMapLocations.length > 0 && (
              <div className="flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 pt-0.5 no-scrollbar">
                {filteredMapLocations.map((loc) => {
                  const isEvent = loc.isEvent;
                  const isSelected = selectedLocationId === loc.id;
                  const emoji = getCategoryEmoji(loc.category, loc.name);

                  return (
                    <div
                      id={`explore-spot-card-${loc.id}`}
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className={cn(
                        "w-[245px] sm:w-[260px] shrink-0 snap-start rounded-2xl border p-2.5 bg-card transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99]",
                        isSelected
                          ? "ring-2 ring-primary border-primary bg-primary/[0.03] shadow-xs"
                          : isEvent
                          ? "border-emerald-500/35 hover:border-emerald-500/60"
                          : "border-border/80 hover:border-primary/40"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs shrink-0">{emoji}</span>
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

                      <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between gap-1.5 text-[10px]">
                        {isEvent ? (
                          <div className="flex items-center gap-1.5 min-w-0">
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
                        ) : (
                          <span className="text-muted-foreground truncate">
                            Featured Spot
                          </span>
                        )}

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerDirections(loc.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shadow-2xs transition-colors cursor-pointer"
                            title="Get Directions & Draw Route Line"
                          >
                            <Route className="h-2.5 w-2.5" />
                            <span>Directions</span>
                          </button>

                          {isEvent && loc.eventId && (
                            <Link
                              href={`/events/${loc.eventId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-primary hover:underline shrink-0 text-[10px]"
                            >
                              Open →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 2. Upcoming Events */}
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

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleFocusEventOnMap(event);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/12 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 font-bold text-[10px] transition-colors shrink-0 cursor-pointer"
                              title="Show event on map with full details"
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              <span>Map</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTriggerDirections(`event-${event.id}`);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600/12 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 font-bold text-[10px] transition-colors shrink-0 cursor-pointer"
                              title="Show driving route on map"
                            >
                              <Route className="h-2.5 w-2.5" />
                              <span>Route</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* 3. Community Members: Horizontal Strip on Mobile, Sidebar on Desktop */}
        <div className="space-y-2.5 min-w-0 w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[#FF3366]" />
              People
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
    </div>
  );
}
