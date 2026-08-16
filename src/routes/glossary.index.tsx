import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, entriesByCategory } from "@/lib/glossary-hub";

const TITLE = "ServiceNow & ITSM Glossary — Terms Explained with Examples";
const DESCRIPTION =
  "Plain-English ServiceNow and ITSM glossary: incident, problem, change, SLA, CI, CMDB, CSDM, update set, ACL, business rule, GlideRecord, MID Server — each with an example and interview angle.";
const URL = "https://www.sparkcoder.online/glossary";

const TERM_SET_JSONLD = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "ServiceNow & ITSM Glossary",
  description: DESCRIPTION,
  url: URL,
  hasDefinedTerm: GLOSSARY_ENTRIES.map((e) => ({
    "@type": "DefinedTerm",
    name: e.term,
    description: e.definition,
    url: `${URL}/${e.slug}`,
  })),
};

const BREADCRUMB_JSONLD = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "SparkCoder", item: "https://www.sparkcoder.online/" },
    { "@type": "ListItem", position: 2, name: "Glossary", item: URL },
  ],
};

export const Route = createFileRoute("/glossary/")({
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
      { type: "application/ld+json", children: JSON.stringify(TERM_SET_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(BREADCRUMB_JSONLD) },
    ],
  }),
  component: GlossaryHub,
});

function GlossaryHub() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-10 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Glossary · {GLOSSARY_ENTRIES.length} terms
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW &amp; ITSM
            <br />
            <span className="text-accent">GLOSSARY.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Every term you are expected to define out loud in a ServiceNow interview —
            with the one-sentence definition, a concrete example from the platform, and
            what the interviewer is really testing. Each term has its own page you can
            link or bookmark.
          </p>
        </header>

        <nav
          aria-label="Glossary categories"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
        >
          <h2 className="font-display text-xl tracking-tight">Browse by area</h2>
          <ul className="flex flex-wrap gap-2">
            {GLOSSARY_CATEGORIES.map((c) => (
              <li key={c}>
                <a
                  href={`#${c.toLowerCase()}`}
                  className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-xs font-display tracking-wider uppercase"
                >
                  {c}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {GLOSSARY_CATEGORIES.map((category) => (
          <section key={category} id={category.toLowerCase()} className="space-y-4 scroll-mt-20">
            <h2 className="font-display text-2xl tracking-tight text-accent">{category}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {entriesByCategory(category).map((e) => (
                <li key={e.slug}>
                  <Link
                    to="/glossary/$slug"
                    params={{ slug: e.slug }}
                    className="dark-glass-option block h-full rounded-2xl border-2 border-border bg-panel p-4 space-y-1"
                  >
                    <span className="font-display text-base tracking-tight flex items-center gap-2">
                      <span aria-hidden="true">{e.emoji}</span>
                      {e.term}
                    </span>
                    <span className="block text-xs text-foreground/80 leading-relaxed">
                      {e.definition}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Turn definitions into answers</h2>
          <p className="text-sm text-foreground/85">
            Knowing the word is step one; the technical round asks you to use it. Run the
            drills and the role-by-role question hub.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/servicenow-interview-questions-and-answers"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Interview hub
            </Link>
            <Link
              to="/learn"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Learn &amp; quiz
            </Link>
            <Link
              to="/live-coding"
              className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase"
            >
              Live coding
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
