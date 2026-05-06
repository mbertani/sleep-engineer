import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Sleep Engineer",
        short_name: "Sleep",
        description: "Engineer perfect sleep — track, log and improve your sleep with the 29 rules.",
        start_url: "/",
        display: "standalone",
        background_color: "#070B14",
        theme_color: "#070B14",
        orientation: "portrait",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,html,png,webmanifest}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
});
