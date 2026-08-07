import type { CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { DISCOVERY_SECTIONS } from "@/lib/discovery-interview";

const TITLE = "ServiceNow Discovery & CMDB Interview Hub — SparkCoder";
const DESCRIPTION =
  "14 focused sections covering CMDB, Discovery, MID Servers, IRE, CIs, CI classes, relationships, Service Mapping, integrations, CI lifecycle, CMDB health, ITSM integration, CSDM, HAM and SAM — with AI-expandable Q&A.";
const URL = "https://www.sparkcoder.online/learn/discovery";

const collectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: TITLE,
  description: DESCRIPTION,
  url: URL,
  isPartOf: { "@type": "WebSite", name: "SparkCoder", url: "https://www.sparkcoder.online" },
  hasPart: DISCOVERY_SECTIONS.map((s) => ({
    "@type": "TechArticle",
    headline: s.title,
    description: s.blurb,
    url: `${URL}/${s.slug}`,
  })),
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.sparkcoder.online/" },
    { "@type": "ListItem", position: 2, name: "Learn", item: "https://www.sparkcoder.online/learn" },
    { "@type": "ListItem", position: 3, name: "Discovery & CMDB", item: URL },
  ],
};

export const Route = createFileRoute("/learn/discovery")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(collectionJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  }),

  component: DiscoveryHub,
});

function DiscoveryHub() {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>
      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Discovery Interview · Hub
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            DISCOVERY &<br />
            <span className="text-accent">CMDB DEEP DIVE.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            14 focused sub-modules — each with curated definitive Q&A, scenario
            drills, and a one-click AI expander so you can grow the list toward
            100+ questions per section as you study.
          </p>
        </header>

        <ol className="grid sm:grid-cols-2 gap-3">
          {DISCOVERY_SECTIONS.map((s, i) => (
            <li key={s.slug}>
              <Link
                to="/learn/discovery/$section"
                params={{ section: s.slug }}
                style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
                className="dark-glass-option floating-glass block h-full rounded-2xl border-2 border-border bg-panel p-4"
              >
                <div className="text-[10px] font-mono text-muted-foreground mb-1">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h2 className="font-display text-lg tracking-tight">{s.shortTitle}</h2>
                <p className="text-xs text-foreground/75 mt-1 leading-snug">{s.blurb}</p>
              </Link>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2">
          <h2 className="font-display text-xl tracking-tight">Also useful</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn/discovery-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Discovery starter guide
            </Link>
            <Link
              to="/learn/cmdb-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              CMDB + CSDM basics
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
