import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// In dev the UI proxies /api to the LangGraph agent service.
// In production `npm run build` output is served by FastAPI at the same origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Prevent Vite from loading an unrelated legacy PostCSS config from parent folders.
  css: { postcss: { plugins: [] } },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_AGENT_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
