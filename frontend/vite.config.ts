import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  base: './', // Важно для Electron - относительные пути
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Увеличиваем лимит для предупреждений о размере чанков (для Electron это нормально)
    chunkSizeWarningLimit: 1000,
  },
})

