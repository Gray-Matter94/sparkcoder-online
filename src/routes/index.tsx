import { createFileRoute, Link } from "@tanstack/react-router";
import { CATEGORIES, QUESTIONS } from "@/lib/questions";
import { useProgress, todayStr } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";
import { BadgesPanel } from "@/components/BadgesPanel";
import { getDailyChallenge } from "@/lib/daily";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ScriptArcade — ServiceNow Scripting Interview Practice" },
      {
        name: "description",
        content:
          "Practice ServiceNow scripting interview questions on the go. Interactive code puzzles, colorful simulator output, instant teaching when you slip.",
      },
      { property: "og:title", content: "ScriptArcade — ServiceNow Scripting Practice" },
      {
        property: "og:description",
        content:
          "Arcade-style ServiceNow scripting puzzles with a live instance simulator and built-in coach.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { progress, reset } = useProgress();
  const total = QUESTIONS.length;
  const solved = Object.keys(progress.solved).length;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const daily = getDailyChallenge();
  const dailyMeta = CATEGORIES.find((c) => c.id === daily.category)!;
  const dailyDone = !!progress.dailyChallenges[todayStr()];

  return (
    <div className="min-h-screen flex flex-col">
      <StatsBar progress={progress} />
      <div className="h-1.5 w-full bg-border">
        <div
          className="h-full bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <section className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
            Interview Arcade
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SCRIPT YOUR
            <br />
            WAY <span className="text-primary">IN.</span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            Bite-size ServiceNow scripting puzzles. Tap a block, run the script, watch the
            instance simulator react. Get it wrong? The system teaches you why — in detail.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat label="XP" value={progress.xp.toLocaleString()} accent="primary" />
          <Stat label="Streak" value={`${progress.streak}d`} accent="accent" />
          <Stat label="Solved" value={`${solved}/${total}`} accent="secondary" />
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">
            Choose a module
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {CATEGORIES.map((c) => {
              const qs = QUESTIONS.filter((q) => q.category === c.id);
              const done = qs.filter((q) => progress.solved[q.id]).length;
              const full = qs.length;
              const ringColor =
                c.color === "primary"
                  ? "hover:border-primary/60"
                  : c.color === "accent"
                    ? "hover:border-accent/60"
                    : "hover:border-secondary/60";
              const textColor =
                c.color === "primary"
                  ? "text-primary"
                  : c.color === "accent"
                    ? "text-accent"
                    : "text-secondary";
              return (
                <Link
                  key={c.id}
                  to="/practice/$category"
                  params={{ category: c.id }}
                  className={`group p-4 rounded-2xl border-2 border-border bg-panel transition-all flex items-center gap-4 ${ringColor} active:translate-y-0.5`}
                >
                  <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-display text-lg tracking-wide ${textColor}`}>
                        {c.name.toUpperCase()}
                      </h3>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {done}/{full}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.blurb}</p>
                    <div className="mt-2 h-1 w-full bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          c.color === "primary"
                            ? "bg-primary"
                            : c.color === "accent"
                              ? "bg-accent"
                              : "bg-secondary"
                        } transition-all`}
                        style={{ width: full ? `${(done / full) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="pt-2">
          <button
            onClick={reset}
            className="text-[10px] uppercase tracking-widest text-zinc-600 hover:text-destructive transition-colors"
          >
            Reset all progress
          </button>
        </section>
      </main>
      <footer className="py-6 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
        Built for thumb-driving on the train.
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  const color =
    accent === "primary"
      ? "text-primary"
      : accent === "accent"
        ? "text-accent"
        : "text-secondary";
  return (
    <div className="rounded-2xl bg-panel border border-border p-4 text-center">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{label}</div>
    </div>
  );
}
