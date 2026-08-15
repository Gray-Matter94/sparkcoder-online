import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow Interview Questions and Answers (2026 Hub)";
const DESCRIPTION =
  "ServiceNow interview questions and answers by role — developer, admin, IRM architect, CMDB and Discovery — with model answers and hands-on practice drills.";
const URL = "https://www.sparkcoder.online/servicenow-interview-questions-and-answers";

interface QA {
  q: string;
  a: string;
}

interface RoleSection {
  slug: string;
  role: string;
  emoji: string;
  intro: string;
  qas: QA[];
  links: { label: string; to: string; params?: Record<string, string>; search?: Record<string, unknown> }[];
}

const ROLES: RoleSection[] = [
  {
    slug: "developer",
    role: "ServiceNow Developer",
    emoji: "🛰️",
    intro:
      "Scripting-heavy screens. Expect GlideRecord, business rules, client scripts, GlideAjax and script includes with follow-up 'why' questions.",
    qas: [
      {
        q: "When do you use GlideRecord vs GlideAggregate?",
        a: "GlideRecord walks rows and is right when you need field values or updates. GlideAggregate pushes COUNT/SUM/AVG to the database, so use it for metrics — it avoids pulling thousands of rows into memory just to increment a counter.",
      },
      {
        q: "Before vs after vs async business rule — how do you choose?",
        a: "Before: change values on the record being saved (no extra update). After: act on other records once this row is committed. Async: fire-and-forget work that must not slow the transaction, such as integrations or notifications fan-out.",
      },
      {
        q: "Why is current.update() inside a before business rule a bug?",
        a: "The record is already in the middle of its own update, so calling update() causes recursion and a second write. Set the field directly (current.field = value) and let the engine persist it.",
      },
      {
        q: "How do you call server logic from a client script correctly?",
        a: "GlideAjax against a Client Callable Script Include, with a callback. Avoid synchronous getXMLWait() — it freezes the browser — and never use g_form on the server side.",
      },
      {
        q: "What makes a Script Include client callable and why does it matter?",
        a: "It must extend AbstractAjaxProcessor and have Client callable checked. Without it, GlideAjax returns nothing; with it, only the methods you expose are reachable, which keeps the surface area small.",
      },
    ],
    links: [
      { label: "GlideRecord puzzles", to: "/practice/$category", params: { category: "gliderecord" }, search: { difficulty: undefined } },
      { label: "Business rules", to: "/practice/$category", params: { category: "business-rules" }, search: { difficulty: undefined } },
      { label: "GlideAjax Q&A", to: "/learn/glideajax-interview-questions" },
      { label: "Coding examples", to: "/servicenow-coding-examples-for-interview" },
    ],
  },
  {
    slug: "administrator",
    role: "ServiceNow Administrator (CSA)",
    emoji: "🛡️",
    intro:
      "Configuration and governance. ACLs, UI policies, update sets, catalog and notifications dominate the CSA-level screen.",
    qas: [
      {
        q: "What order do ACLs evaluate in?",
        a: "Most specific to least: table.field, then table.*, then the parent table. A failing field ACL only masks that field — the row itself stays visible if the table ACL passes.",
      },
      {
        q: "UI Policy or Client Script?",
        a: "UI Policy for declarative mandatory/visible/read-only behaviour — less code, runs client and server. Client Script when you need imperative logic like calculations or AJAX lookups.",
      },
      {
        q: "What does an update set capture?",
        a: "Configuration only: tables, fields, business rules, ACLs, UI policies, form layouts. Data rows are not captured — move those with import sets or XML export.",
      },
      {
        q: "Catalog Item vs Record Producer?",
        a: "A Catalog Item creates REQ/RITM and runs fulfilment. A Record Producer writes straight into a target table such as incident, with no request wrapper.",
      },
      {
        q: "My notification isn't firing — how do you debug it?",
        a: "Check when-to-send, the conditions against the actual row, whether Send to resolves to a recipient, 'send to event creator', and that the email account is active and not in test mode.",
      },
    ],
    links: [
      { label: "Full CSA question set", to: "/servicenow-csa-interview-questions-2026" },
      { label: "ACL scripting", to: "/learn/acl-scripting" },
      { label: "ACL script examples", to: "/guides/acl-script-examples" },
    ],
  },
  {
    slug: "irm-architect",
    role: "IRM / GRC Architect",
    emoji: "⚖️",
    intro:
      "Risk framework design questions. Interviewers probe scoring models, entity hierarchies and control attestation at scale.",
    qas: [
      {
        q: "How does risk scoring work in IRM?",
        a: "Inherent score comes from likelihood x impact on the risk record; residual score applies control effectiveness. Scores roll up through the entity hierarchy, so the entity design drives the numbers as much as the formula does.",
      },
      {
        q: "What is an entity vs an entity type vs an entity class?",
        a: "Entity is the thing being assessed (an app, a vendor, a process). Entity type groups entities for scoping and filtering. Entity class links them to the underlying table so risks and controls can attach.",
      },
      {
        q: "How do you avoid attestation fatigue?",
        a: "Share control test results across mapped authority documents rather than issuing one attestation per citation, and stagger campaign schedules by control criticality.",
      },
      {
        q: "Where do Issues come from and who owns them?",
        a: "Issues are raised from failed control tests, audit findings or manual entry, and route to the control owner with a remediation task. The Issue is the single record that ties evidence to closure.",
      },
    ],
    links: [
      { label: "IRM architect Q&A", to: "/learn/irm-architect-interview-questions" },
      { label: "IRM practice drills", to: "/servicenow-irm-architect-practice" },
    ],
  },
  {
    slug: "cmdb-discovery",
    role: "CMDB / Discovery Engineer",
    emoji: "🗺️",
    intro:
      "Data-quality questions. Expect IRE, reconciliation, MID Server design, CI classes and CSDM alignment.",
    qas: [
      {
        q: "What does the Identification and Reconciliation Engine actually do?",
        a: "IRE decides whether an inbound payload matches an existing CI (identification rules) and which data source is allowed to write each attribute (reconciliation rules). Without it, every import creates duplicates.",
      },
      {
        q: "Why would Discovery find a device but not classify it?",
        a: "Port scan succeeded but classification failed — usually missing or wrong credentials, a probe that returned no usable fingerprint, or no classifier matching the returned data.",
      },
      {
        q: "When do you add a second MID Server?",
        a: "For network segmentation (a subnet the first can't reach), for throughput once the ECC queue backs up, or for high availability via a MID Server cluster.",
      },
      {
        q: "What problem does CSDM solve?",
        a: "It standardises how services, applications and infrastructure relate so reporting, ITSM and Service Mapping all speak the same model instead of each team inventing its own hierarchy.",
      },
    ],
    links: [
      { label: "Discovery & CMDB hub", to: "/learn/discovery" },
      { label: "Discovery Q&A", to: "/learn/discovery-interview-questions" },
      { label: "CMDB Q&A", to: "/learn/cmdb-interview-questions" },
    ],
  },
  {
    slug: "itsm-process",
    role: "ITSM / Process Consultant",
    emoji: "🧩",
    intro:
      "Process fluency over syntax. Incident vs problem vs change, SLAs, and Flow Designer automation.",
    qas: [
      {
        q: "Incident vs Problem vs Change — the one-line version?",
        a: "Incident restores service now. Problem removes the underlying cause. Change controls the planned modification that fixes it. Interviewers listen for whether you keep the records separate.",
      },
      {
        q: "How do SLAs attach and pause?",
        a: "An SLA definition attaches when its start condition matches, pauses on pause conditions (for example, awaiting the caller), and stops on the stop condition. Schedules decide which hours count.",
      },
      {
        q: "Flow Designer or legacy Workflow for new automation?",
        a: "Flow Designer — scoped, versioned, testable, and it has spokes for integrations. Legacy Workflow only stays for content not yet migrated.",
      },
    ],
    links: [
      { label: "ITSM Q&A", to: "/learn/itsm-interview-questions" },
      { label: "Flow Designer Q&A", to: "/learn/flow-designer-interview-questions" },
      { label: "IntegrationHub Q&A", to: "/learn/integrationhub-interview-questions" },
    ],
  },
];

const ALL_QAS = ROLES.flatMap((r) => r.qas);

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ALL_QAS.map((q) => ({
    "@type": "Question",
    name: q.q,
    acceptedAnswer: { "@type": "Answer", text: q.a },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow Interview Questions and Answers",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-08-15",
  about: "ServiceNow interview preparation across developer, admin, IRM, CMDB and ITSM roles",
  audience: { "@type": "Audience", audienceType: "ServiceNow professionals" },
};

export const Route = createFileRoute("/servicenow-interview-questions-and-answers")({
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
  component: HubPage,
});

function HubPage() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-10 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Hub · 2026
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW INTERVIEW
            <br />
            <span className="text-accent">QUESTIONS &amp; ANSWERS.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            One place for the questions ServiceNow interviewers actually ask, grouped by
            the role you are being screened for. Every answer is short enough to say out
            loud, and each section links to the deep-dive page and the timed practice
            drills for that topic.
          </p>
        </header>

        <nav
          aria-label="Roles covered"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
        >
          <h2 className="font-display text-xl tracking-tight">Jump to your role</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ROLES.map((r) => (
              <li key={r.slug}>
                <a
                  href={`#${r.slug}`}
                  className="dark-glass-option h-11 px-4 flex items-center gap-2 rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
                >
                  <span aria-hidden="true">{r.emoji}</span>
                  {r.role}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {ROLES.map((r) => (
          <section key={r.slug} id={r.slug} className="space-y-4 scroll-mt-20">
            <h2 className="font-display text-2xl tracking-tight text-accent">
              <span aria-hidden="true" className="mr-2">
                {r.emoji}
              </span>
              {r.role}
            </h2>
            <p className="text-sm text-foreground/85 leading-relaxed">{r.intro}</p>
            <ol className="space-y-4">
              {r.qas.map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2"
                >
                  <h3 className="font-display text-base tracking-tight">{q.q}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{q.a}</p>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap gap-2">
              {r.links.map((l) => (
                <Link
                  key={l.label}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={l.to as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={l.params as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  search={l.search as any}
                  className="dark-glass-option h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Practice, don't just read</h2>
          <p className="text-sm text-foreground/85">
            Reciting answers gets you through the phone screen; the technical round asks
            you to write script. Run the drills.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/live-coding"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Live coding
            </Link>
            <Link
              to="/daily"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Daily challenge
            </Link>
            <Link
              to="/learn"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Learn &amp; quiz
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
