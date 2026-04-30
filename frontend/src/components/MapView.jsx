import { Polyline } from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import "./fixLeafletIcon";
import { api } from "../config";

// MapView renders ONLY Polyline overlays — no MapContainer.
// Must be placed INSIDE an existing <MapContainer> in App.jsx.
// One instance is rendered per vehicle for per-vehicle risk analysis.
function MapView({ routeCoords, vehicleColor, vehicleNumber, onHoverChange }) {
  const [route, setRoute] = useState([]);
  const [segmentWeather, setSegmentWeather] = useState([]);
  const [segmentTraffic, setSegmentTraffic] = useState([]);
  const [aiRisks, setAiRisks] = useState([]);
  const SAMPLE_STRIDE = 20;

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
        for (let i = 0; i < route.length; i += SAMPLE_STRIDE) points.push(route[i]);

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
        for (let i = 0; i < route.length; i += SAMPLE_STRIDE) points.push(route[i]);

        const responses = await Promise.all(
          points.map(([lat, lon]) =>
            axios
              .get(
                `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${import.meta.env.OPENWEATHER_API_KEY}&units=metric`
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

  function scoreLocalRisk(segment) {
    const [lat, lng] = segment[0];
    const traffic = getNearestTraffic(lat, lng);
    const weather = getNearestWeather(lat, lng);
    const reasons = [];
    let color = "green";

    if (traffic) {
      const speedRatio = traffic.freeFlowSpeed ? traffic.currentSpeed / traffic.freeFlowSpeed : 1;
      const delayRatio = traffic.freeTime ? traffic.currentTime / traffic.freeTime : 1;

      if (speedRatio <= 0.45 || delayRatio >= 1.8) {
        color = "red";
        reasons.push("Heavy congestion detected");
      } else if (speedRatio <= 0.75 || delayRatio >= 1.2) {
        color = "#eab308";
        reasons.push("Traffic is slowing this segment");
      } else {
        reasons.push("Traffic is flowing normally");
      }
    }

    if (weather?.condition && String(weather.condition).toLowerCase().includes("rain")) {
      reasons.push("Rain may slow vehicles");
      if (color === "green") color = "#eab308";
    }

    if (typeof weather?.temp === "number" && weather.temp >= 34) {
      reasons.push("High temperature may add delay");
    }

    return { color, reasons: reasons.length ? reasons : ["Low risk route segment"], nearestWeather: weather };
  }

  useEffect(() => {
    const generateRisks = async () => {
      if (!route.length) return;

      const segments = createSegments(route);
      if (segments.length === 0) {
        setAiRisks([]);
        return;
      }

      const results = await Promise.all(segments.map((segment) => getRisk(segment)));
      setAiRisks(results);
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

    const fallback = scoreLocalRisk(segment);

    if (!weather) {
      return fallback;
    }

  try {
    const res = await axios.post(api("/ai-risk"), {
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
    const finalReasons = Array.isArray(ai.reasons) && ai.reasons.length ? ai.reasons : fallback.reasons;

    return { color: fallback.color, reasons: finalReasons, nearestWeather: weather };
  }catch (err) {
    console.error("AI ERROR FRONTEND:", err);
      return fallback;
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
          const result = aiRisks[i] || scoreLocalRisk(segment);
          return (
            <Polyline
              key={`risk-${routeCoords?.vehicleId || "v"}-${i}`}
              positions={segment}
              pathOptions={{ color: result.color, weight: 7, opacity: 0.9, interactive: true }}
              eventHandlers={{
                mouseover: (e) => {
                    if (!onHoverChange) return;
                    const weather = getNearestWeather(e.latlng.lat, e.latlng.lng);

                    const doHover = async (w) => {
                      // If the precomputed result has no reasons and we now have a live weather sample,
                      // re-query the AI endpoint for more accurate reasons specific to this hover point.
                      let reasons = Array.isArray(result.reasons) && result.reasons.length ? result.reasons : ["No sufficient data"];
                      if (reasons.length === 1 && (reasons[0] === "No data" || reasons[0] === "No sufficient data") && w) {
                        try {
                          const now = new Date();
                          const res = await axios.post("http://localhost:5001/ai-risk", {
                            traffic: (getNearestTraffic(e.latlng.lat, e.latlng.lng))
                              ? {
                                  currentSpeed: getNearestTraffic(e.latlng.lat, e.latlng.lng).currentSpeed,
                                  freeFlowSpeed: getNearestTraffic(e.latlng.lat, e.latlng.lng).freeFlowSpeed,
                                  delayRatio: getNearestTraffic(e.latlng.lat, e.latlng.lng).currentTime / getNearestTraffic(e.latlng.lat, e.latlng.lng).freeTime,
                                }
                              : null,
                            weather: w,
                            time: `${now.getHours()}:${now.getMinutes()}`,
                          });
                          const ai = res.data;
                          reasons = Array.isArray(ai.reasons) && ai.reasons.length ? ai.reasons : reasons;
                        } catch (err) {
                          // ignore and keep fallback reasons
                        }
                      }

                      onHoverChange({
                        color: result.color,
                        reasons,
                        weather: w,
                        vehicleColor,
                        vehicleNumber,
                      });
                    };

                    // If we don't have sampled weather, try fetching current weather for the hovered point
                    if (!weather && import.meta.env.OPENWEATHER_API_KEY) {
                      (async () => {
                        try {
                          const r = await axios.get(
                            `https://api.openweathermap.org/data/2.5/weather?lat=${e.latlng.lat}&lon=${e.latlng.lng}&appid=${import.meta.env.OPENWEATHER_API_KEY}&units=metric`
                          );
                          const w = { temp: r.data.main.temp, condition: r.data.weather[0].main };
                          doHover(w);
                        } catch (err) {
                          doHover(null);
                        }
                      })();
                    } else {
                      doHover(weather);
                    }
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
