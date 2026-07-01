import { createFileRoute, useNavigate, notFound } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { CATEGORIES, questionsFor, type Category, type Option, type SimulatorOutput } from "@/lib/questions";
import { useProgress } from "@/lib/progress";
import { getCurrentTier, getNextTier } from "@/lib/difficulty";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CodeBlock } from "@/components/CodeBlock";
import { Simulator } from "@/components/Simulator";
import { TeachCard } from "@/components/TeachCard";
import { DIFFICULTIES, matchesDifficulty, getHintForQuestion, type Difficulty } from "@/lib/hints";

const DIFFICULTY_STORAGE_KEY = "snscript_difficulty_v1";
function readStoredDifficulty(): Difficulty {
  if (typeof window === "undefined") return "medium";
  const v = window.localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return v === "easy" || v === "medium" || v === "hard" ? v : "medium";
}
function parseDifficulty(v: unknown): Difficulty | undefined {
  return v === "easy" || v === "medium" || v === "hard" ? v : undefined;
}

export const Route = createFileRoute("/practice/$category")({
  head: ({ params }) => {
    const cat = CATEGORIES.find((c) => c.id === params.category);
    const name = cat?.name ?? "Practice";
    const url = `https://www.sparkcoder.online/practice/${params.category}`;
    const description = `Solve interactive ${name} puzzles from real ServiceNow scripting interviews. Pick the right block, run it, and get coached the moment you miss.`;
    return {
      meta: [
        { title: `${name} Puzzles — SparkCoder` },
        { name: "description", content: description },
        { property: "og:title", content: `${name} Puzzles — SparkCoder` },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: `${name} Puzzles`,
            description,
            url,
            isPartOf: {
              "@type": "WebSite",
              name: "SparkCoder",
              url: "https://www.sparkcoder.online",
            },
            about: { "@type": "Thing", name: `ServiceNow ${name}` },
          }),
        },
      ],
    };
  },
  component: Practice,
  validateSearch: (search: Record<string, unknown>) => ({
    difficulty: parseDifficulty(search.difficulty),
  }),
});

type Status = "picking" | "running" | "wrong" | "right" | "done";

function Practice() {
  const { category } = Route.useParams();
  const navigate = useNavigate();
  const meta = CATEGORIES.find((c) => c.id === (category as Category));
  if (!meta) throw notFound();

  const { progress, award } = useProgress();
  const tier = useMemo(() => getCurrentTier(progress), [progress]);
  const nextTier = useMemo(() => getNextTier(progress), [progress]);
  const allQuestions = useMemo(() => questionsFor(category as Category), [category]);
  const tierAllowed = useMemo(
    () => allQuestions.filter((q) => q.level <= tier.maxLevel),
    [allQuestions, tier.maxLevel]
  );
  const search = Route.useSearch();
  const [difficulty, setDifficultyState] = useState<Difficulty>(
    () => search.difficulty ?? readStoredDifficulty()
  );
  // Sync URL → state when the search param changes (e.g., shared link, back/forward).
  useEffect(() => {
    if (search.difficulty && search.difficulty !== difficulty) {
      setDifficultyState(search.difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.difficulty]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
    }
  }, [difficulty]);
  // Ensure the URL reflects the active difficulty so links are shareable.
  useEffect(() => {
    if (search.difficulty !== difficulty) {
      navigate({
        to: "/practice/$category",
        params: { category },
        search: { difficulty },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, category]);
  const setDifficulty = (d: Difficulty) => setDifficultyState(d);

  const questions = useMemo(() => {
    const filtered = tierAllowed.filter((q) => matchesDifficulty(q.level, difficulty));
    return filtered.length > 0 ? filtered : tierAllowed;
  }, [tierAllowed, difficulty]);
  const lockedCount = allQuestions.length - tierAllowed.length;
  const noneAtDifficulty =
    tierAllowed.filter((q) => matchesDifficulty(q.level, difficulty)).length === 0;

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<Option | null>(null);
  const [status, setStatus] = useState<Status>("picking");
  const [simOutput, setSimOutput] = useState<SimulatorOutput | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState<string[]>([]);
  const [hintOpen, setHintOpen] = useState(false);

  // Reset on category or difficulty change
  useEffect(() => {
    setIndex(0);
    resetQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, difficulty]);

  function resetQuestion() {
    setPicked(null);
    setStatus("picking");
    setSimOutput(null);
    setWrongAttempts([]);
    setHintOpen(false);
  }


  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>
        <div className="flex-1 grid place-items-center p-8 text-center">
          <p className="text-muted-foreground text-sm">No puzzles in this module yet.</p>
        </div>
      </div>
    );
  }

  if (status === "done" || index >= questions.length) {
    return <Completed cat={meta.name} onRestart={() => { setIndex(0); resetQuestion(); }}
      onHome={() => navigate({ to: "/" })} />;
  }

  const q = questions[index];
  const progressPct = ((index + (status === "right" ? 1 : 0)) / questions.length) * 100;

  function handleRun() {
    if (!picked) return;
    setStatus("running");
    setSimOutput(picked.correct ? q.correctSim : picked.feedback.sim);
    // Wait for sim animation to finish before showing teach card
    const dur = (picked.correct ? q.correctSim : picked.feedback.sim).logs.length * 280 + 400;
    setTimeout(() => {
      if (picked.correct) {
        const baseXp = 30;
        const raw = Math.max(10, baseXp - wrongAttempts.length * 10);
        const xp = Math.round(raw * tier.xpMultiplier);
        award(q.id, xp);
        setStatus("right");
      } else {
        setWrongAttempts((w) => [...w, picked.id]);
        setStatus("wrong");
      }
    }, Math.min(dur, 1800));
  }

  function handleContinue() {
    if (status === "right") {
      const next = index + 1;
      if (next >= questions.length) {
        setStatus("done");
      } else {
        setIndex(next);
        resetQuestion();
      }
    } else {
      // wrong → try again, keep wrong list to discourage same answer
      setPicked(null);
      setStatus("picking");
      setSimOutput(null);
    }
  }

  const slotState: "empty" | "filled" | "wrong" | "right" =
    status === "wrong" ? "wrong" : status === "right" ? "right" : picked ? "filled" : "empty";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>
      <div className="h-1.5 w-full bg-border">
        <div
          className="h-full bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-[460px]">
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-widest text-primary font-bold truncate">
              {meta.name} · Lv {q.level}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
              <span className="px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/30 text-accent">
                {tier.emoji} {tier.name} · ×{tier.xpMultiplier.toFixed(2)}
              </span>
              <span className="text-muted-foreground">{index + 1}/{questions.length}</span>
            </div>
          </div>
          <h1 className="text-lg sm:text-xl font-bold leading-tight text-balance">{q.title}</h1>
          {lockedCount > 0 && (
            <p className="text-[10px] text-muted-foreground font-mono">
              🔒 {lockedCount} harder puzzle{lockedCount === 1 ? "" : "s"} locked
              {nextTier ? ` — reach ${nextTier.emoji} ${nextTier.name} to unlock` : ""}.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">
              Difficulty
            </h2>
            {noneAtDifficulty && (
              <span className="text-[10px] text-accent font-mono">
                No {difficulty} puzzles here — showing all.
              </span>
            )}
          </div>
          <div role="radiogroup" aria-label="Puzzle difficulty" className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => {
              const active = d.id === difficulty;
              return (
                <button
                  key={d.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDifficulty(d.id)}
                  className={`px-2 py-2 rounded-xl border-2 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-panel hover:border-primary/40"
                  }`}
                  title={d.blurb}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <span>{d.emoji}</span>
                    <span className={active ? "text-primary" : "text-foreground"}>{d.label}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                    {d.blurb}
                  </div>
                </button>
              );
            })}
          </div>
        </div>


        <CodeBlock
          filename={q.filename}
          lines={q.code}
          slotContent={picked?.text ?? null}
          slotState={slotState}
        />

        <div className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">
            Choose the right block
          </h2>
          <div className="grid grid-cols-1 gap-2.5">
            {q.options.map((o) => {
              const isPicked = picked?.id === o.id;
              const wasWrong = wrongAttempts.includes(o.id);
              const disabled = status === "running" || status === "right";
              return (
                <button
                  key={o.id}
                  disabled={disabled || wasWrong}
                  onClick={() => setPicked(o)}
                  className={`p-3.5 rounded-xl border-2 text-left flex items-center justify-between gap-3 transition-all ${
                    isPicked
                      ? "border-primary bg-primary/5"
                      : wasWrong
                        ? "border-destructive/30 bg-destructive/5 opacity-50 line-through"
                        : "border-border bg-panel hover:border-primary/40"
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <code className={`text-xs sm:text-sm font-mono ${isPicked ? "text-primary" : "text-foreground/90"}`}>
                    {o.text}
                  </code>
                  <div
                    className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isPicked ? "border-primary" : "border-zinc-600"
                    }`}
                  >
                    {isPicked && <div className="size-2 bg-primary rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Fixed bottom dock: simulator + run + teach */}
      <div className="fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto">
        <div className="mx-3 mb-2 animate-slide-up">
          <Simulator
            output={simOutput}
            status={status === "running" ? "running" : "idle"}
            resultTone={status === "right" ? "ok" : status === "wrong" ? "bad" : null}
          />
        </div>

        {(status === "wrong" || status === "right") && (
          <div className="mx-3 mb-2">
            <TeachCard
              tone={status === "right" ? "ok" : "bad"}
              title={
                status === "right" ? q.correctTeach.title : picked!.feedback.title
              }
              explain={
                status === "right" ? q.correctTeach.explain : picked!.feedback.explain
              }
              onContinue={handleContinue}
              continueLabel={
                status === "right"
                  ? index + 1 >= questions.length
                    ? "FINISH MODULE"
                    : "NEXT PUZZLE →"
                  : "TRY AGAIN"
              }
            />
          </div>
        )}

        {status !== "wrong" && status !== "right" && (
          <>
            {hintOpen && (
              <div className="mx-3 mb-2 rounded-xl border-2 border-accent/40 bg-accent/5 p-3 animate-fade-in">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
                    💡 Hint · {difficulty}
                  </span>
                  <button
                    onClick={() => setHintOpen(false)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss hint"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-foreground/90 leading-snug font-mono">
                  {getHintForQuestion(q, difficulty)}
                </p>
              </div>
            )}
            <div className="p-3 bg-background/95 backdrop-blur-xl border-t border-border flex gap-3">
              <button
                onClick={() => setHintOpen((v) => !v)}
                disabled={status === "running"}
                className="h-14 px-4 bg-panel border-2 border-border text-foreground font-display text-sm rounded-2xl tracking-wider disabled:opacity-40"
                aria-expanded={hintOpen}
                aria-label={`Toggle ${difficulty} hint`}
              >
                💡 HINT
              </button>
              <button
                onClick={handleRun}
                disabled={!picked || status === "running"}
                className="flex-1 h-14 bg-primary text-primary-foreground font-display text-lg rounded-2xl shadow-[0_8px_0_var(--color-primary-deep)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed tracking-wider"
              >
                {status === "running" ? "RUNNING…" : "▶ RUN SCRIPT"}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function Completed({ cat, onRestart, onHome }: { cat: string; onRestart: () => void; onHome: () => void }) {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="text-7xl mb-4 animate-pop">🏆</div>
        <h1 className="font-display text-4xl tracking-tight text-primary mb-2">MODULE CLEARED</h1>
        <p className="text-muted-foreground text-sm mb-8">
          You crushed every puzzle in <span className="text-foreground font-bold">{cat}</span>.
          Streak protected for today.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="h-14 bg-primary text-primary-foreground font-display text-base rounded-2xl shadow-[0_6px_0_var(--color-primary-deep)] active:translate-y-1 active:shadow-none tracking-wider"
          >
            REPLAY MODULE
          </button>
          <button
            onClick={onHome}
            className="h-14 bg-panel border border-border font-display text-base rounded-2xl tracking-wider"
          >
            BACK TO ARCADE
          </button>
        </div>
      </main>
    </div>
  );
}
