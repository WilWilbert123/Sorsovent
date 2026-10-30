"use client";

import dynamic from "next/dynamic";
import { SORSOGON_FEATURED_LOCATIONS, MapStyleType } from "@/lib/map/mapbox";

const LeafletMapInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] bg-slate-900/80 animate-pulse rounded-xl flex items-center justify-center border border-border">
      <div className="text-xs font-medium text-white/80">
        Loading satellite map...
      </div>
    </div>
  ),
});

export interface MapAttendee {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface MapHost {
  id: string;
  username?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface MapLocation {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  description?: string;
  isEvent?: boolean;
  eventId?: string;
  eventDate?: string;
  eventTime?: string;
  locationName?: string;
  price?: number;
  imageUrl?: string;
  attendeeCount?: number;
  attendees?: MapAttendee[];
  host?: MapHost;
}

interface MapViewProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  selectionKey?: number;
  onSelectLocation?: (loc: MapLocation) => void;
  onDeselectLocation?: () => void;
  showZoomControl?: boolean;
  compact?: boolean;
  defaultMapStyle?: MapStyleType;
  directionsTargetId?: string | null;
  directionsRequestKey?: number;
}

export function MapView({
  locations = SORSOGON_FEATURED_LOCATIONS,
  center,
  zoom,
  selectedId,
  selectionKey,
  onSelectLocation,
  onDeselectLocation,
  showZoomControl = false,
  compact = false,
  defaultMapStyle = "satellite",
  directionsTargetId = null,
  directionsRequestKey = 0,
}: MapViewProps) {
  return (
    <LeafletMapInner
      locations={locations}
      center={center}
      zoom={zoom}
      selectedId={selectedId}
      selectionKey={selectionKey}
      onSelectLocation={onSelectLocation}
      onDeselectLocation={onDeselectLocation}
      showZoomControl={showZoomControl}
      compact={compact}
      defaultMapStyle={defaultMapStyle}
      directionsTargetId={directionsTargetId}
      directionsRequestKey={directionsRequestKey}
    />
  );
}
