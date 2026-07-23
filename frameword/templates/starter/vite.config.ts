import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// the panel engine is consumed from source: no package build step needed
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@frameword/panels-core": fileURLToPath(new URL("./packages/panels-core/src/index.ts", import.meta.url)),
      "@frameword/panels-react": fileURLToPath(new URL("./packages/panels-react/src/index.tsx", import.meta.url)),
    },
  },
});
