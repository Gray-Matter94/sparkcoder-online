import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { TOPICS, termsFor, type TopicId } from "@/lib/glossary";
import { quizFor } from "@/lib/quizzes";
import { useProgress } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";

export const Route = createFileRoute("/learn/$topic")({
  head: ({ params }) => {
    const t = TOPICS.find((x) => x.id === params.topic);
    const name = t?.name ?? "Topic";
    const url = `https://service-spark-coder.lovable.app/learn/${params.topic}`;
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

  const { progress } = useProgress();
  const terms = termsFor(meta.id);
  const quiz = quizFor(meta.id);

  const [mode, setMode] = useState<"learn" | "quiz">("learn");

  return (
    <div className="min-h-screen flex flex-col">
      <StatsBar progress={progress} back />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-20">
        <div className="rounded-2xl overflow-hidden border-2 border-border bg-panel animate-fade-in">
          <div className="relative aspect-[2/1] bg-zinc-900">
            <img
              src={meta.image}
              alt={`${meta.name} illustration`}
              width={768}
              height={384}
              className="size-full object-cover opacity-90"
            />
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

        {mode === "learn" ? <Glossary terms={terms} /> : <Quiz key={meta.id} questions={quiz} />}

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

function Quiz({ questions }: { questions: ReturnType<typeof quizFor> }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [status, setStatus] = useState<QuizStatus>("picking");
  const [score, setScore] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(true);

  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">No quiz questions yet for this topic.</p>;
  }

  if (status === "done") {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center p-6 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-3 animate-fade-in">
        <div className="text-6xl">{pct >= 75 ? "🏆" : pct >= 50 ? "🎯" : "📚"}</div>
        <h2 className="font-display text-3xl tracking-tight">
          {score} / {questions.length}
        </h2>
        <p className="text-sm text-foreground/85">
          {pct >= 75
            ? "Sharp. You'd survive the interview round."
            : pct >= 50
              ? "Solid base — review the glossary and try again."
              : "Hit the glossary, then come back swinging."}
        </p>
        <button
          onClick={() => {
            setIdx(0);
            setPicked(null);
            setStatus("picking");
            setScore(0);
          }}
          className="h-12 px-6 bg-primary text-primary-foreground font-display tracking-wider rounded-xl shadow-[0_4px_0_var(--color-primary-deep)] active:translate-y-1 active:shadow-none"
        >
          REPLAY QUIZ
        </button>
      </div>
    );
  }

  const q = questions[idx];
  const isCorrect = picked === q.correctIndex;

  function submit() {
    if (picked === null) return;
    if (picked === q.correctIndex) setScore((s) => s + 1);
    setStatus("answered");
  }

  function next() {
    if (idx + 1 >= questions.length) {
      setStatus("done");
    } else {
      setIdx((i) => i + 1);
      setPicked(null);
      setStatus("picking");
    }
  }

  const answered = status === "answered" ? idx + 1 : idx;
  const progressPct = Math.round((answered / questions.length) * 100);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="space-y-1.5" aria-label="Quiz progress">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-muted-foreground uppercase tracking-widest">
            Question {idx + 1} / {questions.length}
          </span>
          <span className="text-primary uppercase tracking-widest">
            Score: {score} / {questions.length}
          </span>
        </div>
        <div
          className="h-2 w-full rounded-full bg-panel border border-border overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
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
          className={`p-4 rounded-xl border-2 text-sm space-y-3 ${
            isCorrect
              ? "border-primary/40 bg-primary/5"
              : "border-destructive/40 bg-destructive/5"
          }`}
        >
          <div className="font-display tracking-wide text-foreground/90">
            {isCorrect ? "✓ CORRECT" : "✗ NOT QUITE"}
          </div>

          <p className="text-[13px] leading-relaxed text-foreground/85">{q.explain}</p>

          {q.whyCorrect && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1">
                Why “{q.options[q.correctIndex]}” is right
              </div>
              <p className="text-[13px] leading-relaxed text-foreground/85">{q.whyCorrect}</p>
            </div>
          )}

          {!isCorrect && picked !== null && q.whyWrong?.[picked] && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-destructive font-bold mb-1">
                Why “{q.options[picked]}” misses
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
