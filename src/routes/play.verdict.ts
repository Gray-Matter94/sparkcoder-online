// Pure verdict logic for the Glide API Match mini-game.
// Extracted from play.tsx so it can be unit-tested independently.

export type VerdictRank = "S" | "A" | "B" | "C" | "D";

export type Verdict = {
  title: string;
  blurb: string;
  emoji: string;
  rank: VerdictRank;
};

export type VerdictTier = {
  rank: VerdictRank;
  emoji: string;
  titles: string[];
  blurbs: string[];
};

// Tier thresholds — exported so tests can assert against them.
export const FAST_PER_PAIR_MS = 2500;
export const OK_PER_PAIR_MS = 4500;

/**
 * Classify a round result into a verdict tier deterministically.
 * Returns the rank + the candidate title/blurb pools (no randomness).
 */
export function classifyVerdict(
  level: number,
  timeMs: number,
  misses: number,
  size: number,
): VerdictTier {
  const perPair = timeMs / Math.max(size, 1);
  const fast = perPair < FAST_PER_PAIR_MS;
  const ok = perPair < OK_PER_PAIR_MS;
  const clean = misses === 0;
  const tidy = misses <= Math.ceil(size / 3);

  if (fast && clean) {
    return {
      rank: "S",
      emoji: "🚀",
      titles: ["FLAWLESS VICTORY", "GLIDE WIZARD MODE", "ACL CAN'T STOP YOU"],
      blurbs: [
        `Cleared level ${level} without a single miss. Are you sure you're not a Script Include?`,
        `Zero misses, sub-${(perPair / 1000).toFixed(1)}s per pair. Knowledge Article writers fear you.`,
        `${size} pairs, ${misses} misses. Even ITIL is impressed.`,
      ],
    };
  }
  if (fast && tidy) {
    return {
      rank: "A",
      emoji: "⚡",
      titles: ["BLAZING RUN", "QUERY SPEED RECORD", "GLIDE GROOVE"],
      blurbs: [
        `Fast hands! ${misses} miss${misses === 1 ? "" : "es"} on level ${level} — the change-management board approves.`,
        `Cooked it in ${(timeMs / 1000).toFixed(1)}s. Somewhere a Business Rule just applauded.`,
        `Reflexes of a Background Script. Onwards to level ${level + 1}.`,
      ],
    };
  }
  if (clean) {
    return {
      rank: "A",
      emoji: "🎯",
      titles: ["NO MISSES, NO MERCY", "SURGICAL PRECISION", "ACL: APPROVED"],
      blurbs: [
        `Perfect accuracy on level ${level}. Slow is smooth, smooth is production-ready.`,
        `Zero misses. You debug bugs that haven't been written yet.`,
        `Every match landed. The audit log is smiling.`,
      ],
    };
  }
  if (ok && tidy) {
    return {
      rank: "B",
      emoji: "🛠️",
      titles: ["SOLID DEPLOY", "TICKET RESOLVED", "STORY: DONE"],
      blurbs: [
        `Level ${level} cleared in ${(timeMs / 1000).toFixed(1)}s with ${misses} miss${misses === 1 ? "" : "es"}. Stand-up update: shipped it.`,
        `Not bad — a small change request, no rollback needed.`,
        `You'd survive a Friday production push.`,
      ],
    };
  }
  if (ok) {
    return {
      rank: "C",
      emoji: "☕",
      titles: ["NEEDS COFFEE", "INCIDENT P3", "REOPENED"],
      blurbs: [
        `Level ${level} cleared — but ${misses} misses means the change board wants a post-mortem.`,
        `Got there in the end. Your QA tester is rolling their eyes lovingly.`,
        `Worked on a Friday afternoon vibe. Acceptable. Just.`,
      ],
    };
  }
  return {
    rank: "D",
    emoji: "🐢",
    titles: ["EVENTUAL CONSISTENCY", "SLA EXTENDED", "MARATHON, NOT SPRINT"],
    blurbs: [
      `You cleared level ${level}. The instance is patient. So are we.`,
      `Slow and steady — a true Asynchronous Business Rule.`,
      `It took a while, but every catalog item ships eventually.`,
    ],
  };
}

function defaultPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build a full verdict (with one title/blurb picked).
 * `pick` is injectable so callers (and tests) can supply deterministic selection.
 */
export function verdictFor(
  level: number,
  timeMs: number,
  misses: number,
  size: number,
  pick: <T>(arr: T[]) => T = defaultPick,
): Verdict {
  const tier = classifyVerdict(level, timeMs, misses, size);
  return {
    rank: tier.rank,
    emoji: tier.emoji,
    title: pick(tier.titles),
    blurb: pick(tier.blurbs),
  };
}
