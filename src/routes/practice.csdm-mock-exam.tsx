import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState , useRef} from "react";
import { StatsBar } from "@/components/StatsBar";
import { EditorialNote } from "@/components/EditorialNote";
import { useProgress } from "@/lib/progress";
import {
  CSDM_EXAM_LENGTH,
  CSDM_EXAM_MINUTES,
  CSDM_EXAM_POOL,
  CSDM_PASS_PERCENT,
  drawCsdmExam,
} from "@/lib/content/csdm-mock-exam";
import type { ExamQuestion } from "@/lib/content/csa-mock-exam";
import { createTechArticleSchema, SITE_URL } from "@/lib/editorial";

const TITLE = "ServiceNow CSDM Practice Exam — Free Timed Mock Test";
const DESCRIPTION = `Free ServiceNow CSDM practice exam: ${CSDM_EXAM_LENGTH} timed multiple-choice questions in ${CSDM_EXAM_MINUTES} minutes, scored by domain with explanations.`;
const URL = `${SITE_URL}/practice/csdm-mock-exam`;

export const Route = createFileRoute("/practice/csdm-mock-exam")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          createTechArticleSchema({
            headline: TITLE,
            description: DESCRIPTION,
            url: URL,
            datePublished: "2026-10-10",
            dateModified: "2026-10-10",
            about: "ServiceNow Common Service Data Model (CSDM) preparation",
            audienceType: "ServiceNow CMDB and platform architects",
          }),
        ),
      },
    ],
  }),
  component: CsdmMockExam,
});

type Phase = "intro" | "running" | "done";

function CsdmMockExam() {
  const { progress, recordExam } = useProgress();
  const recorded = useRef(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [exam, setExam] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(CSDM_EXAM_MINUTES * 60);

  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setPhase("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  const start = () => {
    setExam(drawCsdmExam());
    setAnswers({});
    setIndex(0);
    setSecondsLeft(CSDM_EXAM_MINUTES * 60);
    recorded.current = false;
    setPhase("running");
  };

  const result = useMemo(() => {
    const byDomain: Record<string, { right: number; total: number }> = {};
    let right = 0;
    for (const item of exam) {
      const d = (byDomain[item.domain] ??= { right: 0, total: 0 });
      d.total++;
      if (answers[item.id] === item.correctIndex) {
        d.right++;
        right++;
      }
    }
    const percent = exam.length ? Math.round((right / exam.length) * 100) : 0;
    return { right, percent, byDomain };
  }, [answers, exam]);

  useEffect(() => {
    if (phase !== "done" || recorded.current || exam.length === 0) return;
    recorded.current = true;
    recordExam("csdm", result.right, result.percent, result.percent >= CSDM_PASS_PERCENT);
  }, [phase, exam.length, result, recordExam]);

  const current = exam[index];
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const answered = Object.keys(answers).length;

  return (
    <div className="min-h-screen">
      <StatsBar progress={progress} back />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {phase === "intro" && (
          <>
            <header className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                Free practice exam
              </span>
              <h1 className="font-display text-4xl leading-[0.95] tracking-tight">
                SERVICENOW CSDM <span className="text-accent">PRACTICE EXAM</span>
              </h1>
              <p className="text-sm leading-relaxed text-foreground/85">
                A timed mock test for the ServiceNow Common Service Data Model (CSDM):{" "}
                {CSDM_EXAM_LENGTH} multiple-choice questions in {CSDM_EXAM_MINUTES} minutes, drawn in random order
                . You get a score by domain and an
                explanation for every question at the end. This is an unofficial practice test,
                not the real exam.
              </p>
            </header>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>✓ Covers Foundation, technical, business and Sell/Consume domains, governance and CMDB adoption</li>
              <li>✓ Pass mark shown at {CSDM_PASS_PERCENT}% as a practice target</li>
              <li>✓ No signup needed — retake for a fresh question order</li>
            </ul>
            <button
              onClick={start}
              className="min-h-12 w-full rounded-2xl border-2 border-primary bg-primary px-5 font-display text-lg tracking-wide text-primary-foreground"
            >
              START THE {CSDM_EXAM_MINUTES}-MINUTE EXAM →
            </button>
            <p className="text-xs text-muted-foreground">
              Want model answers first? Read the{" "}
              <Link to="/learn/csdm-interview-questions" className="text-accent underline">
                CSDM interview questions guide
              </Link>
              .
            </p>
            <EditorialNote updated="October 10, 2026" />
          </>
        )}

        {phase === "running" && current && (
          <section aria-live="polite" className="space-y-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>
                Question {index + 1} / {exam.length} · {answered} answered
              </span>
              <span className={secondsLeft < 300 ? "text-destructive" : "text-accent"}>
                ⏱ {mm}:{ss}
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{current.domain}</p>
            <h2 className="text-lg font-semibold">{current.question}</h2>
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const picked = answers[current.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [current.id]: i }))}
                    aria-pressed={picked}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm ${
                      picked ? "border-primary bg-primary/15" : "border-border bg-card/60"
                    }`}
                  >
                    {picked ? "● " : "○ "}
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="h-10 flex-1 rounded-xl border-2 border-border text-sm font-bold disabled:opacity-40"
              >
                ← Back
              </button>
              {index < exam.length - 1 ? (
                <button
                  onClick={() => setIndex((i) => i + 1)}
                  className="h-10 flex-1 rounded-xl border-2 border-accent text-sm font-bold text-accent"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => setPhase("done")}
                  className="h-10 flex-1 rounded-xl border-2 border-primary bg-primary text-sm font-bold text-primary-foreground"
                >
                  Finish exam
                </button>
              )}
            </div>
          </section>
        )}

        {phase === "done" && (
          <section className="space-y-5">
            <h1 className="font-display text-3xl">
              {result.percent >= CSDM_PASS_PERCENT ? "✓ PASS" : "✕ KEEP PRACTISING"} · {result.percent}%
            </h1>
            <p className="text-sm">
              {result.right} of {exam.length} correct. Practice target: {CSDM_PASS_PERCENT}%.
            </p>
            <ul className="space-y-1 text-sm">
              {Object.entries(result.byDomain).map(([d, s]) => (
                <li key={d} className="flex justify-between border-b border-border py-1">
                  <span>{d}</span>
                  <span className="font-bold">
                    {s.right}/{s.total}
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={start}
              className="h-11 w-full rounded-xl border-2 border-primary bg-primary font-bold text-primary-foreground"
            >
              Retake with a new order
            </button>
            <h2 className="font-display text-xl text-accent">Review</h2>
            <ol className="space-y-3">
              {exam.map((item, i) => {
                const ok = answers[item.id] === item.correctIndex;
                return (
                  <li key={item.id} className="rounded-xl border border-border bg-card/60 p-3 text-sm">
                    <p className="font-semibold">
                      {ok ? "✓" : "✕"} {i + 1}. {item.question}
                    </p>
                    <p className="text-xs">Answer: {item.options[item.correctIndex]}</p>
                    <p className="text-xs text-muted-foreground">{item.explain}</p>
                  </li>
                );
              })}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
