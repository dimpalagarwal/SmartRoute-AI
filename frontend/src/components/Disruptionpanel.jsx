/**
 * DisruptionPanel
 * Renders per-driver disruption UI: alert banner, analyzing state,
 * route comparison table, active-route badge, and Simulate / Re-Route buttons.
 */
export default function DisruptionPanel({
  vehicleId,
  disruption,
  isRerouting,
  rerouteResult,
  rerouteComparison,
  onSimulate,
  onReroute,
}) {
  return (
    <div style={{ width: "100%", display: "grid", gap: "6px" }}>
      {/* Disruption alert banner */}
      {disruption && (
        <div style={{
          background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: "8px", padding: "8px 10px", fontSize: "0.68rem",
          color: "#991b1b", lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>{disruption.icon} {disruption.label}</div>
          <div style={{ color: "#b91c1c" }}>📍 Blocked: <strong>{disruption.streetName}</strong></div>
          <div style={{ color: "#dc2626", marginTop: 2, fontSize: "0.62rem" }}>
            Route ahead is impassable — re-route required
          </div>
        </div>
      )}

      {/* Rerouting in progress */}
      {isRerouting && (
        <div style={{
          background: "#eff6ff", border: "1px solid #bfdbfe",
          borderRadius: "8px", padding: "7px 10px", fontSize: "0.68rem",
          color: "#1d4ed8", lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>🔍 Analyzing candidate routes...</div>
          <div style={{ color: "#3b82f6" }}>Fetching routes → scoring risk → picking safest</div>
        </div>
      )}

      {/* Route comparison panel */}
      {rerouteComparison && !isRerouting && !disruption && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 8px", fontSize: "0.64rem" }}>
          <div style={{ fontWeight: 700, marginBottom: 5, fontSize: "0.68rem", color: "#0f172a" }}>📊 Route options analyzed:</div>
          {rerouteComparison.map((c, i) => {
            const riskColor = c.riskLevel === "Low" ? "#15803d" : c.riskLevel === "Medium" ? "#b45309" : "#991b1b";
            const riskBg = c.riskLevel === "Low" ? "#ecfdf3" : c.riskLevel === "Medium" ? "#fffbeb" : "#fef2f2";
            const emoji = c.riskLevel === "Low" ? "🟢" : c.riskLevel === "Medium" ? "🟡" : "🔴";
            const isWinner = i === 0;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "4px 5px", marginBottom: "3px", borderRadius: "6px",
                background: isWinner ? riskBg : "transparent",
                border: isWinner ? `1px solid ${riskColor}40` : "1px solid transparent",
              }}>
                <span style={{ minWidth: 14, fontWeight: 700, color: isWinner ? riskColor : "#94a3b8" }}>
                  {isWinner ? "✓" : `${i + 1}.`}
                </span>
                <span style={{ flex: 1, color: "#334155" }}>{c.distKm}km · ~{c.durMin}min</span>
                <span style={{ background: riskBg, color: riskColor, borderRadius: "999px", padding: "1px 6px", fontWeight: 600, fontSize: "0.6rem" }}>
                  {emoji} {c.riskLevel}
                </span>
                {isWinner && <span style={{ color: riskColor, fontSize: "0.6rem", fontWeight: 700 }}>← selected</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Active route success badge */}
      {rerouteResult && !disruption && !isRerouting && (() => {
        const riskColor = rerouteResult.riskLevel === "Low" ? "#15803d" : rerouteResult.riskLevel === "Medium" ? "#b45309" : "#991b1b";
        const riskBg = rerouteResult.riskLevel === "Low" ? "#dcfce7" : rerouteResult.riskLevel === "Medium" ? "#fef9c3" : "#fee2e2";
        const emoji = rerouteResult.riskLevel === "Low" ? "🟢" : rerouteResult.riskLevel === "Medium" ? "🟡" : "🔴";
        return (
          <div style={{
            background: "#ecfdf3", border: "1px solid #86efac", borderRadius: "8px",
            padding: "5px 8px", fontSize: "0.66rem", color: "#15803d",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>✅ Active: {rerouteResult.distance}km · ~{rerouteResult.duration}min</span>
            <span style={{ fontWeight: 700, background: riskBg, color: riskColor, borderRadius: "999px", padding: "1px 6px", fontSize: "0.6rem" }}>
              {emoji} {rerouteResult.riskLevel} Risk
            </span>
          </div>
        );
      })()}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          className="pill-btn"
          style={{
            flex: 1,
            background: (disruption || isRerouting) ? "#e5e7eb" : "#7c3aed",
            color: (disruption || isRerouting) ? "#9ca3af" : "#fff",
            fontSize: "0.68rem", padding: "7px 6px",
            cursor: (disruption || isRerouting) ? "not-allowed" : "pointer",
          }}
          disabled={!!disruption || isRerouting}
          onClick={onSimulate}
        >
          🚨 Simulate
        </button>
        <button
          className="pill-btn"
          style={{
            flex: 1,
            background: isRerouting ? "#d1d5db" : disruption ? "#15803d" : "#e5e7eb",
            color: (!disruption && !isRerouting) ? "#9ca3af" : "#fff",
            fontSize: "0.68rem", padding: "7px 6px",
            cursor: disruption && !isRerouting ? "pointer" : "not-allowed",
          }}
          disabled={!disruption || isRerouting}
          onClick={onReroute}
        >
          {isRerouting ? "⏳ Analyzing..." : "🔄 Re-Route"}
        </button>
      </div>
    </div>
  );
}