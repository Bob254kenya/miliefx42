import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },

  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "MILLIEFX TRADING APP",
        short_name: "MILLIEFX",
        theme_color: "#770bbf",
        background_color: "#F0F8FF",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/logo192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),

    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
