import { useEffect, useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const toneClass: Record<string, string> = {
  info: "text-muted-foreground",
  ok: "text-primary",
  warn: "text-accent",
  bad: "text-destructive",
};

const rowClass: Record<string, string> = {
  ok: "bg-primary/10 text-primary",
  warn: "bg-accent/10 text-accent",
  bad: "bg-destructive/10 text-destructive",
  dim: "opacity-70",
};

interface Props {
  output: SimulatorOutput | null;
  status: "idle" | "running" | "done";
  resultTone: "ok" | "bad" | null;
}

export function Simulator({ output, status, resultTone }: Props) {
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setVisibleLogs(0);
    if (!output) return;
    // Auto-expand when a new run starts
    setMinimized(false);
    const total = output.logs.length;
    if (prefersReducedMotion) {
      setVisibleLogs(total);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisibleLogs(i);
      if (i >= total) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, [output, prefersReducedMotion]);

  // Auto-expand whenever the simulator is actively running
  useEffect(() => {
    if (status === "running") setMinimized(false);
  }, [status]);

  const dotColor =
    status === "running"
      ? "bg-accent"
      : resultTone === "ok"
        ? "bg-primary"
        : resultTone === "bad"
          ? "bg-destructive"
          : "bg-zinc-600";

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label="Expand instance simulator"
        aria-expanded="false"
        className="w-full group relative rounded-full bg-zinc-900/90 border border-white/10 shadow-lg overflow-hidden flex items-center gap-3 px-4 py-2 animate-tap-line-in hover:border-accent/50 hover:bg-zinc-900 transition-all duration-300"
      >
        <span className={`size-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />
        <span className="relative flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-tap-shimmer" />
        </span>
        <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase shrink-0 group-hover:text-accent transition-colors">
          Tap to expand
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col h-56 md:h-64 animate-sim-expand">

      <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest uppercase">
          <span className={`size-1.5 rounded-full ${dotColor} animate-pulse`} />
          Instance Simulator (dev10294)
        </span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground font-mono">
            {output?.table ? `DB: ${output.table}` : "idle"}
          </span>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimize instance simulator"
            className="text-muted-foreground hover:text-foreground text-xs leading-none size-5 rounded hover:bg-white/5 grid place-items-center"
          >
            —
          </button>
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin flex flex-col gap-3 min-h-0">
        {!output && (
          <div className="m-auto text-center text-muted-foreground text-xs">
            Pick a block, then hit{" "}
            <span className="text-primary font-bold">RUN SCRIPT</span> to simulate.
          </div>
        )}

        {output && output.rows.length > 0 && (
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-white/5 text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
              <div>Number</div>
              <div>State</div>
              <div>Updated</div>
            </div>
            {output.rows.map((r, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-2 py-2 px-1 text-[11px] rounded animate-log-in ${
                  r.highlight ? rowClass[r.highlight] : "text-foreground/85"
                }`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="font-mono truncate">{r.number}</div>
                <div className="truncate">{r.state}</div>
                <div className="text-muted-foreground truncate">{r.updated}</div>
              </div>
            ))}
          </div>
        )}

        {output && (
          <div className="mt-auto space-y-0.5 font-mono">
            {output.logs.slice(0, visibleLogs).map((l, i) => (
              <div key={i} className="flex gap-2 text-[10px] leading-relaxed animate-log-in">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={toneClass[l.tone ?? "info"]}>{l.text}</span>
              </div>
            ))}
            {status === "running" && visibleLogs < (output?.logs.length ?? 0) && (
              <div className="text-[10px] text-muted-foreground">
                <span className="inline-block w-2 h-3 bg-primary/70 align-middle animate-[caret_0.8s_steps(1)_infinite]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
