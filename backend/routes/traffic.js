const express = require("express");
const axios = require("axios");
const { TOMTOM_API_KEY, GOOGLE_API_KEY } = require("../config");

const router = express.Router();

const TOMTOM_FLOW_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json";

function isTomTomConfigured(key) {
  return key && key !== "YOUR_TOMTOM_API_KEY_HERE";
}

/**
 * GET /traffic-flow
 * Proxies TomTom traffic flow data for a given lat/lon.
 */
router.get("/traffic-flow", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  if (!isTomTomConfigured(TOMTOM_API_KEY)) {
    return res.json({ flowSegmentData: null });
  }

  try {
    const response = await axios.get(TOMTOM_FLOW_URL, {
      params: { point: `${lat},${lon}`, key: TOMTOM_API_KEY },
    });
    res.json(response.data);
  } catch (error) {
    console.warn("TomTom traffic unavailable:", error.response?.data?.message || error.message);
    res.json({ flowSegmentData: null });
  }
});

/**
 * POST /route-traffic-summary
 * Samples multiple points along a route path and returns a congestion summary.
 */
router.post("/route-traffic-summary", async (req, res) => {
  const { path } = req.body || {};
  if (!Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: "path array required" });
  }

  if (!isTomTomConfigured(TOMTOM_API_KEY)) {
    return res.json({ available: false, message: "TomTom key not configured" });
  }

  const sampleCount = Math.min(5, path.length);
  const step = Math.floor(path.length / sampleCount);
  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    const point = path[i * step];
    if (point) samples.push({ lat: point[0], lng: point[1] });
  }

  const results = await Promise.all(
    samples.map(async ({ lat, lng }) => {
      try {
        const resp = await axios.get(TOMTOM_FLOW_URL, {
          params: { point: `${lat},${lng}`, key: TOMTOM_API_KEY },
          timeout: 5000,
        });
        const seg = resp.data?.flowSegmentData;
        if (!seg) return null;
        return {
          lat,
          lng,
          currentSpeed: seg.currentSpeed,
          freeFlowSpeed: seg.freeFlowSpeed,
          currentTravelTime: seg.currentTravelTime,
          freeFlowTravelTime: seg.freeFlowTravelTime,
          congestionRatio: seg.currentSpeed / (seg.freeFlowSpeed || 1),
          delayRatio: seg.currentTravelTime / (seg.freeFlowTravelTime || 1),
        };
      } catch {
        return null;
      }
    })
  );

  const valid = results.filter(Boolean);
  if (valid.length === 0) return res.json({ available: false, message: "No TomTom data" });

  const worstCongestion = Math.min(...valid.map((r) => r.congestionRatio));
  const avgDelay = valid.reduce((s, r) => s + r.delayRatio, 0) / valid.length;
  const worstPoint = valid.find((r) => r.congestionRatio === worstCongestion);

  let level = "clear";
  let message = "Traffic is flowing normally";
  if (worstCongestion < 0.4) {
    level = "severe";
    message = `Heavy congestion — traffic at ${Math.round(worstCongestion * 100)}% of normal speed. Expect ~${Math.round((avgDelay - 1) * 100)}% delay`;
  } else if (worstCongestion < 0.65) {
    level = "moderate";
    message = `Moderate congestion — traffic at ${Math.round(worstCongestion * 100)}% of normal speed. Expect ~${Math.round((avgDelay - 1) * 100)}% delay`;
  } else if (worstCongestion < 0.85) {
    level = "light";
    message = `Light traffic slowdown — ${Math.round((1 - worstCongestion) * 100)}% below free-flow speed`;
  }

  res.json({
    available: true,
    level,
    message,
    worstCongestionRatio: worstCongestion,
    avgDelayRatio: avgDelay,
    worstPoint,
    sampleCount: valid.length,
  });
});

/**
 * GET /traffic
 * Fetches Google Directions API traffic data for origin → destination.
 */
router.get("/traffic", async (req, res) => {
  const { origin, destination } = req.query;
  try {
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: { origin, destination, departure_time: "now", key: GOOGLE_API_KEY },
      }
    );
    const leg = response.data.routes[0].legs[0];
    res.json({
      normalDuration: leg.duration.value,
      trafficDuration: leg.duration_in_traffic.value,
    });
  } catch (error) {
    console.error("Traffic API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch traffic data" });
  }
});

module.exports = router;
