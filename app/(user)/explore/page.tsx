import { createClient } from "@/lib/supabase/server";
import { Compass, Search, Map as MapIcon, CalendarDays, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Fetch some trending/upcoming events for the explore page
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select(`
      id, title, start_time, location_name, cover_image_url,
      attendee_count, category, price,
      profiles!events_organizer_id_fkey (username, full_name, avatar_url)
    `)
    .eq("is_public", true)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(6);

  // Fetch some active users
  const { data: activeUsers } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio")
    .order("created_at", { ascending: false })
    .limit(4);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Explore Sorsogon
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Discover events and people around you</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 bg-card" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-8">
          {/* Map Teaser */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapIcon className="h-5 w-5 text-primary" />
                Nearby Activity
              </h2>
              <Link href="/map" className="text-sm text-primary hover:underline font-medium">
                Open Map
              </Link>
            </div>
            <Link href="/map" className="block relative h-48 rounded-xl overflow-hidden border bg-muted group">
              {/* Fallback pattern for map */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 group-hover:bg-background/40 transition-colors backdrop-blur-[2px]">
                <div className="bg-background/90 text-foreground px-4 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-primary" />
                  View Interactive Map
                </div>
              </div>
            </Link>
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
              {upcomingEvents?.map((event) => (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <Card className="h-full hover:shadow-md transition-all overflow-hidden group border-muted">
                    <div className="aspect-[16/9] bg-muted relative">
                      {event.cover_image_url ? (
                         <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40 group-hover:scale-105 transition-transform duration-500">
                           <CalendarDays className="h-10 w-10" />
                         </div>
                      )}
                      <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-semibold">
                        {event.price === 0 ? "Free" : `₱${event.price}`}
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="font-semibold line-clamp-1 mb-1 group-hover:text-primary transition-colors">{event.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-3">{event.location_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
                         <span className="flex items-center gap-1">
                           <Users className="h-3 w-3" />
                           {event.attendee_count} attending
                         </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
           <section>
            <h2 className="text-lg font-semibold mb-4">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {["Music", "Food", "Sports", "Arts", "Tech", "Community"].map(cat => (
                <span key={cat} className="px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-sm cursor-pointer hover:bg-secondary transition-colors">
                  {cat}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">People to Follow</h2>
            <div className="space-y-4">
              {activeUsers?.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                   <Link href={`/profile/${u.username}`} className="shrink-0">
                     <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          (u.full_name || u.username || "U")[0].toUpperCase()
                        )}
                     </div>
                   </Link>
                   <div className="flex-1 min-w-0">
                     <Link href={`/profile/${u.username}`} className="hover:underline">
                       <p className="text-sm font-semibold truncate">{u.full_name || u.username}</p>
                       <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                     </Link>
                   </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
