import { useEffect, useState, useCallback } from "react";

const KEY = "snscript_progress_v2";

export interface Progress {
  xp: number;
  streak: number;
  lastPlayed: string | null; // YYYY-MM-DD
  solved: Record<string, boolean>; // questionId -> true
  sessions: number; // total puzzles solved (counts repeats too)
  sessionBadges: number; // floor(sessions / 5)
  activeDays: Record<string, true>; // date -> practiced
  weeklyBadges: Record<string, true>; // ISO week key -> earned
  dailyChallenges: Record<string, string>; // date -> questionId completed
}

const empty: Progress = {
  xp: 0,
  streak: 0,
  lastPlayed: null,
  solved: {},
  sessions: 0,
  sessionBadges: 0,
  activeDays: {},
  weeklyBadges: {},
  dailyChallenges: {},
};

function read(): Progress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // try to migrate from v1
      const old = localStorage.getItem("snscript_progress_v1");
      if (old) {
        const parsed = JSON.parse(old);
        return { ...empty, ...parsed };
      }
      return empty;
    }
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(p: Progress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function todayStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayStr(d);
}

/** ISO week key like "2026-W25" */
export function weekKey(d: Date = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((t.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Count active days in the current ISO week */
export function activeDaysThisWeek(activeDays: Record<string, true>, today: Date = new Date()): number {
  const wk = weekKey(today);
  return Object.keys(activeDays).filter((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return weekKey(new Date(y, m - 1, day)) === wk;
  }).length;
}

export const WEEKLY_BADGE_THRESHOLD = 3; // active days per week to earn

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(empty);

  useEffect(() => {
    setProgress(read());
  }, []);

  const award = useCallback((questionId: string, xp: number) => {
    setProgress((prev) => {
      const today = todayStr();
      const alreadySolved = prev.solved[questionId];
      const gained = alreadySolved ? Math.floor(xp / 3) : xp;

      let streak = prev.streak;
      if (prev.lastPlayed !== today) {
        streak = prev.lastPlayed === yesterdayStr() ? streak + 1 : 1;
      } else if (streak === 0) {
        streak = 1;
      }

      const sessions = prev.sessions + 1;
      const sessionBadges = Math.floor(sessions / 5);

      const activeDays = { ...prev.activeDays, [today]: true as const };
      const weeklyBadges = { ...prev.weeklyBadges };
      const days = activeDaysThisWeek(activeDays);
      if (days >= WEEKLY_BADGE_THRESHOLD) {
        weeklyBadges[weekKey()] = true;
      }

      const next: Progress = {
        ...prev,
        xp: prev.xp + gained,
        streak,
        lastPlayed: today,
        solved: { ...prev.solved, [questionId]: true },
        sessions,
        sessionBadges,
        activeDays,
        weeklyBadges,
      };
      write(next);
      return next;
    });
  }, []);

  const markDailyChallenge = useCallback((questionId: string) => {
    setProgress((prev) => {
      const today = todayStr();
      if (prev.dailyChallenges[today]) return prev;
      const next: Progress = {
        ...prev,
        dailyChallenges: { ...prev.dailyChallenges, [today]: questionId },
      };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    write(empty);
    setProgress(empty);
  }, []);

  return { progress, award, reset, markDailyChallenge };
}
