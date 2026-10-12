"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";

const LocationPickerInner = dynamic(
  () => import("./location-picker-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 sm:h-80 bg-muted/30 border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 p-6 text-center animate-pulse">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">
          Loading Sorsogon interactive location picker...
        </p>
      </div>
    ),
  }
);

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  locationName?: string;
  onSelectCoordinates: (lat: number, lng: number, placeHint?: string) => void;
}

export function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerInner {...props} />;
}
