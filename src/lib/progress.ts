import { useEffect, useState, useCallback } from "react";

const KEY = "snscript_progress_v1";

export interface Progress {
  xp: number;
  streak: number;
  lastPlayed: string | null; // YYYY-MM-DD
  solved: Record<string, boolean>; // questionId -> true
}

const empty: Progress = { xp: 0, streak: 0, lastPlayed: null, solved: {} };

function read(): Progress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(p: Progress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
      const next: Progress = {
        xp: prev.xp + gained,
        streak,
        lastPlayed: today,
        solved: { ...prev.solved, [questionId]: true },
      };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    write(empty);
    setProgress(empty);
  }, []);

  return { progress, award, reset };
}
