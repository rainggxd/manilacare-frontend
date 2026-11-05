import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Requests to /api are forwarded to the CodeIgniter backend on this same computer.
// This lets the whole system work through ONE public link (Cloudflare Tunnel).
const apiProxy = {
  '/api': {
    target: 'http://localhost:8080',
    changeOrigin: true,
  },
}

// Cloudflare quick tunnel links look like https://random-words.trycloudflare.com
const allowedHosts = ['.trycloudflare.com']

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: apiProxy, allowedHosts },
  preview: { port: 4173, proxy: apiProxy, allowedHosts },
})