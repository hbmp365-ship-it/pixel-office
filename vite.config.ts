import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The frontend runs on Vite in dev; WebSocket traffic is proxied to the
// local Worker (`wrangler dev`) so the game behaves exactly like production.
export default defineConfig({
  plugins: [react()],
  server: {
    // Fixed port: fail instead of silently moving to another port when taken.
    port: 1004,
    strictPort: true,
    // Open the browser automatically on `npm run dev`.
    open: true,
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
