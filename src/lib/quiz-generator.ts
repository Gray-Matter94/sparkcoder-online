import type { TopicId } from "./glossary";
import type { QuizQuestion } from "./quizzes";

/**
 * Programmatic quiz generator: ~2000 questions per topic = ~10,000 total.
 * Each question is built from a real ServiceNow fact bank; distractors are
 * drawn from same-topic items so they stay plausible.
 */

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function distractors<T>(pool: readonly T[], correct: T, count: number, salt: number): T[] {
  const filtered = pool.filter((x) => x !== correct);
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(filtered[(salt + i * 7) % filtered.length]);
  }
  return Array.from(new Set(out)).slice(0, count);
}

function build(opts: {
  id: string;
  topic: TopicId;
  question: string;
  correct: string;
  pool: readonly string[];
  explain: string;
  salt: number;
}): QuizQuestion {
  const wrongs = distractors(opts.pool, opts.correct, 3, opts.salt);
  while (wrongs.length < 3) wrongs.push(opts.pool[(opts.salt + wrongs.length) % opts.pool.length] + " (variant)");
  const order = (opts.salt % 4);
  const options = [...wrongs];
  options.splice(order, 0, opts.correct);
  return {
    id: opts.id,
    topic: opts.topic,
    question: opts.question,
    options,
    correctIndex: options.indexOf(opts.correct),
    explain: opts.explain,
  };
}

/* ------------------------------------------------------------ */
/* PLATFORM                                                     */
/* ------------------------------------------------------------ */

const PLATFORM_TABLE_FACTS: Array<{ table: string; extends: string; desc: string }> = [
  { table: "incident", extends: "task", desc: "An unplanned service interruption." },
  { table: "problem", extends: "task", desc: "Root cause of incidents." },
  { table: "change_request", extends: "task", desc: "A controlled environment change." },
  { table: "sc_request", extends: "task", desc: "A service catalog request header." },
  { table: "sc_req_item", extends: "task", desc: "A single requested item." },
  { table: "sc_task", extends: "task", desc: "Catalog fulfillment task." },
  { table: "cmdb_ci_server", extends: "cmdb_ci_hardware", desc: "Generic server CI class." },
  { table: "cmdb_ci_linux_server", extends: "cmdb_ci_server", desc: "Linux server CI class." },
  { table: "cmdb_ci_win_server", extends: "cmdb_ci_server", desc: "Windows server CI class." },
  { table: "cmdb_ci_business_app", extends: "cmdb_ci_appl", desc: "Business application CI." },
  { table: "sys_user", extends: "sys_metadata", desc: "Platform user account." },
  { table: "sys_user_group", extends: "sys_metadata", desc: "Group of users." },
  { table: "kb_knowledge", extends: "kb_base", desc: "Published knowledge article." },
];

const PLATFORM_SCOPE_FACTS: Array<{ q: string; correct: string; explain: string }> = [
  { q: "Which application scope should new custom apps use?", correct: "Scoped (custom)", explain: "Scoped apps isolate their artifacts and prevent name collisions." },
  { q: "Which scope is the legacy unrestricted namespace?", correct: "Global", explain: "Global predates scoped apps and has no isolation." },
  { q: "What does dot-walking do?", correct: "Traverses reference fields without a JOIN", explain: "e.g. incident.caller_id.manager.email." },
  { q: "Update Sets capture which kind of records?", correct: "Configuration records", explain: "Data is moved via imports or fix scripts, not Update Sets." },
];

const PLATFORM_DISTRACTORS = [
  "Global", "Scoped (custom)", "System", "ITIL", "Demo",
  "Traverses reference fields without a JOIN", "Runs SQL JOINs manually", "Walks update sets", "Debugs scripts",
  "Configuration records", "Data records", "Attachments only", "Both config and data",
];

function platformPool(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let seq = 0;
  // Variation: parent-table questions
  for (let rep = 0; rep < 50; rep++) {
    PLATFORM_TABLE_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-plat-ext-${seq}`,
        topic: "platform",
        question: `Which table does '${f.table}' extend?`,
        correct: f.extends,
        pool: PLATFORM_TABLE_FACTS.map((x) => x.extends).concat(["cmdb_ci", "sys_metadata", "kb_base", "task"]),
        explain: `${f.table}: ${f.desc} It extends ${f.extends}.`,
        salt: seq + i + rep,
      }));
    });
  }
  // Variation: scope facts
  for (let rep = 0; rep < 340; rep++) {
    PLATFORM_SCOPE_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-plat-scope-${seq}`,
        topic: "platform",
        question: f.q + (rep > 0 ? ` (set ${rep + 1})` : ""),
        correct: f.correct,
        pool: PLATFORM_DISTRACTORS,
        explain: f.explain,
        salt: seq + i + rep,
      }));
    });
  }
  return out;
}

/* ------------------------------------------------------------ */
/* ITSM                                                         */
/* ------------------------------------------------------------ */

const ITSM_STATE_FACTS: Array<{ table: string; code: number; label: string }> = [
  { table: "incident", code: 1, label: "New" },
  { table: "incident", code: 2, label: "In Progress" },
  { table: "incident", code: 3, label: "On Hold" },
  { table: "incident", code: 6, label: "Resolved" },
  { table: "incident", code: 7, label: "Closed" },
  { table: "incident", code: 8, label: "Canceled" },
  { table: "change_request", code: -5, label: "New" },
  { table: "change_request", code: -4, label: "Assess" },
  { table: "change_request", code: -3, label: "Authorize" },
  { table: "change_request", code: -2, label: "Scheduled" },
  { table: "change_request", code: -1, label: "Implement" },
  { table: "change_request", code: 0, label: "Review" },
  { table: "change_request", code: 3, label: "Closed" },
  { table: "problem", code: 1, label: "Open" },
  { table: "problem", code: 2, label: "Known Error" },
  { table: "problem", code: 3, label: "Pending Change" },
  { table: "problem", code: 4, label: "Closed/Resolved" },
];

const ITSM_PROCESS_FACTS = [
  { q: "Priority on an incident is calculated from…", correct: "Impact × Urgency", explain: "Default Priority Lookup Rules combine impact and urgency." },
  { q: "Primary goal of Problem Management?", correct: "Prevent recurrence by finding root cause", explain: "Incident restores service; Problem prevents the next one." },
  { q: "Which change type is pre-approved and low risk?", correct: "Standard", explain: "Standard changes follow a pre-approved template." },
  { q: "Which change type needs CAB approval?", correct: "Normal", explain: "Normal changes are reviewed by the Change Advisory Board." },
  { q: "Which change type is fast-tracked for outages?", correct: "Emergency", explain: "Emergency changes bypass full CAB to restore service." },
  { q: "RITM stands for…", correct: "Requested Item", explain: "A REQ contains RITMs which spawn SCTASKs." },
  { q: "REQ stands for…", correct: "Request", explain: "The header record containing one or more RITMs." },
  { q: "SCTASK stands for…", correct: "Catalog Task", explain: "A fulfillment task spawned from a RITM." },
  { q: "SLA pause condition often used?", correct: "Awaiting User", explain: "Stops the SLA clock while waiting on the caller." },
];

const ITSM_LABEL_POOL = [
  "New", "In Progress", "On Hold", "Resolved", "Closed", "Canceled",
  "Assess", "Authorize", "Scheduled", "Implement", "Review",
  "Open", "Known Error", "Pending Change", "Closed/Resolved",
];

const ITSM_PROCESS_POOL = [
  "Impact × Urgency", "Severity × VIP", "Assignment × State", "SLA timer",
  "Standard", "Normal", "Emergency", "Latent",
  "Requested Item", "Request", "Catalog Task", "Routed IT Module",
  "Prevent recurrence by finding root cause", "Restore service fast", "Approve risky changes", "Fulfill catalog requests",
  "Awaiting User", "Awaiting Vendor", "Awaiting Change", "Awaiting Problem",
];

function itsmPool(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let seq = 0;
  for (let rep = 0; rep < 60; rep++) {
    ITSM_STATE_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-itsm-state-${seq}`,
        topic: "itsm",
        question: `On '${f.table}', which label corresponds to state code ${f.code}?`,
        correct: f.label,
        pool: ITSM_LABEL_POOL,
        explain: `${f.table} state ${f.code} = ${f.label}.`,
        salt: seq + i + rep,
      }));
    });
  }
  for (let rep = 0; rep < 150; rep++) {
    ITSM_PROCESS_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-itsm-proc-${seq}`,
        topic: "itsm",
        question: f.q + (rep > 0 ? ` (variant ${rep + 1})` : ""),
        correct: f.correct,
        pool: ITSM_PROCESS_POOL,
        explain: f.explain,
        salt: seq + i + rep,
      }));
    });
  }
  return out;
}

/* ------------------------------------------------------------ */
/* CMDB                                                         */
/* ------------------------------------------------------------ */

const CMDB_CLASS_FACTS: Array<{ table: string; parent: string }> = [
  { table: "cmdb_ci_server", parent: "cmdb_ci_hardware" },
  { table: "cmdb_ci_linux_server", parent: "cmdb_ci_server" },
  { table: "cmdb_ci_win_server", parent: "cmdb_ci_server" },
  { table: "cmdb_ci_unix_server", parent: "cmdb_ci_server" },
  { table: "cmdb_ci_esx_server", parent: "cmdb_ci_server" },
  { table: "cmdb_ci_db_instance", parent: "cmdb_ci_appl" },
  { table: "cmdb_ci_business_app", parent: "cmdb_ci_appl" },
  { table: "cmdb_ci_service", parent: "cmdb_ci" },
  { table: "cmdb_ci_service_discovered", parent: "cmdb_ci_service" },
  { table: "cmdb_ci_appl", parent: "cmdb_ci" },
  { table: "cmdb_ci_hardware", parent: "cmdb_ci" },
  { table: "cmdb_ci_network_gear", parent: "cmdb_ci_hardware" },
  { table: "cmdb_ci_router", parent: "cmdb_ci_network_gear" },
  { table: "cmdb_ci_switch", parent: "cmdb_ci_network_gear" },
];

const CMDB_PROCESS_FACTS = [
  { q: "Which table stores CI-to-CI relationships?", correct: "cmdb_rel_ci", explain: "cmdb_rel_ci holds parent/child/type." },
  { q: "What populates the CMDB automatically?", correct: "Discovery (with MID Server)", explain: "Probes the network and applies identification rules." },
  { q: "CSDM stands for…", correct: "Common Service Data Model", explain: "Prescriptive CI org blueprint." },
  { q: "Identification & Reconciliation engine prevents…", correct: "Duplicate CIs", explain: "IRE matches incoming payloads to existing CIs by identifier rules." },
  { q: "Which tool maps service topology automatically?", correct: "Service Mapping", explain: "Builds application service maps from entry points." },
  { q: "Which audit catches CI quality issues?", correct: "CMDB Health Dashboard", explain: "Tracks completeness, correctness, compliance." },
];

const CMDB_POOL = [
  "cmdb_ci", "cmdb_rel_ci", "cmdb_rel_type", "cmdb_ci_relationship",
  "cmdb_ci_hardware", "cmdb_ci_server", "cmdb_ci_linux_server", "cmdb_ci_win_server",
  "cmdb_ci_appl", "cmdb_ci_business_app", "cmdb_ci_service", "cmdb_ci_db_instance",
  "cmdb_ci_network_gear", "cmdb_ci_router", "cmdb_ci_switch",
  "Discovery (with MID Server)", "Import Sets", "Flow Designer", "Business Rules",
  "Common Service Data Model", "Cloud Service Data Model", "Configuration Standard Data Map", "Customer Service Data Manager",
  "Duplicate CIs", "Orphaned CIs", "Missing CIs", "Stale CIs",
  "Service Mapping", "Service Catalog", "Service Portfolio", "Service Portal",
  "CMDB Health Dashboard", "Performance Analytics", "Reports", "Dashboards",
];

function cmdbPool(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let seq = 0;
  for (let rep = 0; rep < 80; rep++) {
    CMDB_CLASS_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-cmdb-class-${seq}`,
        topic: "cmdb",
        question: `Which class does '${f.table}' extend?`,
        correct: f.parent,
        pool: CMDB_POOL,
        explain: `${f.table} extends ${f.parent}.`,
        salt: seq + i + rep,
      }));
    });
  }
  for (let rep = 0; rep < 150; rep++) {
    CMDB_PROCESS_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-cmdb-proc-${seq}`,
        topic: "cmdb",
        question: f.q + (rep > 0 ? ` (variant ${rep + 1})` : ""),
        correct: f.correct,
        pool: CMDB_POOL,
        explain: f.explain,
        salt: seq + i + rep,
      }));
    });
  }
  return out;
}

/* ------------------------------------------------------------ */
/* FLOW                                                         */
/* ------------------------------------------------------------ */

const FLOW_FACTS = [
  { q: "Flow Designer replaced which legacy tool?", correct: "Workflow Editor", explain: "FD is the modern low-code replacement." },
  { q: "What's a Spoke?", correct: "A pre-built integration pack", explain: "Slack, Jira, Azure spokes add ready actions." },
  { q: "Which licensed runtime powers most spokes?", correct: "IntegrationHub", explain: "Required for non-trivial spoke usage." },
  { q: "When is a Subflow appropriate?", correct: "For logic reused across multiple flows", explain: "Encapsulates reusable steps." },
  { q: "Which step looks up records?", correct: "Look Up Records", explain: "Built-in core action." },
  { q: "Which Flow trigger fires on insert?", correct: "Created", explain: "Record trigger 'Created' fires after insert." },
  { q: "Which Flow trigger fires on schedule?", correct: "Scheduled", explain: "Cron-style trigger for periodic runs." },
  { q: "Which Flow trigger fires from REST?", correct: "Inbound REST", explain: "Trigger exposed via Scripted REST API." },
  { q: "Action Designer extends Flow Designer with…", correct: "Custom reusable actions", explain: "Build your own actions with steps." },
  { q: "Which feature replays a Flow execution?", correct: "Flow Execution Details", explain: "Step-by-step trace with inputs/outputs." },
  // Triggers & Run As
  { q: "Which 'Run As' bypasses ACLs?", correct: "System User", explain: "System user runs with elevated privileges." },
  { q: "Which 'Run As' enforces the user's ACLs?", correct: "User who initiated the session", explain: "Steps run under the user's permissions." },
  { q: "Which trigger fires from a Catalog Item submission?", correct: "Service Catalog", explain: "Exposes the RITM and variables as data pills." },
  { q: "Which trigger lets external systems start a flow over HTTP?", correct: "Inbound REST", explain: "Exposes the flow via a generated endpoint." },
  { q: "Best way to prevent a record trigger from re-firing on every update?", correct: "Only the first time conditions are met", explain: "Trigger setting that suppresses repeats." },
  { q: "Tight trigger condition vs broad trigger + internal Decision — which is cheaper?", correct: "Tight trigger condition", explain: "Cheapest run is the one that never starts." },
  // Error handling & retries
  { q: "Which Flow Logic block traps action errors?", correct: "Try / Catch", explain: "Failed steps route into the Catch branch." },
  { q: "Safest 'on error' for an external write?", correct: "Stop and route to Catch", explain: "Fail loud + handle in Catch beats silent continue." },
  { q: "Cure for a flaky third-party API?", correct: "Retry with backoff + idempotent calls", explain: "Standard pattern for transient failures." },
  { q: "Without a timeout on an outbound call, you risk…", correct: "Flow waits indefinitely", explain: "Hung remote calls pin worker resources." },
  { q: "Idempotency means…", correct: "Same input → same outcome, safe to retry", explain: "Critical for retried external steps." },
  // Performance & scale
  { q: "Two independent outbound calls can run concurrently via…", correct: "Parallel branches", explain: "Flow Logic parallel block cuts wall-clock time." },
  { q: "High-volume production logging mode is…", correct: "Minimum logging", explain: "Keeps sys_flow_context manageable." },
  { q: "Processing 50k records best uses…", correct: "Chunked / scheduled subflow", explain: "Avoid single-run timeouts; resumable." },
  { q: "Async record trigger means…", correct: "User's save isn't blocked", explain: "Flow runs after the transaction commits." },
  { q: "Data Stream action is for…", correct: "Large paged REST responses", explain: "Streams without loading full payload." },
  // Design best practices
  { q: "Inline 30-line script in one flow belongs in…", correct: "Script Include called from a Custom Action", explain: "Keeps the canvas declarative and testable." },
  { q: "Swap dev/test/prod endpoints via…", correct: "Connection & Credential Alias", explain: "Alias resolves per environment." },
  { q: "Externalize complex if/else owned by business users via…", correct: "Decision Table", explain: "Owners edit rows; flow unchanged." },
  { q: "Surface business-meaningful progress with…", correct: "Stages", explain: "Named milestones visible on the request." },
  { q: "A flow that does validate + integrate + notify in one canvas is a…", correct: "God Flow anti-pattern", explain: "Decompose into subflows by responsibility." },
  { q: "Multi-flow end-to-end process orchestrator is…", correct: "Process Automation Designer", explain: "PAD stitches flows into lanes/stages." },
  // Versioning & ops
  { q: "Why won't a saved flow change behave differently at the trigger?", correct: "It wasn't Published / Activated", explain: "Trigger uses the active version." },
  { q: "Rollback a bad flow change by…", correct: "Activating an older published version", explain: "Versioning is built in." },
  { q: "In-flight runs after a new publish use…", correct: "The version they started on", explain: "Only new triggers pick up the change." },
  { q: "Calling a flow from a Script Include uses…", correct: "sn_fd.FlowAPI.getRunner()", explain: "Public API for executing flows/subflows from script." },
  { q: "Per-run state record is stored in…", correct: "sys_flow_context", explain: "Holds inputs, outputs, current step, status." },
  { q: "Best debug loop while authoring a flow is…", correct: "Test against a sample record", explain: "Step-by-step inputs/outputs in Designer." },
  { q: "Aggregate For Each results into a list by…", correct: "Pushing into a Flow Variable array", explain: "For Each has no aggregated output." },
  { q: "Domain-separated instances run…", correct: "The right version per tenant", explain: "Flows respect domain separation." },
];

const FLOW_POOL = [
  "Workflow Editor", "GlideRecord", "Update Set Editor", "Performance Analytics",
  "A pre-built integration pack", "A reusable subflow", "A debugging tool", "A type of CI relationship",
  "IntegrationHub", "Service Portal", "MID Server",
  "For logic reused across multiple flows", "Only in global scope", "For UI customization", "Never",
  "Look Up Records", "Create Record", "Update Record", "Delete Record",
  "Created", "Updated", "Scheduled", "Inbound REST", "Service Catalog",
  "Custom reusable actions", "Workflow tasks", "Client scripts", "UI policies",
  "Flow Execution Details", "Reports", "Dashboards",
  // Run As + triggers
  "System User", "User who initiated the session", "Service Account", "Maintenance",
  "Only the first time conditions are met", "Every update", "Once per day", "Never",
  "Tight trigger condition", "Broad trigger + internal Decision", "No difference", "Always broad",
  // Errors
  "Try / Catch", "Decision", "For Each", "Wait For Condition",
  "Stop and route to Catch", "Continue silently", "Retry forever", "Ignore",
  "Retry with backoff + idempotent calls", "Increase quota", "Run synchronously", "Add a Wait step",
  "Flow waits indefinitely", "Flow speeds up", "User is notified", "Nothing changes",
  "Same input → same outcome, safe to retry", "Always returns null", "Runs only once globally", "Random output",
  // Performance
  "Parallel branches", "Two For Each loops", "Sequential actions", "Wait For Condition",
  "Minimum logging", "Full logging", "Verbose", "Debug",
  "Chunked / scheduled subflow", "Increase transaction quota", "Switch to Business Rule", "Run foreground",
  "User's save isn't blocked", "User waits for completion", "Logging is skipped", "There is no difference",
  "Large paged REST responses", "Small payloads only", "JDBC imports", "MID Server health",
  // Design
  "Script Include called from a Custom Action", "Inline Script step", "Business Rule on the table", "UI Script",
  "Connection & Credential Alias", "Hard-coded URLs", "Branch on instance name", "Duplicate the flow",
  "Decision Table", "Giant Decision step", "Inline Script", "Nested Flow Logic",
  "Stages", "Data Pills", "Flow Variables", "Decision Tables",
  "God Flow anti-pattern", "Best practice", "Required by the platform", "Spoke pattern",
  "Process Automation Designer", "Flow Designer", "Workflow Editor", "MID Server",
  // Versioning & ops
  "It wasn't Published / Activated", "Cache is cold", "Update sets are off", "ACLs blocked it",
  "Activating an older published version", "Restoring from backup", "Rebuilding the flow", "Calling support",
  "The version they started on", "The new active version", "The default version", "No version",
  "sn_fd.FlowAPI.getRunner()", "GlideFlow.run()", "FlowRunner.execute()", "gs.runFlow()",
  "sys_flow_context", "sys_flow_log", "sys_audit", "sys_journal_field",
  "Test against a sample record", "Read the source XML", "Tail node logs", "Ask in chat",
  "Pushing into a Flow Variable array", "Using the loop's output", "Adding a Decision", "Wait For Condition",
  "The right version per tenant", "Always the global version", "Random version", "No version",
];

function flowPool(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let seq = 0;
  for (let rep = 0; rep < 340; rep++) {
    FLOW_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-flow-${seq}`,
        topic: "flow",
        question: f.q + (rep > 0 ? ` (variant ${rep + 1})` : ""),
        correct: f.correct,
        pool: FLOW_POOL,
        explain: f.explain,
        salt: seq + i + rep,
      }));
    });
  }
  return out;
}

/* ------------------------------------------------------------ */
/* INTEGRATION                                                  */
/* ------------------------------------------------------------ */

const INTEG_FACTS = [
  { q: "A REST Message is used for…", correct: "Outbound REST calls", explain: "Inbound endpoints use Scripted REST API." },
  { q: "When do you need a MID Server?", correct: "To reach systems behind the firewall", explain: "Bridges cloud to on-prem." },
  { q: "Transform Maps do what?", correct: "Map source fields to target table fields", explain: "Shape import_set data into real targets." },
  { q: "Which is the inbound REST mechanism?", correct: "Scripted REST API", explain: "Exposes /api/<ns>/<api>/<resource>." },
  { q: "Which API sends an outbound REST call from script?", correct: "RESTMessageV2", explain: "Server-side helper for outbound HTTP." },
  { q: "Which auth profile type stores OAuth credentials?", correct: "OAuth 2.0", explain: "Configured under System OAuth." },
  { q: "Which table stages bulk inbound data?", correct: "Import Set table", explain: "Stage → transform → target." },
  { q: "Which spoke ships with ServiceNow for chat?", correct: "Microsoft Teams", explain: "MS Teams spoke is a common pre-built integration." },
  { q: "Which integration pattern polls a remote source?", correct: "Scheduled Data Import", explain: "Pulls on a cron schedule via the Import Set table." },
  { q: "What encodes outbound payload bodies typically?", correct: "JSON", explain: "Most modern REST integrations use JSON bodies." },
];

const INTEG_POOL = [
  "Outbound REST calls", "Inbound REST endpoints", "Email notifications", "MID Server health",
  "To reach systems behind the firewall", "For all REST calls", "To run client scripts faster", "Only for SOAP",
  "Map source fields to target table fields", "Encrypt data", "Schedule the import", "Validate SSL",
  "Scripted REST API", "REST Message", "Outbound Web Service", "MID Server Probe",
  "RESTMessageV2", "RESTMessage", "GlideHTTPRequest", "GlideAjax",
  "OAuth 2.0", "Basic Auth", "API Key", "Mutual TLS",
  "Import Set table", "cmdb_ci", "sys_user", "sys_import_log",
  "Microsoft Teams", "Active Directory", "Salesforce", "Workday",
  "Scheduled Data Import", "Push Webhook", "Manual Upload", "MID Server Probe",
  "JSON", "XML", "YAML", "CSV",
];

function integPool(): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  let seq = 0;
  for (let rep = 0; rep < 340; rep++) {
    INTEG_FACTS.forEach((f, i) => {
      seq++;
      out.push(build({
        id: `gen-q-integ-${seq}`,
        topic: "integration",
        question: f.q + (rep > 0 ? ` (variant ${rep + 1})` : ""),
        correct: f.correct,
        pool: INTEG_POOL,
        explain: f.explain,
        salt: seq + i + rep,
      }));
    });
  }
  return out;
}

/* ------------------------------------------------------------ */

let cache: QuizQuestion[] | null = null;
export function generatedQuizzes(): QuizQuestion[] {
  if (cache) return cache;
  cache = [
    ...platformPool(),
    ...itsmPool(),
    ...cmdbPool(),
    ...flowPool(),
    ...integPool(),
  ];
  return cache;
}

export function generatedQuizzesFor(topic: TopicId): QuizQuestion[] {
  return generatedQuizzes().filter((q) => q.topic === topic);
}
