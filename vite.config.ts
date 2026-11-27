import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [tailwindcss(), react(), VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'logo.svg', 'robots.txt'],
        manifest: {
            name: 'Developer Utilities Tool',
            short_name: 'DevUtil',
            description: 'A comprehensive collection of free developer utilities for everyday tasks.',
            theme_color: '#1a1b26',
            background_color: '#0d0d12',
            display: 'standalone',
            // On desktop PWAs, window-controls-overlay lets your app
            // extend into the title bar. Falls back to 'standalone' on
            // mobile or browsers that don't support it.
            display_override: ['window-controls-overlay', 'standalone'],
            orientation: 'any',
            scope: '/',
            start_url: '/',
            icons: [
                {
                    src: '/icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
                {
                    src: '/icon-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any maskable',
                },
                {
                    src: '/icon-180x180.png',
                    sizes: '180x180',
                    type: 'image/png',
                },
            ],
            categories: ['developer tools', 'utilities', 'productivity'],
        },
        workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            runtimeCaching: [
                {
                    urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'google-fonts-cache',
                        expiration: {
                            maxEntries: 10,
                            maxAgeSeconds: 60 * 60 * 24 * 365,
                        },
                        cacheableResponse: {
                            statuses: [0, 200],
                        },
                    },
                },
                {
                    urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'gstatic-fonts-cache',
                        expiration: {
                            maxEntries: 10,
                            maxAgeSeconds: 60 * 60 * 24 * 365,
                        },
                        cacheableResponse: {
                            statuses: [0, 200],
                        },
                    },
                },
            ],
            navigateFallback: 'index.html',
            cleanupOutdatedCaches: true,
        },
        devOptions: {
            enabled: false,
            type: 'module',
        },
    }), cloudflare()],
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    define: {
        global: 'globalThis',
    },
    build: {
        sourcemap: false, // Disable sourcemaps in production for smaller bundle
        rollupOptions: {
            output: {
                manualChunks: (id) => {
                    if (!id.includes('node_modules')) return
                    const pkg = (name: RegExp) => new RegExp(`[\\\\/]node_modules[\\\\/]${name.source}[\\\\/]`).test(id)
                    if (pkg(/(react|react-dom|scheduler)/)) return 'vendor-react'
                    if (pkg(/(react-router|react-router-dom)/)) return 'vendor-router'
                    // Design system: Radix primitives, cmdk, icons, toasts, panels
                    if (pkg(/(@radix-ui[\\\\/][^\\\\/]+|radix-ui|cmdk|lucide-react|sonner|next-themes|react-resizable-panels|cn|class-variance-authority|@floating-ui[\\\\/][^\\\\/]+)/)) return 'vendor-ui'
                    // Everything else is split naturally, so libraries used by a
                    // single lazy tool page load only with that page.
                    return undefined
                },
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
        chunkSizeWarningLimit: 600, // Increase limit slightly since we're splitting better
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true,
            },
        },
    },
})