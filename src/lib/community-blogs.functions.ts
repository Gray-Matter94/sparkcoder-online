import { createServerFn } from "@tanstack/react-start";

export type CommunityBlog = {
  title: string;
  url: string;
};

export type BlogTrack =
  | "servicenow-dev"
  | "servicenow-admin"
  | "java-dev"
  | "angular-dev";

type SourceConfig = {
  /** Page we scrape to find recent posts. */
  source: string;
  /** Public landing URL we link out to ("View all"). */
  hub: string;
  /** Human label for the source. */
  label: string;
  /** Regex matching <a href="$1">$2</a> for a post link + visible title. */
  re: RegExp;
  /** Prefix prepended to relative hrefs (omit for absolute hrefs). */
  base?: string;
};

const SOURCES: Record<BlogTrack, SourceConfig> = {
  "servicenow-dev": {
    source:
      "https://www.servicenow.com/community/developer-blog/bg-p/developer-blog",
    hub: "https://www.servicenow.com/community/developer-blog/bg-p/developer-blog",
    label: "community.servicenow.com",
    base: "https://www.servicenow.com",
    re: /<a[^>]+href="(\/community\/developer-blog\/[^"]+\/ba-p\/\d+)"[^>]*>([^<]+)<\/a>/g,
  },
  "servicenow-admin": {
    source:
      "https://www.servicenow.com/community/itsm-articles/bg-p/itsm-blog",
    hub: "https://www.servicenow.com/community/itsm-articles/bg-p/itsm-blog",
    label: "community.servicenow.com",
    base: "https://www.servicenow.com",
    re: /<a[^>]+href="(\/community\/itsm-articles\/[^"]+\/ba-p\/\d+)"[^>]*>([^<]+)<\/a>/g,
  },
  "java-dev": {
    source: "https://inside.java/",
    hub: "https://inside.java/",
    label: "inside.java",
    base: "https://inside.java",
    // inside.java post links look like /2026/01/15/post-slug/
    re: /<a[^>]+href="(\/\d{4}\/\d{2}\/\d{2}\/[^"]+\/?)"[^>]*>\s*([^<]{8,})\s*<\/a>/g,
  },
  "angular-dev": {
    source: "https://blog.angular.dev/",
    hub: "https://blog.angular.dev/",
    label: "blog.angular.dev",
    // angular blog (Medium) — absolute or relative; capture both
    re: /<a[^>]+href="(https?:\/\/blog\.angular\.dev\/[^"?#]+)"[^>]*>\s*([^<]{8,})\s*<\/a>/g,
  },
};

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

const cache = new Map<BlogTrack, { at: number; data: CommunityBlog[] }>();
const TTL_MS = 1000 * 60 * 60; // 1 hour

function isValidTrack(t: unknown): t is BlogTrack {
  return (
    t === "servicenow-dev" ||
    t === "servicenow-admin" ||
    t === "java-dev" ||
    t === "angular-dev"
  );
}

export const getCommunityBlogs = createServerFn({ method: "GET" })
  .inputValidator((input: { track?: string } | undefined) => ({
    track: isValidTrack(input?.track) ? input!.track : ("servicenow-dev" as BlogTrack),
  }))
  .handler(
    async ({
      data,
    }): Promise<{ blogs: CommunityBlog[]; source: string; hub: string; label: string }> => {
      const cfg = SOURCES[data.track];
      const cached = cache.get(data.track);
      if (cached && Date.now() - cached.at < TTL_MS) {
        return { blogs: cached.data, source: cfg.source, hub: cfg.hub, label: cfg.label };
      }
      try {
        const res = await fetch(cfg.source, {
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
        // clone regex so internal lastIndex doesn't leak across requests
        const re = new RegExp(cfg.re.source, cfg.re.flags);
        let m: RegExpExecArray | null;
        while ((m = re.exec(html)) && blogs.length < 8) {
          const href = m[1];
          const title = decodeEntities(m[2]).replace(/\s+/g, " ").trim();
          if (!title || title.length < 8) continue;
          if (seen.has(href)) continue;
          seen.add(href);
          const url = href.startsWith("http") ? href : `${cfg.base ?? ""}${href}`;
          blogs.push({ title, url });
        }

        cache.set(data.track, { at: Date.now(), data: blogs });
        return { blogs, source: cfg.source, hub: cfg.hub, label: cfg.label };
      } catch (err) {
        console.error("getCommunityBlogs failed", data.track, err);
        return {
          blogs: cached?.data ?? [],
          source: cfg.source,
          hub: cfg.hub,
          label: cfg.label,
        };
      }
    },
  );
