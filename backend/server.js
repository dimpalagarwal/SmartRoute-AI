const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
// const { GoogleGenerativeAI } = require("@google/generative-ai");

console.log("KEY:", process.env.GEMINI_API_KEY);

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();

// In-memory store for live vehicle GPS locations
const vehicleLocations = {};


app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5001"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Explicitly handle preflight OPTIONS requests for all routes
app.options("*", cors());

app.use(express.json());

/* -------------------- ROOT ROUTE (BOTH KEPT) -------------------- */
app.get("/", (req, res) => {
  res.send("API is running");
});

/* -------------------- TRAFFIC FLOW (TomTom proxy) -------------------- */
app.get("/traffic-flow", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  const TOMTOM_KEY = process.env.TOMTOM_API_KEY;

  // No key configured — return empty payload so frontend skips traffic scoring
  if (!TOMTOM_KEY || TOMTOM_KEY === "YOUR_TOMTOM_API_KEY_HERE") {
    return res.json({ flowSegmentData: null });
  }

  try {
    const response = await axios.get(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`,
      { params: { point: `${lat},${lon}`, key: TOMTOM_KEY } }
    );
    res.json(response.data);
  } catch (error) {
    // TomTom failed (bad key, rate limit, etc.) — return empty so UI still works
    console.warn("TomTom traffic unavailable:", error.response?.data?.message || error.message);
    res.json({ flowSegmentData: null });
  }
});

/* -------------------- ROUTE TRAFFIC SUMMARY -------------------- */
// Samples multiple points along a route path and returns a congestion summary.
// Used by the frontend to fire proactive delay notifications.
app.post("/route-traffic-summary", async (req, res) => {
  const { path, vehicleId, driverName } = req.body || {};
  if (!Array.isArray(path) || path.length < 2) {
    return res.status(400).json({ error: "path array required" });
  }

  const TOMTOM_KEY = process.env.TOMTOM_API_KEY;
  if (!TOMTOM_KEY || TOMTOM_KEY === "YOUR_TOMTOM_API_KEY_HERE") {
    return res.json({ available: false, message: "TomTom key not configured" });
  }

  // Sample up to 5 evenly-spaced points along the route
  const sampleCount = Math.min(5, path.length);
  const step = Math.floor(path.length / sampleCount);
  const samples = [];
  for (let i = 0; i < sampleCount; i++) {
    const point = path[i * step];
    if (point) samples.push({ lat: point[0], lng: point[1] });
  }

  const results = await Promise.all(samples.map(async ({ lat, lng }) => {
    try {
      const resp = await axios.get(
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json`,
        { params: { point: `${lat},${lng}`, key: TOMTOM_KEY }, timeout: 5000 }
      );
      const seg = resp.data?.flowSegmentData;
      if (!seg) return null;
      return {
        lat, lng,
        currentSpeed: seg.currentSpeed,
        freeFlowSpeed: seg.freeFlowSpeed,
        currentTravelTime: seg.currentTravelTime,
        freeFlowTravelTime: seg.freeFlowTravelTime,
        congestionRatio: seg.currentSpeed / (seg.freeFlowSpeed || 1),
        delayRatio: seg.currentTravelTime / (seg.freeFlowTravelTime || 1),
      };
    } catch { return null; }
  }));

  const valid = results.filter(Boolean);
  if (valid.length === 0) return res.json({ available: false, message: "No TomTom data" });

  const worstCongestion = Math.min(...valid.map(r => r.congestionRatio));
  const avgDelay = valid.reduce((s, r) => s + r.delayRatio, 0) / valid.length;
  const worstPoint = valid.find(r => r.congestionRatio === worstCongestion);

  // Classify overall congestion
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

/* -------------------- TRAFFIC API -------------------- */
app.get("/traffic", async (req, res) => {
  try {
    const { origin, destination } = req.query;

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin,
          destination,
          departure_time: "now",
          key: process.env.GOOGLE_API_KEY,
        },
      }
    );

    console.log("GOOGLE RESPONSE:", response.data);

    const route = response.data.routes[0].legs[0];

    res.json({
      normalDuration: route.duration.value,
      trafficDuration: route.duration_in_traffic.value,
    });
  } catch (error) {
    console.error("FULL ERROR:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch traffic data" });
  }
});

/* -------------------- OPTIMIZE ROUTE -------------------- */
app.post("/optimize-route", (req, res) => {
  const locations = req.body;

  if (!Array.isArray(locations) || locations.length === 0) {
    return res.status(400).json({ error: "Body must be a non-empty array of locations" });
  }

  function distance(p1, p2) {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
    );
  }

  function optimizeRoute(locs) {
    const visited = [];
    const route = [];

    let current = locs[0];
    route.push(current);
    visited.push(current.name);

    while (route.length < locs.length) {
      let nearest = null;
      let minDist = Infinity;

      for (const loc of locs) {
        if (!visited.includes(loc.name)) {
          const dist = distance(current, loc);
          if (dist < minDist) {
            minDist = dist;
            nearest = loc;
          }
        }
      }

      if (!nearest) break; // safety guard
      route.push(nearest);
      visited.push(nearest.name);
      current = nearest;
    }

    return route;
  }

  const result = optimizeRoute(locations);
  res.json(result);
});

/* -------------------- UPDATE LOCATION -------------------- */
app.post("/update-location", (req, res) => {
  const { vehicleId, lat, lng, timestamp } = req.body || {};

  if (!vehicleId || typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "vehicleId, lat, and lng are required" });
    return;
  }

  vehicleLocations[vehicleId] = {
    vehicleId,
    lat,
    lng,
    timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
  };

  res.json({ success: true });
});

/* -------------------- VEHICLE LOCATIONS -------------------- */
app.get("/vehicle-locations", (req, res) => {
  res.json(vehicleLocations);
});

app.post("/ai-risk", async (req, res) => {
  console.log("🔥 AI ROUTE HIT");

  try {
    const { traffic, weather, time } = req.body;

    const prompt = `
Analyze traffic risk:

Traffic:
- Current Speed: ${traffic?.currentSpeed ?? "Not available"}
- Free Flow Speed: ${traffic?.freeFlowSpeed ?? "Not available"}
- Delay Ratio: ${traffic?.delayRatio ?? "Not available"}

Weather:
- Condition: ${weather?.condition ?? "Unknown"}
- Temperature: ${weather?.temp ?? "Unknown"}

Time: ${time}

Return STRICT JSON:
{
  "risk": "Low | Medium | High",
  "reasons": ["reason1", "reason2"]
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }
    );

    const text =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;

    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        risk: "Low",
        reasons: [text],
      };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Gemini Error FULL:", err.response?.data || err.message);

    res.json({
      risk: "Low",
      reasons: ["AI unavailable"],
    });
  }
});


/* ---- shared risk scorer (no self-HTTP call) ---- */
async function scoreRouteRisk(path, weather, disruption) {
  // disruption = { type, streetName } — used to add forced high-risk on blocked street
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const now = new Date();
  const timeStr = `${now.getHours()}:${now.getMinutes()}`;

  const disruptionNote = disruption
    ? `\nActive disruption on route: ${disruption.type} at ${disruption.streetName}. This route ${disruption.avoidStreet ? "AVOIDS" : "PASSES THROUGH"} that street.`
    : "";

  const prompt = `Analyze delivery route risk:
Weather: ${weather?.condition ?? "Clear"}, ${weather?.temp ?? 28}°C
Time: ${timeStr}
Route length: ${path.length} points${disruptionNote}

Return STRICT JSON only, no markdown:
{"risk":"Low","reasons":["reason1"]}
Valid risk values: Low, Medium, High`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { timeout: 12000 }
    );
    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { risk: parsed.risk || "Low", reasons: parsed.reasons || [] };
  } catch {
    // fallback: score by disruption type if AI fails
    if (disruption && !disruption.avoidStreet) return { risk: "High", reasons: ["Disruption on this route"] };
    return { risk: "Low", reasons: ["Weather clear, no known hazards"] };
  }
}

/* ---- fetch weather for a lat/lng point ---- */
async function fetchWeather(lat, lng) {
  const WEATHER_KEY = "4473613b70aa7c0e9f28baa5a5889ffe";
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${WEATHER_KEY}&units=metric`,
      { timeout: 6000 }
    );
    const item = res.data?.list?.[0];
    if (!item) return null;
    return { condition: item.weather[0].main, temp: Math.round(item.main.temp) };
  } catch { return null; }
}

/* ---- reverse-geocode a lat/lng to a street name ---- */
async function reverseGeocode(lat, lng) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { timeout: 5000, headers: { "User-Agent": "SmartRouteAI/1.0" } }
    );
    const addr = res.data?.address;
    return addr?.road || addr?.suburb || addr?.city_district || "Current route";
  } catch { return "Current route"; }
}

/* -------------------- ACTIVE DISRUPTIONS (in-memory) -------------------- */
const activeDisruptions = {};

/* -------------------- SIMULATE DISRUPTION -------------------- */
// Accepts the driver's current path so we can pick a real street on their route
app.post("/simulate-disruption", async (req, res) => {
  const { vehicleId, currentPath, simIndex } = req.body || {};
  if (!vehicleId) return res.status(400).json({ error: "vehicleId required" });

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

  const d = DISRUPTION_TYPES[Math.floor(Math.random() * DISRUPTION_TYPES.length)];

  // Pick a point ~30% ahead on the remaining path so it's clearly "ahead"
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

/* -------------------- SMART REROUTE -------------------- */
// 1. Gets 3 candidate routes via OSRM (using different intermediate waypoints)
// 2. Scores each with Gemini AI risk (weather + disruption context)
// 3. Returns ranked candidates + chosen (safest & shortest)
app.post("/smart-reroute", async (req, res) => {
  const { currentPosition, remainingStops, disruption } = req.body || {};
  if (!currentPosition || !remainingStops?.length) {
    return res.status(400).json({ error: "currentPosition and remainingStops required" });
  }

  try {
    const start = currentPosition; // { lat, lng }
    const stops = remainingStops;  // [{ id, lat, lng }]

    // Build waypoint string for OSRM: start → stop1 → stop2 → ...
    const makeCoordStr = (startLat, startLng) => {
      const pts = [
        { lat: startLat, lng: startLng },
        ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      ];
      return pts.map((p) => `${p.lng},${p.lat}`).join(";");
    };

    // Fetch weather once at the midpoint (shared across candidates)
    const midStop = stops[Math.floor(stops.length / 2)];
    const weather = await fetchWeather(midStop.lat, midStop.lng)
      || await fetchWeather(start.lat, start.lng)
      || { condition: "Clear", temp: 28 };

    // --- Strategy: get 3 distinct candidate routes ---
    // Route A: straight OSRM (shortest path, likely uses blocked road)
    // Route B: OSRM with a small northern detour waypoint injected
    // Route C: OSRM with a small southern detour waypoint injected
    // This reliably forces OSRM onto different road networks
    const MID_LAT = (start.lat + (stops[stops.length - 1]?.lat || start.lat)) / 2;
    const MID_LNG = (start.lng + (stops[stops.length - 1]?.lng || start.lng)) / 2;
    const OFFSET = 0.015; // ~1.5km detour

    const candidateConfigs = [
      { label: "Route A (Shortest)", coordStr: makeCoordStr(start.lat, start.lng), avoidStreet: false },
      { label: "Route B (North bypass)", coordStr: (() => {
          const detour = { lat: MID_LAT + OFFSET, lng: MID_LNG - OFFSET * 0.5 };
          const pts = [
            `${start.lng},${start.lat}`,
            `${detour.lng},${detour.lat}`,
            ...stops.map((s) => `${s.lng},${s.lat}`)
          ];
          return pts.join(";");
        })(), avoidStreet: true },
      { label: "Route C (South bypass)", coordStr: (() => {
          const detour = { lat: MID_LAT - OFFSET, lng: MID_LNG + OFFSET * 0.5 };
          const pts = [
            `${start.lng},${start.lat}`,
            `${detour.lng},${detour.lat}`,
            ...stops.map((s) => `${s.lng},${s.lat}`)
          ];
          return pts.join(";");
        })(), avoidStreet: true },
    ];

    const allCandidates = [];

    await Promise.all(candidateConfigs.map(async (cfg) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${cfg.coordStr}?overview=full&geometries=geojson`;
        const osrmRes = await axios.get(url, { timeout: 10000 });
        const route = osrmRes.data?.routes?.[0];
        if (!route) return;

        const path = route.geometry.coordinates.map((c) => [c[1], c[0]]);
        const distKm = Math.round(route.distance / 100) / 10;
        const durMin = Math.round(route.duration / 60);

        // Deduplicate: skip if same distance (within 300m) as existing candidate
        const key = Math.round(route.distance / 300);
        if (!allCandidates.find((c) => c.key === key)) {
          allCandidates.push({ label: cfg.label, path, distKm, durMin, key, avoidStreet: cfg.avoidStreet });
        }
      } catch (e) {
        console.warn("OSRM candidate failed:", cfg.label, e.message);
      }
    }));

    if (allCandidates.length === 0) {
      return res.status(500).json({ error: "No routes returned from OSRM — check coordinates" });
    }

    // Sort by distance (shortest first)
    allCandidates.sort((a, b) => a.distKm - b.distKm);
    const top = allCandidates.slice(0, 3);

    // Score each candidate with AI risk (sequential to avoid rate-limiting Gemini)
    const scored = [];
    for (const candidate of top) {
      let risk = "Low";
      let reasons = ["No significant hazards"];

      // Route A (shortest, direct) — if disruption exists, it likely goes through the blocked street
      if (!candidate.avoidStreet && disruption) {
        risk = "High";
        reasons = [`Passes through ${disruption.streetName} where ${disruption.type} is active`];
      } else {
        // Try AI scoring; fall back gracefully
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

      let riskScore = risk === "High" ? 3 : risk === "Medium" ? 2 : 1;
      const maxDist = top[top.length - 1].distKm || 1;
      const combinedScore = riskScore * 10 + (candidate.distKm / maxDist);

      scored.push({ ...candidate, riskLevel: risk, riskReasons: reasons, weather, riskScore, combinedScore });
    }

    // Best = lowest combined score (risk first, then distance)
    scored.sort((a, b) => a.combinedScore - b.combinedScore);

    res.json({ success: true, candidates: scored, chosen: scored[0] });

  } catch (err) {
    console.error("Smart reroute ERROR:", err.message);
    res.status(500).json({ error: "Smart rerouting failed", details: err.message });
  }
});

/* -------------------- DRIVER PAGE -------------------- */
app.get("/driver/:vehicleId", (req, res) => {
  const { vehicleId } = req.params;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartRoute AI Driver Tracker</title>
    <style>
      :root {
        --navy: #0f1b35;
        --green: #22c55e;
        --red: #ef4444;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #ffffff;
        color: var(--navy);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 24px;
      }
      .wrap {
        width: 100%;
        max-width: 420px;
        text-align: center;
        border: 1px solid #e5e7eb;
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 12px 30px rgba(15, 27, 53, 0.08);
      }
      h1 {
        margin: 0 0 8px;
        font-size: 1.4rem;
      }
      .vehicle-id {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
      }
      .status {
        margin: 18px auto 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        padding: 8px 12px;
        font-size: 1rem;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
      }
      .ok {
        color: #15803d;
        border-color: #86efac;
        background: #ecfdf3;
      }
      .ok .dot {
        background: var(--green);
        animation: pulse 1.4s infinite;
      }
      .err {
        color: #b91c1c;
        border-color: #fca5a5;
        background: #fef2f2;
      }
      .err .dot {
        background: var(--red);
      }
      .coords {
        margin-top: 14px;
        font-size: 0.95rem;
        color: #475569;
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
        70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <h1>SmartRoute AI</h1>
      <p class="vehicle-id">Vehicle: ${vehicleId}</p>
      <div id="status" class="status">
        <span class="dot"></span>
        <span>Initializing GPS...</span>
      </div>
      <div id="coords" class="coords">Waiting for location...</div>
    </main>

    <script>
      const vehicleId = ${JSON.stringify(vehicleId)};
      const statusEl = document.getElementById("status");
      const coordsEl = document.getElementById("coords");
      let latest = null;

      function setStatus(message, ok) {
        statusEl.className = ok ? "status ok" : "status err";
        statusEl.innerHTML = '<span class="dot"></span><span>' + message + '</span>';
      }

      function postLocation() {
        if (!latest) return;

        fetch("/update-location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId,
            lat: latest.latitude,
            lng: latest.longitude,
            timestamp: Date.now(),
          }),
        }).then(() => {
          setStatus("Sharing location ✓", true);
        }).catch(() => {
          setStatus("Error sending location", false);
        });
      }

      if (!navigator.geolocation) {
        setStatus("GPS not supported on this device", false);
      } else {
        navigator.geolocation.watchPosition(
          (position) => {
            latest = position.coords;
            coordsEl.textContent =
              "Lat " + latest.latitude.toFixed(5) + " | Lng " + latest.longitude.toFixed(5);
            setStatus("Sharing location ✓", true);
          },
          () => {
            setStatus("GPS access denied or unavailable", false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000,
          }
        );

        setInterval(postLocation, 4000);
      }
    </script>
  </body>
</html>`);
});
/* -------------------- SERVER START -------------------- */
const PORT = 5001;

app.get("/list-models", async (req, res) => {
  console.log("📡 Listing models...");

  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
    );

    res.json(response.data);
  } catch (err) {
    console.error("Model fetch error:", err.response?.data || err.message);
    res.send("Error fetching models");
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);

  
});