import { createClient } from "@/lib/supabase/server";
import { Compass, Search, Map as MapIcon, CalendarDays, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapView } from "@/components/map/map-view";
import { SORSOGON_FEATURED_LOCATIONS, SORSOGON_CENTER } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch upcoming events for the explore page
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  // Fetch active users
  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Build map location pins from events + featured spots
  const eventMapLocations = (upcomingEvents || []).map((event) => ({
    id: event.id,
    name: event.title,
    category: event.category || "Event",
    lat: event.latitude || 12.9743 + (Math.random() * 0.04 - 0.02),
    lng: event.longitude || 124.0044 + (Math.random() * 0.04 - 0.02),
    description: event.location_name || "Sorsogon, Philippines",
  }));

  const allMapLocations = [...eventMapLocations, ...SORSOGON_FEATURED_LOCATIONS];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Explore Sorsogon
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Discover live events and active people around you</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-9 bg-card" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-8">
          {/* Live Interactive Map Section */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                Live Activity Map
              </h2>
              <Link href="/map" className="text-sm text-primary hover:underline font-medium">
                Full Map View →
              </Link>
            </div>
            <div className="h-64 w-full rounded-2xl overflow-hidden border shadow-sm relative bg-card">
              <MapView locations={allMapLocations} center={SORSOGON_CENTER} zoom={11} />
            </div>
          </section>

          {/* Featured Events */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Upcoming Events
              </h2>
              <Link href="/events" className="text-sm text-primary hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {upcomingEvents?.map((event) => {
                const emoji = getCategoryEmoji(event.category, event.title);
                const coverImage = event.cover_image_url || event.cover_image;
                const isFree = !event.price || Number(event.price) === 0;

                return (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="h-full hover:shadow-md transition-all overflow-hidden group border-muted">
                      <div className="aspect-[16/9] bg-muted relative">
                        {coverImage ? (
                          <img src={coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40 group-hover:scale-105 transition-transform duration-500">
                            <span className="text-3xl">{emoji}</span>
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm border">
                          {isFree ? "Free" : `₱${event.price}`}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm">{emoji}</span>
                          <p className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">{event.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{event.location_name || "Sorsogon"}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.attendee_count || 0} attending
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {["Music 🎵", "Food 🍔", "Sports 🏀", "Arts 🎨", "Tech 💻", "Community 👥"].map((cat) => (
                <span key={cat} className="px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-secondary transition-colors">
                  {cat}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">People to Follow</h2>
            <div className="space-y-4">
              {activeUsers?.map((u) => {
                const name = u.full_name || u.display_name || u.username || "User";
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <Link href={`/profile/${u.username}`} className="shrink-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold overflow-hidden text-primary border">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          name[0].toUpperCase()
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${u.username}`} className="hover:underline">
                        <p className="text-sm font-semibold truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
