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
import { MapLocation } from "./map-view";
import { Navigation, X, ExternalLink, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";

interface MapViewInnerProps {
  locations?: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedId?: string;
  onSelectLocation?: (loc: MapLocation) => void;
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
  onSelectLocation,
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const markersMapRef = useRef<Map<string, L.Marker>>(new Map());
  const locationsRef = useRef<MapLocation[]>(locations);

  useEffect(() => {
    locationsRef.current = locations;
  }, [locations]);

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
        const verticalShiftPx = Math.min(110, Math.round(containerHeight * 0.25));
        const point = map.project([lat, lng], targetZoom);
        const shiftedPoint = point.subtract([0, verticalShiftPx]);
        return map.unproject(shiftedPoint, targetZoom);
      } catch {
        return [lat, lng];
      }
    },
    []
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

        // 4. Draggable User Start Marker ("You")
        const userStartIcon = L.divIcon({
          className: "user-route-start-pin",
          html: `
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: #2563eb;
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 9999px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 11px;
              font-weight: 800;
              box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.35), 0 4px 12px rgba(0,0,0,0.35);
              border: 2px solid #ffffff;
              white-space: nowrap;
              transform: translate(-50%, -50%);
              cursor: grab;
            ">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #93c5fd; display: inline-block;"></span>
              <span>${usingFallbackStart ? "Start (Drag me)" : "You"}</span>
            </div>
          `,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const startMarker = L.marker([startLat, startLng], {
          icon: userStartIcon,
          draggable: true,
          zIndexOffset: 1200,
        }).addTo(routeLayer);

        startMarker.bindTooltip("Drag to change starting location", {
          direction: "top",
          offset: [0, -14],
        });

        startMarker.on("dragend", () => {
          const newPos = startMarker.getLatLng();
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
    []
  );

  // Request user's GPS location and draw route to target destination
  const startDirectionsTo = useCallback(
    (destLoc: MapLocation) => {
      if (typeof window === "undefined") return;

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
          drawRouteOnMap(uLat, uLng, destLoc, false);
        },
        () => {
          // Graceful fallback to Sorsogon City Center if GPS permission is denied or unavailable
          toast.info(
            "Using Sorsogon City Center as start point (drag the blue 'Start' pin to adjust)."
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
    [drawRouteOnMap]
  );

  const clearRoute = useCallback(() => {
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
    setActiveRoute(null);
  }, []);

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

    applyTileLayers(map, mapStyle);

    const routeGroup = L.layerGroup().addTo(map);
    const layerGroup = L.layerGroup().addTo(map);
    routeLayerRef.current = routeGroup;
    markersLayerRef.current = layerGroup;
    mapInstanceRef.current = map;

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
      routeLayerRef.current = null;
      markersMapRef.current.clear();
    };
  }, []);

  // Switch tile layers when user clicks Satellite / Street / Terrain
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    applyTileLayers(map, mapStyle);
  }, [mapStyle, applyTileLayers]);

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
  }, [center?.lat, center?.lng, zoom, selectedId, getPopupFriendlyCenter]);

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
              box-shadow: 0 4px 14px rgba(0, 0, 0, 0.38);
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

        // Action Buttons inside Popup: "Get Directions" + optional "View Event"
        const safeLocId = loc.id.replace(/'/g, "\\'");
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
              rawEventId && !isCurrentPage
                ? `
              <a href="/events/${rawEventId}" style="
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
                      const name = att.full_name || att.username || "User";
                      const profileLink = att.username
                        ? `/profile/${encodeURIComponent(att.username)}`
                        : att.id
                        ? `/profile/${att.id}`
                        : "#";
                      const avatarImg = att.avatar_url
                        ? `<img src="${att.avatar_url}" style="width: 15px; height: 15px; border-radius: 50%; object-fit: cover; border: 1.5px solid #10b981;" alt="${name}" />`
                        : `<div style="width: 15px; height: 15px; border-radius: 50%; background: ${
                            isDark ? "#334155" : "#e2e8f0"
                          }; color: ${
                            isDark ? "#e2e8f0" : "#334155"
                          }; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: bold; border: 1.5px solid #10b981;">${(
                            name[0] || "U"
                          ).toUpperCase()}</div>`;
                      return `
                        <a href="${profileLink}" title="Visit ${name}'s profile" style="display: inline-flex; align-items: center; gap: 4px; background: ${attendeeBg}; padding: 1.5px 6px; border-radius: 9999px; border: 1px solid ${attendeeBorder}; text-decoration: none; color: ${attendeeText}; font-size: 10px; font-weight: 600;">
                          ${avatarImg}
                          <span style="max-width: 72px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
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
          <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px; min-width: 205px; max-width: 250px;">
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
                ? `<p style="margin: 3px 0 2px 0; font-size: 11px; color: ${mutedColor}; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${loc.description}</p>`
                : ""
            }
            ${attendeesHtml}
            ${actionButtonsHtml}
          </div>
        `,
          {
            autoPan: true,
            autoPanPaddingTopLeft: L.point(16, 40),
            autoPanPaddingBottomRight: L.point(16, 20),
            maxWidth: 260,
            minWidth: 205,
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
  }, [locations, onSelectLocation, isDark, selectedId, compact, getPopupFriendlyCenter]);

  // Open popup if selectedId changes
  useEffect(() => {
    if (selectedId && markersMapRef.current.has(selectedId)) {
      const marker = markersMapRef.current.get(selectedId);
      const map = mapInstanceRef.current;
      if (marker && map && !activeRoute) {
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
  }, [selectedId, activeRoute, getPopupFriendlyCenter]);

  // Quick "My GPS Location" button on the map
  const handleLocateMe = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    const toastId = toast.loading("Locating your GPS position...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss(toastId);
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        if (activeRoute) {
          drawRouteOnMap(uLat, uLng, activeRoute.targetLocation, false);
          toast.success("Route updated from your live GPS location!");
        } else if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([uLat, uLng], 15, { duration: 0.8 });
          toast.success("Centered on your current location!");
        }
      },
      () => {
        toast.dismiss(toastId);
        toast.error("Please allow location access in your browser settings.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden shadow-sm border border-border">
      {/* Floating Map View Switcher (Satellite Default | Street | Terrain) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/15 shadow-lg text-white">
        <button
          type="button"
          onClick={() => setMapStyle("satellite")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            mapStyle === "satellite"
              ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
              : "text-white/75 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>🛰️</span>
          <span>Satellite</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("street")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            mapStyle === "street"
              ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
              : "text-white/75 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>🗺️</span>
          <span>Street</span>
        </button>
        <button
          type="button"
          onClick={() => setMapStyle("terrain")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
            mapStyle === "terrain"
              ? "bg-gradient-to-r from-[#FF5E3A] to-[#FF3366] text-white shadow-xs"
              : "text-white/75 hover:text-white hover:bg-white/10"
          }`}
        >
          <span>⛰️</span>
          <span className="hidden xs:inline">Terrain</span>
        </button>
        <button
          type="button"
          onClick={handleLocateMe}
          className="h-6 w-6 rounded-lg flex items-center justify-center text-sky-400 hover:bg-white/15 transition-colors cursor-pointer"
          title="My GPS Location"
          aria-label="My GPS Location"
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Loading Route Indicator */}
      {isRouting && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/95 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 backdrop-blur-md">
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
                To <strong>{activeRoute.targetLocation.name}</strong> • Drag blue pin to adjust start
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
