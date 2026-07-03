import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "Query a Reference Field with GlideRecord (ServiceNow)";
const DESCRIPTION =
  "Query a ServiceNow reference field with GlideRecord: sys_id matching, dot-walking, addQuery vs addJoinQuery, and getRefRecord() — with examples.";
const URL =
  "https://www.sparkcoder.online/guides/gliderecord-query-reference-field";

const HOWTO_JSONLD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Query a reference field using GlideRecord",
  description: DESCRIPTION,
  url: URL,
  step: [
    {
      "@type": "HowToStep",
      name: "Query by sys_id",
      text: "A reference field stores a sys_id. addQuery('assigned_to', user.sys_id) matches exactly.",
    },
    {
      "@type": "HowToStep",
      name: "Dot-walk to filter on the referenced record's fields",
      text: "addQuery('assigned_to.department.name', 'IT') traverses the reference at query time — translates to a SQL join.",
    },
    {
      "@type": "HowToStep",
      name: "Use getRefRecord() to read the referenced row",
      text: "var user = gr.assigned_to.getRefRecord(); user.email is the email of the referenced sys_user — one round trip, no second query.",
    },
    {
      "@type": "HowToStep",
      name: "Use addJoinQuery for many-to-many style joins",
      text: "When the relationship goes through a join table, addJoinQuery lets you filter on the joined table without dot-walking.",
    },
  ],
};

export const Route = createFileRoute("/guides/gliderecord-query-reference-field")({
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
      { type: "application/ld+json", children: JSON.stringify(HOWTO_JSONLD) },
    ],
  }),
  component: ReferenceFieldGuide,
});

function ReferenceFieldGuide() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Scripting Recipe · GlideRecord
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            QUERY A REFERENCE
            <br />
            <span className="text-accent">FIELD.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            A reference field in ServiceNow doesn't store the linked record — it stores
            that record's <code className="font-mono text-accent">sys_id</code>. Every
            interview-grade GlideRecord question about reference fields comes down to
            that one fact. Here's how to query, traverse, and read those references
            without firing extra round trips.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">
            1. The basic match: addQuery with a sys_id
          </h2>
          <p className="text-sm text-foreground/85">
            Reference fields are matched as plain strings (the sys_id of the referenced
            row). No special operator needed.
          </p>
          <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
            <code>{`var gr = new GlideRecord('incident');
gr.addQuery('assigned_to', '6816f79cc0a8016401c5a33be04be441');
gr.query();
while (gr.next()) {
  gs.info(gr.number);
}`}</code>
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">
            2. Dot-walking — filter on the referenced row's fields
          </h2>
          <p className="text-sm text-foreground/85">
            You don't need a second GlideRecord. Dot-walk the reference inside addQuery
            and ServiceNow translates it to a SQL join.
          </p>
          <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
            <code>{`var gr = new GlideRecord('incident');
gr.addQuery('assigned_to.department.name', 'IT');
gr.addQuery('assigned_to.active', true);
gr.query();`}</code>
          </pre>
          <p className="text-xs text-foreground/70">
            Watch the depth — each dot is a join. Two levels is fine; four levels on a
            big table will time out.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">
            3. Read the referenced record with getRefRecord()
          </h2>
          <p className="text-sm text-foreground/85">
            Instead of <code className="font-mono">new GlideRecord('sys_user')</code> +
            get(sys_id), call <code className="font-mono">getRefRecord()</code> on the
            field. ServiceNow caches it on the row, so subsequent calls are free.
          </p>
          <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
            <code>{`while (gr.next()) {
  var user = gr.assigned_to.getRefRecord();
  if (user.isValidRecord()) {
    gs.info(gr.number + ' → ' + user.email);
  }
}`}</code>
          </pre>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">
            4. addJoinQuery — when dot-walking isn't enough
          </h2>
          <p className="text-sm text-foreground/85">
            Use <code className="font-mono">addJoinQuery</code> for filtering on a
            many-to-many or sibling table where dot-walking doesn't go through.
          </p>
          <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
            <code>{`var gr = new GlideRecord('incident');
var join = gr.addJoinQuery('sys_user_grmember', 'assigned_to', 'user');
join.addCondition('group.name', 'Network');
gr.query();`}</code>
          </pre>
        </section>

        <section className="space-y-3 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-display text-xl tracking-tight text-destructive">
            Pitfalls that cost interview points
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/85">
            <li>
              Comparing a reference to a display value:{" "}
              <code className="font-mono">addQuery('assigned_to', 'Alex Lee')</code>{" "}
              returns nothing — it expects a sys_id. Use{" "}
              <code className="font-mono">addQuery('assigned_to.name', 'Alex Lee')</code>.
            </li>
            <li>
              Reading <code className="font-mono">gr.assigned_to</code> as a string gets
              you the sys_id; for the display name, call{" "}
              <code className="font-mono">gr.getDisplayValue('assigned_to')</code>.
            </li>
            <li>
              <code className="font-mono">gr.assigned_to.email</code> works in
              server-side script because of automatic dot-walk, but in a Client Script
              you must use <code className="font-mono">g_form.getReference('assigned_to', cb)</code>{" "}
              — it's async.
            </li>
            <li>
              Don't query inside a loop. Replace{" "}
              <code className="font-mono">while(...) {`{ new GlideRecord('sys_user')...get() }`}</code>{" "}
              with <code className="font-mono">getRefRecord()</code> or a single
              dot-walked addQuery.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Practice this</h2>
          <p className="text-sm text-foreground/85">
            Six timed GlideRecord questions exercise exactly this material — addQuery,
            dot-walking, and getRefRecord() — under interview pressure.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/practice/$category"
              params={{ category: "gliderecord" }} search={{ difficulty: undefined }}
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20"
            >
              GlideRecord drills
            </Link>
            <Link
              to="/learn/scenario-based-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Scenario scripting
            </Link>
            <Link
              to="/servicenow-csa-interview-questions-2026"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              CSA interview Q&amp;A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
