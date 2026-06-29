import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow Discovery Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow Discovery interview prep: horizontal vs top-down, MID Server config, classification vs identification, and CI reconciliation — with simulator traces.";
const URL = "https://www.sparkcoder.online/learn/discovery-interview-questions";

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
    id: "horizontal-vs-topdown",
    title: "1. Horizontal vs Top-Down Discovery — when to use each",
    prompt:
      "Your CMDB has servers populated but no business-service dependencies. Which Discovery flavor do you reach for?",
    approach: [
      "Horizontal Discovery scans IP ranges, probes ports, and populates infrastructure CIs (servers, network gear, apps).",
      "Service Mapping (top-down) starts from an entry point (URL or load balancer) and traces traffic to map a business service.",
      "Horizontal answers 'what exists', top-down answers 'what depends on what'.",
      "Run horizontal first to seed CIs; layer Service Mapping on top for impact analysis and outage scoping.",
    ],
    code: `// Discovery schedule (horizontal)
schedule.name      = 'Prod DC1 sweep';
schedule.ip_range  = '10.42.0.0/16';
schedule.mid_group = 'mid_dc1';

// Service Mapping (top-down)
serviceMap.entry_point = 'https://shop.example.com';
serviceMap.discover_from = 'Load Balancer VIP';`,
    output: {
      table: "cmdb_ci",
      logs: [
        { time: "", text: "horizontal sweep 10.42.0.0/16", tone: "info" },
        { time: "", text: "1,284 IPs probed → 312 CIs created", tone: "ok" },
        { time: "", text: "top-down trace from shop.example.com", tone: "info" },
        { time: "", text: "mapped 18 CIs → cmdb_ci_service_discovered", tone: "ok" },
      ],
      rows: [
        { number: "srv-prod-042", state: "Linux", updated: "horizontal", highlight: "ok" },
        { number: "svc-shop-checkout", state: "service", updated: "top-down", highlight: "ok" },
      ],
    },
    pitfall:
      "Service Mapping needs accurate horizontal CIs first — running it against a sparse CMDB produces orphan 'unknown' nodes that look like outages on the dashboard.",
  },
  {
    id: "mid-server",
    title: "2. MID Server architecture — placement, credentials, and load",
    prompt:
      "How do you size and place MID Servers for a multi-region datacenter discovery?",
    approach: [
      "MID Server runs inside the customer network and brokers traffic between the instance and discovery targets.",
      "Place one MID Server cluster per network zone (DC, DMZ, cloud VPC) so probes don't cross firewalls.",
      "Each MID Server needs Java + credentials from the credential table; secrets are pulled at runtime, never stored locally in plain text.",
      "Rule of thumb: 1 MID Server per ~5,000 CIs scanned per cycle; add a cluster member before maxing out a single host.",
    ],
    code: `// MID Server config (config.xml)
<parameter name="name"     value="mid_dc1_a"/>
<parameter name="url"      value="https://acme.service-now.com"/>
<parameter name="mid.instance.username" value="midserver_svc"/>

// Credential affinity (sys_user_group)
group.name = 'mid_dc1';
group.applies_to = ['mid_dc1_a','mid_dc1_b'];`,
    output: {
      table: "ecc_agent",
      logs: [
        { time: "", text: "MID mid_dc1_a heartbeat OK", tone: "ok" },
        { time: "", text: "MID mid_dc1_b heartbeat OK", tone: "ok" },
        { time: "", text: "credential pull → vault.acme/ssh-prod", tone: "info" },
        { time: "", text: "probe queue depth: 142", tone: "warn" },
      ],
      rows: [
        { number: "mid_dc1_a", state: "Up", updated: "load 38%", highlight: "ok" },
        { number: "mid_dc1_b", state: "Up", updated: "load 41%", highlight: "ok" },
        { number: "mid_aws_01", state: "Down", updated: "no heartbeat", highlight: "bad" },
      ],
    },
    pitfall:
      "A single MID Server straddling two firewall zones works in dev and silently drops probes in prod. Always split MID clusters along network boundaries.",
  },
  {
    id: "classification-vs-identification",
    title: "3. Classification vs Identification rules — what runs when",
    prompt:
      "Two servers with the same hostname show up as duplicate CIs after every Discovery run. Which rule type is misconfigured?",
    approach: [
      "Classification rules look at probe output to decide WHAT a CI is (Linux, Windows, Cisco router…).",
      "Identification rules decide WHO a CI is (which existing record matches) using priority-ordered criteria sets.",
      "Order matters: classification runs first, then identification matches via serial_number → MAC → name+IP → name.",
      "Duplicate CIs almost always trace back to identification — usually name-only matching with no FQDN or serial.",
    ],
    code: `// Identification rule on cmdb_ci_server
rule.name = 'Server identification';
rule.criteria = [
  { attribute: 'serial_number', priority: 1 },
  { attribute: 'mac_address',   priority: 2 },
  { attribute: 'name+ip_address', priority: 3 },
];
rule.allow_independent_search = false;`,
    output: {
      table: "cmdb_ci_server",
      logs: [
        { time: "", text: "classified as Linux Server", tone: "info" },
        { time: "", text: "ID criterion 1 (serial) → match found", tone: "ok" },
        { time: "", text: "skipping criteria 2 & 3", tone: "info" },
        { time: "", text: "updated existing CI srv-prod-042", tone: "ok" },
      ],
      rows: [
        { number: "srv-prod-042", state: "matched", updated: "by serial", highlight: "ok" },
        { number: "srv-prod-042 (dup)", state: "would create", updated: "blocked", highlight: "warn" },
      ],
    },
    pitfall:
      "Setting allow_independent_search=true lets the engine fall through to weaker criteria and creates duplicates. Keep it false unless you really know why.",
  },
  {
    id: "reconciliation-irdr",
    title: "4. CI reconciliation & IRE — who writes wins",
    prompt:
      "Discovery overwrote the CI 'environment' field that the SACM team manually set. How do you stop it next time?",
    approach: [
      "The Identification and Reconciliation Engine (IRE) is the single entry point for every CI write — Discovery, Service Mapping, integrations, all of it.",
      "Reconciliation rules declare which DATA SOURCE owns which attribute on which class.",
      "If 'SACM' owns environment on cmdb_ci_server, Discovery payloads that include environment are silently dropped for that field.",
      "Always file reconciliation rules in source control — they're the contract between teams writing to the same CIs.",
    ],
    code: `// Reconciliation rule
rule.applies_to = 'cmdb_ci_server';
rule.attribute  = 'environment';
rule.data_source = 'SACM';     // wins
rule.precedence  = 1;

// Discovery payload arriving second is ignored for this field
payload.data_source = 'ServiceNow';
payload.environment = 'production';`,
    output: {
      table: "cmdb_ire_data_source_rule",
      logs: [
        { time: "", text: "IRE evaluating payload for srv-prod-042", tone: "info" },
        { time: "", text: "field 'environment' → owner = SACM", tone: "warn" },
        { time: "", text: "Discovery write dropped (lower precedence)", tone: "warn" },
        { time: "", text: "other fields persisted", tone: "ok" },
      ],
      rows: [
        { number: "environment", state: "SACM", updated: "kept", highlight: "ok" },
        { number: "os_version", state: "Discovery", updated: "updated", highlight: "ok" },
      ],
    },
    pitfall:
      "Without reconciliation rules, the most recent write wins — meaning Discovery and your CMDB integration ping-pong values every hour. Define ownership before turning on a second source.",
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
  headline: "ServiceNow Discovery Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-06-29",
  dateModified: "2026-06-29",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow Discovery, MID Servers, and CMDB identification",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers and Architects" },
};

export const Route = createFileRoute("/learn/discovery-interview-questions")({
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
  component: DiscoveryGuide,
});

function DiscoveryGuide() {
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
            Interview Prep · Discovery & CMDB
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            DISCOVERY
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons covering horizontal vs top-down discovery, MID Server
            sizing, classification vs identification rules, and the IRE — each with a
            runnable simulator trace you can step through.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/scenario-based-scripting" className="text-accent underline">
              scenario scripting guide
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
