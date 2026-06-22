import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TOPICS, termsFor, type TopicId } from "@/lib/glossary";
import { quizFor, sectionsFor, sectionForIndex } from "@/lib/quizzes";
import { useProgress, todayStr, daysBetween } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";

export const Route = createFileRoute("/learn/$topic")({
  head: ({ params }) => {
    const t = TOPICS.find((x) => x.id === params.topic);
    const name = t?.name ?? "Topic";
    const url = `https://sparkcoder.online/learn/${params.topic}`;
    const description = `Illustrated ${name} glossary plus a quick quiz — clear definitions of the ServiceNow concepts interviewers actually ask about.`;
    return {
      meta: [
        { title: `${name} — ServiceNow Glossary & Quiz` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} — ServiceNow Glossary & Quiz` },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: t?.image ?? "" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: TopicPage,
});

function TopicPage() {
  const { topic } = Route.useParams();
  const meta = TOPICS.find((t) => t.id === (topic as TopicId));
  if (!meta) throw notFound();

  const { progress, setTermMastery } = useProgress();
  const terms = termsFor(meta.id);
  const quiz = quizFor(meta.id);


  const [mode, setMode] = useState<"learn" | "quiz">("learn");

  return (
    <div className="min-h-screen flex flex-col">
      <StatsBar progress={progress} back />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-20">
        <div className="rounded-2xl overflow-hidden border-2 border-border bg-panel animate-fade-in">
          <div className="relative aspect-[2/1] bg-zinc-900">
            {meta.image ? (
              <img
                src={meta.image}
                alt={`${meta.name} illustration`}
                width={768}
                height={384}
                className="size-full object-cover opacity-90"
              />
            ) : (
              <div
                aria-hidden
                className="size-full flex items-center justify-center bg-gradient-to-br from-accent/30 via-secondary/10 to-primary/20"
              >
                <span className="text-[140px] leading-none opacity-50">{meta.emoji}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-panel/95 via-panel/30 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
                {meta.tagline}
              </span>
              <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-none mt-1">
                {meta.emoji} {meta.name.toUpperCase()}
              </h1>
            </div>
          </div>
          <p className="p-4 text-sm text-foreground/85 leading-relaxed">{meta.blurb}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sticky top-0 z-30 bg-background/95 backdrop-blur-xl py-2">
          <button
            onClick={() => setMode("learn")}
            className={`h-11 rounded-xl font-display tracking-wider text-sm transition-all ${
              mode === "learn"
                ? "bg-accent text-accent-foreground shadow-[0_4px_0_rgba(0,0,0,0.4)]"
                : "bg-panel border-2 border-border text-foreground/85"
            }`}
          >
            📖 GLOSSARY
          </button>
          <button
            onClick={() => setMode("quiz")}
            className={`h-11 rounded-xl font-display tracking-wider text-sm transition-all ${
              mode === "quiz"
                ? "bg-primary text-primary-foreground shadow-[0_4px_0_var(--color-primary-deep)]"
                : "bg-panel border-2 border-border text-foreground/85"
            }`}
          >
            🎯 QUIZ ({quiz.length})
          </button>
        </div>

        {mode === "learn" ? (
          <Glossary
            terms={terms}
            topicId={meta.id}
            mastery={progress.termMastery ?? {}}
            onSetMastery={setTermMastery}
          />
        ) : (
          <Quiz
            key={meta.id}
            questions={quiz}
            topic={meta.id}
            onOpenGlossary={() => {
              setMode("learn");
              if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}


        <div className="pt-2">
          <Link
            to="/learn"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors"
          >
            ← All topics
          </Link>
        </div>
      </main>
    </div>
  );
}

function Glossary({ terms }: { terms: ReturnType<typeof termsFor> }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="space-y-2.5">
      {terms.map((t) => {
        const isOpen = open === t.term;
        return (
          <li
            key={t.term}
            className="rounded-xl border-2 border-border bg-panel overflow-hidden"
          >
            <button
              onClick={() => setOpen(isOpen ? null : t.term)}
              className="w-full p-3.5 text-left flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-display tracking-wide text-base text-accent">{t.term}</div>
                <div className="text-xs text-foreground/85 mt-0.5">{t.short}</div>
              </div>
              <span
                className={`text-muted-foreground text-lg transition-transform shrink-0 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                ▾
              </span>
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 -mt-1 text-[13px] text-foreground/85 leading-relaxed border-t border-border/60 pt-3">
                {t.long}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type QuizStatus = "picking" | "answered" | "done";

function Quiz({
  questions,
  topic,
  onOpenGlossary,
}: {
  questions: ReturnType<typeof quizFor>;
  topic: TopicId;
  onOpenGlossary?: () => void;
}) {
  const { progress, recordSrs } = useProgress();
  // `order` is the list of question indices to play through.
  // Default = full quiz; switches to a subset when reviewing missed questions.
  const [order, setOrder] = useState<number[]>(() => questions.map((_, i) => i));
  const [reviewMode, setReviewMode] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<QuizStatus>("picking");
  const [score, setScore] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(true);
  /** Map of original question index -> the wrong option the user picked. */
  const [misses, setMisses] = useState<Record<number, number>>({});
  const recordedRunRef = useRef<string | null>(null);

  const allSections =
    questions.length === 0 ? [] : sectionsFor(topic, questions.length);

  // Build per-section stats for the current run (used by Weakest topics + SRS).
  function sectionStats() {
    const playedSet = new Set(order);
    return allSections.map((s, i) => {
      const start = allSections.slice(0, i).reduce((a, x) => a + x.count, 0);
      const end = start + s.count;
      let attempted = 0;
      let missed = 0;
      for (let qi = start; qi < end; qi++) {
        if (!playedSet.has(qi)) continue;
        attempted++;
        if (misses[qi] !== undefined) missed++;
      }
      return { section: s, sectionIdx: i, attempted, missed };
    });
  }

  // Record SRS reviews exactly once per finished run.
  useEffect(() => {
    if (status !== "done") {
      recordedRunRef.current = null;
      return;
    }
    const runId = `${topic}:${reviewMode ? "review" : "full"}:${order.join(",")}`;
    if (recordedRunRef.current === runId) return;
    recordedRunRef.current = runId;
    const reviews = sectionStats()
      .filter((s) => s.attempted > 0)
      .map((s) => ({
        topic,
        sectionIdx: s.sectionIdx,
        label: s.section.label,
        icon: s.section.icon,
        attempted: s.attempted,
        missRate: s.missed / s.attempted,
      }));
    if (reviews.length > 0) recordSrs(reviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, topic, reviewMode, order]);

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No quiz questions yet for this topic.</p>;
  }

  if (status === "done") {
    const pct = Math.round((score / order.length) * 100);
    const missedIndices = Object.keys(misses).map((n) => Number(n));
    // Group missed questions by milestone section.
    const grouped = allSections.map((s, i) => {
      const sectionStart = allSections.slice(0, i).reduce((a, x) => a + x.count, 0);
      const sectionEnd = sectionStart + s.count;
      const items = missedIndices.filter((qi) => qi >= sectionStart && qi < sectionEnd);
      return { section: s, items };
    });
    const hasMisses = missedIndices.length > 0;

    function retryMissed() {
      const next = [...missedIndices].sort((a, b) => a - b);
      setOrder(next);
      setReviewMode(true);
      setMisses({});
      setIdx(0);
      setPicked(null);
      setStatus("picking");
      setScore(0);
    }

    function replayAll() {
      setOrder(questions.map((_, i) => i));
      setReviewMode(false);
      setMisses({});
      setIdx(0);
      setPicked(null);
      setStatus("picking");
      setScore(0);
    }

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="text-center p-6 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-3">
          <div className="text-6xl">{pct >= 75 ? "🏆" : pct >= 50 ? "🎯" : "📚"}</div>
          <h2 className="font-display text-3xl tracking-tight">
            {score} / {order.length}
          </h2>
          <p className="text-sm text-foreground/85">
            {reviewMode
              ? hasMisses
                ? "Still some sticky ones — give them another pass."
                : "Clean sweep on the review. Nicely done."
              : pct >= 75
                ? "Sharp. You'd survive the interview round."
                : pct >= 50
                  ? "Solid base — review the glossary and try again."
                  : "Hit the glossary, then come back swinging."}
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            {hasMisses && (
              <button
                onClick={retryMissed}
                className="h-12 px-5 bg-accent text-accent-foreground font-display tracking-wider rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-none"
              >
                🔁 RETRY MISSED ({missedIndices.length})
              </button>
            )}
            <button
              onClick={replayAll}
              className="h-12 px-5 bg-primary text-primary-foreground font-display tracking-wider rounded-xl shadow-[0_4px_0_var(--color-primary-deep)] active:translate-y-1 active:shadow-none"
            >
              REPLAY FULL QUIZ
            </button>
          </div>
        </div>

        {/* Weakest milestones — per-section miss rate across this run. */}
        {(() => {
          const playedSet = new Set(order);
          const stats = allSections
            .map((s, i) => {
              const start = allSections.slice(0, i).reduce((a, x) => a + x.count, 0);
              const end = start + s.count;
              let attempted = 0;
              let missed = 0;
              for (let qi = start; qi < end; qi++) {
                if (!playedSet.has(qi)) continue;
                attempted++;
                if (misses[qi] !== undefined) missed++;
              }
              return {
                section: s,
                attempted,
                missed,
                rate: attempted > 0 ? missed / attempted : 0,
              };
            })
            .filter((x) => x.attempted > 0 && x.missed > 0)
            .sort((a, b) => b.rate - a.rate || b.missed - a.missed)
            .slice(0, 3);

          if (stats.length === 0) return null;

          const worstRate = stats[0].rate;
          const headline =
            worstRate >= 0.66
              ? "Big gap here — start with the glossary, then re-quiz."
              : worstRate >= 0.34
                ? "A few rough edges to smooth out before the next round."
                : "Mostly solid — knock out these stragglers next.";

          return (
            <section className="space-y-3" aria-label="Weakest milestones">
              <h3 className="font-display tracking-wider text-sm uppercase text-foreground/80">
                Weakest topics — practice next
              </h3>
              <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-4 space-y-3">
                <p className="text-[13px] text-foreground/85 leading-relaxed">{headline}</p>
                <ul className="space-y-2.5">
                  {stats.map((s, i) => {
                    const pctMissed = Math.round(s.rate * 100);
                    const tip =
                      s.rate >= 0.66
                        ? `Re-read the ${s.section.label.toLowerCase()} entries in the glossary, then retry.`
                        : s.rate >= 0.34
                          ? `Skim ${s.section.label.toLowerCase()} terms and run the daily challenge.`
                          : `Quick refresher on ${s.section.label.toLowerCase()} should close the gap.`;
                    return (
                      <li
                        key={i}
                        className="rounded-lg border border-border bg-panel p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase text-accent">
                            {s.section.icon && <span aria-hidden>{s.section.icon}</span>}
                            {s.section.label}
                          </span>
                          <span className="text-[10px] font-mono text-destructive">
                            {s.missed}/{s.attempted} missed · {pctMissed}%
                          </span>
                        </div>
                        <div
                          className="h-1.5 w-full rounded-full bg-background/60 overflow-hidden"
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={pctMissed}
                          aria-label={`${s.section.label} miss rate`}
                        >
                          <div
                            className="h-full bg-destructive/80"
                            style={{ width: `${pctMissed}%` }}
                          />
                        </div>
                        <p className="text-[12px] text-foreground/75 leading-relaxed">{tip}</p>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  {onOpenGlossary && (
                    <button
                      onClick={onOpenGlossary}
                      className="h-10 px-4 bg-accent text-accent-foreground font-display tracking-wider text-xs rounded-lg shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-0.5 active:shadow-none"
                    >
                      📖 OPEN GLOSSARY
                    </button>
                  )}
                  <Link
                    to="/daily"
                    className="h-10 px-4 inline-flex items-center bg-panel border-2 border-border text-foreground/85 font-display tracking-wider text-xs rounded-lg hover:border-accent/40 transition-colors"
                  >
                    🗓️ DAILY CHALLENGE
                  </Link>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Spaced repetition schedule — upcoming reviews for this topic. */}
        {(() => {
          const today = todayStr();
          const topicEntries = Object.values(progress.srs ?? {})
            .filter((e) => e.topic === topic)
            .sort((a, b) => a.due.localeCompare(b.due));
          if (topicEntries.length === 0) return null;

          function dueLabel(due: string): { text: string; tone: "due" | "soon" | "later" } {
            const delta = daysBetween(today, due);
            if (delta <= 0) return { text: delta === 0 ? "Due today" : `Overdue by ${-delta}d`, tone: "due" };
            if (delta === 1) return { text: "Tomorrow", tone: "soon" };
            if (delta <= 3) return { text: `In ${delta} days`, tone: "soon" };
            return { text: `In ${delta} days`, tone: "later" };
          }

          return (
            <section className="space-y-3" aria-label="Spaced repetition schedule">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display tracking-wider text-sm uppercase text-foreground/80">
                  Spaced repetition schedule
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  {TOPICS.find((t) => t.id === topic)?.name ?? topic}
                </span>
              </div>
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[12px] text-foreground/75 leading-relaxed">
                  Misses shorten the interval, clean runs stretch it. Come back when a milestone is due.
                </p>
                <ul className="divide-y divide-border/60">
                  {topicEntries.map((e) => {
                    const { text, tone } = dueLabel(e.due);
                    const toneClass =
                      tone === "due"
                        ? "text-destructive border-destructive/40 bg-destructive/10"
                        : tone === "soon"
                          ? "text-accent border-accent/40 bg-accent/10"
                          : "text-muted-foreground border-border bg-panel";
                    return (
                      <li
                        key={`${e.topic}:${e.sectionIdx}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-display tracking-wide text-foreground/90 truncate">
                            {e.icon && <span aria-hidden className="mr-1">{e.icon}</span>}
                            {e.label}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            interval {e.interval}d · ease {e.ease.toFixed(2)} · {e.reviews} review{e.reviews === 1 ? "" : "s"}
                            {e.lapses > 0 ? ` · ${e.lapses} lapse${e.lapses === 1 ? "" : "s"}` : ""}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-md border shrink-0 ${toneClass}`}
                        >
                          {text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })()}



        {hasMisses && (
          <section className="space-y-3" aria-label="Missed questions by milestone">
            <h3 className="font-display tracking-wider text-sm uppercase text-foreground/80">
              Review missed — by milestone
            </h3>
            {grouped.map(({ section, items }, gi) =>
              items.length === 0 ? null : (
                <div
                  key={gi}
                  className="rounded-xl border-2 border-border bg-panel overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3.5 py-2 bg-accent/5 border-b border-border">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-display tracking-wider uppercase text-accent">
                      {section.icon && <span aria-hidden>{section.icon}</span>}
                      {section.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {items.length} missed
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {items.map((qi) => {
                      const mq = questions[qi];
                      const wrongIdx = misses[qi];
                      return (
                        <li key={qi} className="p-3.5 text-[13px] space-y-1.5">
                          <div className="font-medium text-foreground/90 leading-snug">
                            {mq.question}
                          </div>
                          <div className="text-destructive line-through">
                            ✗ {mq.options[wrongIdx]}
                          </div>
                          <div className="text-primary">
                            ✓ {mq.options[mq.correctIndex]}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </section>
        )}
      </div>
    );
  }

  const currentQIndex = order[idx];
  const q = questions[currentQIndex];
  const isCorrect = picked === q.correctIndex;

  function submit() {
    if (picked === null) return;
    if (picked === q.correctIndex) {
      setScore((s) => s + 1);
    } else {
      setMisses((m) => ({ ...m, [currentQIndex]: picked }));
    }
    setStatus("answered");
  }

  function next() {
    if (idx + 1 >= order.length) {
      setStatus("done");
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      setStatus("picking");
    }
  }

  const answered = status === "answered" ? idx + 1 : idx;
  const progressPct = Math.round((answered / order.length) * 100);

  // Milestone reflects the original question's section even in review mode.
  const current = sectionForIndex(allSections, currentQIndex);

  return (
    <div className="space-y-4 animate-fade-in">
      {reviewMode && (
        <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-accent/40 bg-accent/5 px-3 py-2">
          <span className="text-[11px] font-display tracking-wider uppercase text-accent">
            🔁 Review mode · missed questions
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {order.length} to retry
          </span>
        </div>
      )}

      <div className="space-y-2" aria-label="Quiz progress">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted-foreground uppercase tracking-widest">
            Question {idx + 1} / {order.length}
          </span>
          <span className="text-primary uppercase tracking-widest">
            Score: {score} / {order.length}
          </span>
        </div>

        {current && (
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent/10 border border-accent/30 text-accent font-display tracking-wider uppercase">
              {current.section.icon && <span aria-hidden>{current.section.icon}</span>}
              <span>{current.section.label}</span>
            </span>
            <span className="text-muted-foreground font-mono">
              Milestone {current.sectionIdx + 1}/{allSections.length}
            </span>
          </div>
        )}

        <div
          className="relative h-2 w-full rounded-full bg-panel border border-border overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          aria-valuetext={current ? `${current.section.label}, question ${idx + 1} of ${order.length}` : undefined}
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
          {!reviewMode &&
            allSections.slice(0, -1).map((_, i) => {
              const cumulative = allSections.slice(0, i + 1).reduce((s, x) => s + x.count, 0);
              const left = (cumulative / questions.length) * 100;
              return (
                <span
                  key={i}
                  aria-hidden
                  className="absolute top-0 bottom-0 w-px bg-background/80"
                  style={{ left: `${left}%` }}
                />
              );
            })}
        </div>

        {!reviewMode && (
          <div className="flex gap-1" aria-hidden>
            {allSections.map((s, i) => {
              const state =
                i < (current?.sectionIdx ?? 0)
                  ? "done"
                  : i === current?.sectionIdx
                    ? "active"
                    : "upcoming";
              return (
                <div
                  key={i}
                  title={s.label}
                  className={`flex-1 text-[9px] font-display tracking-wider uppercase text-center py-0.5 rounded-sm truncate ${
                    state === "done"
                      ? "text-primary/70"
                      : state === "active"
                        ? "text-accent"
                        : "text-muted-foreground"
                  }`}
                  style={{ flexGrow: s.count }}
                >
                  {s.icon} {s.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <h2 className="text-base sm:text-lg font-bold leading-snug">{q.question}</h2>

      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const selected = picked === i;
          const showState = status === "answered";
          const correctOne = showState && i === q.correctIndex;
          const wrongPick = showState && selected && i !== q.correctIndex;
          return (
            <button
              key={i}
              disabled={status === "answered"}
              onClick={() => setPicked(i)}
              className={`w-full p-3.5 rounded-xl border-2 text-left text-sm transition-all flex items-center gap-3 ${
                correctOne
                  ? "border-primary bg-primary/10 text-primary"
                  : wrongPick
                    ? "border-destructive bg-destructive/10 text-destructive line-through"
                    : selected
                      ? "border-accent bg-accent/5 text-accent"
                      : "border-border bg-panel text-foreground/90 hover:border-accent/40"
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {correctOne && <span>✓</span>}
              {wrongPick && <span>✗</span>}
            </button>
          );
        })}
      </div>

      {status === "answered" && (
        <div
          className={`rounded-xl border-2 text-sm overflow-hidden ${
            isCorrect
              ? "border-primary/40 bg-primary/5"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            className="w-full p-4 flex items-center justify-between gap-3 text-left"
          >
            <div className="font-display tracking-wide text-foreground/90">
              {isCorrect ? "✓ CORRECT" : "✗ NOT QUITE"}
            </div>
            <span
              className={`text-muted-foreground text-lg transition-transform shrink-0 ${
                detailsOpen ? "rotate-180" : ""
              }`}
            >
              ▾
            </span>
          </button>

          {detailsOpen && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[13px] leading-relaxed text-foreground/85">{q.explain}</p>

              {q.whyCorrect && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
                    Why "{q.options[q.correctIndex]}" is right
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground/85">{q.whyCorrect}</p>
                </div>
              )}

              {!isCorrect && picked !== null && q.whyWrong?.[picked] && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-destructive font-bold mb-1">
                    Why "{q.options[picked]}" misses
                  </div>
                  <p className="text-[13px] leading-relaxed text-foreground/85">{q.whyWrong[picked]}</p>
                </div>
              )}

              {q.learnMore && q.learnMore.length > 0 && (
                <div className="rounded-lg border border-border bg-panel/60 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-accent font-bold mb-1.5">
                    Go deeper
                  </div>
                  <ul className="space-y-1.5 text-[13px] leading-relaxed text-foreground/85 list-disc pl-4 marker:text-accent">
                    {q.learnMore.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {status === "picking" ? (
        <button
          onClick={submit}
          disabled={picked === null}
          className="w-full h-12 bg-primary text-primary-foreground font-display tracking-wider rounded-xl shadow-[0_4px_0_var(--color-primary-deep)] active:translate-y-1 active:shadow-none disabled:opacity-40"
        >
          SUBMIT ANSWER
        </button>
      ) : (
        <button
          onClick={next}
          className="w-full h-12 bg-accent text-accent-foreground font-display tracking-wider rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-none"
        >
          {idx + 1 >= questions.length ? "SEE SCORE →" : "NEXT QUESTION →"}
        </button>
      )}
    </div>
  );
}
