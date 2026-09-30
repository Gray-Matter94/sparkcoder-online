import type { CSSProperties } from "react";
import { TRACKS, useTrack, type TrackId } from "@/lib/tracks";

export function TrackSwitcher({ className = "" }: { className?: string }) {
  const [active, setActive] = useTrack();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          Practice Track
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {TRACKS.length} TRACKS
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Choose a practice track"
        className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl border-2 border-border bg-panel"
      >
        {TRACKS.map((t) => {
          const isActive = t.id === active;
          const accentRing =
            t.accent === "primary"
              ? "border-primary text-primary bg-primary/10"
              : t.accent === "accent"
                ? "border-accent text-accent bg-accent/10"
                : t.accent === "destructive"
                  ? "border-destructive text-destructive bg-destructive/10"
                  : "border-secondary text-secondary bg-secondary/10";
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`Switch to ${t.name} practice track`}
              onClick={() => setActive(t.id as TrackId)}
              style={{ "--dg-glow": `var(--color-${t.accent})` } as CSSProperties}
              className={`group relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border-2 transition-all active:translate-y-0.5 dark-glass-option floating-glass ${
                isActive
                  ? accentRing
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <span className="text-xl leading-none">{t.emoji}</span>
              <span className="font-display text-[11px] tracking-wide leading-tight text-center">
                {t.short.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug px-1">
        {TRACKS.find((t) => t.id === active)?.tagline}
      </p>
    </div>
  );
}
