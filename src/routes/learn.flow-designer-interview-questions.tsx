import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow Flow Designer Interview Questions — Guide";
const DESCRIPTION =
  "ServiceNow Flow Designer interview questions: subflows vs actions, error handling, triggers, and flow vs workflow decisions — with simulator traces.";
const URL = "https://www.sparkcoder.online/learn/flow-designer-interview-questions";

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
    id: "subflow-vs-action",
    title: "1. Subflow vs Action — when to encapsulate",
    prompt:
      "You have the same 4-step logic repeated across 6 flows. Should you build a Subflow, a reusable Action, or a Script Include?",
    approach: [
      "Subflows are Flow-Designer-native — they live in the flow namespace, accept inputs/outputs, and show up as a single step in the parent flow.",
      "Actions are reusable steps you drag into any flow. Built from steps or custom scripts. Best when the logic is atomic (one table lookup, one REST call).",
      "Script Includes are server-side only and invisible in Flow Designer — avoid them unless you need shared JS across flows AND business rules.",
      "Rule of thumb: >3 steps → Subflow; 1-2 steps → Action; cross-platform reuse → Script Include.",
    ],
    code: `// Parent Flow: "Close Incident & Notify"
// Step 1: Run Subflow "Resolve and Update CMDB"
//   inputs: incident_sys_id, ci_sys_id
//   outputs: updated_ci, closure_notes
// Step 2: Send notification using output.closure_notes`,
    output: {
      table: "sys_flow_subflow_plan",
      logs: [
        { time: "", text: "Parent flow triggered: incident closed", tone: "info" },
        { time: "", text: "Subflow 'Resolve and Update CMDB' started", tone: "info" },
        { time: "", text: "Subflow steps: 4 actions executed", tone: "ok" },
        { time: "", text: "output.closure_notes = 'Resolved via subflow'", tone: "ok" },
        { time: "", text: "Parent flow resumed; notification sent", tone: "ok" },
      ],
      rows: [
        { number: "parent", state: "resumed", updated: "notify sent", highlight: "ok" },
        { number: "subflow", state: "completed", updated: "4 steps", highlight: "ok" },
      ],
    },
    pitfall:
      "Building a Subflow for a single 'Create Record' step adds indirection without value. Interviewers flag over-engineering — start with an inline action and promote to a Subflow only when reuse justifies it.",
  },
  {
    id: "error-handling",
    title: "2. Error handling — rollback, retry, and notifications",
    prompt:
      "A Flow Designer flow calls a REST action to a vendor API. The API returns 500 intermittently. How do you make the flow resilient without losing the record state?",
    approach: [
      "Use a Decision step to check the REST response status code before proceeding.",
      "On failure, branch to a 'Log & Notify' path — create an error log record, email the integration team, and end the flow gracefully.",
      "Do NOT let the flow throw an unhandled exception — that leaves the triggering record in an ambiguous state.",
      "For retry logic, use a scheduled job or event-driven subflow instead of loop-within-a-flow; Flow Designer loops are not designed for long waits.",
    ],
    code: `// Flow: "Sync Incident to Vendor"
// Step 1: REST action — POST /cases
// Step 2: Decision — status_code == 200 ?
//   Yes → Update incident.vendor_ticket_id
//   No  → Create record (x_vendor_error_log)
//          + Send Email (integration team)
//          + Set incident.u_sync_status = "failed"`,
    output: {
      table: "x_vendor_error_log",
      logs: [
        { time: "", text: "POST /cases → status 500", tone: "bad" },
        { time: "", text: "Decision branch: failure path", tone: "warn" },
        { time: "", text: "Created x_vendor_error_log record", tone: "ok" },
        { time: "", text: "Email sent to integration team", tone: "ok" },
        { time: "", text: "incident.u_sync_status = failed", tone: "ok" },
      ],
      rows: [
        { number: "attempt 1", state: "500", updated: "logged", highlight: "bad" },
        { number: "error log", state: "new", updated: "notified", highlight: "ok" },
      ],
    },
    pitfall:
      "Using a 'For Each' loop to retry REST calls inside Flow Designer is dangerous — each iteration holds the flow context in memory and can exhaust worker threads. Push retries to a scheduled job or an async Business Rule.",
  },
  {
    id: "trigger-conditions",
    title: "3. Trigger conditions — record vs scheduled vs inbound",
    prompt:
      "A flow must run when a Change Request enters the 'Implement' state, but only if the Risk is 'High'. What's the correct trigger and condition setup?",
    approach: [
      "Use a Record trigger on the change_request table with the event 'updated'.",
      "Set the condition to: state changes to 3 (Implement) AND risk == 'High'.",
      "Avoid using 'always run then filter inside the flow' — evaluating conditions at the trigger level is faster and reduces unnecessary flow executions.",
      "For time-based logic (e.g., 'remind if still in Implement after 24 hours'), use a Scheduled trigger, not a Record trigger with a wait.",
    ],
    code: `// Trigger: Record — change_request
// Event: Updated
// Condition:
//   State is 3 (Implement)
//   Risk is High
//   [Advanced] current.state.changes() === true`,
    output: {
      table: "change_request",
      logs: [
        { time: "", text: "Record updated: CHG0010023", tone: "info" },
        { time: "", text: "state 2 → 3 (Implement)", tone: "info" },
        { time: "", text: "risk = High", tone: "info" },
        { time: "", text: "Trigger condition matched", tone: "ok" },
        { time: "", text: "Flow 'High-Risk Change Orchestration' started", tone: "ok" },
      ],
      rows: [
        { number: "CHG0010023", state: "3", updated: "flow started", highlight: "ok" },
      ],
    },
    pitfall:
      "Forgetting current.state.changes() means the flow re-runs on ANY update to a Change in the Implement state — including comments, work notes, or reassignment. Always scope record triggers to the specific field change.",
  },
  {
    id: "flow-vs-workflow",
    title: "4. Flow vs Workflow — migration and coexistence",
    prompt:
      "Your organization still uses Workflow Editor for Change approvals. A new project wants automation. Should they extend the existing workflow or build a Flow?",
    approach: [
      "All NEW automations should use Flow Designer — Workflow Editor is deprecated and receives no new features.",
      "Existing workflows can coexist; don't rewrite working approval chains unless there's a business driver.",
      "Flows excel at IntegrationHub actions, subflow reuse, and no-code maintenance. Workflows excel at complex approval matrices with hierarchical approvers.",
      "Hybrid pattern: keep legacy workflows for approvals, trigger Flows from workflow activities for integrations.",
    ],
    code: `// Hybrid — Workflow calls Flow via REST trigger
// Workflow Activity: Run Script
var r = new sn_ws.RESTMessageV2('Flow Trigger', 'post');
r.setStringParameterNoEscape('flow_name', 'update_ci_status');
r.setStringParameterNoEscape('ci_sys_id', current.cmdb_ci.toString());
r.execute();`,
    output: {
      table: "sys_workflow",
      logs: [
        { time: "", text: "Workflow: Change approval chain active", tone: "info" },
        { time: "", text: "Approval granted; Run Script activity fired", tone: "ok" },
        { time: "", text: "REST POST → Flow Designer inbound trigger", tone: "ok" },
        { time: "", text: "Flow 'update_ci_status' completed", tone: "ok" },
      ],
      rows: [
        { number: "workflow", state: "approved", updated: "script fired", highlight: "ok" },
        { number: "flow", state: "completed", updated: "ci updated", highlight: "ok" },
      ],
    },
    pitfall:
      "Rewriting a mature 20-step approval workflow into Flow Designer 'just because' is a classic trap. It introduces regression risk, breaks existing update sets, and often loses features (like dynamic approver lookup) that require workarounds in Flows. Migrate with intent, not by default.",
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
  headline: "ServiceNow Flow Designer Interview Questions — Subflows, Error Handling & Migration",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-27",
  dateModified: "2026-06-27",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow Flow Designer interview preparation",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers" },
};

export const Route = createFileRoute("/learn/flow-designer-interview-questions")({
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
  component: FlowDesignerGuide,
});

function FlowDesignerGuide() {
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
            Interview Prep · Flow Designer
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            FLOW DESIGNER
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Flow Designer has replaced Workflow Editor as the default automation tool
            in ServiceNow, and interview panels are shifting their questions accordingly.
            Below are four scenario-based lessons covering subflow architecture, REST error
            handling, trigger condition scoping, and the migration debate — each with a
            runnable simulator trace.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Tap a lesson to inspect the simulator. For server-side scripting depth, see the{" "}
            <Link
              to="/learn/scenario-based-scripting"
              className="text-accent underline"
            >
              scenario-based scripting guide
            </Link>
            .
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
            Flow Designer interlocks with Integrations, Business Rules, and Client Scripts.
            Pair this guide with the glossary and timed drills to lock in the full picture.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Glossary topics
            </Link>
            <Link
              to="/learn/scenario-based-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Scenario scripting
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "gliderecord" }}
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              GlideRecord practice
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
