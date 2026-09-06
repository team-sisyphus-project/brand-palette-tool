import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveAllowedHosts, resolvePort } from './preview-config'

const allowedHosts = resolveAllowedHosts(process.env.ALLOWED_HOSTS)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 0.0.0.0 works both for local preview (loopback) and for a deployed
    // container, where the health check arrives on the container's own IP.
    host: '0.0.0.0',
    port: resolvePort(process.env.PORT, 5173),
    allowedHosts,
  },
  preview: {
    host: '0.0.0.0',
    port: resolvePort(process.env.PORT, 4173),
    // Fail loudly instead of silently drifting to another port: a port the
    // proxy does not know about is an unreachable app.
    strictPort: true,
    allowedHosts,
  },
})
