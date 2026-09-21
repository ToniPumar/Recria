import { defineConfig } from 'vite'

export default defineConfig({
  // Produción no dominio personalizado: https://recria.pumar.gal/
  base: '/',
  build: {
    chunkSizeWarningLimit: 700
  }
})
