"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  Users,
  DollarSign,
  Globe,
  Lock,
  Loader2,
  ArrowLeft,
  ImageIcon,
  Sparkles,
  FileText,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  { id: "Sports", label: "Sports", emoji: "🏀" },
  { id: "Food", label: "Food & Cafe", emoji: "🍔" },
  { id: "Music", label: "Music", emoji: "🎵" },
  { id: "Nightlife", label: "Nightlife", emoji: "🍻" },
  { id: "Community", label: "Community", emoji: "🤝" },
  { id: "Arts", label: "Arts", emoji: "🎨" },
  { id: "Tech", label: "Tech & Gaming", emoji: "💻" },
  { id: "Family", label: "Family", emoji: "🎉" },
  { id: "Education", label: "Workshop", emoji: "📚" },
  { id: "Other", label: "Other", emoji: "✨" },
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
        if (
          res.success &&
          res.data &&
          res.data.allowPublicEventCreation === false
        ) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      if (
        error &&
        (error.message.includes("is_public") ||
          error.message.includes("organizer_id") ||
          error.message.includes("max_attendees") ||
          error.message.includes("cover_image_url"))
      ) {
        const fallbackPayload: Record<string, any> = {
          creator_id: user.id,
          title: title.trim(),
          description: description?.trim() || null,
          location_name: locationName?.trim() || null,
          latitude: selectedLat,
          longitude: selectedLng,
          event_date: startDate.toISOString().split("T")[0],
          start_time: startDate.toTimeString().split(" ")[0],
          end_time: endTime
            ? new Date(endTime).toTimeString().split(" ")[0]
            : null,
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
        toast.error(
          "Failed to create event: " + (error?.message || "Unknown error")
        );
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
    <div className="w-full max-w-2xl mx-auto px-3.5 sm:px-4 pt-2.5 pb-20 sm:py-6 space-y-4">
      {/* Compact Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/explore"
            className="h-9 w-9 rounded-xl border border-border/80 bg-card hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="Back to Explore"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground truncate">
              Create Event
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Host a hangout, sports game, or gathering in Sorsogon
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Cover Image Selector */}
        <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-foreground">
                  Event Cover Banner
                </h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                28 Presets or Custom
              </span>
            </div>

            <EventCoverSelector
              value={imageUrl}
              onChange={setImageUrl}
              onSuggestedCategory={(suggested) => {
                if (!category) {
                  setCategory(suggested);
                }
              }}
            />
          </CardContent>
        </Card>

        {/* 2. Event Details & Category */}
        <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Event Details
              </h2>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">
                Event Title <span className="text-primary">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Friday Night Basketball or Coffee Meetup"
                required
                disabled={isPending}
                className="h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell people what to bring, who can join, or what the plan is..."
                rows={3}
                disabled={isPending}
                className="rounded-xl text-base sm:text-sm bg-muted/40 border-border/80 resize-none"
              />
            </div>

            {/* Interactive Category Chips */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Category</Label>
                {category && (
                  <span className="text-[11px] font-semibold text-primary">
                    Selected: {category}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        setCategory(isSelected ? "" : cat.id)
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-2xs"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Date & Time */}
        <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CalendarDays className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Date &amp; Time
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-semibold">
                  Starts At <span className="text-primary">*</span>
                </Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  required
                  disabled={isPending}
                  className="h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-xs font-semibold">
                  Ends At <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  disabled={isPending}
                  className="h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Location & Interactive Map Pin */}
        <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-foreground">
                  Location &amp; Map Pin
                </h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                Tap preset or map
              </span>
            </div>

            {/* Quick Scrollable Sorsogon Spot Pills */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Quick Sorsogon Spots
              </Label>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {SORSOGON_LOCATION_PRESETS.slice(0, 8).map((preset) => {
                  const isActive = locationName === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setLocationName(preset.name);
                        setSelectedLat(preset.lat);
                        setSelectedLng(preset.lng);
                        if (preset.category && !category) {
                          setCategory(preset.category);
                        }
                        toast.success(`Pinned to ${preset.name}!`);
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                      }`}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{preset.name}</span>
                    </button>
                  );
                })}
              </div>

              <Select
                onValueChange={(val: string | null) => {
                  if (!val || val === "custom") return;
                  const preset = SORSOGON_LOCATION_PRESETS.find(
                    (p) => p.name === val
                  );
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
                <SelectTrigger className="w-full h-9 rounded-xl text-xs bg-muted/40 border-border/80">
                  <SelectValue placeholder="Browse all Sorsogon landmarks..." />
                </SelectTrigger>
                <SelectContent className="max-h-60 rounded-2xl">
                  <SelectItem value="custom">
                    📍 Custom Map Pin (Tap Directly on Map)
                  </SelectItem>
                  {SORSOGON_LOCATION_PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      📍 {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Venue / Location Name */}
            <div className="space-y-1.5">
              <Label htmlFor="locationName" className="text-xs font-semibold">
                Venue / Address Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="locationName"
                name="locationName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Sorsogon Sports Complex, Rompeolas, or Purok 4"
                required
                disabled={isPending}
                className="h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
              />
            </div>

            {/* Interactive Map Pin Pointing */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  Interactive Map Pin
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Tap or drag pin on map
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

            {/* Coordinate Status Badge */}
            {selectedLat && selectedLng ? (
              <div className="flex items-center justify-between gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Pinned at{" "}
                    <strong>
                      {selectedLat}, {selectedLng}
                    </strong>{" "}
                    — live on Explore Map!
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
                  Clear
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                Tap anywhere on the map above so your event appears on the Sorsogon Activity Map.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 5. Capacity, Price & Visibility */}
        <Card className="rounded-3xl border border-border/80 bg-card/95 shadow-2xs overflow-hidden">
          <CardContent className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sliders className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">
                Capacity, Fee &amp; Privacy
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="maxAttendees" className="text-xs font-semibold">
                  Max Attendees
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="maxAttendees"
                    name="maxAttendees"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    className="pl-9 h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
                    disabled={isPending}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-xs font-semibold">
                  Entry Fee (₱)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Free (0)"
                    className="pl-9 h-10 rounded-xl text-base sm:text-sm bg-muted/40 border-border/80"
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>

            {/* Visibility Segmented Toggle */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-semibold">Event Visibility</Label>
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border/60">
                <button
                  type="button"
                  disabled={!allowPublicEvents || isPending}
                  onClick={() => setIsPublic(true)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isPublic
                      ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground disabled:opacity-40"
                  }`}
                >
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  <span>Public Event</span>
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsPublic(false)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    !isPublic
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Private / Invite Only</span>
                </button>
              </div>

              {!allowPublicEvents && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 mt-2">
                  Notice: Public event creation is temporarily restricted by platform administrators. Only private member gatherings can be scheduled.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="w-full h-12 rounded-2xl text-sm font-bold shadow-lg shadow-[#FF3366]/25 bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] hover:opacity-95 text-white border-0 gap-2 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>Publish Event</span>
        </Button>
      </form>
    </div>
  );
}
