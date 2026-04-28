import { HEADER_HEIGHT } from "../constants";

const APP_STYLES = `
@import url("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap");

:root {
  --bg: #ffffff;
  --panel: #f8f7f4;
  --text: #0f1b35;
  --border: #e5e7eb;
  --muted: #64748b;
  --navy: #0f1b35;
  --green: #22c55e;
  --radius: 12px;
  --shadow: 0 10px 26px rgba(15, 27, 53, 0.08);
}

* { box-sizing: border-box; }
html, body, #root { margin: 0; width: 100%; height: 100%; }
body { font-family: "Outfit", sans-serif; background: var(--bg); color: var(--text); }
.mono { font-family: "IBM Plex Mono", monospace; }
.app { min-height: 100vh; background: linear-gradient(180deg, #ffffff 0%, #fcfcfb 100%); }

/* ── Header ──────────────────────────────────────────────────────────────── */
.top-header {
  position: fixed; inset: 0 0 auto 0; height: 64px; z-index: 1500;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px; background: #fff; border-bottom: 1px solid var(--border);
}
.brand { font-size: 1.2rem; font-weight: 700; color: var(--navy); }
.header-center { display: flex; gap: 10px; align-items: center; color: var(--muted); font-size: 0.8rem; }
.header-actions { display: flex; gap: 8px; }

/* ── Live Pill ───────────────────────────────────────────────────────────── */
.live-pill {
  border-radius: 999px; border: 1px solid #d1d5db;
  padding: 4px 10px; font-size: 0.72rem; color: #6b7280;
}
.live-pill.active {
  border-color: #86efac; color: #15803d; background: #ecfdf3;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.35); }
  70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

/* ── Buttons ─────────────────────────────────────────────────────────────── */
.pill-btn {
  border: 0; border-radius: 999px; padding: 9px 14px;
  font-family: "Outfit", sans-serif; font-weight: 600;
  transition: all 200ms ease; cursor: pointer;
}
.pill-btn:hover { transform: translateY(-1px); }
.pill-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.pill-btn.secondary { background: #eef2f7; color: var(--text); }
.pill-btn.primary { background: var(--navy); color: #fff; }
.pill-btn.danger { background: #fef2f2; color: #b91c1c; padding: 6px 10px; font-size: 0.72rem; }

/* ── Layout ──────────────────────────────────────────────────────────────── */
.layout { display: flex; min-height: 100vh; padding-top: ${HEADER_HEIGHT}px; }

.sidebar {
  width: 370px; min-width: 370px; max-width: 370px;
  border-right: 1px solid var(--border); padding: 12px;
  height: calc(100vh - ${HEADER_HEIGHT}px); overflow-y: auto;
}
.sidebar::-webkit-scrollbar { width: 0; height: 0; }
.sidebar { scrollbar-width: none; }

/* ── Cards ───────────────────────────────────────────────────────────────── */
.card { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }

/* ── Tabs ────────────────────────────────────────────────────────────────── */
.tabs { display: flex; padding: 4px; gap: 6px; }
.tab-btn { flex: 1; border: 0; border-radius: 999px; padding: 9px; background: transparent; color: var(--muted); font-weight: 600; transition: all 200ms ease; cursor: pointer; }
.tab-btn.active { background: #fff; color: var(--text); }

.panel { margin-top: 10px; padding: 12px; }
.panel-title { margin: 0 0 10px; font-size: 0.95rem; }
.grid { display: grid; gap: 8px; }

/* ── Inputs ──────────────────────────────────────────────────────────────── */
.text-input, .select-input {
  border: 1px solid #d9dde6; border-radius: 10px;
  padding: 9px 10px; font-size: 0.8rem; background: #fff; color: var(--text);
}

/* ── Vehicle Card ─────────────────────────────────────────────────────────── */
.vehicle-card { border: 1px solid var(--border); border-radius: var(--radius); background: #fff; display: flex; flex-direction: row; gap: 10px; padding: 10px; }
.vehicle-stripe { border-radius: 999px; width: 4px; flex-shrink: 0; align-self: stretch; }
.vehicle-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.vehicle-actions { display: flex; flex-wrap: wrap; gap: 6px; align-content: start; }
.vehicle-actions .pill-btn { min-width: 132px; }

/* ── GPS Indicator ───────────────────────────────────────────────────────── */
.gps-indicator { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 8px; font-size: 0.66rem; width: fit-content; }
.gps-indicator.live { color: #15803d; background: #ecfdf3; }
.gps-indicator.simulated { color: #6b7280; background: #f3f4f6; }
.gps-dot { width: 8px; height: 8px; border-radius: 999px; }
.gps-indicator.live .gps-dot { background: var(--green); animation: pulse 1.5s infinite; }
.gps-indicator.simulated .gps-dot { background: #9ca3af; }

/* ── Assignment Toggle ───────────────────────────────────────────────────── */
.assignment-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.toggle-btn { border: 1px solid #d9dde6; border-radius: 999px; background: #fff; color: var(--muted); padding: 7px 10px; cursor: pointer; transition: all 200ms ease; }
.toggle-btn.active { background: var(--navy); color: #fff; border-color: var(--navy); }

/* ── Stop List ───────────────────────────────────────────────────────────── */
.stop-list { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; max-height: 280px; overflow-y: auto; }
.stop-row { border: 1px solid var(--border); border-radius: 10px; background: #fff; padding: 8px; display: flex; align-items: center; gap: 8px; }
.stop-dot { width: 10px; height: 10px; border-radius: 999px; }
.stop-info { flex: 1; min-width: 0; display: grid; gap: 2px; }
.stop-info strong { font-size: 0.8rem; }
.stop-info span { font-size: 0.72rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* ── Analytics Table ─────────────────────────────────────────────────────── */
.analytics-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
.analytics-table th, .analytics-table td { text-align: left; border-bottom: 1px solid var(--border); padding: 8px 6px; }
.color-badge { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
.status-pill { border-radius: 999px; padding: 4px 8px; font-size: 0.66rem; }
.status-pill.idle { background: #f3f4f6; color: #6b7280; }
.status-pill.en-route { background: #ecfdf3; color: #15803d; }
.status-pill.completed { background: #eaf2ff; color: #1d4ed8; }

/* ── Map ─────────────────────────────────────────────────────────────────── */
.map-wrap { flex: 1; min-width: 0; padding: 12px; }
.map-panel { position: relative; height: calc(100vh - ${HEADER_HEIGHT + 24}px); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); }
.map-panel.theme-dark .leaflet-tile { filter: brightness(0.84) contrast(1.06); }
.leaflet-map { width: 100%; height: 100%; }

/* ── Tile Switcher ───────────────────────────────────────────────────────── */
.tile-switcher { position: absolute; top: 10px; right: 10px; z-index: 700; background: rgba(255,255,255,0.95); border: 1px solid var(--border); border-radius: 999px; padding: 4px; display: flex; gap: 4px; box-shadow: var(--shadow); }
.tile-btn { border: 0; background: transparent; border-radius: 999px; padding: 5px 10px; font-size: 0.72rem; color: var(--muted); cursor: pointer; }
.tile-btn.active { background: var(--navy); color: #fff; }

/* ── Geocode Input ───────────────────────────────────────────────────────── */
.geocode-wrap { position: relative; display: grid; gap: 6px; }
.geocode-wrap label { font-size: 0.7rem; color: var(--muted); }
.geocode-results { list-style: none; margin: 0; padding: 4px; border: 1px solid var(--border); border-radius: 10px; background: #fff; box-shadow: var(--shadow); max-height: 170px; overflow-y: auto; }
.geocode-results button { width: 100%; border: 0; background: transparent; text-align: left; border-radius: 8px; padding: 8px; cursor: pointer; font-size: 0.74rem; }
.geocode-results button:hover { background: #f3f4f6; }
.confirmed { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; border: 1px solid #bbf7d0; background: #ecfdf3; color: #15803d; padding: 4px 10px; font-size: 0.68rem; width: fit-content; max-width: 100%; }
.confirmed span:last-child { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; }
.loading-geocode { position: absolute; right: 10px; top: 34px; transform: translateY(-50%); font-size: 0.72rem; color: var(--muted); }

/* ── Map Icons ───────────────────────────────────────────────────────────── */
.vehicle-icon-wrapper, .stop-icon-wrapper, .origin-icon-wrapper { background: transparent; border: 0; }
.vehicle-icon { width: 36px; height: 36px; border-radius: 999px; display: grid; place-items: center; font-size: 1.2rem; filter: drop-shadow(0 6px 8px rgba(15, 27, 53, 0.26)); }
.stop-icon { width: 18px; height: 18px; border-radius: 999px; border: 2px solid; background: #fff; }
.stop-check { display: grid; place-items: center; font-size: 0.72rem; font-weight: 700; background: #fff; }
.stop-pulse { animation: stopPulse 500ms ease; }
@keyframes stopPulse {
  0% { transform: scale(1); } 50% { transform: scale(1.35); } 100% { transform: scale(1); }
}
.origin-icon { width: 24px; height: 24px; border-radius: 999px; border: 2px dashed; display: grid; place-items: center; font-size: 0.62rem; font-weight: 700; background: #fff; }
.popup-grid { display: grid; gap: 4px; font-size: 0.74rem; }

/* ── Responsive ──────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .layout { flex-direction: column; }
  .sidebar { width: 100%; min-width: 100%; max-width: 100%; height: auto; border-right: 0; border-bottom: 1px solid var(--border); }
  .map-panel { height: 66vh; }
}
@media (max-width: 760px) {
  .top-header { height: auto; flex-wrap: wrap; gap: 8px; padding: 10px 12px; }
  .layout { padding-top: 88px; }
  .header-center { width: 100%; }
}
`;

export default APP_STYLES;