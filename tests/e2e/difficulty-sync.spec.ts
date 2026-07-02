import { test, expect, type Page } from "@playwright/test";

const CATEGORY = "gliderecord";
const STORAGE_KEY = "snscript_difficulty_v1";
const LEVELS = ["easy", "medium", "hard"] as const;
type Level = (typeof LEVELS)[number];

const LABEL: Record<Level, RegExp> = {
  easy: /easy/i,
  medium: /medium/i,
  hard: /hard/i,
};

async function readSelector(page: Page): Promise<Level | null> {
  const text = (
    await page
      .locator('[role="radio"][aria-checked="true"]')
      .first()
      .innerText()
      .catch(() => "")
  ).toLowerCase();
  return LEVELS.find((l) => text.includes(l)) ?? null;
}

async function readStorage(page: Page): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), STORAGE_KEY);
}

function readUrl(page: Page): string | null {
  return new URL(page.url()).searchParams.get("difficulty");
}

async function expectSynced(page: Page, expected: Level) {
  await expect
    .poll(() => readSelector(page), {
      message: `selector should be ${expected}`,
      timeout: 7_000,
    })
    .toBe(expected);
  await expect
    .poll(() => readUrl(page), {
      message: `URL ?difficulty should be ${expected}`,
      timeout: 7_000,
    })
    .toBe(expected);
  await expect
    .poll(() => readStorage(page), {
      message: `localStorage should be ${expected}`,
      timeout: 7_000,
    })
    .toBe(expected);
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
    // Wait for client hydration — the mount effect writes the default to
    // localStorage, and only after that do click handlers fire reliably.
    await expect
      .poll(() => readStorage(page), { timeout: 7_000 })
      .not.toBeNull();

    for (const level of LEVELS) {
      await page
        .getByRole("radio", { name: LABEL[level] })
        .first()
        .click();
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
