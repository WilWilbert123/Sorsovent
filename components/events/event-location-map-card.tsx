"use client";

import { useState, useEffect } from "react";
import { MapView, MapLocation } from "@/components/map/map-view";
import {
  MapPin,
  Navigation,
  Maximize2,
  Minimize2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EventLocationMapCardProps {
  locationName: string;
  lat: number;
  lng: number;
  selectedId: string;
  locations: MapLocation[];
}

export function EventLocationMapCard({
  locationName,
  lat,
  lng,
  selectedId,
  locations,
}: EventLocationMapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat, lng });
  const [mapZoom, setMapZoom] = useState(15);
  const [activeSelectedId, setActiveSelectedId] = useState<string | undefined>(
    selectedId
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("resize"));
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  const handleRecenter = () => {
    setActiveSelectedId(undefined);
    setTimeout(() => {
      setMapCenter({ lat, lng });
      setMapZoom(15);
      setActiveSelectedId(selectedId);
    }, 30);
  };

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${lat},${lng}`
  )}`;

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 p-3.5 sm:p-5 shadow-2xs space-y-3">
      {/* Header Row with Map Controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-foreground truncate">
              Event Location &amp; Map
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {locationName}
            </p>
          </div>
        </div>

        {/* Action Pills: Recenter, Google Maps, Expand */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRecenter}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer active:scale-95"
            title="Center on Event Pin"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span>Center Pin</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors active:scale-95"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden xs:inline">Directions</span>
          </a>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer active:scale-95"
            title={isExpanded ? "Compact Map" : "Expand Map"}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Compact</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Expand</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Large Mobile-Friendly Interactive Map Container */}
      <div
        className={cn(
          "relative w-full rounded-2xl overflow-hidden border border-border/80 shadow-xs bg-muted/20 transition-all duration-300",
          isExpanded
            ? "h-[480px] sm:h-[540px]"
            : "h-[380px] sm:h-[430px]"
        )}
      >
        <MapView
          locations={locations}
          center={mapCenter}
          zoom={mapZoom}
          selectedId={activeSelectedId}
          showZoomControl={true}
          onSelectLocation={(loc) => {
            setActiveSelectedId(loc.id);
            setMapCenter({ lat: loc.lat, lng: loc.lng });
          }}
        />
      </div>
    </div>
  );
}

