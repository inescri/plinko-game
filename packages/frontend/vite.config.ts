import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Force a single React instance. The pnpm workspace can otherwise resolve a
  // second copy for React-context libraries, which trips "Invalid hook call"
  // in the dev server.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  // dist/ is what the dfx `frontend` asset canister serves.
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
