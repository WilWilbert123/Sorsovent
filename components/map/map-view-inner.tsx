"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import {
  SORSOGON_CENTER,
  DEFAULT_ZOOM,
  OSM_TILE_URL,
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

  // Helper: computes a map center shifted slightly north in pixels so a marker's popup fits completely inside the map viewport
  const getPopupFriendlyCenter = (
    map: L.Map,
    lat: number,
    lng: number,
    targetZoom: number,
    withPopupOffset: boolean
  ): L.LatLngExpression => {
    if (!withPopupOffset) return [lat, lng];
    try {
      const containerHeight = mapContainerRef.current?.clientHeight || 340;
      const verticalShiftPx = Math.min(110, Math.round(containerHeight * 0.26));
      const point = map.project([lat, lng], targetZoom);
      const shiftedPoint = point.subtract([0, verticalShiftPx]);
      return map.unproject(shiftedPoint, targetZoom);
    } catch {
      return [lat, lng];
    }
  };

  // Initialize Map Once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter = center || SORSOGON_CENTER;
    const initialZoom = zoom || DEFAULT_ZOOM;

    const map = L.map(mapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: initialZoom,
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

    // If a pin is initially selected (e.g. on Event Details page), offset the initial view so the popup is never cut off at the top
    if (selectedId) {
      const targetLoc = locations.find((l) => l.id === selectedId);
      const latToUse = targetLoc?.lat ?? initialCenter.lat;
      const lngToUse = targetLoc?.lng ?? initialCenter.lng;
      const friendlyCenter = getPopupFriendlyCenter(
        map,
        latToUse,
        lngToUse,
        initialZoom,
        true
      );
      map.setView(friendlyCenter, initialZoom, { animate: false });
    }

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

  // Smoothly Fly / Pan when center, zoom, or selectedId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !center) return;
    const targetZoom = zoom || DEFAULT_ZOOM;
    const friendlyCenter = getPopupFriendlyCenter(
      map,
      center.lat,
      center.lng,
      targetZoom,
      Boolean(selectedId)
    );
    map.flyTo(friendlyCenter, targetZoom, {
      duration: 0.65,
    });
  }, [center?.lat, center?.lng, zoom, selectedId]);

  // Update Markers whenever locations change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();
    markersMapRef.current.clear();

    const coordCounts = new Map<string, number>();

    locations.forEach((loc, idx) => {
      if (loc.lat && loc.lng) {
        const key = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
        const dupIndex = coordCounts.get(key) || 0;
        coordCounts.set(key, dupIndex + 1);

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
        const textColor =
          isSelected || isLiveEvent || isDark ? "#ffffff" : "#0f172a";
        const borderColor = isSelected
          ? "#ffffff"
          : isLiveEvent
          ? "#34d399"
          : isDark
          ? "rgba(255,255,255,0.2)"
          : "rgba(15,23,42,0.12)";

        const maxTextWidth = compact ? "92px" : "135px";
        const pad = compact ? "3.5px 8px" : "5px 10px";
        const fontSize = compact ? "11px" : "12px";
        const emojiSize = compact ? "12.5px" : "14px";
        const scale = isSelected ? "scale(1.08)" : "scale(1)";

        const customIcon = L.divIcon({
          className: "custom-event-map-pin",
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: ${bgColor};
              color: ${textColor};
              padding: ${pad};
              border-radius: 9999px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: ${fontSize};
              font-weight: 700;
              letter-spacing: -0.01em;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
              border: 2px solid ${borderColor};
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
          popupAnchor: [0, -28],
        });

        const zOffset = isSelected ? 1000 : isLiveEvent ? 500 - idx : 100 - idx;
        const marker = L.marker([displayLat, displayLng], {
          icon: customIcon,
          zIndexOffset: zOffset,
        });

        const rawEventId =
          loc.eventId || (loc.isEvent ? loc.id.replace(/^event-/, "") : null);
        const isCurrentPage =
          typeof window !== "undefined" &&
          rawEventId &&
          window.location.pathname.includes(rawEventId);

        const headerColor = isDark ? "#f8fafc" : "#0f172a";
        const mutedColor = isDark ? "#94a3b8" : "#475569";
        const dividerColor = isDark ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0";
        const categoryBg = isDark ? "rgba(255, 51, 102, 0.2)" : "#fff1f2";
        const categoryText = isDark ? "#fb7185" : "#e11d48";
        const attendeeBg = isDark ? "#1e293b" : "#f8fafc";
        const attendeeBorder = isDark ? "#334155" : "#cbd5e1";
        const attendeeText = isDark ? "#f8fafc" : "#0f172a";

        let eventLinkHtml = "";
        if (rawEventId && !isCurrentPage) {
          eventLinkHtml = `
            <div style="margin-top: 8px; padding-top: 7px; border-top: 1px solid ${dividerColor};">
              <a href="/events/${rawEventId}" style="
                display: block;
                background: linear-gradient(135deg, #FF5E3A 0%, #FF3366 100%);
                color: white;
                text-align: center;
                padding: 7px 12px;
                border-radius: 10px;
                font-weight: 700;
                font-size: 11.5px;
                text-decoration: none;
                box-shadow: 0 2px 8px rgba(255,51,102,0.3);
              ">
                View Event Details →
              </a>
            </div>
          `;
        }

        // Attendee list HTML
        let attendeesHtml = "";
        if (isLiveEvent) {
          const count =
            loc.attendeeCount ?? (loc.attendees ? loc.attendees.length : 0);
          const countLabel =
            count === 1 ? "1 person going" : `${count} people going`;

          let attendeeItemsHtml = "";
          if (loc.attendees && loc.attendees.length > 0) {
            attendeeItemsHtml = `
              <div style="margin-top: 5px;">
                <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 60px; overflow-y: auto;">
                  ${loc.attendees
                    .map((att) => {
                      const name = att.full_name || att.username || "User";
                      const profileLink = att.username
                        ? `/profile/${encodeURIComponent(att.username)}`
                        : att.id
                        ? `/profile/${att.id}`
                        : "#";
                      const avatarImg = att.avatar_url
                        ? `<img src="${att.avatar_url}" style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981;" alt="${name}" />`
                        : `<div style="width: 16px; height: 16px; border-radius: 50%; background: ${
                            isDark ? "#334155" : "#e2e8f0"
                          }; color: ${
                            isDark ? "#e2e8f0" : "#334155"
                          }; display: flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: bold; border: 1.5px solid #10b981;">${(
                            name[0] || "U"
                          ).toUpperCase()}</div>`;
                      return `
                        <a href="${profileLink}" title="Visit ${name}'s profile" style="display: inline-flex; align-items: center; gap: 4px; background: ${attendeeBg}; padding: 2px 6px; border-radius: 9999px; border: 1px solid ${attendeeBorder}; text-decoration: none; color: ${attendeeText}; font-size: 10px; font-weight: 600;">
                          ${avatarImg}
                          <span style="max-width: 76px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                        </a>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            `;
          }

          attendeesHtml = `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${dividerColor};">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 11px; color: #10b981; font-weight: 700;">
                <span>👥 ${countLabel}</span>
              </div>
              ${attendeeItemsHtml}
            </div>
          `;
        }

        // Host info HTML
        let hostHtml = "";
        if (loc.host) {
          const hName =
            loc.host.display_name ||
            loc.host.full_name ||
            loc.host.username ||
            "Event Host";
          const hLink = loc.host.username
            ? `/profile/${encodeURIComponent(loc.host.username)}`
            : loc.host.id
            ? `/profile/${loc.host.id}`
            : "#";
          const hAvatar = loc.host.avatar_url
            ? `<img src="${loc.host.avatar_url}" style="width: 15px; height: 15px; border-radius: 50%; object-fit: cover; border: 1px solid #10b981;" alt="${hName}" />`
            : `<div style="width: 15px; height: 15px; border-radius: 50%; background: ${
                isDark ? "#334155" : "#e2e8f0"
              }; color: ${
                isDark ? "#e2e8f0" : "#334155"
              }; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1px solid #10b981;">${(
                hName[0] || "H"
              ).toUpperCase()}</div>`;
          hostHtml = `
            <div style="margin: 4px 0; display: flex; align-items: center; gap: 5px; font-size: 11px;">
              <span style="font-size: 10px; color: ${mutedColor}; font-weight: 600;">Host:</span>
              <a href="${hLink}" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: ${headerColor}; font-weight: 700; background: ${attendeeBg}; border: 1px solid ${attendeeBorder}; padding: 1.5px 7px; border-radius: 9999px;">
                ${hAvatar}
                <span style="max-width: 115px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${hName}</span>
              </a>
            </div>
          `;
        }

        marker.bindPopup(
          `
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 195px; max-width: 245px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px; padding-right: 14px;">
              <div style="display: flex; align-items: center; gap: 5px; min-width: 0;">
                <span style="font-size: 16px; line-height: 1; flex-shrink: 0;">${emoji}</span>
                <h4 style="margin: 0; font-weight: 800; color: ${headerColor}; font-size: 13.5px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${loc.name}</h4>
              </div>
              ${
                loc.category
                  ? `<span style="font-size: 9.5px; background: ${categoryBg}; color: ${categoryText}; padding: 2px 6px; border-radius: 9999px; font-weight: 700; flex-shrink: 0;">${loc.category}</span>`
                  : ""
              }
            </div>
            ${
              loc.locationName
                ? `<p style="margin: 2px 0; font-size: 11px; color: ${mutedColor}; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span>📍</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${loc.locationName}</span></p>`
                : ""
            }
            ${
              loc.eventDate
                ? `<p style="margin: 2px 0; font-size: 11px; color: ${headerColor}; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span>📅</span><span>${loc.eventDate}${
                    loc.eventTime ? ` • ${loc.eventTime}` : ""
                  }</span></p>`
                : ""
            }
            ${hostHtml}
            ${
              loc.description && loc.description !== loc.locationName
                ? `<p style="margin: 4px 0 2px 0; font-size: 11px; color: ${mutedColor}; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${loc.description}</p>`
                : ""
            }
            ${attendeesHtml}
            ${eventLinkHtml}
          </div>
        `,
          {
            autoPan: true,
            autoPanPaddingTopLeft: L.point(16, 24),
            autoPanPaddingBottomRight: L.point(16, 20),
            maxWidth: 255,
            minWidth: 195,
          }
        );

        marker.on("click", () => {
          onSelectLocation?.(loc);
          const currentZoom = map.getZoom();
          const friendly = getPopupFriendlyCenter(
            map,
            displayLat,
            displayLng,
            currentZoom,
            true
          );
          map.panTo(friendly, { animate: true, duration: 0.4 });
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
      const map = mapInstanceRef.current;
      if (marker && map) {
        marker.openPopup();
        const pos = marker.getLatLng();
        const friendly = getPopupFriendlyCenter(
          map,
          pos.lat,
          pos.lng,
          map.getZoom(),
          true
        );
        map.panTo(friendly, { animate: true, duration: 0.4 });
      }
    }
  }, [selectedId]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-border">
      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />
    </div>
  );
}
