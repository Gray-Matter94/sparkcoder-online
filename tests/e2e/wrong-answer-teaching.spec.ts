import { test, expect } from "@playwright/test";

const CATEGORY = "gliderecord";
const STORAGE_KEY = "snscript_difficulty_v1";

test.describe("wrong answer surfaces detailed teaching content", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }, STORAGE_KEY);
  });

  test("selecting a wrong option shows Logic Mismatch card with title, explanation, and Try Again CTA", async ({
    page,
  }) => {
    // Easy tier surfaces the level-1 gr-1 puzzle first, which has a stable
    // wrong option `if (gr.next())` with rich teaching copy.
    await page.goto(`/practice/${CATEGORY}?difficulty=easy`);
    await expect(
      page.getByRole("radiogroup", { name: /Puzzle difficulty/i })
    ).toBeVisible();

    // Sanity: confirm we're on the expected puzzle.
    await expect(
      page.getByRole("heading", {
        name: /Iterate through ALL active incidents/i,
      })
    ).toBeVisible();

    // Pick the wrong option.
    const wrong = page.getByRole("button", { name: /if \(gr\.next\(\)\)/ });
    await expect(wrong).toBeEnabled();
    await wrong.click();

    // Run — the button becomes RUNNING… then the teach card appears once the
    // sim finishes (bounded to ~1.8s inside the component).
    const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
    await expect(runBtn).toBeEnabled();
    await runBtn.click();

    // The wrong-answer teach card should render.
    const teachCard = page
      .locator("text=/Logic Mismatch/i")
      .locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
    await expect(teachCard).toBeVisible({ timeout: 5_000 });

    // Header pill uses ✕ + "Logic Mismatch".
    await expect(teachCard.getByText(/Logic Mismatch/i)).toBeVisible();

    // Question-specific title from questions.ts (gr-1 → wrong option "a").
    await expect(
      teachCard.getByRole("heading", {
        name: /Only the first record was logged/i,
      })
    ).toBeVisible();

    // Detailed explanation body — check for two distinct fragments so a
    // future copy tweak that keeps the teaching intent still passes.
    const explain = teachCard.locator("p").first();
    const explainText = (await explain.innerText()).trim();
    expect(explainText.length).toBeGreaterThan(80);
    expect(explainText).toMatch(/if \(gr\.next\(\)\)/);
    expect(explainText).toMatch(/while \(gr\.next\(\)\)/);
    expect(explainText).toMatch(/cursor/i);

    // Continue CTA on a wrong answer is TRY AGAIN.
    const tryAgain = teachCard.getByRole("button", { name: /TRY AGAIN/i });
    await expect(tryAgain).toBeVisible();

    // The chosen wrong chip is disabled + struck through so the user can't re-pick it.
    await expect(wrong).toBeDisabled();

    // Clicking TRY AGAIN returns to picking state and closes the teach card.
    await tryAgain.click();
    await expect(teachCard).toBeHidden();
    await expect(page.getByRole("button", { name: /RUN SCRIPT/i })).toBeVisible();
  });

  test("different wrong option renders its own tailored teaching content", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=easy`);

    // Pick the `for (gr.next())` option — different feedback than option "a".
    const wrong = page.getByRole("button", { name: /for \(gr\.next\(\)\)/ });
    await wrong.click();
    await page.getByRole("button", { name: /RUN SCRIPT/i }).click();

    const teachCard = page
      .locator("text=/Logic Mismatch/i")
      .locator("xpath=ancestor::div[contains(@class,'rounded-3xl')][1]");
    await expect(teachCard).toBeVisible({ timeout: 5_000 });

    await expect(
      teachCard.getByRole("heading", { name: /Syntax error/i })
    ).toBeVisible();
    const explainText = (await teachCard.locator("p").first().innerText()).trim();
    expect(explainText).toMatch(/for\s*\(init/i);
    expect(explainText).toMatch(/while \(gr\.next\(\)\)/);
  });
});
