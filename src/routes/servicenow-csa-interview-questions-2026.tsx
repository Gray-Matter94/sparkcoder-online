import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow CSA Interview Questions 2026 — Answers + Practice";
const DESCRIPTION =
  "20 ServiceNow CSA (Certified System Administrator) interview questions for 2026 with concise model answers covering ACLs, UI Policies, Update Sets, Service Catalog, and Notifications — plus timed practice drills.";
const URL =
  "https://www.sparkcoder.online/servicenow-csa-interview-questions-2026";

interface QA {
  q: string;
  a: string;
  topic: string;
}

const QUESTIONS: QA[] = [
  {
    topic: "ACLs",
    q: "What is the evaluation order of ACLs in ServiceNow?",
    a: "ACLs evaluate most-specific to least-specific: table.field → table.* → parent table.*. For a field read, the field ACL runs first; if no field ACL matches, the table ACL is the fallback. A failing field ACL only masks the field — the row stays visible.",
  },
  {
    topic: "ACLs",
    q: "Difference between a Role, Group, and ACL?",
    a: "A Role is a permission token assigned directly or through a Group. A Group bundles users for assignment and notification. An ACL is the actual security check (row + field-level) that asks 'does this user have role X / pass this script' before granting CRUD.",
  },
  {
    topic: "UI Policies",
    q: "When do you choose a UI Policy over a Client Script?",
    a: "Use UI Policy for declarative mandatory/visible/readonly behavior — they're easier to maintain, run client + server, and survive form refactors. Reach for a Client Script when you need imperative logic (calculations, AJAX calls, conditional dialogs).",
  },
  {
    topic: "UI Policies",
    q: "What is the order of execution between UI Policies and Client Scripts?",
    a: "On form load: Client Scripts (onLoad) run, then UI Policies. On change: Client Script onChange runs, then UI Policy. UI Policies effectively run last, so they can override what a Client Script just set.",
  },
  {
    topic: "Update Sets",
    q: "What goes in an Update Set vs Data?",
    a: "Update Sets capture configuration: business rules, tables, fields, ACLs, UI policies, form layouts. Data records (incidents, users, CMDB CIs) are NOT captured — move those with Import Sets, XML export, or the System Clone process.",
  },
  {
    topic: "Update Sets",
    q: "Two update sets touched the same business rule — what wins?",
    a: "Last-committed wins. The newer sys_update_xml record in the target instance overwrites the older. Best practice: review the Preview step for collisions, accept the intended payload, and skip the rest.",
  },
  {
    topic: "Service Catalog",
    q: "Catalog Item vs Record Producer?",
    a: "A Catalog Item creates a request (REQ + RITM + tasks) for fulfilment workflows. A Record Producer inserts directly into a target table (e.g. incident) — no REQ/RITM, no approval chain by default. Use Producers for self-service forms that just need a row.",
  },
  {
    topic: "Service Catalog",
    q: "Where do variables live in the request lifecycle?",
    a: "Variables are stored on the sc_item_option_mtom join to sc_item_option and surface on the RITM. Reference them in workflows via current.variables.<name> and in scripts via gs.getProperty()-style accessors.",
  },
  {
    topic: "Notifications",
    q: "Why isn't my Notification firing on insert?",
    a: "Check: (1) When-to-send is set to 'Event is fired' or 'Record inserted/updated', (2) the Conditions match the row, (3) Send to has at least one recipient that resolves, (4) Send to event creator is on if the trigger user is the only recipient, (5) the email account is active and not in test mode.",
  },
  {
    topic: "Notifications",
    q: "What's the difference between Event-based and Record-based notifications?",
    a: "Record-based fires when a record meets the conditions on insert/update. Event-based listens to a named event registered in sysevent_register and fired with gs.eventQueue() — better for decoupled async fan-out and when you need custom event parms.",
  },
  {
    topic: "Tables",
    q: "What is table extension and when does it cause problems?",
    a: "Extension lets a child table inherit columns from a parent (task → incident). Problems: cross-table queries on the parent scan all children, ACLs on the parent apply to all children, and you can't shorten parent fields once children depend on them.",
  },
  {
    topic: "Import Sets",
    q: "What does a Transform Map do?",
    a: "It maps staging-table columns (sys_import_set_row) into a target table during a Transform run. Includes coalesce fields (dedup keys), field mappings, scripts (onBefore/onAfter/onForeignInsert), and choice-action handling.",
  },
  {
    topic: "Workflows",
    q: "Flow Designer vs legacy Workflow?",
    a: "Flow Designer is the modern, low-code, scoped, versioned, async-friendly engine — preferred for all new automation. Legacy Workflow is graph-based, global-scope by default, harder to test, and only kept around for unmigrated content.",
  },
  {
    topic: "CMDB",
    q: "What is reconciliation in CMDB and why does it matter?",
    a: "Reconciliation rules decide which data source 'wins' when multiple discovery sources update the same CI attribute. Without rules, the last writer wins and your CMDB drifts. Define source priorities per attribute or class.",
  },
  {
    topic: "Reports",
    q: "Difference between an ACL on a report and an audience?",
    a: "An ACL on sys_report controls who can view the report definition. The Visibility / Audience controls who can see it on a dashboard or in lists. You need both: ACL grants the underlying records and the report metadata.",
  },
  {
    topic: "Roles",
    q: "What does the itil role grant?",
    a: "Itil is the standard fulfiller role — read/write on task and most ITSM tables (incident, problem, change), and access to the Service Desk modules. It does NOT grant admin-only operations or scoped app elevations.",
  },
  {
    topic: "Performance",
    q: "How do you debug a slow list view?",
    a: "Open the URL with ?sysparm_debug=true, check Slow Query Log under System Diagnostics, inspect indexes on the order-by + condition columns, look for reference dot-walks in the list (each is a join), and consider a database view if the same join is repeated.",
  },
  {
    topic: "Upgrades",
    q: "What is Skip vs Revert during an upgrade?",
    a: "Skip keeps your customization and leaves the upgrade record un-applied. Revert restores the OOTB version, discarding your change. Always run the Upgrade Monitor before going live so you choose deliberately rather than accepting defaults.",
  },
  {
    topic: "Properties",
    q: "What is a System Property and how do you create one safely?",
    a: "sys_properties rows are key/value settings read via gs.getProperty(). Create them through System Properties > Categories so they're grouped, scope them to your app, and never store secrets there — use System Vault or Credentials instead.",
  },
  {
    topic: "Scoped Apps",
    q: "What are the trade-offs of a scoped app vs global?",
    a: "Scoped apps are namespaced, versioned, easier to publish/share, and enforce stricter APIs (no direct global-table writes without cross-scope access). Global gives you maximum flexibility but pollutes the platform and makes future migration painful.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map((q) => ({
    "@type": "Question",
    name: q.q,
    acceptedAnswer: { "@type": "Answer", text: q.a },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow CSA Interview Questions 2026",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-24",
  about: "ServiceNow Certified System Administrator interview preparation",
  audience: { "@type": "Audience", audienceType: "ServiceNow Admins" },
};

export const Route = createFileRoute("/servicenow-csa-interview-questions-2026")({
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
  component: CsaInterviewPage,
});

function CsaInterviewPage() {
  const { progress } = useProgress();
  const topics = Array.from(new Set(QUESTIONS.map((q) => q.topic)));

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · 2026 Edition
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW CSA
            <br />
            <span className="text-accent">INTERVIEW Q&amp;A.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Twenty CSA-level questions a 2026 ServiceNow interviewer is likely to ask,
            grouped by topic with model answers tight enough to recite in a phone screen.
            Skim, then practice the muscle memory in the timed quizzes.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              to="/practice/$category"
              params={{ category: "acl" }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Practice: ACLs
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "ui-policy" }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Practice: UI Policies
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "update-set" }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Practice: Update Sets
            </Link>
          </div>
        </header>

        {topics.map((topic) => (
          <section key={topic} className="space-y-4">
            <h2 className="font-display text-2xl tracking-tight text-accent">
              {topic}
            </h2>
            <ol className="space-y-4">
              {QUESTIONS.filter((q) => q.topic === topic).map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2"
                >
                  <h3 className="font-display text-base tracking-tight">{q.q}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{q.a}</p>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Drill deeper</h2>
          <p className="text-sm text-foreground/85">
            Pair this list with the developer-side scripting guides for full coverage of
            the platform technical questions.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn/acl-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              ACL scripting
            </Link>
            <Link
              to="/learn/scenario-based-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Scenario scripting
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
