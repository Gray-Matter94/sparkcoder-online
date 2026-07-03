import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IRM_CATEGORIES } from "@/lib/content/irm";
import { setActiveTrack } from "@/lib/tracks";
import { useEffect } from "react";

const TITLE = "ServiceNow IRM Architect Practice Track — SparkCoder";
const DESCRIPTION =
  "Interactive practice for ServiceNow IRM/GRC architects: GRC tables, risk scoring math, and policy & compliance attestations — with runnable simulator traces.";
const URL = "https://www.sparkcoder.online/servicenow-irm-architect-practice";

const CATEGORY_LINKS = [
  {
    id: "grc-tables" as const,
    accent: "primary" as const,
    bullets: [
      "sn_risk_risk vs legacy sn_grc_risk",
      "sn_grc_profile as the entity anchor",
      "Joining risks, controls, and CIs",
    ],
  },
  {
    id: "risk-scoring" as const,
    accent: "accent" as const,
    bullets: [
      "Inherent × (1 − effectiveness) residual math",
      "Mapping scores to Low / Medium / High tiers",
      "Guarding against divide-by-zero and unit mismatch",
    ],
  },
  {
    id: "policy-compliance" as const,
    accent: "secondary" as const,
    bullets: [
      "AttestationUtils and the audit trail",
      "Scheduled control review jobs",
      "Evidence-backed state transitions",
    ],
  },
];

const ITEMLIST_JSONLD = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ServiceNow IRM Architect Practice Categories",
  itemListElement: CATEGORY_LINKS.map((c, i) => {
    const meta = IRM_CATEGORIES.find((x) => x.id === c.id)!;
    return {
      "@type": "ListItem",
      position: i + 1,
      name: meta.name,
      url: `https://www.sparkcoder.online/practice/${c.id}`,
      description: meta.blurb,
    };
  }),
};

const COURSE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Course",
  name: "ServiceNow IRM Architect Practice Track",
  description: DESCRIPTION,
  url: URL,
  provider: {
    "@type": "Organization",
    name: "SparkCoder Online",
    url: "https://www.sparkcoder.online",
  },
  audience: {
    "@type": "Audience",
    audienceType: "ServiceNow IRM/GRC Architects",
  },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: "PT2H",
  },
};

export const Route = createFileRoute("/servicenow-irm-architect-practice")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ITEMLIST_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(COURSE_JSONLD) },
    ],
  }),
  component: IRMTrackLanding,
});

function IRMTrackLanding() {
  // Ensure the homepage/practice UI reflects the IRM track when the user
  // arrives via this landing page.
  useEffect(() => {
    setActiveTrack("servicenow-irm");
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar back />
      </ErrorBoundary>

      <main className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 space-y-10 pb-24">
        <header className="space-y-4 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
            Practice Track · IRM / GRC
          </span>
          <h1 className="font-display text-4xl sm:text-6xl leading-[0.95] tracking-tight">
            SERVICENOW IRM ARCHITECT
            <br />
            <span className="text-primary">PRACTICE TRACK.</span>
          </h1>
          <p className="text-base text-foreground/85 leading-relaxed max-w-2xl">
            Three focused categories built for senior ServiceNow IRM/GRC
            architects. Each puzzle ships with a runnable simulator so you can
            see how <code className="font-mono text-primary">sn_risk_risk</code>,
            control attestations, and residual-risk math actually behave — not
            just how they're described in a slide deck.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              to="/practice/$category"
              params={{ category: "grc-tables" }}
              search={{ difficulty: undefined }}
              className="h-11 px-5 inline-flex items-center rounded-xl border-2 border-primary bg-primary/10 text-primary text-sm font-display tracking-wider uppercase hover:bg-primary/20 transition-colors"
            >
              Start with GRC Tables →
            </Link>
            <Link
              to="/learn/irm-architect-interview-questions"
              className="h-11 px-5 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-primary/50"
            >
              Interview Q&amp;A
            </Link>
          </div>
        </header>

        <section aria-labelledby="cats-heading" className="space-y-4">
          <h2
            id="cats-heading"
            className="font-display text-2xl tracking-tight"
          >
            Three practice categories
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {CATEGORY_LINKS.map((c) => {
              const meta = IRM_CATEGORIES.find((x) => x.id === c.id)!;
              const accent =
                c.accent === "primary"
                  ? "border-primary/40 hover:border-primary text-primary"
                  : c.accent === "accent"
                    ? "border-accent/40 hover:border-accent text-accent"
                    : "border-secondary/40 hover:border-secondary text-secondary";
              return (
                <li key={c.id}>
                  <Link
                    to="/practice/$category"
                    params={{ category: c.id }}
                    search={{ difficulty: undefined }}
                    className={`group flex flex-col h-full rounded-2xl border-2 bg-panel p-5 transition-colors ${accent}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl leading-none">{meta.emoji}</span>
                      <h3 className="font-display text-lg tracking-tight text-foreground">
                        {meta.name}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-foreground/80">{meta.blurb}</p>
                    <ul className="mt-3 space-y-1 text-[12px] text-foreground/75 list-disc pl-4">
                      {c.bullets.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                    <span className="mt-4 text-[11px] font-mono uppercase tracking-wider">
                      Open track →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">
            Why architects use it
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-foreground/85">
            <li className="rounded-xl border border-border p-3">
              <strong className="text-primary">Table-accurate.</strong> Puzzles
              use the real IRM Advanced tables (<code className="font-mono">sn_risk_risk</code>,{" "}
              <code className="font-mono">sn_grc_profile</code>,{" "}
              <code className="font-mono">sn_compliance_control</code>) — no
              legacy stand-ins.
            </li>
            <li className="rounded-xl border border-border p-3">
              <strong className="text-accent">Math you can defend.</strong>{" "}
              Residual = Inherent × (1 − Effectiveness), threshold tiering, and
              the traps auditors catch.
            </li>
            <li className="rounded-xl border border-border p-3">
              <strong className="text-secondary">Attestation-first.</strong>{" "}
              Practice wiring <code className="font-mono">AttestationUtils</code>{" "}
              into scheduled control reviews with the audit trail intact.
            </li>
            <li className="rounded-xl border border-border p-3">
              <strong className="text-primary">Simulator traces.</strong> Every
              answer explains the platform's response — right or wrong — so you
              build intuition, not just recall.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">Keep going</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn/irm-architect-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-primary/50"
            >
              IRM interview questions
            </Link>
            <Link
              to="/learn/acl-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-primary/50"
            >
              ACL scripting
            </Link>
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-primary/50"
            >
              Glossary topics
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
