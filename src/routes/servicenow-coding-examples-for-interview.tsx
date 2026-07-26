import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "ServiceNow Coding Examples for Interview (20 Worked Answers)";
const DESCRIPTION =
  "20 ServiceNow coding examples for interviews: GlideRecord, GlideAggregate, Business Rules, Client Scripts, GlideAjax with working scripts, explanations, and alternate approaches.";
const URL = "https://www.sparkcoder.online/servicenow-coding-examples-for-interview";

interface Example {
  id: string;
  title: string;
  prompt: string;
  code: string;
  explain: string;
  alt: string;
}

const EXAMPLES: Example[] = [
  {
    id: "gr-basic-query",
    title: "1. Query active P1 incidents",
    prompt: "Write a script to log the number of active P1 incidents.",
    code: `var gr = new GlideRecord('incident');
gr.addActiveQuery();
gr.addQuery('priority', 1);
gr.query();
gs.info('Active P1: ' + gr.getRowCount());`,
    explain:
      "addActiveQuery() is shorthand for active=true. getRowCount() returns the matched count without iterating.",
    alt: "Use GlideAggregate('incident') with addAggregate('COUNT') for a single DB call instead of loading rows.",
  },
  {
    id: "gr-update-loop",
    title: "2. Reassign stale incidents",
    prompt: "Reassign incidents in New state older than 7 days to a fallback group.",
    code: `var gr = new GlideRecord('incident');
gr.addQuery('state', 1);
gr.addQuery('sys_created_on', '<', gs.daysAgoStart(7));
gr.query();
while (gr.next()) {
  gr.assignment_group = 'fallback_group_sys_id';
  gr.update();
}`,
    explain:
      "gs.daysAgoStart(7) returns a GlideDateTime 7 days back at 00:00 in system TZ, perfect for boundary queries.",
    alt: "Use gr.setValue() + gr.updateMultiple() outside the loop for a single UPDATE — but you lose per-row Business Rules.",
  },
  {
    id: "aggregate-count",
    title: "3. Count by category (GlideAggregate)",
    prompt: "Group incidents by category and log each count.",
    code: `var ga = new GlideAggregate('incident');
ga.addAggregate('COUNT');
ga.groupBy('category');
ga.query();
while (ga.next()) {
  gs.info(ga.category + ': ' + ga.getAggregate('COUNT'));
}`,
    explain:
      "GlideAggregate pushes the GROUP BY to the DB — vastly faster than iterating with GlideRecord and counting in JS.",
    alt: "For a single category, use addAggregate('COUNT') + addQuery('category', X) without groupBy.",
  },
  {
    id: "before-br",
    title: "4. Before Business Rule: derive short_description",
    prompt: "On insert, prefix short_description with the caller's company name.",
    code: `(function executeRule(current, previous) {
  var company = current.caller_id.company.getDisplayValue();
  if (company) current.short_description = '[' + company + '] ' + current.short_description;
})(current, previous);`,
    explain:
      "In a before-BR, mutate current.* directly — the framework saves the row. Never call current.update() here (recursion).",
    alt: "Use a Data Policy for cross-scope enforcement, or a Flow Designer subflow if non-devs must maintain the rule.",
  },
  {
    id: "client-onchange",
    title: "5. Client Script: onChange visibility",
    prompt: "Hide 'resolution_code' unless state is Resolved.",
    code: `function onChange(control, oldValue, newValue, isLoading) {
  if (isLoading || newValue === '') return;
  g_form.setDisplay('resolution_code', newValue === '6');
}`,
    explain:
      "isLoading guards against form-load firing the change handler with the initial value. setDisplay removes the field from the DOM.",
    alt: "Prefer a UI Policy — declarative, easier to maintain, and evaluates without a round trip.",
  },
  {
    id: "glideajax",
    title: "6. GlideAjax: fetch manager name",
    prompt: "From a client script, get the manager display name of the selected user.",
    code: `var ga = new GlideAjax('UserUtils');
ga.addParam('sysparm_name', 'getManager');
ga.addParam('sysparm_user', g_form.getValue('caller_id'));
ga.getXMLAnswer(function(answer) {
  g_form.setValue('u_manager_name', answer);
});`,
    explain:
      "getXMLAnswer is async and returns just the 'answer' attribute — the recommended non-blocking pattern.",
    alt: "For read-only reference data, use GlideRecord in the client (deprecated) or a scripted REST resource for cross-domain calls.",
  },
  {
    id: "script-include",
    title: "7. Client-callable Script Include",
    prompt: "Return the manager sys_id for a given user, called from GlideAjax.",
    code: `var UserUtils = Class.create();
UserUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
  getManager: function() {
    var u = new GlideRecord('sys_user');
    if (u.get(this.getParameter('sysparm_user'))) return u.getValue('manager');
    return '';
  },
  type: 'UserUtils'
});`,
    explain:
      "Extending AbstractAjaxProcessor gives you getParameter() and the ajax framework binding. Mark 'Client callable'.",
    alt: "For server-only reuse, drop AbstractAjaxProcessor and use a plain object with static helpers.",
  },
  {
    id: "encoded-query",
    title: "8. Encoded query with OR",
    prompt: "Find incidents where priority is 1 OR assignment_group is empty.",
    code: `var gr = new GlideRecord('incident');
gr.addEncodedQuery('priority=1^ORassignment_groupISEMPTY');
gr.query();
gs.info(gr.getRowCount());`,
    explain:
      "Encoded queries mirror list filter URLs exactly — grab one from a filtered list view and paste it in.",
    alt: "Chain addQuery + addOrCondition programmatically when parts of the filter come from variables.",
  },
  {
    id: "date-diff",
    title: "9. Business duration between two dates",
    prompt: "Log business hours between opened_at and resolved_at on an incident.",
    code: `var start = new GlideDateTime(current.opened_at);
var end = new GlideDateTime(current.resolved_at);
var schedule = new GlideSchedule('08fcd0830a0a0b2600079f56b1adb9ae'); // 8-5 weekdays
var dur = schedule.duration(start, end);
gs.info('Business ms: ' + dur.getNumericValue());`,
    explain:
      "GlideSchedule.duration honors working hours and holidays. Numeric value is ms; divide by 3.6e6 for hours.",
    alt: "Use gs.calDateDiff(startStr, endStr, false) for a quick wall-clock diff when schedules don't matter.",
  },
  {
    id: "rest-outbound",
    title: "10. Outbound REST with error handling",
    prompt: "POST a payload to a vendor endpoint and log the response body.",
    code: `try {
  var r = new sn_ws.RESTMessageV2('Vendor', 'createTicket');
  r.setStringParameterNoEscape('payload', JSON.stringify({ id: current.number + '' }));
  var resp = r.execute();
  if (resp.haveError()) gs.error('Vendor error: ' + resp.getErrorMessage());
  else gs.info(resp.getBody());
} catch (e) {
  gs.error('REST exception: ' + e.message);
}`,
    explain:
      "haveError() catches HTTP-level failures; try/catch catches transport failures. Log both — silent failures are the #1 integration bug.",
    alt: "For fire-and-forget, use executeAsync() + a response processor script to keep the transaction fast.",
  },
  {
    id: "scoped-cross",
    title: "11. Cross-scope call",
    prompt: "From a scoped app, call a public Script Include in the global scope.",
    code: `var util = new global.GlobalUtils();
var result = util.getConfig('billing_endpoint');
gs.info(result);`,
    explain:
      "Prefix with 'global.' when accessing global-scope Script Includes; the include must be marked 'Accessible from All application scopes'.",
    alt: "Expose the value via a system property and read with gs.getProperty() — no scope negotiation needed.",
  },
  {
    id: "fix-script-dedupe",
    title: "12. Fix script: dedupe user emails",
    prompt: "Deactivate duplicate sys_user records sharing the same email, keeping the oldest.",
    code: `var seen = {};
var gr = new GlideRecord('sys_user');
gr.addActiveQuery();
gr.orderBy('sys_created_on');
gr.query();
while (gr.next()) {
  var email = (gr.email + '').toLowerCase();
  if (!email) continue;
  if (seen[email]) {
    gr.active = false;
    gr.update();
  } else {
    seen[email] = true;
  }
}`,
    explain:
      "orderBy ensures the earliest record wins. Lowercasing avoids false positives from mixed-case emails.",
    alt: "Use GlideAggregate to first list emails with COUNT>1, then only iterate those — faster on large tables.",
  },
  {
    id: "scheduled-job",
    title: "13. Scheduled Job: close stale approvals",
    prompt: "Nightly, reject sysapproval_approver rows waiting > 14 days.",
    code: `var gr = new GlideRecord('sysapproval_approver');
gr.addQuery('state', 'requested');
gr.addQuery('sys_created_on', '<', gs.daysAgoStart(14));
gr.query();
while (gr.next()) {
  gr.state = 'rejected';
  gr.comments = 'Auto-rejected after 14 days.';
  gr.update();
}`,
    explain:
      "Scheduled Scripts run as system — no ACL restrictions. Keep them idempotent so re-runs are safe.",
    alt: "Fire a custom event per row via gs.eventQueue() and let a script action + notification handle it asynchronously.",
  },
  {
    id: "ui-action",
    title: "14. UI Action: escalate to P1",
    prompt: "Add a form button that sets priority=1 and comments 'Escalated by <user>'.",
    code: `// UI Action, Client=false, Condition: current.priority > 1
current.priority = 1;
current.comments = 'Escalated by ' + gs.getUserDisplayName();
current.update();
action.setRedirectURL(current);`,
    explain:
      "Server UI Actions run in the same transaction as the record; action.setRedirectURL reloads the same form to show updates.",
    alt: "Split into a client UI Action that shows a GlideModal confirmation, then calls a Script Include via GlideAjax.",
  },
  {
    id: "catalog-client",
    title: "15. Catalog Client Script: dynamic default",
    prompt: "On a catalog item load, default 'department' to the requester's department.",
    code: `function onLoad() {
  var ga = new GlideAjax('CatalogUtils');
  ga.addParam('sysparm_name', 'getRequesterDept');
  ga.getXMLAnswer(function(answer) {
    if (answer) g_form.setValue('department', answer);
  });
}`,
    explain:
      "Catalog Client Scripts run in Service Portal and native UI. Use GlideAjax — g_user has limited fields.",
    alt: "Set the default via a catalog variable's 'Default value' script — no client-side call needed.",
  },
  {
    id: "async-event",
    title: "16. Event + Script Action",
    prompt: "When an incident closes, queue an event that pushes a Slack notification.",
    code: `// After-BR on incident, when state changes to Closed
gs.eventQueue('incident.closed', current, current.assigned_to + '', current.number + '');

// Script Action listening on 'incident.closed'
(function(event) {
  var r = new sn_ws.RESTMessageV2('Slack', 'post');
  r.setStringParameterNoEscape('text', 'Incident ' + event.parm2 + ' closed');
  r.execute();
})(event);`,
    explain:
      "Pass sys_ids and primitives in parm1/parm2 — GlideRecord references stringify unpredictably.",
    alt: "Use Flow Designer with a Slack Spoke — non-devs can maintain the flow, no BR change required.",
  },
  {
    id: "acl-script",
    title: "17. ACL condition script",
    prompt: "Allow read on 'incident' only if the caller_id.company matches the current user's company.",
    code: `answer = false;
if (current.caller_id.company + '' === gs.getUser().getCompanyID()) {
  answer = true;
}`,
    explain:
      "ACL script assigns to 'answer'. Coerce sys_ids with + '' to strings so === works.",
    alt: "Use a 'contains' query business rule on a data-driven role, or leverage Domain Separation instead of scripting ACLs.",
  },
  {
    id: "workflow-scratchpad",
    title: "18. Workflow scratchpad handoff",
    prompt: "In a workflow run script, stash a value the next activity will read.",
    code: `// Run Script activity
workflow.scratchpad.approvers = getApprovers(current);

// Next 'If' activity
answer = workflow.scratchpad.approvers.length > 0 ? 'yes' : 'no';`,
    explain:
      "workflow.scratchpad persists for the lifetime of the context — cleaner than stashing on the record.",
    alt: "Persist state on the parent record with a hidden field if the workflow may be replayed after a fault.",
  },
  {
    id: "gliderecord-secure",
    title: "19. GlideRecordSecure for ACL-aware reads",
    prompt: "In a Script Include callable from portal, return incidents the current user can actually see.",
    code: `var gr = new GlideRecordSecure('incident');
gr.addActiveQuery();
gr.query();
var out = [];
while (gr.next()) out.push(gr.getValue('number'));
return out;`,
    explain:
      "GlideRecordSecure applies ACLs; regular GlideRecord bypasses them when called from a system-privileged context.",
    alt: "Use a scripted REST resource with 'Requires ACL' checked — the framework enforces ACLs on the endpoint itself.",
  },
  {
    id: "json-parse",
    title: "20. Parse inbound JSON payload",
    prompt: "In a scripted REST POST, read a JSON body and create incidents.",
    code: `(function process(request, response) {
  var body = request.body.data; // parsed JSON
  var items = Array.isArray(body) ? body : [body];
  var created = [];
  items.forEach(function(item) {
    var gr = new GlideRecord('incident');
    gr.initialize();
    gr.short_description = item.title;
    gr.caller_id = item.caller;
    created.push(gr.insert());
  });
  return { created: created };
})(request, response);`,
    explain:
      "request.body.data is already parsed. Normalize to an array so single-item and batch requests share one code path.",
    alt: "For high-volume ingest, insert rows via the Import Set API + a transform map — offloads validation to platform.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: EXAMPLES.map((e) => ({
    "@type": "Question",
    name: e.prompt,
    acceptedAnswer: { "@type": "Answer", text: `${e.explain} Alternate approach: ${e.alt}` },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow Coding Examples for Interview",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-26",
  dateModified: "2026-07-26",
  author: { "@type": "Organization", name: "SparkCoder", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder", url: "https://www.sparkcoder.online" },
  about: "ServiceNow scripting interview examples",
};

export const Route = createFileRoute("/servicenow-coding-examples-for-interview")({
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
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
    ],
  }),
  component: Page,
});

function Page() {
  const { progress } = useProgress();
  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>
      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · Worked Examples
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            SERVICENOW CODING
            <br />
            <span className="text-accent">EXAMPLES FOR INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Twenty real ServiceNow scripting problems pulled from live interview loops — each with
            a working script, a plain-English explanation, and an alternate approach a senior
            interviewer expects you to know. Skim before the call, or drill each in the{" "}
            <Link to="/live-coding" className="text-accent underline">
              live coding simulator
            </Link>
            .
          </p>
        </header>

        <ol className="space-y-6">
          {EXAMPLES.map((e) => (
            <li
              key={e.id}
              id={e.id}
              className="rounded-2xl border-2 border-border bg-panel overflow-hidden animate-fade-in"
            >
              <article className="p-5 space-y-4">
                <h2 className="font-display text-xl tracking-tight">{e.title}</h2>
                <p className="text-sm text-foreground/85 italic">“{e.prompt}”</p>

                <section aria-label="Reference script">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    Script
                  </h3>
                  <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                    <code>{e.code}</code>
                  </pre>
                </section>

                <section aria-label="Explanation">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-1">
                    Why it works
                  </h3>
                  <p className="text-sm text-foreground/85">{e.explain}</p>
                </section>

                <section
                  aria-label="Alternate approach"
                  className="rounded-xl border border-primary/40 bg-primary/5 p-3"
                >
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold mb-1">
                    Alternate approach
                  </h3>
                  <p className="text-sm text-foreground/85">{e.alt}</p>
                </section>
              </article>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Practice these live</h2>
          <p className="text-sm text-foreground/85">
            Drill 2,000+ variants with instant validation and alternative-approach hints.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/live-coding"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20"
            >
              Open simulator
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
