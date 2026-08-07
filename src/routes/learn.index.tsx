import type { CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TOPICS, topicsForTrack, termsFor, type TopicId } from "@/lib/glossary";
import { useProgress, todayStr, daysBetween } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TrackSwitcher } from "@/components/TrackSwitcher";

export const Route = createFileRoute("/learn/")({
  head: () => {
    const collectionJsonLd = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "ServiceNow Glossary & Quizzes",
      url: "https://www.sparkcoder.online/learn",
      description:
        "Illustrated ServiceNow terminology and quick quizzes across Platform, ITSM, CMDB, Flow Designer, and Integrations.",
      hasPart: TOPICS.map((t) => ({
        "@type": "CreativeWork",
        name: t.name,
        url: `https://www.sparkcoder.online/learn/${t.id}`,
      })),
    };
    return {
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
        { property: "og:url", content: "https://www.sparkcoder.online/learn" },
      { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: "https://www.sparkcoder.online/learn" }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(collectionJsonLd) },
      ],
    };
  },
  component: Learn,
});

function Learn() {
  const { progress, track } = useProgress();
  const visibleTopics = topicsForTrack(track);

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-6">
        <TrackSwitcher />

        <section className="space-y-2 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Knowledge Vault
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ServiceNow Glossary
            <br />
            and <span className="text-accent">Quizzes.</span>
          </h1>
          <p className="text-sm text-foreground/85">
            Pick a topic to skim the glossary and run a quiz. Quizzes mark the topic as
            studied — no XP, no streak pressure.
          </p>
        </section>
        <Link
          to="/learn/scenario-based-scripting"
          aria-label="Open the Scenario-Based Scripting Questions guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🧠 Scenario-Based Scripting Questions
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            Cross-table updates, retry logic, BR recursion, async events — with runnable
            simulator traces. Built for senior ServiceNow interview loops.
          </p>
        </Link>
        <Link
          to="/learn/acl-scripting"
          aria-label="Open the ACL Scripting Deep Dive guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🛡️ ACL Scripting Deep Dive
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            The <code>answer</code> variable, <code>gs.hasRole()</code>, table vs field
            evaluation order, and write-time transition guards — with simulator traces.
          </p>
        </Link>
        <Link
          to="/learn/glideajax-interview-questions"
          aria-label="Open the GlideAjax Interview Questions guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            📡 GlideAjax Interview Questions
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            AbstractAjaxProcessor, client-to-server data passing, getXMLAnswer callbacks,
            and performance best practices — with simulator traces.
          </p>
        </Link>
        <Link
          to="/learn/flow-designer-interview-questions"
          aria-label="Open the Flow Designer Interview Questions guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🌊 Flow Designer Interview Questions
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            Subflows vs actions, REST error handling, trigger conditions, and flow vs workflow
            migration decisions — with simulator traces.
          </p>
        </Link>
        <Link
          to="/learn/flow-designer-how-to"
          aria-label="Open the Flow Designer How-To Guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🛠️ Flow Designer How-To
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            Script steps, REST messages, subflows, decision tables, catalog items —
            direct answers to the 10 most-searched Flow Designer questions.
          </p>
        </Link>
        <Link
          to="/learn/discovery-interview-questions"
          aria-label="Open the ServiceNow Discovery Interview Questions guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🛰️ Discovery Interview Questions
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            Horizontal vs top-down discovery, MID Server architecture, classification
            vs identification rules, and CI reconciliation — with simulator traces.
          </p>
        </Link>
        <Link
          to="/servicenow-irm-architect-practice"
          aria-label="Open the ServiceNow IRM Architect practice track"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New track
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            🛡️ ServiceNow IRM Architect Practice
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            GRC tables, inherent vs residual risk scoring, and policy &amp; compliance
            citations — three categories wired for interview prep.
          </p>
        </Link>
        <Link
          to="/learn/irm-architect-interview-questions"
          aria-label="Open the IRM Architect Interview Questions guide"
          style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
          className="dark-glass-option block rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 transition-colors animate-fade-in"
        >
          <div className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            New guide
          </div>
          <div className="font-display text-lg tracking-tight mt-1">
            📚 IRM Architect Interview Questions
          </div>
          <p className="text-xs text-foreground/75 mt-1">
            Common IRM/GRC architect interview loops — risk model design, control
            testing, evidence flows, and integration patterns.
          </p>
        </Link>

        {(() => {
          const today = todayStr();
          const entries = Object.values(progress.srs ?? {})
            .map((e) => ({ ...e, delta: daysBetween(today, e.due) }))
            .filter((e) => e.delta <= 1)
            .sort((a, b) => a.delta - b.delta || a.topic.localeCompare(b.topic));
          if (entries.length === 0) return null;
          return (
            <section className="space-y-2 animate-fade-in" aria-label="Spaced repetition — due soon">
              <h2 className="font-display tracking-wider text-sm uppercase text-foreground/80">
                ⏰ Due for review
              </h2>
              <ul className="rounded-2xl border-2 border-primary/30 bg-primary/5 divide-y divide-border/60 overflow-hidden">
                {entries.slice(0, 6).map((e) => {
                  const t = TOPICS.find((x) => x.id === e.topic);
                  const label =
                    e.delta < 0
                      ? `Overdue ${-e.delta}d`
                      : e.delta === 0
                        ? "Today"
                        : "Tomorrow";
                  const tone =
                    e.delta <= 0
                      ? "text-destructive border-destructive/40 bg-destructive/10"
                      : "text-accent border-accent/40 bg-accent/10";
                  return (
                    <li key={`${e.topic}:${e.sectionIdx}`}>
                      <Link
                        to="/learn/$topic"
                        params={{ topic: e.topic }}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-background/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-display tracking-wide text-foreground/90 truncate">
                            {e.icon && <span aria-hidden className="mr-1">{e.icon}</span>}
                            {e.label}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {t?.emoji} {t?.name ?? e.topic} · interval {e.interval}d
                          </div>
                        </div>
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border shrink-0 ${tone}`}>
                          {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })()}

        {(() => {
          const mastery = progress.termMastery ?? {};
          const review: { topic: TopicId; term: string; short: string }[] = [];
          let masteredCount = 0;
          for (const t of visibleTopics) {
            for (const term of termsFor(t.id)) {
              const s = mastery[`${t.id}::${term.term}`];
              if (s === "mastered") masteredCount++;
              else if (s === "review")
                review.push({ topic: t.id, term: term.term, short: term.short });
            }
          }
          if (review.length === 0 && masteredCount === 0) return null;
          return (
            <section className="space-y-2 animate-fade-in" aria-label="Glossary mastery">
              <h2 className="font-display tracking-wider text-sm uppercase text-foreground/80 flex items-center justify-between gap-2">
                <span>📚 Term mastery</span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  ✓ {masteredCount} mastered · ↻ {review.length} to review
                </span>
              </h2>
              {review.length > 0 && (
                <ul className="rounded-2xl border-2 border-accent/30 bg-accent/5 divide-y divide-border/60 overflow-hidden">
                  {review.slice(0, 8).map((r) => {
                    const t = TOPICS.find((x) => x.id === r.topic);
                    return (
                      <li key={`${r.topic}::${r.term}`}>
                        <Link
                          to="/learn/$topic"
                          params={{ topic: r.topic }}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-background/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-[13px] font-display tracking-wide text-foreground/90 truncate">
                              {r.term}
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground truncate">
                              {t?.emoji} {t?.name} · {r.short}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border border-primary/40 text-primary shrink-0">
                            Review
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                  {review.length > 8 && (
                    <li className="px-4 py-2 text-[10px] font-mono text-muted-foreground text-center">
                      + {review.length - 8} more
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })()}



        <section className="space-y-3">

          {visibleTopics.map((t) => (
            <Link
              key={t.id}
              to="/learn/$topic"
              params={{ topic: t.id }}
              style={{ "--dg-glow": "var(--color-accent)" } as CSSProperties}
              className="dark-glass-option block rounded-2xl border-2 border-border bg-panel overflow-hidden transition-all active:translate-y-0.5"
            >
              <div className="relative aspect-[3/2] bg-zinc-900 overflow-hidden">
                {t.image ? (
                  <img
                    src={t.image}
                    alt={`${t.name} concept illustration`}
                    loading="lazy"
                    width={768}
                    height={512}
                    className="size-full object-cover opacity-80"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="size-full flex items-center justify-center bg-gradient-to-br from-accent/30 via-secondary/10 to-primary/20"
                  >
                    <span className="text-[120px] leading-none opacity-50">{t.emoji}</span>
                  </div>
                )}
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
