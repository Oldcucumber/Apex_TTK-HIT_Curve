import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ command }) => ({
  base: '/Apex_TTK-HIT_Curve/', // 设置为你的GitHub仓库路径
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
    rollupOptions: {
      output: {
        // ECharts is only needed by the chart views, which are loaded lazily
        manualChunks: id => (/node_modules\/(echarts|zrender)\//.test(id) ? 'echarts' : undefined),
      },
    },
  },
}))
