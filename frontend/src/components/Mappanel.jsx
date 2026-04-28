import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import MapView from "./MapView";
import { TILE_OPTIONS, VEHICLE_COLORS } from "../constants";
import { pointerIcon, stopIcon, originIcon, disruptionMarkerIcon } from "../utils/mapIcons";

// ── Fit map to route bounds ─────────────────────────────────────────────────
function FitMapBounds({ routeStates, fitToken }) {
  const map = useMap();
  useEffect(() => {
    if (!fitToken) return;
    const allCoords = Object.values(routeStates).flatMap((state) => state.path || []);
    if (allCoords.length === 0) return;
    if (allCoords.length === 1) { map.setView(allCoords[0], 12); return; }
    map.fitBounds(allCoords, { padding: [50, 50] });
  }, [fitToken, map, routeStates]);
  return null;
}

export default function MapPanel({
  tileTheme, setTileTheme,
  routeStates, vehicles, vehicleColorMap, assignedStopsByVehicle,
  allRouteCoords, fitToken, routeHoverInfo, setRouteHoverInfo,
  driverDisruptions, gpsLocations, isGpsLive,
}) {
  const tileConfig = TILE_OPTIONS[tileTheme];

  return (
    <main className="map-wrap">
      <div className={`map-panel ${tileTheme === "dark" ? "theme-dark" : ""}`}>
        {/* Tile switcher */}
        <div className="tile-switcher mono">
          {Object.entries(TILE_OPTIONS).map(([key, option]) => (
            <button
              key={key}
              className={`tile-btn ${tileTheme === key ? "active" : ""}`}
              onClick={() => setTileTheme(key)}
            >
              {option.name}
            </button>
          ))}
        </div>

        {/* Route risk hover tooltip */}
        {routeHoverInfo && (
          <div style={{
            position: "absolute", top: 56, left: "50%", transform: "translateX(-50%)",
            background: "#fff", padding: "12px 16px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)", borderRadius: 10,
            zIndex: 1000, width: 270, fontSize: "0.8rem", pointerEvents: "none",
            borderLeft: `4px solid ${routeHoverInfo.vehicleColor || "#0f1b35"}`,
          }}>
            {routeHoverInfo.vehicleNumber && (
              <p style={{ fontWeight: 700, marginBottom: 4, color: routeHoverInfo.vehicleColor || "#0f1b35" }}>
                🚗 {routeHoverInfo.vehicleNumber}
              </p>
            )}
            <p style={{ fontWeight: 700, marginBottom: 6 }}>
              {routeHoverInfo.color === "red" && "🔴 High Risk"}
              {routeHoverInfo.color === "#eab308" && "🟡 Medium Risk"}
              {routeHoverInfo.color === "green" && "🟢 Low Risk"}
            </p>
            <p>🌡️ Temp: {routeHoverInfo.weather?.temp !== undefined ? `${routeHoverInfo.weather.temp}°C` : "Unavailable"}</p>
            <ul style={{ paddingLeft: 16, margin: "4px 0" }}>
              {routeHoverInfo.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p style={{ fontWeight: 600, marginTop: 6 }}>
              {routeHoverInfo.color === "red" && "❌ Avoid this route"}
              {routeHoverInfo.color === "#eab308" && "⚠️ Moderate delay possible"}
              {routeHoverInfo.color === "green" && "✅ Safe to travel"}
            </p>
          </div>
        )}

        <MapContainer className="leaflet-map" center={[28.6139, 77.209]} zoom={12} preferCanvas>
          <TileLayer url={tileConfig.url} attribution={tileConfig.attribution} />
          <FitMapBounds routeStates={routeStates} fitToken={fitToken} />

          {/* Risk analysis overlays */}
          {allRouteCoords.map((entry) => (
            <MapView
              key={`analysis-${entry.vehicleId}`}
              routeCoords={entry}
              vehicleColor={vehicleColorMap[entry.vehicleId]}
              vehicleNumber={entry.vehicleNumber}
              onHoverChange={setRouteHoverInfo}
            />
          ))}

          {/* Warehouse / origin markers */}
          {vehicles.map((vehicle, idx) => {
            if (!vehicle.startLocation) return null;
            const color = VEHICLE_COLORS[idx] || "#94a3b8";
            return (
              <Marker key={`origin-${vehicle.id}`} position={[vehicle.startLocation.lat, vehicle.startLocation.lng]} icon={originIcon(color)}>
                <Popup>
                  <strong>Warehouse</strong>
                  <div>{vehicle.vehicleNumber || "Vehicle"}</div>
                </Popup>
              </Marker>
            );
          })}

          {/* Stop markers */}
          {vehicles.map((vehicle) => {
            const color = vehicleColorMap[vehicle.id];
            const state = routeStates[vehicle.id];
            return (assignedStopsByVehicle[vehicle.id] || []).map((stop) => {
              if (!stop.location) return null;
              const completed = state?.completedStopIds?.includes(stop.id);
              const pulse = completed && Date.now() < (state?.pulseUntil?.[stop.id] || 0);
              return (
                <Marker key={`stop-${vehicle.id}-${stop.id}`} position={[stop.location.lat, stop.location.lng]} icon={stopIcon(color, completed, pulse)}>
                  <Popup>{stop.name}</Popup>
                </Marker>
              );
            });
          })}

          {/* Route polylines */}
          {vehicles.map((vehicle) => {
            const state = routeStates[vehicle.id];
            if (!state?.path?.length) return null;
            const color = vehicleColorMap[vehicle.id];
            const traveled = state.path.slice(0, state.simIndex + 1);
            const remaining = state.path.slice(state.simIndex);
            return (
              <div key={`path-${vehicle.id}`}>
                {traveled.length > 1 && (
                  <Polyline positions={traveled} pathOptions={{ color, weight: 6, opacity: 0.25, lineCap: "round" }} />
                )}
                {remaining.length > 1 && (
                  <Polyline positions={remaining} pathOptions={{ color, weight: 6, opacity: 1, lineCap: "round" }} />
                )}
              </div>
            );
          })}

          {/* Vehicle position markers */}
          {vehicles.map((vehicle) => {
            const state = routeStates[vehicle.id];
            if (!state) return null;
            const gpsLive = isGpsLive(vehicle.id);
            const displayPos = gpsLive
              ? [gpsLocations[vehicle.id].lat, gpsLocations[vehicle.id].lng]
              : state.simPosition;
            if (!displayPos) return null;

            const nextStopId = state.orderedStopIds?.find((id) => !state.completedStopIds.includes(id));
            const nextStop = (assignedStopsByVehicle[vehicle.id] || []).find((s) => s.id === nextStopId);

            return (
              <Marker key={`vehicle-${vehicle.id}`} position={displayPos} icon={pointerIcon("#2563eb")}>
                <Popup>
                  <div className="popup-grid mono">
                    <strong>{vehicle.vehicleNumber || "Vehicle"}</strong>
                    <span>Driver: {vehicle.driverName || "Unassigned"}</span>
                    <span>Coordinates: {displayPos[0].toFixed(5)}, {displayPos[1].toFixed(5)}</span>
                    <span>Next stop: {nextStop?.name || "None"}</span>
                    <span>Completed: {state.completedStopIds.length}/{(assignedStopsByVehicle[vehicle.id] || []).length}</span>
                    <span>GPS: {gpsLive ? "Live" : "Simulated"}</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Disruption markers */}
          {vehicles.map((vehicle) => {
            const disruption = driverDisruptions[vehicle.id];
            if (!disruption?.disruptionLat || !disruption?.disruptionLng) return null;
            return (
              <Marker
                key={`disruption-${vehicle.id}`}
                position={[disruption.disruptionLat, disruption.disruptionLng]}
                icon={disruptionMarkerIcon(disruption)}
              >
                <Popup>
                  <div style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                    <strong>{disruption.icon} {disruption.label}</strong><br />
                    📍 <strong>{disruption.streetName}</strong><br />
                    <span style={{ color: "#dc2626" }}>⛔ Road blocked — re-route required</span>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </main>
  );
}