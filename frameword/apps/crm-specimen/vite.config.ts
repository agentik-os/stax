import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // the app always consumes the packages from SOURCE — package.json exports
    // point at dist/ for external consumers, and stale-dist can never bite dev
    alias: {
      "@frameword/panels-core": fileURLToPath(new URL("../../packages/panels-core/src/index.ts", import.meta.url)),
      "@frameword/panels-react": fileURLToPath(new URL("../../packages/panels-react/src/index.tsx", import.meta.url)),
    },
  },
});
