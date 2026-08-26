import { defineConfig } from "vite";

export default defineConfig({
  // User-pages host is https://<user>.github.io/ — keep the same base locally and in CI.
  base: "/",
  server: {
    host: true,
    port: 47331,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 47331,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
});
