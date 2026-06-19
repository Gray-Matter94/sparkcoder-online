import { QUESTIONS, type Question } from "./questions";
import { todayStr } from "./progress";

/** Deterministic hash from a string. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick today's challenge — deterministic per day. */
export function getDailyChallenge(date: Date = new Date()): Question {
  const key = todayStr(date);
  const idx = hash(key) % QUESTIONS.length;
  return QUESTIONS[idx];
}
