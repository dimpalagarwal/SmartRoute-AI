import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/optimize-route': 'http://localhost:5001',
      '/vehicle-locations': 'http://localhost:5001',
      '/update-location': 'http://localhost:5001',
      '/traffic': 'http://localhost:5001',
      '/traffic-flow': 'http://localhost:5001',
      '/driver': 'http://localhost:5001',
      '/ai-risk': 'http://localhost:5001',
      '/simulate-disruption': 'http://localhost:5001',
      '/active-disruption': 'http://localhost:5001',
      '/smart-reroute': 'http://localhost:5001',
      '/reroute-vehicle': 'http://localhost:5001',
      '/route-traffic-summary': 'http://localhost:5001',
    },
  },
})