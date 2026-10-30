"use client";

import { useState, useEffect } from "react";
import { MapView, MapLocation } from "@/components/map/map-view";
import {
  MapPin,
  Navigation,
  Maximize2,
  Minimize2,
  ExternalLink,
  Route,
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
  const [directionsKey, setDirectionsKey] = useState(0);

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

  const handleGetDirections = () => {
    setIsExpanded(true);
    setDirectionsKey((prev) => prev + 1);
  };

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
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

        {/* Action Pills: Get Directions (In-Map Route Line), Center Pin, Google Maps, Expand */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleGetDirections}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer active:scale-95"
            title="Draw driving route line on map from your location"
          >
            <Route className="h-3.5 w-3.5" />
            <span>Get Directions</span>
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer active:scale-95"
            title="Center on Event Pin"
          >
            <Navigation className="h-3.5 w-3.5 text-primary" />
            <span className="hidden xs:inline">Center</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/80 bg-muted/50 hover:bg-muted text-xs font-semibold text-foreground transition-colors active:scale-95"
            title="Open turn-by-turn navigation in Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Google Maps</span>
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
                <span className="hidden sm:inline">Compact</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Expand</span>
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
          defaultMapStyle="satellite"
          directionsTargetId={selectedId}
          directionsRequestKey={directionsKey}
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
