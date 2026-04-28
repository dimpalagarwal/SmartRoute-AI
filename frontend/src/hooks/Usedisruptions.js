import { useEffect, useState } from "react";
import { api } from "../config";
import { calculateBearing, calcStopETAs } from "../utils/helpers";

/**
 * useDisruptions
 * Handles per-driver disruption simulation, smart rerouting, and TomTom traffic alerts.
 */
export function useDisruptions({
  vehicles,
  routeStates,
  setRouteStates,
  assignedStopsByVehicle,
  isSimulationStarted,
  isPlaying,
  setStopETAs,
  pushNotif,
  trafficAlertsFired,
  setTrafficAlertsFired,
}) {
  const [driverDisruptions, setDriverDisruptions] = useState({});
  const [reroutingDrivers, setReroutingDrivers] = useState({});
  const [rerouteResults, setRerouteResults] = useState({});
  const [rerouteComparisons, setRerouteComparisons] = useState({});

  // ─── TomTom congestion poller ─────────────────────────────────────────
  const pollTomTomForRoute = async (vehicleId, roadPath, driverName) => {
    if (!roadPath || roadPath.length < 2) return;
    try {
      const res = await fetch(api("/route-traffic-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: roadPath, vehicleId, driverName }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.available || data.level === "clear") return;

      const roundedRatio = Math.round((data.avgDelayRatio || 1) * 10);
      const key = `${vehicleId}-tomtom-${roundedRatio}`;

      setTrafficAlertsFired((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        if (data.level === "severe") pushNotif(`🔴 [${driverName}] ${data.message}`, "danger");
        else if (data.level === "moderate") pushNotif(`🟡 [${driverName}] ${data.message}`, "warning");
        else if (data.level === "light") pushNotif(`🟠 [${driverName}] ${data.message}`, "warning");
        return next;
      });
    } catch { /* silent */ }
  };

  // ─── Periodic TomTom re-poll every 2 min ─────────────────────────────
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
    }, 120_000);
    return () => clearInterval(intervalId);
  }, [isSimulationStarted, isPlaying, vehicles, routeStates]);

  // ─── Simulate disruption for a specific driver ───────────────────────
  const simulateDisruptionForDriver = async (vehicleId) => {
    if (!isSimulationStarted) return;
    const state = routeStates[vehicleId];
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const name = vehicle?.driverName || vehicle?.vehicleNumber || "Driver";

    try {
      const response = await fetch(api("/simulate-disruption"), {
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
    } catch {
      const fallback = { type: "accident", icon: "💥", label: "Accident", streetName: "route ahead" };
      setDriverDisruptions((prev) => ({ ...prev, [vehicleId]: fallback }));
      pushNotif(`💥 [${name}] Accident on route ahead — click Re-Route!`, "danger");
    }
  };

  // ─── Simulate disruption (random driver) ────────────────────────────
  const simulateDisruption = () => {
    if (!isSimulationStarted || vehicles.length === 0) return;
    const available = vehicles.filter((v) => !driverDisruptions[v.id]);
    const pool = available.length > 0 ? available : vehicles;
    simulateDisruptionForDriver(pool[Math.floor(Math.random() * pool.length)].id);
  };

  // ─── Smart reroute ───────────────────────────────────────────────────
  const rerouteDriver = async (vehicleId) => {
    if (!isSimulationStarted) return;
    const state = routeStates[vehicleId];
    if (!state?.path?.length) return;

    const disruption = driverDisruptions[vehicleId];
    setReroutingDrivers((prev) => ({ ...prev, [vehicleId]: true }));
    setRerouteComparisons((prev) => ({ ...prev, [vehicleId]: null }));

    try {
      const currentPos = state.path[state.simIndex || 0] || state.path[0];
      const vehicleStops = assignedStopsByVehicle[vehicleId] || [];
      const remainingStops = vehicleStops
        .filter((s) => !state.completedStopIds?.includes(s.id) && s.location)
        .map((s) => ({ id: s.id, lat: s.location.lat, lng: s.location.lng }));

      if (remainingStops.length === 0) {
        setDriverDisruptions((prev) => { const n = { ...prev }; delete n[vehicleId]; return n; });
        return;
      }

      const response = await fetch(api("/smart-reroute"), {
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

      if (!response.ok) throw new Error(`Server error ${response.status}`);
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
      pushNotif(`✅ [${name}] Safest route: ${chosen.distKm}km ~${chosen.durMin}min ${riskEmoji} ${chosen.riskLevel} Risk`, "success");

      const newETAs = calcStopETAs(vehicleId, chosen.path, state?.orderedStopIds || [], vehicleStops, Date.now());
      setStopETAs((prev) => ({ ...prev, [vehicleId]: newETAs }));

      const driverName = vehicle?.driverName || vehicle?.vehicleNumber || "Driver";
      pollTomTomForRoute(vehicleId, chosen.path, driverName);
    } catch (err) {
      pushNotif(`❌ Rerouting failed: ${err.message}`, "danger");
    } finally {
      setReroutingDrivers((prev) => ({ ...prev, [vehicleId]: false }));
    }
  };

  return {
    driverDisruptions,
    reroutingDrivers,
    rerouteResults,
    rerouteComparisons,
    simulateDisruption,
    simulateDisruptionForDriver,
    rerouteDriver,
    pollTomTomForRoute,
  };
}