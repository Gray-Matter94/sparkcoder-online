import { Link } from "@tanstack/react-router";
import { Rocket } from "lucide-react";

interface ToolAboutBlockProps {
  toolName: string;
  children: React.ReactNode;
}

export function ToolAboutBlock({ toolName, children }: ToolAboutBlockProps) {
  return (
    <section
      aria-label={`About ${toolName}`}
      className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
          <Rocket className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-display text-xl tracking-tight">About this tool</h2>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Free · Browser-based · No signup
          </p>
        </div>
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed space-y-2">
        {children}
        <p>
          Built by{" "}
          <Link to="/" className="text-accent hover:underline">
            SparkCoder
          </Link>
          , an arcade-style practice app for ServiceNow scripting interviews.
        </p>
      </div>
    </section>
  );
}
