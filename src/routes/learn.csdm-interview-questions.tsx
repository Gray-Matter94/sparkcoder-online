import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";
import { createTechArticleSchema, SITE_URL } from "@/lib/editorial";

const TITLE = "ServiceNow CSDM Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow CSDM interview prep: the five domains (Foundation, Design, Technical, Sell/Consume, Manage), CSDM vs CMDB, service mapping, and migration strategy — with simulator traces.";
const URL = `${SITE_URL}/learn/csdm-interview-questions`;

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
    id: "csdm-vs-cmdb",
    title: "1. CSDM vs CMDB — what's the actual difference?",
    prompt:
      "An interviewer asks: 'We already have a CMDB. Why do we need CSDM?' How do you answer?",
    approach: [
      "The CMDB is the database — tables, classes, relationships, and the CIs themselves.",
      "CSDM (Common Service Data Model) is the modeling standard: which classes to use, how to relate them, and which lifecycle stage each belongs to.",
      "CSDM tells you WHERE in the CMDB a thing lives — e.g. a business service goes in cmdb_ci_service_business, not a custom table.",
      "Following CSDM means upgrades, Service Mapping, Impact analysis, and vendor integrations work out of the box.",
    ],
    code: `// CSDM-aligned classes (out of box)
cmdb_ci_service_business   // Business Service
cmdb_ci_service_technical  // Technical Service
cmdb_ci_service_offering   // Service Offering
cmdb_ci_app_server         // Technical CI (foundation)

// Anti-pattern: custom table for services
u_my_services              // breaks mapping, impact, upgrades`,
    output: {
      table: "cmdb_ci_service",
      logs: [
        { time: "", text: "querying service hierarchy", tone: "info" },
        { time: "", text: "business service → offerings → technical services", tone: "ok" },
        { time: "", text: "impact tree resolved via CSDM relationships", tone: "ok" },
      ],
      rows: [
        { number: "svc-checkout", state: "business", updated: "CSDM", highlight: "ok" },
        { number: "off-checkout-premium", state: "offering", updated: "CSDM", highlight: "ok" },
        { number: "svc-tomcat-cluster", state: "technical", updated: "CSDM", highlight: "ok" },
      ],
    },
    pitfall:
      "Teams model services in custom tables 'because it's faster'. Six months later Service Mapping can't attach to them and every impact dashboard is blank. CSDM alignment is cheaper than retrofitting.",
  },
  {
    id: "five-domains",
    title: "2. The five CSDM domains — name them and place a CI",
    prompt:
      "Walk me through the CSDM domains. Where does a new microservice land, and where does its customer-facing offering land?",
    approach: [
      "Foundation — the CIs everything stands on: servers, network, apps, databases (cmdb_ci infrastructure classes).",
      "Design — what you intend to build: business capabilities, application services, planned services.",
      "Technical — how it's delivered: technical services and their offerings, dynamic CI groups.",
      "Sell/Consume — what customers see: business services, service offerings, service catalogs, commitments.",
      "Manage — how you run it: incidents, changes, problems tied to services and offerings.",
      "A new microservice is a Technical domain CI (application service); its customer-facing offering belongs in Sell/Consume.",
    ],
    code: `// Domain placement cheat sheet
Foundation : cmdb_ci_server, cmdb_ci_database
Design     : cmdb_ci_business_capability,
             cmdb_ci_service_auto (planned)
Technical  : cmdb_ci_service_technical,
             cmdb_ci_service_offering (technical)
Sell/Consume: cmdb_ci_service_business,
             cmdb_ci_service_offering (business)
Manage     : incident.service_offering,
             change_request.cmdb_ci`,
    output: {
      table: "cmdb_ci",
      logs: [
        { time: "", text: "classify new CI 'payments-api'", tone: "info" },
        { time: "", text: "→ Technical domain: application service", tone: "ok" },
        { time: "", text: "offering 'Payments API — Gold' → Sell/Consume", tone: "ok" },
      ],
      rows: [
        { number: "payments-api", state: "technical svc", updated: "Design→Technical", highlight: "ok" },
        { number: "payments-gold", state: "offering", updated: "Sell/Consume", highlight: "ok" },
      ],
    },
    pitfall:
      "The classic wrong answer is putting customer-facing offerings in the Technical domain. Offerings that customers subscribe to live in Sell/Consume; technical offerings are internal building blocks.",
  },
  {
    id: "service-offering-vs-service",
    title: "3. Business Service vs Service Offering — when do you split?",
    prompt:
      "Your client has one 'Email' business service. Support wants separate SLAs for VIP and standard users. What do you model?",
    approach: [
      "A Business Service is the capability as the business sees it ('Email').",
      "A Service Offering is a specific way that service is delivered — with its own SLA, price, and commitment set.",
      "VIP and standard email = ONE business service, TWO service offerings ('Email — VIP', 'Email — Standard').",
      "Incidents and SLAs attach to the offering, so metrics split cleanly without duplicating the service.",
    ],
    code: `// One service, two offerings
svc = new GlideRecord('cmdb_ci_service_business');
svc.name = 'Email'; svc.insert();

off1 = new GlideRecord('cmdb_ci_service_offering');
off1.name = 'Email — VIP';
off1.parent = svc.sys_id;      // business service
off1.sla  = '99.99% / 15min response';

off2 = new GlideRecord('cmdb_ci_service_offering');
off2.name = 'Email — Standard';
off2.parent = svc.sys_id;
off2.sla  = '99.5% / 4h response';`,
    output: {
      table: "cmdb_ci_service_offering",
      logs: [
        { time: "", text: "created business service 'Email'", tone: "ok" },
        { time: "", text: "offering 'Email — VIP' linked", tone: "ok" },
        { time: "", text: "offering 'Email — Standard' linked", tone: "ok" },
        { time: "", text: "SLA definitions attached per offering", tone: "info" },
      ],
      rows: [
        { number: "Email", state: "business svc", updated: "1 record", highlight: "ok" },
        { number: "Email — VIP", state: "offering", updated: "SLA 99.99%", highlight: "ok" },
        { number: "Email — Standard", state: "offering", updated: "SLA 99.5%", highlight: "ok" },
      ],
    },
    pitfall:
      "Creating two business services ('Email VIP', 'Email Standard') doubles your mapping and impact-modeling work and fragments reporting. Split at the offering level, never the service level.",
  },
  {
    id: "csdm-migration",
    title: "4. Migrating a legacy CMDB to CSDM — where do you start?",
    prompt:
      "The CMDB has 400k CIs, none modeled to CSDM. Leadership wants 'CSDM compliance'. What's your phased plan?",
    approach: [
      "Phase 1 — Foundation first: clean up identification/reconciliation, dedupe, and get infrastructure CIs trustworthy.",
      "Phase 2 — Crawl: model 3–5 critical business services end-to-end (service → offering → technical service → CIs).",
      "Phase 3 — Walk: extend to the top 20 services; wire Service Mapping and impact analysis.",
      "Phase 4 — Run: govern with CSDM lifecycle stages, KPIs on CI health, and a modeling review board.",
      "Never boil the ocean: CSDM adoption is measured per service, not per CI count.",
    ],
    code: `// Health check before migrating
var ga = new GlideAggregate('cmdb_ci');
ga.addAggregate('COUNT');
ga.groupBy('sys_class_name');
ga.query();
// → find classes with dupes, stale CIs,
//   and classes that should be service classes

// CSDM lifecycle per CI
ci.life_cycle_stage = 'Operational';
ci.life_cycle_stage_status = 'In use';`,
    output: {
      table: "cmdb_ci",
      logs: [
        { time: "", text: "health scan: 400k CIs, 41 classes", tone: "info" },
        { time: "", text: "12% duplicates, 8% stale >90d", tone: "warn" },
        { time: "", text: "phase 1 scope: 5 critical services", tone: "ok" },
      ],
      rows: [
        { number: "phase-1", state: "foundation", updated: "dedupe + IRE", highlight: "ok" },
        { number: "phase-2", state: "crawl", updated: "5 services", highlight: "ok" },
        { number: "phase-3", state: "walk", updated: "top 20", highlight: "info" },
      ],
    },
    pitfall:
      "Starting with a big-bang reclassification of all 400k CIs stalls for quarters and delivers nothing visible. Model a handful of critical services fully first — a working impact tree for one service sells the program better than any slide deck.",
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

const ARTICLE_JSONLD = createTechArticleSchema({
  headline: "ServiceNow CSDM Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-10-08",
  dateModified: "2026-10-08",
  about: "ServiceNow CSDM (Common Service Data Model), CMDB modeling, and service architecture",
  audienceType: "ServiceNow Architects and Senior Developers",
});

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "SparkCoder", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Learn", item: `${SITE_URL}/learn` },
    { "@type": "ListItem", position: 3, name: "CSDM Interview Questions", item: URL },
  ],
};

export const Route = createFileRoute("/learn/csdm-interview-questions")({
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
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSONLD) },
    ],
  }),
  component: CsdmGuide,
});

function CsdmGuide() {
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
            Interview Prep · CSDM & CMDB
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            CSDM
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons covering CSDM vs CMDB, the five domains, business
            service vs service offering splits, and phased CSDM migration — each with a
            runnable simulator trace you can step through.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/discovery-interview-questions" className="text-accent underline">
              Discovery guide
            </Link>{" "}
            and the{" "}
            <Link to="/learn/cmdb" className="text-accent underline">
              CMDB topic
            </Link>{" "}
            for full architect-level coverage.
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
                    Reference config
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
              Discovery questions
            </Link>
            <Link
              to="/servicenow-interview-questions-and-answers"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Interview hub
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
