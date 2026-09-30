import type { CSSProperties } from "react";
import { TRACKS, useTrack, type TrackId } from "@/lib/tracks";

export function TrackSwitcher({ className = "" }: { className?: string }) {
  const [active, setActive] = useTrack();

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-bold">
          Practice Track
        </span>
        <span className="shrink-0 text-xs font-mono text-muted-foreground">
          {TRACKS.length} TRACKS
        </span>
      </div>
      <div
        role="tablist"
        aria-label="Choose a practice track"
        className="grid grid-cols-2 gap-2 rounded-xl border-2 border-border bg-panel p-2 sm:grid-cols-3 lg:grid-cols-5"
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
              className={`group relative flex min-h-14 min-w-0 flex-row items-center justify-center gap-2 rounded-lg border-2 px-2 py-2.5 transition-all active:translate-y-0.5 sm:flex-col lg:flex-row dark-glass-option floating-glass ${
                isActive
                  ? accentRing
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <span className="shrink-0 text-lg leading-none">{t.emoji}</span>
              <span className="text-center text-xs font-bold leading-tight">
                {t.short.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-sm leading-relaxed text-muted-foreground">
        {TRACKS.find((t) => t.id === active)?.tagline}
      </p>
    </div>
  );
}
