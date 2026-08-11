import { Link } from "@tanstack/react-router";
import type { Progress } from "@/lib/progress";
import { useAuth, signOut } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import logoAsset from "@/assets/sparkcoder-logo.webp.asset.json";


export function StatsBar({ progress, back }: { progress: Progress; back?: boolean }) {
  return (
    <header className="liquid-glass px-3 py-2 sm:px-4 sm:py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sticky top-0 z-50 rounded-none">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">

        {back ? (
          <Link
            to="/"
            aria-label="Back to SparkCoder home"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            ← Home
          </Link>
        ) : (
          <Link to="/" aria-label="SparkCoder home" className="shrink-0 flex items-center">
            <img
              src={logoAsset.url}
              alt="SparkCoder - ServiceNow Interview Practice logo"
              width={64}
              height={64}
              fetchPriority="high"
              sizes="(max-width: 639px) 36px, (max-width: 1023px) 44px, 52px"
              className="size-9 sm:size-11 lg:size-13 object-contain"
            />
          </Link>
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
      <AuthButton />
    </header>
  );
}

function AuthButton() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return <div className="size-8 rounded-full bg-panel border border-border animate-pulse" />;
  }

  if (!user) {
    return (
      <Link
        to="/auth" search={{ next: "" }}
        className="text-[10px] font-display tracking-widest px-3 py-2 rounded-lg border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
      >
        SIGN IN
      </Link>
    );
  }

  const name =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Player";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="size-9 rounded-full bg-primary/15 border-2 border-primary text-primary font-display flex items-center justify-center hover:bg-primary/25 transition-colors"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-panel shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Signed in as
            </div>
            <div className="text-sm font-semibold truncate">{name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="w-full text-left px-3 py-2.5 text-sm text-destructive-foreground bg-destructive/20 hover:bg-destructive/30 transition-colors"
          >
            Sign out
          </button>
          <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
            Progress auto-syncs to the cloud.
          </div>
        </div>
      )}
    </div>
  );
}
