import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  define: {
    // Required by @dfinity/agent which references `global`
    global: "globalThis",
  },
});
