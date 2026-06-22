import type { TopicId } from "./glossary";

export interface QuizQuestion {
  id: string;
  topic: TopicId;
  question: string;
  options: string[];
  correctIndex: number;
  /** Short summary shown right after answering. */
  explain: string;
  /** Optional richer breakdown rendered below `explain`. */
  whyCorrect?: string;
  /** Per-option pitfalls — keyed by option index. Shown when the user picks that wrong option. */
  whyWrong?: Record<number, string>;
  /** Short bullets with deeper context, gotchas, or follow-up reading prompts. */
  learnMore?: string[];
}


export const QUIZZES: QuizQuestion[] = [
  // Platform
  {
    id: "p1", topic: "platform",
    question: "Which scope should new custom applications use?",
    options: ["Global", "Scoped (custom)", "System", "ITIL"],
    correctIndex: 1,
    explain: "Scoped apps isolate artifacts and prevent name collisions. Global is the legacy unrestricted namespace.",
    whyCorrect: "A scoped application gets its own namespace (e.g. x_acme_myapp), its own roles, and explicit cross-scope access rules. That isolation is what makes apps safe to ship to other instances and to the Store.",
    whyWrong: {
      0: "Global has no namespace boundary, so two teams can clobber each other's business rules, script includes, and table names. ServiceNow has been steering custom work out of Global since the Geneva release.",
      2: "‘System’ isn't a user-selectable scope — those are platform-owned artifacts like sys_user and sys_metadata. You can't put custom apps there.",
      3: "ITIL is a role, not a scope. It controls what records a user can see, not where your app's code lives.",
    },
    learnMore: [
      "Scoped apps default to ‘Restricted’ for cross-scope reads/writes — you opt in per script include or table.",
      "Application files in a scoped app travel via the Application Repository, not Update Sets.",
    ],
  },
  {
    id: "p2", topic: "platform",
    question: "What does dot-walking let you do?",
    options: ["Run SQL JOINs manually", "Traverse reference fields without a JOIN", "Walk through update sets", "Step through scripts line-by-line"],
    correctIndex: 1,
    explain: "Dot-walking traverses reference fields automatically, e.g. incident.caller_id.manager.email.",
    whyCorrect: "When a field is a reference (foreign key), GlideRecord and the form engine resolve the join transparently. `gr.caller_id.manager.email` issues the lookups under the hood so you can write business logic without hand-rolling joins.",
    whyWrong: {
      0: "You never write SQL JOINs in ServiceNow — the platform abstracts the database. GlideRecord + dot-walking is the supported path.",
      2: "Update sets are tracked through the Local Update Sets module, not by ‘walking’ them.",
      3: "Stepping through scripts is the Script Debugger. Dot-walking is a data-access pattern.",
    },
    learnMore: [
      "Each dot-walk hop is an extra query — mind hot loops; use GlideAggregate or a database view for heavy joins.",
      "On a form, dot-walked fields appear with a small reference icon and are read-only by default.",
    ],
  },
  {
    id: "p3", topic: "platform",
    question: "Update Sets capture which of these?",
    options: ["Configuration records only", "Data records only", "Both config and data", "Attachments only"],
    correctIndex: 0,
    explain: "Update Sets ship configuration (business rules, UI policies, etc.). For data you need data imports or fix scripts.",
    whyCorrect: "Update Sets track changes to records flagged with the ‘sys_metadata’ marker — business rules, UI policies, client scripts, tables, ACLs. Those artifacts make up an application's configuration.",
    whyWrong: {
      1: "Operational data (incidents, users, CIs) is intentionally excluded. Moving data uses Import Sets, XML exports, or fix scripts.",
      2: "Mixing data into update sets is a classic anti-pattern — promotions become non-repeatable and overwrite live records in higher environments.",
      3: "Attachments to config records can ride along, but attachments alone aren't what update sets exist for.",
    },
    learnMore: [
      "Always run ‘Preview Update Set’ before committing — it surfaces collisions and lets you skip individual updates.",
      "Batch update sets to chain related changes and commit in one ordered pass.",
    ],
  },
  {
    id: "p4", topic: "platform",
    question: "Incident extends which table?",
    options: ["cmdb_ci", "sys_user", "task", "sys_metadata"],
    correctIndex: 2,
    explain: "Incident extends Task, so it inherits state, assigned_to, sys_id, etc.",
    whyCorrect: "Task is the abstract parent for any record that represents work — Incident, Problem, Change, RITM, SCTASK. That's why they share workflow fields (state, assignment_group, work_notes, SLA hooks).",
    whyWrong: {
      0: "cmdb_ci is the root of Configuration Items — servers and apps, not work records.",
      1: "sys_user is the people table. Incidents reference users via caller_id, but they don't extend it.",
      3: "sys_metadata is the parent of configuration artifacts (business rules, UI policies) — platform plumbing, not business data.",
    },
    learnMore: [
      "Querying `task` returns Incidents, Problems, Changes, etc. — handy for ‘all my work’ dashboards.",
      "Custom work tables should also extend Task so they inherit assignment, SLA, and notifications for free.",
    ],
  },

  // ITSM
  { id: "i1", topic: "itsm", question: "Priority on an incident is calculated from…", options: ["Impact × Urgency", "Severity × Caller VIP", "Assignment Group × State", "SLA timer"], correctIndex: 0, explain: "Out of the box, Priority = Impact × Urgency via a Priority Lookup Rules table.", whyCorrect: "The Priority Lookup Rules table (sys_priority) maps every (Impact, Urgency) pair to a Priority value. The Incident business rule reads that table on insert/update.", whyWrong: { 1: "Severity isn't an OOB field on Incident. VIP status can drive separate notifications but doesn't set Priority directly.", 2: "Assignment Group and State govern routing and workflow, not priority math.", 3: "SLAs are consumed by Priority — they don't produce it." }, learnMore: ["Customers often override the lookup table to tweak the 5×5 matrix without touching code.", "Major Incident workflows can promote Priority independently of the matrix."] },
  { id: "i2", topic: "itsm", question: "What's the primary goal of Problem Management?", options: ["Restore service fast", "Prevent recurrence by finding root cause", "Approve risky changes", "Fulfill catalog requests"], correctIndex: 1, explain: "Incident restores service; Problem prevents the next incident by addressing root cause.", whyCorrect: "Problem records pair a known error with a workaround and a fix, so the same outage doesn't keep recurring across many incidents.", whyWrong: { 0: "That's Incident Management — speed of restoration. Problem trades speed for durability of the fix.", 2: "Approving risky changes is Change Management (CAB).", 3: "Fulfilling catalog requests is Request Management (REQ → RITM → SCTASK)." }, learnMore: ["Major Incidents typically auto-create a Problem to drive RCA.", "Known Errors feed a Knowledge Base entry so L1 can apply the workaround."] },
  { id: "i3", topic: "itsm", question: "Which change type is pre-approved and low risk?", options: ["Normal", "Emergency", "Standard", "Latent"], correctIndex: 2, explain: "Standard changes follow a pre-approved template (e.g. password reset). Normal needs CAB; Emergency is fast-tracked.", whyCorrect: "A Standard Change Template encodes the steps and risk of a low-impact change so it can be executed repeatedly without CAB review.", whyWrong: { 0: "Normal changes require CAB approval and a full risk assessment.", 1: "Emergency changes bypass CAB only because of urgency — they're high-risk, not low-risk.", 3: "‘Latent’ isn't a ServiceNow change type." }, learnMore: ["Standard Change proposals start as Normal and graduate to Standard after enough successful executions.", "Templates can lock down fields so the change can only be raised in the approved shape."] },
  { id: "i4", topic: "itsm", question: "What does RITM stand for?", options: ["Requested IT Module", "Requested Item", "Routed Incident Ticket Manager", "Resource IT Management"], correctIndex: 1, explain: "A Request (REQ) contains one or more Requested Items (RITM), which spawn Catalog Tasks (SCTASK).", whyCorrect: "Catalog flow: REQ (the shopping cart) → RITM (one item in the cart) → SCTASK (the work to deliver it).", whyWrong: { 0: "Plausible expansion but not the ServiceNow term — the platform uses ‘Item’, not ‘Module’.", 2: "RITM has nothing to do with Incident; it's the Service Catalog stack.", 3: "‘Resource IT Management’ isn't a ServiceNow acronym." }, learnMore: ["Approvals usually attach to the RITM, not the REQ.", "SCTASKs route to fulfillment groups defined on the catalog item's workflow."] },

  // CMDB
  { id: "c1", topic: "cmdb", question: "Which table stores CI-to-CI relationships?", options: ["cmdb_ci", "cmdb_rel_ci", "cmdb_rel_type", "cmdb_ci_relationship"], correctIndex: 1, explain: "cmdb_rel_ci stores parent / child / type for every relationship between CIs.", whyCorrect: "Each row in cmdb_rel_ci has parent, child, and type — that triple defines one directed edge in the CI graph.", whyWrong: { 0: "cmdb_ci is the CI table itself (the nodes), not the edges.", 2: "cmdb_rel_type defines the *catalogue* of relationship types (‘Runs on’, ‘Depends on’) — it doesn't hold individual relationships.", 3: "cmdb_ci_relationship doesn't exist as an OOB table." }, learnMore: ["Dependency Views and Service Maps render by walking cmdb_rel_ci.", "Bad data here is a top cause of broken impact analysis — guard it with identification & reconciliation rules."] },
  { id: "c2", topic: "cmdb", question: "What populates the CMDB automatically?", options: ["Import Sets", "Discovery (with a MID Server)", "Flow Designer", "Business Rules"], correctIndex: 1, explain: "Discovery probes the network via a MID Server and creates/updates CIs based on identification rules.", whyCorrect: "Discovery schedules run probes (SSH, WMI, SNMP) from the MID Server, then sensors hand the payload to the Identification & Reconciliation Engine (IRE) which creates or updates the right CI.", whyWrong: { 0: "Import Sets can load CIs but they're manual feeds — not automatic discovery.", 2: "Flow Designer orchestrates work; it doesn't probe infrastructure.", 3: "Business Rules react to record changes — they can't reach out to scan the network." }, learnMore: ["Service Mapping is Discovery's app-aware sibling — top-down vs Discovery's bottom-up.", "All inserts/updates from any source should go through the IRE to avoid duplicate CIs."] },
  { id: "c3", topic: "cmdb", question: "CSDM stands for…", options: ["Cloud Service Data Model", "Common Service Data Model", "Configuration Standard Data Map", "Customer Service Data Manager"], correctIndex: 1, explain: "CSDM is the prescriptive blueprint for organizing CIs across Foundation, Design, Build, and Manage domains.", whyCorrect: "CSDM is ServiceNow's published standard for how Business Services, Application Services, and supporting CIs relate — a shared vocabulary across ITSM, ITOM, ITBM, and SecOps.", whyWrong: { 0: "Plausible but wrong — CSDM is not cloud-specific.", 2: "Not a real ServiceNow term.", 3: "Confuses CSDM with Customer Service Management (CSM)." }, learnMore: ["Crawl/Walk/Run/Fly maturity model guides phased adoption.", "Aligning to CSDM is a prerequisite for accurate Service Owner reporting and SAM/HAM integration."] },
  { id: "c4", topic: "cmdb", question: "A Linux server CI lives on which class table?", options: ["cmdb_ci", "cmdb_ci_server", "cmdb_ci_linux_server", "cmdb_ci_computer"], correctIndex: 2, explain: "Each CI sits on the most specific class table; cmdb_ci_linux_server extends cmdb_ci_server which extends cmdb_ci.", whyCorrect: "ServiceNow uses table-per-class inheritance, and a CI is stored on its most specific class so attributes unique to Linux servers (e.g. distribution) have a home.", whyWrong: { 0: "cmdb_ci is the abstract root — a CI lives *under* it, not directly on it.", 1: "cmdb_ci_server is the generic server class; Linux servers extend it further.", 3: "cmdb_ci_computer covers workstations/laptops, not servers." }, learnMore: ["Class Manager visualizes the hierarchy and lets you create custom child classes.", "Reclassification rules during Discovery promote a CI to a more specific class when richer data arrives."] },


  { id: "f1", topic: "flow", question: "Flow Designer replaced which tool for most new automations?", options: ["Workflow Editor", "GlideRecord", "Update Set Editor", "Performance Analytics"], correctIndex: 0, explain: "Flow Designer is the modern, low-code replacement for the legacy Workflow Editor." },
  { id: "f2", topic: "flow", question: "What's a Spoke?", options: ["A reusable subflow", "A pre-built integration pack", "A debugging tool", "A type of CI relationship"], correctIndex: 1, explain: "Spokes are integration packs (Slack, Jira, Azure, etc.) that add ready-made Flow Designer actions." },
  { id: "f3", topic: "flow", question: "Which is required to use most spokes?", options: ["Performance Analytics", "IntegrationHub", "Service Portal", "MID Server"], correctIndex: 1, explain: "IntegrationHub is the licensed runtime that powers spokes and custom Action Designer steps." },
  { id: "f4", topic: "flow", question: "When should you build a Subflow?", options: ["Never — flows can't call other flows", "For logic reused across multiple flows", "Only inside global scope", "For UI customization"], correctIndex: 1, explain: "Subflows encapsulate reusable logic with inputs/outputs so flows stay DRY and readable." },

  // Flow Designer — triggers, design, error handling, performance, best practices
  { id: "f5", topic: "flow", question: "A record-trigger flow keeps firing in a loop every time it updates the record. The cleanest fix is to…", options: ["Add a sleep step", "Set 'Run trigger' to 'Only the first time conditions are met'", "Move it to a Business Rule", "Mark the flow as inactive"], correctIndex: 1, explain: "The 'Only the first time conditions are met' option prevents re-fires when the same record continues to match.", whyCorrect: "Record triggers re-evaluate the condition on every update. Restricting them to the first match (or to a transition like new → in-progress) is the design-correct fix.", whyWrong: { 0: "Sleeping doesn't change why it's firing — the trigger still matches.", 2: "Business rules have the same re-entrancy problem; moving is not a fix.", 3: "Inactive flows simply don't run — that's not a fix, it's avoidance." }, learnMore: ["Combine with a tight encoded query on the trigger condition.", "For state-machine flows, condition on the *transition* (e.g. state changes from 2 to 3) rather than a static value."] },
  { id: "f6", topic: "flow", question: "Which 'Run As' option enforces the running user's ACLs?", options: ["System User", "User who initiated the session", "Service Account", "Maintenance"], correctIndex: 1, explain: "'User who initiated the session' runs steps as that user, so ACLs and data policies apply.", whyCorrect: "System User runs with elevated privileges and bypasses ACLs — handy but dangerous. Pick the initiating user when the flow should respect the user's permissions.", whyWrong: { 0: "System User bypasses ACLs — opposite of what was asked.", 2: "'Service Account' isn't an OOB Run As option.", 3: "Maintenance isn't a Run As mode either." }, learnMore: ["A flow that updates restricted tables under System User can silently grant a user more access than they should have.", "Audit Run As whenever you copy a flow — defaults vary by trigger type."] },
  { id: "f7", topic: "flow", question: "Where do you wrap a fragile external REST step so a single failure doesn't kill the whole flow?", options: ["A Decision step", "A Try/Catch block (Flow Logic)", "A For Each", "A Wait For Condition"], correctIndex: 1, explain: "Flow Logic provides Try/Catch — failed steps route into Catch where you can log, notify, or retry.", whyCorrect: "Without Try/Catch, an action error fails the whole run. The Catch branch is where you put logging, compensating actions, and a graceful fallback.", whyWrong: { 0: "Decision branches on a value, not on errors.", 2: "For Each iterates a list; it doesn't trap errors.", 3: "Wait pauses until a condition; it doesn't handle failures." }, learnMore: ["Log a correlation id in Catch so support can trace the bad run.", "Pair Try/Catch with idempotent remote calls so retries are safe."] },
  { id: "f8", topic: "flow", question: "A flow calls a third-party API that occasionally times out. Best design is to…", options: ["Increase the transaction quota globally", "Add a retry with backoff and make the remote call idempotent", "Wrap the action in a Wait For Condition", "Run the whole flow synchronously in the foreground"], correctIndex: 1, explain: "Idempotent retries with backoff are the standard cure for flaky external endpoints.", whyCorrect: "Retries handle transient errors; idempotency (correlation id / upsert) ensures the duplicate call doesn't create duplicate side effects.", whyWrong: { 0: "Transaction quotas affect synchronous user actions, not asynchronous flow runs.", 2: "Wait For Condition is for record state, not network reliability.", 3: "Foreground runs make the user wait — and don't make the API any more reliable." }, learnMore: ["Action steps expose retry count and backoff settings; use exponential backoff.", "Always set a timeout so a hung call doesn't pin a worker thread."] },
  { id: "f9", topic: "flow", question: "Which step is the right way to perform two independent outbound calls faster?", options: ["Two For Each loops", "Parallel branches in Flow Logic", "Two sequential actions", "Wait For Condition between them"], correctIndex: 1, explain: "Parallel branches run independent work concurrently, cutting wall-clock time without scripting.", whyCorrect: "Parallel branching lets the flow engine fire both actions at once and re-join afterwards — exactly when neither call depends on the other.", whyWrong: { 0: "Loops don't help; each call still serializes.", 2: "Sequential is what you're trying to fix.", 3: "Wait For Condition adds latency, not parallelism." }, learnMore: ["Only branch when there's no data dependency between the steps.", "If branches share a downstream consumer, collect both outputs in flow variables and merge after the join."] },
  { id: "f10", topic: "flow", question: "You need to call a flow from a Script Include. The supported API is…", options: ["GlideFlow.run()", "sn_fd.FlowAPI.getRunner().subflow(...).run()", "FlowRunner.execute()", "gs.runFlow()"], correctIndex: 1, explain: "sn_fd.FlowAPI.getRunner() is the supported entry point for executing flows/subflows from script.", whyCorrect: "Use getRunner().subflow('scope/name').inForeground().withInputs({...}).run(). For fire-and-forget use .inBackground().", whyWrong: { 0: "GlideFlow is not the public API.", 2: "FlowRunner is internal — don't call it directly.", 3: "gs.runFlow doesn't exist." }, learnMore: ["Subflows expose typed inputs/outputs that match the contract you defined in Flow Designer.", "Calling a flow from a business rule is OK, but consider triggering it directly with a record trigger instead."] },
  { id: "f11", topic: "flow", question: "What's the right way to swap dev/test/prod API endpoints for the same flow?", options: ["Hard-code the URL in the action", "Use a Connection & Credential Alias", "Branch on instance name", "Duplicate the flow per environment"], correctIndex: 1, explain: "An alias resolves to a different connection record per environment — same flow, different endpoint.", whyCorrect: "Aliases are the supported indirection so promotion across environments needs zero flow edits — just update the connection record on the target instance.", whyWrong: { 0: "Hard-coded URLs break the moment you promote.", 2: "Instance-name branching is brittle and clutters the flow.", 3: "Duplicate flows drift apart over time." }, learnMore: ["Credentials referenced via alias are stored encrypted at rest.", "Spokes are typically built to accept an alias rather than a fixed connection."] },
  { id: "f12", topic: "flow", question: "Flow Designer's recommended logging mode for high-volume production flows is…", options: ["Full logging", "Minimum logging", "Verbose", "Debug"], correctIndex: 1, explain: "Minimum logging records only step transitions and errors — keeps sys_flow_context manageable at scale.", whyCorrect: "High-volume flows fill the context table fast. Minimum logging preserves enough trace to debug failures without exploding storage.", whyWrong: { 0: "Full logging is for dev/debug only — too expensive at scale.", 2: "'Verbose' isn't a Flow Designer logging mode.", 3: "'Debug' isn't a logging-mode label either." }, learnMore: ["Bump to full logging temporarily when you need to diagnose a specific run.", "Set a tighter retention policy on sys_flow_context for hot flows."] },
  { id: "f13", topic: "flow", question: "After editing a flow, users say nothing changed. Most likely cause is…", options: ["Cache is cold", "You saved but didn't Publish/Activate the new version", "Update sets are off", "ACLs blocked the trigger"], correctIndex: 1, explain: "Save is not enough — the trigger uses the active published version.", whyCorrect: "Flow Designer versions flows. Saving creates a draft; publishing snapshots a new version; activating tells the trigger to use it.", whyWrong: { 0: "Cache rarely sticks for flow definitions.", 2: "Update sets affect promotion, not local execution.", 3: "ACL issues usually surface as access errors, not 'no change'." }, learnMore: ["Rollback by activating an older version — no code restore needed.", "In-flight runs finish on the version they started; only new triggers pick up the change."] },
  { id: "f14", topic: "flow", question: "Which trigger type does a Catalog Item / Record Producer fire?", options: ["Record (cmdb_ci)", "Service Catalog", "Inbound REST", "Application"], correctIndex: 1, explain: "Service Catalog triggers expose the RITM and its variables as data pills.", whyCorrect: "When a user submits a catalog item, the Service Catalog trigger gives the flow the RITM record plus all the variable values.", whyWrong: { 0: "Record triggers fire from table changes, not catalog submissions.", 2: "Inbound REST is for external systems calling the flow over HTTP.", 3: "Application triggers are custom app events." }, learnMore: ["This trigger replaces the legacy workflow attached to catalog items.", "Multiple catalog items can share one flow if the variable sets line up."] },
  { id: "f15", topic: "flow", question: "Which Flow Designer feature surfaces business-meaningful progress to users without exposing the step trace?", options: ["Data Pills", "Stages", "Flow Variables", "Decision Tables"], correctIndex: 1, explain: "Stages mark named milestones (e.g. 'Approval pending', 'Provisioning') visible on the request.", whyCorrect: "Stages decouple the user-visible progress from the internal step list, so you can refactor the flow without changing what users see.", whyWrong: { 0: "Data pills are step outputs — not progress.", 2: "Variables are internal state.", 3: "Decision Tables externalize branching logic." }, learnMore: ["Map stages to existing request UI for free progress bars.", "Keep stage names stable — users build muscle memory around them."] },
  { id: "f16", topic: "flow", question: "What's the design-correct way to model a complex nested if/else that business owners will edit?", options: ["A giant Decision step", "An inline Script step", "A Decision Table", "Nested Flow Logic"], correctIndex: 2, explain: "Decision Tables externalize rules so non-developers can edit them without touching the flow.", whyCorrect: "Decision Tables turn rules into rows. Owners change rows; the flow stays unchanged — perfect for pricing, routing, eligibility logic.", whyWrong: { 0: "A giant Decision step becomes unreadable.", 1: "Scripts hide logic from owners.", 3: "Nested Flow Logic is hard to test and review." }, learnMore: ["Decision Tables ship versioning so you can rollback a rule change.", "Pair with Audit so rule changes leave a trail."] },
  { id: "f17", topic: "flow", question: "A flow processes 50k records in a For Each and times out. Best redesign?", options: ["Increase the transaction quota", "Stream in chunks via a scheduled subflow / Data Stream action", "Switch to a Business Rule", "Run synchronously in the foreground"], correctIndex: 1, explain: "Chunked, paged processing avoids the single-run timeout and is restartable.", whyCorrect: "Split the work: a scheduled driver flow paginates, a worker subflow processes one chunk, and progress is persisted so reruns resume where the last one stopped.", whyWrong: { 0: "Quotas don't help asynchronous flows much, and brute-force isn't the design fix.", 2: "Business Rules face the same transaction limit.", 3: "Foreground makes the user wait without solving the volume problem." }, learnMore: ["Use Data Stream actions when the upstream API supports paging.", "Always log a correlation id per chunk for traceability."] },
  { id: "f18", topic: "flow", question: "What's the right place for a 30-line custom script needed by exactly one flow?", options: ["Inline Script step in the flow", "A Script Include called from a Custom Action", "A Business Rule on the trigger table", "A UI Script"], correctIndex: 1, explain: "Script Include + Custom Action keeps the flow canvas declarative and the script unit-testable.", whyCorrect: "Custom Actions wrap the script behind typed inputs/outputs. The flow stays readable; the script gets reuse, testing, and unit-level scope control.", whyWrong: { 0: "Inline scripts hide logic and are hard to test.", 2: "Business Rules duplicate triggering and can cause loops.", 3: "UI Scripts run client-side — irrelevant here." }, learnMore: ["Name the action by what it *does*, not how it works inside.", "Reuse the action in other flows the moment a second caller appears."] },
  { id: "f19", topic: "flow", question: "Which is the safest default 'on error' setting for an action that writes to an external system?", options: ["Continue", "Stop the flow and route to a Catch / error branch", "Retry forever", "Ignore"], correctIndex: 1, explain: "Failing loud + a Catch branch with logging beats silent continuation.", whyCorrect: "Stop + Catch ensures someone sees the failure and a compensating action can run. Continue-on-error is the most common cause of silent data corruption.", whyWrong: { 0: "Continue hides failures.", 2: "Forever-retry can lock workers and amplify outages.", 3: "Ignore is identical to continue and worse for auditing." }, learnMore: ["Log to a dedicated table so you can build a single 'flow failures' dashboard.", "Notify the flow owner, not a shared inbox."] },
  { id: "f20", topic: "flow", question: "Process Automation Designer (PAD) is best described as…", options: ["A replacement for Flow Designer", "An orchestrator that stitches multiple flows into a multi-stage business process", "A UI for ACLs", "A debugger for actions"], correctIndex: 1, explain: "PAD adds lanes/stages across multiple flows for end-to-end processes (e.g. onboarding).", whyCorrect: "Flow Designer builds a single automation; PAD composes many of them into a longer business process with its own progress UI.", whyWrong: { 0: "PAD complements Flow Designer; it doesn't replace it.", 2: "PAD has nothing to do with ACLs.", 3: "Debugging lives in Flow Execution Details." }, learnMore: ["Use PAD when stakeholders ask 'where are we in the overall process?' rather than 'which step is running?'.", "Each lane in PAD typically maps to a team's owned subflow."] },
  { id: "f21", topic: "flow", question: "How do you collect results from a For Each iteration into a list?", options: ["Use the loop's built-in output", "Push to a Flow Variable (array) inside the loop and read it after", "Use a Decision step", "Use Wait For Condition"], correctIndex: 1, explain: "For Each doesn't return a list — accumulate into a flow variable.", whyCorrect: "Flow variables are mutable across the run. Initialize an array variable, append inside the loop, and read it once the loop exits.", whyWrong: { 0: "For Each has no aggregated output by default.", 2: "Decision branches; it doesn't accumulate.", 3: "Wait For Condition pauses — it doesn't collect." }, learnMore: ["Pre-size or paginate when the list is huge.", "Avoid pushing entire GlideRecord references — store only the fields you need."] },
  { id: "f22", topic: "flow", question: "Two trigger configurations are equivalent except one filters tightly and one filters broadly with a Decision step inside. Which is better?", options: ["Broad trigger + Decision (easier to read)", "Tight trigger condition (cheapest run is the one that doesn't start)", "They perform the same", "Always broad — Decision steps are free"], correctIndex: 1, explain: "Trigger filters are evaluated server-side before a run is created; cheaper than starting a run to discard it.", whyCorrect: "Tight trigger conditions prevent unnecessary flow contexts. Broad triggers + internal Decision steps still allocate a run, log it, and consume capacity.", whyWrong: { 0: "Readability doesn't outweigh production cost at scale.", 2: "They don't perform the same — one allocates a run, one doesn't.", 3: "Decision steps cost CPU + log volume." }, learnMore: ["Index the columns referenced in your trigger condition.", "When the condition is complex, encode it as an encoded query string for clarity."] },
  { id: "f23", topic: "flow", question: "Which is true about Async vs Sync flows on a record trigger?", options: ["Async blocks the user's save until the flow finishes", "Async runs after the transaction commits, so the user's save isn't blocked", "Sync skips logging", "There's no difference"], correctIndex: 1, explain: "Async is the default for record triggers; the user's save is fast and the flow runs in the background.", whyCorrect: "Async decouples expensive automation from the user's save. Sync only when downstream steps absolutely must complete before the response.", whyWrong: { 0: "Async is precisely the opposite — it doesn't block.", 2: "Logging mode is independent of sync/async.", 3: "Sync vs async is a very real behavioral difference." }, learnMore: ["Sync flows count against the user's transaction quota.", "If a user needs an immediate response (e.g. validation), use a Business Rule or UI Action, not a sync flow."] },
  { id: "f24", topic: "flow", question: "Spokes are distributed primarily through…", options: ["Application Repository / ServiceNow Store", "Update Sets only", "GitHub", "Email"], correctIndex: 0, explain: "Spokes ship via the Store / app repository — many are free with IntegrationHub entitlements.", whyCorrect: "ServiceNow publishes spokes (Slack, Teams, Jira, Azure, AWS) through the Store. They install as scoped apps with versioning and update notifications.", whyWrong: { 1: "Update sets are for in-house promotion, not packaged spokes.", 2: "GitHub hosts samples, not the licensed spoke runtime.", 3: "Email isn't a distribution mechanism." }, learnMore: ["Most spokes require IntegrationHub Standard or higher.", "Check the spoke's compatibility matrix before upgrading the platform."] },
  { id: "f25", topic: "flow", question: "Which is a clear sign you should decompose a flow into subflows?", options: ["It has more than one trigger", "The canvas no longer fits on the screen and multiple owners edit it", "It uses any Decision step", "It uses any custom action"], correctIndex: 1, explain: "Long, multi-owner flows are the classic 'God Flow' anti-pattern — split by responsibility.", whyCorrect: "Subflows let teams own a piece independently, with their own tests and release cadence. Smaller subflows publish faster and fail in isolation.", whyWrong: { 0: "A flow only has one trigger.", 2: "Decision steps are normal — not a smell.", 3: "Custom actions are encouraged." }, learnMore: ["Split by domain: validate / enrich / integrate / notify.", "A parent flow should read like a table of contents for the process."] },

  // Integration
  { id: "n1", topic: "integration", question: "A REST Message is used for…", options: ["Inbound REST endpoints", "Outbound REST calls", "Email notifications", "MID Server health"], correctIndex: 1, explain: "REST Messages define outbound calls. For inbound endpoints, use a Scripted REST API." },
  { id: "n2", topic: "integration", question: "When do you need a MID Server?", options: ["For all REST calls", "To reach systems behind the customer's firewall", "To run client scripts faster", "Only for SOAP integrations"], correctIndex: 1, explain: "The MID Server is a Java agent in the customer's network that bridges cloud → on-prem systems." },
  { id: "n3", topic: "integration", question: "What does an Import Set Transform Map do?", options: ["Encrypts data in transit", "Maps source fields to target table fields", "Schedules the import", "Validates SSL certs"], correctIndex: 1, explain: "Transform Maps shape data from the staging import_set table into the real target table (user, cmdb_ci, etc.)." },
  { id: "n4", topic: "integration", question: "Which is the inbound REST endpoint mechanism?", options: ["REST Message", "Scripted REST API", "Outbound Web Service", "MID Server Probe"], correctIndex: 1, explain: "Scripted REST APIs expose /api/<namespace>/<api>/<resource> with a server script you control." },
];

import { generatedQuizzesFor } from "./quiz-generator";
import { ADMIN_QUIZZES, ADMIN_SECTIONS } from "./content/admin";
import { JAVA_QUIZZES, JAVA_SECTIONS } from "./content/java";
import { ANGULAR_QUIZZES, ANGULAR_SECTIONS } from "./content/angular";

QUIZZES.push(...ADMIN_QUIZZES, ...JAVA_QUIZZES, ...ANGULAR_QUIZZES);

function shuffleQ<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function quizFor(topic: TopicId): QuizQuestion[] {
  const handcrafted = QUIZZES.filter((q) => q.topic === topic);
  const generated = generatedQuizzesFor(topic);
  const seen = new Set<string>();
  const merged: QuizQuestion[] = [];
  for (const q of [...handcrafted, ...generated]) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    merged.push(q);
  }
  const seed = topic.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const head = merged.slice(0, handcrafted.length);
  const tail = shuffleQ(merged.slice(handcrafted.length), seed);
  return [...head, ...tail];
}

export interface QuizSection {
  label: string;
  /** Emoji or short icon shown beside the label. */
  icon?: string;
  /** Number of questions in this section. */
  count: number;
}

/**
 * Per-topic milestone breakdown. Sections are consumed in order; if the
 * total `count` is less than the quiz length, a trailing "Bonus round"
 * section absorbs the remainder.
 */
const SECTION_PLAN: Record<string, QuizSection[]> = {
  platform: [
    { label: "Core concepts", icon: "🧱", count: 2 },
    { label: "Data model", icon: "🗂️", count: 2 },
  ],
  itsm: [
    { label: "Incident & Problem", icon: "🚨", count: 2 },
    { label: "Change & Request", icon: "📝", count: 2 },
  ],
  cmdb: [
    { label: "CI relationships", icon: "🔗", count: 2 },
    { label: "Discovery & CSDM", icon: "🛰️", count: 2 },
  ],
  flow: [
    { label: "Flow Designer basics", icon: "⚡", count: 2 },
    { label: "Spokes & reuse", icon: "🔌", count: 2 },
    { label: "Triggers & Run As", icon: "🎯", count: 3 },
    { label: "Error handling & retries", icon: "🛡️", count: 3 },
    { label: "Performance & scale", icon: "🚀", count: 3 },
    { label: "Design best practices", icon: "🧠", count: 6 },
    { label: "Versioning & ops", icon: "🧰", count: 4 },
  ],
  integration: [
    { label: "REST & inbound APIs", icon: "🌐", count: 2 },
    { label: "MID Server & imports", icon: "🔁", count: 2 },
  ],
  ...ADMIN_SECTIONS,
  ...JAVA_SECTIONS,
  ...ANGULAR_SECTIONS,
};

export function sectionsFor(topic: TopicId, total: number): QuizSection[] {
  const base = SECTION_PLAN[topic] ?? [];
  const planned = base.reduce((s, x) => s + x.count, 0);
  if (planned >= total) {
    // Trim trailing sections if quiz shrank.
    const out: QuizSection[] = [];
    let remaining = total;
    for (const s of base) {
      if (remaining <= 0) break;
      const c = Math.min(s.count, remaining);
      out.push({ ...s, count: c });
      remaining -= c;
    }
    return out;
  }
  return [...base, { label: "Bonus round", icon: "🎁", count: total - planned }];
}

export function sectionForIndex(
  sections: QuizSection[],
  idx: number,
): { section: QuizSection; sectionIdx: number; positionInSection: number } | null {
  let acc = 0;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (idx < acc + s.count) {
      return { section: s, sectionIdx: i, positionInSection: idx - acc };
    }
    acc += s.count;
  }
  return null;
}
