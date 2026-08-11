import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    plugins: [
        react(),

        VitePWA({
            registerType: "autoUpdate",

            manifest: {
                name: "Chithramaya",
                short_name: "Chithramaya",
                description: "Chithramaya Academy Management Application",
                start_url: "/",
                display: "standalone",
                background_color: "#ffffff",
                theme_color: "#ffffff",

                icons: [
                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },

            workbox: {
                navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
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