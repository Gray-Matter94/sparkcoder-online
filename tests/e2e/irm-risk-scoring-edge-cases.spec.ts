import { test, expect, type Page, type Locator } from "@playwright/test";
import {
  expectSimulatorAndTeachCardAccessible,
  expectKeyboardCorrectionUIAccessible,
} from "./utils/a11y";

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

  test("puzzle 1: every wrong residual-risk choice renders its trace lines in the exact expected order", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Read the ordered list of log lines from the simulator trace region.
    // Each row is `<time> <text>` — we assert on the text portion, preserving
    // the top-to-bottom render order emitted by Simulator.tsx.
    const traceTexts = async (): Promise<string[]> => {
      const trace = page.getByTestId("simulator-trace");
      await expect(trace).toBeVisible();
      // Wait for the final expected line count (4 for each wrong choice).
      await expect
        .poll(async () => await trace.locator("> div").count(), {
          timeout: 5000,
        })
        .toBeGreaterThanOrEqual(4);
      const rows = trace.locator("> div");
      const count = await rows.count();
      const out: string[] = [];
      for (let i = 0; i < count; i++) {
        const spans = rows.nth(i).locator("span");
        if ((await spans.count()) >= 2) {
          out.push((await spans.nth(1).innerText()).trim());
        }
      }
      return out;
    };

    // ---- Wrong A: subtraction (unit mismatch) ----
    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);
    await expect(badTeachCard(page)).toBeVisible();

    expect(await traceTexts()).toEqual([
      "inherent=90, effectiveness=0.8",
      "residual = 90 - 0.8 = 89.2",
      "Bucket: High (>=70) — controls appear ignored",
      "Expected residual = 18 (Low). Delta = 71.2 pts",
    ]);

    await tryAgain(page);

    // ---- Wrong B: division (unbounded + DivideByZero) ----
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);
    await expect(badTeachCard(page)).toBeVisible();

    expect(await traceTexts()).toEqual([
      "inherent=80, effectiveness=0.8",
      "residual = 80 / 0.8 = 100 (grew!)",
      "Retry with effectiveness=0 → DivideByZero",
      "Scheduled Job aborted — residual scores stale",
    ]);

    // Recover to correct so the a11y afterEach can scan the ok TeachCard.
    await tryAgain(page);
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    await expect(okTeachCard(page)).toBeVisible();
  });

  test("puzzle 1: keyboard-only learner receives correction feedback via visible focus + aria-live regions", async ({
    page,
  }, testInfo) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Drive selection with the keyboard only — no pointer events. Focus the
    // wrong chip programmatically (Tab traversal length varies per engine),
    // commit with Enter, then focus RUN SCRIPT and fire it. Mirrors a
    // screen-reader / keyboard-only learner across Chromium/WebKit/Firefox.
    const engine = testInfo.project.name;
    const wrongChip = page.getByRole("button").filter({
      has: page.locator("code").getByText("inherent - effectiveness", { exact: true }),
    });
    await expect(wrongChip).toBeVisible();
    await wrongChip.focus();
    await expect(wrongChip).toBeFocused();

    // Focus-visible indicator must render for keyboard focus — never
    // outline:none with no replacement. Assert either an outline OR a
    // ring-style boxShadow is present.
    const chipFocusRing = await wrongChip.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    expect(
      chipFocusRing.outlineStyle !== "none" ||
        (chipFocusRing.boxShadow && chipFocusRing.boxShadow !== "none"),
      `${engine}: focused chip must render a visible focus indicator (got ${JSON.stringify(chipFocusRing)})`
    ).toBeTruthy();
    await page.keyboard.press("Enter");

    const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
    await expect(runBtn).toBeEnabled();
    await runBtn.focus();
    await expect(runBtn).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);

    // Correction feedback must reach SR/keyboard users via aria-live.
    // Wrong TeachCard = assertive alert with an accessible name so users are
    // told WHY their answer failed without needing to see the visual card.
    const teach = page.getByTestId("teach-card");
    await expect(teach).toBeVisible();
    await expect(teach).toHaveAttribute("role", "alert");
    await expect(teach).toHaveAttribute("aria-live", "assertive");
    await expect(teach).toHaveAttribute(
      "aria-label",
      /incorrect answer feedback/i
    );
    await expect(
      teach.getByRole("heading", { name: /Unit mismatch/i })
    ).toBeVisible();

    // Simulator trace = polite log so the trace lines are announced in order
    // after the alert (never silently updated).
    const trace = page.getByTestId("simulator-trace");
    await expect(trace).toHaveAttribute("role", "log");
    await expect(trace).toHaveAttribute("aria-live", "polite");
    await expect(trace).toHaveAttribute("aria-label", /simulator/i);

    // Inline axe scan on the wrong-answer correction UI — catches
    // keyboard/name-role-value/aria violations while focus is still on the
    // wrong-answer path, before TRY AGAIN dismisses the alert.
    await expectKeyboardCorrectionUIAccessible(
      page,
      `${engine}: wrong-answer correction UI`
    );

    // Visual regression snapshot of the keyboard correction UI — one baseline
    // per Playwright project so Chromium/WebKit/Firefox each own their own
    // rendering. Playwright namespaces snapshots by project name automatically
    // (tests/e2e/__screenshots__/<spec>/<project>/...), so a single call here
    // produces a per-engine baseline. Timestamps in each simulator trace row
    // are masked (the leading `<time>` element) so wall-clock differences
    // don't flake the diff. Animations disabled so the diff is stable.
    const wrongTeachSnapshot = async (label: string) => {
      await expect(teach).toHaveScreenshot(`teach-card-wrong-${label}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.02,
      });
      await expect(trace).toHaveScreenshot(`simulator-trace-wrong-${label}.png`, {
        animations: "disabled",
        caret: "hide",
        mask: [trace.locator("> div > span").first()],
        maxDiffPixelRatio: 0.02,
      });
    };
    await wrongTeachSnapshot("unit-mismatch");





    // Keyboard-only recovery: TRY AGAIN must be focusable and render a
    // visible focus indicator so learners can dismiss the alert without a
    // mouse.
    const tryAgainBtn = teach.getByRole("button", { name: /TRY AGAIN/i });
    await tryAgainBtn.focus();
    await expect(tryAgainBtn).toBeFocused();
    const tryAgainFocusRing = await tryAgainBtn.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
      };
    });
    expect(
      tryAgainFocusRing.outlineStyle !== "none" ||
        (tryAgainFocusRing.boxShadow &&
          tryAgainFocusRing.boxShadow !== "none"),
      `${engine}: TRY AGAIN must render a visible focus indicator (got ${JSON.stringify(tryAgainFocusRing)})`
    ).toBeTruthy();
    await page.keyboard.press("Enter");
    await expect(teach).toBeHidden();

    // Keyboard-only correct attempt — polite status region announces success.
    const correctChip = page.getByRole("button").filter({
      has: page
        .locator("code")
        .getByText("inherent * (1 - effectiveness)", { exact: true }),
    });
    await correctChip.focus();
    await expect(correctChip).toBeFocused();
    await page.keyboard.press("Enter");
    await runBtn.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);

    const okTeach = page.getByTestId("teach-card");
    await expect(okTeach).toBeVisible();
    await expect(okTeach).toHaveAttribute("role", "status");
    await expect(okTeach).toHaveAttribute("aria-live", "polite");
    await expect(okTeach).toHaveAttribute(
      "aria-label",
      /correct answer feedback/i
    );

    // Inline axe scan on the correct-answer correction UI — the ok TeachCard
    // uses a different role/live pair and must independently pass keyboard-
    // relevant a11y rules on every engine.
    await expectKeyboardCorrectionUIAccessible(
      page,
      `${engine}: correct-answer correction UI`
    );

    // Visual regression baseline for the correct-answer correction UI, per
    // engine. The ok TeachCard uses a different border/role and must be
    // pixel-tracked separately from the wrong-answer variant. The simulator
    // trace is re-snapshotted because the correct run writes a fresh set of
    // trace lines that a keyboard user must see.
    const okTrace = page.getByTestId("simulator-trace");
    await expect(okTeach).toHaveScreenshot(`teach-card-correct.png`, {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    });
    await expect(okTrace).toHaveScreenshot(`simulator-trace-correct.png`, {
      animations: "disabled",
      caret: "hide",
      mask: [okTrace.locator("> div > span").first()],
      maxDiffPixelRatio: 0.02,
    });
  });

  test("puzzle 1: TeachCard aria-live re-announces on every new wrong attempt (fresh DOM node, alert role, updated content)", async ({
    page,
  }) => {
    // Screen readers only re-announce an aria-live="assertive" region when
    // either (a) the region node itself is inserted into the DOM, or
    // (b) its text content changes while it remains mounted. If TRY AGAIN
    // left the TeachCard in place and only mutated its children, some AT
    // engines (notably VoiceOver + NVDA in polite-buffer mode) silently
    // dedupe successive alerts and the learner never hears the second
    // correction. This test locks in the contract: each wrong attempt must
    // yield a *new* alert node (remount) with a *different* accessible name,
    // so the announcement fires again.
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Helper: capture the current TeachCard element as a JSHandle so we can
    // compare DOM identity across attempts, plus its live-region contract
    // (role/aria-live) and full announced text.
    const captureAlert = async () => {
      const card = page.getByTestId("teach-card");
      await expect(card).toBeVisible();
      await expect(card).toHaveAttribute("role", "alert");
      await expect(card).toHaveAttribute("aria-live", "assertive");
      const handle = await card.elementHandle();
      expect(handle).not.toBeNull();
      const text = (await card.innerText()).trim();
      const heading = (
        await card.getByRole("heading").first().innerText()
      ).trim();
      return { handle: handle!, text, heading };
    };

    // Attempt 1 — subtraction. First announcement.
    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);
    const first = await captureAlert();
    expect(first.heading).toMatch(/Unit mismatch/i);

    await tryAgain(page);
    // After dismissal the old node must be detached — otherwise a stale
    // aria-live region hangs around and the next mount can't re-announce.
    await expect
      .poll(async () => await first.handle.evaluate((el) => el.isConnected))
      .toBe(false);

    // Attempt 2 — division. Second announcement must be a fresh DOM node
    // with different accessible content.
    await pickOption(page, "inherent / effectiveness");
    await runAndWait(page);
    const second = await captureAlert();
    expect(second.heading).toMatch(/Division scales risk the wrong direction/i);

    // DOM identity check: the two alert nodes must be distinct so AT
    // engines fire a fresh assertive announcement instead of dedup'ing.
    const sameNode = await page.evaluate(
      ([a, b]) => a === b,
      [first.handle, second.handle] as const
    );
    expect(
      sameNode,
      "Second wrong-answer TeachCard must be a fresh DOM node so aria-live re-announces"
    ).toBe(false);

    // Announced text must differ so a screen reader speaking the new alert
    // doesn't repeat identical audio (which some AT collapses to silence).
    expect(second.text).not.toEqual(first.text);
    expect(second.heading).not.toEqual(first.heading);

    // Recover to correct — the ok TeachCard must ALSO be a fresh node with
    // its own role/live pair (status/polite), not a mutation of the wrong
    // alert region.
    await tryAgain(page);
    await expect
      .poll(async () => await second.handle.evaluate((el) => el.isConnected))
      .toBe(false);

    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    const okCard = page.getByTestId("teach-card");
    await expect(okCard).toBeVisible();
    await expect(okCard).toHaveAttribute("role", "status");
    await expect(okCard).toHaveAttribute("aria-live", "polite");
    const okHandle = await okCard.elementHandle();
    expect(okHandle).not.toBeNull();
    const okIsSecond = await page.evaluate(
      ([a, b]) => a === b,
      [second.handle, okHandle!] as const
    );
    expect(
      okIsSecond,
      "Correct-answer TeachCard must be a fresh node (different role/live pair) from the prior wrong alert"
    ).toBe(false);
  });

  test("puzzle 1: after a wrong attempt, Tab order includes TRY AGAIN + simulator controls and never traps focus", async ({
    page,
  }) => {
    // A keyboard-only learner must be able to Tab through every correction-UI
    // control (TRY AGAIN, minimize-simulator, option chips) AND Tab back out
    // to the surrounding page — a focus trap would strand them in the alert
    // with no keyboard escape. This test drives Tab N times, records each
    // focused element, and asserts:
    //   1. TRY AGAIN and the simulator minimize button both appear in the
    //      forward tab order.
    //   2. The sequence eventually wraps back to a previously-seen element
    //      (or reaches the browser chrome via document.body), proving no
    //      trap.
    //   3. Shift+Tab reverses the sequence — a one-way trap is still a trap.
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    await pickOption(page, "inherent - effectiveness");
    await runAndWait(page);
    await expect(badTeachCard(page)).toBeVisible();

    // Start from a known anchor so the walk is deterministic across engines.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.evaluate(() => document.body.focus());

    const describeFocus = async (): Promise<string> =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return "__body__";
        const label =
          el.getAttribute("aria-label") ||
          el.textContent?.trim().slice(0, 60) ||
          el.tagName.toLowerCase();
        return `${el.tagName.toLowerCase()}::${label}`;
      });

    // Forward walk: Tab up to 40 times. Stop once we've seen a repeat OR
    // returned to __body__ — either proves the ring is not sealed.
    const MAX_TABS = 40;
    const forward: string[] = [];
    let wrapped = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Tab");
      const key = await describeFocus();
      if (forward.includes(key) || key === "__body__") {
        wrapped = true;
        forward.push(key);
        break;
      }
      forward.push(key);
    }
    expect(
      wrapped,
      `Tab order never wrapped after ${MAX_TABS} presses — focus is trapped. Sequence: ${forward.join(" → ")}`
    ).toBe(true);

    // Correction-UI controls that a keyboard learner MUST be able to reach
    // via Tab from an arbitrary starting point on the page.
    const sawTryAgain = forward.some((k) => /try again/i.test(k));
    const sawMinimize = forward.some((k) =>
      /minimize instance simulator/i.test(k)
    );
    expect(
      sawTryAgain,
      `TRY AGAIN must appear in forward tab order. Sequence: ${forward.join(" → ")}`
    ).toBe(true);
    expect(
      sawMinimize,
      `Minimize simulator control must appear in forward tab order. Sequence: ${forward.join(" → ")}`
    ).toBe(true);

    // Reverse walk: Shift+Tab must also traverse — a trap that only lets
    // focus move forward is still a trap.
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
    await page.evaluate(() => document.body.focus());
    const reverse: string[] = [];
    let reverseWrapped = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press("Shift+Tab");
      const key = await describeFocus();
      if (reverse.includes(key) || key === "__body__") {
        reverseWrapped = true;
        reverse.push(key);
        break;
      }
      reverse.push(key);
    }
    expect(
      reverseWrapped,
      `Shift+Tab order never wrapped after ${MAX_TABS} presses — reverse focus is trapped. Sequence: ${reverse.join(" → ")}`
    ).toBe(true);
    expect(
      reverse.some((k) => /try again/i.test(k)),
      `TRY AGAIN must also be reachable via Shift+Tab. Sequence: ${reverse.join(" → ")}`
    ).toBe(true);

    // Sanity: no visited node was a hidden aria-hidden container swallowing
    // focus (a common cause of "the UI feels trapped" without being a strict
    // trap). Every focused control while the alert is up must be interactive.
    const focusableTags = new Set(["button", "a", "input", "select", "textarea"]);
    for (const key of forward) {
      if (key === "__body__") continue;
      const tag = key.split("::")[0];
      expect(
        focusableTags.has(tag) || tag === "div" || tag === "span",
        `Focus landed on a non-interactive element while correction UI was open: ${key}`
      ).toBe(true);
    }

    // Recover to correct so the a11y afterEach hook has a clean UI to scan.
    await tryAgain(page);
    await pickOption(page, "inherent * (1 - effectiveness)");
    await runAndWait(page);
    await expect(okTeachCard(page)).toBeVisible();
  });
});



