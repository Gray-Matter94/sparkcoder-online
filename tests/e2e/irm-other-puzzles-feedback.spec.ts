import { test, expect, type Page, type Locator } from "@playwright/test";
import { expectSimulatorAndTeachCardAccessible } from "./utils/a11y";


/**
 * Verifies enriched simulator + TeachCard feedback for the remaining
 * IRM practice puzzles (GRC Tables x2 and Policy & Compliance x1) for
 * both wrong and correct attempts.
 *
 *  - irm-grc-1  (level 1): sn_risk_risk vs legacy / wrong-domain tables
 *  - irm-grc-2  (level 2): sn_grc_profile vs cmdb_ci / fake table
 *  - irm-pc-1   (level 1): AttestationUtils vs state flip / stray event
 */

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

test.describe("IRM GRC Tables + Policy puzzles show detailed simulator + teach feedback", () => {
  test.use({ viewport: { width: 1280, height: 1800 } });

  test.beforeEach(async ({ page }) => {
    // Seed 2 badges so the higher-level puzzles in each category are unlocked.
    await seedProgress(page, 2);
  });

  // After each passing test the simulator trace + correct-answer TeachCard
  // are both on screen — assert SR affordances and run a scoped axe scan.
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) return;
    await expectSimulatorAndTeachCardAccessible(page, testInfo.title);
  });


  test("grc-tables puzzle 1 (sn_risk_risk): both wrong tables and the correct table render enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/grc-tables?difficulty=easy`);
    await expect(
      page.getByRole("heading", {
        name: /Query the correct table for risk records/i,
      })
    ).toBeVisible();

    // ---- Wrong attempt A: legacy sn_grc_risk ----
    await pickOption(page, "sn_grc_risk");
    await runAndWait(page);

    const legacyCard = badTeachCard(page);
    await expect(legacyCard).toBeVisible();
    await expect(
      legacyCard.getByRole("heading", { name: /Legacy GRC table/i })
    ).toBeVisible();
    const legacyText = await legacyCard.locator("p").first().innerText();
    expect(legacyText).toMatch(/pre-IRM table/i);
    expect(legacyText).toMatch(/sn_risk_risk/);

    await expect(
      page.getByText(/Query returned 0 records/)
    ).toBeVisible();
    await expect(
      page.getByText(/Legacy table — data migrated to sn_risk_risk/)
    ).toBeVisible();

    await legacyCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(legacyCard).toBeHidden();

    // ---- Wrong attempt B: sn_compliance_control (wrong domain) ----
    await pickOption(page, "sn_compliance_control");
    await runAndWait(page);

    const wrongDomainCard = badTeachCard(page);
    await expect(wrongDomainCard).toBeVisible();
    await expect(
      wrongDomainCard.getByRole("heading", { name: /Wrong domain/i })
    ).toBeVisible();
    const wrongDomainText = await wrongDomainCard.locator("p").first().innerText();
    expect(wrongDomainText).toMatch(/Control instances/i);
    expect(wrongDomainText).toMatch(/Risk Management module/i);

    await expect(
      page.getByText(/Returned control records — not what caller wanted/)
    ).toBeVisible();

    await wrongDomainCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(wrongDomainCard).toBeHidden();

    // ---- Correct attempt: sn_risk_risk ----
    await pickOption(page, "sn_risk_risk");
    await runAndWait(page);

    const okCard = okTeachCard(page);
    await expect(okCard).toBeVisible();
    await expect(okCard.getByText(/^Correct$/)).toBeVisible();
    await expect(
      okCard.getByRole("heading", {
        name: /sn_risk_risk is the modern risk table/i,
      })
    ).toBeVisible();
    const okText = await okCard.locator("p").first().innerText();
    expect(okText).toMatch(/sn_risk_\*/);
    expect(okText).toMatch(/sn_grc_profile/);

    await expect(
      page.getByText(/\*\*\* Script: RISK0001001 → Analyze/)
    ).toBeVisible();
    await expect(
      page.getByText(/Query returned 2 risks for entity/)
    ).toBeVisible();
  });

  test("grc-tables puzzle 2 (sn_grc_profile): both wrong tables and the correct table render enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/grc-tables?difficulty=medium`);
    await expect(
      page.getByRole("heading", {
        name: /Where do IRM entities/i,
      })
    ).toBeVisible();


    // ---- Wrong attempt A: cmdb_ci ----
    await pickOption(page, "cmdb_ci");
    await runAndWait(page);

    const cmdbCard = badTeachCard(page);
    await expect(cmdbCard).toBeVisible();
    await expect(
      cmdbCard.getByRole("heading", { name: /CMDB ≠ GRC profile/i })
    ).toBeVisible();
    const cmdbText = await cmdbCard.locator("p").first().innerText();
    expect(cmdbText).toMatch(/technical CIs/i);
    expect(cmdbText).toMatch(/sn_grc_profile/);

    await expect(
      page.getByText(/Returned CIs, not IRM entities/)
    ).toBeVisible();

    await cmdbCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(cmdbCard).toBeHidden();

    // ---- Wrong attempt B: sn_risk_entity (invalid) ----
    await pickOption(page, "sn_risk_entity");
    await runAndWait(page);

    const invalidCard = badTeachCard(page);
    await expect(invalidCard).toBeVisible();
    await expect(
      invalidCard.getByRole("heading", { name: /Not a real table/i })
    ).toBeVisible();
    const invalidText = await invalidCard.locator("p").first().innerText();
    expect(invalidText).toMatch(/no `sn_risk_entity` table/i);
    expect(invalidText).toMatch(/profile_type/);

    await expect(page.getByText(/Invalid table name/)).toBeVisible();

    await invalidCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(invalidCard).toBeHidden();

    // ---- Correct attempt: sn_grc_profile ----
    await pickOption(page, "sn_grc_profile");
    await runAndWait(page);

    const okCard = okTeachCard(page);
    await expect(okCard).toBeVisible();
    await expect(
      okCard.getByRole("heading", {
        name: /Everything scoped in IRM is a Profile/i,
      })
    ).toBeVisible();
    const okText = await okCard.locator("p").first().innerText();
    expect(okText).toMatch(/profile_type/);
    expect(okText).toMatch(/anchor/i);

    await expect(
      page.getByText(/Filtered profiles by type=Vendor/)
    ).toBeVisible();
    await expect(page.getByText(/Returned 2 profile\(s\)/)).toBeVisible();
  });

  test("policy-compliance puzzle 1 (AttestationUtils): both wrong actions and the correct API render enriched feedback", async ({
    page,
  }) => {
    await page.goto(`/practice/policy-compliance?difficulty=easy`);
    await expect(
      page.getByRole("heading", {
        name: /Trigger an attestation when a control's next review date/i,
      })
    ).toBeVisible();

    // ---- Wrong attempt A: state flip ----
    await pickOption(page, "gr.state = 'attested'; gr.update()");
    await runAndWait(page);

    const flipCard = badTeachCard(page);
    await expect(flipCard).toBeVisible();
    await expect(
      flipCard.getByRole("heading", { name: /Skips the evidence step/i })
    ).toBeVisible();
    const flipText = await flipCard.locator("p").first().innerText();
    expect(flipText).toMatch(/AttestationUtils/);
    expect(flipText).toMatch(/auditors/i);

    await expect(
      page.getByText(/State changed but no sn_grc_attestation row created/)
    ).toBeVisible();
    await expect(
      page.getByText(/Audit trail broken — SOX finding likely/)
    ).toBeVisible();

    await flipCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(flipCard).toBeHidden();

    // ---- Wrong attempt B: stray event ----
    await pickOption(page, "gs.eventQueue('control.review', gr)");
    await runAndWait(page);

    const eventCard = badTeachCard(page);
    await expect(eventCard).toBeVisible();
    await expect(
      eventCard.getByRole("heading", { name: /Fires nothing by itself/i })
    ).toBeVisible();
    const eventText = await eventCard.locator("p").first().innerText();
    expect(eventText).toMatch(/no OOB `control\.review` event/i);
    expect(eventText).toMatch(/Script Actions or Notifications/i);

    await expect(
      page.getByText(/Event queued — no handler registered/)
    ).toBeVisible();

    await eventCard.getByRole("button", { name: /TRY AGAIN/i }).click({ force: true });
    await expect(eventCard).toBeHidden();

    // ---- Correct attempt: AttestationUtils.createAttestation ----
    await pickOption(
      page,
      "new sn_grc.AttestationUtils().createAttestation(gr.getUniqueValue(), 'control')"
    );
    await runAndWait(page);

    const okCard = okTeachCard(page);
    await expect(okCard).toBeVisible();
    await expect(
      okCard.getByRole("heading", {
        name: /AttestationUtils writes the audit trail/i,
      })
    ).toBeVisible();
    const okText = await okCard.locator("p").first().innerText();
    expect(okText).toMatch(/sn_grc\.AttestationUtils/);
    expect(okText).toMatch(/questionnaire template/i);

    await expect(
      page.getByText(/Found 2 controls due for review/)
    ).toBeVisible();
    await expect(
      page.getByText(/AttestationUtils\.createAttestation\(\) → ATT0001001/)
    ).toBeVisible();
  });
});
