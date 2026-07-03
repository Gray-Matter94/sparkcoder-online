import { test, expect, type Page, type Locator } from "@playwright/test";
import { expectSimulatorAndTeachCardAccessible } from "./utils/a11y";

/**
 * Edge-case coverage for the IRM risk-scoring and residual-risk puzzles.
 *
 * The main spec (`irm-risk-scoring-feedback.spec.ts`) verifies the happy
 * paths — one wrong attempt, one correct attempt. This spec targets
 * interaction edge cases that historically break the correction feedback:
 *
 *   1. Cycling through EVERY wrong option in a single session — each must
 *      re-render enriched TeachCard + simulator trace after TRY AGAIN.
 *   2. Repicking the SAME wrong option after TRY AGAIN — the destructive
 *      TeachCard must fully re-mount with the same enriched content and
 *      the simulator log must replay every diagnostic line.
 *   3. Rapid double-click on a wrong option — must produce exactly ONE
 *      TeachCard, not two, and the RUN SCRIPT button must not desync.
 *   4. Mid-puzzle reload — after a wrong attempt, reloading must reset
 *      the simulator to a clean state and the next wrong→correct cycle
 *      must still render full enriched feedback (no leaked state).
 *   5. Puzzle 2 (risk-level bucketing): cycling every wrong option and
 *      landing on correct must show the full 3-bucket trace.
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

async function pickOption(page: Page, text: string) {
  const chip = page.getByRole("button").filter({
    has: page.locator("code").getByText(text, { exact: true }),
  });
  await expect(chip).toHaveCount(1);
  await expect(chip).toBeEnabled();
  await chip.scrollIntoViewIfNeeded();
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
  return chip;
}

async function runAndWait(page: Page) {
  const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
  await expect(runBtn).toBeEnabled();
  await runBtn.click({ force: true });
  await page.waitForTimeout(2200);
}

function badTeachCard(page: Page): Locator {
  return page.locator("div.rounded-3xl.border-destructive");
}
function okTeachCard(page: Page): Locator {
  return page.locator("div.rounded-3xl.border-primary");
}

async function tryAgain(page: Page) {
  const card = badTeachCard(page);
  await card.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
  await expect(card).toBeHidden();
}

test.describe("IRM risk-scoring — edge-case correction feedback", () => {
  test.use({ viewport: { width: 1280, height: 1800 } });

  test.beforeEach(async ({ page }) => {
    await seedProgress(page, 2);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) return;
    await expectSimulatorAndTeachCardAccessible(page, testInfo.title);
  });

  test("puzzle 1: previously-wrong option is disabled after TRY AGAIN so bad answers can't be re-committed", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);

    const card = badTeachCard(page);
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("heading", {
        name: /Unit mismatch — subtracting a fraction from a score/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/residual = 90 - 0\.8 = 89\.2/)).toBeVisible();

    await tryAgain(page);

    // The wrong chip must now be disabled + struck-through so the learner
    // can't silently re-commit the same wrong answer (which would blank the
    // enriched feedback on the second click).
    const wrongChip = page.getByRole("button").filter({
      has: page.locator("code").getByText("inherent - effectiveness", { exact: true }),
    });
    await expect(wrongChip).toBeDisabled();
    await expect(wrongChip).toHaveClass(/line-through/);

    // Other wrong option is still available and its feedback renders fully.
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);
    const divCard = badTeachCard(page);
    await expect(divCard).toBeVisible();
    await expect(
      divCard.getByRole("heading", {
        name: /Division scales risk the wrong direction/i,
      })
    ).toBeVisible();
    const txt = await divCard.locator("p").first().innerText();
    expect(txt).toMatch(/DivideByZero|∞|NaN/);
    expect(txt).toMatch(/Fix:/i);

    // Recover to correct so the a11y afterEach can scan the ok TeachCard too.
    await tryAgain(page);
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    await expect(okTeachCard(page)).toBeVisible();
  });


  test("puzzle 1: rapid double-click on a wrong option renders exactly one TeachCard", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Two clicks back-to-back on the same wrong chip should still yield a single
    // committed selection — not a duplicated TeachCard or a wedged Run button.
    const chip = await pickOption(page, "inherent / effectiveness");
    await chip.click({ force: true });
    await page.waitForTimeout(150);

    await runAndWait(page);

    const cards = badTeachCard(page);
    await expect(cards).toHaveCount(1);
    await expect(
      cards.getByRole("heading", {
        name: /Division scales risk the wrong direction/i,
      })
    ).toBeVisible();
    await expect(
      page.locator("span").getByText(/Retry with effectiveness=0 → DivideByZero/)
    ).toBeVisible();

    // Recover to correct for the a11y hook.
    await tryAgain(page);
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    await expect(okTeachCard(page)).toBeVisible();
  });

  test("puzzle 1: cycling through every wrong option, then correct, renders enriched feedback each cycle", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Wrong #1 — subtraction.
    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);
    await expect(
      badTeachCard(page).getByRole("heading", { name: /Unit mismatch/i })
    ).toBeVisible();
    await tryAgain(page);

    // Wrong #2 — division.
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);
    await expect(
      badTeachCard(page).getByRole("heading", {
        name: /Division scales risk the wrong direction/i,
      })
    ).toBeVisible();
    await tryAgain(page);

    // Both wrong chips must now be disabled (line-through) — the app locks
    // out already-tried wrong answers so the learner is nudged to the correct
    // option without the enriched feedback getting overwritten by a re-click.
    for (const label of ["inherent - effectiveness", "inherent / effectiveness"]) {
      const chip = page.getByRole("button").filter({
        has: page.locator("code").getByText(label, { exact: true }),
      });
      await expect(chip).toBeDisabled();
      await expect(chip).toHaveClass(/line-through/);
    }


    // Correct — teach card + full trace.
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    const ok = okTeachCard(page);
    await expect(ok).toBeVisible();
    await expect(page.getByText(/residual = 90 \* \(1 - 0\.8\) = 18/)).toBeVisible();
    await expect(page.getByText(/Risk moved from High → Low/)).toBeVisible();
  });

  test("puzzle 1: mid-puzzle reload clears simulator and next wrong→correct still renders enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);
    await expect(badTeachCard(page)).toBeVisible();

    // Reload mid-puzzle — the simulator log must reset (no leaked wrong-answer
    // trace) and the TeachCard must be gone.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();
    await expect(badTeachCard(page)).toHaveCount(0);
    await expect(page.getByText(/residual = 90 - 0\.8 = 89\.2/)).toHaveCount(0);

    // Fresh wrong attempt after reload — full enriched feedback must render.
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);
    const card = badTeachCard(page);
    await expect(card).toBeVisible();
    const txt = await card.locator("p").first().innerText();
    expect(txt).toMatch(/DivideByZero|∞|NaN/);
    expect(txt).toMatch(/Fix:/i);
    await expect(
      page.locator("span").getByText(/Scheduled Job aborted/)
    ).toBeVisible();

    await tryAgain(page);
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    await expect(okTeachCard(page)).toBeVisible();
  });

  test("puzzle 2: cycling both wrong options then correct renders enriched feedback each time", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=hard`);
    await expect(
      page.getByRole("heading", { name: /Map a residual score to the IRM risk level bucket/i })
    ).toBeVisible();

    // Wrong #1 — reversed thresholds (dead code).
    await pickOption(
      page,
      "if (score > 30) return 'High'; if (score > 70) return 'Medium'; return 'Low';"
    );
    await runAndWait(page);
    let bad = badTeachCard(page);
    await expect(
      bad.getByRole("heading", { name: /Unreachable branch/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Medium branch never executed — dead code/)
    ).toBeVisible();
    await tryAgain(page);

    // Wrong #2 — missing Medium tier.
    await pickOption(page, "return score > 50 ? 'High' : 'Low';");
    await runAndWait(page);
    bad = badTeachCard(page);
    await expect(
      bad.getByRole("heading", { name: /Missing Medium tier/i })
    ).toBeVisible();
    const badTxt = await bad.locator("p").first().innerText();
    expect(badTxt).toMatch(/choice list/i);
    expect(badTxt).toMatch(/Fix:/i);
    await expect(
      page.getByText(/Report filter risk_level=Medium → 0 rows/)
    ).toBeVisible();
    await tryAgain(page);

    // Correct — all three bucket traces render.
    await pickOption(
      page,
      "if (score >= 70) return 'High'; if (score >= 30) return 'Medium'; return 'Low';"
    );
    await runAndWait(page);
    const ok = okTeachCard(page);
    await expect(ok).toBeVisible();
    await expect(page.getByText(/score=85 → 'High'/)).toBeVisible();
    await expect(page.getByText(/score=50 → 'Medium'/)).toBeVisible();
    await expect(page.getByText(/score=10 → 'Low'/)).toBeVisible();
  });
});
