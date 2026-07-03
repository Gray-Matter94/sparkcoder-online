import { test, expect, type Page, type Locator } from "@playwright/test";
import { expectSimulatorAndTeachCardAccessible } from "./utils/a11y";


/**
 * Verifies that both IRM risk-scoring puzzles surface the enriched
 * step-by-step correction feedback in the simulator + TeachCard UI,
 * for both wrong and correct attempts.
 *
 *  - irm-score-1 (level 2): residual = inherent × (1 − effectiveness)
 *  - irm-score-2 (level 3): risk-level bucket ordering
 *
 * Puzzle 2 is gated behind the GlideRecord Wizard tier (maxLevel 3),
 * which unlocks once the user has earned 2 weekly badges. We seed
 * the per-track progress record in localStorage before navigation.
 */

const CATEGORY = "risk-scoring";
const TRACK = "servicenow-irm";
const PROGRESS_KEY = `snscript_progress_v3:${TRACK}`;
const DIFFICULTY_KEY = "snscript_difficulty_v1";
const TRACK_STORAGE_KEY = "snscript_track_v1";

async function seedProgress(page: Page, weeklyBadges: number) {
  await page.addInitScript(
    ({ progressKey, difficultyKey, trackKey, track, badges }) => {
      try {
        window.localStorage.removeItem(difficultyKey);
        window.localStorage.setItem(trackKey, track);
        const wb: Record<string, true> = {};
        for (let i = 0; i < badges; i++) wb[`seed-week-${i}`] = true;
        const progress = {
          xp: 0,
          streak: 0,
          lastPlayed: null,
          solved: {},
          sessions: 0,
          sessionBadges: 0,
          activeDays: {},
          weeklyBadges: wb,
          dailyChallenges: {},
          srs: {},
          termMastery: {},
        };
        window.localStorage.setItem(progressKey, JSON.stringify(progress));
      } catch {}
    },
    {
      progressKey: PROGRESS_KEY,
      difficultyKey: DIFFICULTY_KEY,
      trackKey: TRACK_STORAGE_KEY,
      track: TRACK,
      badges: weeklyBadges,
    }
  );
}

/** Click an answer chip by its exact `<code>` label. */
async function pickOption(page: Page, text: string) {
  const chip = page.getByRole("button").filter({
    has: page.locator("code").getByText(text, { exact: true }),
  });
  await expect(chip).toHaveCount(1);
  await expect(chip).toBeEnabled();
  await chip.scrollIntoViewIfNeeded();
  // Poll: keep clicking until React commits `picked` and the RUN SCRIPT
  // button flips to enabled. This defends against React-19 concurrent
  // rendering swallowing a lone click after a state reset.
  const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
  await expect
    .poll(
      async () => {
        if (await runBtn.isEnabled()) return true;
        await chip.click({ force: true });
        await page.waitForTimeout(150);
        return runBtn.isEnabled();
      },
      { timeout: 8000, intervals: [200] }
    )
    .toBe(true);
}

async function runAndWait(page: Page) {
  const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
  await expect(runBtn).toBeEnabled();
  await runBtn.click({ force: true });
  await page.waitForTimeout(2200);
}

/** Wrong-answer teach card (destructive tone). */
function badTeachCard(page: Page): Locator {
  return page.locator("div.rounded-3xl.border-destructive");
}

/** Correct-answer teach card (primary tone). */
function okTeachCard(page: Page): Locator {
  return page.locator("div.rounded-3xl.border-primary");
}

test.describe("IRM risk-scoring puzzles show detailed simulator + teach feedback", () => {
  test.use({ viewport: { width: 1280, height: 1800 } });

  test.beforeEach(async ({ page }) => {
    // Puzzle 2 is level-3 → seed 2 weekly badges to unlock GlideRecord Wizard.
    await seedProgress(page, 2);
  });

  // Assert screen-reader affordances + axe-clean feedback surfaces after
  // every test's final render (both simulator trace and TeachCard are on
  // screen at this point since tests advance through to the correct answer).
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) return;
    await expectSimulatorAndTeachCardAccessible(page, testInfo.title);
  });


  test("puzzle 1 (residual risk): wrong subtract, wrong divide, and correct answer all render enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", {
        name: /Compute residual risk correctly/i,
      })
    ).toBeVisible();

    // ---- Wrong attempt A: subtraction (unit mismatch) ----
    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);

    const mismatchCard = badTeachCard(page);
    await expect(mismatchCard).toBeVisible();
    await expect(mismatchCard.getByText(/Logic Mismatch/i)).toBeVisible();
    await expect(
      mismatchCard.getByRole("heading", {
        name: /Unit mismatch — subtracting a fraction from a score/i,
      })
    ).toBeVisible();

    const mismatchText = await mismatchCard.locator("p").first().innerText();
    expect(mismatchText).toMatch(/Worked example/i);
    expect(mismatchText).toMatch(/90 − 0\.8\s*=\s*89\.2/);
    expect(mismatchText).toMatch(/heatmap/i);
    expect(mismatchText).toMatch(/Fix:/i);

    // Simulator trace shows the numeric breakdown + expected delta.
    await expect(page.getByText(/residual = 90 - 0\.8 = 89\.2/)).toBeVisible();
    await expect(
      page.getByText(/Expected residual = 18 \(Low\)\. Delta = 71\.2/)
    ).toBeVisible();

    // Reset for the next wrong attempt.
    await mismatchCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(mismatchCard).toBeHidden();

    // ---- Wrong attempt B: division (unbounded + DivideByZero) ----
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);

    const divCard = badTeachCard(page);
    await expect(divCard).toBeVisible();
    await expect(
      divCard.getByRole("heading", {
        name: /Division scales risk the wrong direction/i,
      })
    ).toBeVisible();

    const divText = await divCard.locator("p").first().innerText();
    expect(divText).toMatch(/DivideByZero|∞|NaN/);
    expect(divText).toMatch(/Residual must be ≤ inherent/i);
    expect(divText).toMatch(/Fix:/i);

    // Simulator log surfaces the DivideByZero diagnostic.
    await expect(page.locator("span").getByText(/Retry with effectiveness=0 → DivideByZero/)).toBeVisible();
    await expect(page.locator("span").getByText(/Scheduled Job aborted/)).toBeVisible();

    await divCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(divCard).toBeHidden();

    // ---- Correct attempt: multiplication by (1 − effectiveness) ----
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);

    const okCard = okTeachCard(page);
    await expect(okCard).toBeVisible();
    await expect(okCard.getByText(/^Correct$/)).toBeVisible();
    await expect(
      okCard.getByRole("heading", {
        name: /Residual = Inherent × \(1 − Effectiveness\)/i,
      })
    ).toBeVisible();

    const okText = await okCard.locator("p").first().innerText();
    expect(okText).toMatch(/reduction factor/i);
    expect(okText).toMatch(/Units contract/i);
    expect(okText).toMatch(/effectiveness=1\.0/);

    // Correct simulator trace shows the multiplication + bucket move.
    await expect(page.getByText(/residual = 90 \* \(1 - 0\.8\) = 18/)).toBeVisible();
    await expect(page.getByText(/Risk moved from High → Low/)).toBeVisible();

    // Continue CTA advances to the next puzzle (unlocked via seeded badges).
    await expect(
      okCard.getByRole("button", { name: /NEXT PUZZLE|FINISH MODULE/i })
    ).toBeVisible();
  });

  test("puzzle 2 (risk-level bucket): wrong ordering and correct ordering both render enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=hard`);
    await expect(
      page.getByRole("heading", {
        name: /Map a residual score to the IRM risk level bucket/i,
      })
    ).toBeVisible();

    // ---- Wrong attempt: reversed threshold ordering (dead code) ----
    await pickOption(
      page,
      "if (score > 30) return 'High'; if (score > 70) return 'Medium'; return 'Low';"
    );
    await runAndWait(page);

    const badCard = badTeachCard(page);
    await expect(badCard).toBeVisible();
    await expect(
      badCard.getByRole("heading", {
        name: /Unreachable branch — thresholds ordered low → high/i,
      })
    ).toBeVisible();

    const badText = await badCard.locator("p").first().innerText();
    expect(badText).toMatch(/Truth table/i);
    expect(badText).toMatch(/dead code/i);
    expect(badText).toMatch(/heatmap/i);
    expect(badText).toMatch(/Fix:/i);

    // Simulator log calls out the dead Medium branch.
    await expect(
      page.getByText(/Medium branch never executed — dead code/)
    ).toBeVisible();
    await expect(page.getByText(/score=50 → returned 'High' ❌/)).toBeVisible();

    await badCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(badCard).toBeHidden();

    // ---- Correct attempt: thresholds ordered high → low ----
    await pickOption(
      page,
      "if (score >= 70) return 'High'; if (score >= 30) return 'Medium'; return 'Low';"
    );
    await runAndWait(page);

    const okCard = okTeachCard(page);
    await expect(okCard).toBeVisible();
    await expect(
      okCard.getByRole("heading", { name: /Order thresholds high → low/i })
    ).toBeVisible();

    const okText = await okCard.locator("p").first().innerText();
    expect(okText).toMatch(/OOB IRM default bands/i);
    expect(okText).toMatch(/score ≥ 70/);
    expect(okText).toMatch(/Very High/);

    // Correct simulator trace enumerates all three buckets.
    await expect(page.getByText(/score=85 → 'High'/)).toBeVisible();
    await expect(page.getByText(/score=50 → 'Medium'/)).toBeVisible();
    await expect(page.getByText(/score=10 → 'Low'/)).toBeVisible();
  });
});
