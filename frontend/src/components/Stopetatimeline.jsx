/**
 * StopETATimeline
 * Shows a per-stop schedule with arrival times, distance, and done/next state.
 */
export default function StopETATimeline({ etas, routeState }) {
  if (!etas?.length) return null;

  const startTime = new Date();
  const fmtTime = (ms) =>
    new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      background: "#f8fafc", border: "1px solid #e2e8f0",
      borderRadius: 10, padding: "8px 10px", fontSize: "0.7rem",
    }}>
      <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        🕐 Stop Schedule
        <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.63rem" }}>
          Depart {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {etas.map((eta, i) => {
        const done = routeState?.completedStopIds?.includes(eta.stopId);
        const isNext = !done && etas.slice(0, i).every((e) => routeState?.completedStopIds?.includes(e.stopId));
        return (
          <div key={eta.stopId} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 0",
            borderBottom: i < etas.length - 1 ? "1px solid #f1f5f9" : "none",
            opacity: done ? 0.5 : 1,
          }}>
            {/* Timeline dot */}
            <div style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: done ? "#22c55e" : isNext ? "#f59e0b" : "#cbd5e1",
              border: `2px solid ${done ? "#22c55e" : isNext ? "#f59e0b" : "#cbd5e1"}`,
              boxShadow: isNext ? "0 0 0 3px rgba(245,158,11,0.2)" : "none",
            }} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{
                fontWeight: isNext ? 700 : 500,
                color: done ? "#94a3b8" : "#1e293b",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                textDecoration: done ? "line-through" : "none",
              }}>
                {eta.order}. {eta.name}
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.62rem" }}>{eta.distKm} km from start</div>
            </div>
            <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              <div style={{ fontWeight: 700, color: done ? "#94a3b8" : isNext ? "#f59e0b" : "#0f172a", fontSize: "0.72rem" }}>
                {done ? "✓ Done" : fmtTime(eta.etaMs)}
              </div>
              {!done && <div style={{ color: "#94a3b8", fontSize: "0.6rem" }}>~{eta.etaMins} min</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}