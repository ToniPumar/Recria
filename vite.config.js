import { defineConfig } from 'vite'

export default defineConfig({
  // Rutas relativas: funciona en servidor e tamén ao abrir dist/index.html.
  base: './',
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Un único JS clásico evita o bloqueo de módulos ES baixo file://.
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) return 'assets/app.css'
          return 'assets/[name][extname]'
        }
      }
    }
  }
})
