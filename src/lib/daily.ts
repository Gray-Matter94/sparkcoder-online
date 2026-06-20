import { QUESTIONS, type Question, categoryTrack } from "./questions";
import { todayStr } from "./progress";
import type { TrackId } from "./tracks";

/** Deterministic hash from a string. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick today's challenge — deterministic per (day, track). */
export function getDailyChallenge(track: TrackId = "servicenow-dev", date: Date = new Date()): Question {
  const pool = QUESTIONS.filter((q) => categoryTrack(q.category) === track);
  const list = pool.length > 0 ? pool : QUESTIONS;
  const key = `${todayStr(date)}:${track}`;
  const idx = hash(key) % list.length;
  return list[idx];
}

