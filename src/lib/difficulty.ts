import type { Progress } from "@/lib/progress";

export interface Tier {
  index: number;
  emoji: string;
  name: string; // funny rank
  tagline: string;
  maxLevel: number; // unlocks puzzles up to this level
  xpMultiplier: number;
  badgesRequired: number; // weekly badges needed to reach this tier
  color: "primary" | "accent" | "secondary" | "destructive";
}

export const TIERS: Tier[] = [
  {
    index: 0,
    emoji: "🍼",
    name: "Script Kiddo",
    tagline: "Still typing `var` like it's 2011.",
    maxLevel: 2,
    xpMultiplier: 1,
    badgesRequired: 0,
    color: "primary",
  },
  {
    index: 1,
    emoji: "🥷",
    name: "Console Cadet",
    tagline: "You console.log() and you mean it.",
    maxLevel: 2,
    xpMultiplier: 1.25,
    badgesRequired: 1,
    color: "accent",
  },
  {
    index: 2,
    emoji: "🧙",
    name: "GlideRecord Wizard",
    tagline: "Casts addQuery() in your sleep.",
    maxLevel: 3,
    xpMultiplier: 1.5,
    badgesRequired: 2,
    color: "secondary",
  },
  {
    index: 3,
    emoji: "🐉",
    name: "Business Rule Dragon",
    tagline: "You hoard before/after/async like gold.",
    maxLevel: 3,
    xpMultiplier: 1.8,
    badgesRequired: 3,
    color: "accent",
  },
  {
    index: 4,
    emoji: "☄️",
    name: "Production Pyromancer",
    tagline: "Deploys on Friday. Sleeps fine.",
    maxLevel: 99,
    xpMultiplier: 2.25,
    badgesRequired: 5,
    color: "destructive",
  },
];

export function getCurrentTier(progress: Progress): Tier {
  const earned = Object.keys(progress.weeklyBadges).length;
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (earned >= t.badgesRequired) tier = t;
  }
  return tier;
}

export function getNextTier(progress: Progress): Tier | null {
  const cur = getCurrentTier(progress);
  return TIERS[cur.index + 1] ?? null;
}

export function badgesToNextTier(progress: Progress): number {
  const next = getNextTier(progress);
  if (!next) return 0;
  const earned = Object.keys(progress.weeklyBadges).length;
  return Math.max(0, next.badgesRequired - earned);
}
