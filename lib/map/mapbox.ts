export const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export const DEFAULT_CENTER = {
  lng: 124.0044, // Sorsogon coordinates
  lat: 12.9743
};

export const DEFAULT_ZOOM = 12;

export function getMapboxStyleUrl(theme: "light" | "dark") {
  return theme === "dark" 
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}
