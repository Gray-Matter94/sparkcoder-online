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
    const runButtons = page.getByRole("button", { name: /Run in simulator/i });
    await expect(runButtons).toHaveCount(SCENARIOS.length);
  });

  test("simulator trace renders for every scenario", async ({ page }) => {
    await page.goto("/learn/scenario-based-scripting");

    for (let i = 0; i < SCENARIOS.length; i++) {
      const { title, table } = SCENARIOS[i];
      const article = page
        .locator("li", { has: page.getByRole("heading", { name: title }) });

      const runBtn = article.getByRole("button", { name: /Run in simulator/i });
      await runBtn.scrollIntoViewIfNeeded();
      await runBtn.click({ force: true });
      await expect(runBtn).toHaveAttribute("aria-expanded", "true");

      // Simulator header surfaces the active table as `DB: <table>`.
      await expect(article.getByText(`DB: ${table}`)).toBeVisible();

      // Collapse before moving on (only one simulator open at a time).
      const hideBtn = article.getByRole("button", { name: /Hide simulator/i });
      await hideBtn.scrollIntoViewIfNeeded();
      await hideBtn.click({ force: true });
    }
  });
});
