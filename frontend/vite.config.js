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
    },
  },
})
