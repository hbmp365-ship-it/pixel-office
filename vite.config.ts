import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend runs on Vite in dev; WebSocket traffic is proxied to the
// local Worker (`wrangler dev`) so the game behaves exactly like production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:8787',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
})
