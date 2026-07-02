import { test, expect, type Page } from "@playwright/test";

const CATEGORY = "gliderecord";
const STORAGE_KEY = "snscript_difficulty_v1";

type Level = "easy" | "medium" | "hard";
const LABEL: Record<Level, RegExp> = {
  easy: /easy/i,
  medium: /medium/i,
  hard: /hard/i,
};

async function selectDifficulty(page: Page, level: Level) {
  await page.getByRole("radio", { name: LABEL[level] }).first().click();
  await expect
    .poll(
      () => page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY),
      { timeout: 7_000 }
    )
    .toBe(level);
}

async function openHint(page: Page): Promise<string> {
  const hintBtn = page.getByRole("button", { name: /HINT/i });
  const expanded = await hintBtn.getAttribute("aria-expanded");
  if (expanded !== "true") await hintBtn.click();
  const panel = page.locator("text=/💡 Hint ·/").locator("..").locator("..");
  await expect(panel).toBeVisible();
  return (await panel.innerText()).trim();
}

async function closeHint(page: Page) {
  const hintBtn = page.getByRole("button", { name: /HINT/i });
  if ((await hintBtn.getAttribute("aria-expanded")) === "true") {
    await hintBtn.click();
  }
}

test.describe("hint card adapts to difficulty", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }, STORAGE_KEY);
  });

  test("easy, medium, hard produce distinct hint content", async ({ page }) => {
    await page.goto(`/practice/${CATEGORY}`);
    await expect(
      page.getByRole("radiogroup", { name: /Puzzle difficulty/i })
    ).toBeVisible();
    await expect
      .poll(
        () => page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY),
        { timeout: 7_000 }
      )
      .not.toBeNull();

    await selectDifficulty(page, "easy");
    const easyText = await openHint(page);
    expect(easyText).toMatch(/💡\s*Hint\s*·\s*easy/i);
    // Easy hint reveals the starting token, formatted as inline code with backticks.
    expect(easyText).toMatch(/Start with\s+`[^`]+`/);
    await closeHint(page);

    await selectDifficulty(page, "medium");
    const mediumText = await openHint(page);
    expect(mediumText).toMatch(/💡\s*Hint\s*·\s*medium/i);
    expect(mediumText).not.toMatch(/Start with\s+`/);
    expect(mediumText).not.toMatch(/Think about how/i);
    await closeHint(page);

    await selectDifficulty(page, "hard");
    const hardText = await openHint(page);
    expect(hardText).toMatch(/💡\s*Hint\s*·\s*hard/i);
    // Hard hints nudge toward the category concern without spoilers.
    expect(hardText).toMatch(/Think about how/i);
    expect(hardText).toMatch(/edge case/i);
    expect(hardText).not.toMatch(/Start with\s+`/);

    // Sanity: the three hint bodies must not all be identical.
    const bodies = new Set([easyText, mediumText, hardText]);
    expect(bodies.size).toBe(3);
  });

  test("hint updates in place when difficulty changes while open", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=easy`);
    await expect
      .poll(
        () => page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY),
        { timeout: 7_000 }
      )
      .toBe("easy");

    const easyText = await openHint(page);
    expect(easyText).toMatch(/·\s*easy/i);
    expect(easyText).toMatch(/Start with\s+`/);

    // Switch to hard — question resets and the hint panel closes (status="picking"
    // is re-entered on difficulty change). Re-open and verify the new tier text.
    await selectDifficulty(page, "hard");
    const hardText = await openHint(page);
    expect(hardText).toMatch(/·\s*hard/i);
    expect(hardText).toMatch(/Think about how/i);
    expect(hardText).not.toBe(easyText);
  });
});
