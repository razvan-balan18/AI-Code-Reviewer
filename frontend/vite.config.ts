import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/review": {
        target: "http://localhost:4000",
        timeout: 660000, // 11 minutes (to give buffer for 10 min Ollama timeout)
        proxyTimeout: 660000
      },
      "/results": {
        target: "http://localhost:4000",
        timeout: 10000
      }
    }
  }
});
