import { createFileRoute } from "@tanstack/react-router";
import { CATEGORIES } from "@/lib/questions";
import { TOPICS } from "@/lib/glossary";
import { BLOG_POSTS } from "@/lib/blog";
import { DISCOVERY_SECTIONS } from "@/lib/discovery-interview";


const BASE_URL = "https://www.sparkcoder.online";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/daily", changefreq: "daily", priority: "0.9" },
          { path: "/learn", changefreq: "weekly", priority: "0.8" },
          { path: "/learn/scenario-based-scripting", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/acl-scripting", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/glideajax-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/flow-designer-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/flow-designer-how-to", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/itsm-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/discovery-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/irm-architect-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/integrationhub-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/cmdb-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/hrsd-interview-questions", changefreq: "monthly", priority: "0.8" },
          { path: "/learn/discovery", changefreq: "weekly", priority: "0.8" },
          ...DISCOVERY_SECTIONS.map((sec) => ({
            path: `/learn/discovery/${sec.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          { path: "/feedback", changefreq: "monthly", priority: "0.4" },
          { path: "/servicenow-irm-architect-practice", changefreq: "monthly", priority: "0.9" },
          { path: "/servicenow-csa-interview-questions-2026", changefreq: "monthly", priority: "0.9" },
          { path: "/angularjs-coding-test", changefreq: "monthly", priority: "0.9" },
          { path: "/guides/gliderecord-query-reference-field", changefreq: "monthly", priority: "0.9" },
          { path: "/live-coding", changefreq: "weekly", priority: "0.8" },
          { path: "/play", changefreq: "monthly", priority: "0.6" },
          { path: "/tools/servicenow-regex-tester", changefreq: "monthly", priority: "0.8" },
          { path: "/insights/backlinks", changefreq: "weekly", priority: "0.6" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          ...BLOG_POSTS.map((p) => ({
            path: `/blog/${p.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          ...CATEGORIES.map((c) => ({
            path: `/practice/${c.id}`,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...TOPICS.map((t) => ({
            path: `/learn/${t.id}`,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
