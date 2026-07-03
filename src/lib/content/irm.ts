import type { CategoryMeta, Question } from "../questions";

export const IRM_CATEGORIES: CategoryMeta[] = [
  { id: "grc-tables", name: "GRC Tables", emoji: "🗂️", blurb: "Risk, control, entity model", color: "primary", track: "servicenow-irm" },
  { id: "risk-scoring", name: "Risk Scoring", emoji: "📊", blurb: "Inherent vs residual math", color: "accent", track: "servicenow-irm" },
  { id: "policy-compliance", name: "Policy & Compliance", emoji: "📜", blurb: "Authority docs, citations, controls", color: "secondary", track: "servicenow-irm" },
];

const T = (offset = 0) => {
  const base = new Date(2024, 0, 1, 9, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

export const IRM_QUESTIONS: Question[] = [
  // ============ GRC Tables ============
  {
    id: "irm-grc-1",
    category: "grc-tables",
    level: 1,
    filename: "risk_lookup.js",
    title: "Query the correct table for risk records associated with an entity.",
    code: [
      "var gr = new GlideRecord('{{SLOT}}');",
      "gr.addQuery('profile', entitySysId);",
      "gr.query();",
      "while (gr.next()) gs.info(gr.number + ' → ' + gr.state);",
    ],
    options: [
      {
        id: "a",
        text: "sn_risk_risk",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "sn_grc_risk",
        correct: false,
        feedback: {
          title: "Legacy GRC table",
          explain:
            "`sn_grc_risk` was the pre-IRM table. On modern IRM (Risk Management Advanced) risks live in `sn_risk_risk`. Querying the legacy table returns nothing on a current instance.",
          sim: {
            table: "sn_grc_risk",
            rows: [],
            logs: [
              { time: T(0), text: "Query returned 0 records", tone: "warn" },
              { time: T(1), text: "Legacy table — data migrated to sn_risk_risk", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "sn_compliance_control",
        correct: false,
        feedback: {
          title: "Wrong domain",
          explain:
            "`sn_compliance_control` holds Control instances (Policy & Compliance app), not risks. Risks and their scores live under the Risk Management module in `sn_risk_risk`.",
          sim: {
            table: "sn_compliance_control",
            rows: [
              { number: "CTRL0001001", state: "Attested", updated: "1h ago", highlight: "warn" },
            ],
            logs: [
              { time: T(0), text: "Returned control records — not what caller wanted", tone: "warn" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "sn_risk_risk",
      rows: [
        { number: "RISK0001001", state: "Analyze", updated: "just now", highlight: "ok" },
        { number: "RISK0001002", state: "Monitor", updated: "5m ago", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "Query returned 2 risks for entity", tone: "info" },
        { time: T(1), text: "*** Script: RISK0001001 → Analyze", tone: "ok" },
        { time: T(2), text: "*** Script: RISK0001002 → Monitor", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "sn_risk_risk is the modern risk table",
      explain:
        "The IRM Advanced apps use scoped tables prefixed `sn_risk_*`, `sn_compliance_*`, and `sn_policy_*`. Profiles (entities) live in `sn_grc_profile` — the join field on a risk is `profile`.",
    },
  },
  {
    id: "irm-grc-2",
    category: "grc-tables",
    level: 2,
    filename: "entity_profile.js",
    title: "Where do IRM entities (assets, processes, vendors) live?",
    code: [
      "var gr = new GlideRecord('{{SLOT}}');",
      "gr.addQuery('profile_type.name', 'Vendor');",
      "gr.query();",
    ],
    options: [
      {
        id: "a",
        text: "sn_grc_profile",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "cmdb_ci",
        correct: false,
        feedback: {
          title: "CMDB ≠ GRC profile",
          explain:
            "CMDB stores technical CIs. IRM wraps any scoped entity — CI, process, vendor, business unit — in a `sn_grc_profile` record so risks, controls, and issues can attach uniformly.",
          sim: {
            table: "cmdb_ci",
            rows: [{ number: "SRV-APP-01", state: "Operational", updated: "—", highlight: "warn" }],
            logs: [{ time: T(0), text: "Returned CIs, not IRM entities", tone: "warn" }],
          },
        },
      },
      {
        id: "c",
        text: "sn_risk_entity",
        correct: false,
        feedback: {
          title: "Not a real table",
          explain:
            "There's no `sn_risk_entity` table. IRM uses one central `sn_grc_profile` table with a `profile_type` reference to categorize (Vendor, Process, Asset, etc.).",
          sim: { rows: [], logs: [{ time: T(0), text: "Invalid table name", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "sn_grc_profile",
      rows: [
        { number: "PRF0001001", state: "Vendor · Acme", updated: "now", highlight: "ok" },
        { number: "PRF0001002", state: "Vendor · Globex", updated: "now", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "Filtered profiles by type=Vendor", tone: "info" },
        { time: T(1), text: "Returned 2 profile(s)", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Everything scoped in IRM is a Profile",
      explain:
        "A `sn_grc_profile` record is the anchor. It references a `profile_type` and can point back at a CMDB CI, vendor, or process. Risks, controls, and issues all attach to a profile — not the underlying CI directly.",
    },
  },

  // ============ Risk Scoring ============
  {
    id: "irm-score-1",
    category: "risk-scoring",
    level: 2,
    filename: "residual_risk.js",
    title: "Compute residual risk correctly (inherent reduced by control effectiveness).",
    code: [
      "var inherent = current.inherent_score;   // 0-100",
      "var effectiveness = current.control_effectiveness; // 0-1",
      "",
      "current.residual_score = {{SLOT}};",
    ],
    options: [
      {
        id: "a",
        text: "inherent * (1 - effectiveness)",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "inherent - effectiveness",
        correct: false,
        feedback: {
          title: "Unit mismatch — subtracting a fraction from a score",
          explain:
            "Effectiveness is a 0–1 fraction (percent of risk the control removes), not a point score on the 0–100 scale.\n\nWorked example (inherent=90, effectiveness=0.8):\n  • Your formula:  90 − 0.8   = 89.2  → still 'High'\n  • Correct:       90 × (1 − 0.8) = 18   → 'Low'\n\nWhy it matters:\n  • The residual barely moves, so effective controls look useless in reports.\n  • Risk heatmaps show every cell as High — leadership loses trust in scoring.\n  • It also breaks when effectiveness is 0 (no test yet): residual = inherent − 0 = inherent, which is fine mathematically but hides that the control was never verified.\n\nFix: always multiply by the *reduction factor* `(1 − effectiveness)`. That way effectiveness=0 leaves inherent untouched, effectiveness=1 drives residual to 0, and every value in between scales linearly.",
          sim: {
            table: "sn_risk_risk",
            rows: [{ number: "RISK0001010", state: "Residual = 89.2 ❌", updated: "now", highlight: "bad" }],
            logs: [
              { time: T(0), text: "inherent=90, effectiveness=0.8", tone: "info" },
              { time: T(1), text: "residual = 90 - 0.8 = 89.2", tone: "bad" },
              { time: T(2), text: "Bucket: High (>=70) — controls appear ignored", tone: "bad" },
              { time: T(3), text: "Expected residual = 18 (Low). Delta = 71.2 pts", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "inherent / effectiveness",
        correct: false,
        feedback: {
          title: "Division scales risk the wrong direction",
          explain:
            "Dividing by effectiveness makes residual GROW as controls improve, and blows up when effectiveness is 0.\n\nWorked examples (inherent=80):\n  • effectiveness=0.8 → 80 / 0.8 = 100  (residual > inherent!)\n  • effectiveness=0.5 → 80 / 0.5 = 160  (off the 0–100 scale)\n  • effectiveness=0   → 80 / 0   = ∞    (throws DivideByZero / NaN)\n\nWhy it's wrong:\n  • Residual must be ≤ inherent — controls can only reduce risk, never amplify it.\n  • Untested controls (effectiveness=0) crash the scheduled job and stall risk recalculation for the whole instance.\n  • Any value >100 breaks the Low/Medium/High bucketing logic downstream.\n\nFix: multiply by `(1 − effectiveness)` so the answer is bounded to [0, inherent] and effectiveness=0 safely returns the inherent score.",
          sim: {
            rows: [],
            logs: [
              { time: T(0), text: "inherent=80, effectiveness=0.8", tone: "info" },
              { time: T(1), text: "residual = 80 / 0.8 = 100 (grew!)", tone: "bad" },
              { time: T(2), text: "Retry with effectiveness=0 → DivideByZero", tone: "bad" },
              { time: T(3), text: "Scheduled Job aborted — residual scores stale", tone: "bad" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "sn_risk_risk",
      rows: [
        { number: "RISK0001010", state: "Inherent=90 → Residual=18", updated: "now", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "inherent=90, effectiveness=0.8", tone: "info" },
        { time: T(1), text: "residual = 90 * (1 - 0.8) = 18", tone: "ok" },
        { time: T(2), text: "Risk moved from High → Low", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Residual = Inherent × (1 − Effectiveness)",
      explain:
        "The stronger the control, the closer effectiveness is to 1 and the smaller the residual.\n\nMental model — 'reduction factor':\n  • effectiveness=0.0 (untested)     → residual = inherent × 1.0 = inherent\n  • effectiveness=0.5 (partial)      → residual = inherent × 0.5 = half\n  • effectiveness=1.0 (fully mitig.) → residual = inherent × 0.0 = 0\n\nUnits contract:\n  • inherent_score: number, 0–100 (Likelihood × Impact on OOB IRM)\n  • control_effectiveness: number, 0–1 (fraction, not percent)\n  • residual_score: number, 0–100 (bounded because (1−e) ∈ [0,1])\n\nWhen multiple controls apply, IRM combines them via `sn_grc.RiskCalculator` (compensating vs preventive), but the base identity is the same: residual scales down by the aggregate reduction factor.",
    },
  },
  {
    id: "irm-score-2",
    category: "risk-scoring",
    level: 3,
    filename: "risk_level.js",
    title: "Map a residual score to the IRM risk level bucket.",
    code: [
      "function riskLevel(score) {",
      "  {{SLOT}}",
      "}",
    ],
    options: [
      {
        id: "a",
        text: "if (score >= 70) return 'High'; if (score >= 30) return 'Medium'; return 'Low';",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "if (score > 30) return 'High'; if (score > 70) return 'Medium'; return 'Low';",
        correct: false,
        feedback: {
          title: "Unreachable branch — thresholds ordered low → high",
          explain:
            "`if` chains return on the first truthy match. Because `score > 30` is checked first, EVERY score above 30 returns 'High' and the `> 70` line is dead code.\n\nTruth table for your ordering:\n  • score=85 → 85>30 ✓ → 'High'    (right answer, wrong reason)\n  • score=50 → 50>30 ✓ → 'High'    ❌ (should be 'Medium')\n  • score=31 → 31>30 ✓ → 'High'    ❌ (should be 'Medium')\n  • score=10 → both fail → 'Low'   ✓\n\nDownstream damage:\n  • The Risk Heatmap paints 70% of records red.\n  • SLA escalations for 'High' risks fire on borderline items.\n  • Executive dashboards show a fake risk spike.\n\nFix: order the thresholds from the toughest bar downward, so once a lower bucket check runs you already know the higher one failed.",
          sim: {
            rows: [],
            logs: [
              { time: T(0), text: "score=85 → returned 'High' ✓ (accidentally)", tone: "warn" },
              { time: T(1), text: "score=50 → returned 'High' ❌ (should be Medium)", tone: "bad" },
              { time: T(2), text: "score=31 → returned 'High' ❌ (should be Medium)", tone: "bad" },
              { time: T(3), text: "Medium branch never executed — dead code", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "return score > 50 ? 'High' : 'Low';",
        correct: false,
        feedback: {
          title: "Missing Medium tier — collapses the heatmap",
          explain:
            "IRM ships a 3-tier scale by default (Low / Medium / High) and a 5-tier extended scale (Very Low → Very High). A 2-bucket function loses the middle band the whole product is calibrated for.\n\nWhat breaks:\n  • The Risk Matrix widget expects `risk_level` values matching its choice list. 'Low'/'High' only means Medium cells render blank.\n  • Filters like `risk_level=Medium` on reports return 0 rows.\n  • Escalation rules keyed to Medium (e.g. 'Medium → requires quarterly review') never trigger.\n  • Trending charts show sudden cliff jumps as scores cross 50 instead of a smooth Low→Medium→High progression.\n\nFix: match the choice list on `sn_risk_risk.risk_level` exactly — three (or five) return values with thresholds ordered high → low.",
          sim: {
            rows: [],
            logs: [
              { time: T(0), text: "score=85 → 'High'", tone: "warn" },
              { time: T(1), text: "score=50 → 'Low' ❌ (should be Medium)", tone: "bad" },
              { time: T(2), text: "score=31 → 'Low' ❌ (should be Medium)", tone: "bad" },
              { time: T(3), text: "Report filter risk_level=Medium → 0 rows", tone: "bad" },
            ],
          },
        },
      },
    ],
    correctSim: {
      rows: [],
      logs: [
        { time: T(0), text: "score=85 → 'High'", tone: "ok" },
        { time: T(1), text: "score=50 → 'Medium'", tone: "ok" },
        { time: T(2), text: "score=10 → 'Low'", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Order thresholds high → low",
      explain:
        "Cascading `if` checks return on the first match, so start with the toughest bar and let lower buckets act as fallthroughs.\n\nOOB IRM default bands:\n  • High    : score ≥ 70\n  • Medium  : 30 ≤ score < 70\n  • Low     : score < 30\n\nThis mirrors the choice list on `sn_risk_risk.risk_level` and the heatmap color stops. If your org uses the 5-tier scale, extend the same pattern:\n\n  if (score >= 80) return 'Very High';\n  if (score >= 60) return 'High';\n  if (score >= 40) return 'Medium';\n  if (score >= 20) return 'Low';\n  return 'Very Low';\n\nKeep the return strings identical to the choice list — a case-sensitive mismatch stores an empty value and breaks the heatmap silently.",
    },
  },

  // ============ Policy & Compliance ============
  {
    id: "irm-pc-1",
    category: "policy-compliance",
    level: 1,
    filename: "control_attest.js",
    title: "Trigger an attestation when a control's next review date arrives.",
    code: [
      "// Scheduled job — daily",
      "var gr = new GlideRecord('sn_compliance_control');",
      "gr.addQuery('next_review_date', '<=', gs.nowDateTime());",
      "gr.addQuery('state', 'monitor');",
      "gr.query();",
      "while (gr.next()) {",
      "  {{SLOT}};",
      "}",
    ],
    options: [
      {
        id: "a",
        text: "new sn_grc.AttestationUtils().createAttestation(gr.getUniqueValue(), 'control')",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "gr.state = 'attested'; gr.update()",
        correct: false,
        feedback: {
          title: "Skips the evidence step",
          explain:
            "Flipping the state pretends the control was reviewed. Auditors need the attestation record with responses and timestamps — created via `AttestationUtils`, not a manual state change.",
          sim: {
            table: "sn_compliance_control",
            rows: [
              { number: "CTRL0001001", state: "Attested (no evidence)", updated: "now", highlight: "bad" },
            ],
            logs: [
              { time: T(0), text: "State changed but no sn_grc_attestation row created", tone: "bad" },
              { time: T(1), text: "Audit trail broken — SOX finding likely", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "gs.eventQueue('control.review', gr)",
        correct: false,
        feedback: {
          title: "Fires nothing by itself",
          explain:
            "There's no OOB `control.review` event. Custom events need matching Script Actions or Notifications to do anything. The proper API for a repeatable, auditable attestation is `AttestationUtils`.",
          sim: {
            rows: [],
            logs: [{ time: T(0), text: "Event queued — no handler registered", tone: "warn" }],
          },
        },
      },
    ],
    correctSim: {
      table: "sn_grc_attestation",
      rows: [
        { number: "ATT0001001", state: "Ready · CTRL0001001", updated: "now", highlight: "ok" },
        { number: "ATT0001002", state: "Ready · CTRL0001002", updated: "now", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "Found 2 controls due for review", tone: "info" },
        { time: T(1), text: "AttestationUtils.createAttestation() → ATT0001001", tone: "ok" },
        { time: T(2), text: "AttestationUtils.createAttestation() → ATT0001002", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "AttestationUtils writes the audit trail",
      explain:
        "`sn_grc.AttestationUtils` creates the attestation record, links it to the source (control, risk, or policy), and clones the questionnaire template. That's the artifact auditors ask for — not a state flip on the source record.",
    },
  },
];
