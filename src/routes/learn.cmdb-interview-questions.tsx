import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow CMDB & CSDM Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow CMDB interview prep: CMDB vs CSDM, Identification and Reconciliation Rules (IRE), CSDM 4.0 domains, and CI health — with simulator traces.";
const URL = "https://www.sparkcoder.online/learn/cmdb-interview-questions";

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
    id: "cmdb-vs-csdm",
    title: "1. CMDB vs CSDM — what's the difference?",
    prompt:
      "The architect asks you to explain, in one minute, how CSDM relates to the CMDB. What do you say?",
    approach: [
      "The CMDB is the physical data store — tables under cmdb_ci that hold every Configuration Item and their relationships.",
      "CSDM (Common Service Data Model) is the prescriptive blueprint for HOW to use those tables — which classes to populate, which relationships to draw, and how services map to applications and infrastructure.",
      "CSDM 4.0 organizes CIs into four domains: Foundation, Design, Build, and Manage — each stage adds richer service context (from raw hardware to consumable business services).",
      "You don't 'install' CSDM; you conform to it by populating the right classes (cmdb_ci_service_technical, cmdb_ci_service_offering, cmdb_ci_business_app) with the right relationships.",
    ],
    code: `// Sample CSDM-aligned service hierarchy
BusinessApp:   'Payroll'                (cmdb_ci_business_app)
  |-- Depends on -->
Technical Svc: 'Payroll API'            (cmdb_ci_service_technical)
  |-- Depends on -->
Application:   'payroll-api v3.2'       (cmdb_ci_appl)
  |-- Runs on  -->
Server:        'prd-pay-api-01'         (cmdb_ci_linux_server)

// Consumers see the Service Offering, not the tech underneath:
ServiceOffering: 'Payroll — Gold SLA'   (service_offering)
  |-- Offers   --> BusinessApp 'Payroll'`,
    output: {
      table: "cmdb_ci_service_technical",
      logs: [
        { time: "", text: "CSDM domain: Manage", tone: "info" },
        { time: "", text: "Payroll API → depends on 1 app, 1 server", tone: "ok" },
        { time: "", text: "conformance check PASSED", tone: "ok" },
      ],
      rows: [
        { number: "svc:payroll-api", state: "operational", updated: "csdm", highlight: "ok" },
      ],
    },
    pitfall:
      "Treating CSDM as a one-time modeling exercise. It's a governance discipline — new apps and services must be added under the same class + relationship rules, or the model drifts within a quarter.",
  },
  {
    id: "ire",
    title: "2. Identification & Reconciliation Rules (IRE)",
    prompt:
      "Discovery and an import from SCCM both create records for the same laptop. Why do you get duplicates, and how does IRE prevent that?",
    approach: [
      "IRE is the single write path into the CMDB — every insert/update from Discovery, Service Graph Connectors, or IntegrationHub goes through it.",
      "Each CI class has an Identification Rule listing ordered identifier entries (e.g. serial_number, then name+ip_address) — the first match wins.",
      "Reconciliation Rules decide WHICH data source can update WHICH attribute — so SCCM can own OS version while Discovery owns CPU count without stomping each other.",
      "Bypassing IRE (direct GlideRecord inserts) is the #1 cause of duplicate CIs — always call the Identification API instead.",
    ],
    code: `// Correct — payload goes through IRE
var payload = {
  items: [{
    className: 'cmdb_ci_computer',
    values: {
      serial_number: 'SN-77A31',
      name: 'LT-77A31',
      os: 'Windows 11'
    },
    lookup: []
  }]
};
var ire = new sn_cmdb.IdentificationEngine();
var result = ire.createOrUpdateCI('SCCM', JSON.stringify(payload));
gs.info(result); // { items:[{sysId,operation:'UPDATE'}] }

// WRONG — bypasses IRE, guarantees duplicates over time
// var ci = new GlideRecord('cmdb_ci_computer');
// ci.initialize(); ci.name='LT-77A31'; ci.insert();`,
    output: {
      table: "cmdb_ci_computer",
      logs: [
        { time: "", text: "IRE lookup: serial_number=SN-77A31", tone: "info" },
        { time: "", text: "match found → sys_id=a1b2c3", tone: "ok" },
        { time: "", text: "reconciliation: SCCM allowed to write os → UPDATE", tone: "ok" },
      ],
      rows: [
        { number: "LT-77A31", state: "updated", updated: "sccm", highlight: "ok" },
      ],
    },
    pitfall:
      "Forgetting that IRE order matters — if you list `name` before `serial_number`, two laptops with the same hostname (VDI clones) collapse into one CI. Put the strongest unique attribute first.",
  },
  {
    id: "csdm-domains",
    title: "3. CSDM 4.0 domains — Foundation, Design, Build, Manage",
    prompt:
      "A stakeholder asks 'are we CSDM compliant?' — how do you frame the answer using the four domains?",
    approach: [
      "Foundation: core reference data (company, location, user, group) — you must have this clean before anything else.",
      "Design: how services are shaped — Business Application, Information Object, Application Service (logical, non-instantiated).",
      "Build: pipeline artifacts — Product Model, Software Model, Hardware Model — what you're deploying, not what's running.",
      "Manage: operational reality — the running instances, Technical Services, Service Offerings, and their supporting infrastructure CIs.",
    ],
    code: `// A quick CSDM domain audit — count records per anchor class
var anchors = {
  Foundation: 'core_company',
  Design:     'cmdb_ci_business_app',
  Build:      'cmdb_hardware_product_model',
  Manage:     'cmdb_ci_service_technical'
};
for (var d in anchors) {
  var gr = new GlideAggregate(anchors[d]);
  gr.addAggregate('COUNT');
  gr.query(); gr.next();
  gs.info(d + ': ' + gr.getAggregate('COUNT') + ' records');
}`,
    output: {
      table: "cmdb_ci",
      logs: [
        { time: "", text: "Foundation: 412 records", tone: "ok" },
        { time: "", text: "Design: 38 business apps", tone: "ok" },
        { time: "", text: "Build: 14 product models", tone: "warn" },
        { time: "", text: "Manage: 27 technical services", tone: "ok" },
      ],
      rows: [
        { number: "csdm:audit", state: "reviewed", updated: "aggregate", highlight: "ok" },
      ],
    },
    pitfall:
      "Chasing Manage-domain metrics (thousands of servers) while Foundation is broken. If company/location/user are dirty, every downstream service map inherits the mess.",
  },
  {
    id: "ci-health",
    title: "4. CI Health — completeness, correctness, compliance",
    prompt:
      "The CMDB dashboard shows a health score of 62. What three dimensions is that score measuring, and how do you raise it?",
    approach: [
      "Completeness: are required attributes populated? Drive this with mandatory fields on Identification Rules and Discovery patterns.",
      "Correctness: does the data still match reality? Stale records get flagged by the Duplicate Remediator and staleness rules (last_discovered > N days).",
      "Compliance: does the CI conform to CSDM class + relationship rules? Non-conforming CIs are surfaced in the CMDB Data Manager for cleanup.",
      "Raise the score by fixing Foundation data first, then tuning IRE identifiers to eliminate duplicates, then adding recurring Discovery schedules for stale CIs.",
    ],
    code: `// Query the health dashboard's underlying table
var gr = new GlideRecord('cmdb_health_metric');
gr.addQuery('ci_class', 'cmdb_ci_linux_server');
gr.orderByDesc('sys_created_on');
gr.setLimit(1);
gr.query();
if (gr.next()) {
  gs.info('completeness: ' + gr.getValue('completeness_score'));
  gs.info('correctness:  ' + gr.getValue('correctness_score'));
  gs.info('compliance:   ' + gr.getValue('compliance_score'));
}`,
    output: {
      table: "cmdb_health_metric",
      logs: [
        { time: "", text: "completeness: 78 (missing owned_by on 22 CIs)", tone: "warn" },
        { time: "", text: "correctness:  55 (41 stale > 30 days)", tone: "warn" },
        { time: "", text: "compliance:   71 (9 non-conforming classes)", tone: "warn" },
      ],
      rows: [
        { number: "cmdb:health", state: "62", updated: "score", highlight: "warn" },
      ],
    },
    pitfall:
      "Gaming the score by lowering the required attribute list. The number goes up; the CMDB gets less useful. Only remove requirements when a downstream process truly doesn't need them.",
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
  headline: "ServiceNow CMDB & CSDM Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow CMDB, CSDM 4.0, Identification and Reconciliation Engine, CI Health",
  audience: { "@type": "Audience", audienceType: "ServiceNow Architects and Developers" },
};

export const Route = createFileRoute("/learn/cmdb-interview-questions")({
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
  component: CmdbGuide,
});

function CmdbGuide() {
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
            Interview Prep · CMDB & CSDM
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            CMDB &amp; CSDM
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons on CMDB vs CSDM, Identification and Reconciliation
            Rules, the CSDM 4.0 domains, and CI Health — each with a runnable
            simulator trace showing the exact platform behavior.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/discovery-interview-questions" className="text-accent underline">
              Discovery guide
            </Link>{" "}
            and the{" "}
            <Link to="/learn/irm-architect-interview-questions" className="text-accent underline">
              IRM architect guide
            </Link>{" "}
            for full architectural coverage.
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
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Glossary topics
            </Link>
            <Link
              to="/learn/discovery-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Discovery Q&amp;A
            </Link>
            <Link
              to="/learn/integrationhub-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              IntegrationHub Q&amp;A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
