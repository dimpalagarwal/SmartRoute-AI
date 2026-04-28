// ─── ID Generation ─────────────────────────────────────────────────────────
export const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Geocoding ──────────────────────────────────────────────────────────────
export const normalizeGeocodeResult = (item) => ({
  placeName: item.display_name,
  lat: Number.parseFloat(item.lat),
  lng: Number.parseFloat(item.lon),
});

// ─── Geometry ───────────────────────────────────────────────────────────────
export const calculateBearing = (from, to) => {
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

export const distanceDeg = (a, b) => {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
};

// ─── ETA Calculation ────────────────────────────────────────────────────────
export const calcStopETAs = (vehicleId, roadPath, orderedStopIds, vehicleStops, startMs) => {
  const AVG_SPEED_KMH = 30;
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

  const stopObjects = orderedStopIds
    .map((id) => vehicleStops.find((s) => s.id === id))
    .filter((s) => s?.location);

  return stopObjects.map((stop, idx) => {
    let minDist = Infinity;
    let nearestIdx = 0;
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

    return {
      stopId: stop.id,
      name: stop.name,
      etaMs,
      etaMins,
      distKm: Math.round(cumKm * 10) / 10,
      order: idx + 1,
    };
  });
};

// ─── API Helpers ─────────────────────────────────────────────────────────────
export const fetchRoadGeometry = async (orderedStops) => {
  if (!orderedStops || orderedStops.length < 2) return [];
  const coords = orderedStops.map((s) => `${s.lng},${s.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("OSRM request failed");
  const data = await response.json();
  return (
    data.routes?.[0]?.geometry?.coordinates?.map((coord) => [coord[1], coord[0]]) || []
  );
};