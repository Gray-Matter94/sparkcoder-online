import { Link } from "@tanstack/react-router";
import type { Progress } from "@/lib/progress";

export function StatsBar({ progress, back }: { progress: Progress; back?: boolean }) {
  return (
    <header className="p-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-4">
        {back ? (
          <Link
            to="/"
            className="text-xs text-zinc-400 hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Home
          </Link>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-panel border border-border flex items-center justify-center font-display text-lg text-primary">
            S
          </div>
        )}
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-accent">🔥</span>
          <span className="font-bold text-sm">{progress.streak} DAY</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-primary">⚡</span>
          <span className="font-bold text-sm">{progress.xp.toLocaleString()} XP</span>
        </div>
      </div>
      {!back && (
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest hidden sm:block">
          ServiceNow Scripting
        </span>
      )}
    </header>
  );
}
