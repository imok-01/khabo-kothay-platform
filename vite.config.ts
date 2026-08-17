import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Leaflet touches `window` at import time, which crashes inside the Node-based
 * build-time prerenderer (scripts/prerender.mjs). Its map is only ever created
 * inside effects, so for the SSR graph the module just needs to evaluate —
 * we resolve it to a stub that exports an empty default. The client build is
 * untouched (`options.ssr` is false there).
 */
function leafletSsrStub(): Plugin {
  return {
    name: 'leaflet-ssr-stub',
    enforce: 'pre',
    resolveId(source, _importer, options) {
      if (options?.ssr && source === 'leaflet') return '\0leaflet-ssr-stub'
      return null
    },
    load(id) {
      if (id === '\0leaflet-ssr-stub') return 'export default {};'
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), leafletSsrStub()],
  ssr: {
    // Force leaflet through the plugin pipeline in SSR so the stub above can
    // intercept it — by default Vite externalizes node_modules for SSR, which
    // would bypass the plugin graph entirely.
    noExternal: ['leaflet'],
  },
})
