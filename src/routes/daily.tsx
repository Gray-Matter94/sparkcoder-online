import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useProgress, todayStr } from "@/lib/progress";
import { getDailyChallenge } from "@/lib/daily";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { CodeBlock } from "@/components/CodeBlock";
import { Simulator } from "@/components/Simulator";
import { TeachCard } from "@/components/TeachCard";
import type { Option, SimulatorOutput } from "@/lib/questions";
import { CATEGORIES } from "@/lib/questions";
import { getCurrentTier } from "@/lib/difficulty";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Challenge — SparkCoder" },
      {
        name: "description",
        content:
          "Today's ServiceNow scripting challenge. Solve it to extend your streak and lock in a daily reward.",
      },
      { property: "og:title", content: "Daily Challenge — SparkCoder" },
      {
        property: "og:description",
        content:
          "One curated ServiceNow scripting puzzle a day. Bonus XP, streak protection, and an instant teach-back if you miss.",
      },
      { property: "og:url", content: "https://sparkcoder.online/daily" },
    ],
    links: [{ rel: "canonical", href: "https://sparkcoder.online/daily" }],
  }),
  component: Daily,
});

type Status = "picking" | "running" | "wrong" | "right";

function Daily() {
  const navigate = useNavigate();
  const { progress, award, markDailyChallenge, track } = useProgress();
  const q = useMemo(() => getDailyChallenge(track), [track]);
  const today = todayStr();
  const alreadyDone = !!progress.dailyChallenges[today];

  const meta = CATEGORIES.find((c) => c.id === q.category)!;

  const [picked, setPicked] = useState<Option | null>(null);
  const [status, setStatus] = useState<Status>("picking");
  const [simOutput, setSimOutput] = useState<SimulatorOutput | null>(null);
  const [wrongAttempts, setWrongAttempts] = useState<string[]>([]);

  function handleRun() {
    if (!picked) return;
    setStatus("running");
    setSimOutput(picked.correct ? q.correctSim : picked.feedback.sim);
    const dur = (picked.correct ? q.correctSim : picked.feedback.sim).logs.length * 280 + 400;
    setTimeout(() => {
      if (picked.correct) {
        const tier = getCurrentTier(progress);
        const xp = Math.round(Math.max(20, 50 - wrongAttempts.length * 10) * tier.xpMultiplier);
        award(q.id, xp);
        markDailyChallenge(q.id);
        setStatus("right");
      } else {
        setWrongAttempts((w) => [...w, picked.id]);
        setStatus("wrong");
      }
    }, Math.min(dur, 1800));
  }

  const slotState: "empty" | "filled" | "wrong" | "right" =
    status === "wrong" ? "wrong" : status === "right" ? "right" : picked ? "filled" : "empty";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-[460px]">
        <div className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
              Daily Challenge · {today}
            </span>
          </div>
          <h1 className="font-display text-3xl tracking-tight leading-[1]">
            TODAY'S <span className="text-accent">PUZZLE.</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            {meta.emoji} {meta.name} · Level {q.level} · {alreadyDone ? "✅ Already locked in" : "Worth bonus XP + streak"}
          </p>
        </div>

        <h2 className="text-base sm:text-lg font-bold leading-tight">{q.title}</h2>

        <CodeBlock
          filename={q.filename}
          lines={q.code}
          slotContent={picked?.text ?? null}
          slotState={slotState}
        />

        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">
            Choose the right block
          </h3>
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
                      ? "border-accent bg-accent/5"
                      : wasWrong
                        ? "border-destructive/30 bg-destructive/5 opacity-50 line-through"
                        : "border-border bg-panel hover:border-accent/40"
                  } ${disabled ? "cursor-not-allowed" : ""}`}
                >
                  <code className={`text-xs sm:text-sm font-mono ${isPicked ? "text-accent" : "text-foreground/90"}`}>
                    {o.text}
                  </code>
                  <div
                    className={`size-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      isPicked ? "border-accent" : "border-zinc-600"
                    }`}
                  >
                    {isPicked && <div className="size-2 bg-accent rounded-full" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

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
              title={status === "right" ? q.correctTeach.title : picked!.feedback.title}
              explain={status === "right" ? q.correctTeach.explain : picked!.feedback.explain}
              onContinue={() => {
                if (status === "right") navigate({ to: "/" });
                else {
                  setPicked(null);
                  setStatus("picking");
                  setSimOutput(null);
                }
              }}
              continueLabel={status === "right" ? "BACK TO ARCADE" : "TRY AGAIN"}
            />
          </div>
        )}

        {status !== "wrong" && status !== "right" && (
          <div className="p-3 bg-background/95 backdrop-blur-xl border-t border-border flex gap-3">
            <button
              onClick={handleRun}
              disabled={!picked || status === "running"}
              className="flex-1 h-14 bg-accent text-accent-foreground font-display text-lg rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.4)] active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed tracking-wider"
            >
              {status === "running" ? "RUNNING…" : "▶ RUN DAILY"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
