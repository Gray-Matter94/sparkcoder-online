import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { EASY, MEDIUM, HARD, EXPERT, POOL, type Pair } from "./play.data";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Glide API Match — SparkCoder Mini-Game" },
      {
        name: "description",
        content:
          "Mini-game with 300+ ServiceNow Glide API challenges across 50 levels of escalating difficulty. Beat the clock, minimise misses, climb the levels.",
      },
      { property: "og:title", content: "Glide API Match — SparkCoder Mini-Game" },
      {
        property: "og:description",
        content:
          "Speed-match ServiceNow Glide APIs with their descriptions across 50 levels of progressively harder challenges.",
      },
      { property: "og:url", content: "https://sparkcoder.online/play" },
    ],
    links: [{ rel: "canonical", href: "https://sparkcoder.online/play" }],
  }),
  component: PlayPage,
});

// ---------- Level model ----------
const MAX_LEVEL = 50;
const STORAGE_BEST = "sparkcoder.play.glide-match.best"; // legacy single-round best
const STORAGE_LEVEL = "sparkcoder.play.glide-match.level";
const STORAGE_TOTAL = "sparkcoder.play.glide-match.totalScore";

type CardKind = "api" | "desc";
type Card = { id: string; kind: CardKind; key: number; text: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Round size scales with level: 4 (L1) up to 12 (L50)
function roundSizeFor(level: number): number {
  if (level <= 3) return 4;
  if (level <= 6) return 5;
  if (level <= 10) return 6;
  if (level <= 16) return 7;
  if (level <= 24) return 8;
  if (level <= 34) return 9;
  if (level <= 42) return 10;
  if (level <= 48) return 11;
  return 12;
}

// Tier distribution shifts toward expert as level climbs
function poolFor(level: number): Pair[] {
  if (level <= 4) return EASY;
  if (level <= 9) return [...EASY, ...MEDIUM];
  if (level <= 18) return [...MEDIUM, ...HARD];
  if (level <= 30) return [...HARD, ...EXPERT];
  if (level <= 42) return [...EXPERT, ...HARD];
  return POOL; // anything from the whole bank
}

function pickRound(level: number): Card[] {
  const pool = poolFor(level);
  const size = Math.min(roundSizeFor(level), pool.length);
  const picks = shuffle(pool).slice(0, size);
  const cards: Card[] = [];
  picks.forEach((p, i) => {
    cards.push({ id: `a-${i}`, kind: "api", key: i, text: p.api });
    cards.push({ id: `d-${i}`, kind: "desc", key: i, text: p.desc });
  });
  return shuffle(cards);
}

// ---------- Funny / motivating congrats ----------
type Verdict = {
  title: string;
  blurb: string;
  emoji: string;
  rank: "S" | "A" | "B" | "C" | "D";
};

function verdictFor(level: number, timeMs: number, misses: number, size: number): Verdict {
  const perPair = timeMs / Math.max(size, 1);
  // Tiered thresholds — get tighter as round size grows
  const fast = perPair < 2500;
  const ok = perPair < 4500;
  const clean = misses === 0;
  const tidy = misses <= Math.ceil(size / 3);

  if (fast && clean) {
    return {
      rank: "S",
      emoji: "🚀",
      title: pick([
        "FLAWLESS VICTORY",
        "GLIDE WIZARD MODE",
        "ACL CAN'T STOP YOU",
      ]),
      blurb: pick([
        `Cleared level ${level} without a single miss. Are you sure you're not a Script Include?`,
        `Zero misses, sub-${(perPair / 1000).toFixed(1)}s per pair. Knowledge Article writers fear you.`,
        `${size} pairs, ${misses} misses. Even ITIL is impressed.`,
      ]),
    };
  }
  if (fast && tidy) {
    return {
      rank: "A",
      emoji: "⚡",
      title: pick(["BLAZING RUN", "QUERY SPEED RECORD", "GLIDE GROOVE"]),
      blurb: pick([
        `Fast hands! ${misses} miss${misses === 1 ? "" : "es"} on level ${level} — the change-management board approves.`,
        `Cooked it in ${(timeMs / 1000).toFixed(1)}s. Somewhere a Business Rule just applauded.`,
        `Reflexes of a Background Script. Onwards to level ${level + 1}.`,
      ]),
    };
  }
  if (clean) {
    return {
      rank: "A",
      emoji: "🎯",
      title: pick(["NO MISSES, NO MERCY", "SURGICAL PRECISION", "ACL: APPROVED"]),
      blurb: pick([
        `Perfect accuracy on level ${level}. Slow is smooth, smooth is production-ready.`,
        `Zero misses. You debug bugs that haven't been written yet.`,
        `Every match landed. The audit log is smiling.`,
      ]),
    };
  }
  if (ok && tidy) {
    return {
      rank: "B",
      emoji: "🛠️",
      title: pick(["SOLID DEPLOY", "TICKET RESOLVED", "STORY: DONE"]),
      blurb: pick([
        `Level ${level} cleared in ${(timeMs / 1000).toFixed(1)}s with ${misses} miss${misses === 1 ? "" : "es"}. Stand-up update: shipped it.`,
        `Not bad — a small change request, no rollback needed.`,
        `You'd survive a Friday production push.`,
      ]),
    };
  }
  if (ok) {
    return {
      rank: "C",
      emoji: "☕",
      title: pick(["NEEDS COFFEE", "INCIDENT P3", "REOPENED"]),
      blurb: pick([
        `Level ${level} cleared — but ${misses} misses means the change board wants a post-mortem.`,
        `Got there in the end. Your QA tester is rolling their eyes lovingly.`,
        `Worked on a Friday afternoon vibe. Acceptable. Just.`,
      ]),
    };
  }
  return {
    rank: "D",
    emoji: "🐢",
    title: pick(["EVENTUAL CONSISTENCY", "SLA EXTENDED", "MARATHON, NOT SPRINT"]),
    blurb: pick([
      `You cleared level ${level}. The instance is patient. So are we.`,
      `Slow and steady — a true Asynchronous Business Rule.`,
      `It took a while, but every catalog item ships eventually.`,
    ]),
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function PlayPage() {
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<Card[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [missed, setMissed] = useState(0);
  const [selectedApi, setSelectedApi] = useState<Card | null>(null);
  const [selectedDesc, setSelectedDesc] = useState<Card | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [gameComplete, setGameComplete] = useState(false);

  const roundSize = roundSizeFor(level);

  // Init: load saved progress
  useEffect(() => {
    if (typeof window === "undefined") return;
    const lv = Number(window.localStorage.getItem(STORAGE_LEVEL)) || 1;
    const total = Number(window.localStorage.getItem(STORAGE_TOTAL)) || 0;
    const raw = window.localStorage.getItem(STORAGE_BEST);
    setLevel(Math.min(Math.max(lv, 1), MAX_LEVEL));
    setTotalScore(total);
    if (raw) setBest(Number(raw) || null);
  }, []);

  // Re-deal whenever the level changes
  useEffect(() => {
    setCards(pickRound(level));
    setMatched(new Set());
    setMissed(0);
    setSelectedApi(null);
    setSelectedDesc(null);
    setShake(null);
    setElapsedMs(0);
    setStartedAt(Date.now());
    setDone(false);
    setVerdict(null);
  }, [level]);

  // Tick the timer
  useEffect(() => {
    if (done || startedAt === null) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [done, startedAt]);

  // Try a match when both sides are selected
  useEffect(() => {
    if (!selectedApi || !selectedDesc) return;
    const a = selectedApi;
    const d = selectedDesc;
    if (a.key === d.key) {
      setMatched((prev) => {
        const next = new Set(prev);
        next.add(a.key);
        return next;
      });
      setSelectedApi(null);
      setSelectedDesc(null);
    } else {
      setMissed((m) => m + 1);
      setShake(`${a.id}|${d.id}`);
      const t = setTimeout(() => {
        setSelectedApi(null);
        setSelectedDesc(null);
        setShake(null);
      }, 450);
      return () => clearTimeout(t);
    }
  }, [selectedApi, selectedDesc]);

  // Finish round
  useEffect(() => {
    if (matched.size === roundSize && !done) {
      setDone(true);
      const finalMs = startedAt ? Date.now() - startedAt : elapsedMs;
      setElapsedMs(finalMs);
      const roundScore = finalMs + missed * 3000;
      const newTotal = totalScore + roundScore;
      setTotalScore(newTotal);
      setVerdict(verdictFor(level, finalMs, missed, roundSize));
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_TOTAL, String(newTotal));
        if (best === null || roundScore < best) {
          window.localStorage.setItem(STORAGE_BEST, String(roundScore));
          setBest(roundScore);
        }
        if (level >= MAX_LEVEL) {
          setGameComplete(true);
        } else {
          window.localStorage.setItem(STORAGE_LEVEL, String(level + 1));
        }
      }
    }
  }, [matched, done, startedAt, elapsedMs, missed, best, totalScore, roundSize, level]);

  function handlePick(card: Card) {
    if (done) return;
    if (matched.has(card.key)) return;
    if (card.kind === "api") {
      if (selectedApi?.id === card.id) {
        setSelectedApi(null);
        return;
      }
      setSelectedApi(card);
    } else {
      if (selectedDesc?.id === card.id) {
        setSelectedDesc(null);
        return;
      }
      setSelectedDesc(card);
    }
  }

  function nextLevel() {
    if (level >= MAX_LEVEL) return;
    setLevel((l) => l + 1);
  }

  function retryLevel() {
    setCards(pickRound(level));
    setMatched(new Set());
    setMissed(0);
    setSelectedApi(null);
    setSelectedDesc(null);
    setShake(null);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setDone(false);
    setVerdict(null);
  }

  function resetProgress() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_LEVEL);
      window.localStorage.removeItem(STORAGE_TOTAL);
    }
    setTotalScore(0);
    setGameComplete(false);
    setLevel(1);
  }

  const apiCards = useMemo(() => cards.filter((c) => c.kind === "api"), [cards]);
  const descCards = useMemo(() => cards.filter((c) => c.kind === "desc"), [cards]);
  const seconds = (elapsedMs / 1000).toFixed(1);
  const bestSec = best !== null ? (best / 1000).toFixed(1) : null;
  const tierLabel =
    level <= 4 ? "Easy" : level <= 9 ? "Medium" : level <= 18 ? "Hard" : level <= 30 ? "Expert" : "Mixed";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-panel">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
          >
            ← Home
          </Link>
          <h1 className="font-display text-lg sm:text-xl tracking-tight">
            GLIDE API <span className="text-accent">MATCH</span>
          </h1>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            L{level}/{MAX_LEVEL} · {tierLabel}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-6">
        <section className="grid grid-cols-4 gap-3">
          <Stat label="Time" value={`${seconds}s`} accent="text-primary" />
          <Stat label="Matched" value={`${matched.size}/${roundSize}`} accent="text-accent" />
          <Stat label="Misses" value={String(missed)} accent="text-secondary" />
          <Stat label="Level" value={`${level}`} accent="text-foreground" />
        </section>

        {bestSec && (
          <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
            Best round: {bestSec}s · Total score across levels: {(totalScore / 1000).toFixed(1)}s
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Tap a Glide API on the left, then its matching description on the right. {roundSize} pairs to clear level {level}.
        </p>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Column
            title="Glide API"
            cards={apiCards}
            selectedId={selectedApi?.id}
            matched={matched}
            shake={shake}
            mono
            onPick={handlePick}
          />
          <Column
            title="What it does"
            cards={descCards}
            selectedId={selectedDesc?.id}
            matched={matched}
            shake={shake}
            onPick={handlePick}
          />
        </section>

        {done && verdict && !gameComplete && (
          <section className="rounded-2xl border-2 border-primary/60 bg-primary/5 p-5 text-center space-y-3 animate-fade-in">
            <div className="text-3xl">{verdict.emoji}</div>
            <div className="inline-block rounded-full bg-accent/20 px-3 py-0.5 text-[10px] uppercase tracking-widest text-accent font-bold">
              Rank {verdict.rank} · Level {level} cleared
            </div>
            <h2 className="font-display text-2xl tracking-tight text-primary">
              {verdict.title}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {verdict.blurb}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-zinc-500 font-mono">
              Time {seconds}s · {missed} miss{missed === 1 ? "" : "es"} · Score{" "}
              {((elapsedMs + missed * 3000) / 1000).toFixed(1)}s
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                onClick={nextLevel}
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition-colors"
              >
                Level {level + 1} →
              </button>
              <button
                onClick={retryLevel}
                className="inline-flex items-center justify-center rounded-xl border border-border bg-panel px-5 py-2.5 text-sm font-bold text-foreground uppercase tracking-widest hover:border-accent/60 transition-colors"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {done && gameComplete && (
          <section className="rounded-2xl border-2 border-accent/60 bg-accent/5 p-6 text-center space-y-3 animate-fade-in">
            <div className="text-4xl">🏆</div>
            <h2 className="font-display text-3xl tracking-tight text-accent">
              ALL {MAX_LEVEL} LEVELS CLEARED
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You are now legally required to be on someone's ServiceNow architecture review.
              Total score across the whole run: {(totalScore / 1000).toFixed(1)}s.
            </p>
            <button
              onClick={resetProgress}
              className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground uppercase tracking-widest hover:bg-accent/90 transition-colors"
            >
              Start a new run
            </button>
          </section>
        )}

        {!done && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={retryLevel}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Restart level
            </button>
            <button
              onClick={resetProgress}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors"
            >
              Reset progress
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-2xl bg-panel border border-border p-3 text-center">
      <div className={`font-display text-xl ${accent}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
        {label}
      </div>
    </div>
  );
}

function Column({
  title,
  cards,
  selectedId,
  matched,
  shake,
  mono,
  onPick,
}: {
  title: string;
  cards: Card[];
  selectedId?: string;
  matched: Set<number>;
  shake: string | null;
  mono?: boolean;
  onPick: (c: Card) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">
        {title}
      </div>
      <div className="space-y-2">
        {cards.map((c) => {
          const isMatched = matched.has(c.key);
          const isSelected = selectedId === c.id;
          const isShaking = shake?.split("|").includes(c.id);
          return (
            <button
              key={c.id}
              disabled={isMatched}
              onClick={() => onPick(c)}
              className={[
                "w-full text-left rounded-xl border-2 px-3 py-3 text-sm transition-all active:translate-y-0.5",
                mono ? "font-mono" : "",
                isMatched
                  ? "border-primary/60 bg-primary/10 text-primary line-through opacity-60 cursor-default"
                  : isSelected
                    ? "border-accent bg-accent/10 text-foreground shadow-[0_0_18px_rgba(245,158,11,0.25)]"
                    : "border-border bg-panel text-foreground hover:border-accent/50",
                isShaking ? "animate-shake border-destructive" : "",
              ].join(" ")}
            >
              {c.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
