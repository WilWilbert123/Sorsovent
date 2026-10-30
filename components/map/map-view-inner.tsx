"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "next-themes";
import {
  SORSOGON_CENTER,
  DEFAULT_ZOOM,
  OSM_TILE_URL,
  SATELLITE_TILE_URL,
  SATELLITE_LABELS_URL,
  TERRAIN_TILE_URL,
  MapStyleType,
  fetchRoadRoute,
} from "@/lib/map/mapbox";
import { getCategoryEmoji } from "@/lib/map/emoji";
import { escapeHtml, sanitizeImageUrl } from "@/lib/security/sanitize";
import { MapLocation } from "./map-view";
import { Navigation, X, ExternalLink, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

interface MapViewInnerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  selectionKey?: number;
  onSelectLocation?: (loc: MapLocation) => void;
  onDeselectLocation?: () => void;
  showZoomControl?: boolean;
  compact?: boolean;
  defaultMapStyle?: MapStyleType;
  directionsTargetId?: string | null;
  directionsRequestKey?: number;
}

interface ActiveRouteInfo {
  targetLocation: MapLocation;
  startLat: number;
  startLng: number;
  distanceKm: number;
  durationMinutes: number;
  isRoadRoute: boolean;
  usingFallbackStart: boolean;
}

export default function MapViewInner({
  locations = [],
  center = SORSOGON_CENTER,
  zoom = DEFAULT_ZOOM,
  selectedId,
  selectionKey = 0,
  onSelectLocation,
  onDeselectLocation,
  showZoomControl = false,
  compact = false,
  defaultMapStyle = "satellite",
  directionsTargetId = null,
  directionsRequestKey = 0,
}: MapViewInnerProps) {
  const { resolvedTheme } = useTheme();
  const isDark =
    resolvedTheme === "dark" ||
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  const [mapStyle, setMapStyle] = useState<MapStyleType>(defaultMapStyle);
  const [isRouting, setIsRouting] = useState(false);
  const [activeRoute, setActiveRoute] = useState<ActiveRouteInfo | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const locationsRef = useRef<MapLocation[]>(locations);
  const onDeselectLocationRef = useRef(onDeselectLocation);
  const prevSelectedIdRef = useRef<string | null>(null);
  const popupCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

  useEffect(() => {
    onDeselectLocationRef.current = onDeselectLocation;
  }, [onDeselectLocation]);

  // Helper: creates the "You're here" live GPS pin icon
  const createYouAreHereIcon = useCallback((isFallback = false) => {
    return L.divIcon({
      className: "user-you-are-here-pin",
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
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            padding: 3.5px 9px;
            border-radius: 9999px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 10.5px;
            font-weight: 800;
            letter-spacing: -0.01em;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
            border: 2px solid #ffffff;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
          ">
            <span style="
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: #60a5fa;
              box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
              display: inline-block;
            "></span>
            <span>${isFallback ? "You're here (Drag)" : "You're here"}</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-top: 6px solid #1d4ed8;
            margin-top: -1px;
          "></div>
          <div style="
            position: relative;
            width: 14px;
            height: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: -2px;
          ">
            <span style="
              position: absolute;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: rgba(59, 130, 246, 0.35);
              border: 1.5px solid rgba(96, 165, 250, 0.7);
            "></span>
            <span style="
              position: relative;
              width: 11px;
              height: 11px;
              border-radius: 50%;
              background: #2563eb;
              border: 2.5px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            "></span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, []);

  // Render or update the persistent "You're here" pin on the map
  const renderUserLocationPin = useCallback(
    (uLat: number, uLng: number, isFallback = false) => {
      const userLayer = userLocationLayerRef.current;
      if (!userLayer) return;

      userLayer.clearLayers();

      const youMarker = L.marker([uLat, uLng], {
        icon: createYouAreHereIcon(isFallback),
        draggable: true,
        zIndexOffset: 1500,
      }).addTo(userLayer);

      youMarker.bindTooltip(
        isFallback
          ? "Your starting pin (drag anywhere to adjust your location)"
          : "You're here (drag to adjust)",
        {
          direction: "top",
          offset: [0, -34],
        }
      );

      youMarker.on("dragend", () => {
        const pos = youMarker.getLatLng();
        setUserCoords({ lat: pos.lat, lng: pos.lng });
      });
    },
    [createYouAreHereIcon]
  );

  // Keep the "You're here" pin synced whenever userCoords changes and no active route overrides it
  useEffect(() => {
    if (!userCoords) return;
    renderUserLocationPin(userCoords.lat, userCoords.lng, false);
  }, [userCoords, renderUserLocationPin]);

  // Helper: computes a map center shifted slightly north in pixels so a marker's popup fits completely inside the map viewport
  const getPopupFriendlyCenter = useCallback(
    (
      map: L.Map,
      lat: number,
      lng: number,
      targetZoom: number,
      withPopupOffset: boolean
    ): L.LatLngExpression => {
      if (!withPopupOffset) return [lat, lng];
      try {
        const containerHeight = mapContainerRef.current?.clientHeight || 360;
        const verticalShiftPx = Math.min(115, Math.round(containerHeight * 0.26));
        const point = map.project([lat, lng], targetZoom);
        const shiftedPoint = point.subtract([0, verticalShiftPx]);
        return map.unproject(shiftedPoint, targetZoom);
      } catch {
        return [lat, lng];
      }
    },
    []
  );

  // Helper to open a marker's popup smoothly, handling zoom state and viewport positioning
  const openMarkerWithPopup = useCallback(
    (marker: L.Marker, shouldPan = true) => {
      const map = mapInstanceRef.current;
      if (!map || activeRoute) return;

      if (!shouldPan) {
        marker.openPopup();
        return;
      }

      const pos = marker.getLatLng();
      const currentZoom = map.getZoom();
      const needsZoom = currentZoom < 14;
      const targetZoom = needsZoom ? 15 : currentZoom;
      const friendly = getPopupFriendlyCenter(
        map,
        pos.lat,
        pos.lng,
        targetZoom,
        true
      );

      if (needsZoom) {
        map.flyTo(friendly, targetZoom, { duration: 0.45 });
        map.once("moveend", () => {
          marker.openPopup();
        });
      } else {
        map.panTo(friendly, { animate: true, duration: 0.35 });
        marker.openPopup();
      }
    },
    [activeRoute, getPopupFriendlyCenter]
  );

  // Helper: creates a custom marker Leaflet DivIcon
  const createMarkerIcon = useCallback(
    (loc: MapLocation, isSelected: boolean) => {
      const emoji = getCategoryEmoji(loc.category, loc.name);
      const isLiveEvent = Boolean(loc.isEvent || loc.eventId);

      const bgColor = isSelected
        ? "#FF3366"
        : isLiveEvent
        ? "#059669"
        : isDark
        ? "#0f172a"
        : "#ffffff";
      const textColor =
        isSelected || isLiveEvent || isDark ? "#ffffff" : "#0f172a";
      const borderColor = isSelected
        ? "#ffffff"
        : isLiveEvent
        ? "#6ee7b7"
        : "#ffffff";

      const maxTextWidth = compact ? "92px" : "135px";
      const pad = compact ? "3.5px 8px" : "5px 10px";
      const fontSize = compact ? "11px" : "12px";
      const emojiSize = compact ? "12.5px" : "14px";
      const scale = isSelected ? "scale(1.08)" : "scale(1)";

      const safeLocName = escapeHtml(loc.name);

      return L.divIcon({
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
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.38);
            border: 2px solid ${borderColor};
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -100%) ${scale};
            transition: transform 0.15s ease, background 0.15s ease;
          ">
            <span style="font-size: ${emojiSize}; line-height: 1;">${emoji}</span>
            <span style="max-width: ${maxTextWidth}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeLocName}</span>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -28],
      });
    },
    [compact, isDark]
  );

  // Helper: builds rich popup HTML for a location / event
  const buildPopupHtml = useCallback(
    (loc: MapLocation) => {
      const emoji = getCategoryEmoji(loc.category, loc.name);
      const isLiveEvent = Boolean(loc.isEvent || loc.eventId);

      const safeLocName = escapeHtml(loc.name);
      const safeLocCategory = escapeHtml(loc.category);
      const safeLocVenue = escapeHtml(loc.locationName);
      const safeLocDesc = escapeHtml(loc.description);
      const safeEventDate = escapeHtml(loc.eventDate);
      const safeEventTime = escapeHtml(loc.eventTime);

      const rawEventId =
        loc.eventId || (loc.isEvent ? loc.id.replace(/^event-/, "") : null);
      const safeEventId = rawEventId ? encodeURIComponent(rawEventId) : null;
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

      // Optional Banner Image
      const safeImageUrl = loc.imageUrl ? sanitizeImageUrl(loc.imageUrl) : null;
      const coverImageHtml = safeImageUrl
        ? `
          <div style="width: 100%; height: 80px; border-radius: 8px; overflow: hidden; margin-bottom: 5px; position: relative;">
            <img src="${safeImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${safeLocName}" />
            ${
              loc.price !== undefined
                ? `<span style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.78); color: #fff; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; backdrop-filter: blur(2px); border: 1px solid rgba(255,255,255,0.2);">${
                    loc.price === 0 ? "Free" : `₱${loc.price}`
                  }</span>`
                : ""
            }
          </div>
        `
        : "";

      // Action Buttons inside Popup: "Get Directions" + optional "View Event"
      const safeLocId = escapeHtml(loc.id).replace(/'/g, "\\'");
      const actionButtonsHtml = `
        <div style="margin-top: 8px; padding-top: 7px; border-top: 1px solid ${dividerColor}; display: flex; gap: 6px;">
          <button
            type="button"
            onclick="window.dispatchEvent(new CustomEvent('mingle:map-directions', { detail: { locationId: '${safeLocId}' } }))"
            style="
              flex: 1;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
              background: #2563eb;
              color: #ffffff;
              border: none;
              padding: 7px 10px;
              border-radius: 9px;
              font-weight: 700;
              font-size: 11px;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
            "
          >
            <span>🧭</span>
            <span>Directions</span>
          </button>
          ${
            safeEventId && !isCurrentPage
              ? `
            <a href="/events/${safeEventId}" style="
              flex: 1;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #FF5E3A 0%, #FF3366 100%);
              color: white;
              text-align: center;
              padding: 7px 10px;
              border-radius: 9px;
              font-weight: 700;
              font-size: 11px;
              text-decoration: none;
              box-shadow: 0 2px 8px rgba(255,51,102,0.3);
            ">
              Details →
            </a>
          `
              : ""
          }
        </div>
      `;

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
              <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 56px; overflow-y: auto;">
                ${loc.attendees
                  .map((att) => {
                    const rawName = att.full_name || att.username || "User";
                    const safeName = escapeHtml(rawName);
                    const safeInitial = escapeHtml((rawName[0] || "U").toUpperCase());
                    const profileLink = att.username
                      ? `/profile/${encodeURIComponent(att.username)}`
                      : att.id
                      ? `/profile/${encodeURIComponent(att.id)}`
                      : "#";
                    const safeAvatarUrl = sanitizeImageUrl(att.avatar_url);
                    const avatarImg = safeAvatarUrl
                      ? `<img src="${safeAvatarUrl}" style="width: 15px; height: 15px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981;" alt="${safeName}" />`
                      : `<div style="width: 15px; height: 15px; border-radius: 50%; background: ${
                          isDark ? "#334155" : "#e2e8f0"
                        }; color: ${
                          isDark ? "#e2e8f0" : "#334155"
                        }; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1.5px solid #10b981;">${safeInitial}</div>`;
                    return `
                      <a href="${profileLink}" title="Visit ${safeName}'s profile" style="display: inline-flex; align-items: center; gap: 4px; background: ${attendeeBg}; padding: 1.5px 6px; border-radius: 9999px; border: 1px solid ${attendeeBorder}; text-decoration: none; color: ${attendeeText}; font-size: 10px; font-weight: 600;">
                        ${avatarImg}
                        <span style="max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeName}</span>
                      </a>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }

        attendeesHtml = `
          <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid ${dividerColor};">
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
        const rawHostName =
          loc.host.display_name ||
          loc.host.full_name ||
          loc.host.username ||
          "Event Host";
        const safeHostName = escapeHtml(rawHostName);
        const safeHostInitial = escapeHtml((rawHostName[0] || "H").toUpperCase());
        const hLink = loc.host.username
          ? `/profile/${encodeURIComponent(loc.host.username)}`
          : loc.host.id
          ? `/profile/${encodeURIComponent(loc.host.id)}`
          : "#";
        const safeHostAvatarUrl = sanitizeImageUrl(loc.host.avatar_url);
        const hAvatar = safeHostAvatarUrl
          ? `<img src="${safeHostAvatarUrl}" style="width: 15px; height: 15px; border-radius: 50%; object-fit: cover; border: 1px solid #10b981;" alt="${safeHostName}" />`
          : `<div style="width: 15px; height: 15px; border-radius: 50%; background: ${
              isDark ? "#334155" : "#e2e8f0"
            }; color: ${
              isDark ? "#e2e8f0" : "#334155"
            }; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1px solid #10b981;">${safeHostInitial}</div>`;
        hostHtml = `
          <div style="margin: 4px 0; display: flex; align-items: center; gap: 5px; font-size: 11px;">
            <span style="font-size: 10px; color: ${mutedColor}; font-weight: 600;">Host:</span>
            <a href="${hLink}" style="display: inline-flex; align-items: center; gap: 4px; text-decoration: none; color: ${headerColor}; font-weight: 700; background: ${attendeeBg}; border: 1px solid ${attendeeBorder}; padding: 1.5px 7px; border-radius: 9999px;">
              ${hAvatar}
              <span style="max-width: 115px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeHostName}</span>
            </a>
          </div>
        `;
      }

      return `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 215px; max-width: 260px;">
          ${coverImageHtml}
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-bottom: 4px; padding-right: 14px;">
            <div style="display: flex; align-items: center; gap: 5px; min-width: 0;">
              <span style="font-size: 16px; line-height: 1; flex-shrink: 0;">${emoji}</span>
              <h4 style="margin: 0; font-weight: 800; color: ${headerColor}; font-size: 13.5px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeLocName}</h4>
            </div>
            ${
              safeLocCategory
                ? `<span style="font-size: 9.5px; background: ${categoryBg}; color: ${categoryText}; padding: 2px 6px; border-radius: 9999px; font-weight: 700; flex-shrink: 0;">${safeLocCategory}</span>`
                : ""
            }
          </div>
          ${
            safeLocVenue
              ? `<p style="margin: 2px 0; font-size: 11px; color: ${mutedColor}; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span>📍</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${safeLocVenue}</span></p>`
              : ""
          }
          ${
            safeEventDate
              ? `<p style="margin: 2px 0; font-size: 11px; color: ${headerColor}; font-weight: 600; display: flex; align-items: center; gap: 4px;"><span>📅</span><span>${safeEventDate}${
                  safeEventTime ? ` • ${safeEventTime}` : ""
                }</span></p>`
              : ""
          }
          ${hostHtml}
          ${
            safeLocDesc && safeLocDesc !== safeLocVenue
              ? `<p style="margin: 3px 0 2px 0; font-size: 11px; color: ${mutedColor}; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${safeLocDesc}</p>`
              : ""
          }
          ${attendeesHtml}
          ${actionButtonsHtml}
        </div>
      `;
    },
    [isDark]
  );

  // Draw Google Maps-style route line on the map
  const drawRouteOnMap = useCallback(
    async (
      startLat: number,
      startLng: number,
      destLoc: MapLocation,
      usingFallbackStart = false
    ) => {
      const map = mapInstanceRef.current;
      const routeLayer = routeLayerRef.current;
      const userLayer = userLocationLayerRef.current;
      if (!map || !routeLayer) return;

      setIsRouting(true);
      try {
        const result = await fetchRoadRoute(
          startLat,
          startLng,
          destLoc.lat,
          destLoc.lng
        );

        routeLayer.clearLayers();
        if (userLayer) {
          userLayer.clearLayers();
        }

        // 1. Outer Casing Line (Google Maps deep royal blue border)
        const outerPolyline = L.polyline(result.coordinates, {
          color: "#1e3a8a",
          weight: 9,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        });

        // 2. Main Inner Route Line (Google Maps vibrant blue)
        const innerPolyline = L.polyline(result.coordinates, {
          color: "#3b82f6",
          weight: 5.5,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round",
        });

        // 3. Directional center highlight
        const centerHighlight = L.polyline(result.coordinates, {
          color: "#bfdbfe",
          weight: 2,
          opacity: 0.85,
          dashArray: "6, 12",
          lineCap: "round",
        });

        outerPolyline.addTo(routeLayer);
        innerPolyline.addTo(routeLayer);
        centerHighlight.addTo(routeLayer);

        // 4. Draggable User Start Marker ("You're here")
        const startMarker = L.marker([startLat, startLng], {
          icon: createYouAreHereIcon(usingFallbackStart),
          draggable: true,
          zIndexOffset: 1500,
        }).addTo(routeLayer);

        startMarker.bindTooltip("Drag to change your starting location", {
          direction: "top",
          offset: [0, -34],
        });

        startMarker.on("dragend", () => {
          const newPos = startMarker.getLatLng();
          setUserCoords({ lat: newPos.lat, lng: newPos.lng });
          drawRouteOnMap(newPos.lat, newPos.lng, destLoc, false);
        });

        setActiveRoute({
          targetLocation: destLoc,
          startLat,
          startLng,
          distanceKm: result.distanceKm,
          durationMinutes: result.durationMinutes,
          isRoadRoute: result.isRoadRoute,
          usingFallbackStart,
        });

        // Close any open popup so the full route line is unobstructed, then fit bounds
        map.closePopup();
        const bounds = outerPolyline.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, {
            paddingTopLeft: [36, 48],
            paddingBottomRight: [36, 72],
            maxZoom: 16,
            animate: true,
          });
        }
      } catch (err) {
        console.error("Failed to calculate route:", err);
        toast.error("Could not calculate route.");
      } finally {
        setIsRouting(false);
      }
    },
    [createYouAreHereIcon]
  );

  // Request user's GPS location and draw route to target destination
  const startDirectionsTo = useCallback(
    (destLoc: MapLocation) => {
      if (typeof window === "undefined") return;

      // If we already have user's live/adjusted coordinates, use them immediately and refine in background
      if (userCoords) {
        drawRouteOnMap(userCoords.lat, userCoords.lng, destLoc, false);
        return;
      }

      setIsRouting(true);

      if (!("geolocation" in navigator)) {
        drawRouteOnMap(
          SORSOGON_CENTER.lat,
          SORSOGON_CENTER.lng,
          destLoc,
          true
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setUserCoords({ lat: uLat, lng: uLng });
          drawRouteOnMap(uLat, uLng, destLoc, false);
        },
        () => {
          toast.info(
            "Using Sorsogon City Center as start point (drag the 'You're here' pin to adjust)."
          );
          drawRouteOnMap(
            SORSOGON_CENTER.lat,
            SORSOGON_CENTER.lng,
            destLoc,
            true
          );
        },
        {
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 30000,
        }
      );
    },
    [drawRouteOnMap, userCoords]
  );

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setActiveRoute(null);
    if (userCoords) {
      renderUserLocationPin(userCoords.lat, userCoords.lng, false);
    }
  }, [userCoords, renderUserLocationPin]);

  // Listen for custom DOM event dispatched from popup "Get Directions" button
  useEffect(() => {
    const handlePopupDirections = (e: Event) => {
      const customEv = e as CustomEvent<{ locationId: string }>;
      const locId = customEv.detail?.locationId;
      if (!locId) return;
      const target = locationsRef.current.find((l) => l.id === locId);
      if (target) {
        startDirectionsTo(target);
      }
    };

    window.addEventListener("mingle:map-directions", handlePopupDirections);
    return () => {
      window.removeEventListener("mingle:map-directions", handlePopupDirections);
    };
  }, [startDirectionsTo]);

  // Trigger directions if requested via props (e.g. from EventLocationMapCard or ExploreClient)
  useEffect(() => {
    if (!directionsTargetId || directionsRequestKey === 0) return;
    const target = locationsRef.current.find((l) => l.id === directionsTargetId);
    if (target) {
      startDirectionsTo(target);
    }
  }, [directionsTargetId, directionsRequestKey, startDirectionsTo]);

  // Global listener: allows any component to trigger opening a map marker popup
  useEffect(() => {
    const handleOpenMapLocation = (e: Event) => {
      const customEv = e as CustomEvent<{ locationId: string }>;
      const locId = customEv.detail?.locationId;
      if (!locId) return;
      const marker = markersMapRef.current.get(locId);
      if (marker) {
        openMarkerWithPopup(marker, true);
      }
    };

    window.addEventListener("mingle:open-map-location", handleOpenMapLocation);
    return () => {
      window.removeEventListener("mingle:open-map-location", handleOpenMapLocation);
    };
  }, [openMarkerWithPopup]);

  // Apply tile layers whenever mapStyle changes
  const applyTileLayers = useCallback((map: L.Map, style: MapStyleType) => {
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (labelsTileLayerRef.current) {
      map.removeLayer(labelsTileLayerRef.current);
      labelsTileLayerRef.current = null;
    }

    if (style === "satellite") {
      const satLayer = L.tileLayer(SATELLITE_TILE_URL, {
        maxZoom: 19,
      }).addTo(map);
      const labelsLayer = L.tileLayer(SATELLITE_LABELS_URL, {
        maxZoom: 19,
        opacity: 0.9,
      }).addTo(map);
      baseTileLayerRef.current = satLayer;
      labelsTileLayerRef.current = labelsLayer;
    } else if (style === "terrain") {
      const terrainLayer = L.tileLayer(TERRAIN_TILE_URL, {
        maxZoom: 19,
      }).addTo(map);
      baseTileLayerRef.current = terrainLayer;
    } else {
      const streetLayer = L.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        className: "leaflet-street-tile",
      }).addTo(map);
      baseTileLayerRef.current = streetLayer;
    }
  }, []);

  // Initialize Map Once + Auto-Detect User's "You're here" Pin
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

    applyTileLayers(map, mapStyle);

    const routeGroup = L.layerGroup().addTo(map);
    const layerGroup = L.layerGroup().addTo(map);
    const userGroup = L.layerGroup().addTo(map);
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = layerGroup;
    userLocationLayerRef.current = userGroup;
    mapInstanceRef.current = map;

    // Listen for popup open / close to maintain accurate bidirectional selection state
    map.on("popupclose", () => {
      if (popupCloseTimerRef.current) {
        clearTimeout(popupCloseTimerRef.current);
      }
      popupCloseTimerRef.current = setTimeout(() => {
        const container = mapContainerRef.current;
        const hasOpenPopup = container?.querySelector(".leaflet-popup");
        if (!hasOpenPopup) {
          onDeselectLocationRef.current?.();
        }
      }, 120);
    });

    map.on("popupopen", () => {
      if (popupCloseTimerRef.current) {
        clearTimeout(popupCloseTimerRef.current);
        popupCloseTimerRef.current = null;
      }
    });

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

    // Automatically place "You're here" pin if browser geolocation is available
    let watchId: number | null = null;
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          setUserCoords({ lat: uLat, lng: uLng });
        },
        () => {
          // Silent on initial load if user hasn't granted permission yet
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
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
      if (popupCloseTimerRef.current) {
        clearTimeout(popupCloseTimerRef.current);
      }
      if (watchId !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      routeLayerRef.current = null;
      userLocationLayerRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Switch tile layers when user clicks Satellite / Street icon
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    applyTileLayers(map, mapStyle);
  }, [mapStyle, applyTileLayers]);

  // Smoothly Fly / Pan when center or zoom changes from external props
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
  }, [center?.lat, center?.lng, zoom, selectedId, getPopupFriendlyCenter]);

  // Populate Markers when locations data, dark mode, or compact mode changes
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

        const isLiveEvent = Boolean(loc.isEvent || loc.eventId);
        const isSelected = selectedId === loc.id;
        const customIcon = createMarkerIcon(loc, isSelected);

        const zOffset = isSelected ? 1200 : isLiveEvent ? 500 - idx : 100 - idx;
        const marker = L.marker([displayLat, displayLng], {
          icon: customIcon,
          zIndexOffset: zOffset,
        });

        marker.bindPopup(buildPopupHtml(loc), {
          autoPan: true,
          autoPanPaddingTopLeft: L.point(16, 50),
          autoPanPaddingBottomRight: L.point(16, 25),
          maxWidth: 275,
          minWidth: 215,
          closeButton: true,
          className: "mingle-custom-popup",
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          openMarkerWithPopup(marker, true);
          onSelectLocation?.(loc);
        });

        markersMapRef.current.set(loc.id, marker);
        layer.addLayer(marker);
      }
    });

    // If an item was already selected, make sure its popup opens
    if (selectedId && markersMapRef.current.has(selectedId)) {
      const selectedMarker = markersMapRef.current.get(selectedId);
      if (selectedMarker) {
        openMarkerWithPopup(selectedMarker, true);
      }
    }
  }, [
    locations,
    isDark,
    compact,
    createMarkerIcon,
    buildPopupHtml,
    openMarkerWithPopup,
    onSelectLocation,
  ]);

  // Synchronize selected marker highlight & popup when selectedId or selectionKey changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset previous selected marker's icon and z-index if selection changed
    if (prevSelectedIdRef.current && prevSelectedIdRef.current !== selectedId) {
      const prevMarker = markersMapRef.current.get(prevSelectedIdRef.current);
      const prevLoc = locationsRef.current.find(
        (l) => l.id === prevSelectedIdRef.current
      );
      if (prevMarker && prevLoc) {
        prevMarker.setIcon(createMarkerIcon(prevLoc, false));
        const prevZOffset = Boolean(prevLoc.isEvent || prevLoc.eventId) ? 500 : 100;
        prevMarker.setZIndexOffset(prevZOffset);
      }
    }

    // Highlight current selected marker and open popup
    if (selectedId && markersMapRef.current.has(selectedId)) {
      const currMarker = markersMapRef.current.get(selectedId);
      const currLoc = locationsRef.current.find((l) => l.id === selectedId);
      if (currMarker && currLoc) {
        currMarker.setIcon(createMarkerIcon(currLoc, true));
        currMarker.setZIndexOffset(1200);
        openMarkerWithPopup(currMarker, true);
      }
    }

    prevSelectedIdRef.current = selectedId || null;
  }, [
    selectedId,
    selectionKey,
    activeRoute,
    createMarkerIcon,
    openMarkerWithPopup,
  ]);

  // Quick "My GPS Location" button on the map — pins "You're here" and centers
  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      const fallback = SORSOGON_CENTER;
      setUserCoords(fallback);
      renderUserLocationPin(fallback.lat, fallback.lng, true);
      mapInstanceRef.current?.flyTo([fallback.lat, fallback.lng], 15, {
        duration: 0.8,
      });
      return;
    }

    const toastId = toast.loading("Pinning your current location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });
        renderUserLocationPin(uLat, uLng, false);

        if (activeRoute) {
          drawRouteOnMap(uLat, uLng, activeRoute.targetLocation, false);
          toast.success("Updated 'You're here' pin & route!");
        } else if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([uLat, uLng], 15, { duration: 0.8 });
          toast.success("Pinned: You're here! 📍");
        }
      },
      () => {
        toast.dismiss(toastId);
        const fallback = userCoords || SORSOGON_CENTER;
        setUserCoords(fallback);
        renderUserLocationPin(fallback.lat, fallback.lng, true);
        mapInstanceRef.current?.flyTo([fallback.lat, fallback.lng], 14, {
          duration: 0.8,
        });
        toast.info(
          "Placed 'You're here' pin in Sorsogon (drag pin to your exact spot)."
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-border">
      {/* Clean Icon-Only Map View Switcher (Real-World Satellite Icon | Real-World Street Map Icon | Locate Me Pin) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1 p-1 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/20 shadow-xl">
        {/* Satellite View Icon Button */}
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          title="Satellite View"
          aria-label="Satellite View"
          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            mapStyle === "satellite"
              ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white shadow-md scale-105 ring-1 ring-white/40"
              : "text-white/75 hover:text-white hover:bg-white/15"
          }`}
        >
          {/* Real-world Orbital Satellite SVG Icon */}
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
          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            mapStyle === "street"
              ? "bg-gradient-to-br from-[#FF5E3A] to-[#FF3366] text-white shadow-md scale-105 ring-1 ring-white/40"
              : "text-white/75 hover:text-white hover:bg-white/15"
          }`}
        >
          {/* Real-world Folded Street Map SVG Icon */}
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

        {/* Pin "You're here" / My GPS Location Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          title="Pin where I'm located (You're here)"
          aria-label="Pin where I'm located"
          className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
            userCoords
              ? "bg-blue-600 text-white shadow-md ring-1 ring-white/40"
              : "text-sky-400 hover:text-white hover:bg-white/15"
          }`}
        >
          <LocateFixed className="h-4 w-4" />
        </button>
      </div>

      {/* Loading Route Indicator */}
      {isRouting && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/95 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Calculating best route...</span>
        </div>
      )}

      {/* Google Maps-Style Active Route HUD Overlay */}
      {activeRoute && (
        <div className="absolute bottom-2.5 left-2.5 right-2.5 z-[1000] bg-slate-950/90 backdrop-blur-md border border-blue-400/35 text-white px-3 py-2 rounded-2xl shadow-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                  {activeRoute.durationMinutes} min
                </span>
                <span className="text-xs font-bold text-white/90">
                  ({activeRoute.distanceKm} km)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/30 font-semibold">
                  {activeRoute.isRoadRoute ? "Fastest Route" : "Direct Line"}
                </span>
              </div>
              <p className="text-[11px] text-white/75 truncate">
                To <strong>{activeRoute.targetLocation.name}</strong> • Drag &ldquo;You&apos;re here&rdquo; pin to adjust
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${activeRoute.startLat},${activeRoute.startLng}&destination=${activeRoute.targetLocation.lat},${activeRoute.targetLocation.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition-colors shadow-2xs"
              title="Open turn-by-turn navigation in Google Maps"
            >
              <span>Google Maps</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <button
              type="button"
              onClick={clearRoute}
              className="h-7 w-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Clear route line"
              aria-label="Clear route line"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div ref={mapContainerRef} className="w-full h-full min-h-full z-0" />
    </div>
  );
}
