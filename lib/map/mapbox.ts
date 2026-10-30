export const SORSOGON_CENTER = {
  lat: 12.9743,
  lng: 124.0044,
};

export const DEFAULT_ZOOM = 12;

export type MapStyleType = "satellite" | "street" | "terrain";

export const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// High-Resolution Satellite Imagery + Hybrid Road/Place Labels
export const SATELLITE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const SATELLITE_LABELS_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const TERRAIN_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}";

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMinutes: number;
  isRoadRoute: boolean;
}

/**
 * Fetches accurate road driving route geometry, distance, and duration via OSRM,
 * with a Haversine straight-line fallback if offline.
 */
export async function fetchRoadRoute(
  startLat: number,
  startLng: number,
  destLat: number,
  destLng: number
): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route && route.geometry?.coordinates?.length > 0) {
        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        const distanceKm = Math.max(0.1, Number((route.distance / 1000).toFixed(1)));
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));
        return {
          coordinates: coords,
          distanceKm,
          durationMinutes,
          isRoadRoute: true,
        };
      }
    }
  } catch (err) {
    console.warn("OSRM route fetch fallback:", err);
  }

  // Fallback Haversine calculation
  const R = 6371;
  const dLat = ((destLat - startLat) * Math.PI) / 180;
  const dLng = ((destLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = Math.max(0.1, Number((R * c * 1.25).toFixed(1)));
  const estMins = Math.max(1, Math.round((straightKm / 35) * 60));

  return {
    coordinates: [
      [startLat, startLng],
      [destLat, destLng],
    ],
    distanceKm: straightKm,
    durationMinutes: estMins,
    isRoadRoute: false,
  };
}

export const SORSOGON_FEATURED_LOCATIONS = [
  {
    id: "sorsogon-city-hall",
    name: "Sorsogon City Capitol & Park",
    category: "Government",
    lat: 12.9743,
    lng: 124.0044,
    description: "Heart of Sorsogon City",
  },
  {
    id: "sorsogon-sports-complex",
    name: "Sorsogon Sports Complex / Auditorium",
    category: "Sports",
    lat: 12.9715,
    lng: 124.0012,
    description: "Main sports stadium & arena in Sorsogon",
  },
  {
    id: "rompeolas-baywalk",
    name: "Rompeolas (Sorsogon Baywalk)",
    category: "Nature",
    lat: 12.9698,
    lng: 124.0068,
    description: "Scenic baywalk and sunset view spot",
  },
  {
    id: "gubat-surfing-beach",
    name: "Gubat Surfing Beach (Rizal Beach)",
    category: "Beach",
    lat: 12.9167,
    lng: 124.125,
    description: "Famous surfing spot in Gubat",
  },
  {
    id: "subic-beach-matnog",
    name: "Subic Beach, Matnog",
    category: "Beach",
    lat: 12.5858,
    lng: 124.0863,
    description: "Famous pink sand beach in Matnog",
  },
  {
    id: "bulusan-lake",
    name: "Bulusan Lake & National Park",
    category: "Nature",
    lat: 12.7528,
    lng: 124.095,
    description: "Serene crater lake at the foot of Mt. Bulusan",
  },
  {
    id: "donsol-whale-shark",
    name: "Donsol Whale Shark Interaction Center",
    category: "Adventure",
    lat: 12.9073,
    lng: 123.6033,
    description: "World-famous Butanding interaction site",
  },
  {
    id: "barcelona-ruins",
    name: "Barcelona Church & Ruins Plaza",
    category: "Culture",
    lat: 12.8681,
    lng: 124.1419,
    description: "Historic coral stone church and park",
  },
];

export const SORSOGON_LOCATION_PRESETS = [
  { name: "Sorsogon Sports Complex / Auditorium", lat: 12.9715, lng: 124.0012, category: "Sports" },
  { name: "Sorsogon Provincial Capitol & Park", lat: 12.9743, lng: 124.0044, category: "Government" },
  { name: "Rompeolas (Sorsogon Baywalk)", lat: 12.9698, lng: 124.0068, category: "Nature" },
  { name: "Gubat Surfing Beach (Rizal Beach)", lat: 12.9167, lng: 124.125, category: "Beach" },
  { name: "Donsol Whale Shark Center", lat: 12.9073, lng: 123.6033, category: "Adventure" },
  { name: "Bulusan Lake & National Park", lat: 12.7528, lng: 124.095, category: "Nature" },
  { name: "Barcelona Church & Ruins Plaza", lat: 12.8681, lng: 124.1419, category: "Culture" },
  { name: "Subic Pink Sand Beach, Matnog", lat: 12.5858, lng: 124.0863, category: "Beach" },
  { name: "Paguriran Island & Lagoon, Bacon", lat: 12.8942, lng: 123.9575, category: "Beach" },
  { name: "Irosin Mateo Hot & Cold Springs", lat: 12.7056, lng: 124.0319, category: "Nature" },
  { name: "Casiguran Bayfront & Park", lat: 12.8719, lng: 124.0083, category: "Nature" },
  { name: "Pilar Port & Town Plaza", lat: 12.9303, lng: 123.6761, category: "Town" },
  { name: "Juban Heritage Houses & Center", lat: 12.8469, lng: 123.9936, category: "Culture" },
  { name: "Bacon Boardwalk & Beach", lat: 13.0381, lng: 124.0397, category: "Beach" },
  { name: "Castilla Town Plaza", lat: 12.9542, lng: 123.8764, category: "Town" },
  { name: "Magallanes Port Plaza", lat: 12.8286, lng: 123.8344, category: "Town" },
  { name: "Sta. Magdalena Beach Park", lat: 12.6469, lng: 124.1083, category: "Beach" },
  { name: "Bulan Freedom Park", lat: 12.6706, lng: 123.8758, category: "Town" },
  { name: "Prieto Diaz Mangrove Eco-Park", lat: 13.0458, lng: 124.1917, category: "Nature" },
];
