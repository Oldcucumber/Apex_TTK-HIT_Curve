import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ command }) => ({
  // GitHub Pages serves the site under /Apex_TTK-HIT_Curve/; Cloudflare serves it at the
  // domain root. BASE_PATH overrides both (WORKERS_CI / CF_PAGES are set by Cloudflare builds).
  base: process.env.BASE_PATH || (process.env.WORKERS_CI || process.env.CF_PAGES ? '/' : '/Apex_TTK-HIT_Curve/'),
  plugins: [
    vue(),
    command === 'serve' && process.env.DEVTOOLS !== '0' && vueDevTools(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // the lazily loaded ECharts chunk is ~550 kB before gzip
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        // ECharts is only needed by the chart views, which are loaded lazily
        manualChunks: id => (/node_modules\/(echarts|zrender)\//.test(id) ? 'echarts' : undefined),
      },
    },
  },
}))
