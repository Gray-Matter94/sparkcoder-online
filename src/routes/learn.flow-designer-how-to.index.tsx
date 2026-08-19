import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow Flow Designer How-To Guide — SparkCoder";
const DESCRIPTION =
  "How-to answers for ServiceNow Flow Designer: script steps, REST messages, script includes, subflows, decision tables, and catalog items.";
const URL = "https://www.sparkcoder.online/learn/flow-designer-how-to";

interface HowTo {
  id: string;
  q: string;
  short: string;
  steps: string[];
  snippet?: string;
}

const HOWTOS: HowTo[] = [
  {
    id: "script-step",
    q: "How to add a script step in Flow Designer?",
    short:
      "Use the 'Script' action under the Utilities category. Define inputs explicitly so prior step outputs are passed in — Flow Designer scripts do NOT have access to flow variables by default.",
    steps: [
      "Add Action → Utilities → 'Script'.",
      "On the Inputs tab, drag each upstream pill into a typed input (string, reference, etc.).",
      "In the script body, read via `inputs.your_var` and return an object matching the Outputs schema.",
      "Use `outputs.result = ...` — never `gs.print` for return values.",
    ],
    snippet: `(function execute(inputs, outputs) {
  var gr = new GlideRecord('incident');
  if (gr.get(inputs.incident_sys_id)) {
    outputs.short_desc = gr.short_description.toString();
    outputs.priority = gr.priority.toString();
  }
})(inputs, outputs);`,
  },
  {
    id: "rest-message",
    q: "How to call a REST Message in Flow Designer?",
    short:
      "Prefer the built-in 'REST' step over scripting a RESTMessageV2 call — it gives you retry, error branches, and a typed response without code.",
    steps: [
      "Add Action → Integrations → 'REST'.",
      "Pick the Connection & Credentials Alias (set up once in sys_connection).",
      "Map path params, query params, headers, and body in the input form.",
      "Drag `Response Body` into a downstream Script step and `JSON.parse(inputs.body)` it.",
    ],
    snippet: `// Inside a downstream Script step
var data = JSON.parse(inputs.body || '{}');
outputs.id = data.id;
outputs.status = data.status;`,
  },
  {
    id: "script-include",
    q: "How to call a Script Include from Flow Designer?",
    short:
      "Script Includes are not directly selectable. Wrap the call in a Script step OR build a custom Action that exposes the Script Include as inputs/outputs for reuse.",
    steps: [
      "Make sure the Script Include is Client Callable = false and is in the same scope (or marked Accessible from: All scopes).",
      "Add a Script step, declare your inputs, and instantiate: `new global.MyHelper().doWork(inputs.x)`.",
      "For reuse across flows, promote the wrapper to a custom Action (Action Designer → Script step → publish).",
    ],
    snippet: `(function execute(inputs, outputs) {
  var helper = new global.IncidentHelper();
  outputs.result = helper.classify(inputs.incident_sys_id);
})(inputs, outputs);`,
  },
  {
    id: "subflow",
    q: "How to call a Subflow from a Flow?",
    short:
      "Use the 'Call a Subflow' action. Subflow inputs/outputs must be defined on the subflow itself — they appear as a typed step in the parent flow.",
    steps: [
      "On the subflow, define Inputs and Outputs (Properties → Inputs / Outputs tabs).",
      "In the parent flow: Add Action → Flow Logic → 'Call a Subflow'.",
      "Pick the subflow; the Inputs panel auto-populates. Map pills.",
      "Use Outputs in downstream steps like any action result.",
    ],
  },
  {
    id: "flow-variables",
    q: "How to create and set flow variables?",
    short:
      "Flow Variables are scoped to the whole flow. Create them in Properties → Flow Variables, then 'Set Flow Variables' anywhere in the flow.",
    steps: [
      "Open the flow → Properties (gear) → Flow Variables → +.",
      "Name, type (String, Reference, etc.), and default value.",
      "Use Flow Logic → 'Set Flow Variables' to assign values mid-flow.",
      "Read them in any step's input pill picker under 'Flow Variables'.",
    ],
  },
  {
    id: "decision-table",
    q: "How to use a Decision Table in Flow Designer?",
    short:
      "Decision Tables (sys_decision) replace nested if/else. The 'Make a Decision' action returns the matching answer based on inputs you pass in.",
    steps: [
      "Build the Decision Table in Decision Builder (rows = conditions, columns = inputs).",
      "In the flow: Add Action → Flow Logic → 'Make a Decision'.",
      "Pick the decision table, map inputs.",
      "Branch downstream steps on the returned `Answer` pill.",
    ],
  },
  {
    id: "catalog-item",
    q: "How to create a Flow Designer flow for a catalog item?",
    short:
      "Set the trigger to 'Service Catalog' and pick the Catalog Item. The flow runs in place of legacy workflows and exposes variables via the requested_item record.",
    steps: [
      "New Flow → Trigger → 'Service Catalog' → choose Catalog Item.",
      "On the Catalog Item record, set Flow = <your flow> (this disables the legacy workflow).",
      "Pull variables via the `Requested Item` → Variables pill picker.",
      "Use 'Ask For Approval' for approvals — it auto-creates sysapproval_approver records.",
    ],
  },
  {
    id: "trigger-event",
    q: "How to trigger an event from Flow Designer?",
    short:
      "There's no native 'Fire Event' action, but you can call `gs.eventQueue()` from a Script step — useful when bridging to legacy email notifications.",
    steps: [
      "Add a Script step.",
      "Call `gs.eventQueue('your.event.name', current, param1, param2)`.",
      "Pass the record reference via inputs (don't rely on `current` — Flow Designer scripts don't have one).",
    ],
    snippet: `(function execute(inputs, outputs) {
  var gr = new GlideRecord('incident');
  if (gr.get(inputs.incident_sys_id)) {
    gs.eventQueue('incident.escalated', gr, gs.getUserID(), inputs.reason);
    outputs.fired = true;
  }
})(inputs, outputs);`,
  },
  {
    id: "versions",
    q: "How to check Flow Designer versions and revert?",
    short:
      "Every published flow snapshot is stored in sys_hub_flow_snapshot. Open the flow → ⋮ menu → 'Show Versions' to view, compare, or restore a prior version.",
    steps: [
      "Open the flow → ⋮ (top right) → 'Show Versions'.",
      "Click any prior version to preview it.",
      "Click 'Revert to this version' — Flow Designer creates a new draft from that snapshot.",
      "Test in a sub-prod instance, then Publish.",
    ],
  },
  {
    id: "custom-action",
    q: "How to create a custom Action in Flow Designer?",
    short:
      "Actions are reusable building blocks. Build them in Action Designer with typed inputs/outputs so any flow can drag them in.",
    steps: [
      "Process Automation → Action Designer → New.",
      "Define Inputs (typed: string, reference, glide_date_time, etc.).",
      "Add Steps (Script, REST, GlideRecord lookup, etc.).",
      "Define Outputs and map them from step pills.",
      "Publish — the action now appears in every flow's action picker under your category.",
    ],
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: HOWTOS.map((h) => ({
    "@type": "Question",
    name: h.q,
    acceptedAnswer: { "@type": "Answer", text: h.short },
  })),
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: TITLE,
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-30",
  dateModified: "2026-06-30",
  author: { "@type": "Organization", name: "SparkCoder" },
  publisher: {
    "@type": "Organization",
    name: "SparkCoder",
    url: "https://www.sparkcoder.online",
  },
};

export const Route = createFileRoute("/learn/flow-designer-how-to")({
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
  component: FlowDesignerHowTo,
});

function FlowDesignerHowTo() {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            How-To Hub
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            FLOW DESIGNER
            <br />
            <span className="text-accent">HOW-TO.</span>
          </h1>
          <p className="text-sm text-foreground/85">
            Direct answers to the 10 most-searched Flow Designer questions —
            script steps, REST calls, subflows, decision tables, and more.
            Also covers the <strong>Process Automation Designer</strong> /
            <strong> Workflow Studio</strong> rebrand (Washington DC+) which uses
            the same flow engine under the hood.
          </p>
        </header>

        <nav
          aria-label="Question index"
          className="rounded-2xl border-2 border-border bg-panel p-4"
        >
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-2">
            Jump to
          </h2>
          <ol className="text-sm space-y-1.5 list-decimal pl-5">
            {HOWTOS.map((h) => (
              <li key={h.id}>
                <a href={`#${h.id}`} className="text-accent hover:underline">
                  {h.q}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {HOWTOS.map((h) => (
          <article
            key={h.id}
            id={h.id}
            className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3 scroll-mt-20"
          >
            <h2 className="font-display text-xl tracking-tight">{h.q}</h2>
            <p className="text-sm text-foreground/85">{h.short}</p>
            <ol className="text-sm space-y-1.5 list-decimal pl-5 text-foreground/85">
              {h.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
            {h.snippet && (
              <pre className="text-xs font-mono bg-background/60 border border-border rounded-lg p-3 overflow-x-auto">
                <code>{h.snippet}</code>
              </pre>
            )}
          </article>
        ))}

        <aside className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 space-y-2">
          <h2 className="font-display text-lg tracking-tight">Next step</h2>
          <p className="text-sm text-foreground/85">
            Practicing for interviews? The companion guide drills the same topics
            as scenario questions with simulator traces.
          </p>
          <Link
            to="/learn/flow-designer-interview-questions"
            className="inline-block text-sm font-bold text-accent hover:underline"
          >
            🌊 Flow Designer Interview Questions →
          </Link>
        </aside>
      </main>
    </div>
  );
}
