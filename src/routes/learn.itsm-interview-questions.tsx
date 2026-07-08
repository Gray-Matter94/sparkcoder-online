import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow ITSM Interview Questions (2026) — SparkCoder";
const DESCRIPTION =
  "ServiceNow ITSM interview questions with answers: Incident, Problem, Change, and SLA/SLM — state models, table relationships, and process-logic scenarios.";
const URL = "https://www.sparkcoder.online/learn/itsm-interview-questions";

interface QA {
  id: string;
  q: string;
  short: string;
  detail: string[];
  snippet?: string;
}

const SECTIONS: { id: string; title: string; blurb: string; items: QA[] }[] = [
  {
    id: "incident",
    title: "Incident Management",
    blurb:
      "Restore service ASAP. Watch for state model transitions, assignment rules, and major-incident escalation.",
    items: [
      {
        id: "inc-states",
        q: "Walk through the Incident state model.",
        short:
          "New → In Progress → On Hold → Resolved → Closed, with Canceled as a terminal side-branch. Resolved requires close_code + close_notes; Closed is set by a scheduled job (default 7 days after resolution).",
        detail: [
          "State field is `incident_state` (integer). Values: 1 New, 2 In Progress, 3 On Hold, 6 Resolved, 7 Closed, 8 Canceled.",
          "`On Hold` requires a `hold_reason` (Awaiting Caller, Awaiting Change, Awaiting Problem, Awaiting Vendor).",
          "Moving to Resolved requires close_code and close_notes — enforced by the 'Incident state' UI Policy + a Business Rule.",
          "Closed is normally set by the 'Incidents auto-close' scheduled job. Users cannot re-open a Closed incident; they must create a new one linked via `parent_incident`.",
        ],
      },
      {
        id: "inc-major",
        q: "How does Major Incident Management differ from a regular incident?",
        short:
          "Priority 1 incidents can be promoted to Major Incident (MI). MI adds a communication workbench, MIM role approval, and posts updates to the MI Board.",
        detail: [
          "Trigger: incident.priority = 1 AND `promote_to_major` is set; requires role `major_incident_manager` to approve.",
          "Creates a record in `major_incident` (extends task) and links back via `major_incident_ref` on the source incident.",
          "Communication Workbench pushes updates to subscribers via email + Now Mobile push. Timeline is on `major_incident_communication`.",
          "After resolution the Post Incident Report (PIR) triggers a Problem record automatically if `create_problem_on_close` is true.",
        ],
      },
      {
        id: "inc-assignment",
        q: "Explain the incident assignment flow.",
        short:
          "Assignment group first (via Assignment Rules or predictive intelligence), then assigned_to via on-call schedule or round-robin business rule.",
        detail: [
          "`sys_assignment_rule` matches conditions in order and stamps `assignment_group`.",
          "Predictive Intelligence (Agent Intelligence) can override using a trained classifier on short_description.",
          "`assigned_to` typically empty at creation; picked up via On-Call Scheduling (cmn_rota_member) or a scripted rotation.",
          "Reassignment resets `reassignment_count` and can breach the assignment SLA if it happens after the response target.",
        ],
      },
    ],
  },
  {
    id: "problem",
    title: "Problem Management",
    blurb:
      "Find root cause and prevent recurrence. Interviewers ask about the Problem → Known Error → Change chain.",
    items: [
      {
        id: "prob-vs-inc",
        q: "Problem vs Incident — how are they linked?",
        short:
          "An incident is a single service disruption; a problem is the underlying cause. Link incidents to a problem via `problem_id` on incident; the problem tracks all related incidents through `rel_ci` and its own worknotes.",
        detail: [
          "Table: `problem` extends `task`. Related list on incident shows all incidents sharing the same `problem_id`.",
          "Resolving the problem does not auto-resolve incidents — a Flow Designer subflow (or business rule) is required to close children.",
          "'Duplicate incident' pattern: set `duplicate_of` on child incidents so reporting rolls them up under the primary.",
        ],
      },
      {
        id: "prob-workflow",
        q: "Walk through the Problem state model.",
        short:
          "New → Assess → Root Cause Analysis → Fix in Progress → Resolved → Closed. Known Error is a flag (`known_error` = true), not a state.",
        detail: [
          "Fields: `problem_state` (1..108). RCA requires `cause_notes`; Fix in Progress usually creates a Change (`fix_change`).",
          "'Known Error' is set when a workaround exists (`workaround` populated). This makes the problem selectable from incidents.",
          "Closure requires `resolution_code` (Fix Applied, Risk Accepted, Duplicate, Canceled).",
        ],
      },
      {
        id: "prob-rca",
        q: "What RCA techniques does ServiceNow support natively?",
        short:
          "5 Whys, Fishbone, and Kepner-Tregoe are template-driven via `problem_task` records. The Problem Coaching workflow guides analysts step-by-step.",
        detail: [
          "`problem_task` extends task and is used for RCA sub-activities.",
          "Templates live in `sys_template` filtered on table = problem_task.",
          "Predictive Intelligence can cluster similar incidents to surface candidate problems (Similar Incidents pane).",
        ],
      },
    ],
  },
  {
    id: "change",
    title: "Change Management",
    blurb:
      "Standard / Normal / Emergency — plus CAB approvals, risk assessment, and conflict detection.",
    items: [
      {
        id: "chg-types",
        q: "Difference between Standard, Normal, and Emergency change?",
        short:
          "Standard = pre-approved template, low risk, no CAB. Normal = full assessment + CAB approval. Emergency = expedited path for outage remediation, retrospective CAB review.",
        detail: [
          "Standard changes are instantiated from `std_change_producer_version` (a template producer). Approval is skipped because the template was pre-approved.",
          "Normal changes run through the Change Approval Policy engine (`sn_change_approvals`) — a Flow Designer flow that computes approvers from risk + assignment group + CAB.",
          "Emergency: `type = emergency` fires a different approval path (ECAB), enforces shorter lead time, and requires a Post Implementation Review (PIR).",
        ],
        snippet: `// Enforce ECAB approval for Emergency changes (business rule on change_request, before update)
(function executeRule(current, previous) {
  if (current.type == 'emergency' && current.approval == 'approved') {
    var ecab = new GlideRecord('sys_user_grmember');
    ecab.addQuery('group.name', 'ECAB');
    ecab.addQuery('user', gs.getUserID());
    ecab.query();
    if (!ecab.next()) {
      gs.addErrorMessage('Only ECAB members can approve Emergency changes.');
      current.setAbortAction(true);
    }
  }
})(current, previous);`,
      },
      {
        id: "chg-risk",
        q: "How does risk assessment work?",
        short:
          "Risk is computed via a Risk Assessment questionnaire (`asmt_assessment_instance`) that scores answers and writes `risk` + `risk_impact_analysis` back on the change.",
        detail: [
          "Questionnaire metrics live in `asmt_metric`. Weights per answer accumulate into a decimal score.",
          "Score → Risk mapping is in the 'Change Risk Conditions' table (`chg_risk_condition`).",
          "Predictive Intelligence 'Change Success Score' overlays a probability-of-success on top of the static risk.",
        ],
      },
      {
        id: "chg-conflict",
        q: "How does conflict detection prevent overlapping changes?",
        short:
          "The Conflict Calculator runs on schedule/update: it checks CI + affected-CI overlap against other changes in the planned window and writes findings into `conflict`.",
        detail: [
          "Fields on change: `conflict_status` (Not Run / No Conflict / Conflict) and `conflict_last_run`.",
          "Triggered by: schedule change, CI change, or manual 'Check conflicts' UI action.",
          "Conflict types: same CI, dependent CI (via cmdb_rel_ci), blackout window, maintenance schedule.",
        ],
      },
    ],
  },
  {
    id: "sla",
    title: "SLA / Service Level Management",
    blurb:
      "SLA definitions, schedules, pause conditions — plus the difference between SLA, OLA, and UC.",
    items: [
      {
        id: "sla-def",
        q: "How is an SLA attached to a task?",
        short:
          "The SLA Engine evaluates `contract_sla` definitions on insert/update of the task. Matching definitions attach a `task_sla` record and start the timer against the SLA's business schedule.",
        detail: [
          "Definition table: `contract_sla`. Attachment table: `task_sla` — one per attached SLA per task.",
          "Timer respects the SLA's Schedule (cmn_schedule) — off-hours don't count toward elapsed time.",
          "Pause conditions (e.g., `state = On Hold`) freeze the timer without breaching.",
          "Retroactive start: set the SLA definition's Start Condition to a past field like `opened_at` when the SLA should have already been running.",
        ],
      },
      {
        id: "sla-vs-ola-uc",
        q: "SLA vs OLA vs Underpinning Contract?",
        short:
          "SLA = commitment to the customer. OLA = internal team-to-team agreement. UC = commitment from an external vendor. All three use the same `contract_sla` engine, differentiated by the `type` field.",
        detail: [
          "SLA fails → customer breach (visible on portal).",
          "OLA fails → internal breach (reported on team dashboards, feeds into SLA calculation).",
          "UC breach → vendor accountability; often linked to a Vendor Manager workflow.",
          "Chained: an SLA can be underpinned by multiple OLAs + UCs — dashboards visualize the dependency chain.",
        ],
      },
      {
        id: "sla-breach-script",
        q: "How would you send an alert 30 minutes before SLA breach?",
        short:
          "Use an SLA Workflow (attached to the SLA Definition) with a 'Timer' activity set to `business_percentage = 90%`, then a 'Notification' activity.",
        detail: [
          "Legacy SLA Workflow: Workflow → SLA → drag Timer + Notification. Timer supports business time and % elapsed.",
          "Flow Designer path (Rome+): trigger = 'SLA task % elapsed', use the SLA Task Notifications action.",
          "Avoid scheduled scripts polling `task_sla` — the engine already emits events (`sla.breached`, `sla.warning_50`, `sla.warning_75`) you can subscribe to.",
        ],
        snippet: `// Business rule on task_sla (after update) — custom warning event
(function executeRule(current, previous) {
  if (current.business_percentage >= 90 && previous.business_percentage < 90) {
    gs.eventQueue('sla.warning_90', current, current.task.getDisplayValue(), current.sla.getDisplayValue());
  }
})(current, previous);`,
      },
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SECTIONS.flatMap((s) =>
    s.items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.short },
    })),
  ),
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: TITLE,
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-08",
  dateModified: "2026-07-08",
  author: { "@type": "Organization", name: "SparkCoder" },
  publisher: {
    "@type": "Organization",
    name: "SparkCoder",
    url: "https://www.sparkcoder.online",
  },
};

export const Route = createFileRoute("/learn/itsm-interview-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
    ],
  }),
  component: ItsmInterviewQuestions,
});

function ItsmInterviewQuestions() {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            ITSM Interview Prep
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW ITSM
            <br />
            <span className="text-accent">INTERVIEW Q&amp;A.</span>
          </h1>
          <p className="text-sm text-foreground/85">
            Process-logic, state-model, and table-relationship questions covering
            Incident, Problem, Change, and SLA. Answers focus on what interviewers
            actually probe — not textbook definitions.
          </p>
        </header>

        <nav aria-label="Section index" className="rounded-2xl border-2 border-border bg-panel p-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-2">
            Sections
          </h2>
          <ol className="text-sm space-y-1.5 list-decimal pl-5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-accent hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="space-y-4 scroll-mt-20">
            <div className="space-y-1">
              <h2 className="font-display text-2xl tracking-tight">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.blurb}</p>
            </div>
            {section.items.map((qa) => (
              <article
                key={qa.id}
                id={qa.id}
                className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3 scroll-mt-20"
              >
                <h3 className="font-display text-lg tracking-tight">{qa.q}</h3>
                <p className="text-sm text-foreground/85">{qa.short}</p>
                <ul className="text-sm space-y-1.5 list-disc pl-5 text-foreground/85">
                  {qa.detail.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
                {qa.snippet && (
                  <pre className="text-xs font-mono bg-background/60 border border-border rounded-lg p-3 overflow-x-auto">
                    <code>{qa.snippet}</code>
                  </pre>
                )}
              </article>
            ))}
          </section>
        ))}

        <aside className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 space-y-2">
          <h2 className="font-display text-lg tracking-tight">Keep going</h2>
          <p className="text-sm text-foreground/85">
            Pair the process theory with hands-on scripting drills.
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-bold">
            <Link to="/live-coding" className="text-accent hover:underline">
              ⌨️ Live Coding Simulator →
            </Link>
            <Link to="/learn/scenario-based-scripting" className="text-accent hover:underline">
              🧩 Scenario Scripting →
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
