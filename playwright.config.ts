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
    // Dedicated projects for the IRM risk-scoring edge-case specs so we can
    // retry them harder than the rest of the suite AND run them across
    // multiple browser engines (Chromium + WebKit + Firefox). Keyboard focus,
    // ARIA live-region announcements, and correction-feedback rendering all
    // differ subtly across engines, so we exercise every engine to keep the
    // accessibility guarantees honest. The general `chromium` project below
    // excludes these files via `testIgnore` so they aren't executed twice.
    ...(["chromium", "webkit", "firefox"] as const).map((browserName) => ({
      name: `irm-edge-cases-${browserName}`,
      testMatch: /irm-risk-scoring-edge-cases\.spec\.ts$/,
      retries: process.env.CI ? 3 : 1,
      use: {
        ...devices[
          browserName === "chromium"
            ? "Desktop Chrome"
            : browserName === "webkit"
              ? "Desktop Safari"
              : "Desktop Firefox"
        ],
        // Trace + video for every retry attempt so flaky failures are
        // debuggable even when a later attempt passes. Screenshot on every
        // action gives frame-by-frame context alongside the trace timeline.
        trace: "on-all-retries" as const,
        video: "on-all-retries" as const,
        screenshot: "on" as const,
        ...(browserName === "chromium" && process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    })),
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
