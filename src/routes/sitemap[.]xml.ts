import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/start-client-core/serverRoute";
import { CATEGORIES } from "@/lib/questions";
import { TOPICS } from "@/lib/glossary";

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
          { path: "/servicenow-csa-interview-questions-2026", changefreq: "monthly", priority: "0.9" },
          { path: "/angularjs-coding-test", changefreq: "monthly", priority: "0.9" },
          { path: "/guides/gliderecord-query-reference-field", changefreq: "monthly", priority: "0.9" },
          { path: "/play", changefreq: "monthly", priority: "0.6" },
          { path: "/insights/backlinks", changefreq: "weekly", priority: "0.6" },
          { path: "/auth", changefreq: "monthly", priority: "0.3" },
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
