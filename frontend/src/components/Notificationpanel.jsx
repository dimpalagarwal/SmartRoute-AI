import { useEffect } from "react";

export default function NotificationPanel({
  notifs, notifOpen, setNotifOpen, markAllRead, clearNotif, clearAllNotifs,
}) {
  // Close on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (!e.target.closest("[data-notif-panel]")) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen, setNotifOpen]);

  const unread = notifs.filter((n) => !n.read).length;
  const hasDanger = notifs.some((n) => !n.read && n.type === "danger");

  return (
    <div data-notif-panel="1" style={{ position: "relative" }}>
      <button
        onClick={() => { setNotifOpen((p) => !p); markAllRead(); }}
        style={{
          border: "none",
          background: hasDanger ? "#fef2f2" : unread > 0 ? "#eff6ff" : "#f1f5f9",
          borderRadius: "50%", width: 38, height: 38, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
          boxShadow: hasDanger ? "0 0 0 2px #fca5a5" : unread > 0 ? "0 0 0 2px #bfdbfe" : "none",
          transition: "all 200ms",
        }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={hasDanger ? "#dc2626" : unread > 0 ? "#2563eb" : "#64748b"}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span style={{
            position: "absolute", top: 2, right: 2,
            background: hasDanger ? "#dc2626" : "#2563eb", color: "white",
            borderRadius: "999px", minWidth: 16, height: 16,
            fontSize: "0.58rem", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px", lineHeight: 1,
            animation: hasDanger ? "pulse 1s infinite" : "none",
            border: "1.5px solid white",
          }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {notifOpen && (
        <div data-notif-panel="1" style={{
          position: "absolute", top: 46, right: 0, width: 320,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
          boxShadow: "0 12px 40px rgba(0,0,0,0.15)", zIndex: 3000,
          overflow: "hidden", fontFamily: "Outfit, sans-serif",
        }}>
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>Notifications</span>
              {notifs.length > 0 && (
                <span style={{
                  background: "#e2e8f0", color: "#64748b", borderRadius: 999,
                  padding: "1px 7px", fontSize: "0.7rem", fontWeight: 600,
                }}>{notifs.length}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {notifs.length > 0 && (
                <button onClick={clearAllNotifs} style={{ border: "none", background: "none", fontSize: "0.72rem", color: "#94a3b8", cursor: "pointer" }}>
                  Clear all
                </button>
              )}
              <button onClick={() => setNotifOpen(false)} style={{ border: "none", background: "none", fontSize: "1rem", color: "#94a3b8", cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {notifs.length === 0 ? (
              <div style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "0.8rem" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔕</div>
                No notifications yet
              </div>
            ) : (
              notifs.map((n) => {
                const isDanger = n.type === "danger";
                const isSuccess = n.type === "success";
                const isWarning = n.type === "warning";
                const leftColor = isDanger ? "#dc2626" : isSuccess ? "#16a34a" : isWarning ? "#d97706" : "#3b82f6";
                const bg = isDanger ? "#fef2f2" : isSuccess ? "#f0fdf4" : isWarning ? "#fffbeb" : "#f8fafc";
                const mins = Math.floor((Date.now() - n.ts) / 60000);
                const timeLabel = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
                return (
                  <div key={n.id} style={{
                    display: "flex", background: n.read ? "#fff" : bg,
                    borderBottom: "1px solid #f1f5f9", position: "relative", transition: "background 300ms",
                  }}>
                    <div style={{ width: 4, background: n.read ? "#e2e8f0" : leftColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: "10px 12px 8px 10px" }}>
                      <div style={{ fontSize: "0.76rem", color: "#1e293b", lineHeight: 1.5, fontWeight: isDanger && !n.read ? 600 : 400 }}>
                        {n.msg}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: 3 }}>{timeLabel}</div>
                    </div>
                    <button onClick={() => clearNotif(n.id)} style={{ border: "none", background: "none", color: "#cbd5e1", fontSize: "0.8rem", cursor: "pointer", padding: "8px 10px 0 0", alignSelf: "flex-start" }}>✕</button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}