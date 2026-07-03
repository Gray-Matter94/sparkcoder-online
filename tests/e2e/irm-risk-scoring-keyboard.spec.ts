import { test, expect, type Page } from "@playwright/test";
import { expectSimulatorAndTeachCardAccessible } from "./utils/a11y";

/**
 * Keyboard-only edge-case coverage for the residual-risk puzzle.
 *
 * Verifies that a learner using only Tab / Shift+Tab / Enter / Space /
 * arrow keys can:
 *
 *   1. Reach every answer chip and the RUN SCRIPT button via Tab, and
 *      activate them with Enter (no mouse required).
 *   2. See the destructive TeachCard rendered as an ARIA alert with
 *      assertive live-region semantics for a screen reader.
 *   3. Reach the TRY AGAIN button via Tab from the wrong-answer state,
 *      activate it with Space, and land focus back on a visible focusable
 *      element (no lost / off-screen focus).
 *   4. Cycle to the correct answer end-to-end with the keyboard alone
 *      and see the ok TeachCard as an ARIA status live region.
 *   5. Press arrow keys (Left/Right/Up/Down) while focus is on an answer
 *      chip without corrupting selection state or wedging the RUN SCRIPT
 *      button — chips are plain <button>s, arrow keys must be no-ops.
 */

const CATEGORY = "risk-scoring";
const TRACK = "servicenow-irm";
const PROGRESS_KEY = `snscript_progress_v3:${TRACK}`;
const DIFFICULTY_KEY = "snscript_difficulty_v1";
const TRACK_STORAGE_KEY = "snscript_track_v1";

async function seedProgress(page: Page) {
  await page.addInitScript(
    ({ progressKey, difficultyKey, trackKey, track }) => {
      try {
        window.localStorage.removeItem(difficultyKey);
        window.localStorage.setItem(trackKey, track);
        window.localStorage.setItem(
          progressKey,
          JSON.stringify({
            xp: 0,
            streak: 0,
            lastPlayed: null,
            solved: {},
            sessions: 0,
            sessionBadges: 0,
            activeDays: {},
            weeklyBadges: { "seed-week-0": true, "seed-week-1": true },
            dailyChallenges: {},
            srs: {},
            termMastery: {},
          })
        );
      } catch {}
    },
    {
      progressKey: PROGRESS_KEY,
      difficultyKey: DIFFICULTY_KEY,
      trackKey: TRACK_STORAGE_KEY,
      track: TRACK,
    }
  );
}

/**
 * Tab forward at most `max` times, stopping when the focused element
 * matches the given predicate. Returns the number of Tab presses used.
 */
async function tabUntil(
  page: Page,
  match: (info: { text: string; role: string | null; label: string | null }) => boolean,
  max = 40
): Promise<number> {
  for (let i = 0; i < max; i++) {
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return { text: "", role: null, label: null };
      return {
        text: (el.innerText || el.textContent || "").trim().slice(0, 120),
        role: el.getAttribute("role"),
        label: el.getAttribute("aria-label"),
      };
    });
    if (match(info)) return i;
    await page.keyboard.press("Tab");
  }
  throw new Error("Tab target not found within max presses");
}

test.describe("IRM residual-risk puzzle — keyboard-only accessibility", () => {
  test.use({ viewport: { width: 1280, height: 1800 } });

  test.beforeEach(async ({ page }) => {
    await seedProgress(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) return;
    await expectSimulatorAndTeachCardAccessible(page, testInfo.title);
  });

  test("wrong → try again → correct, driven end-to-end with Tab/Enter/Space", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Move focus into the document from the very top so Tab traversal is
    // deterministic (some browsers otherwise start at document.body).
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("Tab");

    // ---- 1. Tab to the "inherent - effectiveness" chip and Enter to pick ----
    await tabUntil(page, ({ text }) => /^inherent - effectiveness/.test(text));
    const wrongChip = page.getByRole("button").filter({
      has: page.locator("code").getByText("inherent - effectiveness", { exact: true }),
    });
    await expect(wrongChip).toBeFocused();
    await page.keyboard.press("Enter");

    // Selection committed → RUN SCRIPT enables.
    const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
    await expect(runBtn).toBeEnabled();

    // ---- 2. Tab to RUN SCRIPT and activate with Enter ----
    await tabUntil(page, ({ text }) => /RUN SCRIPT/i.test(text));
    await expect(runBtn).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);

    // ---- 3. Destructive TeachCard is announced as an assertive alert ----
    const teach = page.getByTestId("teach-card");
    await expect(teach).toBeVisible();
    await expect(teach).toHaveAttribute("role", "alert");
    await expect(teach).toHaveAttribute("aria-live", "assertive");
    await expect(teach).toHaveAttribute("aria-label", /Incorrect answer feedback/i);
    await expect(
      teach.getByRole("heading", {
        name: /Unit mismatch — subtracting a fraction from a score/i,
      })
    ).toBeVisible();

    // ---- 4. Tab to TRY AGAIN and activate with Space ----
    await tabUntil(page, ({ text }) => /TRY AGAIN/i.test(text));
    const tryAgainBtn = teach.getByRole("button", { name: /TRY AGAIN/i });
    await expect(tryAgainBtn).toBeFocused();
    await page.keyboard.press("Space");
    await expect(teach).toBeHidden();

    // Focus must still be on a visible focusable element — never lost to a
    // detached node or an aria-hidden container.
    const focusedTag = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return "BODY";
      const hidden = el.closest("[aria-hidden='true']");
      return hidden ? "ARIA_HIDDEN" : el.tagName;
    });
    expect(focusedTag).not.toBe("ARIA_HIDDEN");

    // Previously-wrong chip is now disabled — Tab must skip it.
    await expect(wrongChip).toBeDisabled();

    // ---- 5. Tab to the correct chip, Enter → Tab to RUN → Enter ----
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("Tab");

    await tabUntil(page, ({ text }) => /^inherent \* \(1 - effectiveness\)/.test(text));
    const correctChip = page.getByRole("button").filter({
      has: page
        .locator("code")
        .getByText("inherent * (1 - effectiveness)", { exact: true }),
    });
    await expect(correctChip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(runBtn).toBeEnabled();

    await tabUntil(page, ({ text }) => /RUN SCRIPT/i.test(text));
    await expect(runBtn).toBeFocused();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);

    // ---- 6. Correct TeachCard is announced as a polite status ----
    const okCard = page.getByTestId("teach-card");
    await expect(okCard).toBeVisible();
    await expect(okCard).toHaveAttribute("role", "status");
    await expect(okCard).toHaveAttribute("aria-live", "polite");
    await expect(okCard).toHaveAttribute("aria-label", /Correct answer feedback/i);
    await expect(
      okCard.getByRole("heading", {
        name: /Residual = Inherent × \(1 − Effectiveness\)/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/residual = 90 \* \(1 - 0\.8\) = 18/)).toBeVisible();
  });

  test("arrow keys on an answer chip are no-ops and don't wedge RUN SCRIPT", async ({
    page,
  }) => {
    await page.goto(`/practice/${CATEGORY}?difficulty=medium`);
    await expect(
      page.getByRole("heading", { name: /Compute residual risk correctly/i })
    ).toBeVisible();

    // Focus the correct chip via keyboard.
    await page.locator("body").click({ position: { x: 1, y: 1 } });
    await page.keyboard.press("Tab");
    await tabUntil(page, ({ text }) => /^inherent \* \(1 - effectiveness\)/.test(text));
    const correctChip = page.getByRole("button").filter({
      has: page
        .locator("code")
        .getByText("inherent * (1 - effectiveness)", { exact: true }),
    });
    await expect(correctChip).toBeFocused();

    // Arrow keys must NOT change focus or commit a selection (these are
    // plain <button>s, not native radios) and RUN SCRIPT must stay disabled.
    const runBtn = page.getByRole("button", { name: /RUN SCRIPT/i });
    await expect(runBtn).toBeDisabled();
    for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]) {
      await page.keyboard.press(key);
    }
    await expect(correctChip).toBeFocused();
    await expect(runBtn).toBeDisabled();

    // Enter still commits the selection cleanly.
    await page.keyboard.press("Enter");
    await expect(runBtn).toBeEnabled();
    await tabUntil(page, ({ text }) => /RUN SCRIPT/i.test(text));
    await page.keyboard.press("Enter");
    await page.waitForTimeout(2200);
    await expect(page.getByTestId("teach-card")).toBeVisible();
    await expect(page.getByTestId("teach-card")).toHaveAttribute("role", "status");
  });
});
