import { useMemo, useState } from "react";
import { createId } from "../utils/helpers";
import { VEHICLE_COLORS, MAX_VEHICLES } from "../constants";
import { frontendUrl } from "../config";

const DEFAULT_VEHICLES = [
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
];

/**
 * useVehicles
 * CRUD for the vehicle list plus the color map.
 */
export function useVehicles(setRouteStates, setStops) {
  const [vehicles, setVehicles] = useState(DEFAULT_VEHICLES);

  const vehicleColorMap = useMemo(
    () =>
      Object.fromEntries(
        vehicles.map((v, idx) => [v.id, VEHICLE_COLORS[idx] || "#94a3b8"])
      ),
    [vehicles]
  );

  const addVehicle = () => {
    if (vehicles.length >= MAX_VEHICLES) return;
    setVehicles((prev) => [
      ...prev,
      { id: createId(), vehicleNumber: "", driverName: "", startLocation: null, copiedUntil: 0 },
    ]);
  };

  const updateVehicle = (vehicleId, key, value) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, [key]: value } : v))
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
        stop.assignedVehicleId === vehicleId ? { ...stop, assignedVehicleId: "" } : stop
      )
    );
  };

  const copyTrackingLink = async (vehicleId) => {
    const link = frontendUrl(`/driver/${vehicleId}`);
    try {
      await navigator.clipboard.writeText(link);
      const expires = Date.now() + 2000;
      setVehicles((prev) =>
        prev.map((v) => (v.id === vehicleId ? { ...v, copiedUntil: expires } : v))
      );
      setTimeout(() => {
        setVehicles((prev) =>
          prev.map((v) => (v.id === vehicleId ? { ...v, copiedUntil: 0 } : v))
        );
      }, 2000);
    } catch {
      // Clipboard permission errors are non-fatal
    }
  };

  return { vehicles, vehicleColorMap, addVehicle, updateVehicle, removeVehicle, copyTrackingLink };
}