import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  envDir: "..",
  plugins: [react()],
  define: {
    __PATRICON_CONFIG_DIR__: JSON.stringify(path.resolve(__dirname, "../config")),
    __PATRICON_CIRCUITS_DIR__: JSON.stringify(path.resolve(__dirname, "../circuits"))
  },
  server: {
    fs: {
      allow: [".."]
    }
  }
});
