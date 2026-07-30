import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, Database, BarChart3, Terminal } from "lucide-react";
import type { SimulatorOutput } from "@/lib/questions";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type Tone = "info" | "ok" | "warn" | "bad";

const toneClass: Record<string, string> = {
  info: "text-muted-foreground",
  ok: "text-primary",
  warn: "text-accent",
  bad: "text-destructive",
};

const toneRing: Record<Tone, string> = {
  info: "border-muted-foreground/40 bg-muted-foreground/10 text-muted-foreground",
  ok: "border-primary/60 bg-primary/15 text-primary",
  warn: "border-accent/60 bg-accent/15 text-accent",
  bad: "border-destructive/60 bg-destructive/15 text-destructive",
};

const toneFill: Record<Tone, string> = {
  info: "bg-muted-foreground/50",
  ok: "bg-primary",
  warn: "bg-accent",
  bad: "bg-destructive",
};

const toneLabel: Record<Tone, string> = {
  info: "Step",
  ok: "Pass",
  warn: "Warn",
  bad: "Fail",
};

const ToneIcon = ({ tone, className }: { tone: Tone; className?: string }) => {
  const Cmp = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : tone === "bad" ? XCircle : Info;
  return <Cmp className={className} aria-hidden="true" />;
};

const rowClass: Record<string, string> = {
  ok: "border-primary/50 bg-primary/10 text-primary",
  warn: "border-accent/50 bg-accent/10 text-accent",
  bad: "border-destructive/50 bg-destructive/10 text-destructive",
  dim: "border-border bg-white/5 text-muted-foreground",
};

interface Props {
  output: SimulatorOutput | null;
  status: "idle" | "running" | "done";
  resultTone: "ok" | "bad" | null;
}

export function Simulator({ output, status, resultTone }: Props) {
  const [visibleLogs, setVisibleLogs] = useState(0);
  const [minimized, setMinimized] = useState(true);
  const [view, setView] = useState<"visual" | "log">("visual");
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

  const stats = useMemo(() => {
    const counts: Record<Tone, number> = { info: 0, ok: 0, warn: 0, bad: 0 };
    (output?.logs ?? []).forEach((l) => {
      counts[(l.tone ?? "info") as Tone] += 1;
    });
    const total = Math.max(1, output?.logs.length ?? 0);
    return { counts, total };
  }, [output]);

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
    <div className="relative rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col h-72 md:h-80 animate-sim-expand">
      {/* ambient colour wash */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--color-primary)_18%,transparent),transparent_60%),radial-gradient(100%_80%_at_100%_100%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent_65%)]"
      />
      {status === "running" && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-primary/25 to-transparent animate-sim-scan"
        />
      )}

      <div className="relative px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest uppercase">
          <span className={`size-1.5 rounded-full ${dotColor} animate-pulse`} />
          Instance Simulator (dev10294)
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono">
            {output?.table ? `DB: ${output.table}` : "idle"}
          </span>
          <div className="flex rounded-lg border border-white/10 overflow-hidden" role="group" aria-label="Simulator view">
            <button
              type="button"
              onClick={() => setView("visual")}
              aria-pressed={view === "visual"}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                view === "visual" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="size-3" aria-hidden="true" /> Visual
            </button>
            <button
              type="button"
              onClick={() => setView("log")}
              aria-pressed={view === "log"}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors ${
                view === "log" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Terminal className="size-3" aria-hidden="true" /> Log
            </button>
          </div>
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

      <div className="relative flex-1 p-3 overflow-y-auto scrollbar-thin flex flex-col gap-3 min-h-0">
        {!output && (
          <div className="m-auto text-center text-muted-foreground text-xs">
            Pick a block, then hit <span className="text-primary font-bold">RUN SCRIPT</span> to simulate.
          </div>
        )}

        {output && view === "visual" && (
          <div className="space-y-3">
            {/* execution meter */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  Execution profile
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">
                  {visibleLogs}/{output.logs.length} steps
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                {(["ok", "warn", "bad", "info"] as Tone[]).map((t) =>
                  stats.counts[t] ? (
                    <div
                      key={t}
                      className={`${toneFill[t]} animate-meter-grow`}
                      style={{ width: `${(stats.counts[t] / stats.total) * 100}%` }}
                      title={`${toneLabel[t]}: ${stats.counts[t]}`}
                    />
                  ) : null,
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {(["ok", "warn", "bad", "info"] as Tone[]).map((t) =>
                  stats.counts[t] ? (
                    <span
                      key={t}
                      className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${toneClass[t]}`}
                    >
                      <ToneIcon tone={t} className="size-3" />
                      {toneLabel[t]} · {stats.counts[t]}
                    </span>
                  ) : null,
                )}
              </div>
            </div>

            {/* pipeline of steps */}
            <ol className="space-y-1.5" aria-label="Simulated execution steps">
              {output.logs.slice(0, visibleLogs).map((l, i) => {
                const tone = (l.tone ?? "info") as Tone;
                return (
                  <li key={i} className="flex items-stretch gap-2 animate-log-in" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex flex-col items-center">
                      <span
                        className={`size-6 shrink-0 rounded-lg border grid place-items-center animate-node-pop ${toneRing[tone]}`}
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <ToneIcon tone={tone} className="size-3.5" />
                      </span>
                      {i < visibleLogs - 1 && (
                        <span className={`flex-1 w-[2px] my-0.5 sim-flow-line ${toneClass[tone]}`} aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 rounded-lg border border-white/5 bg-white/5 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black uppercase tracking-widest ${toneClass[tone]}`}>
                          {toneLabel[tone]}
                        </span>
                        {l.time && <span className="text-[9px] font-mono text-muted-foreground">{l.time}</span>}
                      </div>
                      <p className="text-[11px] leading-snug text-foreground/90 break-words">{l.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* record cards */}
            {output.rows.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5 text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  <Database className="size-3" aria-hidden="true" />
                  {output.table ?? "records"}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {output.rows.map((r, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border px-2.5 py-2 animate-log-in ${
                        r.highlight ? rowClass[r.highlight] : "border-white/10 bg-white/5 text-foreground/85"
                      }`}
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] truncate">{r.number}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider rounded-full border border-current/30 px-1.5 py-0.5 shrink-0">
                          {r.state}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground font-mono mt-0.5 truncate">
                        updated · {r.updated}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {output && (
          <div
            data-testid="simulator-trace"
            role="log"
            aria-live="polite"
            aria-label="Simulator output log"
            className={`mt-auto space-y-0.5 font-mono ${
              view === "visual" ? "border-t border-white/5 pt-2" : ""
            }`}
          >
            {output.logs.slice(0, visibleLogs).map((l, i) => (
              <div key={i} className="flex gap-2 text-[10px] leading-relaxed animate-log-in">
                <span className="text-muted-foreground shrink-0">{l.time}</span>
                <span className={toneClass[l.tone ?? "info"]}>{l.text}</span>
              </div>
            ))}
            {status === "running" && visibleLogs < (output?.logs.length ?? 0) && (
              <div className="text-[10px] text-muted-foreground" aria-hidden="true">
                <span className="inline-block w-2 h-3 bg-primary/70 align-middle animate-[caret_0.8s_steps(1)_infinite]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
