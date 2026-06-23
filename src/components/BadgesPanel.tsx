import type { Progress } from "@/lib/progress";
import { activeDaysThisWeek, weekKey, WEEKLY_BADGE_THRESHOLD } from "@/lib/progress";

export function BadgesPanel({ progress }: { progress: Progress }) {
  const weeks = Object.keys(progress.weeklyBadges).sort().reverse().slice(0, 6);
  const thisWeek = weekKey();
  const daysThisWeek = activeDaysThisWeek(progress.activeDays);
  const weekPct = Math.min(100, (daysThisWeek / WEEKLY_BADGE_THRESHOLD) * 100);
  const sessionsToNext = 5 - (progress.sessions % 5);
  const sessionPct = ((progress.sessions % 5) / 5) * 100;

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold ml-1">
        Badges & Trophies
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Weekly badge progress */}
        <div className="rounded-2xl bg-panel border-2 border-border p-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <span className="text-3xl">🏅</span>
            <span className="text-[10px] text-muted-foreground font-mono">{thisWeek}</span>
          </div>
          <div className="mt-2 font-display text-lg tracking-wide text-accent">
            WEEK BADGE
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {progress.weeklyBadges[thisWeek]
              ? "Earned this week!"
              : `${daysThisWeek}/${WEEKLY_BADGE_THRESHOLD} active days`}
          </p>
          <div className="mt-2 h-1 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${weekPct}%` }}
            />
          </div>
        </div>

        {/* Session badge */}
        <div className="rounded-2xl bg-panel border-2 border-border p-4">
          <div className="flex items-start justify-between">
            <span className="text-3xl">🎖️</span>
            <span className="text-[10px] text-muted-foreground font-mono">×{progress.sessionBadges}</span>
          </div>
          <div className="mt-2 font-display text-lg tracking-wide text-secondary">
            SESSION PINS
          </div>
          <p className="text-[10px] text-muted-foreground leading-snug">
            {sessionsToNext === 5
              ? "Solve 5 puzzles for next pin"
              : `${sessionsToNext} more puzzle${sessionsToNext === 1 ? "" : "s"} → pin`}
          </p>
          <div className="mt-2 h-1 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all"
              style={{ width: `${sessionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Earned week badges trophy case */}
      {weeks.length > 0 && (
        <div className="rounded-2xl bg-panel border border-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">
            Trophy Case
          </div>
          <div className="flex flex-wrap gap-2">
            {weeks.map((w) => (
              <div
                key={w}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-accent/10 border border-accent/30"
                title={`Badge earned for ${w}`}
              >
                <span className="text-base leading-none">🏅</span>
                <span className="font-mono text-[10px] text-accent">{w}</span>
              </div>
            ))}
            {Array.from({ length: progress.sessionBadges }).slice(0, 8).map((_, i) => (
              <div
                key={`pin-${i}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/10 border border-secondary/30"
                title="Session pin (5 puzzles solved)"
              >
                <span className="text-base leading-none">🎖️</span>
                <span className="font-mono text-[10px] text-secondary">PIN {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
