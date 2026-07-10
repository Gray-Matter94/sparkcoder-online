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
import { trackMeta, type TrackId } from "@/lib/tracks";
import { TopWeeklyBlogs } from "@/components/TopWeeklyBlogs";

type CardAccent = "primary" | "accent" | "secondary" | "amber" | "destructive";

interface TrackCard {
  title: string;
  blurb: string;
  tag: string;
  icon: string;
  bgEmoji: string;
  accent: CardAccent;
  to: string;
  params?: Record<string, string>;
}

const CARD_ACCENTS: Record<CardAccent, { wrap: string; text: string }> = {
  primary: {
    wrap: "border-primary/50 bg-primary/5 hover:border-primary",
    text: "text-primary",
  },
  accent: {
    wrap: "border-accent/50 bg-accent/5 hover:border-accent",
    text: "text-accent",
  },
  secondary: {
    wrap: "border-secondary/50 bg-secondary/5 hover:border-secondary",
    text: "text-secondary",
  },
  amber: {
    wrap: "border-amber-500/60 bg-amber-500/5 hover:border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.12)]",
    text: "text-amber-300",
  },
  destructive: {
    wrap: "border-destructive/50 bg-destructive/5 hover:border-destructive",
    text: "text-destructive",
  },
};

const TRACK_CARDS: Record<TrackId, TrackCard[]> = {
  "servicenow-dev": [
    { title: "LEARN & QUIZ", blurb: "ServiceNow glossary + topic quizzes with illustrations.", tag: "GLOSSARY + QUIZ", icon: "🧠", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "GLIDE API MATCH", blurb: "Speed-match Glide APIs to their descriptions. Beat the clock.", tag: "MINI-GAME", icon: "⚡", bgEmoji: "🎮", accent: "accent", to: "/play" },
    { title: "20-DAY CURRICULUM", blurb: "Day-by-day ServiceNow scripting plan. Goals, drills, takeaways.", tag: "4 WEEKS", icon: "📅", bgEmoji: "📝", accent: "primary", to: "/blog" },
    { title: "LIVE CODING SIMULATOR", blurb: "Instance-style editor · AI points at the exact line to fix.", tag: "500 TASKS", icon: "🤖", bgEmoji: "💻", accent: "amber", to: "/live-coding" },
  ],
  "servicenow-admin": [
    { title: "ADMIN GLOSSARY & QUIZ", blurb: "ACLs, UI policies, catalogs, update sets — with quick quizzes.", tag: "GLOSSARY + QUIZ", icon: "🛡️", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "CSA INTERVIEW Q&A 2026", blurb: "Curated Certified System Administrator questions with answers.", tag: "CSA PREP", icon: "🎓", bgEmoji: "❓", accent: "accent", to: "/servicenow-csa-interview-questions-2026" },
    { title: "ACL SCRIPTING DEEP-DIVE", blurb: "How ACLs evaluate, the four gates, and the scripts that unlock them.", tag: "GUIDE", icon: "🔐", bgEmoji: "🛡️", accent: "primary", to: "/learn/acl-scripting" },
    { title: "SCENARIO-BASED SCRIPTING", blurb: "Real admin scenarios: catalog logic, workflow gaps, data policies.", tag: "SCENARIOS", icon: "🧩", bgEmoji: "🧠", accent: "amber", to: "/learn/scenario-based-scripting" },
  ],
  "servicenow-irm": [
    { title: "IRM GLOSSARY & QUIZ", blurb: "GRC, CORT, risk register, control attestation — illustrated.", tag: "GLOSSARY + QUIZ", icon: "🛡️", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "IRM ARCHITECT PRACTICE", blurb: "End-to-end IRM architecture drills: policies, risks, controls.", tag: "ARCHITECT TRACK", icon: "🏛️", bgEmoji: "🛡️", accent: "primary", to: "/servicenow-irm-architect-practice" },
    { title: "IRM INTERVIEW Q&A", blurb: "Panel-style questions with sample answers and pitfalls.", tag: "INTERVIEW", icon: "🎯", bgEmoji: "❓", accent: "accent", to: "/learn/irm-architect-interview-questions" },
    { title: "GRC TABLES REFERENCE", blurb: "Policy, control, risk, issue — the tables you must know cold.", tag: "REFERENCE", icon: "🗂️", bgEmoji: "🗃️", accent: "amber", to: "/practice/$category", params: { category: "grc-tables" } },
  ],
  "java-dev": [
    { title: "JAVA GLOSSARY & QUIZ", blurb: "Collections, concurrency, JVM internals — bite-size definitions.", tag: "GLOSSARY + QUIZ", icon: "☕", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "STREAMS & LAMBDAS DRILL", blurb: "Practice functional pipelines and collector patterns.", tag: "CORE JAVA", icon: "🧵", bgEmoji: "⚡", accent: "primary", to: "/practice/$category", params: { category: "streams" } },
    { title: "CONCURRENCY PUZZLES", blurb: "Threads, executors, locks, and the CAS primitives interviewers grill.", tag: "MULTITHREAD", icon: "🧠", bgEmoji: "🔀", accent: "accent", to: "/practice/$category", params: { category: "concurrency" } },
  ],
  "angular-dev": [
    { title: "ANGULARJS GLOSSARY & QUIZ", blurb: "Scopes, directives, services, digest cycle — with quick quizzes.", tag: "GLOSSARY + QUIZ", icon: "🅰️", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "ANGULARJS CODING TEST", blurb: "Timed coding round: directives, filters, controllers.", tag: "TIMED TEST", icon: "⏱️", bgEmoji: "💻", accent: "destructive", to: "/angularjs-coding-test" },
    { title: "DIRECTIVES DRILL", blurb: "Build isolate-scope directives and compile-vs-link intuitions.", tag: "CORE ANGULAR", icon: "🧩", bgEmoji: "🅰️", accent: "primary", to: "/practice/$category", params: { category: "ng-directives" } },
  ],
};


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
      // Preload the Anton latin woff2 so the LCP H1 paints ASAP (font-display: swap in CSS).
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm3Kz-C8.woff2",
        crossOrigin: "anonymous",
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
            {meta.heading[0]}
            <br />
            {meta.heading[1].split(" ").slice(0, -1).join(" ")}{" "}
            <span className={accentText}>
              {meta.heading[1].split(" ").slice(-1)[0]}
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


        <section aria-labelledby="learning-modules-heading" className="space-y-3">
          <h2 id="learning-modules-heading" className="sr-only">
            Learning modules for {meta.name}
          </h2>
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
                  <h3 className={`font-display text-lg tracking-wide ${dailyDone ? "text-primary" : "text-accent"}`}>
                    {meta.short.toUpperCase()} DAILY CHALLENGE
                  </h3>
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

          {TRACK_CARDS[track].map((card) => {
            const accentClasses = CARD_ACCENTS[card.accent];
            return (
              <Link
                key={card.title}
                to={card.to}
                {...(card.params ? { params: card.params } : {})}
                className={`block p-4 rounded-2xl border-2 transition-all active:translate-y-0.5 relative overflow-hidden ${accentClasses.wrap}`}
              >
                <div className="absolute -top-6 -right-6 text-7xl opacity-10">{card.bgEmoji}</div>
                <div className="flex items-center gap-3 relative">
                  <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-display text-lg tracking-wide ${accentClasses.text}`}>
                        {card.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground font-mono">{card.tag}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{card.blurb}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>



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
                  params={{ category: c.id }} search={{ difficulty: undefined }}
                  className={`group p-4 rounded-2xl border-2 border-border bg-panel transition-all flex items-center gap-4 ${ringColor} active:translate-y-0.5`}
                >
                  <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className={`font-display text-lg tracking-wide ${textColor}`}>
                        {c.name.toUpperCase()}
                      </h2>
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

        <TopWeeklyBlogs />

        <section className="pt-2 flex items-center justify-between gap-3">
          <Link
            to="/feedback"
            className="text-[10px] uppercase tracking-widest font-bold text-accent hover:text-accent/80"
          >
            📝 Report an issue / feedback
          </Link>
          <button
            onClick={reset}
            aria-label="Reset all progress, XP, and streaks"
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
          >
            Reset all progress
          </button>
        </section>
      </main>
      <nav
        aria-label="Explore tracks"
        className="max-w-md mx-auto px-4 pb-4 flex flex-wrap gap-2 justify-center text-[11px]"
      >
        <Link to="/servicenow-irm-architect-practice" className="underline text-muted-foreground hover:text-accent">
          IRM Architect Track
        </Link>
        <Link to="/practice/$category" params={{ category: "grc-tables" }} search={{ difficulty: undefined }} className="underline text-muted-foreground hover:text-accent">
          GRC Tables
        </Link>
        <Link to="/practice/$category" params={{ category: "risk-scoring" }} search={{ difficulty: undefined }} className="underline text-muted-foreground hover:text-accent">
          Risk Scoring
        </Link>
        <Link to="/practice/$category" params={{ category: "policy-compliance" }} search={{ difficulty: undefined }} className="underline text-muted-foreground hover:text-accent">
          Policy &amp; Compliance
        </Link>
        <Link to="/learn/irm-architect-interview-questions" className="underline text-muted-foreground hover:text-accent">
          IRM Interview Q&amp;A
        </Link>
      </nav>
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
