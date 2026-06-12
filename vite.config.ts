import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages 项目站地址为 https://<user>.github.io/<仓库名>/，需设置 base
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE || '/',
  server: {
    proxy: {
      '/api/agent': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
})
