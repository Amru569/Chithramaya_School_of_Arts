import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Dev server proxies /api and /uploads to the FastAPI backend so the
// browser can send the session cookie without CORS complications. In
// production this proxy doesn't exist — the frontend instead calls the
// backend's real URL directly via VITE_API_URL (see src/services.js).
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate", // picks up a new deployed version automatically, no manual reinstall
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icons/*.png"],
      manifest: {
        name: "Chithramaya School of Arts",
        short_name: "Chithramaya",
        description: "Chithramaya School of Arts — academy management for admins, teachers, and students.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#F6F8FC",
        theme_color: "#1651B6",
        orientation: "portrait-primary",
        icons: [
          { src: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
          { src: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
          { src: "/icons/icon-128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icons/icon-384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the built app shell (JS/CSS/HTML/icons) for offline
        // load and installability. Deliberately does NOT cache API
        // responses (attendance, fees, chat, etc. change constantly and
        // are cross-origin in production) — those always hit the
        // network live, so the app never shows stale data.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
