import L from "leaflet";

export const pointerIcon = (color = "#2563eb") =>
  L.divIcon({
    className: "custom-pointer",
    html: `
      <div style="
        width: 14px; height: 14px; background: ${color};
        border-radius: 50%; border: 2px solid white;
        box-shadow: 0 0 8px rgba(0,0,0,0.4);
      "></div>`,
    iconSize: [14, 14],
  });

export const stopIcon = (color, completed, pulse) =>
  L.divIcon({
    className: "stop-icon-wrapper",
    html: completed
      ? `<div class="stop-icon stop-check ${pulse ? "stop-pulse" : ""}" style="border-color:${color}; color:${color};">✓</div>`
      : `<div class="stop-icon" style="border-color:${color}; background:${color};"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export const originIcon = (color) =>
  L.divIcon({
    className: "origin-icon-wrapper",
    html: `<div class="origin-icon" style="border-color:${color}; color:${color};">W</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export const disruptionMarkerIcon = (disruption) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:#dc2626;color:white;border-radius:8px;padding:4px 7px;
          font-size:11px;font-weight:700;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);border:2px solid white;
          max-width:160px;overflow:hidden;text-overflow:ellipsis;
        ">${disruption.icon} ${disruption.label}</div>
        <div style="
          background:#dc2626;width:24px;height:24px;border-radius:50%;
          border:3px solid white;margin-top:3px;
          box-shadow:0 0 0 3px #dc2626,0 0 0 6px rgba(220,38,38,0.3);
          animation:disruptionPulse 1s infinite;
        "></div>
        <style>
          @keyframes disruptionPulse {
            0%{box-shadow:0 0 0 3px #dc2626,0 0 0 6px rgba(220,38,38,0.3);}
            50%{box-shadow:0 0 0 3px #dc2626,0 0 0 12px rgba(220,38,38,0);}
            100%{box-shadow:0 0 0 3px #dc2626,0 0 0 6px rgba(220,38,38,0.3);}
          }
        </style>
      </div>`,
    iconSize: [160, 54],
    iconAnchor: [80, 54],
  });