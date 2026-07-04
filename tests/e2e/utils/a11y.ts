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
    ])
    .disableRules(["color-contrast"])
    .analyze();

  expect(
    results.violations,
    `${label}: keyboard-only axe violations\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([]);
}
