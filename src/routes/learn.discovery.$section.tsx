import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import {
  DISCOVERY_SECTIONS,
  findSection,
  type DefinitiveQA,
  type ScenarioQA,
} from "@/lib/discovery-interview";
import {
  generateDiscoveryQuestions,
  type GeneratedDefinitive,
  type GeneratedScenario,
} from "@/lib/discovery-questions.functions";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/learn/discovery/$section")({
  loader: ({ params }) => {
    const section = findSection(params.section);
    if (!section) throw notFound();
    return { section };
  },
  head: ({ loaderData }) => {
    const s = loaderData?.section;
    if (!s) return {};
    const title = `${s.title} — ServiceNow Interview | SparkCoder`;
    const desc = `${s.blurb} Curated Q&A plus AI-expandable scenario drills for ServiceNow interviews.`;
    const url = `https://www.sparkcoder.online/learn/discovery/${s.slug}`;
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        ...s.definitive.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.answer },
        })),
        ...s.scenario.map((q) => ({
          "@type": "Question",
          name: q.scenario,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${q.approach.join(" ")} Alternate: ${q.alternate} Pitfall: ${q.pitfall}`,
          },
        })),
      ],
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(faqLd) }],
    };
  },
  notFoundComponent: SectionNotFound,
  errorComponent: SectionError,
  component: SectionPage,
});

function SectionNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center space-y-4">
      <div>
        <h1 className="font-display text-2xl mb-2">Section not found</h1>
        <Link to="/learn/discovery" className="text-accent underline">
          Back to the Discovery hub
        </Link>
      </div>
    </div>
  );
}

function SectionError({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl mb-2">Something broke</h1>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <Link to="/learn/discovery" className="text-accent underline">
          Back to the Discovery hub
        </Link>
      </div>
    </div>
  );
}

interface ExtraState {
  definitive: DefinitiveQA[];
  scenario: ScenarioQA[];
}

function SectionPage() {
  const { section } = Route.useLoaderData();
  const { progress } = useProgress();
  const generate = useServerFn(generateDiscoveryQuestions);

  const [extra, setExtra] = useState<ExtraState>({ definitive: [], scenario: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const allDefinitive = useMemo(
    () => [...section.definitive, ...extra.definitive],
    [section.definitive, extra.definitive],
  );
  const allScenario = useMemo(
    () => [...section.scenario, ...extra.scenario],
    [section.scenario, extra.scenario],
  );

  async function loadMore() {
    setBusy(true);
    setErr(null);
    try {
      const existingTitles = [
        ...allDefinitive.map((q) => q.question),
        ...allScenario.map((q) => q.title),
      ];
      const result = await generate({
        data: {
          sectionSlug: section.slug,
          existingTitles,
          definitiveCount: 6,
          scenarioCount: 4,
        },
      });
      const stamp = Date.now();
      setExtra((prev) => ({
        definitive: [
          ...prev.definitive,
          ...result.definitive.map((q: GeneratedDefinitive, i) => ({
            id: `gen-d-${stamp}-${i}`,
            question: q.question,
            answer: q.answer,
            alternate: q.alternate,
          })),
        ],
        scenario: [
          ...prev.scenario,
          ...result.scenario.map((q: GeneratedScenario, i) => ({
            id: `gen-s-${stamp}-${i}`,
            title: q.title,
            scenario: q.scenario,
            approach: q.approach,
            code: q.code,
            alternate: q.alternate,
            pitfall: q.pitfall,
          })),
        ],
      }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const total = allDefinitive.length + allScenario.length;

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            <Link to="/learn/discovery" className="underline">
              Discovery hub
            </Link>
            <span>·</span>
            <span>{section.shortTitle}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl leading-[1.05] tracking-tight">
            {section.title}
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">{section.blurb}</p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {total} questions loaded · {allDefinitive.length} definitive ·{" "}
            {allScenario.length} scenario
          </p>
        </header>

        <section aria-labelledby="def-h" className="space-y-3">
          <h2 id="def-h" className="font-display text-xl tracking-tight">
            Definitive questions
          </h2>
          <ul className="space-y-2">
            {allDefinitive.map((q) => (
              <li
                key={q.id}
                className="rounded-xl border-2 border-border bg-panel overflow-hidden"
              >
                <button
                  onClick={() => setOpenId(openId === q.id ? null : q.id)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-accent/5"
                  aria-expanded={openId === q.id}
                >
                  <span className="text-accent font-mono text-xs mt-0.5">
                    {openId === q.id ? "−" : "+"}
                  </span>
                  <span className="text-sm font-medium">{q.question}</span>
                </button>
                {openId === q.id && (
                  <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/60">
                    <p className="text-sm text-foreground/85 leading-relaxed pt-3">
                      {q.answer}
                    </p>
                    {q.alternate && (
                      <p className="text-xs text-foreground/70 italic">
                        <span className="text-accent not-italic font-bold">
                          Alternate:{" "}
                        </span>
                        {q.alternate}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sc-h" className="space-y-4">
          <h2 id="sc-h" className="font-display text-xl tracking-tight">
            Scenario drills
          </h2>
          <ol className="space-y-4">
            {allScenario.map((q) => (
              <li
                key={q.id}
                className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
              >
                <h3 className="font-display text-lg tracking-tight">{q.title}</h3>
                <p className="text-sm italic text-foreground/85">“{q.scenario}”</p>

                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-1">
                    Approach
                  </h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
                    {q.approach.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                {q.code && (
                  <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-3 overflow-x-auto border border-white/10">
                    <code>{q.code}</code>
                  </pre>
                )}

                <div className="rounded-xl border border-accent/30 bg-accent/5 p-3">
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-1">
                    Alternate approach
                  </h4>
                  <p className="text-sm text-foreground/85">{q.alternate}</p>
                </div>

                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <h4 className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mb-1">
                    Pitfall
                  </h4>
                  <p className="text-sm text-foreground/85">{q.pitfall}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 space-y-3">
          <h2 className="font-display text-lg tracking-tight">Grow this section</h2>
          <p className="text-xs text-foreground/80">
            Generate more unique questions on demand — the AI sees the titles
            already on the page and avoids repeats. Repeat until you reach the
            depth you need.
          </p>
          <button
            onClick={loadMore}
            disabled={busy}
            className="h-10 px-4 rounded-xl border-2 border-accent bg-accent text-accent-foreground font-display tracking-wider text-xs uppercase disabled:opacity-60"
          >
            {busy ? "Generating…" : "Generate 10 more questions"}
          </button>
          {err && <p className="text-xs text-destructive">{err}</p>}
        </section>

        <nav className="rounded-2xl border-2 border-border bg-panel p-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
            Jump to another section
          </h2>
          <div className="flex flex-wrap gap-2">
            {DISCOVERY_SECTIONS.filter((s) => s.slug !== section.slug).map((s) => (
              <Link
                key={s.slug}
                to="/learn/discovery/$section"
                params={{ section: s.slug }}
                className="h-9 px-3 inline-flex items-center rounded-lg border border-border bg-background text-xs font-display tracking-wider uppercase hover:border-accent/60"
              >
                {s.shortTitle}
              </Link>
            ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
