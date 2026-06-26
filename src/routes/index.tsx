import { createFileRoute, Link } from "@tanstack/react-router";
import { CATEGORIES, QUESTIONS, categoriesForTrack } from "@/lib/questions";
import { useProgress, todayStr } from "@/lib/progress";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BadgesPanel } from "@/components/BadgesPanel";
import { DifficultyCard } from "@/components/DifficultyCard";
import { TrackSwitcher } from "@/components/TrackSwitcher";
import { getCurrentTier } from "@/lib/difficulty";
import { getDailyChallenge } from "@/lib/daily";
import { trackMeta } from "@/lib/tracks";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SparkCoder — ServiceNow Scripting Interview Practice" },
      {
        name: "description",
        content:
          "Practice ServiceNow scripting interview questions on the go. Interactive code puzzles, colorful simulator output, instant teaching when you slip.",
      },
      { property: "og:title", content: "SparkCoder — ServiceNow Scripting Interview Practice" },
      {
        property: "og:description",
        content:
          "Arcade-style ServiceNow scripting puzzles with a live instance simulator and built-in coach.",
      },
      { property: "og:url", content: "https://www.sparkcoder.online/" },
    ],
    links: [
      { rel: "canonical", href: "https://www.sparkcoder.online/" },
      // Preload the display font stylesheet so the LCP H1 paints with Anton ASAP.
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Anton&display=swap",
        // @ts-expect-error - valid HTML attribute
        fetchpriority: "high",
      },
    ],
  }),

  component: Home,
});

function Home() {
  const { progress, reset, track } = useProgress();
  const tier = getCurrentTier(progress);
  const trackCategories = categoriesForTrack(track);
  const trackCategoryIds = new Set(trackCategories.map((c) => c.id));
  const trackQuestions = QUESTIONS.filter((q) => trackCategoryIds.has(q.category));
  const unlockedQuestions = trackQuestions.filter((q) => q.level <= tier.maxLevel);
  const total = unlockedQuestions.length;
  const solved = unlockedQuestions.filter((q) => progress.solved[q.id]).length;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const daily = getDailyChallenge(track);
  const dailyMeta = CATEGORIES.find((c) => c.id === daily.category)!;
  const dailyDone = !!progress.dailyChallenges[todayStr()];
  const meta = trackMeta(track);
  const accentText =
    meta.accent === "primary" ? "text-primary" : meta.accent === "accent" ? "text-accent" : "text-secondary";

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} /></ErrorBoundary>
      <div className="h-1.5 w-full bg-border">
        <div
          className="h-full bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <TrackSwitcher />

        <section className="space-y-3 animate-fade-in">
          <span className={`text-[10px] uppercase tracking-[0.25em] font-bold ${accentText}`}>
            {meta.emoji} {meta.name}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            <span className="sr-only">ServiceNow Scripting Interview Practice — </span>
            <span aria-hidden="true">
              SCRIPT YOUR
              <br />
              WAY <span className={accentText}>IN.</span>
            </span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
            {meta.tagline} Bite-size puzzles, a live simulator, and a coach that explains every miss.
          </p>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat label="XP" value={progress.xp.toLocaleString()} accent="primary" />
          <Stat label="Streak" value={`${progress.streak}d`} accent="accent" />
          <Stat label="Solved" value={`${solved}/${total}`} accent="secondary" />
        </section>


        <Link
          to="/daily"
          className={`block p-4 rounded-2xl border-2 transition-all active:translate-y-0.5 relative overflow-hidden ${
            dailyDone
              ? "border-primary/50 bg-primary/5"
              : "border-accent bg-accent/5 hover:border-accent shadow-[0_0_24px_rgba(245,158,11,0.15)]"
          }`}
        >
          <div className="absolute -top-6 -right-6 text-7xl opacity-10">📅</div>
          <div className="flex items-center gap-3 relative">
            <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
              {dailyDone ? "✅" : "🔥"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className={`font-display text-lg tracking-wide ${dailyDone ? "text-primary" : "text-accent"}`}>
                  DAILY CHALLENGE
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {dailyDone ? "DONE" : "+50 XP"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {dailyMeta.emoji} {dailyMeta.name} · {daily.title}
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/learn"
          className="block p-4 rounded-2xl border-2 border-secondary/50 bg-secondary/5 hover:border-secondary transition-all active:translate-y-0.5 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 text-7xl opacity-10">📚</div>
          <div className="flex items-center gap-3 relative">
            <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
              🧠
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg tracking-wide text-secondary">
                  LEARN & QUIZ
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono">GLOSSARY + QUIZ</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                ServiceNow glossary + topic quizzes with illustrations.
              </p>
            </div>
          </div>
        </Link>

        <Link
          to="/play"
          className="block p-4 rounded-2xl border-2 border-accent/50 bg-accent/5 hover:border-accent transition-all active:translate-y-0.5 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 text-7xl opacity-10">🎮</div>
          <div className="flex items-center gap-3 relative">
            <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg tracking-wide text-accent">
                  GLIDE API MATCH
                </h2>
                <span className="text-[10px] text-muted-foreground font-mono">MINI-GAME</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                Speed-match Glide APIs to their descriptions. Beat the clock.
              </p>
            </div>
          </div>
        </Link>

        <DifficultyCard progress={progress} />


        <BadgesPanel progress={progress} />

        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">
            Choose a module
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {trackCategories.map((c) => {
              const allQs = QUESTIONS.filter((q) => q.category === c.id);
              const qs = allQs.filter((q) => q.level <= tier.maxLevel);
              const locked = allQs.length - qs.length;
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
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {done}/{full}
                        {locked > 0 && (
                          <span className="text-muted-foreground ml-1">· 🔒{locked}</span>
                        )}
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
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset all progress
          </button>
        </section>
      </main>
      <footer className="py-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
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
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
