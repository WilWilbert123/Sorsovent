"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SORSOGON_CENTER, DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";

interface MapLocation {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lng: number;
  description?: string;
}

interface MapViewInnerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapViewInner({
  locations = [],
  center = SORSOGON_CENTER,
  zoom = DEFAULT_ZOOM,
}: MapViewInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const currentCenter = center || SORSOGON_CENTER;

    // Initialize Leaflet map centered at Sorsogon
    const map = L.map(mapContainerRef.current, {
      center: [currentCenter.lat, currentCenter.lng],
      zoom: zoom || DEFAULT_ZOOM,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    // Add markers for all locations
    locations.forEach((loc) => {
      if (loc.lat && loc.lng) {
        const emoji = getCategoryEmoji(loc.category, loc.name);

        const customIcon = L.divIcon({
          className: "custom-event-map-pin",
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #0f172a;
              color: white;
              padding: 5px 11px;
              border-radius: 20px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 12px;
              font-weight: 700;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
              border: 2px solid #3b82f6;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -100%);
              transition: all 0.2s ease;
            ">
              <span style="font-size: 16px; line-height: 1;">${emoji}</span>
              <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; letter-spacing: -0.01em;">${loc.name}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 170px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 20px;">${emoji}</span>
              <h4 style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px;">${loc.name}</h4>
            </div>
            ${loc.category ? `<span style="font-size: 11px; background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 9999px; font-weight: 600; display: inline-block; margin-bottom: 4px;">${loc.category}</span>` : ""}
            ${loc.description ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #475569; line-height: 1.4;">${loc.description}</p>` : ""}
          </div>
        `);
      }
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, center, zoom]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-border">
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />
    </div>
  );
}
