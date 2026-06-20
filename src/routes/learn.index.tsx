import { createFileRoute, Link } from "@tanstack/react-router";
import { TOPICS } from "@/lib/glossary";
import { useProgress } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";

export const Route = createFileRoute("/learn/")({
  head: () => ({
    meta: [
      { title: "ServiceNow Glossary & Quizzes — SparkCoder" },
      {
        name: "description",
        content:
          "Learn ServiceNow concepts with illustrated definitions and topic quizzes — Platform, ITSM, CMDB, Flow Designer, Integrations.",
      },
      { property: "og:title", content: "ServiceNow Glossary & Quizzes — SparkCoder" },
      {
        property: "og:description",
        content:
          "Illustrated ServiceNow terminology and quick quizzes across Platform, ITSM, CMDB, Flow Designer, and Integrations.",
      },
      { property: "og:url", content: "https://service-spark-coder.lovable.app/learn" },
    ],
    links: [{ rel: "canonical", href: "https://service-spark-coder.lovable.app/learn" }],
  }),
  component: Learn,
});

function Learn() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <StatsBar progress={progress} back />

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-6">
        <section className="space-y-2 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Knowledge Vault
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            LEARN THE
            <br />
            <span className="text-accent">LINGO.</span>
          </h1>
          <p className="text-sm text-foreground/85">
            Pick a topic to skim the glossary and run a 4-question quiz. Quizzes mark the topic as
            studied — no XP, no streak pressure.
          </p>
        </section>

        <section className="space-y-3">
          {TOPICS.map((t) => (
            <Link
              key={t.id}
              to="/learn/$topic"
              params={{ topic: t.id }}
              className="block rounded-2xl border-2 border-border bg-panel overflow-hidden hover:border-accent/50 transition-all active:translate-y-0.5"
            >
              <div className="relative aspect-[3/2] bg-zinc-900 overflow-hidden">
                <img
                  src={t.image}
                  alt={`${t.name} concept illustration`}
                  loading="lazy"
                  width={768}
                  height={512}
                  className="size-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/40 to-transparent" />
                <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl tracking-tight leading-none">
                      {t.emoji} {t.name.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-foreground/85 mt-1">{t.tagline}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded-md border border-accent/40 text-accent shrink-0">
                    OPEN →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
