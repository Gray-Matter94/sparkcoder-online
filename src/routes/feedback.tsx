import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/feedback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Feedback & Issues — SparkCoder" },
      {
        name: "description",
        content:
          "Report an issue or share feedback about SparkCoder. Attach a screenshot and track the resolution status.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FeedbackPage,
});

const schema = z.object({
  title: z.string().trim().min(3, "Give it a short title").max(120),
  description: z.string().trim().min(10, "Please add a bit more detail").max(2000),
});

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}

type FeedbackRow = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  screenshot_url: string | null;
  page_url: string | null;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

const STATUS_STYLES: Record<FeedbackRow["status"], { label: string; cls: string }> = {
  open: { label: "OPEN", cls: "bg-accent/10 text-accent border-accent/40" },
  in_progress: { label: "IN PROGRESS", cls: "bg-secondary/10 text-secondary border-secondary/40" },
  resolved: { label: "RESOLVED", cls: "bg-primary/10 text-primary border-primary/40" },
};

function FeedbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadRows();
    void supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  async function loadRows() {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as FeedbackRow[]);
  }

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ title, description });
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      let screenshot_url: string | null = null;
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Screenshot must be under 5 MB");
        const ALLOWED: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        };
        const ext = ALLOWED[file.type];
        if (!ext) throw new Error("Screenshot must be a JPEG, PNG, GIF, or WebP image");
        // Verify magic bytes match the claimed image type
        const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
        const sniff = sniffImageMime(header);
        if (sniff !== file.type) {
          throw new Error("Screenshot content doesn't match its file type");
        }
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("feedback-screenshots")
          .upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (upErr) throw upErr;
        screenshot_url = path;
      }
      const { error: insErr } = await supabase.from("feedback").insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        screenshot_url,
        page_url: typeof window !== "undefined" ? window.location.href : null,
      });
      if (insErr) throw insErr;
      setTitle("");
      setDescription("");
      setFile(null);
      setPreview(null);
      await loadRows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← Home
          </Link>
          {isAdmin && (
            <Link
              to="/admin/feedback"
              className="text-[10px] uppercase tracking-widest font-bold text-accent hover:text-accent/80"
            >
              Admin inbox →
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        <section className="space-y-2">
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-accent">📝 Feedback</span>
          <h1 className="font-display text-3xl sm:text-4xl leading-tight">
            Report an issue or <span className="text-accent">share feedback</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Attach a screenshot so we can see exactly what you're seeing. You'll see the status change here once we
            look at it.
          </p>
        </section>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border-2 border-border bg-panel p-4">
          <div className="space-y-1.5">
            <label htmlFor="fb-title" className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Title
            </label>
            <input
              id="fb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Sign-in button doesn't respond on mobile"
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="fb-desc"
              className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold"
            >
              What happened?
            </label>
            <textarea
              id="fb-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="Steps to reproduce, what you expected, what actually happened…"
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm outline-none focus:border-accent resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="fb-file"
              className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold"
            >
              Screenshot (optional, max 5 MB)
            </label>
            <input
              id="fb-file"
              type="file"
              accept="image/*"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-accent/20 file:text-accent file:font-bold file:uppercase file:tracking-widest file:text-[10px] hover:file:bg-accent/30"
            />
            {preview && (
              <img
                src={preview}
                alt="Selected screenshot preview"
                className="mt-2 max-h-48 rounded-lg border border-border object-contain"
              />
            )}
          </div>
          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent text-accent-foreground font-display tracking-wide py-2.5 hover:brightness-110 active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {busy ? "Submitting…" : "Submit feedback"}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
            Your submissions
          </h2>
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No feedback yet. Anything you submit will show up here with its resolution status.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((r) => (
                <FeedbackCard key={r.id} row={r} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function FeedbackCard({ row }: { row: FeedbackRow }) {
  const [url, setUrl] = useState<string | null>(null);
  const style = STATUS_STYLES[row.status];

  useEffect(() => {
    let cancelled = false;
    if (!row.screenshot_url) return;
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
    <li className="rounded-2xl border border-border bg-panel p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display tracking-wide text-base">{row.title}</h3>
        <span
          className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${style.cls}`}
        >
          {style.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{row.description}</p>
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="block">
          <img
            src={url}
            alt="Attached screenshot"
            className="max-h-48 rounded-lg border border-border object-contain"
          />
        </a>
      )}
      {row.status === "resolved" && row.admin_note && (
        <div className="text-xs rounded-lg border border-primary/30 bg-primary/5 p-2">
          <span className="text-[10px] uppercase tracking-widest font-bold text-primary">Resolution</span>
          <p className="mt-1 text-foreground whitespace-pre-wrap">{row.admin_note}</p>
        </div>
      )}
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Submitted {new Date(row.created_at).toLocaleString()}
        {row.resolved_at && ` · Resolved ${new Date(row.resolved_at).toLocaleString()}`}
      </p>
    </li>
  );
}
