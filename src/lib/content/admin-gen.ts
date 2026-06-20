import type { Category, Question, SimulatorOutput } from "../questions";

/**
 * Programmatic puzzle pool for the ServiceNow Administrator track.
 * Mirrors the SN Dev generator: combine real admin artefacts (tables, roles,
 * variable names, notification events) with proven teaching templates.
 */

const TABLES = [
  { name: "incident", label: "Incident", num: "INC" },
  { name: "problem", label: "Problem", num: "PRB" },
  { name: "change_request", label: "Change", num: "CHG" },
  { name: "sc_request", label: "Request", num: "REQ" },
  { name: "sc_req_item", label: "Requested Item", num: "RITM" },
  { name: "sc_task", label: "Catalog Task", num: "SCTASK" },
  { name: "kb_knowledge", label: "KB Article", num: "KB" },
  { name: "cmdb_ci_server", label: "Server CI", num: "SRV" },
  { name: "sys_user", label: "User", num: "USR" },
  { name: "sys_user_group", label: "Group", num: "GRP" },
] as const;

const ROLES = ["itil", "admin", "approver_user", "catalog_admin", "knowledge_admin", "asset", "change_manager", "sn_kb_user"];
const FIELDS = ["short_description", "description", "assignment_group", "caller_id", "priority", "category", "u_environment", "u_region"];
const EVENTS = ["incident.assigned", "change.approved", "request.submitted", "problem.created", "task.closed", "ritm.fulfilled"];
const CATALOG_ITEMS = ["New Laptop", "VPN Access", "Software Install", "Office Move", "Phone Setup", "AWS Account", "Database Provisioning"];

function T(offset = 0) {
  const base = new Date(2024, 0, 1, 9, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function makeQ(q: Omit<Question, "options"> & {
  options: Array<{ id: string; text: string; correct: boolean; wrongTitle?: string; wrongExplain?: string; wrongSim?: SimulatorOutput }>;
}): Question {
  return {
    ...q,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      correct: o.correct,
      feedback: o.correct
        ? { title: "", explain: "", sim: { rows: [], logs: [] } }
        : {
            title: o.wrongTitle ?? "Not quite",
            explain: o.wrongExplain ?? "Re-read the requirement and pick the canonical admin pattern.",
            sim: o.wrongSim ?? { rows: [], logs: [{ time: T(0), text: "Operation produced an unexpected result.", tone: "bad" }] },
          },
    })),
  };
}

/* ============ ACL ============ */
function aclPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // Template A: role check
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      const role = pick(ROLES, i + k);
      out.push(makeQ({
        id: `gen-acl-role-${seq}`,
        category: "acl",
        level: 1 + ((i + k) % 3),
        filename: `${tbl.name}.read.acl`,
        title: `Restrict READ on '${tbl.label}' to users with the '${role}' role.`,
        code: [
          `// Type: record  Operation: read`,
          `// Name: ${tbl.name}.*`,
          `// Condition: (none)`,
          `// Roles: ${role}`,
          `// Script:`,
          `answer = {{SLOT}};`,
        ],
        options: [
          { id: "a", text: `gs.hasRole('${role}')`, correct: true },
          { id: "b", text: `current.assigned_to == gs.getUserID()`, correct: false, wrongTitle: "Conflates role with ownership", wrongExplain: `Owners are not necessarily '${role}' holders. Use \`gs.hasRole('${role}')\` for role-gated access.` },
          { id: "c", text: `gs.getUser().getRoles().indexOf('${role}')`, correct: false, wrongTitle: "Returns -1 / index, not boolean", wrongExplain: "indexOf returns the position (or -1) — it's truthy for ANY hit including 0. Use `gs.hasRole()` for a clean boolean." },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010001", state: `read=allowed for ${role}`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `ACL evaluated → ${role} → answer=true`, tone: "ok" }] },
        correctTeach: { title: "Role checks belong in the Script field", explain: "Set `answer = <boolean>`. ServiceNow ANDs the role list, condition, and script together — all must pass for access to be granted." },
      }));
    }
  });

  // Template B: row-level "mine only"
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      const field = pick(["assigned_to", "caller_id", "opened_by", "requested_for"], i + k);
      out.push(makeQ({
        id: `gen-acl-mine-${seq}`,
        category: "acl",
        level: 2,
        filename: `${tbl.name}.${field}.acl`,
        title: `Only let the '${field}' user WRITE to a '${tbl.label}' record.`,
        code: [
          `// Type: record  Operation: write`,
          `// Name: ${tbl.name}.*`,
          `answer = {{SLOT}};`,
        ],
        options: [
          { id: "a", text: `current.${field} == gs.getUserID()`, correct: true },
          { id: "b", text: `current.${field} == gs.getUserName()`, correct: false, wrongTitle: "Compares sys_id to username", wrongExplain: `\`current.${field}\` is a sys_id reference; \`gs.getUserName()\` returns a string login. Use \`gs.getUserID()\`.` },
          { id: "c", text: `current.${field}.user == gs.getUserID()`, correct: false, wrongTitle: "Dot-walks a non-existent field", wrongExplain: `\`${field}\` is already the user reference — no \`.user\` to dot-walk.` },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010002", state: `write=allowed (owner)`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Row-level ACL passed for record owner", tone: "ok" }] },
        correctTeach: { title: "sys_id compare for ownership", explain: "Always compare reference fields to `gs.getUserID()` (sys_id), not `gs.getUserName()` (login). The two are different values." },
      }));
    }
  });

  // Template C: field-level read
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      const field = pick(FIELDS, i + k);
      out.push(makeQ({
        id: `gen-acl-field-${seq}`,
        category: "acl",
        level: 2 + ((i + k) % 2),
        filename: `${tbl.name}.${field}.read.acl`,
        title: `Hide '${field}' from non-admins on the '${tbl.label}' form.`,
        code: [
          `// Type: record  Operation: read`,
          `// Name: ${tbl.name}.${field}`,
          `// Roles: admin`,
          `answer = {{SLOT}};`,
        ],
        options: [
          { id: "a", text: `gs.hasRole('admin')`, correct: true },
          { id: "b", text: `true`, correct: false, wrongTitle: "Defeats the ACL", wrongExplain: "Hard-coding true makes the field readable by everyone — the role list alone isn't enough without a matching script." },
          { id: "c", text: `gs.getUser().isAdmin()`, correct: false, wrongTitle: "Method does not exist", wrongExplain: "There is no `getUser().isAdmin()`. Use `gs.hasRole('admin')`." },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010003", state: `${field} hidden from non-admins`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Field-level ACL applied", tone: "ok" }] },
        correctTeach: { title: "Field ACLs use Name = table.field", explain: "Field-level ACLs scope to a single column. Pair the Roles list with `answer = gs.hasRole(...)` so both filters agree." },
      }));
    }
  });

  return out;
}

/* ============ UI POLICY ============ */
function uiPolicyPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      const field = pick(FIELDS, i + k);
      out.push(makeQ({
        id: `gen-uip-mandatory-${seq}`,
        category: "ui-policy",
        level: 1 + ((i + k) % 3),
        filename: `${tbl.name}_${field}_mandatory.uip`,
        title: `Make '${field}' mandatory on '${tbl.label}' when state = 2 — pick the right action.`,
        code: [
          `// UI Policy on ${tbl.name}`,
          `// Condition: state == 2`,
          `// Run scripts: false`,
          `// Action for '${field}':`,
          `{{SLOT}}`,
        ],
        options: [
          { id: "a", text: "Mandatory: True   Visible: Leave alone   Read-only: Leave alone", correct: true },
          { id: "b", text: "Mandatory: True   Visible: True   Read-only: True", correct: false, wrongTitle: "Read-only + mandatory = deadlock", wrongExplain: "A read-only mandatory field can't be filled in. Leave Visible / Read-only on 'Leave alone' unless you specifically need to override them." },
          { id: "c", text: "Mandatory: Leave alone   Visible: True   Read-only: False", correct: false, wrongTitle: "Field isn't actually required", wrongExplain: `'Leave alone' inherits whatever the dictionary says. The requirement is to make it mandatory in this condition.` },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010101", state: `${field}=required when state=2`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "UI Policy applied — red asterisk shown", tone: "ok" }] },
        correctTeach: { title: "Use 'Leave alone' for fields you don't want to touch", explain: "Each UI Policy Action sets THREE properties. 'Leave alone' is the safe default — only flip what the requirement names." },
      }));
    }
  });

  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      const field = pick(FIELDS, i + k);
      out.push(makeQ({
        id: `gen-uip-runscripts-${seq}`,
        category: "ui-policy",
        level: 2,
        filename: `${tbl.name}_${field}_toggle.uip`,
        title: `Toggle visibility of '${field}' on '${tbl.label}' as conditions change — what setting matters?`,
        code: [
          `// UI Policy on ${tbl.name}`,
          `// Condition: priority == 1`,
          `// {{SLOT}}`,
          `// Action: ${field} → Visible: True`,
        ],
        options: [
          { id: "a", text: "Reverse if false: True", correct: true },
          { id: "b", text: "Reverse if false: False", correct: false, wrongTitle: "Field stays visible after condition flips", wrongExplain: "Without 'Reverse if false', once the policy fires the action persists even when the condition becomes false. Enable Reverse for toggle behaviour." },
          { id: "c", text: "On load: False", correct: false, wrongTitle: "Skips the initial evaluation", wrongExplain: "Disabling 'On load' means the policy isn't applied when the form first opens — users see stale visibility until they change a field." },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010102", state: `${field} toggles with priority`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Reverse if false → action undone when condition turns false", tone: "ok" }] },
        correctTeach: { title: "Reverse if false makes UI Policies symmetric", explain: "Without it, fields 'stick' in their changed state. Toggle behaviour almost always needs Reverse enabled." },
      }));
    }
  });

  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-uip-clientvsserver-${seq}`,
        category: "ui-policy",
        level: 2 + ((i + k) % 2),
        filename: `${tbl.name}_ui_policy.tradeoff`,
        title: `'${tbl.label}' form needs to hide a field when state changes. Pick the cheapest tool.`,
        code: [
          `// Requirement: hide 'work_notes' when state == 1`,
          `// {{SLOT}}`,
        ],
        options: [
          { id: "a", text: "UI Policy (no scripts)", correct: true },
          { id: "b", text: "onChange Client Script that calls g_form.setDisplay()", correct: false, wrongTitle: "Re-implements UI Policy in code", wrongExplain: "If the rule is purely declarative, prefer UI Policy — admins can maintain it, it loads earlier, and it survives form view changes." },
          { id: "c", text: "Before Business Rule that aborts on state==1", correct: false, wrongTitle: "Server-side, wrong layer", wrongExplain: "Business Rules can't hide form fields — they run after the user submits. UI Policies / Client Scripts own the form UX." },
        ],
        correctSim: { rows: [{ number: tbl.num + "0010103", state: "work_notes hidden when state=1", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Declarative UI Policy applied", tone: "ok" }] },
        correctTeach: { title: "Prefer UI Policy over Client Script for show/hide/mandatory", explain: "Client Scripts are for behavior that needs code. Declarative show/hide/readonly should be UI Policies — easier to audit and faster to render." },
      }));
    }
  });

  return out;
}

/* ============ UPDATE SETS ============ */
function updateSetPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  const captured = ["Business Rule", "Client Script", "UI Policy", "Script Include", "Catalog Item", "ACL", "Workflow"];
  const notCaptured = ["Incident records", "User records", "System Properties (data)", "Group memberships", "CMDB CIs", "kb_knowledge_base entries"];

  captured.forEach((c, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-us-capture-${seq}`,
        category: "update-set",
        level: 1 + ((i + k) % 2),
        filename: `update_set_capture.txt`,
        title: `Will a new '${c}' be captured by your current Update Set?`,
        code: [
          `// You created a new ${c} in your Dev instance.`,
          `// Answer:`,
          `{{SLOT}}`,
        ],
        options: [
          { id: "a", text: "Yes — config records are auto-captured", correct: true },
          { id: "b", text: "No — you must manually add it via 'Force Update'", correct: false, wrongTitle: "Force Update is for already-saved records", wrongExplain: "Force Update re-captures something that was created before the set was current. New records save into the active set automatically." },
          { id: "c", text: "Only if you flag the record as 'tracked'", correct: false, wrongTitle: "There is no such flag", wrongExplain: "ServiceNow tracks by table — anything on `sys_metadata` (or extensions) is captured by default into the current Update Set." },
        ],
        correctSim: { rows: [{ number: "UPD0010001", state: `Captured: ${c}`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Metadata table → tracked → added to active set", tone: "ok" }] },
        correctTeach: { title: "Update Sets capture metadata, not data", explain: "If the table extends `sys_metadata` it's a config record (captured). Real business data lives outside `sys_metadata` and isn't moved by Update Sets." },
      }));
    }
  });

  notCaptured.forEach((c, i) => {
    for (let k = 0; k < 5; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-us-data-${seq}`,
        category: "update-set",
        level: 2,
        filename: `update_set_data.txt`,
        title: `You need to ship '${c}' from Dev → Prod. Update Set?`,
        code: [
          `// Plan: promote ${c} as part of release v${1 + (k % 9)}.${k}`,
          `{{SLOT}}`,
        ],
        options: [
          { id: "a", text: "No — Update Sets don't carry data. Use an XML export / data import / Fix Script.", correct: true },
          { id: "b", text: "Yes — toggle 'Capture data records' on the Update Set.", correct: false, wrongTitle: "That toggle does not exist", wrongExplain: "Update Sets ONLY capture `sys_metadata`-rooted records. For data, export XML, use a Fix Script, or run a data import on the target." },
          { id: "c", text: "Yes — Update Sets always capture inserts.", correct: false, wrongTitle: "Only metadata inserts", wrongExplain: "Data inserts (incidents, users, CIs) are not captured. Don't ship runtime data via Update Sets." },
        ],
        correctSim: { rows: [{ number: "—", state: `${c} promoted via XML/Fix Script`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Correct: Update Sets are for config, not data", tone: "ok" }] },
        correctTeach: { title: "Data ≠ Config", explain: "Use Update Sets for code/config. Use XML export, Fix Scripts, or data imports for real business records." },
      }));
    }
  });

  for (let k = 0; k < 10; k++) {
    seq++;
    out.push(makeQ({
      id: `gen-us-batch-${seq}`,
      category: "update-set",
      level: 2 + (k % 2),
      filename: `batch_${k + 1}.txt`,
      title: `You have ${5 + k} small Update Sets that must deploy together. Best practice?`,
      code: [
        `// Sets: feature-a, feature-b, ..., feature-${String.fromCharCode(97 + (k % 8))}`,
        `{{SLOT}}`,
      ],
      options: [
        { id: "a", text: "Group them in a Batch Update Set and preview/commit as one unit.", correct: true },
        { id: "b", text: "Merge their XML by hand into one big set.", correct: false, wrongTitle: "Risky and unreviewable", wrongExplain: "Hand-merging XML loses provenance and breaks rollback. Use Batch Update Sets — supported natively." },
        { id: "c", text: "Commit them one by one in alphabetical order.", correct: false, wrongTitle: "Skips dependency resolution", wrongExplain: "Cross-set references can fail if a child set is committed before its parent. Batches resolve order automatically." },
      ],
      correctSim: { rows: [{ number: `BATCH00${k}`, state: `${5 + k} sets resolved + committed`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Batch preview ran in one shot — dependencies resolved", tone: "ok" }] },
      correctTeach: { title: "Batches replace 'parent → child' chains", explain: "Batch Update Sets bundle related sets and resolve order automatically. They're the modern answer to grouped deployments." },
    }));
  }

  return out;
}

/* ============ CATALOG ============ */
function catalogPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  CATALOG_ITEMS.forEach((item, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-cat-variable-${seq}`,
        category: "catalog",
        level: 1 + ((i + k) % 3),
        filename: `${item.toLowerCase().replace(/\s+/g, "_")}.var`,
        title: `Add a free-text 'Business Justification' to '${item}'. Variable type?`,
        code: [
          `// Catalog item: ${item}`,
          `// New variable name: u_justification`,
          `// Type: {{SLOT}}`,
        ],
        options: [
          { id: "a", text: "Multi Line Text", correct: true },
          { id: "b", text: "Reference", correct: false, wrongTitle: "Reference picks an existing record", wrongExplain: "Reference variables point to a table row. For free-form prose, use Single or Multi Line Text." },
          { id: "c", text: "Lookup Select Box", correct: false, wrongTitle: "Choice from a table — not free text", wrongExplain: "Lookup Select Box renders rows from a table as a dropdown. Use Multi Line Text for an open prompt." },
        ],
        correctSim: { rows: [{ number: `RITM0010${100 + i}`, state: `Variable added: u_justification (multi-line)`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Variable rendered on the catalog form", tone: "ok" }] },
        correctTeach: { title: "Pick the type that matches the data shape", explain: "Free text → Single/Multi Line Text. Pick-from-list → Select Box / Reference / Lookup. Yes/No → Check Box. Get this right at design time — type changes are painful later." },
      }));
    }
  });

  CATALOG_ITEMS.forEach((item, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-cat-onsubmit-${seq}`,
        category: "catalog",
        level: 2,
        filename: `${item.toLowerCase().replace(/\s+/g, "_")}_validate.csc`,
        title: `Block submission of '${item}' when justification is blank.`,
        code: [
          `function onSubmit() {`,
          `  var j = g_form.getValue('u_justification');`,
          `  if (!j) {`,
          `    g_form.addErrorMessage('Justification required');`,
          `    {{SLOT}};`,
          `  }`,
          `}`,
        ],
        options: [
          { id: "a", text: "return false", correct: true },
          { id: "b", text: "g_form.abort()", correct: false, wrongTitle: "No such API", wrongExplain: "`g_form` doesn't expose `abort`. onSubmit must `return false` to cancel submission." },
          { id: "c", text: "throw new Error('blocked')", correct: false, wrongTitle: "Console error, form still submits", wrongExplain: "Uncaught throws bubble to the console; the form still submits if you don't `return false`." },
        ],
        correctSim: { rows: [{ number: `RITM0010${200 + i}`, state: `Submission cancelled`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "onSubmit returned false → form not submitted", tone: "ok" }] },
        correctTeach: { title: "onSubmit must `return false` to block", explain: "Add the error message first (so the user sees why), then `return false`. Don't throw — uncaught exceptions don't cancel submission." },
      }));
    }
  });

  CATALOG_ITEMS.forEach((item, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-cat-flow-${seq}`,
        category: "catalog",
        level: 2 + ((i + k) % 2),
        filename: `${item.toLowerCase().replace(/\s+/g, "_")}_orchestration.cfg`,
        title: `Wire '${item}' to a multi-step approval + provisioning. Which tool?`,
        code: [
          `// Catalog Item → ${item}`,
          `// Fulfillment: 2-stage approval + create user + email notify`,
          `{{SLOT}}`,
        ],
        options: [
          { id: "a", text: "Flow Designer flow triggered from the catalog item", correct: true },
          { id: "b", text: "Legacy Workflow with custom activities", correct: false, wrongTitle: "Deprecated for new builds", wrongExplain: "Workflow Editor is legacy. New automations should use Flow Designer — better UI, reusable subflows, and IntegrationHub support." },
          { id: "c", text: "An onSubmit Client Script that performs the steps", correct: false, wrongTitle: "Client-side, no orchestration", wrongExplain: "Client Scripts run in the browser and can't safely orchestrate approvals or background tasks. Use Flow Designer." },
        ],
        correctSim: { rows: [{ number: `RITM0010${300 + i}`, state: `Flow attached: ${item} provisioning`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Flow Designer flow runs on RITM insert", tone: "ok" }] },
        correctTeach: { title: "Flow Designer is the default fulfillment engine", explain: "Only use Workflow Editor when you must maintain an existing flow. New work goes to Flow Designer." },
      }));
    }
  });

  return out;
}

/* ============ NOTIFICATIONS ============ */
function notificationPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  EVENTS.forEach((ev, i) => {
    for (let k = 0; k < 8; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-notif-when-${seq}`,
        category: "notification",
        level: 1 + ((i + k) % 3),
        filename: `${ev.replace(/\./g, "_")}.notif`,
        title: `Send an email when '${ev}' fires. Which 'When to send' option?`,
        code: [
          `// Notification on table = ${ev.split(".")[0]}`,
          `// When to send: {{SLOT}}`,
          `// Send when: event is fired`,
          `// Event name: ${ev}`,
        ],
        options: [
          { id: "a", text: "Event is fired", correct: true },
          { id: "b", text: "Record inserted or updated", correct: false, wrongTitle: "Wrong trigger model", wrongExplain: "Record-based triggers don't listen to the event queue. To respond to a custom event, choose 'Event is fired'." },
          { id: "c", text: "Inbound email received", correct: false, wrongTitle: "Inbound != outbound", wrongExplain: "'Inbound email received' triggers when ServiceNow receives mail. You want to send mail in response to a system event." },
        ],
        correctSim: { rows: [{ number: `EML${i}${k}`, state: `Sent on event ${ev}`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Event '${ev}' fired → notification dispatched`, tone: "ok" }] },
        correctTeach: { title: "Pick the trigger that matches the source", explain: "Record changes → 'Record inserted/updated'. Custom event → 'Event is fired'. Inbound email → 'Inbound email received'." },
      }));
    }
  });

  EVENTS.forEach((ev, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      const tbl = ev.split(".")[0];
      out.push(makeQ({
        id: `gen-notif-recipient-${seq}`,
        category: "notification",
        level: 2,
        filename: `${ev.replace(/\./g, "_")}_to_assignee.notif`,
        title: `Mail the '${tbl}'s assignee on '${ev}'. How to address it?`,
        code: [
          `// Who will receive:`,
          `// Users / Groups in fields: {{SLOT}}`,
          `// (No 'Users' picker, no 'Groups' picker — dynamic only)`,
        ],
        options: [
          { id: "a", text: "assigned_to", correct: true },
          { id: "b", text: "caller_id", correct: false, wrongTitle: "Wrong recipient", wrongExplain: "`caller_id` is who reported the issue, not who's working it. The requirement says assignee — use `assigned_to`." },
          { id: "c", text: "opened_by", correct: false, wrongTitle: "Wrong recipient", wrongExplain: "`opened_by` is the user who created the record. The assignee is in `assigned_to`." },
        ],
        correctSim: { rows: [{ number: `EML${i}${k + 50}`, state: `→ ${tbl}.assigned_to.email`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Recipient resolved from the record's reference field", tone: "ok" }] },
        correctTeach: { title: "'Users/Groups in fields' resolves at send time", explain: "Pick the reference field on the trigger record that points to the person you want to email. ServiceNow dot-walks to `.email` automatically." },
      }));
    }
  });

  EVENTS.forEach((ev, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-notif-template-${seq}`,
        category: "notification",
        level: 2 + ((i + k) % 2),
        filename: `${ev.replace(/\./g, "_")}_body.eml`,
        title: `Reference the record's number inside the email body for '${ev}'.`,
        code: [
          `Hi,`,
          ``,
          `Record \${{SLOT}} was updated.`,
          ``,
          `Regards,`,
          `ServiceNow`,
        ],
        options: [
          { id: "a", text: "{number}", correct: true },
          { id: "b", text: "{current.number}", correct: false, wrongTitle: "`current` not available in mail templates", wrongExplain: "Use bare field names in `${field}` syntax. `current` is only available in scripts inside the notification." },
          { id: "c", text: "{record.number}", correct: false, wrongTitle: "No 'record' namespace", wrongExplain: "Mail templates expand `${fieldName}` directly against the trigger record. Use `${number}`." },
        ],
        correctSim: { rows: [{ number: `EML${i}${k + 100}`, state: `Body resolved with INC0010777`, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Template token expanded from trigger record", tone: "ok" }] },
        correctTeach: { title: "Mail templates use ${field} on the trigger record", explain: "Dot-walking works too: `${caller_id.email}`. For scripts, switch to a mail script with `<mail_script>` tags and use `current`." },
      }));
    }
  });

  return out;
}

let cache: Question[] | null = null;
export function adminGeneratedQuestions(): Question[] {
  if (cache) return cache;
  cache = [...aclPool(), ...uiPolicyPool(), ...updateSetPool(), ...catalogPool(), ...notificationPool()];
  return cache;
}
export function adminGeneratedQuestionsFor(cat: Category): Question[] {
  return adminGeneratedQuestions().filter((q) => q.category === cat);
}
