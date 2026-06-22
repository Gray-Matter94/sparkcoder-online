import platformImg from "@/assets/learn-platform.jpg";
import itsmImg from "@/assets/learn-itsm.jpg";
import cmdbImg from "@/assets/learn-cmdb.jpg";
import flowImg from "@/assets/learn-flow.jpg";
import integrationImg from "@/assets/learn-integration.jpg";
import type { TrackId } from "./tracks";

/** Free-string topic id so each track can contribute its own topics. */
export type TopicId = string;

export interface Topic {
  id: TopicId;
  name: string;
  tagline: string;
  emoji: string;
  /** Optional hero image; tracks without bespoke art render an emoji+gradient. */
  image?: string;
  blurb: string;
  /** Which practice track this topic belongs to. */
  track: TrackId;
}

const SN_DEV_TOPICS: Topic[] = [
  {
    id: "platform",
    name: "Platform Basics",
    tagline: "The Now Platform — apps, tables, UI.",
    emoji: "🧱",
    image: platformImg,
    track: "servicenow-dev",
    blurb:
      "ServiceNow is a cloud platform-as-a-service (PaaS). Every record lives in a table, every screen is a form, and every piece of logic is configurable. Master the building blocks before the magic.",
  },
  {
    id: "itsm",
    name: "ITSM",
    tagline: "Incident, Problem, Change, Request.",
    emoji: "🎫",
    image: itsmImg,
    track: "servicenow-dev",
    blurb:
      "IT Service Management is the flagship suite — the four core processes (Incident, Problem, Change, Request) that interview panels grill you on first.",
  },
  {
    id: "cmdb",
    name: "CMDB",
    tagline: "Configuration items and their relationships.",
    emoji: "🗂️",
    image: cmdbImg,
    track: "servicenow-dev",
    blurb:
      "The Configuration Management Database is the single source of truth for everything in your environment — servers, apps, services, and how they connect.",
  },
  {
    id: "flow",
    name: "Flow Designer",
    tagline: "Low-code automation and workflows.",
    emoji: "🌊",
    image: flowImg,
    track: "servicenow-dev",
    blurb:
      "Flow Designer is ServiceNow's modern, no-code automation tool. It replaced Workflow Editor for most new automations and integrates cleanly with IntegrationHub.",
  },
  {
    id: "integration",
    name: "Integrations",
    tagline: "REST, SOAP, IntegrationHub, MID Server.",
    emoji: "🔌",
    image: integrationImg,
    track: "servicenow-dev",
    blurb:
      "Almost every real-world ServiceNow project talks to something else — Active Directory, Jira, AWS, SAP. Know the patterns and you'll never be stuck.",
  },
  {
    id: "scenario-based",
    name: "Scenario-Based Questions",
    tagline: "Architectural decisions & complex troubleshooting.",
    emoji: "🧩",
    track: "servicenow-dev",
    blurb:
      "The hardest ServiceNow interview round: open-ended scenarios where panels probe how you reason about design trade-offs, debug nasty production issues, and choose between business rules, flows, scripted REST, and integration patterns.",
  },
];

export interface Term {
  topic: TopicId;
  term: string;
  short: string;
  long: string;
}

const SN_DEV_TERMS: Term[] = [
  // Platform
  { topic: "platform", term: "Instance", short: "Your dedicated ServiceNow tenant.", long: "Each customer (and each dev / test / prod environment) gets its own URL like company.service-now.com. Code and data live inside the instance — there's no shared codebase across customers." },
  { topic: "platform", term: "Table", short: "A database table — every record lives in one.", long: "Tables can extend each other (Incident extends Task extends... ). Dot-walking lets you traverse references like incident.caller_id.email without a JOIN." },
  { topic: "platform", term: "Form & List", short: "The two main UI surfaces.", long: "A List shows many records as rows; a Form shows one record with all its fields. Both are auto-generated from the table definition and customizable per view." },
  { topic: "platform", term: "Application Scope", short: "Namespace that isolates an app's artifacts.", long: "Scoped apps prevent name collisions and protect their internals. The global scope is the legacy, unrestricted namespace — avoid it for new code." },
  { topic: "platform", term: "Update Set", short: "A bundle of customizations to ship between instances.", long: "Captures config records (business rules, UI policies, etc.) so you can move them dev → test → prod. Data records are NOT captured — use a data import or fix script for that." },

  // ITSM
  { topic: "itsm", term: "Incident", short: "An unplanned interruption to a service.", long: "Goal: restore service ASAP. Lives on the incident table (extends task). Priority is calculated from impact × urgency." },
  { topic: "itsm", term: "Problem", short: "The root cause of one or more incidents.", long: "Goal: prevent recurrence. A problem record links back to its incidents; a known error is a problem with a documented workaround." },
  { topic: "itsm", term: "Change", short: "A controlled modification to the environment.", long: "Three types: Standard (pre-approved), Normal (CAB approval), Emergency (fast-tracked). Goal: minimize risk to live services." },
  { topic: "itsm", term: "Request (RITM)", short: "A user asking for something from the catalog.", long: "A Request (REQ) contains one or more Requested Items (RITM), each of which spawns Catalog Tasks (SCTASK) for fulfillment teams." },
  { topic: "itsm", term: "SLA", short: "Service Level Agreement timer on a task.", long: "An SLA Definition attaches a stopwatch (e.g. 'resolve P1 in 4 hours') with pause conditions like 'awaiting user'. Breached SLAs drive escalations." },

  // CMDB
  { topic: "cmdb", term: "CI", short: "Configuration Item — a thing you manage.", long: "Servers, laptops, applications, services. Every CI lives on cmdb_ci or a child table like cmdb_ci_server." },
  { topic: "cmdb", term: "CI Class", short: "The type of a CI (table it lives on).", long: "Examples: cmdb_ci_linux_server, cmdb_ci_business_app. The CI Class hierarchy is what makes the CMDB queryable." },
  { topic: "cmdb", term: "Relationship", short: "How two CIs are connected.", long: "Stored on cmdb_rel_ci. Types like 'Runs on::Runs', 'Depends on::Used by'. Powers impact analysis and service maps." },
  { topic: "cmdb", term: "Discovery", short: "Agentless scan that populates the CMDB.", long: "Uses a MID Server to probe IPs, identify devices, and create / update CIs automatically. Pairs with Service Mapping for topology." },
  { topic: "cmdb", term: "CSDM", short: "Common Service Data Model.", long: "ServiceNow's prescriptive blueprint for how to organize CIs into Foundation → Design → Build → Manage Technical Services and Business Services." },

  // Flow Designer
  { topic: "flow", term: "Flow", short: "A trigger + sequence of actions.", long: "Created in Flow Designer (no code). Triggered by record events, schedules, inbound REST, or service catalog. The modern replacement for Workflow." },
  { topic: "flow", term: "Action", short: "A reusable step inside a flow.", long: "Built from steps like 'Look up records', 'Create record', or custom scripts. Actions can be shared across flows and packaged in spokes." },
  { topic: "flow", term: "Subflow", short: "A flow you call from another flow.", long: "Encapsulates reusable logic with inputs and outputs. Use subflows to keep flows readable and DRY." },
  { topic: "flow", term: "Spoke", short: "A pre-built integration pack for Flow Designer.", long: "ServiceNow ships spokes for Jira, Slack, MS Teams, Azure, etc. Each spoke adds ready-made actions you drag into flows." },
  { topic: "flow", term: "IntegrationHub", short: "The runtime that powers spokes & custom actions.", long: "Licensed add-on. Enables Action Designer steps like REST, PowerShell, and the spoke library. Required for most non-trivial integrations." },

  // Integration
  { topic: "integration", term: "REST Message", short: "Outbound REST call defined as a record.", long: "Configure endpoint, method, headers, and auth profile once; reuse across business rules, flows, and script includes via RESTMessageV2." },
  { topic: "integration", term: "Scripted REST API", short: "Custom inbound REST endpoint.", long: "Defines /api/<namespace>/<api>/<resource>. You write a server script that receives the request and returns a response — full control over inbound integrations." },
  { topic: "integration", term: "MID Server", short: "A Java agent inside the customer's network.", long: "Bridges ServiceNow (cloud) to on-prem systems for Discovery, Orchestration, and integrations that can't reach the public internet." },
  { topic: "integration", term: "Import Set", short: "Staging area for bulk data loads.", long: "Data lands on an import set table, then a Transform Map shapes and pushes it to the target table (e.g. user, cmdb_ci_server) with coalesce keys." },
  { topic: "integration", term: "Transform Map", short: "Field-by-field mapping from import set → target.", long: "Defines source-to-target field mapping, scripts, and coalesce rules. Onbefore/onafter scripts let you reshape data during the import." },

  // Scenario-based
  { topic: "scenario-based", term: "Business Rule vs Flow", short: "When to script server-side vs use Flow Designer.", long: "Use a business rule for tight, synchronous, table-level logic (validation, derived fields, abort). Use a Flow for multi-step orchestration, approvals, integrations, and anything a non-developer should maintain. Mixing both on the same table is the #1 source of duplicated logic in interview scenarios." },
  { topic: "scenario-based", term: "Performance Triage", short: "Slow form / slow list — where to look first.", long: "Check the slow query log, then onLoad/onChange client scripts, then display business rules, then dot-walked reference fields without indexes. Interviewers expect you to name the order, not just the tools." },
  { topic: "scenario-based", term: "Failed Integration", short: "Inbound REST request returns 500 — debug path.", long: "Start with the Scripted REST API's transaction log, then the system log for unhandled exceptions, then payload validation, then ACLs on the target table. Always mention idempotency: can the sender safely retry?" },
  { topic: "scenario-based", term: "Update Set Conflict", short: "Two devs change the same business rule.", long: "Last commit wins on import. Resolve by previewing the update set, accepting/skipping per record, and re-testing. Long-term fix: smaller, scoped update sets and a branch-per-story workflow." },
  { topic: "scenario-based", term: "Data Model Decision", short: "Extend a table vs add a reference field.", long: "Extend when the new record IS-A parent (Incident extends Task). Reference when it HAS-A relationship (Incident references Caller). Getting this wrong forces painful migrations later — a classic senior-developer interview probe." },
  { topic: "scenario-based", term: "Scoped vs Global", short: "Where should this customization live?", long: "Scoped apps for anything you'll ship, version, or hand off. Global only for cross-app utilities or legacy work. Scenario answer: explain the trade-off in cross-scope access and the API restrictions scoped apps impose." },
  { topic: "scenario-based", term: "ACL Debugging", short: "User can't see a record they should.", long: "Enable security debug, walk the ACL evaluation order (table → field → row), check role inheritance, and verify the condition / script blocks. Mention impersonation as your first reproduction step." },
  { topic: "scenario-based", term: "Async vs Sync Business Rule", short: "When does timing matter?", long: "Use async for non-blocking work like notifications, integrations, and analytics. Sync (before/after) for anything that must complete in the same transaction. Common interview trap: async rules can't reliably modify the current record before save." },

  // --- Platform (additional) ---
  { topic: "platform", term: "GlideRecord", short: "Server-side query/record API.", long: "Primary way to read/write tables in scripts: new GlideRecord('incident'); gr.addQuery('active', true); gr.query(). Supports dot-walking, encoded queries, and CRUD." },
  { topic: "platform", term: "GlideAggregate", short: "Group-by/count/sum on the server.", long: "Like GlideRecord but for SUM/COUNT/AVG/MIN/MAX grouped by fields. Far cheaper than looping a GlideRecord in JS." },
  { topic: "platform", term: "Client Script", short: "Runs in the browser on a form.", long: "Types: onLoad, onChange, onSubmit, onCellEdit. Use g_form, g_user. Avoid GlideRecord here — use GlideAjax." },
  { topic: "platform", term: "Business Rule", short: "Server-side hook on table operations.", long: "When: before/after/async/display. Use 'before' for validation/derived fields, 'async' for non-blocking work." },
  { topic: "platform", term: "UI Policy", short: "Declarative show/hide/mandatory/read-only.", long: "Prefer over client scripts for visibility logic — easier to audit, faster to load." },
  { topic: "platform", term: "Script Include", short: "Reusable server-side library.", long: "Define as a class (Class.create()) or function; call from business rules, scripted REST, GlideAjax (client-callable=true)." },
  { topic: "platform", term: "Reference Field", short: "Foreign-key column.", long: "Stores sys_id; lookup table set in dictionary. Enables dot-walking like u_request.requested_for.email." },
  { topic: "platform", term: "Encoded Query", short: "String form of a list filter.", long: "Example: active=true^priority=1^ORpriority=2. Copy from breadcrumb; reuse in scripts via addEncodedQuery." },
  { topic: "platform", term: "sys_id", short: "32-char GUID for every record.", long: "Primary key across all tables. Always sys_id-based references — never display value." },
  { topic: "platform", term: "Now Experience UI", short: "Modern UI framework (Workspace, Service Portal).", long: "Built on web components / Seismic. UI Builder is the visual designer; older UI16 still ships for back-of-house pages." },

  // --- ITSM (additional) ---
  { topic: "itsm", term: "Task table", short: "Parent of incident, problem, change, RITM, sctask.", long: "Shared fields (number, state, assignment_group, priority) live here. Polymorphic queries hit all child tables." },
  { topic: "itsm", term: "CAB", short: "Change Advisory Board.", long: "Reviews and approves Normal changes. Modeled via change_request workflow and approval records." },
  { topic: "itsm", term: "Impact vs Urgency", short: "Inputs to priority.", long: "Impact = breadth of effect; Urgency = how time-critical. priority = priorityLookup[impact][urgency]." },
  { topic: "itsm", term: "Knowledge Article", short: "kb_knowledge record.", long: "Authored in a Knowledge Base, lifecycle Draft→Review→Published. Surfaced via search and contextual KB on incidents." },
  { topic: "itsm", term: "Major Incident", short: "Highest-impact incident with command process.", long: "Promoted from incident; spins up war-room, comms templates, and post-incident review." },
  { topic: "itsm", term: "Workflow", short: "Legacy graphical orchestration.", long: "Drag-and-drop activities (Approval, Run Script, Catalog Task). Largely replaced by Flow Designer for new work." },
  { topic: "itsm", term: "Service Portal", short: "End-user self-service site.", long: "/sp — built on AngularJS widgets. Successor to ESS; precedes Now Experience portals." },
  { topic: "itsm", term: "Assignment Rule", short: "Auto-route tasks to group/user.", long: "Conditions on the task evaluate at insert/update; sets assignment_group and optionally assigned_to." },
  { topic: "itsm", term: "OLA / UC", short: "Internal service agreements.", long: "OLA = operational level (between IT teams); UC = underpinning contract (with vendors). Attach to tasks like SLAs." },
  { topic: "itsm", term: "Change Risk", short: "Calculated risk score for a change.", long: "Risk Assessment questions + Risk Conditions feed the risk field. Drives the approval path." },

  // --- CMDB (additional) ---
  { topic: "cmdb", term: "Identification Rule", short: "How Discovery decides 'is this CI new or existing?'.", long: "Per CI class: a set of attribute groups checked in order. Misconfigured rules cause duplicate CIs." },
  { topic: "cmdb", term: "Reconciliation Rule", short: "Which data source can write which fields.", long: "Prevents one source (e.g. Discovery) from overwriting authoritative fields owned by another (e.g. HRSD)." },
  { topic: "cmdb", term: "Service Map", short: "Top-down dependency map of a business service.", long: "Built by Service Mapping (different from Discovery). Visualizes app→host→network for impact analysis." },
  { topic: "cmdb", term: "Affected CI", short: "CI linked to a task as impacted.", long: "task_ci m2m. Drives Service Mapping's impact lens and powers change collision detection." },
  { topic: "cmdb", term: "Health Dashboard", short: "Out-of-box CMDB completeness/correctness KPIs.", long: "Tracks duplicates, staleness, required attributes per class. Use to justify Discovery investments." },
  { topic: "cmdb", term: "Pattern", short: "Discovery's modern probe definition.", long: "Replaces classic probe/sensor pairs. Authored in Pattern Designer; runs steps with parsing strategies." },
  { topic: "cmdb", term: "Business Service", short: "What the business consumes (e.g. 'Email').", long: "cmdb_ci_service_business. Maps via CSDM to Application Services (cmdb_ci_service_auto) and CIs underneath." },
  { topic: "cmdb", term: "Technical Service", short: "What IT delivers (e.g. 'Exchange').", long: "Layer between Business Services and the raw CIs. CSDM enforces this separation." },
  { topic: "cmdb", term: "Dependency View", short: "Interactive CI relationship visualizer.", long: "Replaced by Service Map for newer instances. Walks cmdb_rel_ci to render impact graphs." },
  { topic: "cmdb", term: "MID Server Capability", short: "Tag declaring what a MID can do.", long: "ALL, Discovery, Orchestration, REST, JDBC. Probes target capabilities, not specific MIDs, for HA." },

  // --- Flow Designer (additional) ---
  { topic: "flow", term: "Trigger", short: "What starts a flow.", long: "Record (created/updated/conditional), scheduled, inbound email, REST, service catalog, application." },
  { topic: "flow", term: "Data Pill", short: "Drag-and-drop output reference.", long: "Outputs from prior steps appear as 'pills' you drop into later inputs — no scripting required." },
  { topic: "flow", term: "Flow Variable", short: "Mutable value within a flow run.", long: "Defined under Variables; set/used like local variables. Useful for accumulators in loops." },
  { topic: "flow", term: "Decision Step", short: "Branch on conditions.", long: "Multi-branch with default; cleaner than nested If/Else. Each branch can have its own actions." },
  { topic: "flow", term: "For Each", short: "Loop over a list output.", long: "Iterates records or arrays; each iteration sees one element. Beware of large lists — use a Subflow for parallel runs." },
  { topic: "flow", term: "Application", short: "Scope a flow belongs to.", long: "Like all artifacts, flows live in a scoped app. Cross-scope access requires explicit permissions." },
  { topic: "flow", term: "Action Designer", short: "Tool to author custom actions.", long: "Compose steps (REST, Script, etc.) into a reusable action with typed inputs/outputs." },
  { topic: "flow", term: "Connection Alias", short: "Indirection for connection records.", long: "Lets you swap dev/test/prod connections without editing the spoke action. Set per environment." },
  { topic: "flow", term: "Wait For Condition", short: "Pause until a record matches.", long: "Suspends the flow run until a target record meets a condition — used for approvals, async callbacks." },
  { topic: "flow", term: "Flow Execution Log", short: "Per-run audit trail.", long: "Step-by-step inputs/outputs for debugging. Turn off 'minimum logging' for production performance." },

  // --- Flow Designer (extended: triggers, design, error handling, performance) ---
  { topic: "flow", term: "Record Trigger", short: "Created / Updated / Created or Updated.", long: "Fires after the database write. Use a precise filter and 'Run trigger' = 'Only the first time conditions are met' to avoid re-firing on every update." },
  { topic: "flow", term: "Trigger Condition", short: "Encoded query that gates the run.", long: "Evaluated server-side before the flow starts. Tighten it as much as possible — the cheapest action is the one that never runs." },
  { topic: "flow", term: "Service Catalog Trigger", short: "Fires from a Catalog Item or Record Producer.", long: "Replaces workflow on catalog items. The trigger exposes the RITM and its variables as data pills." },
  { topic: "flow", term: "Scheduled Trigger", short: "Cron-style runs.", long: "Daily / weekly / repeat. Use timezones explicitly and stagger jobs to avoid the top-of-the-hour stampede." },
  { topic: "flow", term: "Inbound Email Trigger", short: "Flow run from an incoming email.", long: "Replaces inbound email actions. The email body/headers/attachments are exposed as pills." },
  { topic: "flow", term: "Application Trigger", short: "Custom event-driven entry point.", long: "Apps register their own triggers (e.g. HR lifecycle events) so subscribers can react without polling." },
  { topic: "flow", term: "Async Flow", short: "Runs out-of-band of the triggering transaction.", long: "Default for record triggers. The user's save isn't blocked; expensive work is safe here." },
  { topic: "flow", term: "Run As", short: "User context the flow executes under.", long: "'System User' bypasses ACLs; 'User who triggered' enforces them. Pick deliberately — wrong choice causes silent permission failures or privilege leaks." },
  { topic: "flow", term: "Stage", short: "Named progress milestone on a flow run.", long: "Surfaces 'where are we?' on a request without users reading the trace. Map stages to business-meaningful checkpoints." },
  { topic: "flow", term: "Try / Catch", short: "Error-handling block around steps.", long: "Wrap fragile calls (REST, scripts) in Try; route failures into Catch for logging, retries, or graceful fallback. Without it, the run fails hard." },
  { topic: "flow", term: "Error Evaluator", short: "Per-action 'on error' setting.", long: "Choose: stop, continue, or go to error branch. Continue silently is the most dangerous default." },
  { topic: "flow", term: "Retry Policy", short: "Action-level retry with backoff.", long: "Configured on Action steps that hit external systems. Always pair with idempotency on the remote side." },
  { topic: "flow", term: "Timeout", short: "Max wait for an action or Wait step.", long: "Without a timeout, a hung remote call can leave the flow waiting indefinitely. Set realistic SLAs and a failure branch." },
  { topic: "flow", term: "Idempotency", short: "Same input → same outcome, safely re-runnable.", long: "Critical for retried REST steps and event-driven flows. Use natural keys or correlation IDs to avoid duplicate side effects." },
  { topic: "flow", term: "Parallel Branches", short: "Run independent steps concurrently.", long: "Use when two outbound calls don't depend on each other. Reduces wall-clock duration without scripting." },
  { topic: "flow", term: "Inline Script Step", short: "Custom JS inside a flow.", long: "Use sparingly — it defeats Flow Designer's no-code maintainability. Prefer a Script Include called from a custom Action." },
  { topic: "flow", term: "Custom Action", short: "Reusable, typed action you build.", long: "Encapsulate scripts behind an action with named inputs/outputs and a clear category. Flow stays declarative; complexity is hidden inside the action." },
  { topic: "flow", term: "Action Step Type", short: "REST, PowerShell, Script, Parse, Subflow.", long: "Each step is the building block of an action. Mix and match in Action Designer; declare typed outputs for consumers." },
  { topic: "flow", term: "Connection & Credential Alias", short: "Alias → environment-specific record.", long: "Reference the alias from your action; the credential record varies per environment, so the same flow promotes cleanly." },
  { topic: "flow", term: "Credential Record", short: "Stored secret used by an action.", long: "Encrypted at rest. Use OAuth or Discovery credentials over Basic. Reference via alias, never by sys_id." },
  { topic: "flow", term: "Flow Variable vs Data Pill", short: "Mutable local vs read-only step output.", long: "Pills are immutable references to a prior step's output. Variables are mutable across the run — use them for counters and accumulators." },
  { topic: "flow", term: "Loop Output Aggregation", short: "Collect results out of a For Each.", long: "For Each doesn't return a list by default — push into a flow variable (array) and read it after the loop." },
  { topic: "flow", term: "Flow vs Subflow vs Action", short: "Trigger vs reusable orchestration vs single step.", long: "Flow = entry point with a trigger. Subflow = orchestration callable from flows/scripts. Action = atomic, typed unit of work." },
  { topic: "flow", term: "Subflow Inputs/Outputs", short: "Typed contract for reuse.", long: "Declare strongly-typed inputs and outputs so callers get pill support and refactors stay safe." },
  { topic: "flow", term: "Calling a Flow from Script", short: "sn_fd.FlowAPI.getRunner().", long: "Server-side: sn_fd.FlowAPI.getRunner().subflow('scope/name').inForeground().withInputs({...}).run(). Use background for fire-and-forget." },
  { topic: "flow", term: "Test (Designer)", short: "Run a flow against a real record.", long: "Pick a sample sys_id, view step-by-step inputs/outputs. The fastest debug loop — use before promoting changes." },
  { topic: "flow", term: "Flow Execution Details", short: "Production trace UI.", long: "Per-run timeline with input/output JSON per step. Pin this link in incident bridges." },
  { topic: "flow", term: "Minimum Logging", short: "Production logging mode.", long: "Stores only step transitions and errors. Mandatory for high-volume flows; full logging fills sys_flow_context fast." },
  { topic: "flow", term: "Flow Context", short: "Per-run state record (sys_flow_context).", long: "Persists inputs, outputs, current step, and status. Purged on a schedule — increase retention only when debugging." },
  { topic: "flow", term: "Activation", short: "Publish + Activate a flow to make it live.", long: "Save is not enough. Publish freezes a version; Activate enables the trigger. Inactive flows never run." },
  { topic: "flow", term: "Versioning", short: "Each publish snapshots the flow.", long: "Rollback by activating an older version. The active version is the one the trigger uses; in-flight runs finish on the version they started." },
  { topic: "flow", term: "Domain Separation", short: "Flows scoped to a domain.", long: "Domain-separated instances run the right version of the flow per tenant. Always test cross-domain triggers." },
  { topic: "flow", term: "Decision Table", short: "Externalized branching logic.", long: "Pull complex if/else trees into a Decision Table so non-developers can edit rules without touching the flow." },
  { topic: "flow", term: "Data Stream Action", short: "Streamed REST for large payloads.", long: "Use when the API returns thousands of records — processes pages without loading the whole response into memory." },
  { topic: "flow", term: "Process Automation Designer (PAD)", short: "Multi-flow business processes.", long: "Stitches lanes/stages across multiple flows for end-to-end processes (e.g. onboarding). Flow Designer is one piece; PAD orchestrates them." },
  { topic: "flow", term: "Workflow vs Flow Designer", short: "Legacy graphical workflow vs modern low-code.", long: "Use Flow Designer for new work. Migrate workflows when adding integrations, when complexity grows, or when non-developers need to maintain them." },
  { topic: "flow", term: "Anti-pattern: God Flow", short: "One mega-flow that does everything.", long: "Hard to test, hard to debug, slow to publish. Decompose into a parent flow + subflows by responsibility (validate, integrate, notify)." },
  { topic: "flow", term: "Anti-pattern: Scripted Everything", short: "Inline scripts in every step.", long: "Defeats the point of Flow Designer. Push scripts into Script Includes called from Custom Actions; keep the flow canvas declarative." },
  { topic: "flow", term: "Anti-pattern: Tight Trigger", short: "Trigger fires on every update.", long: "Always set 'Run trigger' = 'Only the first time conditions are met', or add a state-change guard, to prevent loops and wasted runs." },
  { topic: "flow", term: "Design Rule: Idempotent Steps", short: "Safe to retry.", long: "Every external write should tolerate being called twice (correlation id, upsert semantics)." },
  { topic: "flow", term: "Design Rule: Small + Composable", short: "Prefer many small subflows.", long: "Each subflow owns one responsibility; the parent reads like a table of contents." },
  { topic: "flow", term: "Design Rule: Explicit Error Paths", short: "Never let a flow fail silently.", long: "Catch errors, log to a dedicated table, and notify an owner. 'On error: continue' without logging is the worst default." },
  { topic: "flow", term: "Design Rule: Observability", short: "Stages + structured logs.", long: "Set stages users can read, log a correlation id on every external call, and alert on failed sys_flow_context rows." },

  // --- Integration (additional) ---
  { topic: "integration", term: "OAuth Profile", short: "Token-based auth config.", long: "Defines client id/secret, scopes, token URL. Reused by REST Messages and outbound flows." },
  { topic: "integration", term: "Basic Auth Profile", short: "Username/password auth.", long: "Stored encrypted; referenced by REST/SOAP messages. Avoid for new integrations — prefer OAuth." },
  { topic: "integration", term: "Inbound Email Action", short: "Server script run on incoming email.", long: "Matches by 'type' (New/Reply/Forward) and conditions; commonly creates/updates incidents." },
  { topic: "integration", term: "Event", short: "Named signal recorded on sysevent.", long: "Triggers notifications and script actions. gs.eventQueue('event.name', gr, p1, p2)." },
  { topic: "integration", term: "Notification", short: "Email/SMS template fired by event or record.", long: "Defined on sys_email_notification; uses GlideRecord context for templating." },
  { topic: "integration", term: "Data Source", short: "Definition of where import data comes from.", long: "JDBC, FTP, file, REST, LDAP. Loads into a staging import set table." },
  { topic: "integration", term: "Scheduled Import", short: "Cron-driven Data Source pull.", long: "Run a Data Source on a schedule; pairs with a Transform Map to load into target tables." },
  { topic: "integration", term: "ECC Queue", short: "Job queue between instance and MID Servers.", long: "Output messages = work for MIDs; Input messages = results. Inspect ecc_queue when integrations stall." },
  { topic: "integration", term: "Web Services Import", short: "Inbound SOAP via WSDL.", long: "Legacy SOAP receiver auto-generated from the table dictionary. Modern alternative: Scripted REST." },
  { topic: "integration", term: "RESTMessageV2", short: "Script API for outbound REST.", long: "var r = new sn_ws.RESTMessageV2('msg', 'method'); r.execute(). Supports MID Server, ECC, async." },

  // --- Scenario-based (additional) ---
  { topic: "scenario-based", term: "GlideRecord in a Loop", short: "N+1 query antipattern.", long: "Don't call gr.query() inside another result loop. Use GlideAggregate or a single join-ish query via dot-walked conditions." },
  { topic: "scenario-based", term: "Long-Running Script", short: "Transaction timeout (default 5 min).", long: "Move heavy work to async business rules, scheduled jobs, or Progress Worker so the UI thread stays free." },
  { topic: "scenario-based", term: "Catalog vs Record Producer", short: "Form that creates a request vs an arbitrary record.", long: "Use catalog item for fulfillment with SLAs/RITMs; record producer when you just need a typed record (e.g. incident from the portal)." },
  { topic: "scenario-based", term: "Choosing Scoped vs Global Script Include", short: "Cross-scope access surface.", long: "Scoped script includes need 'Accessible from: All application scopes' + Cross Scope Privileges to be called outside. Global is reachable everywhere but pollutes the namespace." },
  { topic: "scenario-based", term: "Hard-coded sys_id", short: "Brittleness across instances.", long: "sys_ids of seed records differ per instance. Reference by name/encoded query, or store in sys_properties for lookup." },
  { topic: "scenario-based", term: "Workflow vs Flow Migration", short: "When to rewrite.", long: "Rewrite when adding new branches, when integration steps are needed, or when the workflow has accumulated unmaintained scripts. Otherwise leave it." },
  { topic: "scenario-based", term: "Best-Practice Update Set Hygiene", short: "Small, themed, named, peer-reviewed.", long: "One story per update set; capture related test data via fix scripts. Always preview on target and resolve all warnings before commit." },
];

import { ADMIN_TOPICS, ADMIN_TERMS } from "./content/admin";
import { JAVA_TOPICS, JAVA_TERMS } from "./content/java";
import { ANGULAR_TOPICS, ANGULAR_TERMS } from "./content/angular";

export const TOPICS: Topic[] = [...SN_DEV_TOPICS, ...ADMIN_TOPICS, ...JAVA_TOPICS, ...ANGULAR_TOPICS];
export const TERMS: Term[] = [...SN_DEV_TERMS, ...ADMIN_TERMS, ...JAVA_TERMS, ...ANGULAR_TERMS];

export function termsFor(topic: TopicId): Term[] {
  return TERMS.filter((t) => t.topic === topic);
}

export function topicsForTrack(track: TrackId): Topic[] {
  return TOPICS.filter((t) => t.track === track);
}

export function topicTrack(topicId: TopicId): TrackId | undefined {
  return TOPICS.find((t) => t.id === topicId)?.track;
}
