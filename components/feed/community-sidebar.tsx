"use client";

import Link from "next/link";
import {
  CalendarDays,
  Compass,
  MapPin,
  ArrowRight,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURED_SORSOGON_PLACES } from "@/components/feed/realtime-home-feed";

interface CommunitySidebarProps {
  upcomingEvents?: Array<{
    id: string;
    title: string;
    location_name?: string | null;
    start_time?: string | null;
    category?: string | null;
  }>;
}

const TRENDING_TAGS = [
  { tag: "#KasanggayahanFestival", count: "48 posts", area: "Sorsogon City", hot: true },
  { tag: "#GubatSurfBreak", count: "32 posts", area: "Gubat", hot: true },
  { tag: "#BulusanLakeKayaking", count: "21 posts", area: "Bulusan", hot: false },
  { tag: "#SubicPinkBeach", count: "18 posts", area: "Matnog", hot: false },
  { tag: "#RompeolasSunset", count: "15 posts", area: "Sorsogon Bay", hot: false },
];

const POPULAR_MUNICIPALITIES = [
  { name: "Sorsogon City", spots: "Rompeolas & Capitol" },
  { name: "Gubat", spots: "Rizal Surfing Beach" },
  { name: "Bulusan", spots: "Crater Lake & Volcano" },
  { name: "Matnog", spots: "Subic Pink Sand" },
  { name: "Donsol", spots: "Whale Sharks" },
  { name: "Barcelona", spots: "1874 Coral Stone Church" },
  { name: "Irosin", spots: "Mateo Hot Springs" },
  { name: "Prieto Diaz", spots: "Mangrove Sanctuary" },
];

export function CommunitySidebar({ upcomingEvents = [] }: CommunitySidebarProps) {
  const featuredPlace = FEATURED_SORSOGON_PLACES[0];

  return (
    <div className="space-y-4">
      {/* Featured Destination Spotlight Card (Desktop Sidebar) */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="p-4 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Destination Spotlight
            </span>
            <h3 className="font-bold text-sm text-foreground">
              Discover Sorsogon
            </h3>
          </div>
          <Link
            href="/explore"
            className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <span>All Places</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <Link
          href={`/explore?q=${encodeURIComponent(featuredPlace.query)}`}
          className="group block px-4 pb-4"
        >
          <div className="relative h-36 rounded-2xl overflow-hidden border border-border/60 bg-slate-900">
            <img
              src={featuredPlace.image}
              alt={featuredPlace.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-2.5 left-3 right-3 text-white">
              <p className="text-[10px] font-semibold text-white/80 flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                <span>{featuredPlace.municipality}</span>
              </p>
              <h4 className="text-xs font-bold leading-snug mt-0.5">
                {featuredPlace.name}
              </h4>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
            {featuredPlace.tagline}
          </p>
        </Link>
      </div>

      {/* Trending in Sorsogon Card */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/60 backdrop-blur-md p-4.5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Trending in Sorsogon</h3>
              <p className="text-[11px] text-muted-foreground">What locals are talking about</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live
          </span>
        </div>

        <div className="space-y-2.5">
          {TRENDING_TAGS.map((item) => (
            <Link
              key={item.tag}
              href={`/explore?q=${encodeURIComponent(item.area)}`}
              className="flex items-center justify-between group p-1.5 -mx-1.5 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {item.tag}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-2.5 w-2.5 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{item.area}</span>
                  <span>•</span>
                  <span>{item.count}</span>
                </p>
              </div>
              {item.hot && (
                <span className="shrink-0 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  Popular
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Events Card */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/60 backdrop-blur-md p-4.5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">Upcoming Gatherings</h3>
              <p className="text-[11px] text-muted-foreground">Events in the province</p>
            </div>
          </div>
          <Link
            href="/events"
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            See all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingEvents.slice(0, 3).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="block group p-2 rounded-xl bg-muted/40 hover:bg-muted transition-all border border-border/40"
              >
                <h4 className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {event.title}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1">
                  {event.location_name && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      {event.location_name}
                    </span>
                  )}
                  {event.category && (
                    <span className="px-1.5 py-0.2 rounded-md bg-primary/10 text-primary font-medium shrink-0">
                      {event.category}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
            <p className="text-xs font-semibold text-foreground">Kasanggayahan Festival Week</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Provincial cultural parade &amp; street gatherings
            </p>
            <Link href="/events" className="inline-block mt-2">
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-full">
                Explore Events
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Explore Sorsogon Municipalities Cloud */}
      <div className="rounded-3xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/60 backdrop-blur-md p-4.5 shadow-sm">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60 mb-3">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Municipalities</h3>
            <p className="text-[11px] text-muted-foreground">Filter places by town</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {POPULAR_MUNICIPALITIES.map((mun) => (
            <Link
              key={mun.name}
              href={`/explore?q=${encodeURIComponent(mun.name)}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-muted-foreground border border-border/50 text-[11px] font-medium transition-all"
            >
              <span>{mun.name}</span>
            </Link>
          ))}
        </div>

        <Link href="/explore" className="block mt-3">
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs font-semibold rounded-2xl justify-between group"
          >
            <span>Open Explore &amp; Map</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>

      {/* Mini Footer */}
      <div className="px-2 text-[11px] text-muted-foreground/80 flex flex-wrap gap-x-2 gap-y-1">
        <span>&copy; {new Date().getFullYear()} Mingle</span>
        <span>•</span>
        <Link href="/explore" className="hover:underline">Explore &amp; Map</Link>
        <span>•</span>
        <Link href="/events" className="hover:underline">Events</Link>
        <span>•</span>
        <Link href="/messages" className="hover:underline">Chat</Link>
      </div>
    </div>
  );
}
