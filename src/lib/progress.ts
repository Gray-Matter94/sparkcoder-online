import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTrack, type TrackId } from "./tracks";

const BASE_KEY = "snscript_progress_v3";
/** Per-track local storage key. The legacy v2 key migrates into the default track. */
function keyFor(track: TrackId) {
  return `${BASE_KEY}:${track}`;
}

export interface SrsEntry {
  topic: string;
  sectionIdx: number;
  label: string;
  icon?: string;
  interval: number; // days
  ease: number; // 1.3 – 2.8
  due: string; // YYYY-MM-DD
  lastReviewed: string; // YYYY-MM-DD
  reviews: number;
  lapses: number;
  lastMissRate: number; // 0-1
}

export type TermMastery = "mastered" | "review";

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
  /** Spaced repetition schedule, keyed by `${topic}:${sectionIdx}`. */
  srs: Record<string, SrsEntry>;
  /** Glossary term mastery, keyed by `${topic}::${term}`. */
  termMastery: Record<string, TermMastery>;
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
  srs: {},
  termMastery: {},
};


function read(track: TrackId): Progress {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(keyFor(track));
    if (!raw) {
      // Migrate legacy single-track storage into the default track.
      if (track === "servicenow-dev") {
        const v2 = localStorage.getItem("snscript_progress_v2");
        if (v2) {
          const parsed = JSON.parse(v2);
          const migrated = { ...empty, ...parsed };
          localStorage.setItem(keyFor(track), JSON.stringify(migrated));
          return migrated;
        }
        const v1 = localStorage.getItem("snscript_progress_v1");
        if (v1) {
          const parsed = JSON.parse(v1);
          return { ...empty, ...parsed };
        }
      }
      return empty;
    }
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

function write(track: TrackId, p: Progress) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(track), JSON.stringify(p));
}


/** Merge two progress snapshots, taking the most generous of each field. */
function merge(a: Progress, b: Progress): Progress {
  // For SRS, keep the most recently reviewed entry per key.
  const srs: Record<string, SrsEntry> = { ...a.srs };
  for (const [k, v] of Object.entries(b.srs ?? {})) {
    const existing = srs[k];
    if (!existing || (v.lastReviewed ?? "") > (existing.lastReviewed ?? "")) {
      srs[k] = v;
    }
  }
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
    srs,
  };
}

export function todayStr(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayStr(dt);
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

export interface SrsReviewInput {
  topic: string;
  sectionIdx: number;
  label: string;
  icon?: string;
  missRate: number; // 0-1
  attempted: number;
}

/** SM-2 inspired scheduler. Returns the next entry given the prior. */
export function scheduleNext(prev: SrsEntry | undefined, input: SrsReviewInput): SrsEntry {
  const today = todayStr();
  const baseEase = prev?.ease ?? 2.3;
  const reviews = (prev?.reviews ?? 0) + 1;
  let lapses = prev?.lapses ?? 0;
  let ease = baseEase;
  let interval: number;

  if (input.missRate >= 0.5) {
    // Failed — relearn tomorrow.
    ease = Math.max(1.3, baseEase - 0.2);
    interval = 1;
    lapses++;
  } else if (input.missRate > 0) {
    ease = Math.max(1.3, baseEase - 0.1);
    if (reviews <= 1) interval = 2;
    else if (reviews === 2) interval = 4;
    else interval = Math.max(1, Math.round((prev?.interval ?? 1) * ease * (1 - input.missRate * 0.5)));
  } else {
    // Clean run.
    ease = Math.min(2.8, baseEase + 0.15);
    if (reviews <= 1) interval = 3;
    else if (reviews === 2) interval = 7;
    else interval = Math.max(1, Math.round((prev?.interval ?? 1) * ease));
  }

  return {
    topic: input.topic,
    sectionIdx: input.sectionIdx,
    label: input.label,
    icon: input.icon,
    interval,
    ease,
    due: addDays(today, interval),
    lastReviewed: today,
    reviews,
    lapses,
    lastMissRate: input.missRate,
  };
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

interface CloudShape {
  tracks?: Record<string, Progress>;
  // legacy: a single Progress at the root (mapped to servicenow-dev)
  xp?: number;
  solved?: Record<string, boolean>;
}

async function pushCloud(userId: string, track: TrackId, p: Progress) {
  try {
    // Read existing row so we don't blow away other tracks.
    const { data } = await supabase
      .from("user_progress")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    const current = (data?.data as CloudShape | undefined) ?? {};
    const tracks: Record<string, Progress> = { ...(current.tracks ?? {}) };
    // Migrate legacy root-Progress into servicenow-dev once.
    if (!current.tracks && current.xp !== undefined) {
      tracks["servicenow-dev"] = { ...empty, ...(current as unknown as Progress) };
    }
    tracks[track] = p;
    await supabase
      .from("user_progress")
      .upsert({ user_id: userId, data: { tracks } as never }, { onConflict: "user_id" });
  } catch (e) {
    console.warn("[progress] cloud sync failed", e);
  }
}

export function useProgress() {
  const [track] = useTrack();
  const [progress, setProgress] = useState<Progress>(empty);
  const userIdRef = useRef<string | null>(null);
  const trackRef = useRef<TrackId>(track);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reload local progress whenever the active track changes.
  useEffect(() => {
    trackRef.current = track;
    setProgress(read(track));
  }, [track]);

  // Auth subscription — pull cloud for the *current* track, merge with local.
  useEffect(() => {
    let mounted = true;

    async function syncFromCloud(uid: string) {
      const t = trackRef.current;
      const local = read(t);
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
      const raw = (data?.data as CloudShape | undefined) ?? {};
      let cloud: Progress = empty;
      if (raw.tracks && raw.tracks[t]) {
        cloud = { ...empty, ...raw.tracks[t] };
      } else if (!raw.tracks && raw.xp !== undefined && t === "servicenow-dev") {
        cloud = { ...empty, ...(raw as unknown as Progress) };
      }
      const merged = merge(cloud, local);
      write(t, merged);
      if (trackRef.current === t) setProgress(merged);
      void pushCloud(uid, t, merged);
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
  }, [track]);

  // Debounced cloud push for signed-in users.
  const queueCloud = useCallback((p: Progress) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const t = trackRef.current;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => void pushCloud(uid, t, p), 600);
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
        write(trackRef.current, next);
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
        write(trackRef.current, next);
        queueCloud(next);
        return next;
      });
    },
    [queueCloud],
  );

  const recordSrs = useCallback(
    (reviews: SrsReviewInput[]) => {
      if (reviews.length === 0) return;
      setProgress((prev) => {
        const srs = { ...prev.srs };
        for (const r of reviews) {
          if (r.attempted === 0) continue;
          const key = `${r.topic}:${r.sectionIdx}`;
          srs[key] = scheduleNext(srs[key], r);
        }
        const next: Progress = { ...prev, srs };
        write(trackRef.current, next);
        queueCloud(next);
        return next;
      });
    },
    [queueCloud],
  );

  const reset = useCallback(() => {
    write(trackRef.current, empty);
    setProgress(empty);
    queueCloud(empty);
  }, [queueCloud]);

  return { progress, award, reset, markDailyChallenge, recordSrs, track };
}

