import { useEffect, useState, useCallback } from "react";

export type TrackId = "servicenow-dev" | "servicenow-admin" | "java-dev" | "angular-dev";

export interface Track {
  id: TrackId;
  name: string;
  short: string;
  tagline: string;
  heading: [string, string];
  emoji: string;
  /** Tailwind accent color used by the switcher. */
  accent: "primary" | "accent" | "secondary" | "destructive";
}

export const TRACKS: Track[] = [
  {
    id: "servicenow-dev",
    name: "ServiceNow Developer",
    short: "SN Dev",
    tagline: "Server scripts, GlideRecord, business rules.",
    heading: ["ServiceNow Scripting", "Interview Practice."],
    emoji: "🛰️",
    accent: "primary",
  },
  {
    id: "servicenow-admin",
    name: "ServiceNow Administrator",
    short: "SN Admin",
    tagline: "ACLs, UI policies, catalogs, update sets.",
    heading: ["ServiceNow Admin", "Interview Practice."],
    emoji: "🛡️",
    accent: "accent",
  },
  {
    id: "java-dev",
    name: "Java Developer",
    short: "Java",
    tagline: "Collections, concurrency, Streams, Spring.",
    heading: ["Java", "Interview Practice."],
    emoji: "☕",
    accent: "secondary",
  },
  {
    id: "angular-dev",
    name: "AngularJS Developer",
    short: "AngularJS",
    tagline: "Scopes, directives, services, digest cycle.",
    heading: ["AngularJS", "Interview Practice."],
    emoji: "🅰️",
    accent: "destructive",
  },
];

const STORAGE_KEY = "snscript_track_v1";
const EVENT = "snscript:track-change";
const DEFAULT_TRACK: TrackId = "servicenow-dev";

export function getActiveTrack(): TrackId {
  if (typeof window === "undefined") return DEFAULT_TRACK;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && TRACKS.some((t) => t.id === raw)) return raw as TrackId;
  } catch {
    /* ignore */
  }
  return DEFAULT_TRACK;
}

export function setActiveTrack(id: TrackId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

/** React hook: subscribe to the active track. */
export function useTrack(): [TrackId, (id: TrackId) => void] {
  const [track, setTrack] = useState<TrackId>(DEFAULT_TRACK);

  useEffect(() => {
    setTrack(getActiveTrack());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as TrackId | undefined;
      setTrack(detail ?? getActiveTrack());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTrack(getActiveTrack());
    };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const set = useCallback((id: TrackId) => setActiveTrack(id), []);
  return [track, set];
}

export function trackMeta(id: TrackId): Track {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}
