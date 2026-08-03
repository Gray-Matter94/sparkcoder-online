import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { BLOG_POSTS } from "@/lib/blog";

const TITLE = "ServiceNow 20-Day Scripting Curriculum — Weekly Series";
const DESCRIPTION =
  "A 20-day ServiceNow scripting curriculum, shipped as 4 weekly guides. Daily goals, drills, and takeaways from data dictionary to interview day.";
const URL = "https://www.sparkcoder.online/blog";
const OG_IMAGE = "https://www.sparkcoder.online/og/blog-curriculum.jpg";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "SparkCoder" },
      { property: "og:locale", content: "en_US" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "SparkCoder ServiceNow 20-day scripting curriculum" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: "SparkCoder ServiceNow 20-day scripting curriculum" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "SparkCoder ServiceNow Blog",
          url: URL,
          description: DESCRIPTION,
          blogPost: BLOG_POSTS.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            datePublished: p.publishedAt,
            dateModified: p.updatedAt,
            url: `https://www.sparkcoder.online/blog/${p.slug}`,
            description: p.description,
            author: { "@type": "Organization", name: "SparkCoder" },
          })),
        }),
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            📚 20-Day Curriculum
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ServiceNow 20-Day <span className="text-accent">Scripting Curriculum.</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Twenty days of ServiceNow scripting, grouped into four weekly guides. Each day has one goal, one
            drill, and one takeaway you can actually use on Monday.
          </p>
        </header>

        <ol className="space-y-3">
          {BLOG_POSTS.map((p) => (
            <li key={p.slug}>
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="block p-5 rounded-2xl border-2 border-border bg-panel hover:border-accent/60 transition-all active:translate-y-0.5"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
                    Week {p.week} · Days {(p.week - 1) * 5 + 1}–{p.week * 5}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {p.readMinutes} min read
                  </span>
                </div>
                <h2 className="font-display text-xl tracking-wide leading-tight mb-2">{p.title}</h2>
                <p className="text-xs text-muted-foreground">{p.subtitle}</p>
              </Link>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-2">
          <h2 className="font-display text-lg tracking-wide text-secondary">HOW TO USE IT</h2>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
            <li>Read one week per Monday morning. Do the drills across the week.</li>
            <li>After each week, run the matching practice puzzles to lock it in.</li>
            <li>Skip days you already know — the curriculum is a checklist, not a contract.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
