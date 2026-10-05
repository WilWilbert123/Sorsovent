import { createClient } from "@/lib/supabase/server";
import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/utils/format";

export default async function SavedEventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: savedItems } = await supabase
    .from("saved_items")
    .select(`
      id,
      events (
        id,
        title,
        start_time,
        location_name,
        cover_image_url
      )
    `)
    .eq("user_id", user.id)
    .eq("item_type", "EVENT")
    .order("created_at", { ascending: false });

  const hasEvents = savedItems && savedItems.length > 0 && savedItems.some(i => i.events);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/saved" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Saved
        </Link>
        <h1 className="text-2xl font-bold">Saved Events</h1>
      </div>
      
      {!hasEvents ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No saved events</h2>
          <p className="text-muted-foreground mb-6">
            When you see an event you want to remember, click the bookmark icon to save it here.
          </p>
          <Link href="/explore">
            <Button>Explore Events</Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {savedItems.map((item: any) => {
            const event = item.events;
            if (!event) return null;
            return (
              <Link key={item.id} href={`/events/${event.id}`} className="block">
                <div className="flex border rounded-xl overflow-hidden bg-card hover:border-primary transition-colors h-32">
                  <div className="w-32 bg-muted relative shrink-0">
                    {event.cover_image_url ? (
                      <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                        <CalendarDays className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col justify-center min-w-0">
                    <h3 className="font-semibold truncate text-lg">{event.title}</h3>
                    <p className="text-sm text-primary mb-1">{formatEventDate(event.start_time)}</p>
                    <p className="text-xs text-muted-foreground truncate">{event.location_name}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
