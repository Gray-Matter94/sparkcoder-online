import { createServerFn } from "@tanstack/react-start";

export type CommunityBlog = {
  title: string;
  url: string;
  excerpt?: string;
};

const SOURCE = "https://www.servicenow.com/community/developer-blog/bg-p/developer-blog";
const BASE = "https://www.servicenow.com";

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// In-memory cache per worker instance (best-effort; resets on cold start).
let cache: { at: number; data: CommunityBlog[] } | null = null;
const TTL_MS = 1000 * 60 * 60; // 1 hour

export const getCommunityBlogs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ blogs: CommunityBlog[]; source: string }> => {
    if (cache && Date.now() - cache.at < TTL_MS) {
      return { blogs: cache.data, source: SOURCE };
    }
    try {
      const res = await fetch(SOURCE, {
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; SparkCoderBot/1.0; +https://www.sparkcoder.online)",
          accept: "text/html",
        },
      });
      if (!res.ok) throw new Error(`Upstream ${res.status}`);
      const html = await res.text();

      const seen = new Set<string>();
      const blogs: CommunityBlog[] = [];
      const re = /<a[^>]+href="(\/community\/developer-blog\/[^"]+\/ba-p\/\d+)"[^>]*>([^<]+)<\/a>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) && blogs.length < 8) {
        const path = m[1];
        const title = decodeEntities(m[2]).trim();
        if (!title || title.length < 8) continue;
        if (seen.has(path)) continue;
        seen.add(path);
        blogs.push({ title, url: BASE + path });
      }

      cache = { at: Date.now(), data: blogs };
      return { blogs, source: SOURCE };
    } catch (err) {
      console.error("getCommunityBlogs failed", err);
      return { blogs: cache?.data ?? [], source: SOURCE };
    }
  },
);
