import { useEffect, useState } from "react";
import { api } from "../config";
import { calculateBearing, distanceDeg } from "../utils/helpers";
import { GPS_POLL_MS, GPS_FRESHNESS_MS } from "../constants";

/**
 * useSimulation
 * Owns the route animation tick, GPS polling, and play/pause state.
 */
export function useSimulation({ assignedStopsByVehicle, vehicles }) {
  const [routeStates, setRouteStates] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSimulationStarted, setIsSimulationStarted] = useState(false);
  const [gpsLocations, setGpsLocations] = useState({});

  const isGpsLive = (vehicleId) => {
    const latest = gpsLocations[vehicleId];
    if (!latest) return false;
    return Date.now() - latest.timestamp <= GPS_FRESHNESS_MS;
  };

  // ── Animation tick ─────────────────────────────────────────────────────
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
            const dist = distanceDeg(effectivePosition, [stop.location.lat, stop.location.lng]);
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

  // ── Auto-stop when all routes complete ─────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const allDone = Object.values(routeStates).every(
      (state) => state.isCompleted || !state.path?.length
    );
    if (allDone && Object.keys(routeStates).length > 0) setIsPlaying(false);
  }, [isPlaying, routeStates]);

  // ── GPS polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulationStarted) return undefined;
    const poll = async () => {
      try {
        const response = await fetch(api("/vehicle-locations"));
        if (!response.ok) return;
        const data = await response.json();
        setGpsLocations(data || {});
      } catch {
        // Ignore temporary network errors
      }
    };
    poll();
    const intervalId = setInterval(poll, GPS_POLL_MS);
    return () => clearInterval(intervalId);
  }, [isSimulationStarted]);

  const togglePlayPause = () => {
    if (!isSimulationStarted) return;
    setIsPlaying((prev) => !prev);
  };

  return {
    routeStates,
    setRouteStates,
    isPlaying,
    setIsPlaying,
    isSimulationStarted,
    setIsSimulationStarted,
    gpsLocations,
    isGpsLive,
    togglePlayPause,
  };
}