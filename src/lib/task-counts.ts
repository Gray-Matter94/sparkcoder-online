/**
 * Single source of truth for every task/puzzle counter in the app.
 *
 * Three *different* scopes exist, and they must never be mixed:
 *
 * 1. GUIDED PUZZLES — multiple-choice puzzles under /practice/:category.
 *    `questionsFor(cat)` = hand-crafted + generated, de-duplicated by id.
 *    A tier gate (`q.level <= maxLevel`) hides harder puzzles, so each
 *    category has: total, unlocked, locked.
 * 2. LIVE-CODING TASKS — free-form editor tasks under /live-coding.
 *    Completely separate data set, never tier-gated.
 * 3. UNIQUE COMPLETIONS — how many distinct task ids the user has ever
 *    solved (`progress.solved`), so replaying one never inflates it.
 *
 * All numbers are derived from the data — nothing is hardcoded.
 */
import { CATEGORIES, questionsFor, type Category } from "./questions";
import { LIVE_CODING_QUESTIONS } from "./live-coding-questions";
import type { TrackId } from "./tracks";

/** Total number of free-form live-coding tasks, derived from the data. */
export const LIVE_CODING_TASK_TOTAL = LIVE_CODING_QUESTIONS.length;

export const LIVE_CODING_SERVER_TOTAL = LIVE_CODING_QUESTIONS.filter(
  (q) => q.side === "server",
).length;
export const LIVE_CODING_CLIENT_TOTAL = LIVE_CODING_QUESTIONS.filter(
  (q) => q.side === "client",
).length;

export interface PuzzleCounts {
  /** Every guided puzzle in scope, regardless of tier. */
  total: number;
  /** Puzzles playable at the user's current tier. */
  unlocked: number;
  /** Puzzles still gated behind a higher tier. */
  locked: number;
  /** Distinct puzzle ids solved at least once (within `unlocked`). */
  solvedUnique: number;
  /** Distinct puzzle ids solved at least once (within `total`). */
  solvedUniqueAll: number;
}

const catCache = new Map<Category, ReturnType<typeof questionsFor>>();
/** Cached full puzzle list (hand-crafted + generated) for one category. */
export function allPuzzlesFor(cat: Category) {
  let list = catCache.get(cat);
  if (!list) {
    list = questionsFor(cat);
    catCache.set(cat, list);
  }
  return list;
}

type SolvedMap = Record<string, boolean>;

function countsFromList(
  list: ReturnType<typeof questionsFor>,
  maxLevel: number,
  solved: SolvedMap,
): PuzzleCounts {
  const unlockedList = list.filter((q) => q.level <= maxLevel);
  const uniq = (arr: typeof list) => new Set(arr.filter((q) => solved[q.id]).map((q) => q.id)).size;
  return {
    total: list.length,
    unlocked: unlockedList.length,
    locked: list.length - unlockedList.length,
    solvedUnique: uniq(unlockedList),
    solvedUniqueAll: uniq(list),
  };
}

/** Counts for a single practice module. */
export function puzzleCountsForCategory(
  cat: Category,
  maxLevel: number,
  solved: SolvedMap,
): PuzzleCounts {
  return countsFromList(allPuzzlesFor(cat), maxLevel, solved);
}

/** Counts across every module of one learning track. */
export function puzzleCountsForTrack(
  track: TrackId,
  maxLevel: number,
  solved: SolvedMap,
): PuzzleCounts {
  const acc: PuzzleCounts = {
    total: 0,
    unlocked: 0,
    locked: 0,
    solvedUnique: 0,
    solvedUniqueAll: 0,
  };
  for (const c of CATEGORIES) {
    if (c.track !== track) continue;
    const n = puzzleCountsForCategory(c.id, maxLevel, solved);
    acc.total += n.total;
    acc.unlocked += n.unlocked;
    acc.locked += n.locked;
    acc.solvedUnique += n.solvedUnique;
    acc.solvedUniqueAll += n.solvedUniqueAll;
  }
  return acc;
}
