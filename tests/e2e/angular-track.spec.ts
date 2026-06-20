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
  { id: "ng-scope", label: "SCOPES & DIGEST" },
  { id: "ng-directives", label: "DIRECTIVES" },
  { id: "ng-services", label: "SERVICES & DI" },
  { id: "ng-http", label: "HTTP & PROMISES" },
  { id: "ng-routing", label: "ROUTING" },
] as const;

/** Seed the active track in localStorage before the app boots. */
async function seedAngularTrack(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("snscript_track_v1", "angular-dev");
  });
}

/** Wait until React has hydrated the switcher (any tab has aria-selected=true). */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => !!document.querySelector('[role="tab"][aria-selected="true"]'),
    null,
    { timeout: 10_000 },
  );
}

test.describe("AngularJS track — switcher", () => {
  test("renders the AngularJS tab and activates on click", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    const tab = page.getByRole("tab", { name: /angularjs/i });
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByText(/scopes, directives, services, digest cycle/i),
    ).toBeVisible();
  });

  test("selection persists across reload", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);
    await page.getByRole("tab", { name: /angularjs/i }).click();
    await expect(page.getByRole("tab", { name: /angularjs/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await page.reload();
    await waitForHydration(page);
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

  test("home shows all 5 Angular module cards linking to /practice/{id}", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);
    for (const mod of ANGULAR_MODULES) {
      // Scope by href to disambiguate from the Daily Challenge card,
      // which can match module names by text alone.
      const card = page.locator(`a[href="/practice/${mod.id}"]`);
      await expect(card, `module ${mod.id} card`).toBeVisible();
      await expect(card).toContainText(mod.label);
    }
  });

  for (const mod of ANGULAR_MODULES) {
    test(`puzzle route /practice/${mod.id} renders puzzle UI`, async ({ page }) => {
      await page.goto(`/practice/${mod.id}`);
      // At least 2 answer-option buttons (puzzles have 3).
      const options = page.locator("main button:has(code)");
      await expect.poll(async () => options.count()).toBeGreaterThanOrEqual(2);
      // Run button present.
      await expect(page.getByRole("button", { name: /run script/i })).toBeVisible();
      // Simulator dock present.
      await expect(page.getByText(/instance simulator/i)).toBeVisible();
    });
  }
});

test.describe("AngularJS track — simulator interaction", () => {
  test.beforeEach(async ({ page }) => {
    await seedAngularTrack(page);
  });

  test("pick → run reaches a correct answer (full happy path)", async ({ page }) => {
    await page.goto("/practice/ng-scope");

    const options = page.locator("main button:has(code)");
    const total = await options.count();
    expect(total).toBeGreaterThan(0);

    // Iterate options until "NEXT PUZZLE" / "FINISH MODULE" appears
    // (correct answer reached) — bounded by option count.
    let reachedRight = false;
    for (let i = 0; i < total; i++) {
      const candidate = options.nth(i);
      if (await candidate.isDisabled()) continue;
      // The fixed simulator dock can overlap the lower options; bypass the
      // hit-test rather than fighting the layout — we're testing logic, not z-order.
      await candidate.click({ force: true });
      await page.getByRole("button", { name: /run script/i }).click();

      const next = page.getByRole("button", {
        name: /next puzzle|finish module|try again/i,
      });
      await expect(next).toBeVisible({ timeout: 5_000 });
      const label = (await next.textContent())?.toLowerCase() ?? "";

      if (label.includes("next") || label.includes("finish")) {
        reachedRight = true;
        break;
      }
      // Dismiss "TRY AGAIN" and continue with the next option.
      await next.click();
    }

    expect(
      reachedRight,
      "should reach a correct answer within the available options",
    ).toBe(true);
  });
});
