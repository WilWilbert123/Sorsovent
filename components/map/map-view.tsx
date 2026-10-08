"use client";

import dynamic from "next/dynamic";
import { SORSOGON_FEATURED_LOCATIONS } from "@/lib/map/mapbox";

const LeafletMapInner = dynamic(() => import("./map-view-inner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] bg-muted/40 animate-pulse rounded-xl flex items-center justify-center border">
      <div className="text-sm font-medium text-muted-foreground">Loading Sorsogon Interactive Map...</div>
    </div>
  ),
});

export interface MapLocation {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  description?: string;
}

interface MapViewProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function MapView({
  locations = SORSOGON_FEATURED_LOCATIONS,
  center,
  zoom,
}: MapViewProps) {
  return <LeafletMapInner locations={locations} center={center} zoom={zoom} />;
}
