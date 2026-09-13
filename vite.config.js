import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Vercel 使用根路径；GitHub Pages workflow 通过 VITE_BASE_PATH 覆盖。
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    proxy: {
      // 开发时将 /api 请求转发到 Node 后端（默认端口 4173）
      '/api': {
        target: 'http://localhost:4173',
        changeOrigin: true,
      },
    },
  },
})
