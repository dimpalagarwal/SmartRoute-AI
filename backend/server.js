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