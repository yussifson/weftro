import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from "path"
import { VitePWA } from 'vite-plugin-pwa'
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'info', // Show progress so it doesn't look frozen
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api/ai': {
        target: 'https://api.cloudflare.com',
        changeOrigin: true,
        rewrite: (path) => {
          const match = path.match(/^\/api\/ai\/([^\/]+)\/(.+)$/);
          if (match) {
            return `/client/v4/accounts/${match[1]}/ai/run/${match[2]}`;
          }
          return path.replace(/^\/api\/ai/, '/client/v4/accounts/bf5126510c1f8f2759cc81c4e7d795ef/ai/run');
        },
      }
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: false,
    minify: false
  },
  plugins: [
    react(),
    !process.env.VERCEL && electron({
      main: {
        entry: 'electron/main.js',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron-updater']
            }
          }
        }
      },
      preload: {
        input: 'electron/preload.js',
      },
      renderer: {},
    }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
        type: 'module'
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Optavel',
        short_name: 'Optavel',
        description: 'Multi-industry Operational OS',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/optavel-favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/optavel-favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB for ffmpeg-core.wasm
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,wasm}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cloudflare\.com\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            // Cache Supabase REST API responses (profiles, companies, etc.) for offline use
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-data-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 // 1 day
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@journeyapps/wa-sqlite', '@powersync/web']
  },
});