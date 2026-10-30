"use client";

import { useState, useMemo } from "react";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import { Button } from "@/components/ui/button";
import {
  Check,
  Image as ImageIcon,
  Upload,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface PresetCover {
  id: string;
  label: string;
  emoji: string;
  group: "Sports" | "Food & Cafe" | "Music & Night" | "Outdoors" | "Social & Tech";
  suggestedCategory: string;
  url: string;
}

export const PRESET_EVENT_COVERS: PresetCover[] = [
  // Sports
  {
    id: "basketball",
    label: "Basketball Run",
    emoji: "🏀",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "pickleball",
    label: "Pickleball / Tennis",
    emoji: "🎾",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "inuman",
    label: "Nightlife & Chill",
    emoji: "🍻",
    group: "Music & Night",
    suggestedCategory: "Nightlife",
    url: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "football",
    label: "Football / Futsal",
    emoji: "⚽",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "music",
    label: "Live Music & Jam",
    emoji: "🎵",
    group: "Music & Night",
    suggestedCategory: "Music",
    url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "food",
    label: "Food Trip & Dining",
    emoji: "🍔",
    group: "Food & Cafe",
    suggestedCategory: "Food",
    url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "beach",
    label: "Beach & Surfing",
    emoji: "🏖️",
    group: "Outdoors",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "coffee",
    label: "Coffee & Cafe Catchup",
    emoji: "☕",
    group: "Food & Cafe",
    suggestedCategory: "Food",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "volleyball",
    label: "Volleyball Match",
    emoji: "🏐",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "running",
    label: "Fun Run & Jogging",
    emoji: "🏃",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "cycling",
    label: "Cycling & Bike Ride",
    emoji: "🚴",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "badminton",
    label: "Badminton Smash",
    emoji: "🏸",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "camping",
    label: "Camping & Bonfire",
    emoji: "🏕️",
    group: "Outdoors",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "hiking",
    label: "Nature Hike & Trail",
    emoji: "⛰️",
    group: "Outdoors",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "sunset",
    label: "Rompeolas Sunset Walk",
    emoji: "🌅",
    group: "Outdoors",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "island",
    label: "Island Hopping & Boat",
    emoji: "⛵",
    group: "Outdoors",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "bbq",
    label: "BBQ & Grill Night",
    emoji: "🥩",
    group: "Food & Cafe",
    suggestedCategory: "Food",
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "streetfood",
    label: "Street Food & Market",
    emoji: "🍢",
    group: "Food & Cafe",
    suggestedCategory: "Food",
    url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "karaoke",
    label: "Karaoke & Acoustic",
    emoji: "🎤",
    group: "Music & Night",
    suggestedCategory: "Music",
    url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "billiards",
    label: "Billiards & Pool",
    emoji: "🎱",
    group: "Music & Night",
    suggestedCategory: "Nightlife",
    url: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "gaming",
    label: "Esports & Mobile Squad",
    emoji: "🎮",
    group: "Social & Tech",
    suggestedCategory: "Tech",
    url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "business",
    label: "Meetup & Workshop",
    emoji: "💼",
    group: "Social & Tech",
    suggestedCategory: "Education",
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "coding",
    label: "Tech & Study Session",
    emoji: "💻",
    group: "Social & Tech",
    suggestedCategory: "Tech",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "photography",
    label: "Photo Walk & Arts",
    emoji: "📸",
    group: "Social & Tech",
    suggestedCategory: "Arts",
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "celebration",
    label: "Birthday & Party",
    emoji: "🎉",
    group: "Music & Night",
    suggestedCategory: "Family",
    url: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "boardgames",
    label: "Board Games & Trivia",
    emoji: "🎲",
    group: "Social & Tech",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "wellness",
    label: "Yoga & Fitness",
    emoji: "🧘",
    group: "Sports",
    suggestedCategory: "Sports",
    url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "volunteer",
    label: "Community Drive",
    emoji: "🤝",
    group: "Social & Tech",
    suggestedCategory: "Community",
    url: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=800&auto=format&fit=crop",
  },
];

const PRESET_GROUPS = [
  "All",
  "Sports",
  "Food & Cafe",
  "Music & Night",
  "Outdoors",
  "Social & Tech",
] as const;

interface EventCoverSelectorProps {
  value: string;
  onChange: (url: string) => void;
  onSuggestedCategory?: (category: string) => void;
}

export function EventCoverSelector({
  value,
  onChange,
  onSuggestedCategory,
}: EventCoverSelectorProps) {
  const [uploadMode, setUploadMode] = useState<"presets" | "custom">("presets");
  const [activeGroup, setActiveGroup] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState<number>(6);

  const filteredPresets = useMemo(() => {
    if (activeGroup === "All") return PRESET_EVENT_COVERS;
    return PRESET_EVENT_COVERS.filter((p) => p.group === activeGroup);
  }, [activeGroup]);

  const displayedPresets = useMemo(() => {
    return filteredPresets.slice(0, visibleCount);
  }, [filteredPresets, visibleCount]);

  const selectedPreset = useMemo(() => {
    return PRESET_EVENT_COVERS.find((p) => p.url === value);
  }, [value]);

  const remainingCount = Math.max(0, filteredPresets.length - visibleCount);

  return (
    <div className="space-y-3">
      {/* Selected Cover Banner Preview OR Sleek Compact Prompt */}
      {value ? (
        <div className="relative w-full h-40 sm:h-48 rounded-2xl overflow-hidden border border-border/80 shadow-xs group">
          <img
            src={value}
            alt="Event cover preview"
            className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent flex items-end justify-between p-3.5">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-xs text-white font-semibold truncate">
              <span>{selectedPreset?.emoji || "🖼️"}</span>
              <span className="truncate">
                {selectedPreset?.label || "Custom Event Cover"}
              </span>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="h-7.5 px-2.5 text-xs rounded-full gap-1 shadow-xs cursor-pointer"
              onClick={() => onChange("")}
            >
              <X className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border border-dashed border-border/80 bg-muted/25">
          <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ImageIcon className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">
              Pick a cover image below
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Tap any preset theme or upload your own banner photo
            </p>
          </div>
        </div>
      )}

      {/* Non-Wrapping 2-Column Segmented Mode Toggle */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/70 border border-border/60">
        <button
          type="button"
          onClick={() => setUploadMode("presets")}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            uploadMode === "presets"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span>Preset Gallery</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              uploadMode === "presets"
                ? "bg-white/20 text-white"
                : "bg-background text-muted-foreground"
            }`}
          >
            {PRESET_EVENT_COVERS.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setUploadMode("custom")}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            uploadMode === "custom"
              ? "bg-gradient-to-r from-[#FF5E3A] via-[#FF3366] to-[#E11D48] text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="h-3.5 w-3.5 shrink-0" />
          <span>Custom Photo</span>
        </button>
      </div>

      {/* Presets Gallery Mode */}
      {uploadMode === "presets" && (
        <div className="space-y-3">
          {/* Category Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {PRESET_GROUPS.map((grp) => {
              const active = activeGroup === grp;
              return (
                <button
                  key={grp}
                  type="button"
                  onClick={() => {
                    setActiveGroup(grp);
                    setVisibleCount(8);
                  }}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    active
                      ? "bg-foreground text-background shadow-2xs"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  {grp}
                </button>
              );
            })}
          </div>

          {/* Preset Thumbnail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {displayedPresets.map((preset) => {
              const isSelected = value === preset.url;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChange(preset.url);
                    if (onSuggestedCategory && preset.suggestedCategory) {
                      onSuggestedCategory(preset.suggestedCategory);
                    }
                  }}
                  className={`relative h-24 sm:h-26 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all active:scale-95 text-left group shadow-2xs ${
                    isSelected
                      ? "border-[#FF3366] ring-2 ring-[#FF3366]/30"
                      : "border-border/70 hover:border-primary/50"
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    loading="lazy"
                    className="w-full h-full object-cover bg-muted transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?q=80&w=800&auto=format&fit=crop";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-between p-2">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-sm drop-shadow-xs">{preset.emoji}</span>
                      {isSelected && (
                        <span className="h-5 w-5 rounded-full bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white flex items-center justify-center shadow-xs">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-bold text-white leading-tight line-clamp-1">
                      {preset.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Load More / Show Less Controls */}
          {filteredPresets.length > 6 && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {remainingCount > 0 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVisibleCount((prev) =>
                        Math.min(filteredPresets.length, prev + 8)
                      )
                    }
                    className="h-8 px-4 rounded-full text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    <span>Load More Images ({remainingCount} more)</span>
                  </Button>
                  {remainingCount > 8 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVisibleCount(filteredPresets.length)}
                      className="h-8 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Show All ({filteredPresets.length})
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVisibleCount(6)}
                  className="h-8 px-4 rounded-full text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Show Less</span>
                </Button>
              )}
            </div>
          )}
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
