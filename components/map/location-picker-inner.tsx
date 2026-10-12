"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SORSOGON_CENTER, DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from "@/lib/map/mapbox";
import { Locate, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationPickerInnerProps {
  lat: number | null;
  lng: number | null;
  locationName?: string;
  onSelectCoordinates: (lat: number, lng: number, placeHint?: string) => void;
}

export default function LocationPickerInner({
  lat,
  lng,
  locationName,
  onSelectCoordinates,
}: LocationPickerInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Helper to create the modern pin icon
  const createPinIcon = (name?: string) => {
    const displayName = name ? name.slice(0, 20) : "Event Venue";
    return L.divIcon({
      className: "custom-location-picker-pin",
      html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translate(-50%, -100%);
          cursor: grab;
          user-select: none;
        ">
          <div style="
            background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
            color: #ffffff;
            padding: 5px 12px;
            border-radius: 9999px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 4px 14px rgba(225, 29, 72, 0.45);
            border: 2px solid #ffffff;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            white-space: nowrap;
          ">
            <span>📍</span>
            <span>${displayName}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid #e11d48;
          "></div>
          <div style="
            width: 10px;
            height: 10px;
            background: #e11d48;
            border-radius: 50%;
            border: 2px solid #ffffff;
            margin-top: -2px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const initialCenter = lat && lng ? [lat, lng] : [SORSOGON_CENTER.lat, SORSOGON_CENTER.lng];
    const initialZoom = lat && lng ? 14 : DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: initialZoom,
      scrollWheelZoom: true,
      zoomControl: false,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap tiles
    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // Initial marker if lat/lng available
    if (lat && lng) {
      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: createPinIcon(locationName),
      }).addTo(map);

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        const roundedLat = parseFloat(position.lat.toFixed(6));
        const roundedLng = parseFloat(position.lng.toFixed(6));
        onSelectCoordinates(roundedLat, roundedLng);
      });

      markerRef.current = marker;
    }

    // Click on map to place or move pin
    map.on("click", (e: L.LeafletMouseEvent) => {
      const clickedLat = parseFloat(e.latlng.lat.toFixed(6));
      const clickedLng = parseFloat(e.latlng.lng.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLatLng([clickedLat, clickedLng]);
        markerRef.current.setIcon(createPinIcon(locationName));
      } else {
        const newMarker = L.marker([clickedLat, clickedLng], {
          draggable: true,
          icon: createPinIcon(locationName),
        }).addTo(map);

        newMarker.on("dragend", () => {
          const pos = newMarker.getLatLng();
          onSelectCoordinates(
            parseFloat(pos.lat.toFixed(6)),
            parseFloat(pos.lng.toFixed(6))
          );
        });

        markerRef.current = newMarker;
      }

      onSelectCoordinates(clickedLat, clickedLng);
    });

    // Invalidate map size after render to fix Leaflet container dimensions
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync marker when lat/lng props change from dropdown/preset selection
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (lat && lng) {
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.setIcon(createPinIcon(locationName));
      } else {
        const marker = L.marker([lat, lng], {
          draggable: true,
          icon: createPinIcon(locationName),
        }).addTo(map);

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          onSelectCoordinates(
            parseFloat(position.lat.toFixed(6)),
            parseFloat(position.lng.toFixed(6))
          );
        });

        markerRef.current = marker;
      }

      map.flyTo([lat, lng], 14, { duration: 0.8 });
    }
  }, [lat, lng, locationName]);

  // Current GPS location trigger
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    toast.info("Detecting your current location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = parseFloat(pos.coords.latitude.toFixed(6));
        const userLng = parseFloat(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([userLat, userLng], 15, { duration: 1 });
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([userLat, userLng]);
          markerRef.current.setIcon(createPinIcon("My Current Location"));
        } else if (mapInstanceRef.current) {
          const newMarker = L.marker([userLat, userLng], {
            draggable: true,
            icon: createPinIcon("My Current Location"),
          }).addTo(mapInstanceRef.current);

          newMarker.on("dragend", () => {
            const p = newMarker.getLatLng();
            onSelectCoordinates(
              parseFloat(p.lat.toFixed(6)),
              parseFloat(p.lng.toFixed(6))
            );
          });
          markerRef.current = newMarker;
        }

        onSelectCoordinates(userLat, userLng, "My Current Location");
        toast.success("Pinned to your current location! 📍");
      },
      (err) => {
        toast.error("Could not get your location: " + err.message);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Reset to Sorsogon Center
  const handleResetToSorsogonCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([SORSOGON_CENTER.lat, SORSOGON_CENTER.lng], DEFAULT_ZOOM, {
        duration: 0.8,
      });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-xs bg-muted/20">
      {/* Map Action Floating Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-background/90 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleUseCurrentLocation}
          className="h-7 px-2.5 text-xs gap-1.5 font-medium hover:bg-primary/10 hover:text-primary cursor-pointer"
          title="Pin to my current GPS location"
        >
          <Locate className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline">My Location</span>
        </Button>
        <div className="h-3 w-px bg-border" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetToSorsogonCenter}
          className="h-7 px-2.5 text-xs gap-1.5 font-medium hover:bg-muted cursor-pointer"
          title="Center on Sorsogon"
        >
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Reset View</span>
        </Button>
      </div>

      {/* Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-72 sm:h-80 z-0"
        style={{ minHeight: "280px" }}
      />

      {/* Helpful Hint Footer */}
      <div className="bg-background/95 backdrop-blur-sm border-t border-border px-3.5 py-2 flex items-center justify-between text-xs text-muted-foreground gap-2">
        <span className="flex items-center gap-1.5 truncate">
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
          <span>Click anywhere on the map or drag the pin to place event venue.</span>
        </span>
        {lat && lng && (
          <span className="font-mono text-[11px] text-foreground font-semibold bg-muted px-2 py-0.5 rounded-md shrink-0">
            {lat.toFixed(4)}, {lng.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
