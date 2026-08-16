import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { GLOSSARY_ENTRIES, glossaryEntry } from "@/lib/glossary-hub";

const BASE = "https://www.sparkcoder.online";

export const Route = createFileRoute("/glossary/$slug")({
  loader: ({ params }) => {
    const entry = glossaryEntry(params.slug);
    if (!entry) throw notFound();
    return { entry };
  },
  head: ({ params, loaderData }) => {
    const entry = loaderData?.entry;
    const url = `${BASE}/glossary/${params.slug}`;
    if (!entry) {
      return {
        meta: [
          { title: "Glossary term not found — SparkCoder" },
          { name: "description", content: "This glossary term does not exist." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${entry.term} in ServiceNow — Definition, Example & Interview Answer`;
    const description = `${entry.definition} Includes a platform example, why it matters, and the related practice drills.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "DefinedTerm",
            name: entry.term,
            alternateName: entry.aka,
            description: entry.definition,
            url,
            inDefinedTermSet: {
              "@type": "DefinedTermSet",
              name: "ServiceNow & ITSM Glossary",
              url: `${BASE}/glossary`,
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "SparkCoder", item: `${BASE}/` },
              { "@type": "ListItem", position: 2, name: "Glossary", item: `${BASE}/glossary` },
              { "@type": "ListItem", position: 3, name: entry.term, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: TermNotFound,
  component: TermPage,
});

function TermNotFound() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-4">
      <h1 className="font-display text-3xl tracking-tight">Term not found</h1>
      <p className="text-sm text-foreground/80">
        That glossary entry does not exist yet.
      </p>
      <Link to="/glossary" className="text-accent text-sm font-display uppercase tracking-wider">
        Back to the glossary
      </Link>
    </main>
  );
}

function TermPage() {
  const { entry } = Route.useLoaderData();
  const { progress } = useProgress();
  const related = GLOSSARY_ENTRIES.filter(
    (e) => e.category === entry.category && e.slug !== entry.slug,
  ).slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.2em] text-foreground/60">
          <Link to="/glossary" className="text-accent">
            Glossary
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{entry.category}</span>
        </nav>

        <header className="space-y-3 animate-fade-in">
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight flex items-start gap-3">
            <span aria-hidden="true">{entry.emoji}</span>
            <span>{entry.term}</span>
          </h1>
          <p className="text-base text-foreground/90 leading-relaxed rounded-2xl border-2 border-accent/40 bg-accent/5 p-4">
            {entry.definition}
          </p>
          {entry.aka.length > 0 && (
            <p className="text-xs text-foreground/60">
              Also searched as: {entry.aka.join(", ")}.
            </p>
          )}
        </header>

        <section className="space-y-2">
          <h2 className="font-display text-2xl tracking-tight text-accent">In practice</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">{entry.detail}</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl tracking-tight text-accent">Example</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">{entry.example}</p>
          {entry.code && (
            <pre className="rounded-2xl border-2 border-border bg-panel p-4 overflow-x-auto text-xs leading-relaxed">
              <code>{entry.code}</code>
            </pre>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-2xl tracking-tight text-accent">
            What interviewers check
          </h2>
          <p className="text-sm text-foreground/85 leading-relaxed">{entry.interviewAngle}</p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-xl tracking-tight">Practise this topic</h2>
          <div className="flex flex-wrap gap-2">
            {entry.links.map((l) => (
              <Link
                key={l.label}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                to={l.to as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                params={l.params as any}
                className="dark-glass-option h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>

        {related.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-xl tracking-tight">Related {entry.category} terms</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    to="/glossary/$slug"
                    params={{ slug: r.slug }}
                    className="dark-glass-option block h-full rounded-2xl border-2 border-border bg-panel p-4 space-y-1"
                  >
                    <span className="font-display text-sm tracking-tight">
                      <span aria-hidden="true" className="mr-1">
                        {r.emoji}
                      </span>
                      {r.term}
                    </span>
                    <span className="block text-xs text-foreground/75 leading-relaxed">
                      {r.definition}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
