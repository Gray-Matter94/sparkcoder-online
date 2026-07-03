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
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:8080",
    headless: true,
    // On failure keep the full debug bundle: Playwright trace (.zip),
    // video recording (.webm), and last-step screenshot (.png). These
    // land under test-results/<test>/ and are uploaded by the CI job.
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      // Dedicated project for the IRM risk-scoring edge-case specs so we can
      // retry them harder than the rest of the suite and capture the most
      // informative artifact set across every retry attempt (not just the
      // final one). Runs first; the general `chromium` project below excludes
      // these files via `testIgnore` so they aren't executed twice.
      name: "irm-edge-cases",
      testMatch: /irm-risk-scoring-edge-cases\.spec\.ts$/,
      retries: process.env.CI ? 3 : 1,
      use: {
        ...devices["Desktop Chrome"],
        // Trace + video for every retry attempt so flaky failures are debuggable
        // even when a later attempt passes. Screenshot on every action gives
        // frame-by-frame context alongside the trace timeline.
        trace: "on-all-retries",
        video: "on-all-retries",
        screenshot: "on",
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
    {
      name: "chromium",
      testIgnore: /irm-risk-scoring-edge-cases\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
