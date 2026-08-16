/**
 * Curated, indexable ServiceNow / ITSM glossary terms for the /glossary hub and
 * the /glossary/$slug term pages. Separate from src/lib/glossary.ts (which powers
 * the in-app Learn quizzes) because these entries carry SEO-facing fields:
 * definition, example, why-it-matters, related routes and interview angle.
 */

export interface GlossaryLink {
  label: string;
  to: string;
  params?: Record<string, string>;
}

export interface GlossaryEntry {
  slug: string;
  term: string;
  /** Short synonyms / expansions searchers type instead of the term itself. */
  aka: string[];
  category: "ITSM" | "CMDB" | "Platform" | "Automation" | "Integration";
  emoji: string;
  /** One-sentence, quotable definition — used as the answer summary. */
  definition: string;
  /** 2-3 sentences of practical context. */
  detail: string;
  /** Concrete example: a table, a record flow, or a snippet. */
  example: string;
  /** Optional short code sample rendered in a <pre>. */
  code?: string;
  /** What an interviewer is really checking when they ask about this. */
  interviewAngle: string;
  links: GlossaryLink[];
}

export const GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    slug: "incident",
    term: "Incident",
    aka: ["incident management", "incident record", "ServiceNow incident"],
    category: "ITSM",
    emoji: "🎫",
    definition:
      "An Incident is an unplanned interruption or reduction in quality of an IT service, tracked on the incident table so service can be restored as fast as possible.",
    detail:
      "The incident table extends task, so it inherits assignment, state, work notes and SLA behaviour. Priority is not typed in by hand — it is derived from Impact x Urgency through the priority lookup rules. Restoring service is the goal; finding the root cause belongs to Problem.",
    example:
      "A user cannot reach the VPN. Service desk raises INC0012345 on the incident table, sets Impact 2 / Urgency 2 (Priority 3 - Moderate), assigns it to Network Support, and resolves it once the tunnel is back.",
    interviewAngle:
      "Panels check whether you keep Incident, Problem and Change separate, and whether you know priority is calculated rather than entered.",
    links: [
      { label: "ITSM glossary & quiz", to: "/learn/$topic", params: { topic: "itsm" } },
      { label: "ITSM interview questions", to: "/learn/itsm-interview-questions" },
    ],
  },
  {
    slug: "problem",
    term: "Problem",
    aka: ["problem management", "known error", "root cause record"],
    category: "ITSM",
    emoji: "🔍",
    definition:
      "A Problem is the record that tracks the underlying cause of one or more incidents, so the fault can be removed permanently instead of repeatedly worked around.",
    detail:
      "Problems link back to the incidents they explain. A Problem with a documented workaround but no permanent fix is a Known Error. The permanent fix itself is delivered through a Change, which is why the three record types stay separate.",
    example:
      "Twenty VPN incidents in a week point at one faulty concentrator. PRB0001234 records the root cause, the workaround (use the secondary gateway) goes on the Known Error, and CHG0004567 replaces the hardware.",
    interviewAngle:
      "Interviewers listen for the Incident -> Problem -> Change hand-off and for the distinction between workaround and permanent fix.",
    links: [
      { label: "ITSM glossary & quiz", to: "/learn/$topic", params: { topic: "itsm" } },
      { label: "ITSM interview questions", to: "/learn/itsm-interview-questions" },
    ],
  },
  {
    slug: "change-request",
    term: "Change Request",
    aka: ["change management", "CHG record", "CAB approval"],
    category: "ITSM",
    emoji: "🛠️",
    definition:
      "A Change Request is a controlled record for adding, modifying or removing anything that could affect a live IT service, carrying risk assessment, approvals and an implementation window.",
    detail:
      "ServiceNow ships three types: Standard (pre-approved from a template), Normal (risk-assessed and CAB-approved) and Emergency (fast-tracked, approved retrospectively where policy allows). Change conflicts and blackout schedules are checked against the planned start and end dates.",
    example:
      "Patching a production database is raised as a Normal change, scored medium risk, approved by CAB, and scheduled inside the Sunday 02:00-04:00 maintenance window.",
    interviewAngle:
      "Expect to name the three change types and to explain when Emergency is legitimate rather than a process shortcut.",
    links: [
      { label: "ITSM glossary & quiz", to: "/learn/$topic", params: { topic: "itsm" } },
      { label: "CSA interview questions", to: "/servicenow-csa-interview-questions-2026" },
    ],
  },
  {
    slug: "sla",
    term: "SLA (Service Level Agreement)",
    aka: ["service level agreement", "SLA definition", "task SLA"],
    category: "ITSM",
    emoji: "⏱️",
    definition:
      "An SLA is a committed target — such as resolve a P1 within four hours — enforced in ServiceNow by an SLA Definition that attaches a timer to a task and tracks elapsed, remaining and breached time.",
    detail:
      "An SLA Definition has a start condition, optional pause conditions, and a stop condition, and it counts time against a Schedule so out-of-hours time is excluded. Each attachment creates a Task SLA record; that is where the percentage and breach flag live.",
    example:
      "'Priority 1 resolution' starts when priority = 1 and state != Resolved, pauses while state = Awaiting Caller, stops on Resolved, and runs against the 24x7 schedule.",
    interviewAngle:
      "The usual probe is pause conditions and schedules — candidates who ignore both give SLA answers that overstate breaches.",
    links: [
      { label: "ITSM glossary & quiz", to: "/learn/$topic", params: { topic: "itsm" } },
      { label: "ITSM interview questions", to: "/learn/itsm-interview-questions" },
    ],
  },
  {
    slug: "configuration-item",
    term: "Configuration Item (CI)",
    aka: ["CI", "cmdb_ci", "configuration item ServiceNow"],
    category: "CMDB",
    emoji: "🧩",
    definition:
      "A Configuration Item is any component you need to manage in order to deliver an IT service — a server, an application, a laptop, a service — stored on cmdb_ci or one of its extended class tables.",
    detail:
      "CIs are the nouns of the CMDB. Their value comes from relationships and from being referenced by Incidents, Changes and Problems, which is what makes impact analysis possible. Attribute ownership across data sources is governed by the Identification and Reconciliation Engine.",
    example:
      "A Linux web server lives on cmdb_ci_linux_server with a 'Runs on::Runs' relationship to its hypervisor and a 'Depends on::Used by' relationship to the payment application.",
    interviewAngle:
      "You will be asked how CIs avoid duplication, which is really a question about identification rules and reconciliation.",
    links: [
      { label: "CMDB glossary & quiz", to: "/learn/$topic", params: { topic: "cmdb" } },
      { label: "CMDB interview questions", to: "/learn/cmdb-interview-questions" },
    ],
  },
  {
    slug: "cmdb",
    term: "CMDB",
    aka: ["configuration management database", "ServiceNow CMDB"],
    category: "CMDB",
    emoji: "🗂️",
    definition:
      "The CMDB (Configuration Management Database) is the set of related tables that record the CIs in your environment and the relationships between them, acting as the single source of truth for service context.",
    detail:
      "It is not one table: cmdb_ci is the base class, extended classes hold class-specific attributes, and cmdb_rel_ci stores relationships. Populated by Discovery, integrations and Service Mapping, it is only as useful as its completeness and correctness — which is why CMDB health dashboards exist.",
    example:
      "Impact analysis on a change to a database CI walks cmdb_rel_ci upward to show the two business applications and the customer-facing service that would be affected.",
    interviewAngle:
      "Interviewers separate people who describe a table from people who describe a governed data model with owners, health metrics and reconciliation.",
    links: [
      { label: "CMDB interview questions", to: "/learn/cmdb-interview-questions" },
      { label: "Discovery & CMDB hub", to: "/learn/discovery" },
    ],
  },
  {
    slug: "discovery",
    term: "Discovery",
    aka: ["ServiceNow Discovery", "agentless discovery", "horizontal discovery"],
    category: "CMDB",
    emoji: "🛰️",
    definition:
      "Discovery is ServiceNow's agentless process that scans networks through a MID Server, identifies devices and applications, and creates or updates the matching CIs in the CMDB.",
    detail:
      "A Discovery Schedule triggers a port scan, classifiers decide what the device is, and probes and sensors collect and parse the attributes. Everything it writes goes through the Identification and Reconciliation Engine, so the same host found twice updates one CI instead of creating two.",
    example:
      "A schedule scans 10.20.0.0/24 nightly: SSH responds, the Linux classifier matches, probes return CPU, memory and running processes, and cmdb_ci_linux_server is updated.",
    interviewAngle:
      "The classic question is 'device found but not classified' — the answer is credentials, probe output or a missing classifier, not the port scan.",
    links: [
      { label: "Discovery & CMDB hub", to: "/learn/discovery" },
      { label: "Discovery interview questions", to: "/learn/discovery-interview-questions" },
    ],
  },
  {
    slug: "csdm",
    term: "CSDM",
    aka: ["common service data model", "CSDM framework"],
    category: "CMDB",
    emoji: "🗺️",
    definition:
      "CSDM (Common Service Data Model) is ServiceNow's prescriptive blueprint for how to model services, applications and infrastructure so every product on the platform reads the same data the same way.",
    detail:
      "It is organised in domains — Foundation, Design, Build, Manage Technical Services, Manage Business Services (Sell/Consume) — and each domain is a stage of maturity rather than a plugin you install. Following it keeps ITSM, ITOM, SecOps and reporting aligned on one hierarchy.",
    example:
      "Foundation data (companies, locations, users) comes first; only then are Business Applications mapped to Application Services and their supporting CIs.",
    interviewAngle:
      "Being able to name the domains matters less than explaining why a shared model prevents each team from inventing its own service hierarchy.",
    links: [
      { label: "Discovery & CMDB hub", to: "/learn/discovery" },
      { label: "CMDB interview questions", to: "/learn/cmdb-interview-questions" },
    ],
  },
  {
    slug: "update-set",
    term: "Update Set",
    aka: ["update set ServiceNow", "sys_update_set", "migrate customizations"],
    category: "Platform",
    emoji: "📦",
    definition:
      "An Update Set is a bundle of configuration changes captured on one instance so they can be previewed and committed on another — the standard way to move work from dev to test to production.",
    detail:
      "Update sets capture configuration records (business rules, UI policies, ACLs, form layouts, client scripts) tracked by Update Set engine tables. They do not capture data rows, scheduled job run history, or anything marked as non-tracked; move data with import sets, XML export or fix scripts.",
    example:
      "A story's business rule and ACL are captured in 'STRY0012345 - Approval guard', exported to test, previewed (all warnings resolved), then committed.",
    interviewAngle:
      "The trap is data: candidates who claim update sets move records are corrected on the spot.",
    links: [
      { label: "Platform glossary & quiz", to: "/learn/$topic", params: { topic: "platform" } },
      { label: "CSA interview questions", to: "/servicenow-csa-interview-questions-2026" },
    ],
  },
  {
    slug: "scoped-application",
    term: "Scoped Application",
    aka: ["application scope", "scoped app", "global vs scoped"],
    category: "Platform",
    emoji: "🔒",
    definition:
      "A Scoped Application is an app with its own namespace (for example x_acme_hr) that isolates its tables, scripts and artifacts from other applications and restricts what outside code can touch.",
    detail:
      "Scope prevents name collisions and enforces cross-scope privileges: a scoped Script Include must be marked 'Accessible from: All application scopes' before another scope can call it. The global scope is the legacy, unrestricted namespace and should be avoided for new work.",
    example:
      "An HR app in scope x_acme_hr creates x_acme_hr_case; a global business rule can only query it if the app's cross-scope access records allow it.",
    interviewAngle:
      "Senior screens ask 'scoped or global?' to hear you weigh shippability and isolation against the API restrictions scope imposes.",
    links: [
      { label: "Platform glossary & quiz", to: "/learn/$topic", params: { topic: "platform" } },
      { label: "Script Include puzzles", to: "/practice/$category", params: { category: "script-includes" } },
    ],
  },
  {
    slug: "acl",
    term: "ACL (Access Control)",
    aka: ["access control rule", "sys_security_acl", "ServiceNow ACL"],
    category: "Platform",
    emoji: "🛡️",
    definition:
      "An ACL (Access Control rule) grants or denies an operation — create, read, write, delete — on a table, a field or a record, based on required roles, a condition and an optional script that sets the answer variable.",
    detail:
      "Rules evaluate from most specific to least: table.field, then table.*, then the parent table. Roles, condition and script must all pass. A failing field ACL masks only that field; the row stays visible when the table ACL passes.",
    example:
      "A read ACL on incident that returns true only for the caller, the assignee or an admin, evaluated for every row in the list.",
    code: `answer = false;
var me = gs.getUserID();
if (gs.hasRole('admin') || current.assigned_to == me || current.caller_id == me) {
  answer = true;
}`,
    interviewAngle:
      "Evaluation order plus 'why not query another table inside a read ACL' (list performance) is the standard pair of follow-ups.",
    links: [
      { label: "ACL scripting guide", to: "/learn/acl-scripting" },
      { label: "ACL script examples", to: "/guides/acl-script-examples" },
    ],
  },
  {
    slug: "business-rule",
    term: "Business Rule",
    aka: ["before business rule", "after business rule", "async business rule"],
    category: "Automation",
    emoji: "⚙️",
    definition:
      "A Business Rule is server-side script that runs when a record is queried, inserted, updated or deleted, timed as before, after, async or display.",
    detail:
      "Before rules change values on the record being saved without a second write. After rules act on other records once this one is committed. Async rules run through the scheduler for work that must not slow the transaction. Display rules pass server data to the client through g_scratchpad.",
    example:
      "A before update rule on incident that stamps a reopen count when state moves from Resolved back to In Progress.",
    code: `// Before update — set the field, never call current.update()
if (previous.state == 6 && current.state == 2) {
  current.u_reopen_count = parseInt(current.u_reopen_count || 0, 10) + 1;
}`,
    interviewAngle:
      "The killer question is why current.update() inside a before rule is a bug — it recurses and writes twice.",
    links: [
      { label: "Business Rule puzzles", to: "/practice/$category", params: { category: "business-rules" } },
      { label: "Coding examples", to: "/servicenow-coding-examples-for-interview" },
    ],
  },
  {
    slug: "gliderecord",
    term: "GlideRecord",
    aka: ["GlideRecord query", "server-side query API"],
    category: "Automation",
    emoji: "🗃️",
    definition:
      "GlideRecord is the server-side ServiceNow API for querying, inserting, updating and deleting records, walking results row by row through query() and next().",
    detail:
      "Use addQuery for conditions, addEncodedQuery for filters copied from a list, and setLimit when you only need a few rows. For counts and sums use GlideAggregate instead — it pushes the maths to the database rather than pulling rows into memory. Never nest a query inside a result loop.",
    example:
      "Fetch every active P1 incident for a group and update its work notes in one pass.",
    code: `var gr = new GlideRecord('incident');
gr.addQuery('active', true);
gr.addQuery('priority', 1);
gr.query();
while (gr.next()) {
  gr.work_notes = 'Escalation review';
  gr.update();
}`,
    interviewAngle:
      "Expect GlideRecord vs GlideAggregate, and whether you spot the N+1 query antipattern in sample code.",
    links: [
      { label: "GlideRecord puzzles", to: "/practice/$category", params: { category: "gliderecord" } },
      { label: "Query a reference field", to: "/guides/gliderecord-query-reference-field" },
    ],
  },
  {
    slug: "glideajax",
    term: "GlideAjax",
    aka: ["GlideAjax example", "client callable script include"],
    category: "Automation",
    emoji: "📡",
    definition:
      "GlideAjax is the client-side API for calling a Client Callable Script Include asynchronously, so a form can fetch server data without a page reload.",
    detail:
      "The Script Include must extend AbstractAjaxProcessor and have Client callable checked, and only the methods you expose are reachable. Always use getXMLAnswer or getXML with a callback; getXMLWait blocks the browser and is a red flag in interviews.",
    example:
      "An onChange client script asks the server for the selected user's manager and populates a field from the callback.",
    code: `var ga = new GlideAjax('UserUtils');
ga.addParam('sysparm_name', 'getManager');
ga.addParam('sysparm_user', g_form.getValue('caller_id'));
ga.getXMLAnswer(function (answer) {
  g_form.setValue('u_manager', answer);
});`,
    interviewAngle:
      "The follow-up is always 'why not synchronous?' plus what makes a Script Include client callable.",
    links: [
      { label: "GlideAjax puzzles", to: "/practice/$category", params: { category: "glideajax" } },
      { label: "GlideAjax interview questions", to: "/learn/glideajax-interview-questions" },
    ],
  },
  {
    slug: "flow-designer",
    term: "Flow Designer",
    aka: ["flow", "subflow", "flow vs workflow"],
    category: "Automation",
    emoji: "🌊",
    definition:
      "Flow Designer is ServiceNow's low-code automation builder where a trigger plus a sequence of reusable actions replaces the legacy Workflow Editor.",
    detail:
      "Flows are triggered by record changes, schedules, inbound REST or catalog items. Actions are reusable steps, subflows encapsulate logic with inputs and outputs, and spokes add ready-made integration actions through IntegrationHub. Flows are scoped, versioned and testable, which is why new automation belongs here.",
    example:
      "A catalog-item flow that creates an approval, waits for it, then calls a Jira spoke action to raise a ticket.",
    interviewAngle:
      "You should be able to say when to keep a legacy Workflow (no changes needed) versus rewrite it as a Flow.",
    links: [
      { label: "Flow Designer how-to", to: "/learn/flow-designer-how-to" },
      { label: "Flow Designer interview questions", to: "/learn/flow-designer-interview-questions" },
    ],
  },
  {
    slug: "mid-server",
    term: "MID Server",
    aka: ["management instrumentation and discovery server", "ECC queue"],
    category: "Integration",
    emoji: "🔌",
    definition:
      "A MID Server is a lightweight Java application installed inside the customer network that lets the ServiceNow instance reach systems it cannot contact directly, used by Discovery, Orchestration and internal integrations.",
    detail:
      "Communication is pull-based through the ECC Queue: output records are work for the MID Server, input records are results. Add a second MID Server for network segmentation, for throughput once the queue backs up, or for high availability using a MID Server cluster.",
    example:
      "Discovery of a segregated DMZ subnet runs through a MID Server placed in that segment rather than the corporate one.",
    interviewAngle:
      "Interviewers probe why you would add a second MID Server, and expect ecc_queue as your first stop when a probe never returns.",
    links: [
      { label: "Integrations glossary & quiz", to: "/learn/$topic", params: { topic: "integration" } },
      { label: "IntegrationHub interview questions", to: "/learn/integrationhub-interview-questions" },
    ],
  },
  {
    slug: "scripted-rest-api",
    term: "Scripted REST API",
    aka: ["inbound REST", "custom REST endpoint", "sys_ws_definition"],
    category: "Integration",
    emoji: "🧾",
    definition:
      "A Scripted REST API is a custom inbound web service that exposes /api/<namespace>/<api-id>/<resource>, where your server script reads the request and builds the response.",
    detail:
      "Each resource has its own HTTP method, relative path, and script receiving request and response objects. Security is enforced by the ACLs on the API plus the roles on the resource; the caller's session determines table access. Outbound calls are the opposite direction and use RESTMessageV2.",
    example:
      "GET /api/x_acme_hr/cases/open returns the caller's open HR cases as JSON built from a GlideRecord query.",
    code: `(function process(request, response) {
  var out = [];
  var gr = new GlideRecord('incident');
  gr.addQuery('caller_id', gs.getUserID());
  gr.addQuery('active', true);
  gr.query();
  while (gr.next()) out.push({ number: gr.getValue('number') });
  return out;
})(request, response);`,
    interviewAngle:
      "Expect to debug a 500 response: transaction log, system log, payload validation, then ACLs — and to mention idempotency for retries.",
    links: [
      { label: "Integrations glossary & quiz", to: "/learn/$topic", params: { topic: "integration" } },
      { label: "IntegrationHub interview questions", to: "/learn/integrationhub-interview-questions" },
    ],
  },
];

export const GLOSSARY_CATEGORIES = [
  "ITSM",
  "CMDB",
  "Platform",
  "Automation",
  "Integration",
] as const;

export function glossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY_ENTRIES.find((e) => e.slug === slug);
}

export function entriesByCategory(category: string): GlossaryEntry[] {
  return GLOSSARY_ENTRIES.filter((e) => e.category === category);
}
