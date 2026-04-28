import { Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import "./fixLeafletIcon";

// MapView renders ONLY Polyline overlays — no MapContainer.
// Must be placed INSIDE an existing <MapContainer> in App.jsx.
// One instance is rendered per vehicle for per-vehicle risk analysis.
function MapView({ routeCoords, vehicleColor, vehicleNumber, onHoverChange }) {
  const [route, setRoute] = useState([]);
  const [segmentWeather, setSegmentWeather] = useState([]);
  const [segmentTraffic, setSegmentTraffic] = useState([]);
  const [aiRisks, setAiRisks] = useState([]);

  // Fetch road geometry via OSRM between src and dest
  useEffect(() => {
    if (!routeCoords?.src || !routeCoords?.dest) return;
    setRoute([]); // reset on new coords

    const fetchRoute = async () => {
      try {
        const { src, dest } = routeCoords;
        const res = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${src[1]},${src[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`
        );
        const coords = res.data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
        setRoute(coords);
      } catch (err) {
        console.error("Route fetch error:", err);
      }
    };

    fetchRoute();
  }, [routeCoords]);

  // Fetch traffic via backend proxy (hides API key)
  useEffect(() => {
    if (!route || route.length === 0) return;

    const fetchTraffic = async () => {
      try {
        const points = [];
        for (let i = 0; i < route.length; i += 50) points.push(route[i]);

        // Probe with first point — if TomTom unavailable, skip all remaining calls
        const probe = await axios.get(
          `/traffic-flow?lat=${points[0][0]}&lon=${points[0][1]}`
        ).catch(() => null);

        if (!probe?.data?.flowSegmentData) {
          setSegmentTraffic([]);
          return;
        }

        const responses = await Promise.all(
          points.map(([lat, lon]) =>
            axios.get(`/traffic-flow?lat=${lat}&lon=${lon}`).catch(() => null)
          )
        );

        const trafficData = responses
          .map((res, i) => {
            const seg = res?.data?.flowSegmentData;
            if (!seg) return null;
            return {
              lat: points[i][0],
              lon: points[i][1],
              currentSpeed: seg.currentSpeed,
              freeFlowSpeed: seg.freeFlowSpeed,
              currentTime: seg.currentTravelTime,
              freeTime: seg.freeFlowTravelTime,
            };
          })
          .filter(Boolean);

        setSegmentTraffic(trafficData);
      } catch (err) {
        console.error("Traffic fetch error:", err);
      }
    };

    fetchTraffic();
  }, [route]);

  // Fetch weather for sampled route points
  useEffect(() => {
    if (!route || route.length === 0) return;

    const fetchSegmentWeather = async () => {
      try {
        const points = [];
        for (let i = 0; i < route.length; i += 50) points.push(route[i]);

        const responses = await Promise.all(
          points.map(([lat, lon]) =>
            axios
              .get(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${import.meta.env.VITE_WEATHER_API_KEY}&units=metric`
              )
              .catch(() => null)
          )
        );

        const weatherData = responses
          .map((res, i) => {
            const nextHour = res?.data?.list?.[0];
            if (!nextHour) return null;
            return {
              lat: points[i][0],
              lon: points[i][1],
              condition: nextHour.weather[0].main,
              temp: nextHour.main.temp,
            };
          })
          .filter(Boolean);

        setSegmentWeather(weatherData);
      } catch (err) {
        console.error("Segment weather error:", err);
      }
    };

    fetchSegmentWeather();
  }, [route]);

  function getNearestTraffic(lat, lng) {
    if (segmentTraffic.length === 0) return null;
    let closest = null;
    let minDist = Infinity;
    segmentTraffic.forEach((t) => {
      const dist = Math.hypot(lat - t.lat, lng - t.lon);
      if (dist < minDist) { minDist = dist; closest = t; }
    });
    return closest;
  }

  function getNearestWeather(lat, lng) {
    if (segmentWeather.length === 0) return null;
    let closest = segmentWeather[0];
    let minDist = Infinity;
    segmentWeather.forEach((w) => {
      const dist = Math.hypot(lat - w.lat, lng - w.lon);
      if (dist < minDist) { minDist = dist; closest = w; }
    });
    return closest;
  }

  useEffect(() => {
  const generateRisks = async () => {
  if (!route.length) return;

  const segments = createSegments(route);

  // const limitedSegments = segments.slice(0, 2); // 🔥 LIMIT

  // const results = [];

  const res = await getRisk(segments[0]); // only first segment
  setAiRisks(new Array(segments.length).fill(res));

  // setAiRisks(results);
};

  generateRisks();
}, [route, segmentWeather, segmentTraffic]);

  // function getRisk(segment) {
  //   const [lat, lng] = segment[0];
  //   const reasons = [];
  //   let score = 0;

  //   const traffic = getNearestTraffic(lat, lng);
  //   const weather = getNearestWeather(lat, lng);

  //   let congestion = 1;
  //   let delayRatio = 1;

  //   if (traffic) {
  //     congestion = traffic.currentSpeed / traffic.freeFlowSpeed;
  //     delayRatio = traffic.currentTime / traffic.freeTime;

  //     if (congestion < 0.4 || delayRatio > 1.8) {
  //       score += 2;
  //       reasons.push("Heavy congestion → major delay expected");
  //     } else if (congestion < 0.7 || delayRatio > 1.3) {
  //       score += 1;
  //       reasons.push("Moderate traffic → possible slowdown");
  //     } else {
  //       reasons.push("Traffic is smooth");
  //     }
  //   }

  //   if (weather?.condition === "Rain") {
  //     score += 1.5;
  //     reasons.push("Rain expected soon → delays likely");
  //   }
  //   if (weather?.condition === "Rain" && congestion > 0.7) {
  //     score += 1;
  //     reasons.push("Traffic may worsen due to upcoming rain");
  //   }
  //   if (delayRatio > 1.1) {
  //     score += 0.5;
  //     reasons.push("Slight delay building up");
  //   }

  //   if (score >= 2.5) return { color: "red", reasons, nearestWeather: weather };
  //   if (score >= 1.5) return { color: "#eab308", reasons, nearestWeather: weather };
  //   return {
  //     color: "green",
  //     reasons: reasons.length ? reasons : ["Low delay expected"],
  //     nearestWeather: weather,
  //   };
  // }

  async function getRisk(segment) {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();

  const [lat, lng] = segment[0];

  const traffic = getNearestTraffic(lat, lng);
  const weather = getNearestWeather(lat, lng);

  if (!weather) {
    return { color: "green", reasons: ["No data"] };
  }

  try {
    const res = await axios.post("http://localhost:5001/ai-risk", {
      traffic: traffic
        ? {
            currentSpeed: traffic.currentSpeed,
            freeFlowSpeed: traffic.freeFlowSpeed,
            delayRatio: traffic.currentTime / traffic.freeTime,
          }
        : null,
      weather,
      time: `${hour}:${minutes}`,
    });

    const ai = res.data;

    if (ai.risk === "High") {
      return { color: "red", reasons: ai.reasons, nearestWeather: weather };
    }
    if (ai.risk === "Medium") {
      return { color: "#eab308", reasons: ai.reasons, nearestWeather: weather };
    }

    return { color: "green", reasons: ai.reasons, nearestWeather: weather };
  }catch (err) {
    console.error("AI ERROR FRONTEND:", err);
      return { color: "green", reasons: ["AI failed"], nearestWeather: weather };
    }
}

  function createSegments(coords) {
    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
      segments.push([coords[i], coords[i + 1]]);
    }
    return segments;
  }

  return (
    <>
      {route.length > 0 &&
        createSegments(route).map((segment, i) => {
          const result = aiRisks[i] || {
  color: "green",
  reasons: ["Analyzing..."],
};
          return (
            <Polyline
              key={`risk-${routeCoords?.vehicleId || "v"}-${i}`}
              positions={segment}
              pathOptions={{ color: result.color, weight: 7, opacity: 0.9 }}
              eventHandlers={{
                mouseover: (e) => {
                  if (!onHoverChange) return;
                  const weather = getNearestWeather(e.latlng.lat, e.latlng.lng);
                  onHoverChange({
                    color: result.color,
                    reasons: Array.isArray(result.reasons) && result.reasons.length
  ? result.reasons
  : ["No sufficient data"],
                    weather,
                    vehicleColor,
                    vehicleNumber,
                  });
                },
                mouseout: () => onHoverChange && onHoverChange(null),
              }}
            />
          );
        })}
    </>
  );
}

export default MapView;
