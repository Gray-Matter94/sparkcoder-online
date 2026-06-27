import { useEffect, useState } from "react";

const STORAGE_PREFIX = "sparkcoder:reading-progress:";

function getStorageKey(slug: string) {
  return `${STORAGE_PREFIX}${slug}`;
}

function computeProgress(): number {
  if (typeof window === "undefined") return 0;
  const doc = document.documentElement;
  const scrollTop = window.scrollY || doc.scrollTop;
  const max = (doc.scrollHeight || 0) - window.innerHeight;
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (scrollTop / max) * 100));
}

export function ReadingProgress({ slug }: { slug: string }) {
  const [pct, setPct] = useState(0);

  // Restore saved scroll position on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(slug));
      if (saved) {
        const { ratio } = JSON.parse(saved) as { ratio: number };
        if (typeof ratio === "number" && ratio > 0) {
          requestAnimationFrame(() => {
            const doc = document.documentElement;
            const max = (doc.scrollHeight || 0) - window.innerHeight;
            window.scrollTo({ top: max * ratio, behavior: "auto" });
          });
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Track scroll + persist
  useEffect(() => {
    let raf = 0;
    let lastSave = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const p = computeProgress();
        setPct(p);
        const now = Date.now();
        if (now - lastSave > 400) {
          lastSave = now;
          try {
            localStorage.setItem(
              getStorageKey(slug),
              JSON.stringify({ ratio: p / 100, updatedAt: now }),
            );
          } catch {
            // ignore
          }
        }
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [slug]);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-transparent pointer-events-none"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-accent transition-[width] duration-75 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
