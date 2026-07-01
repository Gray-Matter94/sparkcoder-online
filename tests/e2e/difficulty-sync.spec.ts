import { test, expect, type Page } from "@playwright/test";

const CATEGORY = "gliderecord";
const STORAGE_KEY = "snscript_difficulty_v1";
const LEVELS = ["easy", "medium", "hard"] as const;
type Level = (typeof LEVELS)[number];

async function readState(page: Page) {
  const url = new URL(page.url());
  const urlDifficulty = url.searchParams.get("difficulty");
  const storage = await page.evaluate(
    (k) => window.localStorage.getItem(k),
    STORAGE_KEY
  );
  const active = await page
    .locator('[role="radio"][aria-checked="true"]')
    .getAttribute("aria-label")
    .catch(() => null);
  // Fallback: read the label text if aria-label isn't present.
  const activeText = active
    ? active.toLowerCase()
    : (
        await page
          .locator('[role="radio"][aria-checked="true"]')
          .innerText()
      ).toLowerCase();
  const selector = LEVELS.find((l) => activeText.includes(l)) ?? null;
  return { urlDifficulty, storage, selector };
}

async function expectSynced(page: Page, expected: Level) {
  await expect
    .poll(async () => (await readState(page)).selector, {
      message: `selector should be ${expected}`,
    })
    .toBe(expected);
  const state = await readState(page);
  expect(state.urlDifficulty).toBe(expected);
  expect(state.storage).toBe(expected);
}

test.describe("difficulty selector stays in sync", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((k) => {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }, STORAGE_KEY);
  });

  test("clicking each level updates URL + localStorage + selector", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}`);
    await expect(
      page.getByRole("radiogroup", { name: /Puzzle difficulty/i })
    ).toBeVisible();

    for (const level of LEVELS) {
      await page
        .getByRole("radio", { name: new RegExp(`Toggle ${level} hint|${level}`, "i") })
        .first()
        .click()
        .catch(async () => {
          // Fallback: click the radio whose visible text contains the level label.
          await page
            .locator('[role="radio"]', {
              hasText: new RegExp(`^\\s*(🟢|🟡|🔴)?\\s*${level}`, "i"),
            })
            .first()
            .click();
        });
      await expectSynced(page, level);
    }
  });

  test("shared URL restores selector + localStorage on load", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=hard`);
    await expectSynced(page, "hard");
  });

  test("URL param wins over stale localStorage", async ({ page, context }) => {
    await context.addInitScript(
      ({ k, v }) => window.localStorage.setItem(k, v),
      { k: STORAGE_KEY, v: "easy" }
    );
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expectSynced(page, "medium");
  });

  test("missing URL param falls back to stored value and back-fills URL", async ({
    page,
    context,
  }) => {
    await context.addInitScript(
      ({ k, v }) => window.localStorage.setItem(k, v),
      { k: STORAGE_KEY, v: "hard" }
    );
    await page.goto(`/practice/${CATEGORY}`);
    await expectSynced(page, "hard");
  });

  test("invalid URL param is ignored and falls back to default", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=impossible`);
    // Default when nothing is stored is "medium".
    await expectSynced(page, "medium");
  });
});
