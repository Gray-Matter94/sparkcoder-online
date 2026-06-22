import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Glide API Match — SparkCoder Mini-Game" },
      {
        name: "description",
        content:
          "Mini-game: match ServiceNow Glide APIs to their descriptions before the clock runs out. Beat your best time and reinforce scripting fundamentals.",
      },
      { property: "og:title", content: "Glide API Match — SparkCoder Mini-Game" },
      {
        property: "og:description",
        content:
          "Speed-match ServiceNow Glide APIs with their descriptions. A fun way to drill scripting fundamentals.",
      },
      { property: "og:url", content: "https://sparkcoder.online/play" },
    ],
    links: [{ rel: "canonical", href: "https://sparkcoder.online/play" }],
  }),
  component: PlayPage,
});

type Pair = { api: string; desc: string };

const PAIRS: Pair[] = [
  { api: "GlideRecord.get()", desc: "Fetch a single record by sys_id or field=value" },
  { api: "GlideRecord.addQuery()", desc: "Add a filter to the encoded query" },
  { api: "GlideRecord.update()", desc: "Persist field changes on a fetched record" },
  { api: "GlideRecord.insert()", desc: "Create a new record and return its sys_id" },
  { api: "GlideRecord.deleteRecord()", desc: "Delete the current record from the table" },
  { api: "GlideRecord.next()", desc: "Advance to the next row in a query" },
  { api: "GlideDateTime.getNumericValue()", desc: "Get epoch milliseconds for date math" },
  { api: "gs.addInfoMessage()", desc: "Show a non-blocking message to the user" },
  { api: "gs.eventQueue()", desc: "Queue an event for async processing" },
  { api: "GlideAggregate.addAggregate()", desc: "Add COUNT/SUM/AVG to a grouped query" },
  { api: "current.setAbortAction()", desc: "Prevent a Business Rule's DB operation" },
  { api: "GlideAjax.getXMLAnswer()", desc: "Call a Script Include from the client" },
];

const ROUND_SIZE = 6;
const STORAGE_KEY = "sparkcoder.play.glide-match.best";

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

function pickRound(): Card[] {
  const picks = shuffle(PAIRS).slice(0, ROUND_SIZE);
  const cards: Card[] = [];
  picks.forEach((p, i) => {
    cards.push({ id: `a-${i}`, kind: "api", key: i, text: p.api });
    cards.push({ id: `d-${i}`, kind: "desc", key: i, text: p.desc });
  });
  return shuffle(cards);
}

function PlayPage() {
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

  // Init round + load best
  useEffect(() => {
    setCards(pickRound());
    setStartedAt(Date.now());
    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setBest(Number(raw) || null);
    }
  }, []);

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
    if (matched.size === ROUND_SIZE && !done) {
      setDone(true);
      const finalMs = startedAt ? Date.now() - startedAt : elapsedMs;
      setElapsedMs(finalMs);
      const score = finalMs + missed * 3000; // 3s penalty per miss
      if (typeof window !== "undefined") {
        if (best === null || score < best) {
          window.localStorage.setItem(STORAGE_KEY, String(score));
          setBest(score);
        }
      }
    }
  }, [matched, done, startedAt, elapsedMs, missed, best]);

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

  function newRound() {
    setCards(pickRound());
    setMatched(new Set());
    setMissed(0);
    setSelectedApi(null);
    setSelectedDesc(null);
    setShake(null);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setDone(false);
  }

  const apiCards = useMemo(() => cards.filter((c) => c.kind === "api"), [cards]);
  const descCards = useMemo(() => cards.filter((c) => c.kind === "desc"), [cards]);
  const seconds = (elapsedMs / 1000).toFixed(1);
  const bestSec = best !== null ? (best / 1000).toFixed(1) : null;

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
            Mini-game
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-6">
        <section className="grid grid-cols-3 gap-3">
          <Stat label="Time" value={`${seconds}s`} accent="text-primary" />
          <Stat
            label="Matched"
            value={`${matched.size}/${ROUND_SIZE}`}
            accent="text-accent"
          />
          <Stat label="Misses" value={String(missed)} accent="text-secondary" />
        </section>

        {bestSec && (
          <div className="text-center text-[11px] uppercase tracking-widest text-muted-foreground font-mono">
            Best score (time + 3s/miss): {bestSec}s
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          Tap a Glide API on the left, then its matching description on the right.
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

        {done && (
          <section className="rounded-2xl border-2 border-primary/60 bg-primary/5 p-5 text-center space-y-3 animate-fade-in">
            <div className="text-3xl">🎉</div>
            <h2 className="font-display text-2xl tracking-tight text-primary">
              ROUND CLEARED
            </h2>
            <p className="text-sm text-muted-foreground">
              Time {seconds}s · {missed} miss{missed === 1 ? "" : "es"} · Score{" "}
              {((elapsedMs + missed * 3000) / 1000).toFixed(1)}s
            </p>
            <button
              onClick={newRound}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition-colors"
            >
              Play again
            </button>
          </section>
        )}

        {!done && (
          <div className="flex justify-center">
            <button
              onClick={newRound}
              className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Restart round
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
                isShaking ? "animate-[shake_0.4s_ease-in-out] border-destructive" : "",
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
