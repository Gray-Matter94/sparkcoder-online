import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  getBacklinksInsights,
  getBacklinksComparison,
  type BacklinksInsights,
  type BacklinksComparison,
} from "@/lib/backlinks.functions";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_COMPETITORS = ["servicenowelite.com", "jace.pro"];

function parseCompare(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_COMPETITORS;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

export const Route = createFileRoute("/insights/backlinks")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    compare: parseCompare(search.compare),
  }),
  head: () => ({
    meta: [
      { title: "Backlinks Insights — SparkCoder" },
      {
        name: "description",
        content:
          "Referring domains, follow/nofollow ratio, and top link sources pointing to SparkCoder Online, powered by Semrush.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Backlinks Insights — SparkCoder" },
      {
        property: "og:description",
        content:
          "Track referring domains, follow/nofollow ratio, and top link sources for sparkcoder.online.",
      },
      { property: "og:url", content: "https://sparkcoder.online/insights/backlinks" },
    ],
  }),
  errorComponent: ErrorView,
  notFoundComponent: NotFound,
  component: BacklinksGate,
});

function NotFound() {
  return <div className="p-8 text-center text-muted-foreground">Not found.</div>;
}

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-semibold">Couldn't load backlinks</h1>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString();
}

function dateFromUnix(s: string) {
  const n = Number(s);
  if (!n) return "—";
  return new Date(n * 1000).toLocaleDateString();
}

function BacklinksGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="text-sm text-muted-foreground">
            Backlinks Insights is an owner-only dashboard. Sign in to view your
            Semrush-powered link data.
          </p>
          <Link
            to="/auth"
            className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return <BacklinksPage />;
}

function BacklinksPage() {
  const search = Route.useSearch();
  const fetchInsights = useServerFn(getBacklinksInsights);
  const fetchComparison = useServerFn(getBacklinksComparison);

  const insightsQ = useQuery({
    queryKey: ["backlinks-insights"],
    queryFn: () => fetchInsights(),
  });
  const comparisonQ = useQuery({
    queryKey: ["backlinks-comparison", search.compare.join(",")],
    queryFn: () => fetchComparison({ data: { domains: search.compare } }),
  });

  if (insightsQ.isLoading || comparisonQ.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-muted-foreground">
        Loading backlinks data…
      </div>
    );
  }

  if (insightsQ.error || comparisonQ.error) {
    const err = (insightsQ.error ?? comparisonQ.error) as Error;
    const forbidden = /forbidden|unauthorized/i.test(err.message);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">
            {forbidden ? "Not authorized" : "Couldn't load backlinks"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {forbidden
              ? "Your account isn't on the owner allowlist for this dashboard."
              : err.message}
          </p>
        </div>
      </div>
    );
  }

  const data = insightsQ.data as BacklinksInsights;
  const comparison = comparisonQ.data as BacklinksComparison;
  const { overview, refDomains, topLinks, quotaExceeded, errorMessage } = data;

  const followTotal = overview ? overview.follow + overview.nofollow : 0;
  const followPct = followTotal ? Math.round((overview!.follow / followTotal) * 100) : 0;
  const nofollowPct = followTotal ? 100 - followPct : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            SEO Insights
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-5 sm:p-8 space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Backlinks Insights</h1>
          <p className="text-sm text-muted-foreground">
            Referring domains, follow/nofollow ratio, and top link sources for{" "}
            <span className="font-mono">{data.target}</span>. Data via Semrush.
          </p>
        </section>

        {quotaExceeded && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            The Semrush API quota is exhausted — upgrade your Semrush plan or wait for the
            quota to reset.
          </div>
        )}
        {!quotaExceeded && errorMessage && (
          <div className="rounded-lg border border-border bg-muted p-4 text-sm">
            {errorMessage}
          </div>
        )}

        {overview && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Authority Score" value={`${overview.authorityScore}/100`} />
            <Stat label="Total backlinks" value={fmt(overview.totalBacklinks)} />
            <Stat label="Referring domains" value={fmt(overview.referringDomains)} />
            <Stat label="Referring URLs" value={fmt(overview.referringUrls)} />
          </section>
        )}

        {overview && followTotal > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Follow / Nofollow ratio</h2>
            <div className="h-4 w-full rounded-full overflow-hidden bg-muted flex">
              <div
                className="bg-primary h-full"
                style={{ width: `${followPct}%` }}
                aria-label={`Follow ${followPct}%`}
              />
              <div
                className="bg-accent h-full"
                style={{ width: `${nofollowPct}%` }}
                aria-label={`Nofollow ${nofollowPct}%`}
              />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="inline-block w-3 h-3 rounded-sm bg-primary mr-2 align-middle" />
                Follow: <strong className="text-foreground">{fmt(overview.follow)}</strong> ({followPct}%)
              </span>
              <span>
                <span className="inline-block w-3 h-3 rounded-sm bg-accent mr-2 align-middle" />
                Nofollow: <strong className="text-foreground">{fmt(overview.nofollow)}</strong> ({nofollowPct}%)
              </span>
              {overview.sponsored > 0 && <span>Sponsored: {fmt(overview.sponsored)}</span>}
              {overview.ugc > 0 && <span>UGC: {fmt(overview.ugc)}</span>}
            </div>
          </section>
        )}

        <CompetitorComparison comparison={comparison} />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top referring domains</h2>
          {refDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No referring domains found yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Domain</th>
                    <th className="px-3 py-2">AS</th>
                    <th className="px-3 py-2">Backlinks</th>
                    <th className="px-3 py-2 hidden sm:table-cell">First seen</th>
                    <th className="px-3 py-2 hidden sm:table-cell">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {refDomains.map((d) => (
                    <tr key={d.domain} className="border-t border-border">
                      <td className="px-3 py-2 font-mono break-all">
                        <a
                          href={`https://${d.domain}`}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="hover:text-primary"
                        >
                          {d.domain}
                        </a>
                      </td>
                      <td className="px-3 py-2">{d.authorityScore}</td>
                      <td className="px-3 py-2">{fmt(d.backlinks)}</td>
                      <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">
                        {dateFromUnix(d.firstSeen)}
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground">
                        {dateFromUnix(d.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Top link sources</h2>
          {topLinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No individual backlinks indexed yet.</p>
          ) : (
            <ul className="space-y-3">
              {topLinks.map((l, i) => (
                <li
                  key={`${l.sourceUrl}-${i}`}
                  className="rounded-lg border border-border p-4 space-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <a
                      href={l.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-medium hover:text-primary line-clamp-2"
                    >
                      {l.sourceTitle}
                    </a>
                    <span
                      className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                        l.nofollow
                          ? "bg-accent/15 text-accent"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      {l.nofollow ? "Nofollow" : "Follow"}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono break-all">
                    {l.sourceUrl}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>AS {l.pageAuthorityScore}</span>
                    {l.anchor && (
                      <span>
                        Anchor: <span className="text-foreground">"{l.anchor}"</span>
                      </span>
                    )}
                    <span>First seen: {dateFromUnix(l.firstSeen)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-muted-foreground pt-4 border-t border-border">
          Source: Semrush. Updated {new Date(data.fetchedAt).toLocaleString()}.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function CompetitorComparison({ comparison }: { comparison: BacklinksComparison }) {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [input, setInput] = useState("");

  const competitors = search.compare;
  const rows = comparison.rows;
  const maxBacklinks = Math.max(1, ...rows.map((r) => r.totalBacklinks));
  const maxRefDomains = Math.max(1, ...rows.map((r) => r.referringDomains));

  const updateCompetitors = (next: string[]) => {
    navigate({
      search: () => ({ compare: next.slice(0, 5) }),
      replace: true,
    });
  };

  const addCompetitor = () => {
    const cleaned = input
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    if (!cleaned) return;
    if (competitors.includes(cleaned)) {
      setInput("");
      return;
    }
    updateCompetitors([...competitors, cleaned]);
    setInput("");
  };

  const removeCompetitor = (domain: string) => {
    updateCompetitors(competitors.filter((d: string) => d !== domain));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Competitor comparison</h2>
          <p className="text-sm text-muted-foreground">
            Compare your backlink profile against 2–5 ServiceNow scripting sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCompetitor();
              }
            }}
            placeholder="add competitor.com"
            disabled={competitors.length >= 5}
            className="text-sm px-3 py-2 rounded-md border border-border bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={addCompetitor}
            disabled={competitors.length >= 5 || !input.trim()}
            className="text-sm rounded-md bg-primary text-primary-foreground px-3 py-2 font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {competitors.map((d: string) => (
          <span
            key={d}
            className="inline-flex items-center gap-2 text-xs rounded-full border border-border bg-muted px-3 py-1 font-mono"
          >
            {d}
            <button
              type="button"
              onClick={() => removeCompetitor(d)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${d}`}
            >
              ×
            </button>
          </span>
        ))}
        {competitors.length === 0 && (
          <span className="text-xs text-muted-foreground">
            No competitors selected — add 2–5 above.
          </span>
        )}
      </div>

      {comparison.quotaExceeded && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Semrush API quota exhausted while loading competitor data.
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">AS</th>
              <th className="px-3 py-2">Referring domains</th>
              <th className="px-3 py-2">Total backlinks</th>
              <th className="px-3 py-2 hidden md:table-cell">Follow %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.domain}
                className={`border-t border-border ${r.isYou ? "bg-primary/5" : ""}`}
              >
                <td className="px-3 py-2 font-mono break-all">
                  {r.domain}
                  {r.isYou && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-primary font-bold">
                      you
                    </span>
                  )}
                  {r.error && (
                    <span className="ml-2 text-[10px] text-destructive">{r.error}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{r.authorityScore}</td>
                <td className="px-3 py-2">
                  <BarCell value={r.referringDomains} max={maxRefDomains} isYou={r.isYou} />
                </td>
                <td className="px-3 py-2">
                  <BarCell value={r.totalBacklinks} max={maxBacklinks} isYou={r.isYou} />
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">
                  {r.follow + r.nofollow > 0 ? `${r.followPct}%` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Bars are scaled to the largest value in this comparison. Higher referring domains and
        Authority Score generally indicate stronger link equity.
      </p>
    </section>
  );
}

function BarCell({ value, max, isYou }: { value: number; max: number; isYou: boolean }) {
  const pct = Math.max(2, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${isYou ? "bg-primary" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-14 text-right">{fmt(value)}</span>
    </div>
  );
}
