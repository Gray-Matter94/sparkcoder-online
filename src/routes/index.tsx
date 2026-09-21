import { useMemo, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CATEGORIES, categoriesForTrack, type Category } from "@/lib/questions";
import {
  LIVE_CODING_TASK_TOTAL,
  allPuzzlesFor,
  puzzleCountsForCategory,
  puzzleCountsForTrack,
} from "@/lib/task-counts";
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
import { levelDifficulty, type Difficulty } from "@/lib/hints";

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

interface LearningStep {
  title: string;
  blurb: string;
  icon: string;
  to: string;
  params?: Record<string, string>;
}

const INTERVIEW_PATHS: Partial<Record<TrackId, string>> = {
  "servicenow-dev": "/servicenow-interview-questions-and-answers",
  "servicenow-admin": "/servicenow-csa-interview-questions-2026",
  "servicenow-irm": "/learn/irm-architect-interview-questions",
};

const LIVE_PATHS: Partial<Record<TrackId, { to: string; label: string }>> = {
  "servicenow-dev": { to: "/live-coding", label: "Write and run scripts in the instance-style simulator." },
  "angular-dev": { to: "/angularjs-coding-test", label: "Apply the concepts in a timed AngularJS coding round." },
};

const ACCENT_GLOW: Record<CardAccent, string> = {
  primary: "var(--color-primary)",
  accent: "var(--color-accent)",
  secondary: "var(--color-secondary)",
  amber: "#f59e0b",
  destructive: "var(--color-destructive)",
};

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
    { title: "INTERVIEW Q&A HUB", blurb: "ServiceNow interview questions and answers, grouped by role.", tag: "ALL ROLES", icon: "🎯", bgEmoji: "❓", accent: "accent", to: "/servicenow-interview-questions-and-answers" },
    { title: "LEARN & QUIZ", blurb: "ServiceNow glossary + topic quizzes with illustrations.", tag: "GLOSSARY + QUIZ", icon: "🧠", bgEmoji: "📚", accent: "secondary", to: "/learn" },
    { title: "GLIDE API MATCH", blurb: "Speed-match Glide APIs to their descriptions. Beat the clock.", tag: "MINI-GAME", icon: "⚡", bgEmoji: "🎮", accent: "accent", to: "/play" },
    { title: "20-DAY CURRICULUM", blurb: "Day-by-day ServiceNow scripting plan. Goals, drills, takeaways.", tag: "4 WEEKS", icon: "📅", bgEmoji: "📝", accent: "primary", to: "/blog" },
    { title: "LIVE CODING SIMULATOR", blurb: "Instance-style editor · AI points at the exact line to fix.", tag: `${LIVE_CODING_TASK_TOTAL} CODING TASKS`, icon: "🤖", bgEmoji: "💻", accent: "amber", to: "/live-coding" },
  ],
  "servicenow-admin": [
    { title: "INTERVIEW Q&A HUB", blurb: "ServiceNow interview questions and answers, grouped by role.", tag: "ALL ROLES", icon: "🎯", bgEmoji: "❓", accent: "accent", to: "/servicenow-interview-questions-and-answers" },
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

const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "What is SparkCoder?",
    a: "SparkCoder is a free practice app for ServiceNow scripting interviews. You solve code puzzles, run scripts in a simulated instance, and get instant teaching when an answer is wrong.",
  },
  {
    q: "Which learning tracks are available?",
    a: "Tracks cover ServiceNow developer scripting, ServiceNow admin and IRM, Java and AngularJS, each with its own curated modules, quizzes and challenges.",
  },
  {
    q: "Is SparkCoder free to use?",
    a: "Yes. All practice puzzles, the live coding simulator and the interview question guides are free, and progress is saved on your device.",
  },
  {
    q: "Does SparkCoder help with ServiceNow interview preparation?",
    a: "Yes. It includes interview question guides for ITSM, CMDB, Discovery, CSM, HRSD, IntegrationHub, Flow Designer and IRM, plus scenario-based scripting drills with model answers.",
  },
];




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
      { property: "og:type", content: "website" },
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
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "SparkCoder",
          url: "https://www.sparkcoder.online/",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any (web browser)",
          description:
            "Arcade-style ServiceNow scripting interview practice with a live instance simulator, line-by-line corrections and mistake analytics.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: {
            "@type": "Organization",
            name: "SparkCoder",
            url: "https://www.sparkcoder.online",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: HOME_FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),

        }),
      },
    ],
  }),


  component: Home,
});

function Home() {
  const { progress, reset, track } = useProgress();
  const tier = getCurrentTier(progress);
  const trackCategories = categoriesForTrack(track);
  // Guided-puzzle counts for this track, from the same data /practice uses.
  const counts = useMemo(
    () => puzzleCountsForTrack(track, tier.maxLevel, progress.solved),
    [track, tier.maxLevel, progress.solved],
  );
  const total = counts.unlocked;
  const solved = counts.solvedUnique;
  const pct = total ? Math.round((solved / total) * 100) : 0;
  const daily = getDailyChallenge(track);
  const dailyMeta = CATEGORIES.find((c) => c.id === daily.category)!;
  const dailyDone = !!progress.dailyChallenges[todayStr()];
  const meta = trackMeta(track);
  const accentText =
    meta.accent === "primary" ? "text-primary" : meta.accent === "accent" ? "text-accent" : "text-secondary";

  const start = useMemo(() => {
    const available = trackCategories.flatMap((category) =>
      allPuzzlesFor(category.id)
        .filter((question) => question.level <= tier.maxLevel)
        .map((question) => ({ question, category })),
    );
    if (available.length === 0) return null;

    const solvedIds = Object.keys(progress.solved).filter((id) => progress.solved[id]).reverse();
    const recentIndex = solvedIds
      .map((id) => available.findIndex(({ question }) => question.id === id))
      .find((index) => index >= 0);

    if (recentIndex === undefined) {
      const beginner = available.find(({ question }) => question.level === 1) ?? available[0];
      return { ...beginner, returning: false };
    }

    const recent = available[recentIndex];
    const sameModule = available.filter(({ category }) => category.id === recent.category.id);
    const withinModule = sameModule.findIndex(({ question }) => question.id === recent.question.id);
    const following = sameModule.slice(withinModule + 1).find(({ question }) => !progress.solved[question.id]);
    const firstUnsolved = sameModule.find(({ question }) => !progress.solved[question.id]);
    return { ...(following ?? firstUnsolved ?? recent), returning: true };
  }, [progress.solved, tier.maxLevel, trackCategories]);

  const learningSteps = useMemo(() => {
    const firstCategory = trackCategories[0];
    const steps: LearningStep[] = [
      { title: "Learn the concepts", blurb: `Build the foundations for ${meta.short} with concise guides and quizzes.`, icon: "01", to: "/learn" },
    ];
    if (firstCategory) {
      steps.push({ title: "Guided puzzles", blurb: `Practise with hints and instant explanations across ${trackCategories.length} modules.`, icon: "02", to: "/practice/$category", params: { category: firstCategory.id } });
    }
    const live = LIVE_PATHS[track];
    if (live) steps.push({ title: "Live coding", blurb: live.label, icon: "03", to: live.to });
    const interview = INTERVIEW_PATHS[track];
    if (interview) steps.push({ title: "Interview preparation", blurb: "Review role-focused questions, scenarios, and answer patterns.", icon: String(steps.length + 1).padStart(2, "0"), to: interview });
    return steps;
  }, [meta.short, track, trackCategories]);

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats"><StatsBar progress={progress} compact /></ErrorBoundary>
      <div className="h-1.5 w-full bg-border">
        <div
          className="h-full bg-primary shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-8 space-y-8">
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
          {start && (
            <div className="pt-2 space-y-2">
              <Link
                to="/practice/$category"
                params={{ category: start.category.id }}
                search={{ difficulty: levelDifficulty(start.question.level), challenge: start.question.id }}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border-2 border-primary bg-primary px-5 py-3 text-primary-foreground shadow-[0_7px_0_var(--color-primary-deep),0_0_26px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] transition-all active:translate-y-1 active:shadow-none"
              >
                <span>
                  <span className="block font-display text-lg tracking-wide">
                    {start.returning ? "CONTINUE PRACTISING" : "START YOUR FIRST CHALLENGE"}
                  </span>
                  <span className="block text-[10px] font-bold opacity-80">
                    {start.category.emoji} {start.category.name} · {start.question.title}
                  </span>
                </span>
                <span aria-hidden className="text-xl">→</span>
              </Link>
              <a
                href="#learning-paths"
                className="flex h-10 items-center justify-center gap-2 text-xs font-bold text-accent underline decoration-accent/50 underline-offset-4 hover:text-accent/80"
              >
                Explore learning paths <span aria-hidden>↓</span>
              </a>
            </div>
          )}
        </section>

        <section id="learning-paths" aria-labelledby="learning-paths-heading" className="scroll-mt-20 space-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-accent font-bold">Your route</span>
            <h2 id="learning-paths-heading" className="font-display text-2xl tracking-wide">LEARNING PATH</h2>
          </div>
          <ol className="space-y-2">
            {learningSteps.map((step, index) => (
              <li key={step.title} className="relative">
                {index < learningSteps.length - 1 && <span aria-hidden className="absolute left-5 top-11 h-5 w-px bg-border" />}
                <Link
                  to={step.to}
                  {...(step.params ? { params: step.params } : {})}
                  {...(step.params ? { search: { difficulty: undefined, challenge: undefined } } : {})}
                  className="dark-glass-option floating-glass flex items-center gap-4 rounded-2xl border-2 border-border bg-panel p-3 transition-colors hover:border-primary/60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 font-display text-sm text-primary">{step.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base tracking-wide">{step.title.toUpperCase()}</span>
                    <span className="block text-[11px] leading-snug text-muted-foreground">{step.blurb}</span>
                  </span>
                  <span aria-hidden className="text-muted-foreground">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Stat label="XP" value={progress.xp.toLocaleString()} accent="primary" />
          <Stat label="Streak" value={`${progress.streak}d`} accent="accent" />
          <Stat label="Puzzles solved" value={`${solved}/${total}`} accent="secondary" />
        </section>


        <section aria-labelledby="learning-modules-heading" className="space-y-3">
          <h2 id="learning-modules-heading" className="sr-only">
            More activities for {meta.name}
          </h2>
          <Link
            to="/daily"
            style={{ "--dg-glow": dailyDone ? "var(--color-primary)" : "var(--color-accent)" } as CSSProperties}
            className={`dark-glass-option floating-glass block p-4 rounded-2xl border-2 transition-all active:translate-y-0.5 relative overflow-hidden ${
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
                style={{ "--dg-glow": ACCENT_GLOW[card.accent] } as CSSProperties}
                className={`dark-glass-option floating-glass block p-4 rounded-2xl border-2 transition-all active:translate-y-0.5 relative overflow-hidden ${accentClasses.wrap}`}
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
            Choose a module · solved / unlocked puzzles
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {trackCategories.map((c) => {
              const n = puzzleCountsForCategory(c.id, tier.maxLevel, progress.solved);
              const locked = n.locked;
              const done = n.solvedUnique;
              const full = n.unlocked;
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
                  style={{ "--dg-glow": `var(--color-${c.color})` } as CSSProperties}
                  className={`dark-glass-option floating-glass group p-4 rounded-2xl border-2 border-border bg-panel transition-all flex items-center gap-4 ${ringColor} active:translate-y-0.5`}
                >
                  <div className="size-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl shrink-0">
                    {c.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className={`font-display text-lg tracking-wide ${textColor}`}>
                        {c.name.toUpperCase()}
                      </h2>
                      <span
                        className="text-[10px] text-muted-foreground font-mono"
                        title={`${done} solved of ${full} unlocked puzzles${locked > 0 ? ` · ${locked} locked` : ""}`}
                      >
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

        <section aria-labelledby="why-sparkcoder-heading" className="space-y-3">
          <h2
            id="why-sparkcoder-heading"
            className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1"
          >
            Why practice ServiceNow scripting with SparkCoder
          </h2>
          <div className="liquid-glass rounded-2xl p-5 space-y-3 text-xs text-foreground/80 leading-relaxed">
            <p>
              SparkCoder is a free ServiceNow scripting interview practice app. Instead of reading
              static question lists, you solve bite-size code puzzles covering GlideRecord queries,
              GlideAjax, Script Includes, business rules, client scripts and ACL scripting — the
              exact topics ServiceNow developer and admin interviews test.
            </p>
            <p>
              Every answer runs in a simulated ServiceNow instance that shows colorful,
              simulator-style output. When a script fails, the built-in coach points at the exact
              line, explains the cause, and offers an editable fix you can apply and re-run.
              Mistake analytics track which API patterns you keep missing so you can drill them
              before the real interview.
            </p>
            <p>
              Beyond puzzles, the site includes role-scoped interview question guides for ITSM,
              CMDB, Discovery, CSM, HRSD, IntegrationHub, Flow Designer, Service Portal and IRM,
              a ServiceNow glossary, how-to guides with copy-ready code, and free tools like the
              encoded query builder. Progress, XP and streaks are saved on your device — no signup
              required.
            </p>
          </div>
        </section>

        <section aria-labelledby="how-it-works-heading" className="space-y-3">
          <h2
            id="how-it-works-heading"
            className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1"
          >
            How SparkCoder works
          </h2>
          <ol className="liquid-glass rounded-2xl p-5 space-y-3 text-xs text-foreground/80 leading-relaxed list-decimal list-inside">
            <li>
              <span className="font-display text-sm tracking-wide text-foreground">Pick a track.</span>{" "}
              Choose the role you are interviewing for — ServiceNow developer, ITSM admin, CMDB and
              Discovery, CSM, HRSD, IntegrationHub or IRM architect. Each track loads its own
              modules and question bank instead of one generic list.
            </li>
            <li>
              <span className="font-display text-sm tracking-wide text-foreground">Solve a puzzle.</span>{" "}
              Every module opens a short scripting task: fix a GlideRecord query, return the right
              value from a Script Include, correct a client script that reads a reference field, or
              tighten an ACL script. You write real ServiceNow server- or client-side JavaScript.
            </li>
            <li>
              <span className="font-display text-sm tracking-wide text-foreground">Run it and read the output.</span>{" "}
              The simulator executes your script and shows the query, the records it touched and the
              result. Any valid approach that produces the correct result passes — there is no single
              hard-coded answer to guess.
            </li>
            <li>
              <span className="font-display text-sm tracking-wide text-foreground">Fix what failed.</span>{" "}
              Failing runs are mapped back to the exact code line with a plain-language cause, a
              suggested patch you can edit and re-run, and alternative ways to solve the same task.
            </li>
            <li>
              <span className="font-display text-sm tracking-wide text-foreground">Review and repeat.</span>{" "}
              XP, streaks and mistake analytics show which APIs keep tripping you up, so your next
              session drills the weak spots rather than what you already know.
            </li>
          </ol>
          <p className="text-xs text-foreground/70 leading-relaxed px-1">
            Prefer reading first? Start with the{" "}
            <Link to="/servicenow-interview-questions-and-answers" className="underline text-accent">
              ServiceNow interview questions and answers hub
            </Link>
            , then come back and practise the scripting equivalents here.
          </p>
        </section>


        <section aria-labelledby="home-faq-heading" className="space-y-3">
          <h2
            id="home-faq-heading"
            className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1"
          >
            Frequently asked questions
          </h2>
          <dl className="space-y-3">
            {HOME_FAQ.map((f) => (
              <div key={f.q} className="liquid-glass rounded-2xl p-4">
                <dt className="font-display text-base tracking-wide">{f.q}</dt>
                <dd className="mt-1.5 text-xs text-foreground/80 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
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
    <div className="liquid-glass rounded-2xl p-4 text-center">
      <div className={`font-display text-2xl ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
