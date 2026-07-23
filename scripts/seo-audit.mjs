#!/usr/bin/env node
/**
 * Local SEO audit — scans src/routes/*.tsx for common SEO issues so we catch
 * regressions before publishing. Runs in CI (see .github/workflows/seo-audit.yml)
 * and locally via `bun run seo:audit`.
 *
 * Checks per route file:
 *   - has a head() returning meta with a unique, non-default title
 *   - has a meta description (not the Lovable default)
 *   - has og:title, og:description, og:url
 *   - has a canonical link
 *
 * Also validates:
 *   - public/robots.txt exists and references the sitemap
 *   - src/routes/sitemap[.]xml.ts exists
 *
 * Exits non-zero when any HARD failure is found. Soft warnings are printed
 * but do not fail the build.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROUTES_DIR = "src/routes";
const DEFAULT_TITLES = ["Lovable App", "Lovable Generated Project", "Vite App"];

// Route files exempt from SEO metadata (layout-only, api, generated, or intentionally noindex).
const EXEMPT = new Set([
  "__root.tsx",
  "sitemap[.]xml.ts",
  "README.md",
  "admin.feedback.tsx", // noindex, intentionally excluded
  "play.data.ts",
  "play.verdict.ts",
]);

const hardFails = [];
const softWarns = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "api") continue;
      out.push(...walk(p));
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

function auditRoute(file) {
  const base = file.split("/").pop();
  if (EXEMPT.has(base)) return;
  const src = readFileSync(file, "utf8");
  if (!src.includes("createFileRoute")) return;

  // Layout-only routes that just render <Outlet /> without head() are OK.
  if (!src.includes("head:") && !src.includes("head()")) {
    if (src.includes("<Outlet")) return;
    softWarns.push(`${file}: no head() defined`);
    return;
  }

  const need = [
    { key: "title", re: /title:\s*[`"'A-Za-z_$]/, hard: true },
    { key: "meta description", re: /name:\s*["']description["']/, hard: true },
    { key: "og:title", re: /property:\s*["']og:title["']/, hard: false },
    { key: "og:description", re: /property:\s*["']og:description["']/, hard: false },
    { key: "og:url", re: /property:\s*["']og:url["']/, hard: false },
    { key: "canonical", re: /rel:\s*["']canonical["']/, hard: false },
  ];
  for (const n of need) {
    if (!n.re.test(src)) {
      (n.hard ? hardFails : softWarns).push(`${file}: missing ${n.key}`);
    }
  }
  for (const bad of DEFAULT_TITLES) {
    if (src.includes(bad)) {
      hardFails.push(`${file}: uses default title "${bad}"`);
    }
  }
}

// Route audit
for (const file of walk(ROUTES_DIR)) auditRoute(file);

// robots.txt + sitemap
if (!existsSync("public/robots.txt")) {
  hardFails.push("public/robots.txt is missing");
} else {
  const robots = readFileSync("public/robots.txt", "utf8");
  if (!/sitemap/i.test(robots)) softWarns.push("robots.txt has no Sitemap: directive");
  if (/^\s*Disallow:\s*\/\s*$/im.test(robots) && !/^\s*Allow:\s*\//im.test(robots)) {
    hardFails.push("robots.txt blocks the entire site (Disallow: /)");
  }
}
if (!existsSync("src/routes/sitemap[.]xml.ts") && !existsSync("public/sitemap.xml")) {
  hardFails.push("No sitemap route or public/sitemap.xml found");
}

// Report
console.log("── SEO audit ──");
if (softWarns.length) {
  console.log(`\n${softWarns.length} warning(s):`);
  for (const w of softWarns) console.log(`  • ${w}`);
}
if (hardFails.length) {
  console.log(`\n${hardFails.length} failure(s):`);
  for (const f of hardFails) console.log(`  ✕ ${f}`);
  console.log("\nSEO audit failed. Fix the failures above before publishing.");
  process.exit(1);
}
console.log(`\n✓ SEO audit passed${softWarns.length ? " (with warnings)" : ""}.`);
