/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

// Derlenmiş uygulamaya içerik güvenlik politikası ekler (geliştirme sunucusunda Vite satır içi betik kullandığı için yalnızca derlemede).
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:"
const cspPlugin = (): Plugin => ({
  name: 'dolap-csp',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

// Sürüm numarası package.json'dan derlemeye gömülür (başlıkta görünür)
const APP_VERSION: string = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')).version

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // Masaüstü uygulamada dosyalar file:// üzerinden yüklenir; göreli yollar gerekir.
  base: './',
  build: {
    chunkSizeWarningLimit: 2500,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      // Tarayıcıya bağlı dışa aktarma ve kayıt kodu birim testlerin kapsamı dışında
      exclude: ['src/core/**/index.ts', 'src/core/models/**', 'src/core/export/pdf-export.ts', 'src/core/export/excel-export.ts', 'src/core/persistence/db.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
})
