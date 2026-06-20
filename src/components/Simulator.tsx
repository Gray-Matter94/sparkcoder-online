import { useEffect, useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

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

  useEffect(() => {
    setVisibleLogs(0);
    if (!output) return;
    const total = output.logs.length;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setVisibleLogs(i);
      if (i >= total) clearInterval(id);
    }, 280);
    return () => clearInterval(id);
  }, [output]);

  const dotColor =
    status === "running"
      ? "bg-accent"
      : resultTone === "ok"
        ? "bg-primary"
        : resultTone === "bad"
          ? "bg-destructive"
          : "bg-zinc-600";

  return (
    <div className="rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col h-56 md:h-64">
      <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-between shrink-0">
        <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-2 tracking-widest uppercase">
          <span className={`size-1.5 rounded-full ${dotColor} animate-pulse`} />
          Instance Simulator (dev10294)
        </span>
        <span className="text-[10px] text-zinc-500 font-mono">
          {output?.table ? `DB: ${output.table}` : "idle"}
        </span>
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
            <div className="grid grid-cols-3 gap-2 py-1 border-b border-white/5 text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
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
                <div className="text-zinc-500 truncate">{r.updated}</div>
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
