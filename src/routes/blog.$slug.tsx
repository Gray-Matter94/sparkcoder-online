import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ReadingProgress } from "@/components/ReadingProgress";
import { useProgress } from "@/lib/progress";
import { getPost, BLOG_POSTS } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) {
      return { meta: [{ title: "Post not found — SparkCoder" }] };
    }
    const url = `https://www.sparkcoder.online/blog/${post.slug}`;
    return {
      meta: [
        { title: `${post.ogTitle}` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.ogTitle },
        { property: "og:description", content: post.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "article:published_time", content: post.publishedAt },
        { property: "article:modified_time", content: post.updatedAt },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.ogTitle },
        { name: "twitter:description", content: post.description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.description,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt,
            author: { "@type": "Organization", name: "SparkCoder", url: "https://www.sparkcoder.online" },
            publisher: {
              "@type": "Organization",
              name: "SparkCoder",
              url: "https://www.sparkcoder.online",
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-3">
      <h1 className="font-display text-3xl">POST NOT FOUND</h1>
      <Link to="/blog" className="text-accent underline">
        Back to all posts
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-3">
      <h1 className="font-display text-2xl text-destructive">SOMETHING BROKE</h1>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <Link to="/blog" className="text-accent underline">
        Back to all posts
      </Link>
    </div>
  ),
  component: BlogPost,
});

function BlogPost() {
  const { post } = Route.useLoaderData() as { post: NonNullable<ReturnType<typeof getPost>> };
  const { progress } = useProgress();
  const prev = post.prevSlug ? BLOG_POSTS.find((p) => p.slug === post.prevSlug) : undefined;
  const next = post.nextSlug ? BLOG_POSTS.find((p) => p.slug === post.nextSlug) : undefined;

  return (
    <div className="min-h-screen flex flex-col">
      <ReadingProgress slug={post.slug} />
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>


      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <nav className="text-[10px] uppercase tracking-widest text-muted-foreground">
          <Link to="/blog" className="hover:text-accent">
            ← All weeks
          </Link>
        </nav>

        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Week {post.week} · Days {(post.week - 1) * 5 + 1}–{post.week * 5} · {post.readMinutes} min read
          </span>
          <h1 className="font-display text-3xl sm:text-4xl leading-[1] tracking-tight">{post.title}</h1>
          <p className="text-sm text-muted-foreground">{post.subtitle}</p>
        </header>

        <section className="space-y-3">
          <p className="text-base leading-relaxed">{post.hero}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-bold uppercase tracking-widest text-foreground">Who it's for: </span>
            {post.whoFor}
          </p>
        </section>

        <section className="rounded-2xl border-2 border-secondary/40 bg-secondary/5 p-5 space-y-3">
          <h2 className="font-display text-lg tracking-wide text-secondary">BY THE END YOU CAN</h2>
          <ul className="text-sm space-y-1.5 list-disc list-inside text-foreground/90">
            {post.outcomes.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-5">
          {post.days.map((d) => (
            <article
              key={d.day}
              className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
              id={`day-${d.day}`}
            >
              <h2 className="font-display text-xl tracking-wide text-accent">{d.title}</h2>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-2">
                    Goal
                  </span>
                  {d.goal}
                </p>
                <p>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mr-2">
                    Drill
                  </span>
                  {d.drill}
                </p>
                <p className="text-foreground/90">
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold mr-2">
                    Takeaway
                  </span>
                  {d.takeaway}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 space-y-3">
          <h2 className="font-display text-lg tracking-wide text-primary">PRACTICE THIS WEEK</h2>
          <div className="flex flex-wrap gap-2">
            {post.practice.map((p) => (
              <Link
                key={p.to}
                to={p.to}
                className="text-xs px-3 py-2 rounded-xl border-2 border-border bg-background hover:border-primary/60 transition-colors"
              >
                {p.label} →
              </Link>
            ))}
          </div>
        </section>

        <nav className="grid grid-cols-2 gap-3 pt-2">
          {prev ? (
            <Link
              to="/blog/$slug"
              params={{ slug: prev.slug }}
              className="p-4 rounded-2xl border-2 border-border bg-panel hover:border-accent/60 transition-colors"
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">← Previous</div>
              <div className="text-sm font-bold mt-1">Week {prev.week}</div>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              to="/blog/$slug"
              params={{ slug: next.slug }}
              className="p-4 rounded-2xl border-2 border-border bg-panel hover:border-accent/60 transition-colors text-right"
            >
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Next →</div>
              <div className="text-sm font-bold mt-1">Week {next.week}</div>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </main>
    </div>
  );
}
