import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:2567',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist/client',
    sourcemap: true
  }
}) 