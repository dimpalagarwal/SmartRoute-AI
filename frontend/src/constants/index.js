// ─── Vehicle & Map Constants ────────────────────────────────────────────────
export const VEHICLE_COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];
export const HEADER_HEIGHT = 64;
export const GPS_POLL_MS = 4000;
export const GPS_FRESHNESS_MS = 10000;
export const AVG_SPEED_KMH = 30;
export const MAX_VEHICLES = 4;

// ─── Map Tile Options ───────────────────────────────────────────────────────
export const TILE_OPTIONS = {
  light: {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  dark: {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  },
  satellite: {
    name: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};