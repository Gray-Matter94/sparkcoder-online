import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCommunityBlogs, type CommunityBlog } from "@/lib/community-blogs.functions";

const COMMUNITY_URL =
  "https://www.servicenow.com/community/developer-blog/bg-p/developer-blog";

export function TopWeeklyBlogs() {
  const fetcher = useServerFn(getCommunityBlogs);
  const [blogs, setBlogs] = useState<CommunityBlog[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetcher()
      .then((res) => {
        if (alive) setBlogs(res.blogs);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [fetcher]);

  return (
    <section className="space-y-3" aria-labelledby="weekly-blogs-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="weekly-blogs-heading"
          className="font-display text-xl uppercase tracking-wider text-primary"
        >
          Top Weekly Blogs
        </h2>
        <a
          href={COMMUNITY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
        >
          View all ↗
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Fresh posts from the ServiceNow Developer Community. Tap to read on community.servicenow.com.
      </p>

      {error && (
        <div className="rounded-2xl border border-border bg-panel p-4 text-xs text-muted-foreground">
          Couldn't load community posts right now.{" "}
          <a
            href={COMMUNITY_URL}
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

      {blogs && blogs.length > 0 && (
        <ul className="grid gap-2">
          {blogs.slice(0, 6).map((b, i) => (
            <li key={b.url}>
              <a
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Read on ServiceNow Community: ${b.title}`}
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
                    community.servicenow.com ↗
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
