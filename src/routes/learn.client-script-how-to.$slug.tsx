import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { getClientScriptGuide, type ClientScriptGuide } from "@/lib/content/client-script-howto";

const BASE = "https://www.sparkcoder.online/learn/client-script-how-to";

export const Route = createFileRoute("/learn/client-script-how-to/$slug")({
  loader: ({ params }) => {
    const guide = getClientScriptGuide(params.slug);
    if (!guide) throw notFound();
    return { guide };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Guide unavailable — SparkCoder" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const g = loaderData.guide;
    const url = `${BASE}/${params.slug}`;
    return {
      meta: [
        { title: g.title },
        { name: "description", content: g.description },
        { property: "og:title", content: g.title },
        { property: "og:description", content: g.description },
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
            "@type": "HowTo",
            name: g.heading,
            description: g.description,
            url,
            step: g.steps.map((s) => ({
              "@type": "HowToStep",
              name: s.title,
              text: s.body,
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: g.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Client script how-to",
                item: BASE,
              },
              { "@type": "ListItem", position: 2, name: g.heading, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: GuideNotFound,
  component: ClientScriptHowToDetail,
});

function GuideNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-3xl tracking-tight">Guide not found</h1>
      <Link to="/learn/client-script-how-to" className="text-accent hover:underline text-sm">
        ← All client script how-tos
      </Link>
    </div>
  );
}

function ClientScriptHowToDetail() {
  const { progress } = useProgress();
  const { guide } = Route.useLoaderData() as { guide: ClientScriptGuide };

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <nav aria-label="Breadcrumb" className="text-[11px] text-muted-foreground">
          <Link to="/learn/client-script-how-to" className="hover:text-accent">
            Client script how-to
          </Link>
          <span aria-hidden> / </span>
          <span className="text-foreground/70">{guide.heading}</span>
        </nav>

        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Client Scripts · Step-by-step
          </span>
          <h1 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-tight uppercase">
            {guide.heading}
          </h1>
        </header>

        <section
          className="space-y-3 rounded-2xl border-2 border-accent/40 bg-accent/5 p-5"
          aria-labelledby="short-answer"
        >
          <h2 id="short-answer" className="font-display text-xl tracking-tight text-accent">
            Short answer
          </h2>
          <p className="text-sm text-foreground/90 leading-relaxed">{guide.shortAnswer}</p>
          <p className="text-xs text-foreground/70">
            <strong className="text-foreground/90">Where:</strong> {guide.location}
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Steps</h2>
          <ol className="space-y-4">
            {guide.steps.map((s, i) => (
              <li
                key={s.title}
                className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2"
              >
                <h3 className="font-display text-base tracking-tight">
                  <span className="text-accent mr-2">{i + 1}.</span>
                  {s.title}
                </h3>
                <p className="text-sm text-foreground/85 leading-relaxed">{s.body}</p>
                {s.snippet && (
                  <pre className="text-[12px] font-mono bg-background/60 border border-border rounded-lg p-3 overflow-x-auto">
                    <code>{s.snippet}</code>
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3 rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-display text-xl tracking-tight text-destructive">
            Common mistakes
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/85">
            {guide.pitfalls.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">FAQ</h2>
          {guide.faq.map((f) => (
            <div key={f.q} className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2">
              <h3 className="font-display text-base tracking-tight">{f.q}</h3>
              <p className="text-sm text-foreground/85 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        <aside className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-lg tracking-tight">Keep going</h2>
          <div className="flex flex-wrap gap-2">
            {guide.related.map((r) => (
              <Link
                key={r.slug}
                to="/learn/client-script-how-to/$slug"
                params={{ slug: r.slug }}
                className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20"
              >
                {r.label}
              </Link>
            ))}
            <Link
              to="/practice/$category"
              params={{ category: "client-scripts" }}
              search={{ difficulty: undefined }}
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-xs font-display tracking-wider uppercase hover:border-accent/50"
            >
              Practice puzzles
            </Link>
            <Link
              to="/learn/client-script-how-to"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-xs font-display tracking-wider uppercase hover:border-accent/50"
            >
              All how-tos
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
