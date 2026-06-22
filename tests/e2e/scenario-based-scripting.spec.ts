import { test, expect } from "@playwright/test";

const SCENARIOS = [
  { title: "1. Cross-table GlideRecord update", table: "problem" },
  { title: "2. Integration error handling (REST outbound)", table: "x_vendor_sync_log" },
  { title: "3. Business rule recursion", table: "sys_user" },
  { title: "4. Async event-driven workflow", table: "sys_event" },
];

test.describe("/learn/scenario-based-scripting", () => {
  test("page loads with title, hero, and all scenarios", async ({ page }) => {
    await page.goto("/learn/scenario-based-scripting");
    await expect(page).toHaveTitle(/Scenario-Based Scripting/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const s of SCENARIOS) {
      await expect(page.getByRole("heading", { name: s.title })).toBeVisible();
    }
    const toggleButtons = page.locator("button[aria-controls^='sim-']");
    await expect(toggleButtons).toHaveCount(SCENARIOS.length);
  });

  test("simulator trace renders for every scenario", async ({ page }) => {
    await page.goto("/learn/scenario-based-scripting");
    await page.waitForLoadState("domcontentloaded");
    // Allow React hydration to attach onClick handlers to the SSR'd buttons.
    await page.waitForTimeout(1500);

    for (const { title, table } of SCENARIOS) {
      const article = page
        .locator("li", { has: page.getByRole("heading", { name: title }) });

      const toggleBtn = article.locator("button[aria-controls^='sim-']");
      await expect(toggleBtn).toHaveText(/Run in simulator/i);
      // element.click() bypasses the sticky header that would otherwise
      // intercept pointer events; React's delegated handler still fires.
      await toggleBtn.evaluate((el) => (el as HTMLButtonElement).click());
      await expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      await expect(toggleBtn).toHaveText(/Hide simulator/i);

      // Simulator header surfaces the active table as `DB: <table>`.
      await expect(article.getByText(`DB: ${table}`)).toBeVisible();

      // Collapse before moving on (only one simulator open at a time).
      await toggleBtn.evaluate((el) => (el as HTMLButtonElement).click());
      await expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    }
  });
});
