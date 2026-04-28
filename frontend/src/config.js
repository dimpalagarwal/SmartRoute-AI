// Central URL configuration for the frontend.
//
// HOW IT WORKS:
//   • Local dev  → VITE_BACKEND_URL is empty → API calls use relative paths
//                  (e.g. "/ai-risk") which Vite proxies to localhost:5001
//   • Production → VITE_BACKEND_URL = "https://your-backend.onrender.com"
//                  → API calls use the full URL so no proxy is needed
//
// Set these in frontend/.env.local (dev) or your hosting dashboard (prod).

export const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL  || "";
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || "";

/**
 * Build a full API URL.
 * Usage: api("/ai-risk")  →  "" + "/ai-risk"  (dev, proxied)
 *                         →  "https://api.example.com/ai-risk"  (prod)
 */
export function api(path) {
  return `${BACKEND_URL}${path}`;
}

/**
 * Build a full frontend URL (e.g. for tracking links).
 * Usage: frontendUrl("/driver/abc")
 */
export function frontendUrl(path) {
  return `${FRONTEND_URL}${path}`;
}