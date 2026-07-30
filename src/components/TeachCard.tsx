import type { ReactNode } from "react";
interface Props {
  tone: "ok" | "bad";
  title: string;
  explain: string;
  onContinue: () => void;
  continueLabel: string;
  children?: ReactNode;
}

export function TeachCard({ tone, title, explain, onContinue, continueLabel, children }: Props) {
  const isOk = tone === "ok";
  return (
    <div
      data-testid="teach-card"
      role={isOk ? "status" : "alert"}
      aria-live={isOk ? "polite" : "assertive"}
      aria-label={isOk ? "Correct answer feedback" : "Incorrect answer feedback"}
      className={`p-5 rounded-3xl border-2 shadow-2xl animate-pop ${
        isOk
          ? "bg-primary/10 border-primary shadow-primary/20"
          : "bg-destructive/10 border-destructive shadow-destructive/20"
      }`}
    >

      <div
        className={`flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-xs ${
          isOk ? "text-primary" : "text-destructive"
        }`}
      >
        <span className="text-base">{isOk ? "✓" : "✕"}</span>
        <span>{isOk ? "Correct" : "Logic Mismatch"}</span>
      </div>
      <h3 className="text-base font-bold mb-2 leading-tight">{title}</h3>
      <p
        className={`text-sm leading-relaxed whitespace-pre-line ${
          isOk ? "text-primary/90" : "text-destructive/90"
        }`}
      >
        {explain}
      </p>
      {children}
      <button
        onClick={onContinue}
        className={`mt-4 w-full py-3 rounded-2xl font-display tracking-wider text-sm transition-all active:translate-y-0.5 ${
          isOk
            ? "bg-primary text-primary-foreground shadow-[0_6px_0_var(--color-primary-deep)] active:shadow-none"
            : "bg-destructive text-destructive-foreground shadow-[0_6px_0_#7f1d1d] active:shadow-none"
        }`}
      >
        {continueLabel}
      </button>
    </div>
  );
}
