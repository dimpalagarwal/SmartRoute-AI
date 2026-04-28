import { useMemo, useState } from "react";

// ── Styles ───────────────────────────────────────────────────────────────────
import APP_STYLES from "./styles/appStyles";

// ── Constants ────────────────────────────────────────────────────────────────
import { VEHICLE_COLORS } from "./constants";

// ── Hooks ────────────────────────────────────────────────────────────────────
import { useVehicles } from "./hooks/useVehicles";
import { useSimulation } from "./hooks/Usesimulation";
import { useNotifications } from "./hooks/useNotifications";
import { useDisruptions } from "./hooks/useDisruptions";

// ── Utils ────────────────────────────────────────────────────────────────────
import { createId, calcStopETAs, fetchRoadGeometry } from "./utils/helpers";

// ── Components ───────────────────────────────────────────────────────────────
import LandingPage from "./components/LandingPage";
import MapPanel from "./components/MapPanel";
import NotificationPanel from "./components/NotificationPanel";
import { FleetTab, DeliveriesTab, AnalyticsTab } from "./components/SidebarTabs";
import { api } from "./config";

// ── Default stops ─────────────────────────────────────────────────────────────
const makeDefaultStops = () => [
  {
    id: createId(),
    name: "Stop A",
    location: { placeName: "Saket Metro Station, New Delhi, Delhi, India", lat: 28.5245, lng: 77.2066 },
    assignedVehicleId: "",
  },
  {
    id: createId(),
    name: "Stop B",
    location: { placeName: "Karol Bagh, New Delhi, Delhi, India", lat: 28.6519, lng: 77.1909 },
    assignedVehicleId: "",
  },
];

export default function App() {
  const [page, setPage] = useState("landing");
  const [activeTab, setActiveTab] = useState("fleet");
  const [assignMode, setAssignMode] = useState("auto");
  const [tileTheme, setTileTheme] = useState("light");
  const [fitToken, setFitToken] = useState(0);
  const [allRouteCoords, setAllRouteCoords] = useState([]);
  const [routeHoverInfo, setRouteHoverInfo] = useState(null);
  const [stopETAs, setStopETAs] = useState({});
  const [trafficAlertsFired, setTrafficAlertsFired] = useState(new Set());
  const [stops, setStops] = useState(makeDefaultStops);
  const [newStop, setNewStop] = useState({ name: "", location: null, assignedVehicleId: "" });

  // ── Notifications ─────────────────────────────────────────────────────────
  const { notifs, notifOpen, setNotifOpen, pushNotif, markAllRead, clearNotif, clearAllNotifs } = useNotifications();

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const { vehicles, vehicleColorMap, addVehicle, updateVehicle, removeVehicle, copyTrackingLink } =
    useVehicles(
      (updater) => setRouteStates(updater),   // forwarded setter
      setStops
    );

  // ── Assignment logic ──────────────────────────────────────────────────────
  const assignedStopsByVehicle = useMemo(() => {
    const grouped = Object.fromEntries(vehicles.map((v) => [v.id, []]));
    if (vehicles.length === 0) return grouped;
    if (assignMode === "auto") {
      stops.forEach((stop, idx) => {
        grouped[vehicles[idx % vehicles.length].id].push(stop);
      });
    } else {
      stops.forEach((stop, idx) => {
        const fallbackId = vehicles[idx % vehicles.length]?.id;
        const selectedId = grouped[stop.assignedVehicleId] ? stop.assignedVehicleId : fallbackId;
        if (selectedId) grouped[selectedId].push(stop);
      });
    }
    return grouped;
  }, [assignMode, stops, vehicles]);

  // ── Simulation ────────────────────────────────────────────────────────────
  const {
    routeStates, setRouteStates, isPlaying, setIsPlaying,
    isSimulationStarted, setIsSimulationStarted,
    gpsLocations, isGpsLive, togglePlayPause,
  } = useSimulation({ assignedStopsByVehicle, vehicles });

  // ── Disruptions ───────────────────────────────────────────────────────────
  const {
    driverDisruptions, reroutingDrivers, rerouteResults, rerouteComparisons,
    simulateDisruption, simulateDisruptionForDriver, rerouteDriver, pollTomTomForRoute,
  } = useDisruptions({
    vehicles, routeStates, setRouteStates, assignedStopsByVehicle,
    isSimulationStarted, isPlaying, setStopETAs, pushNotif,
    trafficAlertsFired, setTrafficAlertsFired,
  });

  // ── Vehicle display state (status labels) ─────────────────────────────────
  const vehicleDisplayStates = useMemo(() => {
    return vehicles.map((vehicle) => {
      const state = routeStates[vehicle.id];
      const totalStops = assignedStopsByVehicle[vehicle.id]?.length || 0;
      const completedStops = state?.completedStopIds?.length || 0;

      let status = "Idle";
      if (isSimulationStarted && !state?.isCompleted && state?.path?.length > 1) status = "En Route";
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
  }, [assignedStopsByVehicle, gpsLocations, isSimulationStarted, routeStates, vehicleColorMap, vehicles]);

  const activeVehicleCount = vehicleDisplayStates.filter((v) => v.status === "En Route").length;

  // ── Stop management ───────────────────────────────────────────────────────
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
    setNewStop({ name: "", location: null, assignedVehicleId: newStop.assignedVehicleId });
  };

  const removeStop = (stopId) => setStops((prev) => prev.filter((s) => s.id !== stopId));

  // ── Optimize all routes ───────────────────────────────────────────────────
  const optimizeAllRoutes = async () => {
    if (vehicles.length === 0) return;
    const nextStates = {};

    await Promise.all(
      vehicles.map(async (vehicle) => {
        const start = vehicle.startLocation;
        if (!start) {
          nextStates[vehicle.id] = { path: [], simIndex: 0, simPosition: null, heading: 0, completedStopIds: [], pulseUntil: {}, orderedStopIds: [], isCompleted: true };
          return;
        }

        const vehicleStops = assignedStopsByVehicle[vehicle.id] || [];
        const payload = [
          { name: `warehouse-${vehicle.id}`, x: start.lat, y: start.lng },
          ...vehicleStops.map((s) => ({ name: s.id, x: s.location.lat, y: s.location.lng })),
        ];

        if (payload.length < 2) {
          nextStates[vehicle.id] = { path: [[start.lat, start.lng]], simIndex: 0, simPosition: [start.lat, start.lng], heading: 0, completedStopIds: [], pulseUntil: {}, orderedStopIds: [], isCompleted: true };
          return;
        }

        const optimizeResponse = await fetch(api("/optimize-route"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!optimizeResponse.ok) throw new Error("Route optimization failed");

        const ordered = await optimizeResponse.json();
        const orderedStops = ordered.map((item) => ({ id: item.name, lat: item.x, lng: item.y }));
        const roadPath = await fetchRoadGeometry(orderedStops);
        const orderedStopIds = orderedStops.slice(1).map((s) => s.id);

        nextStates[vehicle.id] = {
          path: roadPath,
          simIndex: 0,
          simPosition: roadPath[0] || [start.lat, start.lng],
          heading: roadPath.length > 1 ? 0 : 0,
          completedStopIds: [],
          pulseUntil: {},
          orderedStopIds,
          isCompleted: roadPath.length <= 1,
        };
      })
    );

    setRouteStates(nextStates);
    setIsSimulationStarted(true);
    setIsPlaying(true);
    setFitToken((prev) => prev + 1);

    // Compute ETAs
    const now = Date.now();
    const newETAs = {};
    vehicles.forEach((vehicle) => {
      const state = nextStates[vehicle.id];
      if (!state?.path?.length || !state.orderedStopIds?.length) return;
      newETAs[vehicle.id] = calcStopETAs(
        vehicle.id, state.path, state.orderedStopIds,
        assignedStopsByVehicle[vehicle.id] || [], now
      );
    });
    setStopETAs(newETAs);

    // Fire TomTom congestion checks
    setTrafficAlertsFired(new Set());
    vehicles.forEach((vehicle) => {
      const state = nextStates[vehicle.id];
      const name = vehicle.driverName || vehicle.vehicleNumber || "Driver";
      if (state?.path?.length) pollTomTomForRoute(vehicle.id, state.path, name);
    });

    pushNotif(`✅ All routes optimized for ${vehicles.length} driver${vehicles.length > 1 ? "s" : ""}. ETAs calculated.`, "success");
  };

  // ── Analyze route risk ────────────────────────────────────────────────────
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

  // ── Landing page ───────────────────────────────────────────────────────────
  if (page === "landing") return <LandingPage onLaunch={() => setPage("app")} />;

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{APP_STYLES}</style>
      <div className="app">
        {/* ── Top header ──────────────────────────────────────────────── */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setPage("landing")}
              style={{ border: "none", background: "transparent", fontSize: "1.2rem", cursor: "pointer", color: "#0f1b35" }}
            >
              ←
            </button>
            <div className="brand">SmartRoute AI</div>
          </div>

          <div className="header-center mono">
            <span className={`live-pill ${isSimulationStarted ? "active" : ""}`}>Live</span>
            <span>{activeVehicleCount} active vehicles</span>
          </div>

          <div className="header-actions">
            <NotificationPanel
              notifs={notifs} notifOpen={notifOpen} setNotifOpen={setNotifOpen}
              markAllRead={markAllRead} clearNotif={clearNotif} clearAllNotifs={clearAllNotifs}
            />
            <button className="pill-btn secondary" onClick={togglePlayPause} disabled={!isSimulationStarted}>
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
          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <aside className="sidebar">
            <div className="card tabs">
              {[{ key: "fleet", label: "Fleet" }, { key: "deliveries", label: "Deliveries" }, { key: "analytics", label: "Analytics" }].map((tab) => (
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
              <FleetTab
                vehicleDisplayStates={vehicleDisplayStates}
                vehicles={vehicles}
                vehicleColorMap={vehicleColorMap}
                routeStates={routeStates}
                stopETAs={stopETAs}
                isSimulationStarted={isSimulationStarted}
                driverDisruptions={driverDisruptions}
                reroutingDrivers={reroutingDrivers}
                rerouteResults={rerouteResults}
                rerouteComparisons={rerouteComparisons}
                updateVehicle={updateVehicle}
                removeVehicle={removeVehicle}
                addVehicle={addVehicle}
                copyTrackingLink={copyTrackingLink}
                simulateDisruptionForDriver={simulateDisruptionForDriver}
                rerouteDriver={rerouteDriver}
                analyzeOptimizedRoutes={analyzeOptimizedRoutes}
              />
            )}
            {activeTab === "deliveries" && (
              <DeliveriesTab
                stops={stops}
                vehicles={vehicles}
                vehicleColorMap={vehicleColorMap}
                newStop={newStop}
                setNewStop={setNewStop}
                assignMode={assignMode}
                setAssignMode={setAssignMode}
                addStop={addStop}
                removeStop={removeStop}
                setStops={setStops}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsTab vehicleDisplayStates={vehicleDisplayStates} />
            )}
          </aside>

          {/* ── Map ───────────────────────────────────────────────────── */}
          <MapPanel
            tileTheme={tileTheme}
            setTileTheme={setTileTheme}
            routeStates={routeStates}
            vehicles={vehicles}
            vehicleColorMap={vehicleColorMap}
            assignedStopsByVehicle={assignedStopsByVehicle}
            allRouteCoords={allRouteCoords}
            fitToken={fitToken}
            routeHoverInfo={routeHoverInfo}
            setRouteHoverInfo={setRouteHoverInfo}
            driverDisruptions={driverDisruptions}
            gpsLocations={gpsLocations}
            isGpsLive={isGpsLive}
          />
        </div>
      </div>
    </>
  );
}