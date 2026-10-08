"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { ImagePreview } from "@/components/media/image-preview";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { eventSchema } from "@/lib/validation/events";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORSOGON_LOCATION_PRESETS } from "@/lib/map/mapbox";

import { EventCoverSelector } from "@/components/events/event-cover-selector";

export default function CreateEventPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const eventData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      start_time: formData.get("start_time") as string,
      end_time: formData.get("end_time") as string,
      location_name: locationName || (formData.get("location_name") as string),
      is_public: true, // simplified for now
    };

    const validation = eventSchema.safeParse(eventData);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const startDate = validation.data.start_time ? new Date(validation.data.start_time) : new Date();

      let { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          ...validation.data,
          creator_id: user.id,
          organizer_id: user.id,
          latitude: selectedLat,
          longitude: selectedLng,
          event_date: startDate.toISOString().split("T")[0],
          visibility: "public",
          cover_image: imageUrl || null,
          cover_image_url: imageUrl || null,
        })
        .select("id")
        .single();

      if (eventError && (eventError.message.includes("is_public") || eventError.message.includes("organizer_id") || eventError.message.includes("cover_image_url"))) {
        const { data: fbEvent, error: fbError } = await supabase
          .from("events")
          .insert({
            creator_id: user.id,
            title: validation.data.title,
            description: validation.data.description || null,
            location_name: validation.data.location_name,
            latitude: selectedLat,
            longitude: selectedLng,
            event_date: startDate.toISOString().split("T")[0],
            start_time: startDate.toTimeString().split(" ")[0],
            end_time: validation.data.end_time ? new Date(validation.data.end_time).toTimeString().split(" ")[0] : null,
            category: "General",
            visibility: "public",
            cover_image: imageUrl || null,
          })
          .select("id")
          .single();

        event = fbEvent;
        eventError = fbError;
      }

      if (eventError || !event) {
        setError(eventError?.message || "Failed to create event");
        return;
      }

      // Auto-add creator to event_attendees
      await supabase.from("event_attendees").upsert(
        { event_id: event.id, user_id: user.id, status: "going" },
        { onConflict: "event_id,user_id" }
      );

      toast.success("Event created!");
      router.push(`/events/${event.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/events" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 inline-block">
          ← Back to Events
        </Link>
        <h1 className="text-2xl font-bold">Create Event</h1>
        <p className="text-muted-foreground">Host a gathering or activity in your community</p>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-2xl p-6 bg-card shadow-sm space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Event Banner / Cover Image</Label>
          <EventCoverSelector 
            value={imageUrl} 
            onChange={setImageUrl} 
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Event Title <span className="text-destructive">*</span></Label>
          <Input 
            id="title"
            name="title"
            placeholder="e.g. Sorsogon Coastal Clean-up"
            disabled={isPending}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description"
            name="description"
            placeholder="What is this event about?"
            className="min-h-[100px]"
            disabled={isPending}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start_time">Start Time <span className="text-destructive">*</span></Label>
            <Input 
              id="start_time"
              name="start_time"
              type="datetime-local"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End Time (Optional)</Label>
            <Input 
              id="end_time"
              name="end_time"
              type="datetime-local"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-4 border rounded-xl p-4 bg-muted/20">
          <div className="space-y-2">
            <Label>Pick a Sorsogon Landmark / Map Location</Label>
            <Select
              onValueChange={(val: string | null) => {
                if (!val) return;
                const preset = SORSOGON_LOCATION_PRESETS.find((p) => p.name === val);
                if (preset) {
                  setLocationName(preset.name);
                  setSelectedLat(preset.lat);
                  setSelectedLng(preset.lng);
                } else {
                  setSelectedLat(null);
                  setSelectedLng(null);
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="-- Pick a Sorsogon Location --" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="custom">📍 Custom / Manual Location</SelectItem>
                {SORSOGON_LOCATION_PRESETS.map((preset) => (
                  <SelectItem key={preset.name} value={preset.name}>
                    📍 {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location_name">Location Name <span className="text-destructive">*</span></Label>
            <Input 
              id="location_name"
              name="location_name"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Rompeolas, Sorsogon City"
              disabled={isPending}
              required
            />
          </div>

          {selectedLat && selectedLng && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>Map location linked: <strong>{selectedLat}, {selectedLng}</strong></span>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive font-medium">{error}</p>}

        <div className="flex justify-end pt-4 border-t gap-2">
          <Link href="/events">
            <Button type="button" variant="outline" disabled={isPending}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
