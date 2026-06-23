import { createServerFn } from "@tanstack/react-start";

const TARGET = "sparkcoder.online";
const GATEWAY = "https://connector-gateway.lovable.dev/semrush";

type SemrushResponse = {
  data?: { columnNames: string[]; rows: string[][] };
  error?: string;
  status?: number;
};

async function semrush(path: string, params: Record<string, string>): Promise<SemrushResponse> {
  const apiKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.SEMRUSH_API_KEY;
  if (!apiKey || !connKey) {
    throw new Error("Semrush connection is not configured");
  }
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GATEWAY}/${path}?${qs}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
    },
  });
  const json = (await res.json()) as SemrushResponse;
  return json;
}

function toRecords(resp: SemrushResponse): Record<string, string>[] {
  if (!resp.data) return [];
  const { columnNames, rows } = resp.data;
  return rows.map((row) => {
    const obj: Record<string, string> = {};
    columnNames.forEach((c, i) => (obj[c] = row[i] ?? ""));
    return obj;
  });
}

export type BacklinksInsights = {
  target: string;
  fetchedAt: string;
  overview: {
    authorityScore: number;
    totalBacklinks: number;
    referringDomains: number;
    referringUrls: number;
    follow: number;
    nofollow: number;
    sponsored: number;
    ugc: number;
    text: number;
    image: number;
  } | null;
  refDomains: Array<{
    domain: string;
    authorityScore: number;
    backlinks: number;
    country: string;
    firstSeen: string;
    lastSeen: string;
  }>;
  topLinks: Array<{
    sourceUrl: string;
    sourceTitle: string;
    anchor: string;
    pageAuthorityScore: number;
    nofollow: boolean;
    firstSeen: string;
    targetUrl: string;
  }>;
  quotaExceeded?: boolean;
  errorMessage?: string;
};

export const getBacklinksInsights = createServerFn({ method: "GET" }).handler(
  async (): Promise<BacklinksInsights> => {
    const empty: BacklinksInsights = {
      target: TARGET,
      fetchedAt: new Date().toISOString(),
      overview: null,
      refDomains: [],
      topLinks: [],
    };

    try {
      const [overviewRes, refRes, linksRes] = await Promise.all([
        semrush("backlinks/backlinks_overview", {
          target: TARGET,
          target_type: "root_domain",
          export_columns:
            "ascore,total,domains_num,urls_num,follows_num,nofollows_num,sponsored_num,ugc_num,texts_num,images_num",
        }),
        semrush("backlinks/backlinks_refdomains", {
          target: TARGET,
          target_type: "root_domain",
          display_limit: "25",
          export_columns: "domain_ascore,domain,backlinks_num,ip,country,first_seen,last_seen",
        }),
        semrush("backlinks/backlinks", {
          target: TARGET,
          target_type: "root_domain",
          display_limit: "25",
          export_columns:
            "page_ascore,source_url,source_title,anchor,nofollow,first_seen,last_seen,target_url",
        }),
      ]);

      const quotaExceeded = [overviewRes, refRes, linksRes].some(
        (r) => typeof r.error === "string" && /LIMIT EXCEEDED/i.test(r.error),
      );
      if (quotaExceeded) {
        return { ...empty, quotaExceeded: true, errorMessage: "Semrush API quota exhausted." };
      }

      const overviewRow = toRecords(overviewRes)[0];
      const overview = overviewRow
        ? {
            authorityScore: Number(overviewRow.ascore) || 0,
            totalBacklinks: Number(overviewRow.total) || 0,
            referringDomains: Number(overviewRow.domains_num) || 0,
            referringUrls: Number(overviewRow.urls_num) || 0,
            follow: Number(overviewRow.follows_num) || 0,
            nofollow: Number(overviewRow.nofollows_num) || 0,
            sponsored: Number(overviewRow.sponsored_num) || 0,
            ugc: Number(overviewRow.ugc_num) || 0,
            text: Number(overviewRow.texts_num) || 0,
            image: Number(overviewRow.images_num) || 0,
          }
        : null;

      const refDomains = toRecords(refRes)
        .map((r) => ({
          domain: r.domain,
          authorityScore: Number(r.domain_ascore) || 0,
          backlinks: Number(r.backlinks_num) || 0,
          country: r.country || "",
          firstSeen: r.first_seen,
          lastSeen: r.last_seen,
        }))
        .sort((a, b) => b.authorityScore - a.authorityScore || b.backlinks - a.backlinks);

      const topLinks = toRecords(linksRes)
        .map((r) => ({
          sourceUrl: r.source_url,
          sourceTitle: r.source_title || r.source_url,
          anchor: r.anchor,
          pageAuthorityScore: Number(r.page_ascore) || 0,
          nofollow: r.nofollow === "true" || r.nofollow === "1",
          firstSeen: r.first_seen,
          targetUrl: r.target_url,
        }))
        .sort((a, b) => b.pageAuthorityScore - a.pageAuthorityScore);

      return { ...empty, overview, refDomains, topLinks };
    } catch (err) {
      console.error("getBacklinksInsights failed", err);
      return {
        ...empty,
        errorMessage: err instanceof Error ? err.message : "Failed to load backlink data.",
      };
    }
  },
);
