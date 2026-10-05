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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { eventSchema } from "@/lib/validation/events";

export default function CreateEventPage() {
  const [imageUrl, setImageUrl] = useState("");
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
      location_name: formData.get("location_name") as string,
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

      // 1. Create the event
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          ...validation.data,
          organizer_id: user.id,
          cover_image_url: imageUrl || null,
        })
        .select("id")
        .single();

      if (eventError || !event) {
        setError(eventError?.message || "Failed to create event");
        return;
      }

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
        {imageUrl ? (
          <div className="mb-4">
            <Label className="mb-2 block">Cover Image</Label>
            <ImagePreview 
              url={imageUrl} 
              onRemove={() => setImageUrl("")} 
              className="max-h-[300px] w-full"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Cover Image (Optional)</Label>
            <CloudinaryUpload 
              onUploadSuccess={(url) => setImageUrl(url)}
              folder="events"
            />
          </div>
        )}

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

        <div className="space-y-2">
          <Label htmlFor="location_name">Location <span className="text-destructive">*</span></Label>
          <Input 
            id="location_name"
            name="location_name"
            placeholder="e.g. Rompeolas, Sorsogon City"
            disabled={isPending}
          />
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
