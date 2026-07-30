import { useState } from "react";
import { CheckCircle2, XCircle, Wrench, Minus } from "lucide-react";
import type { Question, Option } from "@/lib/questions";
import { diagnoseAttempt, diagnosisSummary, type LineStatus } from "@/lib/line-diagnostics";

const statusMeta: Record<LineStatus, { icon: typeof CheckCircle2; label: string; cls: string }> = {
  ok: { icon: CheckCircle2, label: "OK", cls: "text-primary" },
  error: { icon: XCircle, label: "Fault", cls: "text-destructive" },
  fix: { icon: Wrench, label: "Fix", cls: "text-accent" },
  note: { icon: Minus, label: "—", cls: "text-muted-foreground" },
};

interface Props {
  question: Question;
  picked: Option;
}

export function LineCorrections({ question, picked }: Props) {
  const [open, setOpen] = useState(true);
  const report = diagnoseAttempt(question, picked);

  return (
    <section
      data-testid="line-corrections"
      aria-label="Line by line correction"
      className="mt-4 rounded-2xl border-2 border-destructive/40 bg-background/60 overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-destructive/5 transition-colors"
      >
        <span className="text-[10px] uppercase tracking-widest font-bold text-destructive">
          Line-by-line correction
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          <p className="text-[11px] font-mono text-muted-foreground px-1">
            {diagnosisSummary(report)}
          </p>

          <ol className="space-y-1">
            {report.map((r) => {
              const meta = statusMeta[r.status];
              const Icon = meta.icon;
              const faulty = r.status === "error";
              return (
                <li
                  key={r.line}
                  className={`rounded-lg px-2 py-1.5 ${
                    faulty ? "bg-destructive/10 border border-destructive/40" : "bg-panel/60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground w-5 shrink-0 pt-0.5 text-right">
                      {r.line}
                    </span>
                    <Icon className={`size-3.5 shrink-0 mt-0.5 ${meta.cls}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <code
                        className={`block text-[11px] font-mono whitespace-pre-wrap break-words ${
                          faulty ? "text-destructive" : "text-foreground/85"
                        }`}
                      >
                        {r.text || "\u00A0"}
                      </code>
                      <p className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                        <span className="sr-only">{meta.label}: </span>
                        {r.explain}
                      </p>
                      {r.suggestion && (
                        <div className="mt-1.5 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-primary flex items-center gap-1">
                            <Wrench className="size-3" aria-hidden="true" />
                            Corrected line
                          </span>
                          <code className="block text-[11px] font-mono text-primary whitespace-pre-wrap break-words mt-0.5">
                            {r.suggestion}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
