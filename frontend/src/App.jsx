import { useEffect, useMemo, useState } from "react";
import MapView from "./components/MapView";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

const VEHICLE_COLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];
const HEADER_HEIGHT = 64;
const GPS_POLL_MS = 4000;
const GPS_FRESHNESS_MS = 10000;
const TILE_OPTIONS = {
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

const APP_STYLES = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap");

:root {
  --bg: #ffffff;
  --panel: #f8f7f4;
  --text: #0f1b35;
  --border: #e5e7eb;
  --muted: #64748b;
  --navy: #0f1b35;
  --green: #22c55e;
  --radius: 12px;
  --shadow: 0 10px 26px rgba(15, 27, 53, 0.08);
}

* { box-sizing: border-box; }

html, body, #root {
  margin: 0;
  width: 100%;
  height: 100%;
}

body {
  font-family: "Outfit", sans-serif;
  background: var(--bg);
  color: var(--text);
}

.mono { font-family: "IBM Plex Mono", monospace; }

.app {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%);
}

.top-header {
  position: fixed;
  inset: 0 0 auto 0;
  height: 64px;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.brand {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--navy);
}

.header-center {
  display: flex;
  gap: 10px;
  align-items: center;
  color: var(--muted);
  font-size: 0.8rem;
}

.live-pill {
  border-radius: 999px;
  border: 1px solid #d1d5db;
  padding: 4px 10px;
  font-size: 0.72rem;
  color: #6b7280;
}

.live-pill.active {
  border-color: #86efac;
  color: #15803d;
  background: #ecfdf3;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
  70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.pill-btn {
  border: 0;
  border-radius: 999px;
  padding: 9px 14px;
  font-family: "Outfit", sans-serif;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.pill-btn:hover { transform: translateY(-1px); }
.pill-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.pill-btn.secondary { background: #eef2f7; color: var(--text); }
.pill-btn.primary { background: var(--navy); color: #fff; }
.pill-btn.danger { background: #fef2f2; color: #b91c1c; padding: 6px 10px; font-size: 0.72rem; }

.layout {
  display: flex;
  min-height: 100vh;
  padding-top: ${HEADER_HEIGHT}px;
}

.sidebar {
  width: 370px;
  min-width: 370px;
  max-width: 370px;
  border-right: 1px solid var(--border);
  padding: 12px;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  overflow-y: auto;
}

.sidebar::-webkit-scrollbar { width: 0; height: 0; }
.sidebar { scrollbar-width: none; }

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.tabs {
  display: flex;
  padding: 4px;
  gap: 6px;
}

.tab-btn {
  flex: 1;
  border: 0;
  border-radius: 999px;
  padding: 9px;
  background: transparent;
  color: var(--muted);
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.tab-btn.active {
  background: #fff;
  color: var(--text);
}

.panel {
  margin-top: 10px;
  padding: 12px;
}

.panel-title {
  margin: 0 0 10px;
  font-size: 0.95rem;
}

.grid {
  display: grid;
  gap: 8px;
}

.text-input,
.select-input {
  border: 1px solid #d9dde6;
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 0.8rem;
  background: #fff;
  color: var(--text);
}

.vehicle-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  display: grid;
  grid-template-columns: 4px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
}

.vehicle-stripe { border-radius: 999px; }

.vehicle-actions {
  grid-column: 2 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-content: start;
}
.vehicle-actions .pill-btn {
  min-width: 132px;
}

.gps-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.66rem;
  width: fit-content;
}

.gps-indicator.live {
  color: #15803d;
  background: #ecfdf3;
}

.gps-indicator.simulated {
  color: #6b7280;
  background: #f3f4f6;
}

.gps-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.gps-indicator.live .gps-dot {
  background: var(--green);
  animation: pulse 1.5s infinite;
}

.gps-indicator.simulated .gps-dot {
  background: #9ca3af;
}

.assignment-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.toggle-btn {
  border: 1px solid #d9dde6;
  border-radius: 999px;
  background: #fff;
  color: var(--muted);
  padding: 7px 10px;
  cursor: pointer;
  transition: all 200ms ease;
}

.toggle-btn.active {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
}

.stop-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.stop-row {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stop-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.stop-info {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}

.stop-info strong {
  font-size: 0.8rem;
}

.stop-info span {
  font-size: 0.72rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.analytics-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.72rem;
}

.analytics-table th,
.analytics-table td {
  text-align: left;
  border-bottom: 1px solid var(--border);
  padding: 8px 6px;
}

.color-badge {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  display: inline-block;
}

.status-pill {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.66rem;
}

.status-pill.idle { background: #f3f4f6; color: #6b7280; }
.status-pill.en-route { background: #ecfdf3; color: #15803d; }
.status-pill.completed { background: #eaf2ff; color: #1d4ed8; }

.map-wrap {
  flex: 1;
  min-width: 0;
  padding: 12px;
}

.map-panel {
  position: relative;
  height: calc(100vh - ${HEADER_HEIGHT + 24}px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.map-panel.theme-dark .leaflet-tile {
  filter: brightness(0.84) contrast(1.06);
}

.leaflet-map {
  width: 100%;
  height: 100%;
}

.tile-switcher {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 700;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px;
  display: flex;
  gap: 4px;
  box-shadow: var(--shadow);
}

.tile-btn {
  border: 0;
  background: transparent;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.72rem;
  color: var(--muted);
  cursor: pointer;
}

.tile-btn.active {
  background: var(--navy);
  color: #fff;
}

.geocode-wrap {
  position: relative;
  display: grid;
  gap: 6px;
}

.geocode-wrap label {
  font-size: 0.7rem;
  color: var(--muted);
}

.geocode-results {
  list-style: none;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  box-shadow: var(--shadow);
  max-height: 170px;
  overflow-y: auto;
}

.geocode-results button {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  font-size: 0.74rem;
}

.geocode-results button:hover {
  background: #f3f4f6;
}

.confirmed {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  border: 1px solid #bbf7d0;
  background: #ecfdf3;
  color: #15803d;
  padding: 4px 10px;
  font-size: 0.68rem;
  width: fit-content;
  max-width: 100%;
}

.confirmed span:last-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
}

.loading-geocode {
  position: absolute;
  right: 10px;
  top: 34px;
  transform: translateY(-50%);
  font-size: 0.72rem;
  color: var(--muted);
}

.vehicle-icon-wrapper,
.stop-icon-wrapper,
.origin-icon-wrapper {
  background: transparent;
  border: 0;
}

.vehicle-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 1.2rem;
  filter: drop-shadow(0 6px 8px rgba(15, 27, 53, 0.26));
}

.stop-icon {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 2px solid;
  background: #fff;
}

.stop-check {
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
  background: #fff;
}

.stop-pulse {
  animation: stopPulse 500ms ease;
}

@keyframes stopPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.35); }
  100% { transform: scale(1); }
}

.origin-icon {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 2px dashed;
  display: grid;
  place-items: center;
  font-size: 0.62rem;
  font-weight: 700;
  background: #fff;
}

.popup-grid {
  display: grid;
  gap: 4px;
  font-size: 0.74rem;
}

@media (max-width: 1100px) {
  .layout {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .map-panel {
    height: 66vh;
  }
}

@media (max-width: 760px) {
  .top-header {
    height: auto;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 12px;
  }

  .layout {
    padding-top: 88px;
  }

  .header-center {
    width: 100%;
  }
}
`;

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeGeocodeResult = (item) => ({
  placeName: item.display_name,
  lat: Number.parseFloat(item.lat),
  lng: Number.parseFloat(item.lon),
});

const calculateBearing = (from, to) => {
  if (!from || !to) return 0;
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLon = toRad(lng2 - lng1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const distanceDeg = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
};

const pointerIcon = (color = "#2563eb") =>
  L.divIcon({
    className: "custom-pointer",
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [14, 14],
  });

const stopIcon = (color, completed, pulse) =>
  L.divIcon({
    className: "stop-icon-wrapper",
    html: completed
      ? `<div class="stop-icon stop-check ${pulse ? "stop-pulse" : ""}" style="border-color:${color}; color:${color};">✓</div>`
      : `<div class="stop-icon" style="border-color:${color}; background:${color};"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const originIcon = (color) =>
  L.divIcon({
    className: "origin-icon-wrapper",
    html: `<div class="origin-icon" style="border-color:${color}; color:${color};">W</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

function FitMapBounds({ routeStates, fitToken }) {
  const map = useMap();

  useEffect(() => {
    if (!fitToken) return;

    const allCoords = Object.values(routeStates).flatMap(
      (state) => state.path || [],
    );
    if (allCoords.length === 0) return;
    if (allCoords.length === 1) {
      map.setView(allCoords[0], 12);
      return;
    }

    map.fitBounds(allCoords, { padding: [50, 50] });
  }, [fitToken, map, routeStates]);

  return null;
}

function GeocodeInput({
  id,
  label,
  placeholder,
  selectedLocation,
  onSelect,
  onClear,
}) {
  const [query, setQuery] = useState(selectedLocation?.placeName || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(selectedLocation?.placeName || "");
  }, [selectedLocation?.placeName]);

  useEffect(() => {
    const q = query.trim();

    if (!q || q.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${q} Delhi`)}&format=json&limit=5`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "User-Agent": "SmartRouteAI",
            },
          },
        );

        if (!response.ok) throw new Error("Geocode request failed");
        const data = await response.json();
        setResults(data.map(normalizeGeocodeResult));
      } catch (error) {
        if (error.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    setOpen(true);
    if (selectedLocation && value !== selectedLocation.placeName) {
      onClear();
    }
  };

  return (
    <div className="geocode-wrap">
      {label && <label htmlFor={id}>{label}</label>}
      <input
        id={id}
        className="text-input"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
      />

      {loading && <span className="loading-geocode mono">...</span>}

      {open && results.length > 0 && (
        <ul className="geocode-results">
          {results.map((result, idx) => (
            <li key={`${result.placeName}-${idx}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery(result.placeName);
                  setResults([]);
                  setOpen(false);
                }}
              >
                {result.placeName}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedLocation && (
        <div className="confirmed mono">
          <span>✓</span>
          <span>{selectedLocation.placeName}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("fleet");
  const [assignMode, setAssignMode] = useState("auto");
  const [tileTheme, setTileTheme] = useState("light");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSimulationStarted, setIsSimulationStarted] = useState(false);
  const [fitToken, setFitToken] = useState(0);
  const [gpsLocations, setGpsLocations] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [riskZones, setRiskZones] = useState([]);
  const [isRerouting, setIsRerouting] = useState(false);
const [allRouteCoords, setAllRouteCoords] = useState([]);
const [routeHoverInfo, setRouteHoverInfo] = useState(null);
  const [vehicles, setVehicles] = useState([
    {
      id: createId(),
      vehicleNumber: "DL-1234",
      driverName: "Asha",
      startLocation: {
        placeName: "Connaught Place, New Delhi, Delhi, India",
        lat: 28.6315,
        lng: 77.2167,
      },
      copiedUntil: 0,
    },
    {
      id: createId(),
      vehicleNumber: "DL-5678",
      driverName: "Ravi",
      startLocation: {
        placeName: "Dwarka, New Delhi, Delhi, India",
        lat: 28.5921,
        lng: 77.046,
      },
      copiedUntil: 0,
    },
  ]);

  const [stops, setStops] = useState([
    {
      id: createId(),
      name: "Stop A",
      location: {
        placeName: "Saket Metro Station, New Delhi, Delhi, India",
        lat: 28.5245,
        lng: 77.2066,
      },
      assignedVehicleId: "",
    },
    {
      id: createId(),
      name: "Stop B",
      location: {
        placeName: "Karol Bagh, New Delhi, Delhi, India",
        lat: 28.6519,
        lng: 77.1909,
      },
      assignedVehicleId: "",
    },
  ]);

  const [newStop, setNewStop] = useState({
    name: "",
    location: null,
    assignedVehicleId: "",
  });
  const [routeStates, setRouteStates] = useState({});

  const vehicleColorMap = useMemo(
    () =>
      Object.fromEntries(
        vehicles.map((v, idx) => [v.id, VEHICLE_COLORS[idx] || "#94a3b8"]),
      ),
    [vehicles],
  );

  const assignedStopsByVehicle = useMemo(() => {
    const grouped = Object.fromEntries(
      vehicles.map((vehicle) => [vehicle.id, []]),
    );
    if (vehicles.length === 0) return grouped;

    if (assignMode === "auto") {
      stops.forEach((stop, idx) => {
        const vehicle = vehicles[idx % vehicles.length];
        grouped[vehicle.id].push(stop);
      });
      return grouped;
    }

    stops.forEach((stop, idx) => {
      const fallbackId = vehicles[idx % vehicles.length]?.id;
      const selectedId = grouped[stop.assignedVehicleId]
        ? stop.assignedVehicleId
        : fallbackId;
      if (selectedId) grouped[selectedId].push(stop);
    });

    return grouped;
  }, [assignMode, stops, vehicles]);

  const isGpsLive = (vehicleId) => {
    const latest = gpsLocations[vehicleId];
    if (!latest) return false;
    return Date.now() - latest.timestamp <= GPS_FRESHNESS_MS;
  };

  const vehicleDisplayStates = useMemo(() => {
    return vehicles.map((vehicle) => {
      const state = routeStates[vehicle.id];
      const totalStops = assignedStopsByVehicle[vehicle.id]?.length || 0;
      const completedStops = state?.completedStopIds?.length || 0;

      let status = "Idle";
      if (isSimulationStarted && !state?.isCompleted && state?.path?.length > 1)
        status = "En Route";
      if (state?.isCompleted && totalStops > 0) status = "Completed";

      return {
        ...vehicle,
        color: vehicleColorMap[vehicle.id],
        status,
        totalStops,
        completedStops,
        gpsLive: isGpsLive(vehicle.id),
      };
    });
  }, [
    assignedStopsByVehicle,
    gpsLocations,
    isSimulationStarted,
    routeStates,
    vehicleColorMap,
    vehicles,
  ]);

  const activeVehicleCount = vehicleDisplayStates.filter(
    (v) => v.status === "En Route",
  ).length;

  const addVehicle = () => {
    if (vehicles.length >= 4) return;
    setVehicles((prev) => [
      ...prev,
      {
        id: createId(),
        vehicleNumber: "",
        driverName: "",
        startLocation: null,
        copiedUntil: 0,
      },
    ]);
  };

  const updateVehicle = (vehicleId, key, value) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === vehicleId ? { ...vehicle, [key]: value } : vehicle,
      ),
    );
  };

  const removeVehicle = (vehicleId) => {
    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    setRouteStates((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
    setStops((prev) =>
      prev.map((stop) =>
        stop.assignedVehicleId === vehicleId
          ? { ...stop, assignedVehicleId: "" }
          : stop,
      ),
    );
  };

  const copyTrackingLink = async (vehicleId) => {
    const link = `http://localhost:5001/driver/${vehicleId}`;
    try {
      await navigator.clipboard.writeText(link);
      const expires = Date.now() + 2000;
      setVehicles((prev) =>
        prev.map((vehicle) =>
          vehicle.id === vehicleId
            ? { ...vehicle, copiedUntil: expires }
            : vehicle,
        ),
      );
      setTimeout(() => {
        setVehicles((prev) =>
          prev.map((vehicle) =>
            vehicle.id === vehicleId ? { ...vehicle, copiedUntil: 0 } : vehicle,
          ),
        );
      }, 2000);
    } catch {
      // Clipboard permission errors are non-fatal for app flow.
    }
  };

  const addStop = () => {
    if (!newStop.name.trim() || !newStop.location) return;

    setStops((prev) => [
      ...prev,
      {
        id: createId(),
        name: newStop.name.trim(),
        location: newStop.location,
        assignedVehicleId: newStop.assignedVehicleId || vehicles[0]?.id || "",
      },
    ]);

    setNewStop({
      name: "",
      location: null,
      assignedVehicleId: newStop.assignedVehicleId,
    });
  };

  const removeStop = (stopId) => {
    setStops((prev) => prev.filter((stop) => stop.id !== stopId));
  };

  const fetchRoadGeometry = async (orderedStops) => {
    if (!orderedStops || orderedStops.length < 2) return [];
    const coords = orderedStops.map((s) => `${s.lng},${s.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("OSRM request failed");
    const data = await response.json();
    return (
      data.routes?.[0]?.geometry?.coordinates?.map((coord) => [
        coord[1],
        coord[0],
      ]) || []
    );
  };

  const optimizeAllRoutes = async () => {
    if (vehicles.length === 0) return;

    const nextStates = {};

    await Promise.all(
      vehicles.map(async (vehicle) => {
        const start = vehicle.startLocation;
        if (!start) {
          nextStates[vehicle.id] = {
            path: [],
            simIndex: 0,
            simPosition: null,
            heading: 0,
            completedStopIds: [],
            pulseUntil: {},
            orderedStopIds: [],
            isCompleted: true,
          };
          return;
        }

        const vehicleStops = assignedStopsByVehicle[vehicle.id] || [];
        const payload = [
          { name: `warehouse-${vehicle.id}`, x: start.lat, y: start.lng },
          ...vehicleStops.map((stop) => ({
            name: stop.id,
            x: stop.location.lat,
            y: stop.location.lng,
          })),
        ];

        if (payload.length < 2) {
          nextStates[vehicle.id] = {
            path: [[start.lat, start.lng]],
            simIndex: 0,
            simPosition: [start.lat, start.lng],
            heading: 0,
            completedStopIds: [],
            pulseUntil: {},
            orderedStopIds: [],
            isCompleted: true,
          };
          return;
        }

        const optimizeResponse = await fetch(
          "/optimize-route",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );

        if (!optimizeResponse.ok) throw new Error("Route optimization failed");

        const ordered = await optimizeResponse.json();
        const orderedStops = ordered.map((item) => ({
          id: item.name,
          lat: item.x,
          lng: item.y,
        }));

        const roadPath = await fetchRoadGeometry(orderedStops);
        const orderedStopIds = orderedStops.slice(1).map((stop) => stop.id);

        nextStates[vehicle.id] = {
          path: roadPath,
          simIndex: 0,
          simPosition: roadPath[0] || [start.lat, start.lng],
          heading:
            roadPath.length > 1
              ? calculateBearing(roadPath[0], roadPath[1])
              : 0,
          completedStopIds: [],
          pulseUntil: {},
          orderedStopIds,
          isCompleted: roadPath.length <= 1,
        };
      }),
    );

    setRouteStates(nextStates);
    setIsSimulationStarted(true);
    setIsPlaying(true);
    setFitToken((prev) => prev + 1);
  };

  const analyzeOptimizedRoutes = () => {
    // Build one routeCoords entry per vehicle using their optimized road path.
    // src = first point of their path (start location)
    // dest = last point of their path (final stop)
    const perVehicle = vehicles
      .map((vehicle) => {
        const state = routeStates[vehicle.id];
        if (!state?.path || state.path.length < 2) return null;
        return {
          vehicleId: vehicle.id,
          vehicleNumber: vehicle.vehicleNumber || vehicle.id,
          src: state.path[0],
          dest: state.path[state.path.length - 1],
        };
      })
      .filter(Boolean);

    setAllRouteCoords(perVehicle);
  };

  useEffect(() => {
    if (!isPlaying) return undefined;

    const intervalId = setInterval(() => {
      setRouteStates((prev) => {
        const now = Date.now();
        const next = {};

        Object.entries(prev).forEach(([vehicleId, state]) => {
          if (!state.path || state.path.length <= 1 || state.isCompleted) {
            next[vehicleId] = state;
            return;
          }

          const lastIdx = state.path.length - 1;
          const nextIdx = Math.min(state.simIndex + 1, lastIdx);
          const currentPos = state.path[state.simIndex] || state.path[nextIdx];
          const nextPos = state.path[nextIdx];
          const heading = calculateBearing(currentPos, nextPos);

          const completed = [...state.completedStopIds];
          const pulseUntil = { ...state.pulseUntil };
          const effectivePosition = isGpsLive(vehicleId)
            ? [gpsLocations[vehicleId].lat, gpsLocations[vehicleId].lng]
            : nextPos;

          const stopsForVehicle = assignedStopsByVehicle[vehicleId] || [];
          stopsForVehicle.forEach((stop) => {
            if (!stop.location || completed.includes(stop.id)) return;
            const dist = distanceDeg(effectivePosition, [
              stop.location.lat,
              stop.location.lng,
            ]);
            if (dist <= 0.01) {
              completed.push(stop.id);
              pulseUntil[stop.id] = now + 700;
            }
          });

          next[vehicleId] = {
            ...state,
            simIndex: nextIdx,
            simPosition: nextPos,
            heading,
            completedStopIds: completed,
            pulseUntil,
            isCompleted: nextIdx >= lastIdx,
          };
        });

        return next;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [assignedStopsByVehicle, gpsLocations, isPlaying]);

  useEffect(() => {
    if (!isSimulationStarted) return undefined;

    const poll = async () => {
      try {
        const response = await fetch("/vehicle-locations");
        if (!response.ok) return;
        const data = await response.json();
        setGpsLocations(data || {});
      } catch {
        // Ignore temporary network errors.
      }
    };

    poll();
    const intervalId = setInterval(poll, GPS_POLL_MS);
    return () => clearInterval(intervalId);
  }, [isSimulationStarted]);

  useEffect(() => {
    if (!isPlaying) return;

    const allDone = Object.values(routeStates).every(
      (state) => state.isCompleted || !state.path?.length,
    );
    if (allDone && Object.keys(routeStates).length > 0) {
      setIsPlaying(false);
    }
  }, [isPlaying, routeStates]);

  const togglePlayPause = () => {
    if (!isSimulationStarted) return;
    setIsPlaying((prev) => !prev);
  };
  const simulateDisruption = () => {
    if (!isSimulationStarted) return;

    setIsRerouting(true);

    setAlerts((prev) => [
      ...prev,
      "🚨 Accident detected! Re-routing vehicles...",
    ]);

    setRouteStates((prev) => {
      const updated = {};

      Object.entries(prev).forEach(([vehicleId, state]) => {
        if (!state.path || state.path.length < 5) {
          updated[vehicleId] = state;
          return;
        }

        // current position
        const currentIndex = state.simIndex;
        const currentPos = state.path[currentIndex];

        const remainingPath = state.path.slice(currentIndex);

        // simple reroute: slightly shift path smoothly
        const newPath = remainingPath.map(([lat, lng], i) => [
          lat + 0.002 * i,
          lng + 0.002 * i,
        ]);

        updated[vehicleId] = {
          ...state,
          path: [currentPos, ...newPath], // new rerouted path
          simIndex: 0,
          simPosition: currentPos,
          heading: 0,
        };
      });

      return updated;
    });

    // stop rerouting indicator after 2 sec
    setTimeout(() => setIsRerouting(false), 2000);
  };
  const tileConfig = TILE_OPTIONS[tileTheme];

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="app">
        <header className="top-header">
          <div className="brand">SmartRoute AI</div>
          <div className="header-center mono">
            <span
              className={`live-pill ${isSimulationStarted ? "active" : ""}`}
            >
              Live
            </span>
            <span>{activeVehicleCount} active vehicles</span>
          </div>
          <div className="header-actions">
            <button
              className="pill-btn secondary"
              onClick={togglePlayPause}
              disabled={!isSimulationStarted}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button className="pill-btn primary" onClick={optimizeAllRoutes}>
              Optimize All Routes
            </button>
            <button className="pill-btn danger" onClick={simulateDisruption}>
              Simulate Disruption
            </button>
          </div>
        </header>

        <div className="layout">
          <aside className="sidebar">
            <div className="card tabs">
              {[
                { key: "fleet", label: "Fleet" },
                { key: "deliveries", label: "Deliveries" },
                { key: "analytics", label: "Analytics" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {activeTab === "fleet" && (
              <section className="card panel">
                <h3 className="panel-title">Fleet Setup</h3>
                <div className="grid">
                  {vehicleDisplayStates.map((vehicle, idx) => (
                    <article className="vehicle-card" key={vehicle.id}>
                      <span
                        className="vehicle-stripe"
                        style={{ background: vehicle.color }}
                      />

                      <div className="grid mono">
                        <input
                          className="text-input"
                          placeholder="Vehicle number"
                          value={vehicle.vehicleNumber}
                          onChange={(e) =>
                            updateVehicle(
                              vehicle.id,
                              "vehicleNumber",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          className="text-input"
                          placeholder="Driver name"
                          value={vehicle.driverName}
                          onChange={(e) =>
                            updateVehicle(
                              vehicle.id,
                              "driverName",
                              e.target.value,
                            )
                          }
                        />
                        <GeocodeInput
                          id={`start-${vehicle.id}`}
                          label="Start location"
                          placeholder="Search location"
                          selectedLocation={vehicle.startLocation}
                          onSelect={(location) =>
                            updateVehicle(vehicle.id, "startLocation", location)
                          }
                          onClear={() =>
                            updateVehicle(vehicle.id, "startLocation", null)
                          }
                        />

                        <span
                          className={`gps-indicator ${vehicle.gpsLive ? "live" : "simulated"}`}
                        >
                          <span className="gps-dot" />
                          <span>
                            {vehicle.gpsLive ? "Live GPS" : "Simulated"}
                          </span>
                        </span>
                      </div>

                      <div className="vehicle-actions">
                        <button
                          className="pill-btn secondary"
                          onClick={() => copyTrackingLink(vehicle.id)}
                        >
                          {vehicle.copiedUntil > Date.now()
                            ? "Copied!"
                            : "Copy Tracking Link"}
                        </button>
                        <button
                          className="pill-btn danger"
                          disabled={vehicles.length === 1}
                          onClick={() => removeVehicle(vehicle.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    className="pill-btn secondary"
                    onClick={addVehicle}
                    disabled={vehicles.length >= 4}
                  >
                    Add Vehicle ({vehicles.length}/4)
                  </button>
                  <button
                    className="pill-btn primary"
                    onClick={analyzeOptimizedRoutes}
                    disabled={!isSimulationStarted}
                    title={!isSimulationStarted ? "Run Optimize All Routes first" : "Analyze risk on optimized routes"}
                  >
                    🔍 Analyze Route Risk
                  </button>
                </div>
                {!isSimulationStarted && (
                  <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 8 }}>
                    Click "Optimize All Routes" first to enable route analysis.
                  </p>
                )}
              </section>
            )}

            {activeTab === "deliveries" && (
              <section className="card panel">
                <div className="assignment-toggle mono">
                  <button
                    className={`toggle-btn ${assignMode === "auto" ? "active" : ""}`}
                    onClick={() => setAssignMode("auto")}
                  >
                    Auto-assign
                  </button>
                  <button
                    className={`toggle-btn ${assignMode === "manual" ? "active" : ""}`}
                    onClick={() => setAssignMode("manual")}
                  >
                    Manual assign
                  </button>
                </div>

                <div className="grid mono">
                  <input
                    className="text-input"
                    placeholder="Stop name"
                    value={newStop.name}
                    onChange={(e) =>
                      setNewStop((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                  <GeocodeInput
                    id="stop-location"
                    label="Delivery location"
                    placeholder="Search location"
                    selectedLocation={newStop.location}
                    onSelect={(location) =>
                      setNewStop((prev) => ({ ...prev, location }))
                    }
                    onClear={() =>
                      setNewStop((prev) => ({ ...prev, location: null }))
                    }
                  />

                  {assignMode === "manual" && (
                    <select
                      className="select-input mono"
                      value={newStop.assignedVehicleId}
                      onChange={(e) =>
                        setNewStop((prev) => ({
                          ...prev,
                          assignedVehicleId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select vehicle</option>
                      {vehicles.map((vehicle, idx) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          V{idx + 1} - {vehicle.vehicleNumber || "Unnamed"}
                        </option>
                      ))}
                    </select>
                  )}

                  <button className="pill-btn primary" onClick={addStop}>
                    Add Stop
                  </button>
                </div>

                <ul className="stop-list">
                  {stops.map((stop, idx) => {
                    const ownerId =
                      assignMode === "auto"
                        ? vehicles[idx % Math.max(vehicles.length, 1)]?.id
                        : stop.assignedVehicleId || vehicles[0]?.id;
                    const color = ownerId
                      ? vehicleColorMap[ownerId]
                      : "#9ca3af";

                    return (
                      <li className="stop-row" key={stop.id}>
                        <span
                          className="stop-dot"
                          style={{ background: color }}
                        />
                        <div className="stop-info mono">
                          <strong>{stop.name}</strong>
                          <span>
                            {stop.location?.placeName ||
                              "Location not selected"}
                          </span>
                        </div>
                        {assignMode === "manual" && (
                          <select
                            className="select-input mono"
                            value={stop.assignedVehicleId || ""}
                            onChange={(e) =>
                              setStops((prev) =>
                                prev.map((item) =>
                                  item.id === stop.id
                                    ? {
                                        ...item,
                                        assignedVehicleId: e.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            {vehicles.map((vehicle, vIdx) => (
                              <option key={vehicle.id} value={vehicle.id}>
                                V{vIdx + 1}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          className="pill-btn danger"
                          onClick={() => removeStop(stop.id)}
                        >
                          Remove
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {activeTab === "analytics" && (
              <section className="card panel">
                <table className="analytics-table mono">
                  <thead>
                    <tr>
                      <th>Color</th>
                      <th>Vehicle</th>
                      <th>Driver</th>
                      <th>Progress</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicleDisplayStates.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td>
                          <span
                            className="color-badge"
                            style={{ background: vehicle.color }}
                          />
                        </td>
                        <td>{vehicle.vehicleNumber || "-"}</td>
                        <td>{vehicle.driverName || "-"}</td>
                        <td>
                          {vehicle.completedStops}/{vehicle.totalStops}
                        </td>
                        <td>
                          <span
                            className={`status-pill ${vehicle.status.toLowerCase().replace(" ", "-")}`}
                          >
                            {vehicle.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </aside>

          <main className="map-wrap">
            <div
              className={`map-panel ${tileTheme === "dark" ? "theme-dark" : ""}`}
            >
              <div
                style={{
                  position: "absolute",
                  top: 80,
                  right: 20,
                  zIndex: 2000,
                  width: "250px",
                }}
              >
                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      padding: "10px",
                      marginBottom: "8px",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                    }}
                  >
                    {alert}
                  </div>
                ))}
              </div>
              <div className="tile-switcher mono">
                {Object.entries(TILE_OPTIONS).map(([key, option]) => (
                  <button
                    key={key}
                    className={`tile-btn ${tileTheme === key ? "active" : ""}`}
                    onClick={() => setTileTheme(key)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
              {routeHoverInfo && (
                <div style={{
                  position: "absolute",
                  top: 56,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#fff",
                  padding: "12px 16px",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                  borderRadius: 10,
                  zIndex: 1000,
                  width: 270,
                  fontSize: "0.8rem",
                  pointerEvents: "none",
                  borderLeft: `4px solid ${routeHoverInfo.vehicleColor || "#0f1b35"}`,
                }}>
                  {routeHoverInfo.vehicleNumber && (
                    <p style={{ fontWeight: 700, marginBottom: 4, color: routeHoverInfo.vehicleColor || "#0f1b35" }}>
                      🚗 {routeHoverInfo.vehicleNumber}
                    </p>
                  )}
                  <p style={{ fontWeight: 700, marginBottom: 6 }}>
                    {routeHoverInfo.color === "red" && "🔴 High Risk"}
                    {routeHoverInfo.color === "#eab308" && "🟡 Medium Risk"}
                    {routeHoverInfo.color === "green" && "🟢 Low Risk"}
                  </p>
                  <p>🌡️ Temp: {routeHoverInfo.weather?.temp !== undefined ? `${routeHoverInfo.weather.temp}°C` : "Unavailable"}</p>
                  <ul style={{ paddingLeft: 16, margin: "4px 0" }}>
                    {routeHoverInfo.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  <p style={{ fontWeight: 600, marginTop: 6 }}>
                    {routeHoverInfo.color === "red" && "❌ Avoid this route"}
                    {routeHoverInfo.color === "#eab308" && "⚠️ Moderate delay possible"}
                    {routeHoverInfo.color === "green" && "✅ Safe to travel"}
                  </p>
                </div>
              )}
              <MapContainer
                className="leaflet-map"
                center={[28.6139, 77.209]}
                zoom={12}
                preferCanvas
              >
                <TileLayer
                  url={tileConfig.url}
                  attribution={tileConfig.attribution}
                />

                <FitMapBounds routeStates={routeStates} fitToken={fitToken} />

                {/* Route planner overlay — must live inside MapContainer */}
                {/* Per-vehicle risk overlays — one MapView per vehicle, each on their optimized path */}
                {allRouteCoords.map((entry) => (
                  <MapView
                    key={`analysis-${entry.vehicleId}`}
                    routeCoords={entry}
                    vehicleColor={vehicleColorMap[entry.vehicleId]}
                    vehicleNumber={entry.vehicleNumber}
                    onHoverChange={setRouteHoverInfo}
                  />
                ))}

                {vehicles.map((vehicle, idx) => {
                  if (!vehicle.startLocation) return null;
                  const color = VEHICLE_COLORS[idx] || "#94a3b8";
                  return (
                    <Marker
                      key={`origin-${vehicle.id}`}
                      position={[
                        vehicle.startLocation.lat,
                        vehicle.startLocation.lng,
                      ]}
                      icon={originIcon(color)}
                    >
                      <Popup>
                        <strong>Warehouse</strong>
                        <div>{vehicle.vehicleNumber || "Vehicle"}</div>
                      </Popup>
                    </Marker>
                  );
                })}

                {vehicles.map((vehicle) => {
                  const color = vehicleColorMap[vehicle.id];
                  const state = routeStates[vehicle.id];
                  const vehicleStops = assignedStopsByVehicle[vehicle.id] || [];

                  return vehicleStops.map((stop) => {
                    const completed = state?.completedStopIds?.includes(
                      stop.id,
                    );
                    const pulse =
                      completed &&
                      Date.now() < (state?.pulseUntil?.[stop.id] || 0);
                    if (!stop.location) return null;

                    return (
                      <Marker
                        key={`stop-${vehicle.id}-${stop.id}`}
                        position={[stop.location.lat, stop.location.lng]}
                        icon={stopIcon(color, completed, pulse)}
                      >
                        <Popup>{stop.name}</Popup>
                      </Marker>
                    );
                  });
                })}

                {vehicles.map((vehicle) => {
                  const state = routeStates[vehicle.id];
                  if (!state?.path?.length) return null;

                  const color = vehicleColorMap[vehicle.id];
                  const traveled = state.path.slice(0, state.simIndex + 1);
                  const remaining = state.path.slice(state.simIndex);

                  return (
                    <div key={`path-${vehicle.id}`}>
                      {traveled.length > 1 && (
                        <Polyline
                          positions={traveled}
                          pathOptions={{
                            color,
                            weight: 6,
                            opacity: 0.25,
                            lineCap: "round",
                          }}
                        />
                      )}
                      {remaining.length > 1 && (
                        <Polyline
                          positions={remaining}
                          pathOptions={{
                            color,
                            weight: 6,
                            opacity: 1,
                            lineCap: "round",
                          }}
                        />
                      )}
                    </div>
                  );
                })}

                {vehicles.map((vehicle) => {
                  const state = routeStates[vehicle.id];
                  if (!state) return null;

                  const gpsLive = isGpsLive(vehicle.id);
                  const displayPos = gpsLive
                    ? [
                        gpsLocations[vehicle.id].lat,
                        gpsLocations[vehicle.id].lng,
                      ]
                    : state.simPosition;

                  if (!displayPos) return null;

                  const nextStopId = state.orderedStopIds?.find(
                    (id) => !state.completedStopIds.includes(id),
                  );
                  const nextStop = (
                    assignedStopsByVehicle[vehicle.id] || []
                  ).find((stop) => stop.id === nextStopId);

                  return (
                    <Marker
                      key={`vehicle-${vehicle.id}`}
                      position={displayPos}
                      icon={pointerIcon("#2563eb")}
                    >
                      <Popup>
                        <div className="popup-grid mono">
                          <strong>{vehicle.vehicleNumber || "Vehicle"}</strong>
                          <span>
                            Driver: {vehicle.driverName || "Unassigned"}
                          </span>
                          <span>
                            Coordinates: {displayPos[0].toFixed(5)},{" "}
                            {displayPos[1].toFixed(5)}
                          </span>
                          <span>Next stop: {nextStop?.name || "None"}</span>
                          <span>
                            Completed: {state.completedStopIds.length}/
                            {(assignedStopsByVehicle[vehicle.id] || []).length}
                          </span>
                          <span>GPS: {gpsLive ? "Live" : "Simulated"}</span>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
