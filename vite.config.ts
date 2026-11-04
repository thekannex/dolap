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

/**
 * Tarayıcı sürümü (vite build --mode web): uygulama bildirimi, çevrimdışı çalışma için service worker
 * (derlenen bütün dosyaları önbelleğe alır) ve sunucu için .htaccess üretir.
 */
const webAppPlugin = (): Plugin => ({
  name: 'dolap-web',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('</head>',
    '    <link rel="manifest" href="./manifest.webmanifest" />\n    <meta name="theme-color" content="#ea580c" />\n    <link rel="apple-touch-icon" href="./icon-512.png" />\n  </head>'),
  generateBundle(_options, bundle) {
    this.emitFile({ type: 'asset', fileName: 'icon-512.png', source: readFileSync(path.resolve(import.meta.dirname, 'build/icon.png')) })
    this.emitFile({
      type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify({
        name: 'Dolap — Ölçü, Kesim ve Teklif', short_name: 'Dolap', lang: 'tr',
        start_url: './', scope: './', display: 'standalone', background_color: '#ffffff', theme_color: '#ea580c',
        icons: [
          { src: './favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      }, null, 2),
    })
    const files = ['./', ...Object.keys(bundle).filter((f) => f !== 'index.html').map((f) => `./${f}`), './icon-512.png', './manifest.webmanifest', './favicon.svg']
    const sw = readFileSync(path.resolve(import.meta.dirname, 'src/web/sw-template.js'), 'utf8')
      .replace('__CACHE__', `dolap-${APP_VERSION}`)
      .replace('__FILES__', JSON.stringify([...new Set(files)]))
    this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw })
    this.emitFile({ type: 'asset', fileName: '.htaccess', source: readFileSync(path.resolve(import.meta.dirname, 'src/web/htaccess.txt'), 'utf8') })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), cspPlugin(), ...(mode === 'web' ? [webAppPlugin()] : [])],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION), __WEB__: JSON.stringify(mode === 'web') },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // Masaüstü uygulamada dosyalar file:// üzerinden yüklenir; göreli yollar gerekir (web sürümü de alt klasörde çalışır).
  base: './',
  build: {
    outDir: mode === 'web' ? 'dist-web' : 'dist',
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
}))
