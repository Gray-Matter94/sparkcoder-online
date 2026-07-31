import { QUESTIONS, CATEGORIES, type Question, type Option, categoryTrack } from "./questions";
import type { TrackId } from "./tracks";

/** A single recorded wrong attempt. */
export interface MistakeEntry {
  questionId: string;
  category: string;
  optionId: string;
  /** Classified error type. */
  kind: MistakeKind;
  /** YYYY-MM-DD */
  date: string;
}

export type MistakeKind =
  | "syntax"
  | "api-usage"
  | "null-handling"
  | "query-logic"
  | "performance"
  | "scope-context"
  | "async-timing"
  | "other";

export interface MistakeKindMeta {
  id: MistakeKind;
  label: string;
  emoji: string;
  blurb: string;
  /** Categories that best drill this weakness. */
  drill: string[];
}

export const MISTAKE_KINDS: MistakeKindMeta[] = [
  {
    id: "syntax",
    label: "Syntax & structure",
    emoji: "🧩",
    blurb: "Malformed statements, wrong keywords, mismatched blocks.",
    drill: ["gliderecord", "script-includes"],
  },
  {
    id: "api-usage",
    label: "API usage",
    emoji: "📚",
    blurb: "Right idea, wrong method or wrong arguments for the platform API.",
    drill: ["glideajax", "script-includes"],
  },
  {
    id: "null-handling",
    label: "Null & empty handling",
    emoji: "🕳️",
    blurb: "Missing guards for empty values, unset fields or no-result queries.",
    drill: ["client-scripts", "business-rules"],
  },
  {
    id: "query-logic",
    label: "Query logic",
    emoji: "🔎",
    blurb: "Filters, loops and record cursors that return the wrong rows.",
    drill: ["gliderecord"],
  },
  {
    id: "performance",
    label: "Performance",
    emoji: "⚡",
    blurb: "Queries in loops, unbounded result sets, synchronous client calls.",
    drill: ["gliderecord", "glideajax"],
  },
  {
    id: "scope-context",
    label: "Scope & context",
    emoji: "🎯",
    blurb: "Server APIs on the client, current/previous misuse, wrong script type.",
    drill: ["business-rules", "client-scripts"],
  },
  {
    id: "async-timing",
    label: "Async & timing",
    emoji: "⏱️",
    blurb: "Callbacks, GlideAjax responses and order-of-execution mistakes.",
    drill: ["glideajax", "business-rules"],
  },
  {
    id: "other",
    label: "Conceptual",
    emoji: "💭",
    blurb: "The concept itself needs another pass.",
    drill: [],
  },
];

export function kindMeta(kind: MistakeKind): MistakeKindMeta {
  return MISTAKE_KINDS.find((k) => k.id === kind) ?? MISTAKE_KINDS[MISTAKE_KINDS.length - 1];
}

/**
 * Classify a wrong answer into an error type using the option's code plus the
 * puzzle's own teaching feedback. Pure + deterministic so it is unit-testable.
 */
export function classifyMistake(question: Question, picked: Option): MistakeKind {
  const text = `${picked.text} ${picked.feedback.title} ${picked.feedback.explain}`.toLowerCase();

  const has = (...needles: string[]) => needles.some((n) => text.includes(n));

  if (has("syntax", "missing brace", "semicolon", "not a function", "typo", "misspell", "invalid keyword"))
    return "syntax";
  if (has("null", "undefined", "empty", "nil", "no records", "does not exist", "nothing returned", "hasnext"))
    return "null-handling";
  if (has("slow", "performance", "inside the loop", "in a loop", "setlimit", "unbounded", "synchronous", "getxmlwait", "n+1"))
    return "performance";
  if (has("callback", "async", "await", "race", "order of execution", "before it returns", "timing"))
    return "async-timing";
  if (has("client side", "client-side", "server side", "server-side", "scope", "current.", "previous", "not available on the client", "wrong script type"))
    return "scope-context";
  if (has("addquery", "encoded query", "next()", "loop", "only the first", "orderby", "filter", "iterate"))
    return "query-logic";
  if (has("glide", "g_form", "gs.", "method", "api", "parameter", "argument", "getvalue", "setvalue"))
    return "api-usage";
  return "other";
}

export interface KindStat {
  kind: MistakeKind;
  meta: MistakeKindMeta;
  count: number;
  share: number; // 0-1
  categories: { category: string; name: string; emoji: string; count: number }[];
  lastDate: string | null;
}

function categoryName(id: string) {
  const c = CATEGORIES.find((x) => x.id === id);
  return { name: c?.name ?? id, emoji: c?.emoji ?? "•" };
}

/** Aggregate mistakes by error type, most frequent first. */
export function groupMistakes(mistakes: MistakeEntry[]): KindStat[] {
  const total = mistakes.length;
  const byKind = new Map<MistakeKind, MistakeEntry[]>();
  for (const m of mistakes) {
    const list = byKind.get(m.kind) ?? [];
    list.push(m);
    byKind.set(m.kind, list);
  }

  return [...byKind.entries()]
    .map(([kind, list]) => {
      const catCounts = new Map<string, number>();
      for (const m of list) catCounts.set(m.category, (catCounts.get(m.category) ?? 0) + 1);
      return {
        kind,
        meta: kindMeta(kind),
        count: list.length,
        share: total > 0 ? list.length / total : 0,
        categories: [...catCounts.entries()]
          .map(([category, count]) => ({ category, count, ...categoryName(category) }))
          .sort((a, b) => b.count - a.count),
        lastDate: list.map((m) => m.date).sort().at(-1) ?? null,
      } satisfies KindStat;
    })
    .sort((a, b) => b.count - a.count || (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));
}

export interface Suggestion {
  question: Question;
  category: string;
  categoryName: string;
  categoryEmoji: string;
  reason: string;
  kind: MistakeKind;
}

export interface SuggestOpts {
  mistakes: MistakeEntry[];
  solved: Record<string, boolean>;
  maxLevel: number;
  track?: TrackId;
}

/**
 * Suggest the next puzzle: target the most frequent error type, prefer the
 * category where it shows up most, prefer unsolved puzzles within the
 * unlocked difficulty tier.
 */
export function suggestNextPuzzle({
  mistakes,
  solved,
  maxLevel,
  track = "servicenow-dev",
}: SuggestOpts): Suggestion | null {
  const pool = QUESTIONS.filter(
    (q) => categoryTrack(q.category) === track && q.level <= maxLevel,
  );
  if (pool.length === 0) return null;

  const stats = groupMistakes(mistakes);
  const top = stats[0];

  const rank = (q: Question) => {
    let score = 0;
    if (!solved[q.id]) score += 100;
    if (top) {
      const inMissedCategory = top.categories.find((c) => c.category === q.category);
      if (inMissedCategory) score += 60 + inMissedCategory.count * 5;
      else if (top.meta.drill.includes(q.category)) score += 30;
      // Same puzzle you just failed — worth a rematch, but not first pick.
      if (mistakes.some((m) => m.questionId === q.id)) score += 20;
    }
    // Nudge toward the harder end of what is unlocked.
    score += q.level;
    return score;
  };

  const best = [...pool].sort((a, b) => rank(b) - rank(a))[0];
  const meta = categoryName(best.category);

  const reason = top
    ? `Your most common slip is ${top.meta.label.toLowerCase()} (${top.count} time${top.count === 1 ? "" : "s"}). This puzzle drills exactly that.`
    : "No mistakes logged yet — here is a fresh puzzle to start the streak.";

  return {
    question: best,
    category: best.category,
    categoryName: meta.name,
    categoryEmoji: meta.emoji,
    reason,
    kind: top?.kind ?? "other",
  };
}
