import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site: https://chelsealeezc.github.io/ZhihuWHY/
  base: process.env.NODE_ENV === 'production' ? '/ZhihuWHY/' : '/',
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
