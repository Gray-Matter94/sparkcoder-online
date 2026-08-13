import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";
import { QUICK_ANSWERS, SCENARIO_QA } from "@/lib/content/irm-interview";

const TITLE = "ServiceNow IRM Architect Interview Questions & Answers";
const DESCRIPTION =
  "14 ServiceNow IRM architect interview questions with answers: risk scoring, control architecture, entity filters, vendor risk, audit evidence — plus simulator traces.";
const URL =
  "https://www.sparkcoder.online/learn/irm-architect-interview-questions";

interface Lesson {
  id: string;
  title: string;
  prompt: string;
  approach: string[];
  code: string;
  output: SimulatorOutput;
  pitfall: string;
}

const LESSONS: Lesson[] = [
  {
    id: "risk-assessment",
    title: "1. Risk Assessment methodology — inherent, residual, and target",
    prompt:
      "Walk me through how IRM computes a risk score from inherent to residual on a sn_risk_risk record.",
    approach: [
      "Inherent risk = likelihood × impact, scored BEFORE controls are applied.",
      "Residual risk = inherent risk reduced by the effectiveness of mapped controls (sn_compliance_control).",
      "Target risk is the appetite the business will tolerate — set on the risk framework, not the risk record.",
      "Assessment templates (sn_risk_assessment_template) standardize the question set so scores are comparable across BUs.",
    ],
    code: `var risk = new GlideRecord('sn_risk_risk');
risk.get(riskSysId);
var inherent = risk.likelihood * risk.impact;
var ctrlAgg  = new GlideAggregate('sn_compliance_m2m_control_risk');
ctrlAgg.addQuery('risk', riskSysId);
ctrlAgg.addAggregate('AVG', 'control.effectiveness');
ctrlAgg.query();
ctrlAgg.next();
var eff = parseFloat(ctrlAgg.getAggregate('AVG','control.effectiveness')) || 0;
var residual = inherent * (1 - eff/100);
gs.info('inherent=' + inherent + ' residual=' + residual);`,
    output: {
      table: "sn_risk_risk",
      logs: [
        { time: "", text: "likelihood=4 impact=5 → inherent=20", tone: "info" },
        { time: "", text: "3 controls, AVG effectiveness=65%", tone: "info" },
        { time: "", text: "residual = 20 × (1 - 0.65) = 7", tone: "ok" },
        { time: "", text: "target appetite = 8 → within tolerance", tone: "ok" },
      ],
      rows: [
        { number: "RISK0001023", state: "inherent=20", updated: "residual=7", highlight: "ok" },
      ],
    },
    pitfall:
      "Multiplying effectiveness percentages across controls (compounding) instead of averaging — it produces unrealistically low residuals and fails audit review.",
  },
  {
    id: "control-testing",
    title: "2. Control testing — attestation vs. continuous monitoring",
    prompt:
      "When would you choose continuous monitoring over scheduled attestation for a SOX control?",
    approach: [
      "Attestation = a human asserts the control worked over a period; cheap to configure, weak as evidence.",
      "Continuous monitoring = an indicator (sn_grc_indicator) queries the source system on a schedule and writes a result.",
      "SOX IT general controls (access reviews, change management) belong in continuous monitoring — indicators on sys_user_group, change_request.",
      "Indicator templates make the script reusable across entities; the result populates issue records when thresholds break.",
    ],
    code: `// sn_grc_indicator script — orphan admin accounts
var gr = new GlideRecord('sys_user_has_role');
gr.addQuery('role.name', 'admin');
gr.addQuery('user.active', true);
gr.addQuery('user.last_login_time', '<', gs.daysAgo(90));
gr.query();
result = gr.getRowCount();   // indicator writes 'result'
// > 0 → automatic GRC issue under the mapped control`,
    output: {
      table: "sn_grc_indicator_result",
      logs: [
        { time: "", text: "indicator: Orphan Admin Accounts", tone: "info" },
        { time: "", text: "query returned 2 stale admins", tone: "warn" },
        { time: "", text: "result=2, threshold=0 → breach", tone: "bad" },
        { time: "", text: "auto-created GRC issue ISS0009312", tone: "warn" },
      ],
      rows: [
        { number: "IND0001", state: "continuous", updated: "breach", highlight: "bad" },
        { number: "IND0002", state: "attestation", updated: "pass", highlight: "ok" },
      ],
    },
    pitfall:
      "Returning a boolean from the indicator script — the engine expects the 'result' variable as a number. Booleans get coerced to 0/1 and silently miss thresholds.",
  },
  {
    id: "profile-types",
    title: "3. Profile types — what an entity actually is",
    prompt:
      "A client wants risks scoped to business services AND vendors. How do you model that in IRM?",
    approach: [
      "Profile types (sn_grc_profile_type) define WHAT is being assessed — Business Service, Vendor, Process, Application.",
      "Profiles (sn_grc_profile) are the instances — each row is one assessable entity, pointing at a profile type and a source table.",
      "Risks, controls, and issues attach to profiles, not directly to source records — that's the indirection that lets one risk apply to many entities.",
      "Vendor risk uses the sn_vdr_risk_asmt module which extends profile + assessment with tiering logic.",
    ],
    code: `// Create profile for a business service
var prof = new GlideRecord('sn_grc_profile');
prof.initialize();
prof.profile_type = businessServiceTypeSysId;
prof.table        = 'cmdb_ci_service';
prof.document     = serviceSysId;
prof.insert();
// Now risks/controls map to prof.sys_id, not the CI directly`,
    output: {
      table: "sn_grc_profile",
      logs: [
        { time: "", text: "profile_type = Business Service", tone: "info" },
        { time: "", text: "linked CI: Online Banking", tone: "info" },
        { time: "", text: "2 risks inherited from framework", tone: "ok" },
        { time: "", text: "5 controls auto-mapped", tone: "ok" },
      ],
      rows: [
        { number: "PRF0001", state: "Business Service", updated: "Online Banking", highlight: "ok" },
        { number: "PRF0002", state: "Vendor", updated: "AcmeCloud Inc.", highlight: "ok" },
      ],
    },
    pitfall:
      "Attaching risks straight to cmdb_ci or core_company records — it bypasses the profile layer and breaks the entity hierarchy reports that execs rely on.",
  },
  {
    id: "issue-remediation",
    title: "4. Issue & remediation workflow — closing the loop",
    prompt:
      "What happens after an indicator breach creates an issue? How does remediation tie back?",
    approach: [
      "Indicator breach → sn_grc_issue auto-created, linked to the failing control and profile.",
      "Issue routes to the control owner; remediation tasks (sn_grc_remediation_task) hold the actual work.",
      "Tasks can spawn change_request or incident records via Flow Designer for cross-module coordination.",
      "Issue closure requires evidence — attached doc or linked test result — before state can move to Closed/Resolved.",
    ],
    code: `// Flow Designer step: when issue.state = Closed
if (current.state == 3 && !current.evidence_attachment) {
  current.setAbortAction(true);
  gs.addErrorMessage('Attach evidence before closing.');
}`,
    output: {
      table: "sn_grc_issue",
      logs: [
        { time: "", text: "issue ISS0009312 opened from IND0001", tone: "warn" },
        { time: "", text: "owner = grc.lead@acme.com", tone: "info" },
        { time: "", text: "remediation task RTK0004 created", tone: "info" },
        { time: "", text: "evidence attached → state=Closed", tone: "ok" },
      ],
      rows: [
        { number: "ISS0009312", state: "Closed", updated: "evidence ok", highlight: "ok" },
        { number: "RTK0004", state: "Complete", updated: "owner signed", highlight: "ok" },
      ],
    },
    pitfall:
      "Letting the indicator re-fire and spawn duplicate issues — set 'create issue only if open issue does not exist' on the indicator, or you'll drown the GRC team in noise.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LESSONS.map((l) => ({
    "@type": "Question",
    name: l.prompt,
    acceptedAnswer: {
      "@type": "Answer",
      text: `${l.approach.join(" ")} Watch out: ${l.pitfall}`,
    },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow IRM Architect Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-27",
  dateModified: "2026-06-27",
  author: {
    "@type": "Organization",
    name: "SparkCoder Online",
    url: "https://www.sparkcoder.online",
  },
  publisher: {
    "@type": "Organization",
    name: "SparkCoder Online",
    url: "https://www.sparkcoder.online",
  },
  about: "ServiceNow Integrated Risk Management and GRC architecture",
  audience: { "@type": "Audience", audienceType: "ServiceNow IRM/GRC Architects" },
};

export const Route = createFileRoute("/learn/irm-architect-interview-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
    ],
  }),
  component: IRMGuide,
});

function IRMGuide() {
  const { progress } = useProgress();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = LESSONS.find((l) => l.id === activeId) ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · IRM / GRC
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            IRM ARCHITECT
            <br />
            <span className="text-accent">INTERVIEWS.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Senior ServiceNow IRM/GRC interviews probe risk math, control
            testing strategy, and how the profile layer connects everything.
            Four scenario-based lessons below — each with a runnable simulator
            trace so the platform behavior is visible, not hand-waved.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/acl-scripting" className="text-accent underline">
              ACL scripting guide
            </Link>{" "}
            for platform security depth.
          </p>
        </header>

        <ol className="space-y-6">
          {LESSONS.map((l) => (
            <li
              key={l.id}
              className="rounded-2xl border-2 border-border bg-panel overflow-hidden animate-fade-in"
            >
              <article className="p-5 space-y-4">
                <h2 className="font-display text-xl tracking-tight">{l.title}</h2>
                <p className="text-sm text-foreground/85 italic">“{l.prompt}”</p>

                <section aria-label="Approach">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    How to answer
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
                    {l.approach.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </section>

                <section aria-label="Reference script">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    Reference script
                  </h3>
                  <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                    <code>{l.code}</code>
                  </pre>
                </section>

                <section
                  aria-label="Common pitfall"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                >
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mb-1">
                    Pitfall
                  </h3>
                  <p className="text-sm text-foreground/85">{l.pitfall}</p>
                </section>

                <button
                  onClick={() => setActiveId(activeId === l.id ? null : l.id)}
                  className="h-10 px-4 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20 transition-colors"
                  aria-expanded={activeId === l.id}
                  aria-controls={`sim-${l.id}`}
                >
                  {activeId === l.id ? "Hide simulator" : "Run in simulator"}
                </button>

                {activeId === l.id && active && (
                  <div id={`sim-${l.id}`}>
                    <Simulator output={active.output} status="done" resultTone="ok" />
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Keep going</h2>
          <p className="text-sm text-foreground/85">
            IRM sits on top of platform fundamentals — ACLs gate risk visibility,
            Flow Designer drives remediation. Tighten those next.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Glossary topics
            </Link>
            <Link
              to="/learn/flow-designer-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Flow Designer prep
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
