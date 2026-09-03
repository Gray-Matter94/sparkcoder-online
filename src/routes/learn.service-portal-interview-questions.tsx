import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { QUICK_ANSWERS, SCENARIO_QA } from "@/lib/content/service-portal-interview";

const TITLE = "ServiceNow Service Portal Interview Questions & Answers";
const DESCRIPTION =
  "Service Portal interview questions with model answers: widget anatomy, $sp API, data/options, security, theming, search sources and Employee Center trade-offs.";
const URL = "https://www.sparkcoder.online/learn/service-portal-interview-questions";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    ...QUICK_ANSWERS.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: { "@type": "Answer", text: qa.a },
    })),
    ...SCENARIO_QA.map((s) => ({
      "@type": "Question",
      name: s.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${s.answer.join(" ")} Alternate approach: ${s.alternate} Watch out: ${s.pitfall}`,
      },
    })),
  ],
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow Service Portal Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-09-03",
  dateModified: "2026-09-03",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow Service Portal, widgets, $sp API, sp_page, theming, Employee Center",
  audience: { "@type": "Audience", audienceType: "ServiceNow Service Portal Developers and Architects" },
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "SparkCoder", item: "https://www.sparkcoder.online" },
    { "@type": "ListItem", position: 2, name: "Learn", item: "https://www.sparkcoder.online/learn" },
    { "@type": "ListItem", position: 3, name: "Service Portal Interview Questions", item: URL },
  ],
};

export const Route = createFileRoute("/learn/service-portal-interview-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSONLD) },
    ],
  }),
  component: ServicePortalGuide,
});

function ServicePortalGuide() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · Service Portal
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICE PORTAL
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Ten quotable answers to the Service Portal questions that open almost
            every screen, then eight role-scoped scenarios — widget performance,
            widget-level security, intake form design, digest loops, theming,
            Employee Center trade-offs, search sources and accessibility — each
            with the recommended answer, a real alternate approach, and the pitfall
            interviewers listen for.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/glideajax-interview-questions" className="text-accent underline">
              GlideAjax Q&amp;A
            </Link>{" "}
            and the{" "}
            <Link to="/learn/client-script-how-to" className="text-accent underline">
              client script how-to guides
            </Link>
            .
          </p>
        </header>

        <section
          aria-labelledby="summary-heading"
          className="rounded-2xl border-2 border-accent/40 bg-panel p-5 space-y-4"
        >
          <h2 id="summary-heading" className="font-display text-xl tracking-tight">
            Answer summary — the ten things you must be able to say
          </h2>
          <dl className="space-y-3">
            {QUICK_ANSWERS.map((qa) => (
              <div key={qa.q} className="rounded-xl border border-border bg-background/40 p-3">
                <dt className="text-sm font-bold text-accent">{qa.q}</dt>
                <dd className="mt-1 text-sm text-foreground/85">{qa.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="scenarios-heading" className="space-y-5">
          <div className="space-y-2">
            <h2 id="scenarios-heading" className="font-display text-2xl tracking-tight">
              Role-scoped Service Portal scenario questions
            </h2>
            <p className="text-sm text-foreground/85">
              These are the design-judgement questions that separate a portal
              developer from someone who has only cloned a widget.
            </p>
          </div>

          <ol className="space-y-5">
            {SCENARIO_QA.map((s, i) => (
              <li
                key={s.id}
                id={s.id}
                className="rounded-2xl border-2 border-border bg-panel p-5 space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-secondary font-bold">
                    {s.role}
                  </span>
                  <h3 className="font-display text-lg tracking-tight">
                    {i + 1}. {s.question}
                  </h3>
                  <p className="text-sm text-foreground/75">{s.situation}</p>
                </div>

                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    Recommended answer
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
                    {s.answer.map((a, j) => (
                      <li key={j}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-secondary/40 bg-secondary/5 p-3">
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-secondary font-bold mb-1">
                    Alternate approach
                  </h4>
                  <p className="text-sm text-foreground/85">{s.alternate}</p>
                </div>

                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mb-1">
                    Pitfall
                  </h4>
                  <p className="text-sm text-foreground/85">{s.pitfall}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Keep going</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/servicenow-interview-questions-and-answers"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              All roles hub
            </Link>
            <Link
              to="/learn/csm-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              CSM Q&amp;A
            </Link>
            <Link
              to="/live-coding"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Live coding
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
