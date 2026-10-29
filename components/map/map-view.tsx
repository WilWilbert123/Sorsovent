"use client";

import dynamic from "next/dynamic";
import { SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";

const LeafletMapInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[200px] bg-muted/40 animate-pulse rounded-xl flex items-center justify-center border">
      <div className="text-xs font-medium text-muted-foreground">Loading map...</div>
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
  attendeeCount?: number;
  attendees?: MapAttendee[];
  host?: MapHost;
}

interface MapViewProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  onSelectLocation?: (loc: MapLocation) => void;
  showZoomControl?: boolean;
  compact?: boolean;
}

export function MapView({
  locations = SORSOGON_FEATURED_LOCATIONS,
  center,
  zoom,
  selectedId,
  onSelectLocation,
  showZoomControl = false,
  compact = false,
}: MapViewProps) {
  return (
    <LeafletMapInner
      locations={locations}
      center={center}
      zoom={zoom}
      selectedId={selectedId}
      onSelectLocation={onSelectLocation}
      showZoomControl={showZoomControl}
      compact={compact}
    />
  );
}

