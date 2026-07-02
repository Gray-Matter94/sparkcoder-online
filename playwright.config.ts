import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke tests run against the Vite dev server on :8080.
 * Reuses an already-running server when present (sandbox dev mode);
 * otherwise spawns `bun run dev`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
