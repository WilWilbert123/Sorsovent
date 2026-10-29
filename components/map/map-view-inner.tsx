"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import {
  SORSOGON_CENTER,
  DEFAULT_ZOOM,
  OSM_TILE_URL,
  OSM_ATTRIBUTION,
} from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { MapLocation } from "./map-view";

interface MapViewInnerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  onSelectLocation?: (loc: MapLocation) => void;
  showZoomControl?: boolean;
  compact?: boolean;
}

export default function MapViewInner({
  locations = [],
  center = SORSOGON_CENTER,
  zoom = DEFAULT_ZOOM,
  selectedId,
  onSelectLocation,
  showZoomControl = false,
  compact = false,
}: MapViewInnerProps) {
  const { resolvedTheme } = useTheme();
  const isDark =
    resolvedTheme === "dark" ||
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

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
      attributionControl: false,
    });

    L.tileLayer(OSM_TILE_URL, {
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

    // Group nearby/identical coordinates so markers never stack directly on top of one another
    const coordCounts = new Map<string, number>();

    locations.forEach((loc, idx) => {
      if (loc.lat && loc.lng) {
        const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
        const dupIndex = coordCounts.get(key) || 0;
        coordCounts.set(key, dupIndex + 1);

        // Apply a small radial offset when multiple pins share the same spot
        let displayLat = loc.lat;
        let displayLng = loc.lng;
        if (dupIndex > 0) {
          const angle = dupIndex * 2.2;
          const radius = 0.0028 * Math.ceil(dupIndex / 2);
          displayLat = loc.lat + Math.cos(angle) * radius;
          displayLng = loc.lng + Math.sin(angle) * radius;
        }

        const emoji = getCategoryEmoji(loc.category, loc.name);
        const isLiveEvent = Boolean(loc.isEvent || loc.eventId);
        const isSelected = selectedId === loc.id;

        const bgColor = isSelected
          ? "#FF3366"
          : isLiveEvent
          ? "#059669"
          : isDark
          ? "#1e293b"
          : "#ffffff";
        const textColor = isSelected || isLiveEvent || isDark ? "#ffffff" : "#0f172a";
        const borderColor = isSelected
          ? "#ffffff"
          : isLiveEvent
          ? "#34d399"
          : isDark
          ? "rgba(255,255,255,0.2)"
          : "rgba(15,23,42,0.12)";

        const maxTextWidth = compact ? "88px" : "120px";
        const pad = compact ? "3px 7px" : "4px 9px";
        const fontSize = compact ? "10.5px" : "11.5px";
        const emojiSize = compact ? "12px" : "13.5px";
        const scale = isSelected ? "scale(1.08)" : "scale(1)";

        const customIcon = L.divIcon({
          className: "custom-event-map-pin",
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background: ${bgColor};
              color: ${textColor};
              padding: ${pad};
              border-radius: 9999px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: ${fontSize};
              font-weight: 600;
              letter-spacing: -0.01em;
              box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22);
              border: 1.5px solid ${borderColor};
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -100%) ${scale};
              transition: transform 0.15s ease;
            ">
              <span style="font-size: ${emojiSize}; line-height: 1;">${emoji}</span>
              <span style="max-width: ${maxTextWidth}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${loc.name}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const zOffset = isSelected ? 1000 : isLiveEvent ? 500 - idx : 100 - idx;
        const marker = L.marker([displayLat, displayLng], {
          icon: customIcon,
          zIndexOffset: zOffset,
        });

        const rawEventId = loc.eventId || (loc.isEvent ? loc.id.replace(/^event-/, "") : null);
        const isCurrentPage = typeof window !== "undefined" && rawEventId && window.location.pathname.includes(rawEventId);

        const headerColor = isDark ? "#f8fafc" : "#0f172a";
        const mutedColor = isDark ? "#94a3b8" : "#475569";
        const dividerColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#f1f5f9";
        const categoryBg = isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff";
        const categoryText = isDark ? "#60a5fa" : "#2563eb";
        const attendeeBg = isDark ? "#1e293b" : "#f8fafc";
        const attendeeBorder = isDark ? "#334155" : "#cbd5e1";
        const attendeeText = isDark ? "#f8fafc" : "#0f172a";

        let eventLinkHtml = "";
        if (rawEventId && !isCurrentPage) {
          eventLinkHtml = `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid ${dividerColor};">
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
                <span style="font-size: 10px; color: ${mutedColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 4px;">Attendees:</span>
                <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 75px; overflow-y: auto;">
                  ${loc.attendees.map((att) => {
                    const name = att.full_name || att.username || "User";
                    const profileLink = att.username ? `/profile/${encodeURIComponent(att.username)}` : (att.id ? `/profile/${att.id}` : "#");
                    const avatarImg = att.avatar_url
                      ? `<img src="${att.avatar_url}" style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981;" alt="${name}" />`
                      : `<div style="width: 18px; height: 18px; border-radius: 50%; background: ${isDark ? "#334155" : "#e2e8f0"}; color: ${isDark ? "#e2e8f0" : "#334155"}; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; border: 1.5px solid #10b981;">${(name[0] || "U").toUpperCase()}</div>`;
                    return `
                      <a href="${profileLink}" title="Visit ${name}'s profile" style="display: inline-flex; align-items: center; gap: 4px; background: ${attendeeBg}; padding: 2px 7px; border-radius: 9999px; border: 1px solid ${attendeeBorder}; text-decoration: none; color: ${attendeeText}; font-size: 10px; font-weight: 600;">
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
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${dividerColor};">
              <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; color: #10b981; font-weight: 700;">
                <span>👥</span>
                <span>${countLabel}</span>
              </div>
              ${attendeeItemsHtml}
            </div>
          `;
        }

        // Host info HTML
        let hostHtml = "";
        if (loc.host) {
          const hName = loc.host.display_name || loc.host.full_name || loc.host.username || "Event Host";
          const hLink = loc.host.username ? `/profile/${encodeURIComponent(loc.host.username)}` : (loc.host.id ? `/profile/${loc.host.id}` : "#");
          const hAvatar = loc.host.avatar_url
            ? `<img src="${loc.host.avatar_url}" style="width: 15px; height: 15px; border-radius: 50%; object-fit: cover; border: 1px solid #10b981;" alt="${hName}" />`
            : `<div style="width: 15px; height: 15px; border-radius: 50%; background: ${isDark ? "#334155" : "#e2e8f0"}; color: ${isDark ? "#e2e8f0" : "#334155"}; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1px solid #10b981;">${(hName[0] || "H").toUpperCase()}</div>`;
          hostHtml = `
            <div style="margin: 4px 0; display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <span style="font-size: 10px; color: ${mutedColor}; font-weight: 600;">Host:</span>
              <a href="${hLink}" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: ${headerColor}; font-weight: 700; background: ${attendeeBg}; border: 1px solid ${attendeeBorder}; padding: 1px 7px; border-radius: 9999px;">
                ${hAvatar}
                <span style="max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${hName}</span>
              </a>
            </div>
          `;
        }

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 190px; max-width: 260px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
              <span style="font-size: 18px; line-height: 1;">${emoji}</span>
              <h4 style="margin: 0; font-weight: 700; color: ${headerColor}; font-size: 14px; line-height: 1.2;">${loc.name}</h4>
            </div>
            ${loc.category ? `
              <div style="margin-bottom: 5px;">
                <span style="font-size: 10px; background: ${categoryBg}; color: ${categoryText}; padding: 2px 7px; border-radius: 9999px; font-weight: 600;">${loc.category}</span>
              </div>
            ` : ""}
            ${loc.locationName ? `<p style="margin: 3px 0; font-size: 11px; color: ${mutedColor}; font-weight: 600; display: flex; align-items: center; gap: 3px;"><span>📍</span><span>${loc.locationName}</span></p>` : ""}
            ${loc.eventDate ? `<p style="margin: 3px 0; font-size: 11px; color: ${headerColor}; font-weight: 600; display: flex; align-items: center; gap: 3px;"><span>📅</span><span>${loc.eventDate}</span></p>` : ""}
            ${loc.eventTime ? `<p style="margin: 3px 0; font-size: 11px; color: ${mutedColor}; font-weight: 500; display: flex; align-items: center; gap: 3px;"><span>🕒</span><span>${loc.eventTime}</span></p>` : ""}
            ${hostHtml}
            ${loc.description && loc.description !== loc.locationName ? `<p style="margin: 4px 0 2px 0; font-size: 11px; color: ${mutedColor}; line-height: 1.4;">${loc.description}</p>` : ""}
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
  }, [locations, onSelectLocation, isDark, selectedId, compact]);

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
