"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  SORSOGON_CENTER,
  DEFAULT_ZOOM,
  OSM_TILE_URL,
  SATELLITE_TILE_URL,
  SATELLITE_LABELS_URL,
  TERRAIN_TILE_URL,
  MapStyleType,
} from "@/lib/map/mapbox";
import { LocateFixed, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { escapeHtml } from "@/lib/security/sanitize";

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
  const [mapStyle, setMapStyle] = useState<MapStyleType>("satellite");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const applyMapTiles = (map: L.Map, style: MapStyleType) => {
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (labelsTileLayerRef.current) {
      map.removeLayer(labelsTileLayerRef.current);
      labelsTileLayerRef.current = null;
    }

    if (style === "satellite") {
      baseTileLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
        maxZoom: 19,
      }).addTo(map);
      labelsTileLayerRef.current = L.tileLayer(SATELLITE_LABELS_URL, {
        maxZoom: 19,
        opacity: 0.9,
      }).addTo(map);
    } else if (style === "terrain") {
      baseTileLayerRef.current = L.tileLayer(TERRAIN_TILE_URL, {
        maxZoom: 19,
      }).addTo(map);
    } else {
      baseTileLayerRef.current = L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        className: "leaflet-street-tile",
      }).addTo(map);
    }
  };

  // Helper to create the modern pin icon
  const createPinIcon = (name?: string) => {
    const displayName = escapeHtml(name ? name.slice(0, 20) : "Event Venue");
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

    const initialCenter =
      lat && lng ? [lat, lng] : [SORSOGON_CENTER.lat, SORSOGON_CENTER.lng];
    const initialZoom = lat && lng ? 15 : DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: initialZoom,
      scrollWheelZoom: true,
      zoomControl: false,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    applyMapTiles(map, mapStyle);

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

  // Switch tile layers when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    applyMapTiles(mapInstanceRef.current, mapStyle);
  }, [mapStyle]);

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

      map.flyTo([lat, lng], 15, { duration: 0.8 });
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
          mapInstanceRef.current.flyTo([userLat, userLng], 16, { duration: 1 });
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([userLat, userLng]);
          markerRef.current.setIcon(createPinIcon("You're here"));
        } else if (mapInstanceRef.current) {
          const newMarker = L.marker([userLat, userLng], {
            draggable: true,
            icon: createPinIcon("You're here"),
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
        toast.success("Pinned: You're here! 📍");
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
      mapInstanceRef.current.flyTo(
        [SORSOGON_CENTER.lat, SORSOGON_CENTER.lng],
        DEFAULT_ZOOM,
        {
          duration: 0.8,
        }
      );
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-border shadow-xs bg-muted/20">
      {/* Clean Icon-Only Floating Toolbar (Satellite Icon | Street Map Icon | Pin You're Here | Reset) */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/20 shadow-xl">
        {/* Satellite View Icon Button */}
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          title="Satellite View"
          aria-label="Satellite View"
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer",
            mapStyle === "satellite"
              ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white shadow-md scale-105 ring-1 ring-white/40"
              : "text-white/75 hover:text-white hover:bg-white/15"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M13 7 9 3 5 7l4 4" />
            <path d="m17 11 4 4-4 4-4-4" />
            <path d="m8 12 4 4 6-6-4-4Z" />
            <path d="m16 8 3-3" />
            <path d="M9 21a6 6 0 0 0-6-6" />
          </svg>
        </button>

        {/* Street Map View Icon Button */}
        <button
          type="button"
          onClick={() => setMapStyle("street")}
          title="Street Map View"
          aria-label="Street Map View"
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer",
            mapStyle === "street"
              ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white shadow-md scale-105 ring-1 ring-white/40"
              : "text-white/75 hover:text-white hover:bg-white/15"
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
            <path d="M15 5.764v15" />
            <path d="M9 3.236v15" />
          </svg>
        </button>

        <div className="h-4 w-px bg-white/20 mx-0.5" />

        {/* Pin "You're here" GPS Button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          title="Pin where I'm located (You're here)"
          aria-label="Pin where I'm located"
          className="h-8 w-8 rounded-xl flex items-center justify-center text-sky-400 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
        >
          <LocateFixed className="h-4 w-4" />
        </button>

        {/* Reset View Icon Button */}
        <button
          type="button"
          onClick={handleResetToSorsogonCenter}
          title="Reset map to Sorsogon Center"
          aria-label="Reset map to Sorsogon Center"
          className="h-8 w-8 rounded-xl flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Interactive Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-80 sm:h-96 z-0"
        style={{ minHeight: "320px" }}
      />

      {/* Helpful Hint Footer */}
      <div className="bg-background/95 backdrop-blur-sm border-t border-border px-3.5 py-2 flex items-center justify-between text-xs text-muted-foreground gap-2">
        <span className="flex items-center gap-1.5 truncate">
          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-ping" />
          <span>
            Tap anywhere on the map or drag the pin to set the event venue.
          </span>
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
