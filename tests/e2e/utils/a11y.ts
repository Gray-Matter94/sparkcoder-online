import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Runs an axe-core scan scoped to the IRM simulator + feedback surfaces
 * ([data-testid="simulator-trace"] and [data-testid="teach-card"]) and
 * asserts there are zero WCAG 2.1 A/AA violations. Also verifies both
 * regions carry the ARIA affordances screen-reader users depend on:
 *   - simulator trace: role=log, aria-live=polite, accessible name
 *   - teach card:      role=status|alert, aria-live, accessible name
 *
 * Call after a user action produces feedback (e.g. after RUN SCRIPT).
 *
 * Color-contrast is disabled: the app uses branded design tokens that
 * are validated in the a11y-review workflow; per-test contrast noise
 * would make this check flaky without adding SR-readability signal.
 */
export async function expectSimulatorAndTeachCardAccessible(
  page: Page,
  label: string
) {
  const teach = page.getByTestId("teach-card");
  const trace = page.getByTestId("simulator-trace");

  await expect(teach, `${label}: TeachCard present`).toBeVisible();
  await expect(trace, `${label}: simulator trace present`).toBeVisible();

  // Screen-reader affordances on the TeachCard.
  const teachRole = await teach.getAttribute("role");
  expect(
    teachRole === "status" || teachRole === "alert",
    `${label}: TeachCard role must be status|alert (got ${teachRole})`
  ).toBe(true);
  await expect(teach).toHaveAttribute("aria-live", /polite|assertive/);
  await expect(teach).toHaveAttribute("aria-label", /answer feedback/i);

  // Screen-reader affordances on the simulator trace.
  await expect(trace).toHaveAttribute("role", "log");
  await expect(trace).toHaveAttribute("aria-live", "polite");
  await expect(trace).toHaveAttribute("aria-label", /simulator/i);

  const results = await new AxeBuilder({ page })
    .include('[data-testid="teach-card"]')
    .include('[data-testid="simulator-trace"]')
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();

  expect(
    results.violations,
    `${label}: axe violations\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([]);
}

/**
 * Keyboard-only correction-UI scan. Runs axe scoped to the TeachCard +
 * simulator trace with the WCAG keyboard/focus rule families explicitly
 * enabled so violations that only bite keyboard users (missing focusable
 * controls, positive tabindex, aria-hidden focus traps, name-role-value
 * gaps on the interactive controls inside the alert) are surfaced.
 *
 * Call inline from a keyboard-driven test AFTER the feedback surface has
 * rendered, in addition to the passive afterEach scan.
 */
export async function expectKeyboardCorrectionUIAccessible(
  page: Page,
  label: string
) {
  const teach = page.getByTestId("teach-card");
  const trace = page.getByTestId("simulator-trace");
  await expect(teach, `${label}: TeachCard present`).toBeVisible();
  await expect(trace, `${label}: simulator trace present`).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include('[data-testid="teach-card"]')
    .include('[data-testid="simulator-trace"]')
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "cat.keyboard",
      "cat.name-role-value",
      "cat.aria",
      "cat.structure",
      "cat.time-and-media",
      "cat.semantics",
      "best-practice",
    ])
    .disableRules(["color-contrast"])
    .analyze();

  expect(
    results.violations,
    `${label}: keyboard-only axe violations\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([]);
}

/**
 * Color-contrast scan for the correction surfaces. The passive/keyboard
 * scans deliberately disable `color-contrast` (branded tokens + animated
 * rows make the general rule flaky), so this dedicated helper re-enables
 * WCAG 1.4.3 (AA) + 1.4.11 (Non-text Contrast) axe rules scoped to the
 * TeachCard AND the tone-highlighted simulator log rows.
 *
 * Rationale: corrected states use `text-primary` / `text-destructive` on
 * tinted backgrounds and the TRY AGAIN / NEXT PUZZLE button uses a solid
 * primary/destructive fill — every one of those foreground+background
 * pairs must clear 4.5:1 (normal text) or 3:1 (large text / UI). A
 * regression that dims one of these tokens would leave color-blind or
 * low-vision learners unable to read the feedback they need to recover.
 *
 * Call AFTER the feedback surface has fully rendered (post-RUN SCRIPT and
 * post-log-animation) so axe measures the final painted colors, not an
 * in-flight animation frame.
 */
export async function expectCorrectionColorContrastAccessible(
  page: Page,
  label: string
) {
  const teach = page.getByTestId("teach-card");
  const trace = page.getByTestId("simulator-trace");
  await expect(teach, `${label}: TeachCard present`).toBeVisible();
  await expect(trace, `${label}: simulator trace present`).toBeVisible();

  // Ensure the trace has finished animating rows in — axe reads computed
  // styles at scan time, and an in-flight `animate-log-in` opacity would
  // trip color-contrast with false positives. Wait until at least one row
  // is fully opaque.
  await expect
    .poll(async () =>
      trace.locator("> div").first().evaluate((el) => {
        const cs = getComputedStyle(el);
        return parseFloat(cs.opacity);
      })
    )
    .toBeGreaterThanOrEqual(0.99);

  const results = await new AxeBuilder({ page })
    .include('[data-testid="teach-card"]')
    .include('[data-testid="simulator-trace"]')
    .withRules(["color-contrast", "color-contrast-enhanced"])
    .analyze();

  // `color-contrast-enhanced` (AAA) is included for signal but only AA
  // (`color-contrast`) failures are hard-failed — matching WCAG 2.1 AA,
  // which is what the a11y-review workflow validates against.
  const aaViolations = results.violations.filter(
    (v) => v.id === "color-contrast"
  );
  expect(
    aaViolations,
    `${label}: WCAG 1.4.3 AA color-contrast violations on correction UI\n${JSON.stringify(
      aaViolations,
      null,
      2
    )}`
  ).toEqual([]);
}

