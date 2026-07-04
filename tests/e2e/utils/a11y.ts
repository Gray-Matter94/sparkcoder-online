import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { Result as AxeResult, NodeResult } from "axe-core";

/**
 * Attach axe violations to the current Playwright test as artifacts, so
 * `test-results/<spec>-<test>-<project>/` (per-engine automatically, since
 * Playwright namespaces outputPath by project) contains a rich, greppable
 * dump for anyone triaging a keyboard/live-region a11y failure.
 *
 * Two attachments per failing scan:
 *   1. `<label>.axe.json` — the raw violations array (targets, html,
 *      failureSummary, help URL, related nodes). Machine-readable so a
 *      follow-up tool or dashboard can diff runs.
 *   2. `<label>.axe.txt`  — a compact human-readable summary: one block
 *      per rule with impact, help URL, and a bullet per offending node
 *      (target selector + html snippet + failureSummary). This is what
 *      you skim in the HTML report or when downloading artifacts from CI.
 *
 * The engine appears in the artifact path (Playwright's `outputDir`
 * includes the project name), so the same test failing on Chromium /
 * WebKit / Firefox produces three distinct, labeled artifact folders and
 * you can diff nodes across engines at a glance.
 *
 * Safe to call with an empty array — attachments are only written when
 * there is at least one violation, so passing runs stay artifact-free.
 */
async function attachAxeViolations(label: string, violations: AxeResult[]) {
  if (violations.length === 0) return;

  // `test.info()` throws outside a running test — every helper below is
  // only ever called from within a test body, so this is safe. We guard
  // anyway so a helper reused in a fixture / global setup doesn't crash.
  let info: ReturnType<typeof test.info>;
  try {
    info = test.info();
  } catch {
    return;
  }

  const project = info.project.name;
  const safeLabel = label
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  const base = `axe-${safeLabel || "correction-ui"}`;

  // ---- 1. Raw JSON — full axe payload for machine consumption. ----
  await info.attach(`${base}.${project}.json`, {
    body: JSON.stringify(
      {
        label,
        project,
        testTitle: info.title,
        testFile: info.file,
        violationCount: violations.length,
        violations,
      },
      null,
      2
    ),
    contentType: "application/json",
  });

  // ---- 2. Human-readable summary — the one you skim in the report. ----
  const nodeSummary = (n: NodeResult) => {
    const target = Array.isArray(n.target) ? n.target.join(" >> ") : String(n.target);
    const html = (n.html ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
    const why = (n.failureSummary ?? "").trim().replace(/\n+/g, "\n      ");
    return [
      `    - target: ${target}`,
      `      html:   ${html}`,
      why ? `      why:\n      ${why}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const ruleBlock = (v: AxeResult) => {
    const header = `[${v.impact ?? "unknown"}] ${v.id} — ${v.help}`;
    const url = v.helpUrl ? `  ${v.helpUrl}` : "";
    const nodes = v.nodes.map(nodeSummary).join("\n\n");
    return `${header}\n${url}\n  nodes (${v.nodes.length}):\n${nodes}`;
  };

  const summary = [
    `Axe violations — ${label}`,
    `Project (engine): ${project}`,
    `Test:             ${info.title}`,
    `File:             ${info.file}`,
    `Violations:       ${violations.length}`,
    `Total nodes:      ${violations.reduce((n, v) => n + v.nodes.length, 0)}`,
    "",
    "----",
    "",
    violations.map(ruleBlock).join("\n\n----\n\n"),
  ].join("\n");

  await info.attach(`${base}.${project}.txt`, {
    body: summary,
    contentType: "text/plain",
  });
}

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
 *
 * On violation: attaches `axe-<label>.<project>.{json,txt}` to the test
 * so per-engine artifacts pinpoint the offending nodes.
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

  await attachAxeViolations(`passive-${label}`, results.violations);

  expect(
    results.violations,
    `${label}: axe violations (see attached axe-passive-*.{json,txt} for per-node detail)\n${JSON.stringify(results.violations, null, 2)}`
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
 *
 * On violation: attaches `axe-keyboard-<label>.<project>.{json,txt}` to
 * the test so triage sees which nodes tripped each keyboard/live-region
 * rule, per engine.
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

  await attachAxeViolations(`keyboard-${label}`, results.violations);

  expect(
    results.violations,
    `${label}: keyboard-only axe violations (see attached axe-keyboard-*.{json,txt} for per-node detail)\n${JSON.stringify(results.violations, null, 2)}`
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
 *
 * On violation: attaches `axe-contrast-<label>.<project>.{json,txt}` so
 * per-engine artifacts show exactly which foreground/background pair
 * failed AA and by how much.
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

  await attachAxeViolations(`contrast-${label}`, aaViolations);

  expect(
    aaViolations,
    `${label}: WCAG 1.4.3 AA color-contrast violations on correction UI (see attached axe-contrast-*.{json,txt} for per-node detail)\n${JSON.stringify(
      aaViolations,
      null,
      2
    )}`
  ).toEqual([]);
}
