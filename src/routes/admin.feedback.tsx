import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/feedback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin — Feedback Inbox" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminFeedback,
});

type FeedbackStatus = "open" | "in_progress" | "resolved";

type FeedbackRow = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  status: FeedbackStatus;
  screenshot_url: string | null;
  page_url: string | null;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: "OPEN",
  in_progress: "IN PROGRESS",
  resolved: "RESOLVED",
};

function AdminFeedback() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [filter, setFilter] = useState<"all" | FeedbackStatus>("all");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => {
      setIsAdmin(!!data);
      setChecked(true);
      if (data) void load();
    });
  }, [user]);

  async function load() {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as FeedbackRow[]);
  }

  async function update(id: string, patch: Partial<FeedbackRow>) {
    const payload: Record<string, unknown> = { ...patch };
    if (patch.status === "resolved") payload.resolved_at = new Date().toISOString();
    if (patch.status && patch.status !== "resolved") payload.resolved_at = null;
    const { error } = await supabase.from("feedback").update(payload).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await load();
  }

  if (loading || !user || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-2xl">Admins only</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account doesn't have admin access. Ask an admin to grant you the role.
        </p>
        <Link to="/" className="text-xs uppercase tracking-widest text-accent">← Home</Link>
      </div>
    );
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = {
    all: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    resolved: rows.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
          <Link to="/feedback" className="text-[10px] uppercase tracking-widest text-accent font-bold">
            User view →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent">🛡️ Admin</span>
          <h1 className="font-display text-3xl">Feedback inbox</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["all", "open", "in_progress", "resolved"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md border transition-colors ${
                filter === k
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "all" ? "All" : STATUS_LABEL[k]} · {counts[k]}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing here.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((r) => (
              <AdminCard key={r.id} row={r} onUpdate={update} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function AdminCard({
  row,
  onUpdate,
}: {
  row: FeedbackRow;
  onUpdate: (id: string, patch: Partial<FeedbackRow>) => Promise<void>;
}) {
  const [note, setNote] = useState(row.admin_note ?? "");
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!row.screenshot_url) return;
    let cancelled = false;
    supabase.storage
      .from("feedback-screenshots")
      .createSignedUrl(row.screenshot_url, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [row.screenshot_url]);

  return (
    <li className="rounded-2xl border border-border bg-panel p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display tracking-wide text-base">{row.title}</h3>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {new Date(row.created_at).toLocaleString()} · user {row.user_id?.slice(0, 8) ?? "—"}
          </p>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${
            row.status === "resolved"
              ? "border-primary/40 bg-primary/10 text-primary"
              : row.status === "in_progress"
                ? "border-secondary/40 bg-secondary/10 text-secondary"
                : "border-accent/40 bg-accent/10 text-accent"
          }`}
        >
          {STATUS_LABEL[row.status]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{row.description}</p>
      {row.page_url && (
        <p className="text-[10px] font-mono break-all text-muted-foreground">
          On: <a href={row.page_url} target="_blank" rel="noreferrer" className="underline">{row.page_url}</a>
        </p>
      )}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt="Feedback screenshot"
            className="max-h-56 rounded-lg border border-border object-contain"
          />
        </a>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Add resolution notes visible to the user…"
        className="w-full rounded-lg bg-background border border-border px-3 py-2 text-xs outline-none focus:border-accent resize-none"
      />
      <div className="flex flex-wrap gap-2">
        {(["open", "in_progress", "resolved"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onUpdate(row.id, { status: s, admin_note: note || null })}
            className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md border transition-colors ${
              row.status === s
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Mark {STATUS_LABEL[s]}
          </button>
        ))}
        <button
          onClick={() => onUpdate(row.id, { admin_note: note || null })}
          className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground"
        >
          Save note
        </button>
      </div>
    </li>
  );
}
