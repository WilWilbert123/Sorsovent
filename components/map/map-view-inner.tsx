"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SORSOGON_CENTER, DEFAULT_ZOOM, OSM_TILE_URL, OSM_ATTRIBUTION } from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { MapLocation } from "./map-view";

interface MapViewInnerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  onSelectLocation?: (loc: MapLocation) => void;
  showZoomControl?: boolean;
}

export default function MapViewInner({
  locations = [],
  center = SORSOGON_CENTER,
  zoom = DEFAULT_ZOOM,
  selectedId,
  onSelectLocation,
  showZoomControl = false,
}: MapViewInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = center || SORSOGON_CENTER;
    const map = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: zoom || DEFAULT_ZOOM,
      scrollWheelZoom: true,
      zoomControl: showZoomControl,
    });

    L.tileLayer(OSM_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Smoothly Fly / Pan when center or zoom changes
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    mapInstanceRef.current.flyTo([center.lat, center.lng], zoom || DEFAULT_ZOOM, {
      duration: 0.8,
    });
  }, [center?.lat, center?.lng, zoom]);

  // Update Markers whenever locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();
    markersMapRef.current.clear();

    locations.forEach((loc) => {
      if (loc.lat && loc.lng) {
        const emoji = getCategoryEmoji(loc.category, loc.name);
        const isLiveEvent = Boolean(loc.isEvent || loc.eventId);

        const bgColor = isLiveEvent ? "#047857" : "#0f172a";
        const borderColor = isLiveEvent ? "#10b981" : "#3b82f6";

        const customIcon = L.divIcon({
          className: "custom-event-map-pin",
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: ${bgColor};
              color: white;
              padding: 5px 12px;
              border-radius: 20px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 12px;
              font-weight: 700;
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
              border: 2px solid ${borderColor};
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -100%);
              transition: transform 0.15s ease;
            ">
              <span style="font-size: 15px; line-height: 1;">${emoji}</span>
              <span style="max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${loc.name}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });

        const rawEventId = loc.eventId || (loc.isEvent ? loc.id.replace(/^event-/, "") : null);
        const isCurrentPage = typeof window !== "undefined" && rawEventId && window.location.pathname.includes(rawEventId);

        let eventLinkHtml = "";
        if (rawEventId && !isCurrentPage) {
          eventLinkHtml = `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #f1f5f9;">
              <a href="/events/${rawEventId}" style="
                display: block;
                background: #059669;
                color: white;
                text-align: center;
                padding: 6px 10px;
                border-radius: 8px;
                font-weight: 700;
                font-size: 11px;
                text-decoration: none;
                box-shadow: 0 2px 6px rgba(5,150,105,0.25);
              ">
                View Event & Join →
              </a>
            </div>
          `;
        }

        // Attendee list HTML
        let attendeesHtml = "";
        if (isLiveEvent) {
          const count = loc.attendeeCount ?? (loc.attendees ? loc.attendees.length : 0);
          const countLabel = count === 1 ? "1 person attending" : `${count} people attending`;

          let attendeeItemsHtml = "";
          if (loc.attendees && loc.attendees.length > 0) {
            attendeeItemsHtml = `
              <div style="margin-top: 5px;">
                <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 4px;">Attendees:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 75px; overflow-y: auto;">
                  ${loc.attendees.map((att) => {
                    const name = att.full_name || att.username || "User";
                    const profileLink = att.username ? `/profile/${encodeURIComponent(att.username)}` : (att.id ? `/profile/${att.id}` : "#");
                    const avatarImg = att.avatar_url
                      ? `<img src="${att.avatar_url}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981;" alt="${name}" />`
                      : `<div style="width: 18px; height: 18px; border-radius: 50%; background: #e2e8f0; color: #334155; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; border: 1.5px solid #10b981;">${(name[0] || "U").toUpperCase()}</div>`;
                    return `
                      <a href="${profileLink}" title="Visit ${name}'s profile" style="display: inline-flex; align-items: center; gap: 4px; background: #f8fafc; padding: 2px 7px; border-radius: 9999px; border: 1px solid #cbd5e1; text-decoration: none; color: #0f172a; font-size: 10px; font-weight: 600;">
                        ${avatarImg}
                        <span style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                      </a>
                    `;
                  }).join("")}
                </div>
              </div>
            `;
          }

          attendeesHtml = `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9;">
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #059669; font-weight: 700;">
                <span>👥</span>
                <span>${countLabel}</span>
              </div>
              ${attendeeItemsHtml}
            </div>
          `;
        }

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 190px; max-width: 260px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 18px; line-height: 1;">${emoji}</span>
              <h4 style="margin: 0; font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.2;">${loc.name}</h4>
            </div>
            ${loc.category ? `
              <div style="margin-bottom: 5px;">
                <span style="font-size: 10px; background: #eff6ff; color: #2563eb; padding: 2px 7px; border-radius: 9999px; font-weight: 600;">${loc.category}</span>
              </div>
            ` : ""}
            ${loc.locationName ? `<p style="margin: 3px 0; font-size: 11px; color: #475569; font-weight: 600; display: flex; align-items: center; gap: 3px;"><span>📍</span><span>${loc.locationName}</span></p>` : ""}
            ${loc.eventDate ? `<p style="margin: 3px 0; font-size: 11px; color: #0f172a; font-weight: 600; display: flex; align-items: center; gap: 3px;"><span>📅</span><span>${loc.eventDate}</span></p>` : ""}
            ${loc.eventTime ? `<p style="margin: 3px 0; font-size: 11px; color: #475569; font-weight: 500; display: flex; align-items: center; gap: 3px;"><span>🕒</span><span>${loc.eventTime}</span></p>` : ""}
            ${loc.description && loc.description !== loc.locationName ? `<p style="margin: 4px 0 2px 0; font-size: 11px; color: #64748b; line-height: 1.4;">${loc.description}</p>` : ""}
            ${attendeesHtml}
            ${eventLinkHtml}
          </div>
        `);

        marker.on("click", () => {
          onSelectLocation?.(loc);
        });

        markersMapRef.current.set(loc.id, marker);
        layer.addLayer(marker);
      }
    });
  }, [locations, onSelectLocation]);

  // Open popup if selectedId changes
  useEffect(() => {
    if (selectedId && markersMapRef.current.has(selectedId)) {
      const marker = markersMapRef.current.get(selectedId);
      marker?.openPopup();
    }
  }, [selectedId]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-border">
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />
    </div>
  );
}
