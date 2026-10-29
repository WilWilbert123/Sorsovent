"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Compass,
  Calendar,
  Plus,
  Search,
  Users,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { MapView, MapLocation, MapAttendee } from "@/components/map/map-view";
import { SORSOGON_FEATURED_LOCATIONS, SORSOGON_CENTER } from "@/lib/map/mapbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { formatEventDate, formatEventTime } from "@/lib/utils";

const CATEGORY_FILTERS = [
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

export default function MapPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeCenter, setActiveCenter] = useState(SORSOGON_CENTER);
  const [activeZoom, setActiveZoom] = useState(11);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveEvents, setLiveEvents] = useState<MapLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showMobileCards, setShowMobileCards] = useState(true);

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

      const mapped: MapLocation[] = data.map((ev: any) => {
        const eventDate = formatEventDate(ev.event_date, ev.start_time, ev.created_at, "EEE, MMM d");
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
    } catch (err) {
      console.error("Error fetching map events:", err);
    }
  }, []);

  useEffect(() => {
    fetchLiveEvents();

    const supabase = createClient();
    const channel = supabase
      .channel("realtime:map_live_events_and_attendees")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => fetchLiveEvents()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_attendees" },
        () => fetchLiveEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveEvents]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  const allLocations: MapLocation[] = [
    ...liveEvents,
    ...SORSOGON_FEATURED_LOCATIONS.map((loc) => ({
      ...loc,
      isEvent: false,
    })),
  ];

  const filteredLocations = allLocations.filter((loc) => {
    if (selectedCategory === "Events") {
      if (!loc.isEvent) return false;
    } else if (selectedCategory !== "All") {
      if (loc.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false;
      }
    }

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
    setShowMobileCards(true);

    if (typeof document !== "undefined") {
      const cardEl = document.getElementById(`mobile-map-card-${loc.id}`);
      cardEl?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  const handleResetView = () => {
    setSelectedLocationId(null);
    setActiveCenter(SORSOGON_CENTER);
    setActiveZoom(11);
  };

  return (
    <div className="h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-1.5rem)] w-full flex flex-col md:flex-row relative bg-background overflow-hidden">
      {/* Desktop Sidebar Toggle when collapsed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex absolute top-3 left-3 z-30 bg-background/95 hover:bg-background text-foreground border shadow-md px-3 py-1.5 rounded-xl text-xs font-semibold items-center gap-2 backdrop-blur-sm transition-all cursor-pointer"
        >
          <PanelLeftOpen className="h-4 w-4 text-primary" />
          <span>Show Places ({filteredLocations.length})</span>
        </button>
      )}

      {/* Desktop Left Sidebar */}
      {isSidebarOpen && (
        <div className="hidden md:flex md:w-80 border-r bg-card p-3.5 flex-col gap-3 z-10 shrink-0 h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                <Compass className="h-4 w-4" />
              </div>
              <h1 className="font-bold text-sm truncate">Sorsogon Map</h1>
            </div>

            <div className="flex items-center gap-1">
              <Link href="/events/create">
                <Button
                  size="sm"
                  className="h-7 px-2.5 gap-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Pin
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events & spots..."
              className="pl-8 pr-7 h-8 text-xs bg-muted/40 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {CATEGORY_FILTERS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    active
                      ? cat === "Events"
                        ? "bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground"
                      : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat === "Events" ? `🎉 Events (${liveEvents.length})` : cat}
                </button>
              );
            })}
          </div>

          {/* Desktop Locations List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 overflow-x-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold px-0.5">
              <span>{filteredLocations.length} locations</span>
              {selectedLocationId && (
                <button
                  onClick={handleResetView}
                  className="text-primary hover:underline text-[11px] font-medium cursor-pointer"
                >
                  Reset view
                </button>
              )}
            </div>

            {filteredLocations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground border rounded-xl border-dashed">
                No matching locations found.
              </div>
            ) : (
              filteredLocations.map((loc) => {
                const isEvent = loc.isEvent;
                const isSelected = selectedLocationId === loc.id;

                return (
                  <div
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-full p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-primary border-primary bg-primary/5 shadow-2xs"
                        : isEvent
                        ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60"
                        : "border-border/70 hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs shrink-0">{isEvent ? "🎉" : "📍"}</span>
                        <p className="font-semibold text-xs truncate">{loc.name}</p>
                      </div>
                      {loc.category && (
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            isEvent
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {loc.category}
                        </span>
                      )}
                    </div>

                    {loc.locationName && (
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-emerald-500" />
                        <span className="truncate">{loc.locationName}</span>
                      </p>
                    )}

                    {(loc.eventDate || loc.eventTime) && (
                      <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2 font-medium">
                        {loc.eventDate && (
                          <span className="inline-flex items-center gap-1 text-foreground font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            <Calendar className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
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

                    {!isEvent && loc.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {loc.description}
                      </p>
                    )}

                    {isEvent && (
                      <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 min-w-0">
                          {loc.host && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">
                              By{" "}
                              <strong className="text-foreground font-semibold">
                                {loc.host.display_name || loc.host.full_name || loc.host.username}
                              </strong>
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                            <Users className="h-3 w-3" />
                            {loc.attendeeCount ?? 0}
                          </span>
                        </div>
                        {loc.eventId && (
                          <Link
                            href={`/events/${loc.eventId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold text-primary hover:underline shrink-0"
                          >
                            View →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs h-8 rounded-xl shrink-0"
            onClick={handleResetView}
          >
            <Navigation className="h-3.5 w-3.5" /> Reset View
          </Button>
        </div>
      )}

      {/* Map Canvas + Mobile Floating Overlays */}
      <div className="flex-1 h-full w-full relative">
        {/* MOBILE TOP OVERLAY: Search Bar + Horizontal Category Chips */}
        <div className="md:hidden absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-col gap-2 pointer-events-none">
          {/* Frosted Search + Action Bar */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-background/95 backdrop-blur-md border border-border/80 shadow-md rounded-2xl p-1.5">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search map spots & events..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1.5 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleResetView}
              className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60 shrink-0 transition-colors"
              title="Reset Sorsogon View"
              aria-label="Reset map view"
            >
              <Navigation className="h-3.5 w-3.5" />
            </button>

            <Link
              href="/events/create"
              className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-2xs shrink-0 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Pin</span>
            </Link>
          </div>

          {/* Single-Row Horizontal Scrollable Category Pills */}
          <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar px-0.5 py-0.5">
            {CATEGORY_FILTERS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shadow-xs transition-all shrink-0 cursor-pointer border ${
                    active
                      ? cat === "Events"
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-primary text-primary-foreground border-primary"
                      : "bg-background/95 backdrop-blur-md text-foreground/85 border-border/80 hover:bg-background"
                  }`}
                >
                  {cat === "Events" ? `🎉 Events (${liveEvents.length})` : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* MOBILE BOTTOM OVERLAY: Collapsible Horizontal Spot/Event Cards */}
        <div className="md:hidden absolute bottom-2.5 left-0 right-0 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 flex items-center justify-between">
            <button
              onClick={() => setShowMobileCards((prev) => !prev)}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/95 backdrop-blur-md border border-border/80 shadow-md text-[11px] font-semibold text-foreground"
            >
              <MapPin className="h-3 w-3 text-primary" />
              <span>
                {filteredLocations.length}{" "}
                {filteredLocations.length === 1 ? "Spot" : "Spots"}
              </span>
              {showMobileCards ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>

          {showMobileCards && filteredLocations.length > 0 && (
            <div className="pointer-events-auto flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory px-2.5 pb-0.5 no-scrollbar">
              {filteredLocations.map((loc) => {
                const isEvent = loc.isEvent;
                const isSelected = selectedLocationId === loc.id;

                return (
                  <div
                    id={`mobile-map-card-${loc.id}`}
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className={`w-[265px] shrink-0 snap-center rounded-2xl border p-3 bg-background/95 backdrop-blur-md shadow-lg transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "ring-2 ring-primary border-primary"
                        : isEvent
                        ? "border-emerald-500/40"
                        : "border-border/80"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs shrink-0">{isEvent ? "🎉" : "📍"}</span>
                          <h3 className="font-bold text-xs truncate text-foreground">
                            {loc.name}
                          </h3>
                        </div>
                        {loc.category && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                              isEvent
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-primary/10 text-primary"
                            }`}
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
                              <Calendar className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                        <span className="truncate">Tap to focus on map</span>
                        <span className="text-primary font-semibold shrink-0">Zoom →</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-Height Interactive Map */}
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
