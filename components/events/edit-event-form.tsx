"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Users, DollarSign, Globe, Lock, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { SORSOGON_LOCATION_PRESETS } from "@/lib/map/mapbox";
import { DeleteEventButton } from "@/components/events/delete-event-button";
import { EventCoverSelector } from "@/components/events/event-cover-selector";

const EVENT_CATEGORIES = [
  "Music", "Food", "Sports", "Arts", "Tech", "Community", "Nightlife", "Family", "Education", "Other"
];

function toDatetimeLocal(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

interface EditEventFormProps {
  event: any;
}

export function EditEventForm({ event }: EditEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState<boolean>(
    event.is_public !== false && event.visibility !== "private"
  );
  const [category, setCategory] = useState<string>(event.category || "");
  const [locationName, setLocationName] = useState<string>(event.location_name || "");
  const [selectedLat, setSelectedLat] = useState<number | null>(event.latitude || null);
  const [selectedLng, setSelectedLng] = useState<number | null>(event.longitude || null);
  const [imageUrl, setImageUrl] = useState<string>(
    event.cover_image_url || event.cover_image || ""
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    const maxAttendees = formData.get("maxAttendees") as string;
    const price = formData.get("price") as string;

    if (!title || !startTime) {
      toast.error("Title and start time are required.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const startDate = new Date(startTime);

      const updatePayload: Record<string, any> = {
        title: title.trim(),
        description: description?.trim() || null,
        location_name: locationName?.trim() || null,
        latitude: selectedLat,
        longitude: selectedLng,
        event_date: startDate.toISOString().split("T")[0],
        start_time: startDate.toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        category: category || null,
        visibility: isPublic ? "public" : "private",
        is_public: isPublic,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        price: price ? parseFloat(price) : 0,
        cover_image: imageUrl || null,
        cover_image_url: imageUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("events")
        .update(updatePayload)
        .eq("id", event.id);

      if (error) {
        toast.error("Failed to update event: " + error.message);
      } else {
        toast.success("Event updated successfully!");
        router.push(`/events/${event.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event Details
        </Link>
        <DeleteEventButton eventId={event.id} eventTitle={event.title} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Event</h1>
          <p className="text-muted-foreground text-sm">Update event details and location</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cover Image / Event Banner</CardTitle>
          </CardHeader>
          <CardContent>
            <EventCoverSelector
              value={imageUrl}
              onChange={setImageUrl}
            />
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={event.title}
                placeholder="e.g. Sorsogon Food Festival 2026"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={event.description || ""}
                placeholder="Tell attendees what your event is about..."
                rows={4}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(val: string | null) => setCategory(val || "")}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Date & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(event.start_time || event.event_date)}
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  defaultValue={toDatetimeLocal(event.end_time)}
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location on Map
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Sorsogon Landmark / Location Preset</Label>
              <Select
                onValueChange={(val: string | null) => {
                  if (!val) return;
                  const preset = SORSOGON_LOCATION_PRESETS.find((p) => p.name === val);
                  if (preset) {
                    setLocationName(preset.name);
                    setSelectedLat(preset.lat);
                    setSelectedLng(preset.lng);
                    if (preset.category && !category) {
                      setCategory(preset.category);
                    }
                  } else {
                    setSelectedLat(null);
                    setSelectedLng(null);
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
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
              <Label htmlFor="locationName">Venue / Location Name *</Label>
              <Input
                id="locationName"
                name="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Sorsogon Sports Complex, Auditorium"
                required
                disabled={isPending}
              />
            </div>

            {selectedLat && selectedLng && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Exact coordinates set: <strong>{selectedLat}, {selectedLng}</strong>
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxAttendees">Max Attendees</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maxAttendees"
                    name="maxAttendees"
                    type="number"
                    min="1"
                    defaultValue={event.max_attendees || ""}
                    placeholder="Unlimited"
                    className="pl-9"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Ticket Price (₱)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={event.price ?? 0}
                    placeholder="Free (0)"
                    className="pl-9"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm font-medium">Visibility:</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsPublic(true)}
                >
                  <Globe className="h-4 w-4" />
                  Public
                </Button>
                <Button
                  type="button"
                  variant={!isPublic ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsPublic(false)}
                >
                  <Lock className="h-4 w-4" />
                  Private
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link href={`/events/${event.id}`}>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
