/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // Rutas relativas: el build funciona en cualquier subcarpeta o servidor (se usa HashRouter).
  base: './',
  plugins: [react()],
  build: {
    // three.js pesa ~800 kB sin comprimir. La división automática lo deja en un paquete aparte que
    // solo se descarga al abrir una vista 3D (no usar manualChunks: arrastra React a ese paquete y
    // la página de inicio lo cargaría de entrada).
    chunkSizeWarningLimit: 900,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
