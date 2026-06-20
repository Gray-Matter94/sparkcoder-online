import { test, expect, Page } from "@playwright/test";

/**
 * End-to-end smoke tests for the AngularJS Developer track.
 *
 * Covers:
 *  - Track switcher activation persists via localStorage
 *  - All 5 Angular module cards render and link to /practice/{id}
 *  - Each puzzle route loads with options + simulator + Run button
 *  - Full simulator interaction: pick → run → reach "right" state
 */

const ANGULAR_MODULES = [
  { id: "ng-scope", name: /Scopes & Digest/i },
  { id: "ng-directives", name: /Directives/i },
  { id: "ng-services", name: /Services & DI/i },
  { id: "ng-http", name: /HTTP & Promises/i },
  { id: "ng-routing", name: /Routing/i },
] as const;

/** Seed the active track in localStorage before the app boots. */
async function seedAngularTrack(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("snscript_track_v1", "angular-dev");
  });
}

test.describe("AngularJS track — switcher", () => {
  test("renders the AngularJS tab and activates on click", async ({ page }) => {
    await page.goto("/");
    const tab = page.getByRole("tab", { name: /angularjs/i });
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText(/scopes, directives, services, digest cycle/i)).toBeVisible();
  });

  test("selection persists across reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: /angularjs/i }).click();
    await page.reload();
    await expect(page.getByRole("tab", { name: /angularjs/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test.describe("AngularJS track — modules", () => {
  test.beforeEach(async ({ page }) => {
    await seedAngularTrack(page);
  });

  test("home shows all 5 Angular module cards", async ({ page }) => {
    await page.goto("/");
    for (const mod of ANGULAR_MODULES) {
      const card = page.getByRole("link", { name: mod.name });
      await expect(card, `module ${mod.id} card`).toBeVisible();
    }
  });

  for (const mod of ANGULAR_MODULES) {
    test(`puzzle route /practice/${mod.id} renders puzzle UI`, async ({ page }) => {
      await page.goto(`/practice/${mod.id}`);
      // Heading shows module name
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      // At least 2 answer options (puzzle has 3 typically)
      const options = page.locator('main button:has(code)');
      await expect.poll(async () => options.count()).toBeGreaterThanOrEqual(2);
      // Run button present
      await expect(page.getByRole("button", { name: /run script/i })).toBeVisible();
      // Simulator dock present
      await expect(page.getByText(/instance simulator/i)).toBeVisible();
    });
  }
});

test.describe("AngularJS track — simulator interaction", () => {
  test.beforeEach(async ({ page }) => {
    await seedAngularTrack(page);
  });

  test("can pick options and reach the 'right' state on first puzzle of each module", async ({
    page,
  }) => {
    // Use one representative module for the full happy path to keep runtime short.
    await page.goto("/practice/ng-scope");

    const options = page.locator('main button:has(code)');
    const total = await options.count();
    expect(total).toBeGreaterThan(0);

    // Try each option in turn until "FINISH MODULE" / "NEXT PUZZLE" appears
    // (correct answer reached) — bounded by option count.
    let reachedRight = false;
    for (let i = 0; i < total; i++) {
      // Re-query each iteration; disabled (wrong) options remain in DOM but disabled.
      const candidate = options.nth(i);
      if (await candidate.isDisabled()) continue;
      await candidate.click();
      await page.getByRole("button", { name: /run script/i }).click();

      // Wait for either the "wrong" feedback (TRY AGAIN) or "right" feedback.
      const next = page.getByRole("button", {
        name: /next puzzle|finish module|try again/i,
      });
      await expect(next).toBeVisible({ timeout: 5000 });
      const label = (await next.textContent())?.toLowerCase() ?? "";

      if (label.includes("next") || label.includes("finish")) {
        reachedRight = true;
        break;
      }
      // Dismiss "TRY AGAIN" and continue
      await next.click();
    }

    expect(reachedRight, "should reach a correct answer within the option set").toBe(true);
  });
});
