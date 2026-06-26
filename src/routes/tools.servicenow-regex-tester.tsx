import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { useMemo, useState } from "react";

const TITLE = "ServiceNow Regex Tester — Patterns, Presets & Snippets";
const DESCRIPTION =
  "Live regex tester for ServiceNow scripts: client scripts, business rules, inbound email, ACLs. Presets for sys_id, INC, email, URL — copy-ready snippets.";
const URL = "https://www.sparkcoder.online/tools/servicenow-regex-tester";

interface Preset {
  id: string;
  name: string;
  pattern: string;
  flags: string;
  sample: string;
  note: string;
}

const PRESETS: Preset[] = [
  {
    id: "sys_id",
    name: "sys_id (32 hex)",
    pattern: "\\b[a-f0-9]{32}\\b",
    flags: "gi",
    sample:
      "Linked record 6816f79cc0a8016401c5a33be04be441 and parent a9e30c7d4ff1120031577d2ca310c7f3 — see logs.",
    note: "Matches the canonical ServiceNow 32-char hex sys_id. Use on logs, descriptions, inbound email bodies.",
  },
  {
    id: "inc_number",
    name: "Incident number (INC + 7 digits)",
    pattern: "\\bINC\\d{7}\\b",
    flags: "g",
    sample: "Please link INC0010023 to CHG0004411 and follow up on INC0009988.",
    note: "Swap INC for CHG / PRB / RITM / TASK as needed. The 7-digit width is the OOTB default.",
  },
  {
    id: "email",
    name: "Email address",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    flags: "g",
    sample:
      "From: alex.lee@example.com\nCc: ops-team@sub.example.co.uk\nReply-to: noreply+inbound@svc.io",
    note: "Good enough for inbound email actions parsing CC / body text. RFC-perfect regex is impractical.",
  },
  {
    id: "phone_us",
    name: "US phone number",
    pattern: "\\(?\\d{3}\\)?[ .-]?\\d{3}[ .-]?\\d{4}",
    flags: "g",
    sample: "Call (415) 555-0119 or 415.555.0142. After hours: 415-555-0150.",
    note: "Use in client-side validation on caller_phone or inside a UI Policy onChange handler.",
  },
  {
    id: "url",
    name: "URL extraction",
    pattern: "https?:\\/\\/[^\\s)>\\]]+",
    flags: "gi",
    sample:
      "See https://docs.servicenow.com/bundle/yokohama and http://intranet.local/kb/KB0010023 for details.",
    note: "Pulls links out of email bodies or long descriptions. Trim trailing punctuation in code.",
  },
  {
    id: "ip_v4",
    name: "IPv4 address",
    pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b",
    flags: "g",
    sample: "Source 10.0.12.44 hit gateway 192.168.1.1; alert from 8.8.8.8.",
    note: "Useful in event rules and discovery payload parsing. Validate octet range in code afterwards.",
  },
  {
    id: "kb_number",
    name: "Knowledge article (KB + 7 digits)",
    pattern: "\\bKB\\d{7}\\b",
    flags: "g",
    sample: "Resolution documented in KB0010023; superseded KB0004411.",
    note: "Pair with a GlideRecord lookup on kb_knowledge.number to enrich short descriptions.",
  },
  {
    id: "date_iso",
    name: "ISO date (YYYY-MM-DD)",
    pattern: "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    flags: "g",
    sample: "Opened 2026-03-12, due 2026-04-01, closed 2026-04-08.",
    note: "ServiceNow stores GlideDateTime in UTC; this matches the date portion when parsing logs.",
  },
];

function buildRegex(pattern: string, flags: string): { re: RegExp | null; error: string | null } {
  if (!pattern) return { re: null, error: null };
  try {
    return { re: new RegExp(pattern, flags), error: null };
  } catch (e) {
    return { re: null, error: e instanceof Error ? e.message : String(e) };
  }
}

interface MatchInfo {
  index: number;
  value: string;
  groups: string[];
  position: number;
}

function getMatches(re: RegExp | null, input: string): MatchInfo[] {
  if (!re || !input) return [];
  const matches: MatchInfo[] = [];
  const global = re.flags.includes("g");
  const safe = global ? re : new RegExp(re.source, re.flags + "g");
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = safe.exec(input)) !== null) {
    matches.push({
      index: i++,
      value: m[0],
      groups: m.slice(1),
      position: m.index,
    });
    if (m[0].length === 0) safe.lastIndex++;
    if (matches.length > 500) break;
  }
  return matches;
}

function highlight(input: string, matches: MatchInfo[]): React.ReactNode {
  if (!matches.length) return input;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.position > cursor) parts.push(input.slice(cursor, m.position));
    parts.push(
      <mark
        key={i}
        className="bg-accent/30 text-foreground rounded px-0.5"
        title={`#${m.index} @ ${m.position}`}
      >
        {input.slice(m.position, m.position + m.value.length)}
      </mark>,
    );
    cursor = m.position + m.value.length;
  });
  if (cursor < input.length) parts.push(input.slice(cursor));
  return parts;
}

function snippetClient(pattern: string, flags: string): string {
  return `// Client Script / UI Policy onChange
var re = /${pattern || ".*"}/${flags};
var value = g_form.getValue('short_description');
if (re.test(value)) {
  g_form.showFieldMsg('short_description', 'Matched', 'info');
}`;
}

function snippetBusinessRule(pattern: string, flags: string): string {
  return `// Business Rule (before / after)
(function executeRule(current, previous) {
  var re = /${pattern || ".*"}/${flags};
  var text = current.short_description.toString();
  var hits = text.match(re) || [];
  gs.info('regex hits: ' + hits.length + ' → ' + hits.join(', '));
})(current, previous);`;
}

function snippetInboundEmail(pattern: string, flags: string): string {
  return `// Inbound Email Action
var re = /${pattern || ".*"}/${flags};
var body = (email.body_text || '') + '\\n' + (email.subject || '');
var hits = body.match(re);
if (hits) {
  current.work_notes = 'Auto-tagged: ' + hits.join(', ');
}`;
}

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SparkCoder ServiceNow Regex Tester",
  description: DESCRIPTION,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: URL,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which regex engine does ServiceNow use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Server-side scripts run on Rhino-derived JavaScript that supports standard JavaScript regex syntax. Client-side runs in the browser. Both accept the same patterns this tester uses.",
      },
    },
    {
      "@type": "Question",
      name: "How do I match a sys_id in ServiceNow?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Use \\b[a-f0-9]{32}\\b with the i flag. ServiceNow sys_ids are 32 lowercase hex characters but emails and logs sometimes uppercase them.",
      },
    },
    {
      "@type": "Question",
      name: "How do I use regex in an inbound email action?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Build a RegExp literal and call email.body_text.match(re). Combine subject and body before matching to catch values in either place.",
      },
    },
  ],
};

export const Route = createFileRoute("/tools/servicenow-regex-tester")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
    ],
  }),
  component: RegexTester,
});

type SnippetTab = "client" | "rule" | "email";

function RegexTester() {
  const { progress } = useProgress();
  const [pattern, setPattern] = useState(PRESETS[0].pattern);
  const [flags, setFlags] = useState(PRESETS[0].flags);
  const [input, setInput] = useState(PRESETS[0].sample);
  const [replacement, setReplacement] = useState("[REDACTED]");
  const [showReplace, setShowReplace] = useState(false);
  const [snippetTab, setSnippetTab] = useState<SnippetTab>("rule");
  const [copied, setCopied] = useState<string | null>(null);

  const { re, error } = useMemo(() => buildRegex(pattern, flags), [pattern, flags]);
  const matches = useMemo(() => getMatches(re, input), [re, input]);
  const replaced = useMemo(() => {
    if (!re || !input) return input;
    try {
      return input.replace(re, replacement);
    } catch {
      return input;
    }
  }, [re, input, replacement]);

  function loadPreset(p: Preset) {
    setPattern(p.pattern);
    setFlags(p.flags);
    setInput(p.sample);
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  }

  const snippet =
    snippetTab === "client"
      ? snippetClient(pattern, flags)
      : snippetTab === "rule"
        ? snippetBusinessRule(pattern, flags)
        : snippetInboundEmail(pattern, flags);

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Tools · Developer Utility
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW
            <br />
            <span className="text-accent">REGEX TESTER.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Build and test regular expressions for ServiceNow client scripts, business rules,
            inbound email actions, and ACL conditions. Pick a preset, tweak the pattern, and
            copy a ready-to-paste snippet.
          </p>
        </header>

        <section aria-label="Pattern presets" className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Presets
          </h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p)}
                className="h-9 px-3 rounded-lg border-2 border-border bg-panel text-xs font-mono hover:border-accent/60 transition-colors"
                title={p.note}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label="Pattern editor"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                Pattern
              </span>
              <div className="flex items-stretch rounded-xl border-2 border-border bg-background font-mono text-sm overflow-hidden">
                <span className="px-2 flex items-center text-muted-foreground select-none">/</span>
                <input
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  spellCheck={false}
                  className="flex-1 bg-transparent py-2 outline-none"
                  aria-label="Regular expression pattern"
                />
                <span className="px-2 flex items-center text-muted-foreground select-none">/</span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                Flags
              </span>
              <input
                value={flags}
                onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))}
                spellCheck={false}
                placeholder="gim"
                aria-label="Regex flags"
                className="w-full rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
              />
            </label>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground font-mono"
            >
              {error}
            </div>
          )}

          <label className="space-y-1.5 block">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              Test string
            </span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={6}
              spellCheck={false}
              aria-label="Test input"
              className="w-full rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none resize-y"
            />
          </label>

          <div className="rounded-xl border border-border bg-background p-3 text-sm font-mono whitespace-pre-wrap break-words min-h-[3rem]">
            {highlight(input, matches)}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono text-muted-foreground">
              {matches.length} match{matches.length === 1 ? "" : "es"}
            </span>
            <button
              onClick={() => setShowReplace((v) => !v)}
              className="h-8 px-3 rounded-lg border-2 border-border bg-background text-[11px] font-display uppercase tracking-wider hover:border-accent/60"
              aria-expanded={showReplace}
            >
              {showReplace ? "Hide replace" : "Replace mode"}
            </button>
          </div>

          {showReplace && (
            <div className="space-y-2">
              <label className="space-y-1.5 block">
                <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                  Replacement (use $1, $2 for groups)
                </span>
                <input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
                />
              </label>
              <div className="rounded-xl border border-border bg-background p-3 text-sm font-mono whitespace-pre-wrap break-words">
                {replaced}
              </div>
            </div>
          )}
        </section>

        <section aria-label="Match details" className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Match details
          </h2>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground font-mono">No matches yet.</p>
          ) : (
            <div className="rounded-2xl border-2 border-border bg-panel overflow-hidden">
              <table className="w-full text-sm font-mono">
                <thead className="bg-background/50 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <tr>
                    <th className="text-left p-2 w-10">#</th>
                    <th className="text-left p-2 w-16">Pos</th>
                    <th className="text-left p-2">Value</th>
                    <th className="text-left p-2">Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.slice(0, 50).map((m) => (
                    <tr key={m.index} className="border-t border-border">
                      <td className="p-2 text-muted-foreground">{m.index}</td>
                      <td className="p-2 text-muted-foreground">{m.position}</td>
                      <td className="p-2 break-all">{m.value}</td>
                      <td className="p-2 break-all text-muted-foreground">
                        {m.groups.length ? m.groups.join(" · ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matches.length > 50 && (
                <div className="p-2 text-[11px] text-muted-foreground font-mono border-t border-border">
                  Showing first 50 of {matches.length}.
                </div>
              )}
            </div>
          )}
        </section>

        <section
          aria-label="ServiceNow snippets"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-xl tracking-tight">Copy into ServiceNow</h2>
            <div className="inline-flex rounded-lg border-2 border-border overflow-hidden text-[11px] font-display uppercase tracking-wider">
              {(
                [
                  ["rule", "Business rule"],
                  ["client", "Client script"],
                  ["email", "Inbound email"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setSnippetTab(id)}
                  className={
                    "h-8 px-3 " +
                    (snippetTab === id
                      ? "bg-accent text-accent-foreground"
                      : "bg-background hover:bg-panel")
                  }
                  aria-pressed={snippetTab === id}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
            <code>{snippet}</code>
          </pre>
          <button
            onClick={() => copy(snippet, "snippet")}
            className="h-10 px-4 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20 transition-colors"
          >
            {copied === "snippet" ? "Copied!" : "Copy snippet"}
          </button>
        </section>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Regex gotchas in ServiceNow</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/85">
            <li>
              Server scripts run on a Rhino-derived engine. Lookbehind <code>(?&lt;=)</code> is
              unreliable on older instances — prefer capture groups.
            </li>
            <li>
              In XML condition strings (sys_dictionary defaults, UI Policy expressions), escape
              backslashes twice — <code>\\d</code> in JS becomes <code>\\\\d</code> in XML.
            </li>
            <li>
              <code>GlideElement.toString()</code> before <code>.match()</code> on server side or
              you may get <code>undefined</code> on empty fields.
            </li>
            <li>
              In inbound email actions, combine <code>email.subject</code> +{" "}
              <code>email.body_text</code> before matching so values in either place are caught.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to="/learn/scenario-based-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Scenario scripting
            </Link>
            <Link
              to="/learn/glideajax-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              GlideAjax guide
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
