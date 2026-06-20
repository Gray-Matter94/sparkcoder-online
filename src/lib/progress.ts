import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

/** Merge two progress snapshots, taking the most generous of each field. */
function merge(a: Progress, b: Progress): Progress {
  return {
    xp: Math.max(a.xp, b.xp),
    streak: Math.max(a.streak, b.streak),
    lastPlayed:
      (a.lastPlayed ?? "") > (b.lastPlayed ?? "") ? a.lastPlayed : b.lastPlayed,
    solved: { ...a.solved, ...b.solved },
    sessions: Math.max(a.sessions, b.sessions),
    sessionBadges: Math.max(a.sessionBadges, b.sessionBadges),
    activeDays: { ...a.activeDays, ...b.activeDays },
    weeklyBadges: { ...a.weeklyBadges, ...b.weeklyBadges },
    dailyChallenges: { ...a.dailyChallenges, ...b.dailyChallenges },
  };
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

export function activeDaysThisWeek(activeDays: Record<string, true>, today: Date = new Date()): number {
  const wk = weekKey(today);
  return Object.keys(activeDays).filter((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return weekKey(new Date(y, m - 1, day)) === wk;
  }).length;
}

export const WEEKLY_BADGE_THRESHOLD = 3;

async function pushCloud(userId: string, p: Progress) {
  try {
    await supabase
      .from("user_progress")
      .upsert({ user_id: userId, data: p as never }, { onConflict: "user_id" });
  } catch (e) {
    console.warn("[progress] cloud sync failed", e);
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(empty);
  const userIdRef = useRef<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial local load + subscribe to auth changes to pull/push cloud
  useEffect(() => {
    setProgress(read());

    let mounted = true;

    async function syncFromCloud(uid: string) {
      const local = read();
      const { data, error } = await supabase
        .from("user_progress")
        .select("data")
        .eq("user_id", uid)
        .maybeSingle();
      if (!mounted) return;
      if (error) {
        console.warn("[progress] cloud load failed", error);
        return;
      }
      const cloud = (data?.data as Progress | undefined) ?? empty;
      const merged = merge({ ...empty, ...cloud }, local);
      write(merged);
      setProgress(merged);
      // push merged back so cloud reflects local additions
      void pushCloud(uid, merged);
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      userIdRef.current = uid;
      if (uid) void syncFromCloud(uid);
    });

    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      userIdRef.current = uid;
      if (uid) void syncFromCloud(uid);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Debounced push when progress changes for signed-in users
  const queueCloud = useCallback((p: Progress) => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void pushCloud(uid, p), 600);
  }, []);

  const award = useCallback(
    (questionId: string, xp: number) => {
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
        queueCloud(next);
        return next;
      });
    },
    [queueCloud],
  );

  const markDailyChallenge = useCallback(
    (questionId: string) => {
      setProgress((prev) => {
        const today = todayStr();
        if (prev.dailyChallenges[today]) return prev;
        const next: Progress = {
          ...prev,
          dailyChallenges: { ...prev.dailyChallenges, [today]: questionId },
        };
        write(next);
        queueCloud(next);
        return next;
      });
    },
    [queueCloud],
  );

  const reset = useCallback(() => {
    write(empty);
    setProgress(empty);
    queueCloud(empty);
  }, [queueCloud]);

  return { progress, award, reset, markDailyChallenge };
}
