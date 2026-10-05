import { createClient } from "@/lib/supabase/server";
import { Image as ImageIcon, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function EventPhotosPage({ params }: { params: { eventId: string } }) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", params.eventId)
    .single();

  if (!event) return null;

  const { data: photos } = await supabase
    .from("event_photos")
    .select(`
      id,
      image_url,
      created_at,
      profiles!event_photos_user_id_fkey (username, full_name)
    `)
    .eq("event_id", params.eventId)
    .order("created_at", { ascending: false });

  const hasPhotos = photos && photos.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/events/${params.eventId}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
            ← Back to Event
          </Link>
          <h1 className="text-2xl font-bold">Event Photos</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
        <Button size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Add Photo
        </Button>
      </div>
      
      {!hasPhotos ? (
        <div className="flex flex-col items-center justify-center p-12 border rounded-2xl bg-card text-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-lg font-semibold mb-2">No photos yet</h2>
          <p className="text-muted-foreground mb-6">
            Be the first to share a memory from this event.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo: any) => (
            <div key={photo.id} className="aspect-square bg-muted rounded-xl overflow-hidden group relative">
              <img src={photo.image_url} alt="Event photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <p className="text-white text-xs font-medium truncate">
                  By {photo.profiles?.full_name || photo.profiles?.username}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
