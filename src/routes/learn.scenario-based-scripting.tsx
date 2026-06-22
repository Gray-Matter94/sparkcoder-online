import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "Scenario-Based Scripting Questions — ServiceNow Interview Guide";
const DESCRIPTION =
  "Practice scenario-based ServiceNow scripting interview questions: cross-table GlideRecord updates, integration error handling, business rule recursion, and async flows — with runnable simulator output.";
const URL = "https://sparkcoder.online/learn/scenario-based-scripting";

interface Scenario {
  id: string;
  title: string;
  prompt: string;
  approach: string[];
  code: string;
  output: SimulatorOutput;
  pitfall: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "cross-table-update",
    title: "1. Cross-table GlideRecord update",
    prompt:
      "When an Incident is closed, update the Priority on every related Problem record to '2 - High'. How would you script it?",
    approach: [
      "Query problem records via the parent reference field, not by joining incident.",
      "Use setWorkflow(false) only if you must suppress notifications — defend the choice.",
      "Batch with autoSysFields(false) when bulk updating to keep audit clean.",
    ],
    code: `var pr = new GlideRecord('problem');
pr.addQuery('parent_incident', current.sys_id);
pr.query();
while (pr.next()) {
  pr.priority = 2;
  pr.update();
}`,
    output: {
      table: "problem",
      logs: [
        { text: "GlideRecord('problem')", tone: "info" },
        { text: "addQuery parent_incident = INC0010023", tone: "info" },
        { text: "matched 3 records", tone: "ok" },
        { text: "PRB0040011 priority 3 → 2", tone: "ok" },
        { text: "PRB0040019 priority 4 → 2", tone: "ok" },
        { text: "PRB0040027 priority 3 → 2", tone: "ok" },
      ],
      rows: [
        { cells: ["PRB0040011", "open", "2"], tone: "ok" },
        { cells: ["PRB0040019", "open", "2"], tone: "ok" },
        { cells: ["PRB0040027", "open", "2"], tone: "ok" },
      ],
    },
    pitfall:
      "Calling current.update() inside an after-business-rule on incident triggers recursion. Run this as a fix script or async BR, never sync after-update on the same row.",
  },
  {
    id: "integration-error",
    title: "2. Integration error handling (REST outbound)",
    prompt:
      "Your outbound REST message to a vendor randomly times out. Walk through how you'd make the script resilient.",
    approach: [
      "Wrap execute() in try/catch — RESTMessageV2 throws on transport failures.",
      "Inspect response.haveError() AND the HTTP status — 200 with an error body is common.",
      "Retry with exponential backoff for 5xx and 429, fail fast for 4xx auth errors.",
      "Log to a custom table, not gs.log — you need queryable failure history.",
    ],
    code: `try {
  var r = new sn_ws.RESTMessageV2('Vendor', 'sync');
  r.setHttpTimeout(15000);
  var resp = r.execute();
  var status = resp.getStatusCode();
  if (status >= 500 || status == 429) {
    scheduleRetry(current.sys_id);
  } else if (resp.haveError()) {
    logFailure(current, resp.getErrorMessage());
  } else {
    current.sync_state = 'ok';
    current.update();
  }
} catch (e) {
  logFailure(current, e.message);
}`,
    output: {
      table: "x_vendor_sync_log",
      logs: [
        { text: "POST /api/v2/cases timeout 15s", tone: "warn" },
        { text: "status 504 — gateway timeout", tone: "bad" },
        { text: "scheduleRetry attempt=2 in 4s", tone: "warn" },
        { text: "status 200 ok", tone: "ok" },
      ],
      rows: [
        { cells: ["attempt 1", "504", "timeout"], tone: "bad" },
        { cells: ["attempt 2", "200", "ok"], tone: "ok" },
      ],
    },
    pitfall:
      "Don't retry inside the same transaction — you'll hold a DB row lock for seconds. Push retries onto a scheduled job or event queue.",
  },
  {
    id: "br-recursion",
    title: "3. Business rule recursion",
    prompt:
      "A before-update business rule on sys_user updates the same record's manager field. Production fills with duplicate audit entries. What's happening?",
    approach: [
      "before-BR on the SAME record should NEVER call current.update() — the framework saves the row for you.",
      "Assigning current.field = value inside before-update is enough; .update() retriggers the rule chain.",
      "If you must update a DIFFERENT row, do it in an after-BR or use setWorkflow(false) on a new GlideRecord.",
    ],
    code: `// WRONG — recurses
(function(current) {
  current.manager = lookupManager(current.department);
  current.update(); // ⛔ remove this line
})(current);`,
    output: {
      table: "sys_user",
      logs: [
        { text: "before-update fired", tone: "info" },
        { text: "current.update() called", tone: "warn" },
        { text: "before-update fired (recursion)", tone: "bad" },
        { text: "audit row x42 written", tone: "bad" },
      ],
      rows: [
        { cells: ["v1", "old manager", "audit"], tone: "warn" },
        { cells: ["v2..v42", "ping-pong", "audit"], tone: "bad" },
      ],
    },
    pitfall:
      "If you genuinely need to write to current in a before-BR conditionally, guard with a flag in g_scratchpad or use Business Rule Conditions to skip on recursion.",
  },
  {
    id: "async-event",
    title: "4. Async event-driven workflow",
    prompt:
      "Closing a Change should notify the assigned group, update CMDB CI 'last_change' field, and post to Slack. The user can't wait for Slack to respond. Design it.",
    approach: [
      "Fire a custom event from an after-BR: gs.eventQueue('change.closed', current).",
      "Script Action handles CMDB update (sync, fast, internal table).",
      "Separate Script Action posts to Slack via RESTMessageV2 — failure here doesn't roll back the close.",
      "Notification listens on the same event for the group email — no script needed.",
    ],
    code: `// Business Rule (after, update, state=Closed)
gs.eventQueue('change.closed', current, current.assignment_group, '');

// Script Action 1 — CMDB
(function(event) {
  var ci = new GlideRecord('cmdb_ci');
  if (ci.get(event.parm1)) {
    ci.last_change = event.parm2;
    ci.update();
  }
})(event);`,
    output: {
      table: "sys_event",
      logs: [
        { text: "event queued: change.closed", tone: "ok" },
        { text: "script action: cmdb update — 12ms", tone: "ok" },
        { text: "script action: slack post — 480ms (async)", tone: "info" },
        { text: "notification: email assignment_group", tone: "ok" },
      ],
      rows: [
        { cells: ["change.closed", "processed", "3 actions"], tone: "ok" },
      ],
    },
    pitfall:
      "Don't pass GlideRecord references in event parm fields — they get stringified. Pass sys_ids and re-query inside the script action.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: SCENARIOS.map((s) => ({
    "@type": "Question",
    name: s.prompt,
    acceptedAnswer: {
      "@type": "Answer",
      text: `${s.approach.join(" ")} Watch out: ${s.pitfall}`,
    },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "Scenario-Based ServiceNow Scripting Interview Questions",
  description: DESCRIPTION,
  url: URL,
  about: "ServiceNow scripting interview preparation",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers" },
};

export const Route = createFileRoute("/learn/scenario-based-scripting")({
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
  component: ScenarioGuide,
});

function ScenarioGuide() {
  const { progress } = useProgress();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = SCENARIOS.find((s) => s.id === activeId) ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · Scripting
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SCENARIO-BASED
            <br />
            <span className="text-accent">SCRIPTING.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Senior ServiceNow interviews rarely ask you to define <em>GlideRecord</em>.
            They hand you a messy situation — bad data, retries, recursion, async
            side-effects — and watch how you reason. Below are four scenarios pulled
            from real interview loops, each with a working approach, runnable simulator
            output, and the pitfall that trips most candidates.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Tap a scenario to inspect the simulator trace. Want timed drills? Try the{" "}
            <Link to="/practice/$category" params={{ category: "gliderecord" }} className="text-accent underline">
              GlideRecord practice set
            </Link>
            .
          </p>
        </header>

        <ol className="space-y-6">
          {SCENARIOS.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border-2 border-border bg-panel overflow-hidden animate-fade-in"
            >
              <article className="p-5 space-y-4">
                <h2 className="font-display text-xl tracking-tight">{s.title}</h2>
                <p className="text-sm text-foreground/85 italic">“{s.prompt}”</p>

                <section aria-label="Approach">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    How to answer
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
                    {s.approach.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </section>

                <section aria-label="Reference script">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    Reference script
                  </h3>
                  <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                    <code>{s.code}</code>
                  </pre>
                </section>

                <section aria-label="Common pitfall" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mb-1">
                    Pitfall
                  </h3>
                  <p className="text-sm text-foreground/85">{s.pitfall}</p>
                </section>

                <button
                  onClick={() => setActiveId(activeId === s.id ? null : s.id)}
                  className="h-10 px-4 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20 transition-colors"
                  aria-expanded={activeId === s.id}
                  aria-controls={`sim-${s.id}`}
                >
                  {activeId === s.id ? "Hide simulator" : "Run in simulator"}
                </button>

                {activeId === s.id && active && (
                  <div id={`sim-${s.id}`}>
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
            Pair this guide with the topic glossaries and timed practice sets to lock in
            the vocabulary interviewers expect.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Glossary topics
            </Link>
            <Link
              to="/daily"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Daily challenge
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
