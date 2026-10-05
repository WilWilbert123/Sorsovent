import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function PublicEventsPage() {
  const supabase = await createClient();
  
  const { data: events } = await supabase
    .from("events")
    .select(`
      id, title, start_time, location_name, cover_image_url, category,
      profiles!events_organizer_id_fkey (username, full_name)
    `)
    .eq("is_public", true)
    .order("start_time", { ascending: true })
    .limit(20);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Public Events</h1>
          <p className="text-muted-foreground mt-1">Discover what's happening in Sorsogon</p>
        </div>
        <Link href="/auth/login">
          <Button>Sign in to RSVP</Button>
        </Link>
      </div>

      {!events || events.length === 0 ? (
        <div className="text-center py-12 border rounded-2xl bg-card">
          <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No upcoming events</h2>
          <p className="text-muted-foreground">Check back later for new activities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link key={event.id} href={`/auth/login?next=/events/${event.id}`} className="group">
              <div className="border rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md h-full flex flex-col">
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {event.cover_image_url ? (
                    <img 
                      src={event.cover_image_url} 
                      alt={event.title} 
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/5 text-primary">
                      <CalendarDays className="h-10 w-10 opacity-50" />
                    </div>
                  )}
                  {event.category && (
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium border shadow-sm">
                      {event.category}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex flex-col gap-1 mb-3">
                    <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-sm text-primary font-medium flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {format(new Date(event.start_time), "MMM d, yyyy • h:mm a")}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-auto">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="line-clamp-1">{event.location_name}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
