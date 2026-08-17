import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { useMemo, useState } from "react";

const TITLE = "ServiceNow Encoded Query Builder — GlideRecord Generator";
const DESCRIPTION =
  "Free ServiceNow encoded query builder: pick fields, operators and values, get a valid sysparm_query plus copy-ready GlideRecord, GlideAggregate and REST snippets.";
const URL = "https://www.sparkcoder.online/tools/servicenow-encoded-query-builder";

interface Operator {
  id: string;
  label: string;
  suffix: string;
  valueless?: boolean;
}

const OPERATORS: Operator[] = [
  { id: "eq", label: "is", suffix: "=" },
  { id: "ne", label: "is not", suffix: "!=" },
  { id: "like", label: "contains", suffix: "LIKE" },
  { id: "notlike", label: "does not contain", suffix: "NOT LIKE" },
  { id: "startswith", label: "starts with", suffix: "STARTSWITH" },
  { id: "endswith", label: "ends with", suffix: "ENDSWITH" },
  { id: "gt", label: "greater than", suffix: ">" },
  { id: "lt", label: "less than", suffix: "<" },
  { id: "gte", label: "greater or equal", suffix: ">=" },
  { id: "lte", label: "less or equal", suffix: "<=" },
  { id: "in", label: "is one of (comma list)", suffix: "IN" },
  { id: "notin", label: "is not one of", suffix: "NOT IN" },
  { id: "isempty", label: "is empty", suffix: "ISEMPTY", valueless: true },
  { id: "isnotempty", label: "is not empty", suffix: "ISNOTEMPTY", valueless: true },
  { id: "isanything", label: "is anything", suffix: "ANYTHING", valueless: true },
];

interface Row {
  key: number;
  join: "AND" | "OR";
  field: string;
  op: string;
  value: string;
}

const TABLES = [
  { id: "incident", label: "incident" },
  { id: "change_request", label: "change_request" },
  { id: "sc_req_item", label: "sc_req_item" },
  { id: "task", label: "task" },
  { id: "cmdb_ci", label: "cmdb_ci" },
  { id: "sys_user", label: "sys_user" },
  { id: "sys_user_group", label: "sys_user_group" },
];

const FIELD_HINTS: Record<string, string[]> = {
  incident: ["active", "state", "priority", "assignment_group", "caller_id", "short_description", "sys_created_on"],
  change_request: ["state", "type", "risk", "approval", "start_date", "assigned_to"],
  sc_req_item: ["state", "stage", "cat_item", "request", "approval"],
  task: ["active", "state", "assigned_to", "opened_at", "sys_domain"],
  cmdb_ci: ["operational_status", "install_status", "sys_class_name", "name", "support_group"],
  sys_user: ["active", "email", "department", "company", "user_name"],
  sys_user_group: ["active", "name", "manager", "type"],
};

const PRESETS: { name: string; table: string; rows: Omit<Row, "key">[] }[] = [
  {
    name: "Active P1 incidents",
    table: "incident",
    rows: [
      { join: "AND", field: "active", op: "eq", value: "true" },
      { join: "AND", field: "priority", op: "eq", value: "1" },
    ],
  },
  {
    name: "Unassigned open tasks",
    table: "task",
    rows: [
      { join: "AND", field: "active", op: "eq", value: "true" },
      { join: "AND", field: "assigned_to", op: "isempty", value: "" },
    ],
  },
  {
    name: "Incidents in a state list",
    table: "incident",
    rows: [{ join: "AND", field: "state", op: "in", value: "1,2,3" }],
  },
  {
    name: "CIs not operational",
    table: "cmdb_ci",
    rows: [{ join: "AND", field: "operational_status", op: "ne", value: "1" }],
  },
  {
    name: "Opened in last 7 days",
    table: "incident",
    rows: [
      { join: "AND", field: "sys_created_on", op: "gte", value: "javascript:gs.daysAgoStart(7)" },
    ],
  },
];

function encodeRows(rows: Row[]): string {
  const parts: string[] = [];
  rows.forEach((r, i) => {
    if (!r.field.trim()) return;
    const op = OPERATORS.find((o) => o.id === r.op) ?? OPERATORS[0];
    const term = op.valueless
      ? `${r.field.trim()}${op.suffix}`
      : `${r.field.trim()}${op.suffix}${r.value.trim()}`;
    if (parts.length === 0) parts.push(term);
    else parts.push((r.join === "OR" ? "^OR" : "^") + term);
    void i;
  });
  return parts.join("");
}

function grSnippet(table: string, query: string): string {
  return `var gr = new GlideRecord('${table}');
gr.addEncodedQuery('${query || "active=true"}');
gr.query();
while (gr.next()) {
  gs.info(gr.getValue('number') + ' → ' + gr.getDisplayValue('state'));
}`;
}

function aggSnippet(table: string, query: string): string {
  return `var ga = new GlideAggregate('${table}');
ga.addEncodedQuery('${query || "active=true"}');
ga.addAggregate('COUNT');
ga.groupBy('assignment_group');
ga.query();
while (ga.next()) {
  gs.info(ga.getDisplayValue('assignment_group') + ': ' + ga.getAggregate('COUNT'));
}`;
}

function restSnippet(table: string, query: string): string {
  return `GET /api/now/table/${table}
  ?sysparm_query=${encodeURIComponent(query || "active=true")}
  &sysparm_fields=number,short_description,state
  &sysparm_limit=100`;
}

const APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SparkCoder ServiceNow Encoded Query Builder",
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
      name: "What is an encoded query in ServiceNow?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An encoded query is the string form of a filter, e.g. active=true^priority=1. It is what appears after sysparm_query in URLs and REST calls, and what you pass to GlideRecord.addEncodedQuery().",
      },
    },
    {
      "@type": "Question",
      name: "How do I write an OR condition in an encoded query?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Separate AND conditions with ^ and OR conditions with ^OR. For example active=true^priority=1^ORpriority=2 means active AND (priority 1 OR priority 2).",
      },
    },
    {
      "@type": "Question",
      name: "How do I get an encoded query from a ServiceNow list?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Filter the list, then right-click the filter breadcrumb and choose Copy query. You can paste it back into this builder or straight into addEncodedQuery().",
      },
    },
    {
      "@type": "Question",
      name: "Can encoded queries use relative dates?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Use javascript: expressions such as sys_created_on>=javascript:gs.daysAgoStart(7) or gs.beginningOfLastMonth() for relative date windows.",
      },
    },
  ],
};

export const Route = createFileRoute("/tools/servicenow-encoded-query-builder")({
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
      { type: "application/ld+json", children: JSON.stringify(APP_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
    ],
  }),
  component: QueryBuilder,
});

type SnippetTab = "gr" | "agg" | "rest";

let keySeed = 100;

function QueryBuilder() {
  const { progress } = useProgress();
  const [table, setTable] = useState("incident");
  const [rows, setRows] = useState<Row[]>([
    { key: 1, join: "AND", field: "active", op: "eq", value: "true" },
    { key: 2, join: "AND", field: "priority", op: "eq", value: "1" },
  ]);
  const [orderBy, setOrderBy] = useState("");
  const [orderDesc, setOrderDesc] = useState(false);
  const [snippetTab, setSnippetTab] = useState<SnippetTab>("gr");
  const [copied, setCopied] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");

  const query = useMemo(() => {
    let q = encodeRows(rows);
    if (orderBy.trim()) {
      q += `${q ? "^" : ""}ORDERBY${orderDesc ? "DESC" : ""}${orderBy.trim()}`;
    }
    return q;
  }, [rows, orderBy, orderDesc]);

  const snippet =
    snippetTab === "gr"
      ? grSnippet(table, query)
      : snippetTab === "agg"
        ? aggSnippet(table, query)
        : restSnippet(table, query);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow(join: "AND" | "OR") {
    setRows((rs) => [...rs, { key: ++keySeed, join, field: "", op: "eq", value: "" }]);
  }

  function removeRow(key: number) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }

  function loadPreset(p: (typeof PRESETS)[number]) {
    setTable(p.table);
    setRows(p.rows.map((r) => ({ ...r, key: ++keySeed })));
    setOrderBy("");
    setOrderDesc(false);
  }

  function importQuery() {
    const raw = pasted.trim();
    if (!raw) return;
    const terms = raw.split(/\^(?=OR|NQ|ORDERBY|[^^]*$)|\^/).filter(Boolean);
    const next: Row[] = [];
    for (const rawTerm of terms) {
      let term = rawTerm;
      let join: "AND" | "OR" = "AND";
      if (term.startsWith("OR") && !term.startsWith("ORDERBY")) {
        join = "OR";
        term = term.slice(2);
      }
      if (term.startsWith("ORDERBY")) {
        const desc = term.startsWith("ORDERBYDESC");
        setOrderDesc(desc);
        setOrderBy(term.slice(desc ? 11 : 7));
        continue;
      }
      const op = [...OPERATORS]
        .sort((a, b) => b.suffix.length - a.suffix.length)
        .find((o) => term.includes(o.suffix));
      if (!op) continue;
      const idx = term.indexOf(op.suffix);
      next.push({
        key: ++keySeed,
        join,
        field: term.slice(0, idx),
        op: op.id,
        value: term.slice(idx + op.suffix.length),
      });
    }
    if (next.length) setRows(next);
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  }

  const fields = FIELD_HINTS[table] ?? [];

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
            ENCODED QUERY
            <br />
            <span className="text-accent">BUILDER.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Build a valid ServiceNow encoded query without guessing operators. Pick a table, stack
            AND/OR conditions, and copy the string straight into{" "}
            <code>addEncodedQuery()</code>, a GlideAggregate report, or a{" "}
            <code>sysparm_query</code> REST call. Everything runs in your browser — nothing is sent
            anywhere.
          </p>
        </header>

        <section aria-label="Presets" className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">Presets</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                className="h-9 px-3 rounded-lg border-2 border-border bg-panel text-xs font-mono hover:border-accent/60 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section
          aria-label="Query conditions"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-4"
        >
          <label className="space-y-1.5 block max-w-xs">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              Table
            </span>
            <input
              value={table}
              onChange={(e) => setTable(e.target.value)}
              list="sc-tables"
              spellCheck={false}
              aria-label="Table name"
              className="w-full rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
            />
            <datalist id="sc-tables">
              {TABLES.map((t) => (
                <option key={t.id} value={t.id} />
              ))}
            </datalist>
          </label>

          <datalist id="sc-fields">
            {fields.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

          <div className="space-y-2">
            {rows.map((r, i) => {
              const op = OPERATORS.find((o) => o.id === r.op) ?? OPERATORS[0];
              return (
                <div key={r.key} className="grid gap-2 sm:grid-cols-[64px_1fr_150px_1fr_40px]">
                  {i === 0 ? (
                    <span className="text-[11px] font-mono text-muted-foreground flex items-center">
                      WHERE
                    </span>
                  ) : (
                    <select
                      value={r.join}
                      onChange={(e) => update(r.key, { join: e.target.value as "AND" | "OR" })}
                      aria-label={`Join for condition ${i + 1}`}
                      className="rounded-lg border-2 border-border bg-background font-mono text-[11px] px-1 outline-none"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                  )}
                  <input
                    value={r.field}
                    onChange={(e) => update(r.key, { field: e.target.value })}
                    list="sc-fields"
                    placeholder="field"
                    spellCheck={false}
                    aria-label={`Field for condition ${i + 1}`}
                    className="rounded-lg border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
                  />
                  <select
                    value={r.op}
                    onChange={(e) => update(r.key, { op: e.target.value })}
                    aria-label={`Operator for condition ${i + 1}`}
                    className="rounded-lg border-2 border-border bg-background font-mono text-xs py-2 px-2 outline-none"
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={op.valueless ? "" : r.value}
                    disabled={op.valueless}
                    onChange={(e) => update(r.key, { value: e.target.value })}
                    placeholder={op.valueless ? "—" : "value"}
                    spellCheck={false}
                    aria-label={`Value for condition ${i + 1}`}
                    className="rounded-lg border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none disabled:opacity-40"
                  />
                  <button
                    onClick={() => removeRow(r.key)}
                    aria-label={`Remove condition ${i + 1}`}
                    className="rounded-lg border-2 border-border bg-background text-sm hover:border-destructive/60"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => addRow("AND")}
              className="h-9 px-3 rounded-lg border-2 border-border bg-background text-[11px] font-display uppercase tracking-wider hover:border-accent/60"
            >
              + AND condition
            </button>
            <button
              onClick={() => addRow("OR")}
              className="h-9 px-3 rounded-lg border-2 border-border bg-background text-[11px] font-display uppercase tracking-wider hover:border-accent/60"
            >
              + OR condition
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-end">
            <label className="space-y-1.5 block">
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                Order by (optional)
              </span>
              <input
                value={orderBy}
                onChange={(e) => setOrderBy(e.target.value)}
                list="sc-fields"
                placeholder="sys_created_on"
                spellCheck={false}
                className="w-full rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
              />
            </label>
            <button
              onClick={() => setOrderDesc((v) => !v)}
              aria-pressed={orderDesc}
              className="h-10 px-3 rounded-xl border-2 border-border bg-background text-[11px] font-display uppercase tracking-wider hover:border-accent/60"
            >
              {orderDesc ? "Descending" : "Ascending"}
            </button>
          </div>
        </section>

        <section aria-label="Encoded query output" className="space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Encoded query
          </h2>
          <div className="rounded-xl border-2 border-accent/40 bg-background p-3 font-mono text-sm break-all">
            {query || "(empty — add a condition)"}
          </div>
          <button
            onClick={() => copy(query, "query")}
            className="h-10 px-4 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20 transition-colors"
          >
            {copied === "query" ? "Copied!" : "Copy encoded query"}
          </button>
        </section>

        <section
          aria-label="Import an existing query"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
        >
          <h2 className="font-display text-xl tracking-tight">Paste a query from a list filter</h2>
          <p className="text-sm text-foreground/80">
            In an instance, right-click the filter breadcrumb and choose <em>Copy query</em>, then
            paste it here to edit the conditions visually.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="active=true^priority=1^ORpriority=2"
              spellCheck={false}
              aria-label="Encoded query to import"
              className="rounded-xl border-2 border-border bg-background font-mono text-sm py-2 px-3 outline-none"
            />
            <button
              onClick={importQuery}
              className="h-10 px-4 rounded-xl border-2 border-border bg-background font-display tracking-wider text-xs uppercase hover:border-accent/60"
            >
              Import
            </button>
          </div>
        </section>

        <section
          aria-label="Generated snippets"
          className="rounded-2xl border-2 border-border bg-panel p-5 space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-xl tracking-tight">Copy into ServiceNow</h2>
            <div className="inline-flex rounded-lg border-2 border-border overflow-hidden text-[11px] font-display uppercase tracking-wider">
              {(
                [
                  ["gr", "GlideRecord"],
                  ["agg", "GlideAggregate"],
                  ["rest", "REST"],
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
          <h2 className="font-display text-xl tracking-tight">Encoded query syntax cheat sheet</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-foreground/85">
            <li>
              <code>^</code> joins conditions with AND, <code>^OR</code> with OR, and{" "}
              <code>^NQ</code> starts a brand new query (a true OR of two whole filters).
            </li>
            <li>
              Dot-walk reference fields: <code>assignment_group.manager.active=true</code>.
            </li>
            <li>
              Relative dates use <code>javascript:</code> —{" "}
              <code>sys_created_on&gt;=javascript:gs.daysAgoStart(7)</code>.
            </li>
            <li>
              <code>IN</code> takes a comma list with no spaces: <code>state IN 1,2,3</code> becomes{" "}
              <code>stateIN1,2,3</code>.
            </li>
            <li>
              Prefer <code>addEncodedQuery()</code> for filters copied from lists, and{" "}
              <code>addQuery()</code> when values come from variables so they are escaped for you.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              to="/tools/servicenow-regex-tester"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Regex tester
            </Link>
            <Link
              to="/guides/gliderecord-query-reference-field"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Reference-field queries
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "gliderecord" }}
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              GlideRecord puzzles
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
