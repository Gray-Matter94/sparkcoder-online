import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow GlideAjax Interview Questions — Guide";
const DESCRIPTION =
  "Master ServiceNow GlideAjax interview questions: AbstractAjaxProcessor, client-to-server data passing, getXMLAnswer callbacks, and performance best practices — with runnable simulator traces.";
const URL = "https://www.sparkcoder.online/learn/glideajax-interview-questions";

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
    id: "abstractajaxprocessor",
    title: "1. AbstractAjaxProcessor — the server-side contract",
    prompt:
      "You're asked to build a server-side GlideAjax API that returns the count of open incidents for a given assignment group. What class do you extend, and what methods matter?",
    approach: [
      "Extend AbstractAjaxProcessor in a Script Include — this is the only supported server-side base class for GlideAjax.",
      "Use this.getParameter('parm_name') to read values sent from the client.",
      "Return data with this.getParameterAnswer('result_key') so the client can read it in getXMLAnswer().",
      "Keep the process() or processAnswer() method name matching what the client calls in getXMLWait() / getXMLAnswer().",
    ],
    code: `var GlideAjaxIncidentCount = Class.create();
GlideAjaxIncidentCount.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  getOpenCount: function() {
    var groupId = this.getParameter('sys_id');
    var gr = new GlideRecord('incident');
    gr.addQuery('assignment_group', groupId);
    gr.addQuery('state', '!=', 7); // not Closed
    gr.query();
    this.getParameterAnswer('count', gr.getRowCount());
  }
});`,
    output: {
      table: "incident",
      logs: [
        { time: "", text: "AbstractAjaxProcessor initialized", tone: "info" },
        { time: "", text: "getParameter('sys_id') → 6816f79cc0a8016401c5a33be04be441", tone: "info" },
        { time: "", text: "Query: assignment_group=… AND state!=7", tone: "info" },
        { time: "", text: "Matched 12 open incidents", tone: "ok" },
        { time: "", text: "getParameterAnswer('count', 12)", tone: "ok" },
      ],
      rows: [
        { number: "getOpenCount", state: "script", updated: "count=12", highlight: "ok" },
      ],
    },
    pitfall:
      "Forgetting that getParameter() returns strings — comparing directly to a number with === fails. Cast with parseInt() or use == for loose equality when reading numeric parameters.",
  },
  {
    id: "client-callback",
    title: "2. Client-side GlideAjax — callbacks and getXMLAnswer",
    prompt:
      "Write the client-side script that calls the server-side API and handles the response correctly. What's the difference between synchronous and async GlideAjax?",
    approach: [
      "Instantiate GlideAjax with the Script Include name: new GlideAjax('GlideAjaxIncidentCount').",
      "Add parameters with addParam('parm_name', value) — the first arg must match getParameter() on the server.",
      "For async: call getXMLAnswer(callback) with a function that reads answer.getAttribute('answer').",
      "For sync: call getXMLWait() which blocks the UI thread — acceptable only in onLoad Client Scripts or catalog client scripts where immediate data is needed.",
    ],
    code: `// Async — preferred, non-blocking
var ga = new GlideAjax('GlideAjaxIncidentCount');
ga.addParam('sysparm_name', 'getOpenCount');
ga.addParam('sys_id', g_form.getValue('assignment_group'));
ga.getXMLAnswer(function(answer) {
  var count = parseInt(answer, 10);
  g_form.setValue('u_open_count', count);
});

// Sync — blocks UI, use sparingly
var ga = new GlideAjax('GlideAjaxIncidentCount');
ga.addParam('sysparm_name', 'getOpenCount');
ga.addParam('sys_id', g_form.getValue('assignment_group'));
var xml = ga.getXMLWait();
var answer = xml.documentElement.getAttribute('answer');`,
    output: {
      table: "sys_script_include",
      logs: [
        { time: "", text: "Client: GlideAjax('GlideAjaxIncidentCount')", tone: "info" },
        { time: "", text: "addParam sysparm_name=getOpenCount", tone: "info" },
        { time: "", text: "Async callback fired", tone: "ok" },
        { time: "", text: "answer = 12", tone: "ok" },
        { time: "", text: "g_form.setValue u_open_count → 12", tone: "ok" },
      ],
      rows: [
        { number: "async call", state: "callback", updated: "12", highlight: "ok" },
      ],
    },
    pitfall:
      "Using getXMLWait() inside a UI Action or onChange Client Script freezes the form for hundreds of milliseconds. Interviewers flag this as a performance anti-pattern — always prefer getXMLAnswer(callback) unless the requirement explicitly demands synchronous data before the user interacts.",
  },
  {
    id: "data-passing",
    title: "3. Passing complex data — JSON encoding and limits",
    prompt:
      "You need to return an array of assignee names and their incident counts from a GlideAjax call. How do you pass structured data through a system designed for single key-value answers?",
    approach: [
      "Serialize complex data to a JSON string on the server using JSON.stringify().",
      "Pass the JSON string as a single parameter answer, then JSON.parse() it on the client.",
      "Keep payloads small — GlideAjax answers travel through XML and large strings slow rendering.",
      "For large datasets, return a sys_id list and query GlideRecord on the client, or use a Script Include + GlideRecord instead.",
    ],
    code: `// Server — AbstractAjaxProcessor
getAssigneeSummary: function() {
  var gr = new GlideRecord('incident');
  gr.addQuery('state', '!=', 7);
  gr.query();
  var map = {};
  while (gr.next()) {
    var uid = gr.assigned_to.toString();
    map[uid] = (map[uid] || 0) + 1;
  }
  this.getParameterAnswer('summary', JSON.stringify(map));
}

// Client
var ga = new GlideAjax('GlideAjaxIncidentCount');
ga.addParam('sysparm_name', 'getAssigneeSummary');
ga.getXMLAnswer(function(answer) {
  var summary = JSON.parse(answer);
  console.log(summary); // { '6816f79c…': 5, '62826f…': 3 }
});`,
    output: {
      table: "incident",
      logs: [
        { time: "", text: "Server: built assignee count map", tone: "info" },
        { time: "", text: "JSON.stringify map → 247 bytes", tone: "info" },
        { time: "", text: "Client: JSON.parse(answer)", tone: "ok" },
        { time: "", text: "summary loaded into memory", tone: "ok" },
      ],
      rows: [
        { number: "JSON payload", state: "string", updated: "247B", highlight: "ok" },
        { number: "assignees", state: "parsed", updated: "8 keys", highlight: "ok" },
      ],
    },
    pitfall:
      "Trying to return a GlideRecord object or a direct JavaScript object via getParameterAnswer() — it stringifies to [object Object] or crashes. Always serialize to JSON on the server and deserialize on the client.",
  },
  {
    id: "performance",
    title: "4. Performance best practices — batching, caching, and N+1",
    prompt:
      "A form loads slowly because an onLoad Client Script fires three separate GlideAjax calls for related reference field data. How do you fix it?",
    approach: [
      "Batch multiple lookups into ONE server call — design a single AbstractAjaxProcessor method that returns all needed fields as a JSON payload.",
      "Use getReference() on the client for single reference fields instead of GlideAjax — it caches and avoids a round-trip.",
      "Debounce onChange handlers that trigger GlideAjax — rapid typing can spawn dozens of parallel requests.",
      "Cache results in a client-side object (e.g., window._gaCache) when the same data is needed across multiple form sections.",
    ],
    code: `// BEFORE — 3 round trips
var ga1 = new GlideAjax('LookupUser');
ga1.getXMLAnswer(fn1);
var ga2 = new GlideAjax('LookupDept');
ga2.getXMLAnswer(fn2);
var ga3 = new GlideAjax('LookupManager');
ga3.getXMLAnswer(fn3);

// AFTER — 1 round trip
var ga = new GlideAjax('LookupBundle');
ga.addParam('sysparm_name', 'getUserBundle');
ga.addParam('sys_id', g_form.getValue('assigned_to'));
ga.getXMLAnswer(function(answer) {
  var data = JSON.parse(answer);
  g_form.setValue('u_dept', data.department);
  g_form.setValue('u_manager', data.manager);
  g_form.setValue('u_location', data.location);
});`,
    output: {
      table: "sys_script_include",
      logs: [
        { time: "", text: "Before: 3 parallel GlideAjax calls", tone: "warn" },
        { time: "", text: "Before: 3× latency (~480ms total)", tone: "bad" },
        { time: "", text: "After: single LookupBundle call", tone: "ok" },
        { time: "", text: "After: 1× latency (~160ms total)", tone: "ok" },
        { time: "", text: "Form render time ↓ 66%", tone: "ok" },
      ],
      rows: [
        { number: "3 calls", state: "parallel", updated: "480ms", highlight: "bad" },
        { number: "1 call", state: "batched", updated: "160ms", highlight: "ok" },
      ],
    },
    pitfall:
      "Calling GlideAjax inside a while loop on the server is impossible — GlideAjax is client-only. If you need server-side batching, use a Script Include directly or a Scheduled Job, not GlideAjax.",
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
  headline: "ServiceNow GlideAjax Interview Questions — AbstractAjaxProcessor & Performance Guide",
  description: DESCRIPTION,
  url: URL,
  about: "ServiceNow GlideAjax scripting and client-server communication",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers" },
};

export const Route = createFileRoute("/learn/glideajax-interview-questions")({
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
  component: GlideAjaxGuide,
});

function GlideAjaxGuide() {
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
            Interview Prep · Client-Server Scripting
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            GLIDEAJAX
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            GlideAjax is the bridge between client scripts and server logic in ServiceNow.
            Interviewers love asking about <em>AbstractAjaxProcessor</em>, how parameters flow
            across the boundary, callback handling, and why forms feel sluggish when GlideAjax
            is misused. Below are four lessons covering the server-side contract, client
            callbacks, structured data passing, and performance best practices — each with a
            runnable simulator trace.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Tap a lesson to inspect the simulator. For more server-side scripting, see the{" "}
            <Link
              to="/learn/scenario-based-scripting"
              className="text-accent underline"
            >
              scenario-based scripting guide
            </Link>
            {" "}or practice{" "}
            <Link
              to="/practice/$category"
              params={{ category: "glideajax" }}
              className="text-accent underline"
            >
              GlideAjax timed questions
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
            GlideAjax interlocks with Client Scripts, Script Includes, and Business Rules.
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
              params={{ category: "glideajax" }}
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              GlideAjax practice
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
