/**
 * The specimen's committed regression suite: the design laws as executable
 * specs, promoted from the per-round scratchpad scanners. Runs against a
 * built preview (CI) or any live URL (BASE env).
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE || "http://localhost:4173",
    viewport: { width: 1280, height: 800 },
  },
  webServer: process.env.BASE
    ? undefined
    : {
        command: "bunx vite preview --port 4173 --strictPort",
        cwd: "..",
        port: 4173,
        reuseExistingServer: true,
        timeout: 30_000,
      },
});
