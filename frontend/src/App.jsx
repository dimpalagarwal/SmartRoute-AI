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

/* ── FIXED: vehicle-card uses flex so content stacks vertically ── */
.vehicle-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fff;
  display: flex;
  flex-direction: row;
  gap: 10px;
  padding: 10px;
}

.vehicle-stripe {
  border-radius: 999px;
  width: 4px;
  flex-shrink: 0;
  align-self: stretch;
}

/* ── NEW: wrapper so all content stacks in a column ── */
.vehicle-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vehicle-actions {
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
const [page, setPage] = useState("landing");
const [driverDisruptions, setDriverDisruptions] = useState({});
const [reroutingDrivers, setReroutingDrivers] = useState({});
const [rerouteResults, setRerouteResults] = useState({});
const [rerouteComparisons, setRerouteComparisons] = useState({}); // vehicleId -> [{routeIndex, distKm, durMin, riskLevel, riskReasons}]
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifs, setNotifs]             = useState([]); // {id,msg,type,ts,read}
  const [stopETAs, setStopETAs]         = useState({}); // vehicleId -> [{stopId,name,etaMs,distKm}]
  const [trafficAlertsFired, setTrafficAlertsFired] = useState(new Set()); // prevent duplicate alerts
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

    // ── Compute ETAs for every vehicle's stops ──────────────────────────────
    const now = Date.now();
    const newETAs = {};
    vehicles.forEach((vehicle) => {
      const state = nextStates[vehicle.id];
      if (!state?.path?.length || !state.orderedStopIds?.length) return;
      const vehicleStops = assignedStopsByVehicle[vehicle.id] || [];
      newETAs[vehicle.id] = calcStopETAs(vehicle.id, state.path, state.orderedStopIds, vehicleStops, now);
    });
    setStopETAs(newETAs);

    // ── Fire TomTom congestion check for each vehicle ───────────────────────
    setTrafficAlertsFired(new Set()); // reset so new route gets fresh alerts
    vehicles.forEach((vehicle) => {
      const state = nextStates[vehicle.id];
      const name = vehicle.driverName || vehicle.vehicleNumber || "Driver";
      if (state?.path?.length) {
        pollTomTomForRoute(vehicle.id, state.path, name);
      }
    });

    pushNotif(`✅ All routes optimized for ${vehicles.length} driver${vehicles.length > 1 ? "s" : ""}. ETAs calculated.`, "success");
  };

  const analyzeOptimizedRoutes = () => {
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

  // ─── Periodic TomTom congestion re-poll every 2 min while simulation runs ──
  useEffect(() => {
    if (!isSimulationStarted || !isPlaying) return undefined;
    const intervalId = setInterval(() => {
      vehicles.forEach((vehicle) => {
        const state = routeStates[vehicle.id];
        const name = vehicle.driverName || vehicle.vehicleNumber || "Driver";
        if (state?.path?.length && !state.isCompleted) {
          pollTomTomForRoute(vehicle.id, state.path, name);
        }
      });
    }, 120000); // 2 minutes
    return () => clearInterval(intervalId);
  }, [isSimulationStarted, isPlaying, vehicles, routeStates]);

  // ─── Close notification panel on outside click ─────────────────────────
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-notif-panel]")) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

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

  // ─── Notification helpers ────────────────────────────────────────────────
  const pushNotif = (msg, type = "info") => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifs(prev => [{ id, msg, type, ts: Date.now(), read: false }, ...prev].slice(0, 50));
    if (type !== "danger") setTimeout(() => setNotifs(prev => prev.map(n => n.id === id ? {...n, read: true} : n)), 15000);
    return id;
  };
  const markAllRead = () => setNotifs(prev => prev.map(n => ({...n, read: true})));
  const clearNotif  = (id) => setNotifs(prev => prev.filter(n => n.id !== id));
  const clearAllNotifs = () => setNotifs([]);

  // ─── ETA calculator ────────────────────────────────────────────────────
  const AVG_SPEED_KMH = 30;

  const calcStopETAs = (vehicleId, roadPath, orderedStopIds, vehicleStops, startMs) => {
    if (!roadPath || roadPath.length < 2) return [];
    let totalKm = 0;
    for (let i = 0; i < roadPath.length - 1; i++) {
      const [lat1, lng1] = roadPath[i];
      const [lat2, lng2] = roadPath[i + 1];
      const dLat = (lat2 - lat1) * 111.32;
      const dLng = (lng2 - lng1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
      totalKm += Math.sqrt(dLat * dLat + dLng * dLng);
    }
    const totalMins = (totalKm / AVG_SPEED_KMH) * 60;

    const results = [];
    const stopObjects = orderedStopIds
      .map(id => vehicleStops.find(s => s.id === id))
      .filter(s => s?.location);

    stopObjects.forEach((stop, idx) => {
      let minDist = Infinity, nearestIdx = 0;
      roadPath.forEach(([plat, plng], pi) => {
        const d = Math.hypot(plat - stop.location.lat, plng - stop.location.lng);
        if (d < minDist) { minDist = d; nearestIdx = pi; }
      });
      const fraction = nearestIdx / (roadPath.length - 1);
      const etaMins = Math.round(totalMins * fraction);
      const etaMs = startMs + etaMins * 60 * 1000;
      let cumKm = 0;
      for (let i = 0; i < nearestIdx && i < roadPath.length - 1; i++) {
        const [lat1, lng1] = roadPath[i];
        const [lat2, lng2] = roadPath[i + 1];
        const dLat = (lat2 - lat1) * 111.32;
        const dLng = (lng2 - lng1) * 111.32 * Math.cos(lat1 * Math.PI / 180);
        cumKm += Math.sqrt(dLat * dLat + dLng * dLng);
      }
      results.push({
        stopId: stop.id,
        name: stop.name,
        etaMs,
        etaMins,
        distKm: Math.round(cumKm * 10) / 10,
        order: idx + 1,
      });
    });
    return results;
  };

  // ─── TomTom congestion poller ───────────────────────────────────────────
  const pollTomTomForRoute = async (vehicleId, roadPath, driverName) => {
    if (!roadPath || roadPath.length < 2) return;
    try {
      const res = await fetch("/route-traffic-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: roadPath, vehicleId, driverName }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.available || data.level === "clear") return;

      const roundedRatio = Math.round((data.avgDelayRatio || 1) * 10);
      const key = `${vehicleId}-tomtom-${roundedRatio}`;

      setTrafficAlertsFired(prev => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);

        if (data.level === "severe") {
          pushNotif(`🔴 [${driverName}] ${data.message}`, "danger");
        } else if (data.level === "moderate") {
          pushNotif(`🟡 [${driverName}] ${data.message}`, "warning");
        } else if (data.level === "light") {
          pushNotif(`🟠 [${driverName}] ${data.message}`, "warning");
        }
        return next;
      });
    } catch { /* network errors are silent */ }
  };

  const simulateDisruptionForDriver = async (vehicleId) => {
    if (!isSimulationStarted) return;
    const state = routeStates[vehicleId];
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const name = vehicle?.driverName || vehicle?.vehicleNumber || "Driver";

    try {
      const response = await fetch("/simulate-disruption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          currentPath: state?.path || [],
          simIndex: state?.simIndex || 0,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error("Disruption failed");

      const disruption = data.disruption;

      setDriverDisruptions((prev) => ({ ...prev, [vehicleId]: disruption }));
      setRerouteResults((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });
      setRerouteComparisons((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });

      pushNotif(`${disruption.icon} [${name}] ${disruption.label} on ${disruption.streetName} — click Re-Route!`, "danger");
    } catch (err) {
      console.error("Simulate disruption error:", err);
      const fallbackDisruption = { type: "accident", icon: "💥", label: "Accident", streetName: "route ahead" };
      setDriverDisruptions((prev) => ({ ...prev, [vehicleId]: fallbackDisruption }));
      pushNotif(`💥 [${name}] Accident on route ahead — click Re-Route!`, "danger");
    }
  };

  const rerouteDriver = async (vehicleId) => {
    if (!isSimulationStarted) return;
    const state = routeStates[vehicleId];
    if (!state?.path?.length) return;

    const disruption = driverDisruptions[vehicleId];
    setReroutingDrivers((prev) => ({ ...prev, [vehicleId]: true }));
    setRerouteComparisons((prev) => ({ ...prev, [vehicleId]: null }));

    try {
      const currentIndex = state.simIndex || 0;
      const currentPos = state.path[currentIndex] || state.path[0];

      const vehicleStops = assignedStopsByVehicle[vehicleId] || [];
      const remainingStops = vehicleStops
        .filter((stop) => !state.completedStopIds?.includes(stop.id) && stop.location)
        .map((stop) => ({ id: stop.id, lat: stop.location.lat, lng: stop.location.lng }));

      if (remainingStops.length === 0) {
        setDriverDisruptions((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });
        setReroutingDrivers((prev) => ({ ...prev, [vehicleId]: false }));
        return;
      }

      const response = await fetch("/smart-reroute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPosition: { lat: currentPos[0], lng: currentPos[1] },
          remainingStops,
          disruption: disruption
            ? { type: disruption.type, streetName: disruption.streetName }
            : null,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      if (!data.success || !data.chosen) throw new Error(data.error || "No route returned");

      const { chosen, candidates } = data;

      setRerouteComparisons((prev) => ({ ...prev, [vehicleId]: candidates }));

      setRouteStates((prev) => ({
        ...prev,
        [vehicleId]: {
          ...prev[vehicleId],
          path: chosen.path,
          simIndex: 0,
          simPosition: chosen.path[0],
          heading: chosen.path.length > 1 ? calculateBearing(chosen.path[0], chosen.path[1]) : 0,
          isCompleted: false,
        },
      }));

      setRerouteResults((prev) => ({
        ...prev,
        [vehicleId]: {
          distance: chosen.distKm,
          duration: chosen.durMin,
          riskLevel: chosen.riskLevel,
          riskReasons: chosen.riskReasons,
          totalCandidates: candidates.length,
        },
      }));

      setDriverDisruptions((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });

      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const name = vehicle?.driverName || vehicle?.vehicleNumber || "Driver";
      const riskEmoji = chosen.riskLevel === "Low" ? "🟢" : chosen.riskLevel === "Medium" ? "🟡" : "🔴";

      pushNotif(`✅ [${name}] Safest route: ${chosen.distKm}km ~${chosen.durMin}min ${riskEmoji} ${chosen.riskLevel} Risk (${candidates.length} routes analyzed)`, "success");

      setAllRouteCoords((prev) => {
        const filtered = prev.filter((e) => e.vehicleId !== vehicleId);
        return [...filtered, {
          vehicleId,
          vehicleNumber: vehicle?.vehicleNumber || vehicleId,
          src: chosen.path[0],
          dest: chosen.path[chosen.path.length - 1],
        }];
      });

      const currentOrderedIds = state?.orderedStopIds || [];
      const newETAs = calcStopETAs(vehicleId, chosen.path, currentOrderedIds, vehicleStops, Date.now());
      setStopETAs(prev => ({ ...prev, [vehicleId]: newETAs }));

      const driverName = vehicle?.driverName || vehicle?.vehicleNumber || "Driver";
      pollTomTomForRoute(vehicleId, chosen.path, driverName);

    } catch (err) {
      console.error("Smart reroute error:", err);
      pushNotif(`❌ Rerouting failed: ${err.message}`, "danger");
    } finally {
      setReroutingDrivers((prev) => ({ ...prev, [vehicleId]: false }));
    }
  };

  const simulateDisruption = () => {
    if (!isSimulationStarted || vehicles.length === 0) return;
    const available = vehicles.filter((v) => !driverDisruptions[v.id]);
    const target = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : vehicles[Math.floor(Math.random() * vehicles.length)];
    simulateDisruptionForDriver(target.id);
  };
  const tileConfig = TILE_OPTIONS[tileTheme];

  if (page === "landing") {
    return (
      <div
        style={{
          background: "#0A0F1A",
          color: "#E8EDF5",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* NAVBAR */}
        <div
          style={{
            padding: "20px 40px",
            display: "flex",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(59,130,246,0.2)",
          }}
        >
          <h2>
            SmartRoute <span style={{ color: "#3B82F6" }}>AI</span>
          </h2>

          <button
            onClick={() => setPage("app")}
            style={{
              padding: "10px 20px",
              borderRadius: "30px",
              border: "1px solid #3B82F6",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            Launch App
          </button>
        </div>

        {/* HERO */}
        <div
          style={{
            padding: "80px 40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "60px",
            flexWrap: "wrap",
          }}
        >
          {/* LEFT CONTENT */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h1
              style={{
                fontSize: "3.5rem",
                lineHeight: "1.2",
                background: "linear-gradient(135deg,#ffffff,#3B82F6,#06B6D4)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              Navigate smarter.
              <br />
              Optimize in real-time.
            </h1>

            <p
              style={{
                marginTop: "20px",
                color: "#9CA3AF",
                maxWidth: "500px",
                fontSize: "1.05rem",
              }}
            >
              SmartRoute AI helps you predict risks, optimize delivery routes,
              and respond to disruptions instantly with a fully connected
              logistics system.
            </p>

            {/* BUTTONS */}
            <div style={{ marginTop: "30px", display: "flex", gap: "16px" }}>
              <button
                onClick={() => setPage("app")}
                style={{
                  padding: "14px 28px",
                  borderRadius: "40px",
                  background: "linear-gradient(135deg,#3B82F6,#06B6D4)",
                  border: "none",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(59,130,246,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Launch Dashboard →
              </button>

              <button
                style={{
                  padding: "14px 28px",
                  borderRadius: "40px",
                  background: "transparent",
                  border: "1px solid #3B82F6",
                  color: "#3B82F6",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#3B82F6";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#3B82F6";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* RIGHT VISUAL */}
          <div style={{ flex: 1, minWidth: "300px" }}>
            <h3 style={{ marginBottom: "20px" }}>How the System Works</h3>

            {[
              "Predict Risk Zones",
              "Optimize Routes",
              "Simulate Disruption",
              "Auto Re-route + Alerts",
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(18,25,40,0.7)",
                  padding: "16px",
                  borderRadius: "14px",
                  marginBottom: "12px",
                  border: "1px solid rgba(59,130,246,0.2)",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(8px)";
                  e.currentTarget.style.borderColor = "#3B82F6";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(59,130,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateX(0)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {i + 1}. {step}
              </div>
            ))}
          </div>
        </div>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2>Features</h2>
          <p
              style={{
                color: "#9CA3AF",
                marginTop: "10px",
                maxWidth: "600px",
                marginInline: "auto",
              }}
            >
            Everything you need to manage and optimize your delivery logistics
            efficiently.
          </p>
        </div>
        
        {/* FEATURES */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px 20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "28px",
              maxWidth: "1000px",
              width: "100%",
            }}
          >
            {[
              {
                title: "Predictive Risk Engine",
                desc: "Detect high-risk zones using traffic & weather.",
              },
              {
                title: "Route Optimization",
                desc: "Generate efficient delivery paths dynamically.",
              },
              {
                title: "Disruption Simulation",
                desc: "Simulate accidents and reroute instantly.",
              },
              {
                title: "Live Dashboard",
                desc: "Monitor vehicles and delivery status in real time.",
              },
              {
                title: "Alerts System",
                desc: "Get instant delay and disruption notifications.",
              },
              {
                title: "Fleet Tracking",
                desc: "Track all vehicles live on the map.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(18,25,40,0.7)",
                  padding: "28px",
                  borderRadius: "22px",
                  border: "1px solid rgba(59,130,246,0.2)",
                  textAlign: "center",
                  minHeight: "180px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "#3B82F6";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(59,130,246,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <h3 style={{ marginBottom: "10px" }}>{feature.title}</h3>
                <p style={{ fontSize: "0.9rem", color: "#9CA3AF" }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div
          style={{
            padding: "80px 20px",
            background: "#0A0F1A",
            color: "#E5E7EB",
          }}
        >
          {/* HEADER */}
          <div style={{ textAlign: "center", marginBottom: "60px" }}>
            <h2>How It Works</h2>

            <p
              style={{
                color: "#9CA3AF",
                marginTop: "10px",
                maxWidth: "600px",
                marginInline: "auto",
              }}
            >
              From fleet setup to intelligent rerouting — experience the flow of
              next-gen logistics AI
            </p>
          </div>

          {/* STEPS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "24px",
              maxWidth: "1200px",
              margin: "40px auto",
            }}
          >
            {[
              {
                title: "Setup fleet",
                desc: "Add vehicles, assign drivers, define start locations and delivery stops.",
                icon: "🚚",
              },
              {
                title: "Predict risk zones",
                desc: "Analyze traffic & weather to generate dynamic risk zones.",
                icon: "⚠️",
              },
              {
                title: "Optimize routes",
                desc: "AI generates efficient routes avoiding high-risk areas.",
                icon: "🛣️",
              },
              {
                title: "Simulate & reroute",
                desc: "Trigger disruptions and see real-time route changes.",
                icon: "🚨",
              },
            ].map((step, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(18,25,40,0.7)",
                  borderRadius: "20px",
                  padding: "28px 20px",
                  border: "1px solid rgba(59,130,246,0.2)",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-10px)";
                  e.currentTarget.style.boxShadow =
                    "0 15px 30px rgba(59,130,246,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    margin: "0 auto 16px",
                    background: "linear-gradient(135deg,#3B82F6,#06B6D4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "1.2rem",
                  }}
                >
                  {i + 1}
                </div>

                <h3 style={{ marginBottom: "8px" }}>
                  {step.icon} {step.title}
                </h3>

                <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA SECTION */}
          <div
            style={{
              maxWidth: "800px",
              margin: "0 auto",
              background: "rgba(15,23,42,0.9)",
              borderRadius: "30px",
              padding: "40px",
              textAlign: "center",
              border: "1px solid rgba(59,130,246,0.3)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <h3
              style={{
                fontSize: "1.8rem",
                marginBottom: "10px",
                background: "linear-gradient(135deg,#ffffff,#93C5FD)",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              🚀 Experience intelligent routing
            </h3>

            <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
              Try the full interactive demo — predict risk, optimize, and
              simulate disruptions in real time.
            </p>

            <button
              onClick={() => setPage("app")}
              style={{
                padding: "14px 30px",
                borderRadius: "40px",
                background: "linear-gradient(135deg,#3B82F6,#06B6D4)",
                color: "white",
                border: "none",
                fontWeight: "600",
                cursor: "pointer",
                transition: "0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 12px 25px rgba(59,130,246,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Try Live Demo →
            </button>

            {/* TAGS */}
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  background: "rgba(59,130,246,0.15)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                }}
              >
                ✔ Real-time alerts
              </span>

              <span
                style={{
                  background: "rgba(6,182,212,0.15)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                }}
              >
                📊 On-time KPIs
              </span>

              <span
                style={{
                  background: "rgba(168,85,247,0.15)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                }}
              >
                📍 Smart routing
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="app">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
  {page === "app" && (
    <button
      onClick={() => setPage("landing")}
      style={{
        border: "none",
        background: "transparent",
        fontSize: "1.2rem",
        cursor: "pointer",
        color: "#0f1b35",
      }}
    >
      ←
    </button>
  )}

  <div className="brand">SmartRoute AI</div>
</div>
          <div className="header-center mono">
            <span
              className={`live-pill ${isSimulationStarted ? "active" : ""}`}
            >
              Live
            </span>
            <span>{activeVehicleCount} active vehicles</span>
          </div>
          <div className="header-actions">
            {/* ── Bell notification icon ─────────────────────── */}
            {(() => {
              const unread = notifs.filter(n => !n.read).length;
              const hasDanger = notifs.some(n => !n.read && n.type === "danger");
              return (
                <div data-notif-panel="1" style={{ position: "relative" }}>
                  <button
                    onClick={() => { setNotifOpen(p => !p); markAllRead(); }}
                    style={{
                      border: "none",
                      background: hasDanger ? "#fef2f2" : unread > 0 ? "#eff6ff" : "#f1f5f9",
                      borderRadius: "50%",
                      width: 38, height: 38,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      position: "relative",
                      boxShadow: hasDanger ? "0 0 0 2px #fca5a5" : unread > 0 ? "0 0 0 2px #bfdbfe" : "none",
                      transition: "all 200ms",
                    }}
                    title="Notifications"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasDanger ? "#dc2626" : unread > 0 ? "#2563eb" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    {unread > 0 && (
                      <span style={{
                        position: "absolute", top: 2, right: 2,
                        background: hasDanger ? "#dc2626" : "#2563eb",
                        color: "white", borderRadius: "999px",
                        minWidth: 16, height: 16,
                        fontSize: "0.58rem", fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        padding: "0 3px",
                        lineHeight: 1,
                        animation: hasDanger ? "pulse 1s infinite" : "none",
                        border: "1.5px solid white",
                      }}>{unread > 9 ? "9+" : unread}</span>
                    )}
                  </button>

                  {/* Notification dropdown panel */}
                  {notifOpen && (
                    <div data-notif-panel="1" style={{
                      position: "absolute",
                      top: 46,
                      right: 0,
                      width: 320,
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: 14,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                      zIndex: 3000,
                      overflow: "hidden",
                      fontFamily: "Outfit, sans-serif",
                    }}>
                      {/* Header */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 16px",
                        borderBottom: "1px solid #f1f5f9",
                        background: "#f8fafc",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>🔔</span>
                          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                            Notifications
                          </span>
                          {notifs.length > 0 && (
                            <span style={{
                              background: "#e2e8f0", color: "#64748b",
                              borderRadius: 999, padding: "1px 7px",
                              fontSize: "0.7rem", fontWeight: 600,
                            }}>{notifs.length}</span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          {notifs.length > 0 && (
                            <button
                              onClick={clearAllNotifs}
                              style={{ border: "none", background: "none", fontSize: "0.72rem", color: "#94a3b8", cursor: "pointer" }}
                            >Clear all</button>
                          )}
                          <button
                            onClick={() => setNotifOpen(false)}
                            style={{ border: "none", background: "none", fontSize: "1rem", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}
                          >✕</button>
                        </div>
                      </div>

                      {/* Notification list */}
                      <div style={{ maxHeight: 380, overflowY: "auto" }}>
                        {notifs.length === 0 ? (
                          <div style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                            No notifications yet
                          </div>
                        ) : (
                          notifs.map(n => {
                            const isDanger  = n.type === "danger";
                            const isSuccess = n.type === "success";
                            const isWarning = n.type === "warning";
                            const leftColor = isDanger ? "#dc2626" : isSuccess ? "#16a34a" : isWarning ? "#d97706" : "#3b82f6";
                            const bg = isDanger ? "#fef2f2" : isSuccess ? "#f0fdf4" : isWarning ? "#fffbeb" : "#f8fafc";
                            const mins = Math.floor((Date.now() - n.ts) / 60000);
                            const timeLabel = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
                            return (
                              <div key={n.id} style={{
                                display: "flex",
                                gap: 0,
                                background: n.read ? "#fff" : bg,
                                borderBottom: "1px solid #f1f5f9",
                                position: "relative",
                                transition: "background 300ms",
                              }}>
                                {/* Left colour bar */}
                                <div style={{ width: 4, background: n.read ? "#e2e8f0" : leftColor, flexShrink: 0 }} />
                                <div style={{ flex: 1, padding: "10px 12px 8px 10px" }}>
                                  <div style={{
                                    fontSize: "0.76rem",
                                    color: "#1e293b",
                                    lineHeight: 1.5,
                                    fontWeight: isDanger && !n.read ? 600 : 400,
                                  }}>{n.msg}</div>
                                  <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 3 }}>{timeLabel}</div>
                                </div>
                                <button
                                  onClick={() => clearNotif(n.id)}
                                  style={{
                                    border: "none", background: "none",
                                    color: "#cbd5e1", fontSize: "0.8rem",
                                    cursor: "pointer", padding: "8px 10px 0 0",
                                    alignSelf: "flex-start",
                                  }}
                                >✕</button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                      {/* Coloured left stripe */}
                      <span
                        className="vehicle-stripe"
                        style={{ background: vehicle.color }}
                      />

                      {/* ── All card content in a single vertical column ── */}
                      <div className="vehicle-body">
                        {/* Input fields */}
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

                        {/* ── Stop ETA Timeline — sits between fields and buttons ── */}
                        {isSimulationStarted && stopETAs[vehicle.id]?.length > 0 && (() => {
                          const etas = stopETAs[vehicle.id];
                          const startTime = new Date();
                          const fmtTime = (ms) => {
                            const d = new Date(ms);
                            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          };
                          const state = routeStates[vehicle.id];
                          return (
                            <div style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: 10,
                              padding: "8px 10px",
                              fontSize: "0.7rem",
                            }}>
                              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                                🕐 Stop Schedule
                                <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.63rem" }}>
                                  Depart {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              {etas.map((eta, i) => {
                                const done = state?.completedStopIds?.includes(eta.stopId);
                                const isNext = !done && etas.slice(0, i).every(e => state?.completedStopIds?.includes(e.stopId));
                                return (
                                  <div key={eta.stopId} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    padding: "4px 0",
                                    borderBottom: i < etas.length - 1 ? "1px solid #f1f5f9" : "none",
                                    opacity: done ? 0.5 : 1,
                                  }}>
                                    {/* Timeline dot */}
                                    <div style={{
                                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                                      background: done ? "#22c55e" : isNext ? "#f59e0b" : "#cbd5e1",
                                      border: isNext ? "2px solid #f59e0b" : done ? "2px solid #22c55e" : "2px solid #cbd5e1",
                                      boxShadow: isNext ? "0 0 0 3px rgba(245,158,11,0.2)" : "none",
                                    }} />
                                    <div style={{ flex: 1, overflow: "hidden" }}>
                                      <div style={{
                                        fontWeight: isNext ? 700 : 500,
                                        color: done ? "#94a3b8" : "#1e293b",
                                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                        textDecoration: done ? "line-through" : "none",
                                      }}>
                                        {eta.order}. {eta.name}
                                      </div>
                                      <div style={{ color: "#94a3b8", fontSize: "0.62rem" }}>
                                        {eta.distKm} km from start
                                      </div>
                                    </div>
                                    <div style={{
                                      textAlign: "right",
                                      fontVariantNumeric: "tabular-nums",
                                    }}>
                                      <div style={{
                                        fontWeight: 700,
                                        color: done ? "#94a3b8" : isNext ? "#f59e0b" : "#0f172a",
                                        fontSize: "0.72rem",
                                      }}>
                                        {done ? "✓ Done" : fmtTime(eta.etaMs)}
                                      </div>
                                      {!done && (
                                        <div style={{ color: "#94a3b8", fontSize: "0.6rem" }}>
                                          ~{eta.etaMins} min
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        {/* ── Action buttons ── */}
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

                          {/* Per-driver disruption simulation & re-routing */}
                          {isSimulationStarted && (
                            <div style={{ width: "100%", display: "grid", gap: "6px" }}>

                              {/* Disruption alert banner */}
                              {driverDisruptions[vehicle.id] && (
                                <div style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fca5a5",
                                  borderRadius: "8px",
                                  padding: "8px 10px",
                                  fontSize: "0.68rem",
                                  color: "#991b1b",
                                  lineHeight: 1.5,
                                }}>
                                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                                    {driverDisruptions[vehicle.id].icon} {driverDisruptions[vehicle.id].label}
                                  </div>
                                  <div style={{ color: "#b91c1c" }}>
                                    📍 Blocked: <strong>{driverDisruptions[vehicle.id].streetName}</strong>
                                  </div>
                                  <div style={{ color: "#dc2626", marginTop: 2, fontSize: "0.62rem" }}>
                                    Route ahead is impassable — re-route required
                                  </div>
                                </div>
                              )}

                              {/* Rerouting in progress */}
                              {reroutingDrivers[vehicle.id] && (
                                <div style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "8px",
                                  padding: "7px 10px",
                                  fontSize: "0.68rem",
                                  color: "#1d4ed8",
                                  lineHeight: 1.5,
                                }}>
                                  <div style={{ fontWeight: 700, marginBottom: 3 }}>🔍 Analyzing candidate routes...</div>
                                  <div style={{ color: "#3b82f6" }}>Fetching routes → scoring risk → picking safest</div>
                                </div>
                              )}

                              {/* Route comparison panel */}
                              {rerouteComparisons[vehicle.id] && !reroutingDrivers[vehicle.id] && !driverDisruptions[vehicle.id] && (
                                <div style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  padding: "7px 8px",
                                  fontSize: "0.64rem",
                                }}>
                                  <div style={{ fontWeight: 700, marginBottom: 5, fontSize: "0.68rem", color: "#0f172a" }}>
                                    📊 Route options analyzed:
                                  </div>
                                  {rerouteComparisons[vehicle.id].map((c, i) => {
                                    const riskColor = c.riskLevel === "Low" ? "#15803d" : c.riskLevel === "Medium" ? "#b45309" : "#991b1b";
                                    const riskBg = c.riskLevel === "Low" ? "#ecfdf3" : c.riskLevel === "Medium" ? "#fffbeb" : "#fef2f2";
                                    const emoji = c.riskLevel === "Low" ? "🟢" : c.riskLevel === "Medium" ? "🟡" : "🔴";
                                    const isWinner = i === 0;
                                    return (
                                      <div key={i} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "5px",
                                        padding: "4px 5px",
                                        marginBottom: "3px",
                                        borderRadius: "6px",
                                        background: isWinner ? riskBg : "transparent",
                                        border: isWinner ? `1px solid ${riskColor}40` : "1px solid transparent",
                                      }}>
                                        <span style={{ minWidth: 14, fontWeight: 700, color: isWinner ? riskColor : "#94a3b8" }}>
                                          {isWinner ? "✓" : `${i + 1}.`}
                                        </span>
                                        <span style={{ flex: 1, color: "#334155" }}>
                                          {c.distKm}km · ~{c.durMin}min
                                        </span>
                                        <span style={{
                                          background: riskBg,
                                          color: riskColor,
                                          borderRadius: "999px",
                                          padding: "1px 6px",
                                          fontWeight: 600,
                                          fontSize: "0.6rem",
                                        }}>
                                          {emoji} {c.riskLevel}
                                        </span>
                                        {isWinner && (
                                          <span style={{ color: riskColor, fontSize: "0.6rem", fontWeight: 700 }}>← selected</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Final success badge */}
                              {rerouteResults[vehicle.id] && !driverDisruptions[vehicle.id] && !reroutingDrivers[vehicle.id] && (
                                <div style={{
                                  background: "#ecfdf3",
                                  border: "1px solid #86efac",
                                  borderRadius: "8px",
                                  padding: "5px 8px",
                                  fontSize: "0.66rem",
                                  color: "#15803d",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}>
                                  <span>✅ Active: {rerouteResults[vehicle.id].distance}km · ~{rerouteResults[vehicle.id].duration}min</span>
                                  <span style={{
                                    fontWeight: 700,
                                    background: rerouteResults[vehicle.id].riskLevel === "Low" ? "#dcfce7"
                                      : rerouteResults[vehicle.id].riskLevel === "Medium" ? "#fef9c3" : "#fee2e2",
                                    color: rerouteResults[vehicle.id].riskLevel === "Low" ? "#15803d"
                                      : rerouteResults[vehicle.id].riskLevel === "Medium" ? "#b45309" : "#991b1b",
                                    borderRadius: "999px",
                                    padding: "1px 6px",
                                    fontSize: "0.6rem",
                                  }}>
                                    {rerouteResults[vehicle.id].riskLevel === "Low" ? "🟢" : rerouteResults[vehicle.id].riskLevel === "Medium" ? "🟡" : "🔴"} {rerouteResults[vehicle.id].riskLevel} Risk
                                  </span>
                                </div>
                              )}

                              <div style={{ display: "flex", gap: "6px" }}>
                                {/* SIMULATE button */}
                                <button
                                  className="pill-btn"
                                  style={{
                                    flex: 1,
                                    background: (driverDisruptions[vehicle.id] || reroutingDrivers[vehicle.id]) ? "#e5e7eb" : "#7c3aed",
                                    color: (driverDisruptions[vehicle.id] || reroutingDrivers[vehicle.id]) ? "#9ca3af" : "#fff",
                                    fontSize: "0.68rem",
                                    padding: "7px 6px",
                                    cursor: (driverDisruptions[vehicle.id] || reroutingDrivers[vehicle.id]) ? "not-allowed" : "pointer",
                                  }}
                                  disabled={!!driverDisruptions[vehicle.id] || reroutingDrivers[vehicle.id]}
                                  onClick={() => simulateDisruptionForDriver(vehicle.id)}
                                >
                                  🚨 Simulate
                                </button>

                                {/* RE-ROUTE button */}
                                <button
                                  className="pill-btn"
                                  style={{
                                    flex: 1,
                                    background: reroutingDrivers[vehicle.id]
                                      ? "#d1d5db"
                                      : driverDisruptions[vehicle.id]
                                      ? "#15803d"
                                      : "#e5e7eb",
                                    color: (!driverDisruptions[vehicle.id] && !reroutingDrivers[vehicle.id])
                                      ? "#9ca3af" : "#fff",
                                    fontSize: "0.68rem",
                                    padding: "7px 6px",
                                    cursor: driverDisruptions[vehicle.id] && !reroutingDrivers[vehicle.id]
                                      ? "pointer" : "not-allowed",
                                  }}
                                  disabled={!driverDisruptions[vehicle.id] || reroutingDrivers[vehicle.id]}
                                  onClick={() => rerouteDriver(vehicle.id)}
                                >
                                  {reroutingDrivers[vehicle.id] ? "⏳ Analyzing..." : "🔄 Re-Route"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>{/* end vehicle-body */}
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

                {/* Disruption markers */}
                {vehicles.map((vehicle) => {
                  const disruption = driverDisruptions[vehicle.id];
                  if (!disruption?.disruptionLat || !disruption?.disruptionLng) return null;
                  const markerIcon = L.divIcon({
                    className: "",
                    html: `
                      <div style="
                        position:relative;
                        display:flex;
                        flex-direction:column;
                        align-items:center;
                      ">
                        <div style="
                          background:#dc2626;
                          color:white;
                          border-radius:8px;
                          padding:4px 7px;
                          font-size:11px;
                          font-weight:700;
                          white-space:nowrap;
                          box-shadow:0 2px 8px rgba(0,0,0,0.35);
                          border:2px solid white;
                          max-width:160px;
                          overflow:hidden;
                          text-overflow:ellipsis;
                        ">${disruption.icon} ${disruption.label}</div>
                        <div style="
                          background:#dc2626;
                          width:24px;height:24px;
                          border-radius:50%;
                          border:3px solid white;
                          box-shadow:0 0 0 3px #dc2626, 0 0 0 6px rgba(220,38,38,0.3);
                          margin-top:3px;
                          animation:disruptionPulse 1s infinite;
                        "></div>
                        <style>
                          @keyframes disruptionPulse {
                            0%{box-shadow:0 0 0 3px #dc2626,0 0 0 6px rgba(220,38,38,0.3);}
                            50%{box-shadow:0 0 0 3px #dc2626,0 0 0 12px rgba(220,38,38,0);}
                            100%{box-shadow:0 0 0 3px #dc2626,0 0 0 6px rgba(220,38,38,0.3);}
                          }
                        </style>
                      </div>`,
                    iconSize: [160, 54],
                    iconAnchor: [80, 54],
                  });
                  return (
                    <Marker
                      key={`disruption-${vehicle.id}`}
                      position={[disruption.disruptionLat, disruption.disruptionLng]}
                      icon={markerIcon}
                    >
                      <Popup>
                        <div style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                          <strong>{disruption.icon} {disruption.label}</strong><br />
                          📍 <strong>{disruption.streetName}</strong><br />
                          <span style={{ color: "#dc2626" }}>⛔ Road blocked — re-route required</span>
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