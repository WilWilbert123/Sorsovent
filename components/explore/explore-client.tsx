"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Map as MapIcon,
  CalendarDays,
  Users,
  MapPin,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { MapView, MapLocation } from "@/components/map/map-view";
import { SORSOGON_CENTER } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { formatEventDate } from "@/lib/utils";

interface ExploreClientProps {
  upcomingEvents: any[];
  activeUsers: any[];
  allMapLocations: MapLocation[];
}

const CATEGORIES = [
  { id: "All", label: "All" },
  { id: "Music", label: "🎵 Music" },
  { id: "Food", label: "🍔 Food" },
  { id: "Sports", label: "🏀 Sports" },
  { id: "Arts", label: "🎨 Arts" },
  { id: "Tech", label: "💻 Tech" },
  { id: "Community", label: "👥 Community" },
  { id: "Beach", label: "🏖️ Beach" },
];

export function ExploreClient({
  upcomingEvents,
  activeUsers,
  allMapLocations,
}: ExploreClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredEvents = useMemo(() => {
    return upcomingEvents.filter((ev) => {
      if (selectedCategory !== "All") {
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
  }, [upcomingEvents, selectedCategory, searchQuery]);

  const filteredMapLocations = useMemo(() => {
    return allMapLocations.filter((loc) => {
      if (selectedCategory !== "All") {
        const cat = (loc.category || "").toLowerCase();
        if (!cat.includes(selectedCategory.toLowerCase())) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = loc.name?.toLowerCase().includes(q);
        const matchDesc = loc.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      return true;
    });
  }, [allMapLocations, selectedCategory, searchQuery]);

  return (
    <div className="max-w-4xl mx-auto px-3.5 sm:px-4 py-3.5 sm:py-6 space-y-5">
      {/* Top Bar: Title + Search + Horizontal Category Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Compass className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Explore</h1>
          </div>

          <Link
            href="/map"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-full transition-colors"
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Live Map</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events or places..."
            className="pl-9 pr-8 h-10 rounded-xl bg-card border-border/80 text-sm shadow-2xs"
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
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-card hover:bg-accent text-muted-foreground hover:text-foreground border border-border/70"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        <div className="md:col-span-2 space-y-5">
          {/* Compact Interactive Map Preview */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                Activity Map
                <span className="text-xs font-medium text-muted-foreground">
                  ({filteredMapLocations.length})
                </span>
              </h2>
              <Link
                href="/map"
                className="text-xs text-primary hover:underline font-semibold"
              >
                Full Map →
              </Link>
            </div>
            <div className="h-44 sm:h-56 w-full rounded-2xl overflow-hidden border border-border/80 shadow-2xs relative bg-card">
              <MapView
                locations={filteredMapLocations}
                center={SORSOGON_CENTER}
                zoom={11}
                compact
              />
            </div>
          </section>

          {/* Upcoming Events */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                Upcoming Events
                <span className="text-xs font-medium text-muted-foreground">
                  ({filteredEvents.length})
                </span>
              </h2>
              <Link
                href="/events"
                className="text-xs text-primary hover:underline font-semibold"
              >
                View All
              </Link>
            </div>

            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed bg-card/50 text-xs text-muted-foreground">
                No matching events found.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
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
                      className="group flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-0 p-2.5 sm:p-0 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-sm transition-all overflow-hidden"
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
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs shrink-0">{emoji}</span>
                            <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                              {event.title}
                            </h3>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">{event.location_name || "Sorsogon"}</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-2">
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
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              People
            </h2>
          </div>

          <div className="flex md:flex-col gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-3.5 px-3.5 md:mx-0 md:px-0">
            {activeUsers?.map((u) => {
              const name = u.full_name || u.display_name || u.username || "User";
              return (
                <Link
                  key={u.id}
                  href={`/profile/${u.username}`}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all shrink-0 w-48 md:w-full"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold overflow-hidden text-primary border shrink-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      name[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">@{u.username}</p>
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

