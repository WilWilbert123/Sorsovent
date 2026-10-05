"use client";

import { MapPin } from "lucide-react";

interface MapViewProps {
  locations?: Array<{ id: string; lat: number; lng: number; name: string }>;
}

export function MapView({ locations = [] }: MapViewProps) {
  return (
    <div className="w-full h-full min-h-[400px] bg-muted/30 border rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v11/static/124.0044,12.9743,12,0/800x600?access_token=pk.eyJ1IjoiZGVmYXVsdCIsImEiOiJkZWZhdWx0In0.default')] opacity-20 bg-cover bg-center" />
      <div className="relative z-10 flex flex-col items-center">
        <MapPin className="h-12 w-12 text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Interactive Map Integration Pending</p>
        <p className="text-xs text-muted-foreground mt-2 max-w-xs text-center">
          Mapbox GL JS will be instantiated here to render {locations.length} location pins.
        </p>
      </div>
    </div>
  );
}
