import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EditorialNote } from "@/components/EditorialNote";
import { useProgress } from "@/lib/progress";
import { createTechArticleSchema, SITE_URL } from "@/lib/editorial";

const TITLE = "ServiceNow Developer Interview Questions and Answers (2026)";
const DESCRIPTION =
  "ServiceNow developer interview questions with model answers and real script examples — GlideRecord, business rules, GlideAjax, Script Includes, REST integrations and performance.";
const URL = `${SITE_URL}/servicenow-developer-interview-questions`;

interface QA {
  q: string;
  a: string;
  code?: string;
}

interface Section {
  slug: string;
  title: string;
  emoji: string;
  intro: string;
  qas: QA[];
}

const SECTIONS: Section[] = [
  {
    slug: "gliderecord",
    title: "GlideRecord & data access",
    emoji: "🗄️",
    intro:
      "Every developer screen starts here. Interviewers want to hear that you query efficiently and know what runs where.",
    qas: [
      {
        q: "How do you write an efficient GlideRecord query?",
        a: "Filter as close to the data as possible: addQuery before setLimit, choose indexed fields, and never count with getRowCount() inside a loop — use GlideAggregate. Only ask for the rows you actually need.",
        code: `var gr = new GlideRecord("incident");
gr.addQuery("state", "1"); // New
gr.addQuery("assigned_to", gs.getUserID());
gr.orderByDesc("sys_created_on");
gr.setLimit(10);
gr.query();
while (gr.next()) {
  gs.info(gr.number + " - " + gr.short_description);
}`,
      },
      {
        q: "GlideRecord vs GlideAggregate — when does each win?",
        a: "GlideRecord when you need field values or to update rows. GlideAggregate when you need COUNT, SUM, AVG, MIN or MAX — the math happens in the database instead of pulling every row into memory.",
      },
      {
        q: "What is the difference between get() and query()?",
        a: "get() fetches a single record by sys_id or a unique field and returns a boolean. query() executes the full filter set and you iterate with next(). Using query() when a get() would do is a red flag in a screen.",
      },
      {
        q: "How do you query a reference field's display value?",
        a: "Dot-walk in the query (addQuery('caller_id.department.name', 'IT')) or use getDisplayValue() after the row loads. Dot-walking in the query keeps the filter in the database; getDisplayValue() is for output only.",
      },
    ],
  },
  {
    slug: "business-rules",
    title: "Business rules",
    emoji: "⚙️",
    intro:
      "Expect the before/after/async decision and at least one recursion trap. These are the questions that separate scripters from configurators.",
    qas: [
      {
        q: "Before, after, async, display — how do you choose?",
        a: "Before: change the record being saved without an extra update. After: touch other records once this one is committed. Async: heavy work that must not slow the transaction. Display: pass data to the form via g_scratchpad.",
      },
      {
        q: "Why is current.update() inside a business rule dangerous?",
        a: "It re-triggers business rules on the same record, causing recursion and a duplicate write. In a before rule, set fields directly and let the engine persist; in an after rule, guard with setWorkflow(false) only when you truly need a second write.",
      },
      {
        q: "How do you stop a business rule from running on every row of an import?",
        a: "Add tight conditions, check current.operation() and use setWorkflow(false) where flows are not needed. For transforms, prefer transform scripts or field-level logic over a table-wide rule.",
      },
      {
        q: "What is g_scratchpad and when do you use it?",
        a: "A display business rule can stash server-side values on g_scratchpad, and the client script reads them on load — the supported way to pass server data to a form without an extra GlideAjax round trip.",
      },
    ],
  },
  {
    slug: "client-glideajax",
    title: "Client scripts & GlideAjax",
    emoji: "🖥️",
    intro:
      "Client-side questions test whether you respect the browser. Synchronous calls and DOM access are the classic traps.",
    qas: [
      {
        q: "How do you call server code from a client script?",
        a: "GlideAjax against a Client Callable Script Include that extends AbstractAjaxProcessor, always with an asynchronous callback. Synchronous getXMLWait() freezes the browser and is an instant interview fail.",
        code: `var ga = new GlideAjax("UserUtils");
ga.addParam("sysparm_name", "getUserDept");
ga.addParam("sysparm_user", g_user.userID);
ga.getXMLAnswer(function (answer) {
  g_form.setValue("department", answer);
});`,
      },
      {
        q: "UI Policy or Client Script — which do you reach for first?",
        a: "UI Policy for declarative mandatory/visible/read-only behaviour: less code, runs on server too, easier to maintain. Client Script only when you need imperative logic like calculations, string handling or AJAX lookups.",
      },
      {
        q: "Why should client scripts never use document or window directly?",
        a: "ServiceNow renders forms inside its own framework; direct DOM access breaks on UI16/Next Experience upgrades and in Service Portal. Use g_form and g_user APIs, which are stable across interfaces.",
      },
      {
        q: "Which client script types run when, and which should you avoid?",
        a: "onLoad when the form renders, onChange when a field changes, onSubmit before save, onCellEdit in lists. Avoid global onChange scripts on high-churn fields — they fire on every keystroke-driven change and slow the form.",
      },
    ],
  },
  {
    slug: "script-includes",
    title: "Script Includes & reusable code",
    emoji: "🧱",
    intro:
      "Architecture questions. Interviewers probe whether you write reusable, testable server code or copy-paste the same block into ten business rules.",
    qas: [
      {
        q: "When do you move code into a Script Include?",
        a: "As soon as two callers need the same logic, or when a business rule grows past a screenful. A Script Include gives you one tested implementation, a clear API, and a single place to fix the bug.",
      },
      {
        q: "Class-based vs function-style Script Include?",
        a: "Class-based (var MyUtil = Class.create(); MyUtil.prototype = { ... }) is the modern default: it groups related methods, supports private helpers, and is what GlideAjax requires. Loose function includes are legacy.",
      },
      {
        q: "What makes a Script Include callable from the client, and what is the risk?",
        a: "Checking 'Client callable' and extending AbstractAjaxProcessor. The risk is exposure: every public method is reachable from the browser, so validate inputs server-side and keep the callable surface tiny.",
      },
      {
        q: "How do you make server code testable in ServiceNow?",
        a: "Keep Script Includes free of current/gs globals where possible — pass records and parameters in. Pure functions over GlideRecord queries can be exercised in background scripts and ATF steps without a form session.",
      },
    ],
  },
  {
    slug: "integrations",
    title: "Integrations & REST",
    emoji: "🔌",
    intro:
      "Mid-level and senior screens always include one integration question. Know the outbound call, the auth story, and the failure modes.",
    qas: [
      {
        q: "How do you call an external REST API from ServiceNow?",
        a: "RESTMessageV2 (or a REST Message record) with an endpoint, HTTP method, headers and body. Put credentials in a Connection & Credential alias, not in the script, and handle non-200 responses explicitly.",
        code: `var r = new sn_ws.RESTMessageV2();
r.setEndpoint("https://api.example.com/tickets");
r.setHttpMethod("POST");
r.setRequestHeader("Content-Type", "application/json");
r.setRequestBody(JSON.stringify({ short_description: current.short_description }));
var response = r.executeAsync(); // never block the transaction
var status = response.getStatusCode();`,
      },
      {
        q: "Where do you store API credentials?",
        a: "In Connection & Credential records (backed by the credential store), referenced by alias. Hardcoded tokens in scripts leak into update sets and version history — interviewers specifically listen for this.",
      },
      {
        q: "Inbound vs outbound integration — what changes in your design?",
        a: "Inbound: you build a Scripted REST API or use Table API, and you own authentication, ACLs and rate concerns. Outbound: you own retries, timeouts and async patterns so a slow third party never stalls a user transaction.",
      },
      {
        q: "How do you keep an integration from blocking the user?",
        a: "Run it async: an async business rule, a scheduled job, or Flow Designer with an async action. Synchronous outbound calls inside a before rule are the classic production incident story.",
      },
    ],
  },
  {
    slug: "performance",
    title: "Performance & architecture",
    emoji: "🚀",
    intro:
      "Senior-level questions. These test whether you have operated a real instance, not just written scripts that work once.",
    qas: [
      {
        q: "A list view is slow — how do you investigate?",
        a: "Check the filter against table indexes, look for unindexed dot-walked columns in the sort, and review any business rules firing on query. Slow query log and stats pages show the actual SQL cost.",
      },
      {
        q: "How do you keep a big instance healthy as data grows?",
        a: "Archive or purge rotated-out tables, index the fields you actually filter on, avoid leading-wildcard contains queries, and keep business rule conditions tight so cheap rules exit early.",
      },
      {
        q: "Update sets vs scoped apps vs CI/CD — how do you ship code?",
        a: "Update sets for small configuration batches, scoped applications for anything with a lifecycle, and source-control-backed pipelines (Git + CI/CD APIs) once a team is committing daily. The answer interviewers want is that you have a release discipline at all.",
      },
      {
        q: "What would you never put in a global business rule?",
        a: "Anything heavy or specific: global rules fire on every table, so a GlideRecord lookup inside one runs on every save in the system. Scope rules to the exact table and condition they serve.",
      },
    ],
  },
];

const ALL_QAS = SECTIONS.flatMap((s) => s.qas);

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ALL_QAS.map((q) => ({
    "@type": "Question",
    name: q.q,
    acceptedAnswer: { "@type": "Answer", text: q.a },
  })),
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "SparkCoder", item: `${SITE_URL}/` },
    {
      "@type": "ListItem",
      position: 2,
      name: "ServiceNow Interview Questions and Answers",
      item: `${SITE_URL}/servicenow-interview-questions-and-answers`,
    },
    { "@type": "ListItem", position: 3, name: "Developer Questions", item: URL },
  ],
};

const ARTICLE_JSONLD = createTechArticleSchema({
  headline: "ServiceNow Developer Interview Questions and Answers",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-10-05",
  dateModified: "2026-10-05",
  about: "ServiceNow developer interview preparation: GlideRecord, business rules, GlideAjax, Script Includes, REST integrations and performance",
  audienceType: "ServiceNow developers",
});

export const Route = createFileRoute("/servicenow-developer-interview-questions")({
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
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
    ],
  }),
  component: DeveloperQuestionsPage,
});

function DeveloperQuestionsPage() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-10 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Developer Track · 2026
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW DEVELOPER
            <br />
            <span className="text-accent">INTERVIEW QUESTIONS.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            The scripting questions ServiceNow developer interviews actually ask, with
            model answers short enough to say out loud and real code where it helps.
            Grouped by topic so you can drill the area your screen will cover.
          </p>
          <EditorialNote updated="October 5, 2026" />
        </header>

        <nav
          aria-label="Topics covered"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
        >
          <h2 className="font-display text-xl tracking-tight">Jump to a topic</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.slug}>
                <a
                  href={`#${s.slug}`}
                  className="dark-glass-option h-11 px-4 flex items-center gap-2 rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
                >
                  <span aria-hidden="true">{s.emoji}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {SECTIONS.map((s) => (
          <section key={s.slug} id={s.slug} className="space-y-4 scroll-mt-20">
            <h2 className="font-display text-2xl tracking-tight text-accent">
              <span aria-hidden="true" className="mr-2">
                {s.emoji}
              </span>
              {s.title}
            </h2>
            <p className="text-sm text-foreground/85 leading-relaxed">{s.intro}</p>
            <ol className="space-y-4">
              {s.qas.map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2"
                >
                  <h3 className="font-display text-base tracking-tight">{q.q}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{q.a}</p>
                  {q.code && (
                    <pre className="rounded-2xl border-2 border-border bg-background p-4 overflow-x-auto text-xs leading-relaxed">
                      <code>{q.code}</code>
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Now write the code</h2>
          <p className="text-sm text-foreground/85">
            Reading answers clears the phone screen; the technical round asks you to
            produce script under time pressure. Run the drills that match these topics.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/practice/$category"
              params={{ category: "gliderecord" }}
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase"
            >
              GlideRecord puzzles
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "business-rules" }}
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase"
            >
              Business rule puzzles
            </Link>
            <Link
              to="/live-coding"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Live coding
            </Link>
            <Link
              to="/servicenow-coding-examples-for-interview"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Coding examples
            </Link>
            <Link
              to="/servicenow-interview-questions-and-answers"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              All roles hub
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
