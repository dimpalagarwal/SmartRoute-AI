import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // In production builds VITE_BACKEND_URL is set; locally we proxy to localhost:5001
  const backendTarget = env.VITE_BACKEND_URL || 'http://localhost:5001'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/optimize-route':       backendTarget,
        '/vehicle-locations':    backendTarget,
        '/update-location':      backendTarget,
        '/traffic':              backendTarget,
        '/traffic-flow':         backendTarget,
        '/driver':               backendTarget,
        '/ai-risk':              backendTarget,
        '/simulate-disruption':  backendTarget,
        '/active-disruption':    backendTarget,
        '/smart-reroute':        backendTarget,
        '/reroute-vehicle':      backendTarget,
        '/route-traffic-summary': backendTarget,
      },
    },
  }
})
