"use client";

import { useState } from "react";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { Button } from "@/components/ui/button";
import { Check, Image as ImageIcon, Upload, Sparkles, X } from "lucide-react";

export interface PresetCover {
  id: string;
  label: string;
  emoji: string;
  url: string;
}

export const PRESET_EVENT_COVERS: PresetCover[] = [
  {
    id: "basketball",
    label: "Basketball / Sports",
    emoji: "🏀",
    url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "pickleball",
    label: "Pickleball / Tennis",
    emoji: "🥒",
    url: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "inuman",
    label: "Inuman & Nightlife",
    emoji: "🍻",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "football",
    label: "Football / Soccer",
    emoji: "⚽",
    url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "music",
    label: "Music & Concerts",
    emoji: "🎵",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "food",
    label: "Food & Dining",
    emoji: "🍔",
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "beach",
    label: "Beach & Outings",
    emoji: "🏖️",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "camping",
    label: "Camping & Outdoors",
    emoji: "🏕️",
    url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "gaming",
    label: "Esports & Gaming",
    emoji: "🎮",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "business",
    label: "Meetup & Seminars",
    emoji: "💼",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop",
  },
];

interface EventCoverSelectorProps {
  value: string;
  onChange: (url: string) => void;
}

export function EventCoverSelector({ value, onChange }: EventCoverSelectorProps) {
  const [uploadMode, setUploadMode] = useState<"presets" | "custom">("presets");

  return (
    <div className="space-y-4">
      {/* Selected Cover Banner Preview */}
      {value ? (
        <div className="relative w-full h-44 rounded-2xl overflow-hidden border shadow-sm group">
          <img
            src={value}
            alt="Event cover preview"
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-between p-4">
            <span className="text-xs text-white/90 font-medium bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20">
              Selected Event Cover
            </span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-8 text-xs rounded-xl gap-1 shadow-sm"
              onClick={() => onChange("")}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-2xl p-6 text-center bg-muted/20 text-muted-foreground flex flex-col items-center justify-center space-y-2">
          <ImageIcon className="h-8 w-8 text-primary opacity-60" />
          <p className="text-xs sm:text-sm font-medium text-foreground">
            No cover image selected yet
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a sample preset below or upload your own custom photo.
          </p>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setUploadMode("presets")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            uploadMode === "presets"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" /> Preset Gallery
        </button>
        <button
          type="button"
          onClick={() => setUploadMode("custom")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            uploadMode === "custom"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Upload Custom Photo
        </button>
      </div>

      {/* Presets Gallery Grid */}
      {uploadMode === "presets" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {PRESET_EVENT_COVERS.map((preset) => {
            const isSelected = value === preset.url;
            return (
              <div
                key={preset.id}
                onClick={() => onChange(preset.url)}
                className={`relative h-24 rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.03] group shadow-2xs ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.label}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{preset.emoji}</span>
                    {isSelected && (
                      <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-white truncate">
                    {preset.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Upload Mode */}
      {uploadMode === "custom" && (
        <CloudinaryUpload
          onUploadSuccess={(url) => onChange(url)}
          folder="event_covers"
          enableCrop={false}
        />
      )}
    </div>
  );
}
