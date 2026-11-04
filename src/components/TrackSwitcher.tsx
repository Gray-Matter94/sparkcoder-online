import { SegmentedControl } from "glisse";
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
      <div className="glisse-track-wrap">
      <SegmentedControl
        aria-label="Choose a practice track"
        className="glisse-track-picker"
        value={active}
        onValueChange={(v) => setActive(v as TrackId)}
        items={TRACKS.map((t) => ({
          value: t.id,
          label: (
            <span className="flex flex-col items-center gap-0.5 py-1" data-track-option={t.id}>
              <span className="text-lg leading-none">{t.emoji}</span>
              <span className="font-display text-[10px] tracking-wide leading-tight">
                {t.short.toUpperCase()}
              </span>
            </span>
          ),
        }))}
      />
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug px-1">
        {TRACKS.find((t) => t.id === active)?.tagline}
      </p>
    </div>
  );
}
