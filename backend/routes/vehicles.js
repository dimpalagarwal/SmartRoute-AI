const express = require("express");
const router = express.Router();

// In-memory store for live vehicle GPS locations
const vehicleLocations = {};

/**
 * POST /update-location
 * Stores the current GPS location for a vehicle.
 */
router.post("/update-location", (req, res) => {
  const { vehicleId, lat, lng, timestamp } = req.body || {};

  if (!vehicleId || typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "vehicleId, lat, and lng are required" });
  }

  vehicleLocations[vehicleId] = {
    vehicleId,
    lat,
    lng,
    timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
  };

  res.json({ success: true });
});

/**
 * GET /vehicle-locations
 * Returns all known vehicle locations.
 */
router.get("/vehicle-locations", (req, res) => {
  res.json(vehicleLocations);
});

/**
 * GET /driver/:vehicleId
 * Serves a simple GPS tracking page for drivers.
 */
router.get("/driver/:vehicleId", (req, res) => {
  const { vehicleId } = req.params;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  res.send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SmartRoute AI Driver Tracker</title>
    <style>
      :root { --navy: #0f1b35; --green: #22c55e; --red: #ef4444; }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: #ffffff; color: var(--navy);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        padding: 24px;
      }
      .wrap {
        width: 100%; max-width: 420px; text-align: center;
        border: 1px solid #e5e7eb; border-radius: 14px; padding: 22px;
        box-shadow: 0 12px 30px rgba(15, 27, 53, 0.08);
      }
      h1 { margin: 0 0 8px; font-size: 1.4rem; }
      .vehicle-id { margin: 0; font-size: 1.2rem; font-weight: 700; }
      .status {
        margin: 18px auto 8px; display: inline-flex; align-items: center;
        gap: 8px; border-radius: 999px; border: 1px solid #d1d5db;
        padding: 8px 12px; font-size: 1rem;
      }
      .dot { width: 10px; height: 10px; border-radius: 999px; }
      .ok { color: #15803d; border-color: #86efac; background: #ecfdf3; }
      .ok .dot { background: var(--green); animation: pulse 1.4s infinite; }
      .err { color: #b91c1c; border-color: #fca5a5; background: #fef2f2; }
      .err .dot { background: var(--red); }
      .coords { margin-top: 14px; font-size: 0.95rem; color: #475569; }
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
      <div id="status" class="status"><span class="dot"></span><span>Initializing GPS...</span></div>
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
          body: JSON.stringify({ vehicleId, lat: latest.latitude, lng: latest.longitude, timestamp: Date.now() }),
        }).then(() => setStatus("Sharing location ✓", true))
          .catch(() => setStatus("Error sending location", false));
      }

      if (!navigator.geolocation) {
        setStatus("GPS not supported on this device", false);
      } else {
        navigator.geolocation.watchPosition(
          (position) => {
            latest = position.coords;
            coordsEl.textContent = "Lat " + latest.latitude.toFixed(5) + " | Lng " + latest.longitude.toFixed(5);
            setStatus("Sharing location ✓", true);
          },
          () => setStatus("GPS access denied or unavailable", false),
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
        setInterval(postLocation, 4000);
      }
    </script>
  </body>
</html>`);
});

module.exports = router;
