const express = require("express");
const axios = require("axios");
const { fetchWeather } = require("../services/weatherService");
const { scoreRouteRisk } = require("../services/geminiService");
const { reverseGeocode } = require("../services/geocodeService");

const router = express.Router();

// In-memory store for active disruptions keyed by vehicleId
const activeDisruptions = {};

const DISRUPTION_TYPES = [
  { type: "accident",          icon: "💥", label: "Multi-vehicle accident" },
  { type: "roadwork",          icon: "🚧", label: "Emergency road works" },
  { type: "flooding",          icon: "🌊", label: "Flash flooding" },
  { type: "protest",           icon: "🚶", label: "Road blockade / procession" },
  { type: "vehicle_breakdown", icon: "🚛", label: "Broken-down vehicle" },
  { type: "signal_failure",    icon: "🚦", label: "Traffic signal failure" },
  { type: "vip_convoy",        icon: "🚔", label: "VIP convoy closure" },
  { type: "fire",              icon: "🔥", label: "Building fire / emergency" },
];

/**
 * POST /optimize-route
 * Runs a nearest-neighbor greedy optimization over a set of locations.
 */
router.post("/optimize-route", (req, res) => {
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: "Body must be a non-empty array of locations" });
  }

  function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  function optimizeRoute(locs) {
    const visited = new Set();
    const route = [];
    let current = locs[0];
    route.push(current);
    visited.add(current.name);

    while (route.length < locs.length) {
      let nearest = null;
      let minDist = Infinity;

      for (const loc of locs) {
        if (!visited.has(loc.name)) {
          const dist = distance(current, loc);
          if (dist < minDist) {
            minDist = dist;
            nearest = loc;
          }
        }
      }

      if (!nearest) break;
      route.push(nearest);
      visited.add(nearest.name);
      current = nearest;
    }

    return route;
  }

  res.json(optimizeRoute(locations));
});

/**
 * POST /simulate-disruption
 * Injects a random disruption event at a point ahead on the driver's current path.
 */
router.post("/simulate-disruption", async (req, res) => {
  const { vehicleId, currentPath, simIndex } = req.body || {};
  if (!vehicleId) return res.status(400).json({ error: "vehicleId required" });

  const d = DISRUPTION_TYPES[Math.floor(Math.random() * DISRUPTION_TYPES.length)];

  let streetName = "the road ahead";
  let disruptionLat = null;
  let disruptionLng = null;

  if (Array.isArray(currentPath) && currentPath.length > 2) {
    const idx = simIndex || 0;
    const remaining = currentPath.slice(idx);
    const targetIdx = Math.min(Math.floor(remaining.length * 0.3), remaining.length - 1);
    const point = remaining[targetIdx];
    disruptionLat = point[0];
    disruptionLng = point[1];
    streetName = await reverseGeocode(disruptionLat, disruptionLng);
  }

  activeDisruptions[vehicleId] = {
    ...d,
    streetName,
    disruptionLat,
    disruptionLng,
    timestamp: Date.now(),
    vehicleId,
  };

  res.json({ success: true, disruption: activeDisruptions[vehicleId] });
});

/**
 * POST /smart-reroute
 * Fetches 3 candidate routes via OSRM, scores each with Gemini AI risk,
 * and returns ranked candidates plus the recommended best route.
 */
router.post("/smart-reroute", async (req, res) => {
  const { currentPosition, remainingStops, disruption } = req.body || {};
  if (!currentPosition || !remainingStops?.length) {
    return res.status(400).json({ error: "currentPosition and remainingStops required" });
  }

  try {
    const start = currentPosition;
    const stops = remainingStops;

    const makeCoordStr = (startLat, startLng) => {
      const pts = [{ lat: startLat, lng: startLng }, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))];
      return pts.map((p) => `${p.lng},${p.lat}`).join(";");
    };

    const midStop = stops[Math.floor(stops.length / 2)];
    const weather =
      (await fetchWeather(midStop.lat, midStop.lng)) ||
      (await fetchWeather(start.lat, start.lng)) ||
      { condition: "Clear", temp: 28 };

    const MID_LAT = (start.lat + (stops[stops.length - 1]?.lat || start.lat)) / 2;
    const MID_LNG = (start.lng + (stops[stops.length - 1]?.lng || start.lng)) / 2;
    const OFFSET = 0.015;

    const candidateConfigs = [
      {
        label: "Route A (Shortest)",
        coordStr: makeCoordStr(start.lat, start.lng),
        avoidStreet: false,
      },
      {
        label: "Route B (North bypass)",
        coordStr: (() => {
          const detour = { lat: MID_LAT + OFFSET, lng: MID_LNG - OFFSET * 0.5 };
          return [`${start.lng},${start.lat}`, `${detour.lng},${detour.lat}`, ...stops.map((s) => `${s.lng},${s.lat}`)].join(";");
        })(),
        avoidStreet: true,
      },
      {
        label: "Route C (South bypass)",
        coordStr: (() => {
          const detour = { lat: MID_LAT - OFFSET, lng: MID_LNG + OFFSET * 0.5 };
          return [`${start.lng},${start.lat}`, `${detour.lng},${detour.lat}`, ...stops.map((s) => `${s.lng},${s.lat}`)].join(";");
        })(),
        avoidStreet: true,
      },
    ];

    const allCandidates = [];

    await Promise.all(
      candidateConfigs.map(async (cfg) => {
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${cfg.coordStr}?overview=full&geometries=geojson`;
          const osrmRes = await axios.get(url, { timeout: 10000 });
          const route = osrmRes.data?.routes?.[0];
          if (!route) return;

          const path = route.geometry.coordinates.map((c) => [c[1], c[0]]);
          const distKm = Math.round(route.distance / 100) / 10;
          const durMin = Math.round(route.duration / 60);

          const key = Math.round(route.distance / 300);
          if (!allCandidates.find((c) => c.key === key)) {
            allCandidates.push({ label: cfg.label, path, distKm, durMin, key, avoidStreet: cfg.avoidStreet });
          }
        } catch (e) {
          console.warn("OSRM candidate failed:", cfg.label, e.message);
        }
      })
    );

    if (allCandidates.length === 0) {
      return res.status(500).json({ error: "No routes returned from OSRM — check coordinates" });
    }

    allCandidates.sort((a, b) => a.distKm - b.distKm);
    const top = allCandidates.slice(0, 3);

    const scored = [];
    for (const candidate of top) {
      let risk = "Low";
      let reasons = ["No significant hazards"];

      if (!candidate.avoidStreet && disruption) {
        risk = "High";
        reasons = [`Passes through ${disruption.streetName} where ${disruption.type} is active`];
      } else {
        try {
          const disruptionCtx = disruption
            ? { type: disruption.type, streetName: disruption.streetName, avoidStreet: candidate.avoidStreet }
            : null;
          const result = await scoreRouteRisk(candidate.path, weather, disruptionCtx);
          risk = result.risk;
          reasons = result.reasons;
        } catch {
          risk = "Low";
          reasons = ["Weather clear, alternate path"];
        }
      }

      const riskScore = risk === "High" ? 3 : risk === "Medium" ? 2 : 1;
      const maxDist = top[top.length - 1].distKm || 1;
      const combinedScore = riskScore * 10 + candidate.distKm / maxDist;

      scored.push({ ...candidate, riskLevel: risk, riskReasons: reasons, weather, riskScore, combinedScore });
    }

    scored.sort((a, b) => a.combinedScore - b.combinedScore);
    res.json({ success: true, candidates: scored, chosen: scored[0] });
  } catch (err) {
    console.error("Smart reroute ERROR:", err.message);
    res.status(500).json({ error: "Smart rerouting failed", details: err.message });
  }
});

module.exports = router;
