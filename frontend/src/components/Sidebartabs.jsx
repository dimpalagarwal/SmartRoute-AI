import GeocodeInput from "./GeocodeInput";
import StopETATimeline from "./Stopetatimeline";
import DisruptionPanel from "./Disruptionpanel";

// ─── Fleet Tab ───────────────────────────────────────────────────────────────
export function FleetTab({
  vehicleDisplayStates, vehicles, vehicleColorMap,
  routeStates, stopETAs, isSimulationStarted,
  driverDisruptions, reroutingDrivers, rerouteResults, rerouteComparisons,
  updateVehicle, removeVehicle, addVehicle, copyTrackingLink,
  simulateDisruptionForDriver, rerouteDriver, analyzeOptimizedRoutes,
}) {
  return (
    <section className="card panel">
      <h3 className="panel-title">Fleet Setup</h3>
      <div className="grid">
        {vehicleDisplayStates.map((vehicle) => (
          <article className="vehicle-card" key={vehicle.id}>
            <span className="vehicle-stripe" style={{ background: vehicle.color }} />
            <div className="vehicle-body">
              {/* Input fields */}
              <div className="grid mono">
                <input
                  className="text-input"
                  placeholder="Vehicle number"
                  value={vehicle.vehicleNumber}
                  onChange={(e) => updateVehicle(vehicle.id, "vehicleNumber", e.target.value)}
                />
                <input
                  className="text-input"
                  placeholder="Driver name"
                  value={vehicle.driverName}
                  onChange={(e) => updateVehicle(vehicle.id, "driverName", e.target.value)}
                />
                <GeocodeInput
                  id={`start-${vehicle.id}`}
                  label="Start location"
                  placeholder="Search location"
                  selectedLocation={vehicle.startLocation}
                  onSelect={(location) => updateVehicle(vehicle.id, "startLocation", location)}
                  onClear={() => updateVehicle(vehicle.id, "startLocation", null)}
                />
                <span className={`gps-indicator ${vehicle.gpsLive ? "live" : "simulated"}`}>
                  <span className="gps-dot" />
                  <span>{vehicle.gpsLive ? "Live GPS" : "Simulated"}</span>
                </span>
              </div>

              {/* ETA Timeline */}
              {isSimulationStarted && (
                <StopETATimeline etas={stopETAs[vehicle.id]} routeState={routeStates[vehicle.id]} />
              )}

              {/* Action buttons */}
              <div className="vehicle-actions">
                <button className="pill-btn secondary" onClick={() => copyTrackingLink(vehicle.id)}>
                  {vehicle.copiedUntil > Date.now() ? "Copied!" : "Copy Tracking Link"}
                </button>
                <button className="pill-btn danger" disabled={vehicles.length === 1} onClick={() => removeVehicle(vehicle.id)}>
                  Remove
                </button>

                {isSimulationStarted && (
                  <DisruptionPanel
                    vehicleId={vehicle.id}
                    disruption={driverDisruptions[vehicle.id]}
                    isRerouting={!!reroutingDrivers[vehicle.id]}
                    rerouteResult={rerouteResults[vehicle.id]}
                    rerouteComparison={rerouteComparisons[vehicle.id]}
                    onSimulate={() => simulateDisruptionForDriver(vehicle.id)}
                    onReroute={() => rerouteDriver(vehicle.id)}
                  />
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="pill-btn secondary" onClick={addVehicle} disabled={vehicles.length >= 4}>
          Add Vehicle ({vehicles.length}/4)
        </button>
        <button
          className="pill-btn primary"
          onClick={analyzeOptimizedRoutes}
          disabled={!isSimulationStarted}
          title={!isSimulationStarted ? "Run Optimize All Routes first" : "Analyze risk on optimized routes"}
        >
          🔍 Analyze Route Risk
        </button>
      </div>
      {!isSimulationStarted && (
        <p style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 8 }}>
          Click "Optimize All Routes" first to enable route analysis.
        </p>
      )}
    </section>
  );
}

// ─── Deliveries Tab ──────────────────────────────────────────────────────────
export function DeliveriesTab({
  stops, vehicles, vehicleColorMap, newStop, setNewStop,
  assignMode, setAssignMode, addStop, removeStop, setStops,
}) {
  return (
    <section className="card panel">
      <div className="assignment-toggle mono">
        <button className={`toggle-btn ${assignMode === "auto" ? "active" : ""}`} onClick={() => setAssignMode("auto")}>
          Auto-assign
        </button>
        <button className={`toggle-btn ${assignMode === "manual" ? "active" : ""}`} onClick={() => setAssignMode("manual")}>
          Manual assign
        </button>
      </div>

      <div className="grid mono">
        <input
          className="text-input"
          placeholder="Stop name"
          value={newStop.name}
          onChange={(e) => setNewStop((prev) => ({ ...prev, name: e.target.value }))}
        />
        <GeocodeInput
          id="stop-location"
          label="Delivery location"
          placeholder="Search location"
          selectedLocation={newStop.location}
          onSelect={(location) => setNewStop((prev) => ({ ...prev, location }))}
          onClear={() => setNewStop((prev) => ({ ...prev, location: null }))}
        />
        {assignMode === "manual" && (
          <select
            className="select-input mono"
            value={newStop.assignedVehicleId}
            onChange={(e) => setNewStop((prev) => ({ ...prev, assignedVehicleId: e.target.value }))}
          >
            <option value="">Select vehicle</option>
            {vehicles.map((v, idx) => (
              <option key={v.id} value={v.id}>V{idx + 1} - {v.vehicleNumber || "Unnamed"}</option>
            ))}
          </select>
        )}
        <button className="pill-btn primary" onClick={addStop}>Add Stop</button>
      </div>

      <ul className="stop-list">
        {stops.map((stop, idx) => {
          const ownerId = assignMode === "auto"
            ? vehicles[idx % Math.max(vehicles.length, 1)]?.id
            : stop.assignedVehicleId || vehicles[0]?.id;
          const color = ownerId ? vehicleColorMap[ownerId] : "#9ca3af";
          return (
            <li className="stop-row" key={stop.id}>
              <span className="stop-dot" style={{ background: color }} />
              <div className="stop-info mono">
                <strong>{stop.name}</strong>
                <span>{stop.location?.placeName || "Location not selected"}</span>
              </div>
              {assignMode === "manual" && (
                <select
                  className="select-input mono"
                  value={stop.assignedVehicleId || ""}
                  onChange={(e) =>
                    setStops((prev) =>
                      prev.map((item) =>
                        item.id === stop.id ? { ...item, assignedVehicleId: e.target.value } : item
                      )
                    )
                  }
                >
                  {vehicles.map((v, vIdx) => (
                    <option key={v.id} value={v.id}>V{vIdx + 1}</option>
                  ))}
                </select>
              )}
              <button className="pill-btn danger" onClick={() => removeStop(stop.id)}>Remove</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────
export function AnalyticsTab({ vehicleDisplayStates }) {
  return (
    <section className="card panel">
      <table className="analytics-table mono">
        <thead>
          <tr>
            <th>Color</th>
            <th>Vehicle</th>
            <th>Driver</th>
            <th>Progress</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {vehicleDisplayStates.map((vehicle) => (
            <tr key={vehicle.id}>
              <td><span className="color-badge" style={{ background: vehicle.color }} /></td>
              <td>{vehicle.vehicleNumber || "-"}</td>
              <td>{vehicle.driverName || "-"}</td>
              <td>{vehicle.completedStops}/{vehicle.totalStops}</td>
              <td>
                <span className={`status-pill ${vehicle.status.toLowerCase().replace(" ", "-")}`}>
                  {vehicle.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}