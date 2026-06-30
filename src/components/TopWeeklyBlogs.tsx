import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCommunityBlogs, type CommunityBlog } from "@/lib/community-blogs.functions";
import { useTrack, trackMeta } from "@/lib/tracks";

export function TopWeeklyBlogs() {
  const fetcher = useServerFn(getCommunityBlogs);
  const [track] = useTrack();
  const [blogs, setBlogs] = useState<CommunityBlog[] | null>(null);
  const [meta, setMeta] = useState<{ hub: string; label: string } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setBlogs(null);
    setError(false);
    fetcher({ data: { track } })
      .then((res) => {
        if (!alive) return;
        setBlogs(res.blogs);
        setMeta({ hub: res.hub, label: res.label });
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [fetcher, track]);

  const t = trackMeta(track);
  const hub = meta?.hub ?? "#";
  const label = meta?.label ?? "community";

  return (
    <section className="space-y-3" aria-labelledby="weekly-blogs-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="weekly-blogs-heading"
          className="font-display text-xl uppercase tracking-wider text-primary"
        >
          Top Weekly Blogs · {t.short}
        </h2>
        <a
          href={hub}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          View all ↗
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Fresh posts from the official {t.name} community. Tap to read on {label}.
      </p>

      {error && (
        <div className="rounded-2xl border border-border bg-panel p-4 text-xs text-muted-foreground">
          Couldn't load community posts right now.{" "}
          <a
            href={hub}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Visit the community →
          </a>
        </div>
      )}

      {!error && blogs === null && (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-2xl border border-border bg-panel animate-pulse"
            />
          ))}
        </div>
      )}

      {blogs && blogs.length === 0 && !error && (
        <div className="rounded-2xl border border-border bg-panel p-4 text-xs text-muted-foreground">
          No recent posts parsed.{" "}
          <a
            href={hub}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Browse {label} →
          </a>
        </div>
      )}

      {blogs && blogs.length > 0 && (
        <ul className="grid gap-2">
          {blogs.slice(0, 6).map((b, i) => (
            <li key={b.url}>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read on ${label}: ${b.title}`}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-panel p-3 hover:border-primary hover:bg-panel/80 transition-colors"
              >
                <span
                  aria-hidden
                  className="font-display text-sm text-primary w-6 shrink-0 text-center"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-foreground group-hover:text-primary line-clamp-2">
                    {b.title}
                  </span>
                  <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {label} ↗
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
