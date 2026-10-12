"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Users, DollarSign, Globe, Lock, Loader2, ArrowLeft, ImageIcon } from "lucide-react";
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
import { EventCoverSelector } from "@/components/events/event-cover-selector";
import { LocationPicker } from "@/components/map/location-picker";

const EVENT_CATEGORIES = [
  "Music", "Food", "Sports", "Arts", "Tech", "Community", "Nightlife", "Family", "Education", "Other"
];

export default function CreateEventPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPublic, setIsPublic] = useState(true);
  const [allowPublicEvents, setAllowPublicEvents] = useState(true);
  const [category, setCategory] = useState("");
  const [locationName, setLocationName] = useState("");
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && res.data.allowPublicEventCreation === false) {
          setAllowPublicEvents(false);
          setIsPublic(false);
        }
      })
      .catch(() => {});
  }, []);

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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be signed in.");
        return;
      }

      const isPublicVal = isPublic ?? true;
      const startDate = startTime ? new Date(startTime) : new Date();

      let { data, error } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          organizer_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          location_name: locationName?.trim() || null,
          latitude: selectedLat,
          longitude: selectedLng,
          event_date: startDate.toISOString().split("T")[0],
          start_time: startDate.toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
          category: category || null,
          visibility: isPublicVal ? "public" : "private",
          is_public: isPublicVal,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
          price: price ? parseFloat(price) : 0,
          cover_image: imageUrl || null,
          cover_image_url: imageUrl || null,
        })
        .select("id")
        .single();

      if (error && (error.message.includes("is_public") || error.message.includes("organizer_id") || error.message.includes("max_attendees") || error.message.includes("cover_image_url"))) {
        const fallbackPayload: Record<string, any> = {
          creator_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          location_name: locationName?.trim() || null,
          latitude: selectedLat,
          longitude: selectedLng,
          event_date: startDate.toISOString().split("T")[0],
          start_time: startDate.toTimeString().split(" ")[0],
          end_time: endTime ? new Date(endTime).toTimeString().split(" ")[0] : null,
          category: category || "General",
          visibility: isPublicVal ? "public" : "private",
          cover_image: imageUrl || null,
        };

        const { data: fbData, error: fbError } = await supabase
          .from("events")
          .insert(fallbackPayload)
          .select("id")
          .single();

        data = fbData;
        error = fbError;
      }

      if (error || !data) {
        toast.error("Failed to create event: " + (error?.message || "Unknown error"));
      } else {
        // Auto-add creator to event_attendees
        await supabase.from("event_attendees").upsert(
          { event_id: data.id, user_id: user.id, status: "attending" },
          { onConflict: "event_id,user_id" }
        );
        toast.success("Event created successfully!");
        router.push(`/events/${data.id}`);
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/explore" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Explore
      </Link>

      <h1 className="text-2xl font-bold mb-6">Create Event</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover Image Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              Event Banner / Cover Image
            </CardTitle>
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
                placeholder="Tell attendees what your event is about..."
                rows={4}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select onValueChange={(val: string | null) => setCategory(val || "")} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Location & Map Pin
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                Point & Click on Map
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 1. Quick Landmark Presets */}
            <div className="space-y-2">
              <Label>Quick Sorsogon Landmark Preset (Optional Shortcut)</Label>
              <Select
                onValueChange={(val: string | null) => {
                  if (!val || val === "custom") return;
                  const preset = SORSOGON_LOCATION_PRESETS.find((p) => p.name === val);
                  if (preset) {
                    setLocationName(preset.name);
                    setSelectedLat(preset.lat);
                    setSelectedLng(preset.lng);
                    if (preset.category && !category) {
                      setCategory(preset.category);
                    }
                    toast.success(`Pinned to ${preset.name}!`);
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-- Pick a Landmark Preset or Click Map Below --" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="custom">📍 Custom Map Pin (Point Directly on Map)</SelectItem>
                  {SORSOGON_LOCATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      📍 {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Venue / Location Name */}
            <div className="space-y-2">
              <Label htmlFor="locationName">Venue / Location Name *</Label>
              <Input
                id="locationName"
                name="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Sorsogon Sports Complex, Rompeolas, or Custom Venue"
                required
                disabled={isPending}
              />
            </div>

            {/* 3. Interactive Map Pin Pointing */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Interactive Map Pin Pointing
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Click or drag pin directly on map
                </span>
              </div>

              <LocationPicker
                lat={selectedLat}
                lng={selectedLng}
                locationName={locationName}
                onSelectCoordinates={(lat, lng, hint) => {
                  setSelectedLat(lat);
                  setSelectedLng(lng);
                  if (hint && !locationName) {
                    setLocationName(hint);
                  }
                  toast.success(`Coordinates set to ${lat}, ${lng}`);
                }}
              />
            </div>

            {/* 4. Coordinate Status Badge */}
            {selectedLat && selectedLng ? (
              <div className="flex items-center justify-between gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="truncate">
                    Exact coordinates set: <strong>{selectedLat}, {selectedLng}</strong> — will appear on interactive map!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLat(null);
                    setSelectedLng(null);
                  }}
                  className="text-[11px] underline text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  Clear Pin
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 italic">
                <MapPin className="h-3.5 w-3.5" />
                No map pin set yet. Tap anywhere on the map above to drop the exact event pin.
              </p>
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
                    placeholder="Free (0)"
                    className="pl-9"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Visibility:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={isPublic ? "default" : "outline"}
                    size="sm"
                    className="gap-2"
                    disabled={!allowPublicEvents || isPending}
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
                    disabled={isPending}
                    onClick={() => setIsPublic(false)}
                  >
                    <Lock className="h-4 w-4" />
                    Private
                  </Button>
                </div>
              </div>
              {!allowPublicEvents && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  Notice: Public event creation is temporarily restricted by platform administrators. Only private member gatherings can be scheduled.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Event
        </Button>
      </form>
    </div>
  );
}
