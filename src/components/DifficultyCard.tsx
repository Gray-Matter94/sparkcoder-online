import type { Progress } from "@/lib/progress";
import { getCurrentTier, getNextTier, badgesToNextTier, TIERS } from "@/lib/difficulty";

export function DifficultyCard({ progress }: { progress: Progress }) {
  const tier = getCurrentTier(progress);
  const next = getNextTier(progress);
  const needed = badgesToNextTier(progress);
  const earned = Object.keys(progress.weeklyBadges).length;
  const span = next ? next.badgesRequired - tier.badgesRequired : 1;
  const within = next ? earned - tier.badgesRequired : span;
  const pct = next ? Math.min(100, (within / span) * 100) : 100;

  const colorText =
    tier.color === "primary"
      ? "text-primary"
      : tier.color === "accent"
        ? "text-accent"
        : tier.color === "secondary"
          ? "text-secondary"
          : "text-destructive";
  const colorBg =
    tier.color === "primary"
      ? "bg-primary"
      : tier.color === "accent"
        ? "bg-accent"
        : tier.color === "secondary"
          ? "bg-secondary"
          : "bg-destructive";
  const colorBorder =
    tier.color === "primary"
      ? "border-primary/40"
      : tier.color === "accent"
        ? "border-accent/40"
        : tier.color === "secondary"
          ? "border-secondary/40"
          : "border-destructive/40";

  return (
    <section className="space-y-3">
      <h2 className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold ml-1">
        Your Difficulty Rank
      </h2>

      <div className={`rounded-2xl bg-panel border-2 ${colorBorder} p-4 relative overflow-hidden`}>
        <div className="absolute -top-8 -right-6 text-[110px] opacity-10 leading-none select-none">
          {tier.emoji}
        </div>

        <div className="flex items-center gap-3 relative">
          <div className="size-14 rounded-2xl bg-background border border-border flex items-center justify-center text-3xl shrink-0">
            {tier.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
              Rank {tier.index + 1} / {TIERS.length}
            </div>
            <h3 className={`font-display text-xl tracking-wide ${colorText} truncate`}>
              {tier.name.toUpperCase()}
            </h3>
            <p className="text-[11px] text-muted-foreground italic leading-snug">
              "{tier.tagline}"
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 relative">
          <div className="rounded-lg bg-background/60 border border-border px-2.5 py-1.5">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">Unlocked</div>
            <div className={`font-mono text-xs ${colorText}`}>
              Lv 1{tier.maxLevel >= 2 ? `–${tier.maxLevel === 99 ? "∞" : tier.maxLevel}` : ""}
            </div>
          </div>
          <div className="rounded-lg bg-background/60 border border-border px-2.5 py-1.5">
            <div className="text-[9px] uppercase tracking-widest text-zinc-500">XP Boost</div>
            <div className={`font-mono text-xs ${colorText}`}>×{tier.xpMultiplier.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 relative">
          {next ? (
            <>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-zinc-500 font-mono">
                  Next: {next.emoji} {next.name}
                </span>
                <span className={`font-mono ${colorText}`}>
                  {needed} 🏅 to go
                </span>
              </div>
              <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full ${colorBg} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-[10px] font-mono text-center text-accent uppercase tracking-widest py-1">
              ✦ Max rank achieved — chaos mode unlocked ✦
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
