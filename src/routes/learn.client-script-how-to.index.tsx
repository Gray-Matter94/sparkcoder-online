import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { CLIENT_SCRIPT_GUIDES } from "@/lib/content/client-script-howto";

const TITLE = "ServiceNow Client Script How-To Guides (With Code)";
const DESCRIPTION =
  "Task-by-task client script answers: get display values, read reference fields, work around dot-walking limits, and debug scripts — each with copy-ready code.";
const URL = "https://www.sparkcoder.online/learn/client-script-how-to";

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "ServiceNow client script how-to guides",
  itemListElement: CLIENT_SCRIPT_GUIDES.map((g, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: g.heading,
    url: `${URL}/${g.slug}`,
  })),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: CLIENT_SCRIPT_GUIDES.map((g) => ({
    "@type": "Question",
    name: g.title.replace(/^How to /, "How do I ").replace(/ in ServiceNow.*$/, " in a ServiceNow client script?"),
    acceptedAnswer: { "@type": "Answer", text: g.shortAnswer },
  })),
};

const howToJsonLd = CLIENT_SCRIPT_GUIDES.map((g) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: g.heading,
  description: g.description,
  url: `${URL}/${g.slug}`,
  step: g.steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.body,
    url: `${URL}/${g.slug}`,
  })),
}));

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "SparkCoder", item: "https://www.sparkcoder.online/" },
    { "@type": "ListItem", position: 2, name: "Learn", item: "https://www.sparkcoder.online/learn" },
    { "@type": "ListItem", position: 3, name: "Client script how-to", item: URL },
  ],
};

const qaPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "QAPage",
  url: URL,
  mainEntity: {
    "@type": "Question",
    name: "How do I get field and reference values in a ServiceNow client script?",
    text: "How do I get display values, read reference field values, work around dot-walking limits and debug a ServiceNow client script?",
    answerCount: CLIENT_SCRIPT_GUIDES.length,
    acceptedAnswer: {
      "@type": "Answer",
      text: `${CLIENT_SCRIPT_GUIDES[0]!.heading} — ${CLIENT_SCRIPT_GUIDES[0]!.shortAnswer}`,
      url: `${URL}/${CLIENT_SCRIPT_GUIDES[0]!.slug}`,
    },
    suggestedAnswer: CLIENT_SCRIPT_GUIDES.slice(1).map((g) => ({
      "@type": "Answer",
      text: `${g.heading} — ${g.shortAnswer}`,
      url: `${URL}/${g.slug}`,
    })),
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: TITLE,
  description: DESCRIPTION,
  url: URL,
  author: { "@type": "Organization", name: "SparkCoder" },
  publisher: {
    "@type": "Organization",
    name: "SparkCoder",
    url: "https://www.sparkcoder.online",
  },
};

export const Route = createFileRoute("/learn/client-script-how-to/")({
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
      { type: "application/ld+json", children: JSON.stringify(itemListJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd) },
      ...howToJsonLd.map((h) => ({
        type: "application/ld+json",
        children: JSON.stringify(h),
      })),
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(qaPageJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(articleJsonLd) },
    ],
  }),

  component: ClientScriptHowToHub,
});

function ClientScriptHowToHub() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            How-To Hub
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            CLIENT SCRIPT
            <br />
            <span className="text-accent">HOW-TO.</span>
          </h1>
          <p className="text-sm text-foreground/85">
            The four client-script tasks people actually search for — display
            values, reference field values, dot-walking limits, and debugging.
            Each guide opens with a direct answer, then numbered steps with
            copy-ready <code className="font-mono text-xs">g_form</code> and
            GlideAjax code.
          </p>
        </header>

        <section aria-labelledby="guides" className="space-y-3">
          <h2 id="guides" className="font-display text-2xl tracking-tight">
            Pick a task
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CLIENT_SCRIPT_GUIDES.map((g, i) => (
              <li key={g.slug}>
                <Link
                  to="/learn/client-script-how-to/$slug"
                  params={{ slug: g.slug }}
                  className="flex h-full flex-col gap-2 rounded-2xl border-2 border-border bg-panel p-4 hover:border-accent/60 transition-colors"
                >
                  <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                    Guide {i + 1}
                  </span>
                  <span className="font-display text-base tracking-tight text-foreground">
                    {g.heading}
                  </span>
                  <span className="text-xs text-foreground/75 leading-relaxed flex-1">
                    {g.description}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-accent">
                    Read guide →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="siblings"
          className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 space-y-3"
        >
          <h2 id="siblings" className="font-display text-xl tracking-tight text-accent">
            Sibling clusters
          </h2>
          <p className="text-sm text-foreground/85">
            Client scripts rarely stand alone — these hubs cover the server and
            automation halves of the same interview topics.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            <li>
              <Link
                to="/learn/flow-designer-how-to"
                className="block h-full rounded-xl border-2 border-border bg-panel p-3 hover:border-accent/60 transition-colors"
              >
                <span className="block font-display text-sm tracking-tight">
                  Flow Designer how-to
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-accent mt-1">
                  Script steps, subflows, script includes →
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/learn/glideajax-interview-questions"
                className="block h-full rounded-xl border-2 border-border bg-panel p-3 hover:border-accent/60 transition-colors"
              >
                <span className="block font-display text-sm tracking-tight">
                  GlideAjax interview Q&amp;A
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-accent mt-1">
                  Async client-to-server calls →
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/guides/gliderecord-query-reference-field"
                className="block h-full rounded-xl border-2 border-border bg-panel p-3 hover:border-accent/60 transition-colors"
              >
                <span className="block font-display text-sm tracking-tight">
                  GlideRecord reference queries
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-accent mt-1">
                  Server-side dot-walking →
                </span>
              </Link>
            </li>
            <li>
              <Link
                to="/practice/$category"
                params={{ category: "client-scripts" }}
                search={{ difficulty: undefined }}
                className="block h-full rounded-xl border-2 border-border bg-panel p-3 hover:border-accent/60 transition-colors"
              >
                <span className="block font-display text-sm tracking-tight">
                  Client script puzzles
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-accent mt-1">
                  Practice in the simulator →
                </span>
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
