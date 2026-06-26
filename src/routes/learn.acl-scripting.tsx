import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow ACL Scripting Guide — Interview Prep";
const DESCRIPTION =
  "ServiceNow ACL scripting guide: the 'answer' variable, gs.hasRole(), evaluation order, and common pitfalls — with simulator traces.";
const URL = "https://www.sparkcoder.online/learn/acl-scripting";

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
    id: "answer-variable",
    title: "1. The 'answer' variable — the only thing ACLs read",
    prompt:
      "An ACL script runs and returns true, but the user still can't read the record. Why?",
    approach: [
      "ACL scripts don't return — they SET a variable named answer.",
      "answer = true grants, answer = false denies. A return value is silently ignored.",
      "Default answer is false in scripts, so missing assignments deny access.",
      "Use gs.getUser() / current.* to compute the decision, then assign answer once at the end.",
    ],
    code: `// Read ACL on incident — only assignee or admin
answer = false;
if (gs.getUserID() == current.assigned_to
    || gs.hasRole('admin')) {
  answer = true;
}`,
    output: {
      table: "sys_security_acl",
      logs: [
        { time: "", text: "ACL incident.read evaluated", tone: "info" },
        { time: "", text: "current.assigned_to = 6816f79c…", tone: "info" },
        { time: "", text: "gs.getUserID() = 6816f79c…", tone: "ok" },
        { time: "", text: "answer = true → granted", tone: "ok" },
      ],
      rows: [
        { number: "incident.read", state: "script", updated: "answer=true", highlight: "ok" },
      ],
    },
    pitfall:
      "Writing `return true` in an ACL script does nothing — the engine never reads the return value. Always assign `answer`.",
  },
  {
    id: "gs-hasrole",
    title: "2. gs.hasRole() — single role, role list, and the admin shortcut",
    prompt:
      "Your ACL must allow itil OR catalog_admin, but you also want admins to bypass. What's the cleanest script?",
    approach: [
      "gs.hasRole('admin') is true for any role chain that includes admin — admins inherit everything.",
      "Pass a comma-separated string to check multiple roles in one call: gs.hasRole('itil,catalog_admin').",
      "Prefer gs.hasRole() over gs.getUser().hasRole() — the former is null-safe in scoped apps.",
      "Don't AND 'admin' with another role — admins should pass on their own.",
    ],
    code: `answer = gs.hasRole('admin')
       || gs.hasRole('itil,catalog_admin');`,
    output: {
      table: "sys_user_has_role",
      logs: [
        { time: "", text: "user roles: itil, snc_internal", tone: "info" },
        { time: "", text: "hasRole('admin') → false", tone: "info" },
        { time: "", text: "hasRole('itil,catalog_admin') → true", tone: "ok" },
        { time: "", text: "answer = true", tone: "ok" },
      ],
      rows: [
        { number: "alex.lee", state: "itil", updated: "granted", highlight: "ok" },
        { number: "guest", state: "(none)", updated: "denied", highlight: "bad" },
      ],
    },
    pitfall:
      "gs.hasRole('itil') AND gs.hasRole('admin') accidentally locks admins out when they lack itil. Use OR, and let admin be its own branch.",
  },
  {
    id: "table-vs-field",
    title: "3. table.* vs table.field — the evaluation order",
    prompt:
      "A user can read incident records but the description field is blank. Which ACL fired?",
    approach: [
      "ACLs evaluate from most specific to least: table.field → table.* → parent table.* (sys_metadata, etc.).",
      "For a field read, ServiceNow checks the field-level ACL first; if none match, it falls back to table.*.",
      "If table.* grants but incident.description denies, the field is hidden — record reads succeed, field is masked.",
      "Always test with an impersonation, not as admin — admin shortcuts almost every ACL.",
    ],
    code: `// incident.description (read ACL)
answer = gs.hasRole('admin')
       || gs.hasRole('incident_manager');

// incident.* (read ACL) — broader fallback
answer = gs.hasRole('itil');`,
    output: {
      table: "sys_security_acl",
      logs: [
        { time: "", text: "evaluate incident.description.read", tone: "info" },
        { time: "", text: "user roles: itil", tone: "info" },
        { time: "", text: "field ACL → answer=false (denied)", tone: "bad" },
        { time: "", text: "table ACL incident.* → answer=true", tone: "ok" },
        { time: "", text: "row visible; description masked", tone: "warn" },
      ],
      rows: [
        { number: "incident.description", state: "field", updated: "deny", highlight: "bad" },
        { number: "incident.*", state: "table", updated: "grant", highlight: "ok" },
      ],
    },
    pitfall:
      "A field ACL that denies doesn't block the row — it only blanks the field. Junior devs assume the whole record is hidden and waste hours debugging the wrong rule.",
  },
  {
    id: "write-acl-current-previous",
    title: "4. Write ACLs — guarding state transitions with current vs previous",
    prompt:
      "Only allow closing an incident if it was previously 'Resolved'. How would you script the write ACL on the state field?",
    approach: [
      "Write ACLs see both current (new value being saved) and previous (value in DB).",
      "previous.state holds the value before the form submit — perfect for transition guards.",
      "Combine with gs.hasRole() to scope by persona; deny by default at the top of the script.",
      "Keep transition matrices in a script include if you have more than a few rules.",
    ],
    code: `// incident.state write ACL
answer = false;
var moving_to_closed = current.state == 7;       // Closed
var was_resolved    = previous.state == 6;       // Resolved
if (gs.hasRole('admin')) {
  answer = true;
} else if (moving_to_closed && was_resolved
           && gs.hasRole('itil')) {
  answer = true;
}`,
    output: {
      table: "incident",
      logs: [
        { time: "", text: "write incident.state called", tone: "info" },
        { time: "", text: "previous.state = 6 (Resolved)", tone: "info" },
        { time: "", text: "current.state  = 7 (Closed)", tone: "info" },
        { time: "", text: "hasRole(itil) → true", tone: "ok" },
        { time: "", text: "answer = true → write allowed", tone: "ok" },
      ],
      rows: [
        { number: "INC0010023", state: "6 → 7", updated: "allowed", highlight: "ok" },
        { number: "INC0010024", state: "2 → 7", updated: "denied", highlight: "bad" },
      ],
    },
    pitfall:
      "Comparing GlideElement to a number with == works, but === fails — GlideElement is an object. Cast with +current.state when you need strict equality.",
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
  headline: "ServiceNow Access Control List (ACL) Scripting Guide",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-22",
  dateModified: "2026-06-26",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow ACL scripting and platform security",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers" },
};

export const Route = createFileRoute("/learn/acl-scripting")({
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
  component: ACLGuide,
});

function ACLGuide() {
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
            Interview Prep · Platform Security
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ACL
            <br />
            <span className="text-accent">SCRIPTING.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            ServiceNow Access Control Lists look like a checkbox UI until an interviewer
            asks why a user with the right role still sees a blank field. Below are four
            ACL scripting lessons covering the <em>answer</em> variable, <em>gs.hasRole()</em>,
            table-vs-field evaluation order, and write-time transition guards — each with
            a runnable simulator trace.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Tap a lesson to inspect the simulator. Pair with the{" "}
            <Link
              to="/learn/scenario-based-scripting"
              className="text-accent underline"
            >
              scenario-based scripting guide
            </Link>{" "}
            for full interview coverage.
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
            ACLs interlock with Business Rules and Client Scripts — pair this guide with
            the glossary and timed drills to lock in the vocabulary.
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
          </div>
        </section>
      </main>
    </div>
  );
}
