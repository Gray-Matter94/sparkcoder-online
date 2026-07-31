import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Target, Sparkles } from "lucide-react";
import type { Progress } from "@/lib/progress";
import { groupMistakes, suggestNextPuzzle } from "@/lib/mistake-analytics";
import type { TrackId } from "@/lib/tracks";

interface Props {
  progress: Progress;
  maxLevel: number;
  track?: TrackId;
  /** Start expanded (used on the module-complete screen). */
  defaultOpen?: boolean;
}

export function MistakeAnalytics({ progress, maxLevel, track = "servicenow-dev", defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const mistakes = progress.mistakes ?? [];
  const stats = useMemo(() => groupMistakes(mistakes), [mistakes]);
  const suggestion = useMemo(
    () => suggestNextPuzzle({ mistakes, solved: progress.solved, maxLevel, track }),
    [mistakes, progress.solved, maxLevel, track],
  );

  return (
    <section
      data-testid="mistake-analytics"
      aria-label="Mistake analytics"
      className="rounded-2xl border-2 border-border bg-panel/70 backdrop-blur-md overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-primary/5 transition-colors"
      >
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary">
          <BarChart3 className="size-3.5" aria-hidden="true" />
          Mistake analytics
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {mistakes.length} logged · {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3.5 space-y-3">
          {stats.length === 0 ? (
            <p className="text-xs text-muted-foreground px-1">
              No failures logged yet. Miss a puzzle and this panel will break your mistakes down by
              error type.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {stats.map((s) => (
                <li
                  key={s.kind}
                  className="rounded-xl border border-border bg-background/60 px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <span aria-hidden="true">{s.meta.emoji}</span>
                      {s.meta.label}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {s.count}× · {Math.round(s.share * 100)}%
                    </span>
                  </div>
                  <div
                    className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden"
                    role="img"
                    aria-label={`${s.meta.label}: ${s.count} of ${mistakes.length} mistakes`}
                  >
                    <div
                      className="h-full bg-destructive/70"
                      style={{ width: `${Math.max(4, s.share * 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-1">{s.meta.blurb}</p>
                  {s.categories.length > 0 && (
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">
                      Seen in:{" "}
                      {s.categories
                        .slice(0, 3)
                        .map((c) => `${c.emoji} ${c.name} (${c.count})`)
                        .join(" · ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {suggestion && (
            <div className="rounded-xl border-2 border-primary/40 bg-primary/10 px-3 py-2.5">
              <span className="text-[9px] uppercase tracking-widest font-bold text-primary flex items-center gap-1.5">
                <Target className="size-3" aria-hidden="true" />
                Practice next
              </span>
              <p className="text-xs font-bold mt-1 leading-snug">
                <span aria-hidden="true">{suggestion.categoryEmoji}</span> {suggestion.categoryName} ·
                Lv {suggestion.question.level}
              </p>
              <p className="text-[11px] text-foreground/85 leading-snug mt-0.5">
                {suggestion.question.title}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1">{suggestion.reason}</p>
              <Link
                to="/practice/$category"
                params={{ category: suggestion.category }}
                search={{ difficulty: undefined }}
                className="mt-2 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-display text-sm tracking-wider shadow-[0_4px_0_var(--color-primary-deep)] active:translate-y-0.5 active:shadow-none transition-all"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                START THIS PUZZLE
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
