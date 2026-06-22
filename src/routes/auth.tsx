import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — SparkCoder" },
      { name: "description", content: "Sign in or create a SparkCoder account to save your XP, streaks, and solved puzzles across devices." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  displayName: z.string().trim().min(1).max(40).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ email, password, displayName: mode === "signup" ? displayName : undefined });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: parsed.data.displayName ?? parsed.data.email.split("@")[0] },
          },
        });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (err) throw err;
      }
      navigate({ to: "/" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(
        msg.toLowerCase().includes("invalid")
          ? "Invalid email or password."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="p-4 flex items-center justify-between border-b border-border">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Home
        </Link>
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
          SparkCoder
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold">
              Cloud Save
            </span>
            <h1 className="font-display text-3xl leading-tight">
              {mode === "signin" ? "WELCOME BACK." : "JOIN THE ARCADE."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to sync your XP, streaks, and badges across devices."
                : "Create an account to save your progress to the cloud."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Display name
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                  required
                  className="mt-1 w-full px-3 py-2.5 rounded-lg border-2 border-border bg-panel text-foreground focus:border-primary focus:outline-none"
                  placeholder="ScriptKid42"
                />
              </label>
            )}

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                maxLength={255}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border-2 border-border bg-panel text-foreground focus:border-primary focus:outline-none"
                placeholder="you@example.com"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={8}
                maxLength={72}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border-2 border-border bg-panel text-foreground focus:border-primary focus:outline-none"
                placeholder="At least 8 characters"
              />
            </label>

            {error && (
              <div className="text-xs text-destructive-foreground bg-destructive/20 border border-destructive/50 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-display tracking-wider hover:bg-primary/90 disabled:opacity-60 transition-all active:translate-y-0.5"
            >
              {busy ? "..." : mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
            </button>
          </form>

          <div className="text-center text-xs text-zinc-500">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
              className="text-primary hover:underline font-semibold"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </div>

          <p className="text-[10px] text-center text-zinc-600 leading-relaxed">
            Your local progress will merge with your cloud save the first time you sign in.
            Nothing gets lost.
          </p>
        </div>
      </main>
    </div>
  );
}
