import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow ACL Script Examples by Table and Operation";
const DESCRIPTION =
  "ServiceNow ACL script examples by table and operation: incident read/write, sc_request create, cmdb_ci delete, sys_user field ACLs, UI action execute — with the answer variable and pitfalls.";
const URL = "https://www.sparkcoder.online/guides/acl-script-examples";

interface Example {
  id: string;
  table: string;
  operation: string;
  scenario: string;
  code: string;
  why: string;
  pitfall: string;
}

const EXAMPLES: Example[] = [
  {
    id: "incident-read",
    table: "incident",
    operation: "read",
    scenario: "Only the assignee, the caller, or an admin may read an incident.",
    code: `answer = false;
var me = gs.getUserID();
if (gs.hasRole('admin')
    || current.assigned_to == me
    || current.caller_id == me) {
  answer = true;
}`,
    why: "Row-level read ACLs run per record, so keep them cheap — compare sys_ids already on `current`, never run a GlideRecord query here.",
    pitfall:
      "A read ACL that queries another table multiplies by list size and will time out on a 10k-row list view.",
  },
  {
    id: "incident-write-field",
    table: "incident.state",
    operation: "write (field level)",
    scenario: "Only itil users can move an incident out of New once it is assigned.",
    code: `answer = gs.hasRole('admin');
if (!answer && gs.hasRole('itil')) {
  answer = !current.assignment_group.nil();
}`,
    why: "Field ACLs (table.field) evaluate after the table-level ACL passes. Both must return true, so field ACLs only ever narrow access.",
    pitfall:
      "Denying at the field level does not deny the row. If the user must not see the record at all, write the rule on `incident` itself.",
  },
  {
    id: "sc-request-create",
    table: "sc_request",
    operation: "create",
    scenario: "Any authenticated, active user may raise a request; guests may not.",
    code: `answer = false;
if (gs.isLoggedIn() && !gs.getUser().isMemberOf('Blocked Requesters')) {
  answer = true;
}`,
    why: "On create, `current` is an empty record — field values are not reliable yet. Base the decision on the user, not on record data.",
    pitfall:
      "Reading `current.requested_for` in a create ACL returns an empty string, so conditions on it silently grant or deny for everyone.",
  },
  {
    id: "cmdb-ci-delete",
    table: "cmdb_ci",
    operation: "delete",
    scenario: "CIs must never be deleted by ITIL users — only by CMDB admins, and only when retired.",
    code: `answer = false;
if (gs.hasRole('cmdb_admin') && current.install_status == '7') {
  answer = true;
}`,
    why: "Delete ACLs on `cmdb_ci` inherit down every extended class, so one rule covers cmdb_ci_computer, cmdb_ci_server, and the rest.",
    pitfall:
      "Writing the ACL on the child class only (cmdb_ci_server) leaves every sibling class unprotected.",
  },
  {
    id: "sys-user-write",
    table: "sys_user.email",
    operation: "write (field level)",
    scenario: "Users may edit their own email; only user_admin may edit anyone else's.",
    code: `answer = gs.hasRole('user_admin')
       || current.sys_id == gs.getUserID();`,
    view: undefined as unknown as never,
    why: "Self-service ACLs compare the record's sys_id with the session user — the cheapest possible check and no query.",
    pitfall:
      "Comparing `current.user_name == gs.getUserName()` breaks when the user name changes; always compare sys_ids.",
  },
  {
    id: "ui-action-execute",
    table: "sys_ui_action (execute)",
    operation: "execute",
    scenario: "Only change managers may run the 'Force Close' UI action.",
    code: `answer = gs.hasRole('change_manager')
       && current.state != '3';`,
    why: "Execute-type ACLs guard UI actions, processors, and client-callable Script Includes. They gate the operation, not a row.",
    pitfall:
      "Hiding the button with a UI action condition is not security — without an execute ACL the endpoint is still callable.",
  },
  {
    id: "wildcard-star",
    table: "u_custom_table.*",
    operation: "read / write",
    scenario: "A custom table needs one rule covering every field except a sensitive one.",
    code: `// u_custom_table.* (wildcard)
answer = gs.hasRole('u_custom_reader');

// u_custom_table.u_ssn (specific, overrides the wildcard)
answer = gs.hasRole('u_custom_pii');`,
    why: "Evaluation order is most-specific first: table.field beats table.*, which beats table. The first matching ACL for that specificity level decides.",
    pitfall:
      "Assuming ACLs OR together across specificity levels. They do not — a specific field ACL that denies wins over a permissive wildcard.",
  },
  {
    id: "scripted-vs-condition",
    table: "any table",
    operation: "any",
    scenario: "When should the logic live in the Condition builder instead of the script?",
    code: `// Prefer this (condition field): assignment_group.manager = javascript:gs.getUserID()
// Script only for what conditions cannot express:
answer = new global.AclHelper().canEdit(current, gs.getUserID());`,
    why: "Conditions are indexed and evaluated in the query layer; scripts run per row in Rhino. Push filtering into the condition and keep the script for genuine logic.",
    pitfall:
      "A Script Include called from an ACL must be client-callable = false and should cache per-request, or you re-run the same query for every row.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: EXAMPLES.map((e) => ({
    "@type": "Question",
    name: `${e.table} (${e.operation}) — ${e.scenario}`,
    acceptedAnswer: { "@type": "Answer", text: `${e.why} Pitfall: ${e.pitfall}` },
  })),
};

export const Route = createFileRoute("/guides/acl-script-examples")({
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
    scripts: [{ type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) }],
  }),
  component: AclScriptExamplesGuide,
});

function AclScriptExamplesGuide() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Scripting Recipe · ACLs
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ACL SCRIPT EXAMPLES
            <br />
            <span className="text-accent">BY TABLE &amp; OPERATION.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Every ServiceNow ACL script does one job: assign{" "}
            <code className="font-mono text-accent">answer</code>. What changes is the
            table, the operation, and what is safe to read from{" "}
            <code className="font-mono">current</code> at that moment. Eight
            copy-ready examples below, each with the reason it is written that way and
            the mistake interviewers listen for.
          </p>
        </header>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Answer summary</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-foreground/85">
            <li>
              ACL scripts <strong>set</strong> <code className="font-mono">answer</code>;
              a <code className="font-mono">return</code> value is ignored.
            </li>
            <li>
              Order of evaluation is most specific first:{" "}
              <code className="font-mono">table.field</code> →{" "}
              <code className="font-mono">table.*</code> →{" "}
              <code className="font-mono">table</code>. All matching levels must pass.
            </li>
            <li>
              Roles, conditions and script all have to pass — they are ANDed, not ORed.
            </li>
            <li>
              On <em>create</em>, <code className="font-mono">current</code> is empty:
              decide from the user. On <em>read/write/delete</em>, decide from{" "}
              <code className="font-mono">current</code> without extra queries.
            </li>
            <li>
              Hierarchy tables (<code className="font-mono">cmdb_ci</code>,{" "}
              <code className="font-mono">task</code>) inherit ACLs down to every
              extended class — write the rule at the base.
            </li>
          </ul>
        </section>

        <ol className="space-y-6 list-none">
          {EXAMPLES.map((e) => (
            <li key={e.id}>
              <article className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md border border-accent/50 bg-accent/10 text-accent font-mono text-[11px]">
                    {e.table}
                  </span>
                  <span className="px-2 py-0.5 rounded-md border border-border text-[11px] uppercase tracking-wider font-display">
                    {e.operation}
                  </span>
                </div>
                <h2 className="font-display text-xl tracking-tight">{e.scenario}</h2>
                <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                  <code>{e.code}</code>
                </pre>
                <p className="text-sm text-foreground/85">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mr-2">
                    Why
                  </span>
                  {e.why}
                </p>
                <p className="text-sm text-foreground/85 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mr-2">
                    Pitfall
                  </span>
                  {e.pitfall}
                </p>
              </article>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Keep going</h2>
          <p className="text-sm text-foreground/85">
            ACL scripts lean on the same GlideRecord fundamentals — reference fields,
            dot-walking, and query cost. These two guides pair directly with this one.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn/acl-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20"
            >
              ACL scripting guide
            </Link>
            <Link
              to="/guides/gliderecord-query-reference-field"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Query a reference field
            </Link>
            <Link
              to="/learn/scenario-based-scripting"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Scenario scripting
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
