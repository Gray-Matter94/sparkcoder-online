import type { CategoryMeta, Question } from "../questions";
import type { Topic, Term } from "../glossary";
import type { QuizQuestion, QuizSection } from "../quizzes";

/* ============== CATEGORIES (practice puzzles) ============== */

export const ADMIN_CATEGORIES: CategoryMeta[] = [
  { id: "acl", name: "ACLs", emoji: "🔒", blurb: "Row & field-level security", color: "primary", track: "servicenow-admin" },
  { id: "ui-policy", name: "UI Policies", emoji: "📋", blurb: "Mandatory / visible / readonly", color: "accent", track: "servicenow-admin" },
  { id: "update-set", name: "Update Sets", emoji: "📦", blurb: "Promote config across instances", color: "secondary", track: "servicenow-admin" },
  { id: "catalog", name: "Service Catalog", emoji: "🛒", blurb: "Items, variables, workflows", color: "primary", track: "servicenow-admin" },
  { id: "notification", name: "Notifications", emoji: "📧", blurb: "Email rules & templates", color: "accent", track: "servicenow-admin" },
  { id: "sam-pro", name: "SAM Pro", emoji: "💿", blurb: "Software Asset Management Pro", color: "secondary", track: "servicenow-admin" },
];

const T = (offset = 0) => {
  const base = new Date(2024, 0, 1, 10, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

export const ADMIN_QUESTIONS: Question[] = [
  // ----- ACL -----
  {
    id: "acl-1",
    category: "acl",
    level: 1,
    filename: "incident.write.acl",
    title: "Only let the assigned user write to an incident.",
    code: [
      "// Type: record",
      "// Operation: write",
      "// Table: incident",
      "",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "answer = (current.assigned_to == gs.getUserID());",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "answer = gs.hasRole('itil');",
        correct: false,
        feedback: {
          title: "Too broad",
          explain: "Every ITIL user could edit any incident. ACLs need to scope per record using `current`.",
          sim: { rows: [{ number: "INC0010", state: "Open", updated: "now", highlight: "bad" }], logs: [{ time: T(), text: "WRITE allowed for unrelated ITIL user", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "answer = current.caller_id == gs.getUserID();",
        correct: false,
        feedback: {
          title: "Wrong field",
          explain: "Caller is who reported it, not who's working it. The assignee is `assigned_to`.",
          sim: { rows: [], logs: [{ time: T(), text: "WRITE denied for assigned tech (they aren't caller)", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [{ number: "INC0010", state: "In Progress", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Write ACL granted: current.assigned_to == user", tone: "ok" }],
    },
    correctTeach: {
      title: "ACL scripts can use `current`",
      explain: "Record-level ACLs evaluate against the row being accessed via `current`. Combine with role checks for layered security (role → script → condition).",
    },
  },
  {
    id: "acl-2",
    category: "acl",
    level: 2,
    filename: "task.salary.acl",
    title: "Restrict a sensitive field — only HR can read `u_salary`.",
    code: [
      "// Type: field",
      "// Operation: read",
      "// Table: sys_user.u_salary",
      "",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "answer = gs.hasRole('hr_admin');",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "answer = true;",
        correct: false,
        feedback: {
          title: "Open by default = leak",
          explain: "Returning true grants read to everyone. Field ACLs are exactly the place where you LOCK down — start from false.",
          sim: { rows: [{ number: "USR001", state: "$120,000 visible", updated: "now", highlight: "bad" }], logs: [{ time: T(), text: "Salary visible to every user", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "answer = current.active;",
        correct: false,
        feedback: {
          title: "Wrong check",
          explain: "`current.active` checks whether the user record is active, not whether the viewer should see salary.",
          sim: { rows: [], logs: [{ time: T(), text: "Salary visible whenever the target user is active", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "sys_user",
      rows: [{ number: "USR001", state: "hr_admin → visible", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Field read granted: hasRole('hr_admin')", tone: "ok" }],
    },
    correctTeach: {
      title: "Field ACLs override table ACLs",
      explain: "Even if the table ACL grants read, the field ACL can hide a column. This is the standard pattern for PII.",
    },
  },

  // ----- UI Policy -----
  {
    id: "uip-1",
    category: "ui-policy",
    level: 1,
    filename: "incident_priority.uipolicy",
    title: "Make 'Priority' mandatory when state is 'In Progress'.",
    code: [
      "// Condition:",
      "// state = In Progress (2)",
      "// Action on Priority:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Mandatory = TRUE, Visible = (leave alone)",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Mandatory = TRUE, Visible = FALSE",
        correct: false,
        feedback: {
          title: "Mandatory + hidden = stuck form",
          explain: "If a field is required but invisible, users can't satisfy the condition and the form won't submit. Classic admin bug.",
          sim: { rows: [], logs: [{ time: T(), text: "Form submit blocked: 'Priority' required but hidden", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Add an onChange Client Script that throws if empty",
        correct: false,
        feedback: {
          title: "Over-engineered",
          explain: "UI Policies are declarative — use them before reaching for client scripts. Easier to maintain and they show in the UI Policy module.",
          sim: { rows: [], logs: [{ time: T(), text: "Script runs but UI doesn't show the required asterisk", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [{ number: "INC0042", state: "In Progress", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "UI Policy applied: Priority is required *", tone: "ok" }],
    },
    correctTeach: {
      title: "Declarative > scripted",
      explain: "UI Policies handle mandatory/visible/readonly without scripts. Use the `Reverse if false` checkbox to flip behavior when the condition clears.",
    },
  },
  {
    id: "uip-2",
    category: "ui-policy",
    level: 1,
    filename: "category_lock.uipolicy",
    title: "Lock the 'Category' field once an incident is Resolved.",
    code: [
      "// Condition: state = Resolved (6)",
      "// Action on Category:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Read-only = TRUE  (with 'Reverse if false' enabled)",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Mandatory = TRUE",
        correct: false,
        feedback: {
          title: "Wrong attribute",
          explain: "You want to prevent editing, not require a value. Read-only is the right action.",
          sim: { rows: [], logs: [{ time: T(), text: "Field is still editable; just becomes required", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Visible = FALSE",
        correct: false,
        feedback: {
          title: "Too aggressive",
          explain: "Hiding the field also removes context for the resolver and audit reviewers. Read-only keeps it visible but uneditable.",
          sim: { rows: [], logs: [{ time: T(), text: "Category disappears after resolution", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [{ number: "INC0099", state: "Resolved", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Category locked (read-only)", tone: "ok" }],
    },
    correctTeach: {
      title: "‘Reverse if false’",
      explain: "Enable it so the field becomes editable again if the incident is re-opened. Without it, you have to write a second policy.",
    },
  },

  // ----- Update Sets -----
  {
    id: "us-1",
    category: "update-set",
    level: 1,
    filename: "promote_changes.txt",
    title: "Best way to move a set of business rules dev → test.",
    code: [
      "// You finished your dev work.",
      "// Next step before testing:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Mark update set Complete → export XML → import & Preview on test → Commit",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Copy the business rule records via Export to XML on each record",
        correct: false,
        feedback: {
          title: "Skips dependencies",
          explain: "Update sets track sys_metadata dependencies (e.g. table, script include). Record-by-record export misses them.",
          sim: { rows: [], logs: [{ time: T(), text: "Test instance: missing referenced script include", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Re-build the rules manually on test",
        correct: false,
        feedback: {
          title: "Not repeatable",
          explain: "Manual rebuild defeats the purpose of update sets and is error-prone. Promotion must be repeatable.",
          sim: { rows: [], logs: [{ time: T(), text: "Test config drifts from dev", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "sys_update_set",
      rows: [{ number: "US-INC-FIX", state: "Committed", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Update set previewed cleanly and committed on test", tone: "ok" }],
    },
    correctTeach: {
      title: "Always Preview before Commit",
      explain: "Preview surfaces collisions (someone else changed the same artifact). You can skip individual updates or accept theirs before committing.",
    },
  },
  {
    id: "us-2",
    category: "update-set",
    level: 2,
    filename: "data_in_update_set.txt",
    title: "How do you move 5,000 incident records to test?",
    code: [
      "// You need real data on test for UAT.",
      "// Right tool:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Import Set (or scripted clone) — update sets don't carry data",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Add the incidents to the current update set",
        correct: false,
        feedback: {
          title: "Update sets are for CONFIG",
          explain: "They track sys_metadata, not operational records. The incidents won't appear in the set.",
          sim: { rows: [], logs: [{ time: T(), text: "Incidents not captured by update set", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Use a Fix Script that hard-codes 5,000 inserts",
        correct: false,
        feedback: {
          title: "Will time out",
          explain: "Long fix scripts hit transaction limits and aren't repeatable. Import Sets stream large data with transform maps.",
          sim: { rows: [], logs: [{ time: T(), text: "Fix script aborted at row 1,200 (timeout)", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "sys_import_set",
      rows: [{ number: "ISET001", state: "Loaded 5,000 rows", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Transform map applied — 5,000 incidents inserted", tone: "ok" }],
    },
    correctTeach: {
      title: "Config vs data split",
      explain: "Config travels in update sets; data travels in import sets, XML exports, or clones. Keep this split clean to avoid prod incidents on promotion.",
    },
  },

  // ----- Service Catalog -----
  {
    id: "cat-1",
    category: "catalog",
    level: 1,
    filename: "laptop_request.item",
    title: "Hide 'Manager approval reason' unless the user is a contractor.",
    code: [
      "// Variable: u_approval_reason",
      "// Correct mechanism:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Catalog UI Policy with condition `u_employment_type = contractor`",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Hide the variable by default and reveal it via a Catalog Client Script",
        correct: false,
        feedback: {
          title: "Works but harder to govern",
          explain: "Catalog Client Scripts run client-side and are harder to audit. UI Policies are declarative and visible on the item.",
          sim: { rows: [], logs: [{ time: T(), text: "Script toggles variable but no admin visibility into the rule", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "Make the variable mandatory always; let approvers ignore it",
        correct: false,
        feedback: {
          title: "Bad UX",
          explain: "Users fill nonsense to submit; data quality drops. Reveal only when needed.",
          sim: { rows: [], logs: [{ time: T(), text: "75% of submissions contain placeholder text", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "sc_cat_item",
      rows: [{ number: "ITEM-LAPTOP", state: "Variable hidden for FTE", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Catalog UI Policy applied", tone: "ok" }],
    },
    correctTeach: {
      title: "Catalog UI Policy = UI Policy for variables",
      explain: "Same engine, scoped to catalog items / variable sets. Always reach for it before Catalog Client Scripts for show/hide/mandatory logic.",
    },
  },
  {
    id: "cat-2",
    category: "catalog",
    level: 2,
    filename: "ritm_flow.txt",
    title: "REQ vs RITM vs SCTASK — what spawns when?",
    code: [
      "// User submits 1 catalog item with 2 fulfillment teams.",
      "// Records created:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "1 REQ → 1 RITM → 2 SCTASKs (one per team)",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "1 REQ → 2 RITMs (one per team)",
        correct: false,
        feedback: {
          title: "RITM is per item",
          explain: "Each catalog item produces one RITM. Multiple fulfillment teams = multiple SCTASKs under that one RITM.",
          sim: { rows: [{ number: "REQ", state: "??", updated: "now", highlight: "bad" }], logs: [{ time: T(), text: "Mis-modelled requested items", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "1 REQ → 2 SCTASKs (no RITM)",
        correct: false,
        feedback: {
          title: "RITM is mandatory",
          explain: "Every catalog request creates a Requested Item — that's where the variables live.",
          sim: { rows: [], logs: [{ time: T(), text: "Variables have nowhere to attach", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "sc_request",
      rows: [
        { number: "REQ0001", state: "In Process", updated: "now", highlight: "ok" },
        { number: "RITM0001", state: "Open", updated: "now", highlight: "ok" },
        { number: "SCTASK0001", state: "Open (Team A)", updated: "now", highlight: "ok" },
        { number: "SCTASK0002", state: "Open (Team B)", updated: "now", highlight: "ok" },
      ],
      logs: [{ time: T(), text: "Workflow spawned 2 catalog tasks under RITM0001", tone: "ok" }],
    },
    correctTeach: {
      title: "The catalog hierarchy",
      explain: "REQ (umbrella) → RITM (per item) → SCTASK (per fulfillment step). Workflows / Flow Designer create the SCTASKs.",
    },
  },

  // ----- Notification -----
  {
    id: "not-1",
    category: "notification",
    level: 1,
    filename: "incident_assigned.notif",
    title: "Send an email when an incident is assigned to a group.",
    code: [
      "// When to send: Event is fired",
      "// Trigger options:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Trigger on `Record Inserted/Updated` + Condition: `assignment_group changes`",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Trigger on `Record Inserted` only",
        correct: false,
        feedback: {
          title: "Misses re-assignments",
          explain: "Most assignments happen later — on update — so 'Inserted only' silently drops them.",
          sim: { rows: [], logs: [{ time: T(), text: "Notification not sent on re-assign", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Trigger on `Event` and fire it from every business rule manually",
        correct: false,
        feedback: {
          title: "Brittle",
          explain: "Event-driven is fine for cross-cutting cases, but pure Inserted/Updated + condition is simpler here.",
          sim: { rows: [], logs: [{ time: T(), text: "One business rule forgot to fire the event", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "sysevent_email_action",
      rows: [{ number: "EMAIL-INC-ASSIGN", state: "Sent to group@acme.com", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Notification fired on assignment_group change", tone: "ok" }],
    },
    correctTeach: {
      title: "Conditions > events for simple cases",
      explain: "Direct table triggers with conditions are easier to audit. Reach for events when multiple sources trigger the same email.",
    },
  },
  {
    id: "not-2",
    category: "notification",
    level: 2,
    filename: "weighted_inbox.txt",
    title: "Why didn't my notification reach the user?",
    code: [
      "// Notification triggered, email NOT received.",
      "// First thing to check:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "sys_email table — look for the row, check `state` and `error_string`",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Rebuild the notification record",
        correct: false,
        feedback: {
          title: "Premature",
          explain: "Without diagnostics you'll guess. sys_email shows the actual outbound row plus failure reason.",
          sim: { rows: [], logs: [{ time: T(), text: "Random tweak applied; root cause unknown", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "Check the user's `notification` preference table",
        correct: false,
        feedback: {
          title: "Second step",
          explain: "User opt-outs do block emails — but check sys_email first. If `state = ready` and never sent, it's an outbound issue, not preferences.",
          sim: { rows: [], logs: [{ time: T(), text: "User isn't subscribed — possible cause", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "sys_email",
      rows: [{ number: "EMAIL-9821", state: "sent", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Email row found: state=sent, delivered=true", tone: "ok" }],
    },
    correctTeach: {
      title: "sys_email is your inbox",
      explain: "Every outbound (and inbound) email is a row. Filter by recipient + recent time and read `state` / `error_string`. That's 80% of admin email debugging.",
    },
  },

  // ----- SAM Pro -----
  {
    id: "sam-1",
    category: "sam-pro",
    level: 1,
    filename: "reconcile.txt",
    title: "Compare what you OWN vs what you USE for Adobe Acrobat.",
    code: [
      "// You have 100 entitlements (purchased licenses).",
      "// Discovery + SCCM found 137 installs.",
      "// Correct SAM Pro action:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Run a Reconciliation against the Adobe Acrobat software model — review the compliance gap of 37",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Uninstall every install over 100 immediately",
        correct: false,
        feedback: {
          title: "No — reclaim, don't nuke",
          explain: "SAM Pro flags the gap; you remediate via Reclamation rules (unused > N days) or purchase. Blind uninstall breaks users.",
          sim: { rows: [], logs: [{ time: T(), text: "37 angry tickets from finance team", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Add 37 rows to the entitlement record manually",
        correct: false,
        feedback: {
          title: "Falsifies compliance",
          explain: "Entitlements must match purchased licenses (PO / contract). Inflating them hides the real position from audit.",
          sim: { rows: [], logs: [{ time: T(), text: "Audit detects entitlement without PO", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "samp_sw_reconciliation_result",
      rows: [{ number: "RECON-ADOBE-ACR", state: "Non-compliant by 37", updated: "now", highlight: "bad" }],
      logs: [{ time: T(), text: "Reconciliation complete: 100 owned / 137 used / -37 gap", tone: "warn" }],
    },
    correctTeach: {
      title: "Reconciliation = compliance math",
      explain: "SAM Pro reconciles Entitlements vs Installs (normalized via the Content Library) per Software Model. Result is a compliance position, not an action — Reclamation closes the gap.",
    },
  },
  {
    id: "sam-2",
    category: "sam-pro",
    level: 2,
    filename: "normalization.txt",
    title: "Discovery returns 'ADOBE ACROBAT DC 23.001.20143'. SAM Pro needs to:",
    code: [
      "// Raw publisher/product/version strings vary wildly.",
      "// The right SAM Pro mechanism:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Normalize the raw install via the Content Library Service (CLS) into a canonical Software Model + Publisher",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Edit cmdb_sam_sw_install rows by hand to match",
        correct: false,
        feedback: {
          title: "Doesn't scale",
          explain: "Manual edits don't survive re-discovery. CLS publishes normalization data from ServiceNow's content team.",
          sim: { rows: [], logs: [{ time: T(), text: "Next Discovery overwrites manual edits", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Write a Business Rule on cmdb_ci to rename installs",
        correct: false,
        feedback: {
          title: "Reinventing CLS",
          explain: "Normalization is exactly what CLS does — and it ships with thousands of vendor signatures.",
          sim: { rows: [], logs: [{ time: T(), text: "Custom regex misses Adobe Creative Cloud rebrands", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "samp_sw_install",
      rows: [{ number: "INSTALL-9421", state: "Normalized → Adobe Acrobat DC", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "CLS matched raw string → samp_sw_product 'Adobe Acrobat DC'", tone: "ok" }],
    },
    correctTeach: {
      title: "Normalization is the foundation",
      explain: "Without CLS-driven normalization every report is wrong. The pipeline is: Discovery raw → CLS normalize → Software Model → Reconcile against Entitlements.",
    },
  },
  {
    id: "sam-3",
    category: "sam-pro",
    level: 2,
    filename: "reclamation.rule",
    title: "Reclaim Visio licenses unused for 90+ days.",
    code: [
      "// Condition:",
      "// last_used > 90 days AND software_model = 'Microsoft Visio Pro'",
      "// Action:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "Create a Reclamation Candidate → workflow: notify user → wait → SCCM uninstall task",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Delete the install row from cmdb_sam_sw_install",
        correct: false,
        feedback: {
          title: "Doesn't uninstall",
          explain: "The row is just a record — Discovery will re-create it. You need an actual SCCM/Intune uninstall task.",
          sim: { rows: [], logs: [{ time: T(), text: "Next sync re-inserts the install row", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Email the user telling them to uninstall it themselves",
        correct: false,
        feedback: {
          title: "Unverifiable",
          explain: "SAM Pro should close the loop: notify, wait, then trigger automation. Pure email leaves licenses stranded.",
          sim: { rows: [], logs: [{ time: T(), text: "User ignored email; license still consumed", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "samp_sw_reclamation_candidate",
      rows: [{ number: "REC-VISIO-018", state: "Approved → SCCM uninstall queued", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Reclamation workflow fired: notify → wait 14d → uninstall", tone: "ok" }],
    },
    correctTeach: {
      title: "Reclamation closes the loop",
      explain: "Reclamation Rules generate candidates; a workflow notifies, then integrates with SCCM/Intune/JAMF to actually uninstall. That's where SAM Pro saves real money.",
    },
  },
  {
    id: "sam-4",
    category: "sam-pro",
    level: 3,
    filename: "engine.txt",
    title: "Oracle DB Enterprise audit — which engine handles Processor Core Factor math?",
    code: [
      "// You're licensing Oracle DB Enterprise by processor.",
      "// Cores × Core Factor (e.g. Intel Xeon = 0.5).",
      "// SAM Pro uses:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "The Engineering / Publisher Pack for Oracle — applies metric rules + core factor table at reconciliation",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "A custom Script Include that calls Oracle's website",
        correct: false,
        feedback: {
          title: "Already built",
          explain: "Publisher Packs (Oracle, Microsoft, IBM, SAP) ship the metric logic. Build custom only for niche publishers.",
          sim: { rows: [], logs: [{ time: T(), text: "Custom logic drifts from Oracle's current core factors", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "A simple count of installs",
        correct: false,
        feedback: {
          title: "Wrong metric",
          explain: "Processor-based licenses count cores × core factor — not install count. Mis-modelling here = 7-figure audit findings.",
          sim: { rows: [], logs: [{ time: T(), text: "Reported 4 installs when truth is 64 cores × 0.5 = 32 PROC", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "samp_engine_result",
      rows: [{ number: "ENG-ORA-DB", state: "32 PROC required", updated: "now", highlight: "ok" }],
      logs: [{ time: T(), text: "Oracle Engineering Pack applied core factor 0.5 to 64 cores", tone: "ok" }],
    },
    correctTeach: {
      title: "Publisher Packs do the hard math",
      explain: "Oracle / Microsoft / IBM / SAP / Adobe / Salesforce packs encode each publisher's licensing metric quirks (PVU, Processor, CAL, named user, etc.) into the reconciliation engine.",
    },
  },
  {
    id: "sam-5",
    category: "sam-pro",
    level: 3,
    filename: "saas_overlap.txt",
    title: "You own M365 E3 and added Visio Plan 2 — what catches the overlap?",
    code: [
      "// Some users have BOTH E3 (with Teams/OneDrive) AND",
      "// standalone Teams licenses assigned by an admin.",
      "// SAM Pro feature:",
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "SaaS License Management — ingests usage from M365 Graph + flags duplicate / unused assignments",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "Discovery probe on the user's laptop",
        correct: false,
        feedback: {
          title: "Wrong source",
          explain: "SaaS entitlement lives in the tenant (M365 Graph), not on the endpoint. Discovery sees the installed app but not the assigned plan.",
          sim: { rows: [], logs: [{ time: T(), text: "Endpoint scan can't see tenant-side license assignment", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "A Performance Analytics indicator on incident counts",
        correct: false,
        feedback: {
          title: "Unrelated",
          explain: "PA reports trends. SaaS License Management is the dedicated SAM Pro module for cloud subscriptions.",
          sim: { rows: [], logs: [{ time: T(), text: "Trend chart doesn't reveal duplicate assignments", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "samp_saas_subscription_assignment",
      rows: [{ number: "M365-OVERLAP", state: "112 duplicate Teams assignments", updated: "now", highlight: "warn" }],
      logs: [{ time: T(), text: "SaaS recon found 112 users with overlapping E3 + standalone Teams", tone: "warn" }],
    },
    correctTeach: {
      title: "SaaS ≠ on-prem",
      explain: "SAM Pro's SaaS License Management pulls from publisher APIs (M365, Zoom, Salesforce, Adobe CC, AWS) to track assignment + actual usage. Reclamation works here too: unassign unused seats.",
    },
  },
];



/* ============== TOPICS (learn) ============== */

export const ADMIN_TOPICS: Topic[] = [
  {
    id: "platform-admin",
    name: "Admin Console",
    tagline: "Filters, modules, navigation.",
    emoji: "🛠️",
    blurb: "Where everything lives. Filter navigator, application menus, modules, sys_properties — your daily dashboard as an admin.",
    track: "servicenow-admin",
  },
  {
    id: "security-admin",
    name: "Security & ACLs",
    tagline: "Roles, groups, access control rules.",
    emoji: "🔐",
    blurb: "The four layers: roles, groups, ACLs, and data policies. How users get into tables, and how PII stays out of wrong hands.",
    track: "servicenow-admin",
  },
  {
    id: "catalog-admin",
    name: "Catalog Admin",
    tagline: "Items, variables, record producers.",
    emoji: "🛒",
    blurb: "Build self-service request forms users actually fill out. Variables, variable sets, UI policies, workflows / flows behind each item.",
    track: "servicenow-admin",
  },
  {
    id: "reporting",
    name: "Reporting & Dashboards",
    tagline: "Reports, Performance Analytics, dashboards.",
    emoji: "📊",
    blurb: "Charts, lists, pivots, and the difference between point-in-time reports and trend-style Performance Analytics indicators.",
    track: "servicenow-admin",
  },
  {
    id: "sam-pro",
    name: "SAM Pro",
    tagline: "Software Asset Management Professional.",
    emoji: "💿",
    blurb: "Discover, normalize, reconcile, and reclaim software licenses across on-prem and SaaS. Stay compliant during vendor audits and cut spend on shelfware.",
    track: "servicenow-admin",
  },
];


export const ADMIN_TERMS: Term[] = [
  { topic: "platform-admin", term: "sys_properties", short: "Global config switches.", long: "Key/value table for instance-wide settings. Avoid storing secrets here — use credentials or vault." },
  { topic: "platform-admin", term: "Application Menu", short: "The collapsible groups in the left nav.", long: "Each app shows modules underneath. Admins can show/hide via roles." },
  { topic: "platform-admin", term: "Module", short: "A link in the left nav that loads a list/form/URL.", long: "Modules belong to application menus. The 'link type' decides what they open (list, new record, URL, separator)." },
  { topic: "platform-admin", term: "Filter Navigator", short: "The search box at the top of the left nav.", long: "Type a table name (e.g. `incident.list`) or module name to jump. Power-user pattern: bookmark filter URLs." },

  { topic: "security-admin", term: "Role", short: "A bag of permissions.", long: "Roles grant access via ACLs and module visibility. Roles can contain other roles (e.g. itil contains itil_user)." },
  { topic: "security-admin", term: "Group", short: "A bundle of users for assignment & roles.", long: "Groups can hold roles — granting any member that role. Used for assignment_group on tasks." },
  { topic: "security-admin", term: "ACL", short: "Access Control List rule.", long: "Evaluated as: required roles → condition → script. ALL must pass for access. Operations: create/read/write/delete." },
  { topic: "security-admin", term: "Data Policy", short: "Server-side mandatory/readonly rules.", long: "Like UI Policies but enforced for imports, API, and scripts — not just the form." },

  { topic: "catalog-admin", term: "Catalog Item", short: "A request fillable from the portal.", long: "Has variables (the form fields) and a fulfillment workflow / flow. Lives on sc_cat_item." },
  { topic: "catalog-admin", term: "Variable Set", short: "Reusable group of variables.", long: "Attach the same set (e.g. 'New Hire Info') to many items so you don't re-create variables." },
  { topic: "catalog-admin", term: "Record Producer", short: "Catalog item that creates a non-RITM record.", long: "Used for things like 'Submit an Incident' from the portal — produces an incident directly instead of a RITM." },
  { topic: "catalog-admin", term: "Catalog UI Policy", short: "UI Policy scoped to a catalog item.", long: "Show/hide/mandatory for catalog variables. Always pick this over Catalog Client Scripts." },

  { topic: "reporting", term: "Report", short: "A saved query + visualization.", long: "Bar/line/pie/list/pivot on any table. Sharable, schedulable, embeddable on dashboards." },
  { topic: "reporting", term: "Dashboard", short: "A canvas of reports & widgets.", long: "Successor to Homepages. Tabs, drag-and-drop, role-restricted sharing. Built on Responsive Dashboards." },
  { topic: "reporting", term: "Indicator", short: "A Performance Analytics metric collected over time.", long: "Snapshots a number (e.g. 'open P1 incidents') daily/weekly. Powers trend lines and breakdowns." },
  { topic: "reporting", term: "Breakdown", short: "A dimension to slice an indicator by.", long: "E.g. break down 'open P1 incidents' by assignment_group or location. Built once, reused across widgets." },

  // platform-admin (additional)
  { topic: "platform-admin", term: "Update Set", short: "Bundle of config changes to ship.", long: "Captures business rules, UI policies, scripts, etc. Doesn't include data — use fix scripts or imports for that." },
  { topic: "platform-admin", term: "Fix Script", short: "One-off server script.", long: "Run once during deployment to migrate/repair data. Captured in an update set for repeatability." },
  { topic: "platform-admin", term: "Scheduled Job", short: "Server script on a cron schedule.", long: "sysauto_script. Use for cleanup, rollups, integrations. Watch concurrency on overlapping runs." },
  { topic: "platform-admin", term: "System Log", short: "Central log table (syslog).", long: "gs.info/warn/error write here. Filter by source for your script. Logs rotate by retention policy." },
  { topic: "platform-admin", term: "Impersonate User", short: "Test as another user without their password.", long: "Always your first repro step for 'I can't see X' tickets. Audited in sys_user_impersonate." },
  { topic: "platform-admin", term: "Plugin", short: "Optional feature pack you activate.", long: "Some plugins are demo-data-laden — activate on dev first. Check the docs for dependencies." },
  { topic: "platform-admin", term: "Domain Separation", short: "Logical isolation between tenants.", long: "Premium feature. Records carry sys_domain; visibility/processes scoped per domain. Complex to retrofit." },
  { topic: "platform-admin", term: "Dictionary", short: "Schema editor for tables/fields.", long: "Add fields, change types, set max length, attributes. Dictionary changes propagate to forms/lists." },
  { topic: "platform-admin", term: "Form Designer", short: "Per-view form editing.", long: "Form Designer (drag-drop) vs classic Form Layout. Save per view (Default, Self-Service, etc.)." },
  { topic: "platform-admin", term: "List Control", short: "Per-table list behavior settings.", long: "Toggle 'omit new button', enable inline create, set default sort. Edit via list cog or sys_ui_list_control." },
  { topic: "platform-admin", term: "Personalize List/Form", short: "End-user view tweaks.", long: "Saved per user; doesn't change others' views. Admins can lock down personalization on sensitive tables." },

  // security-admin (additional)
  { topic: "security-admin", term: "Elevated Role", short: "Grant security_admin temporarily.", long: "Required to edit certain ACLs and sensitive config. Click 'Elevate Role' in the user menu — audited." },
  { topic: "security-admin", term: "High Security Plugin", short: "Tightens platform defaults.", long: "Default deny on tables, stricter web service ACLs. Activated on all modern instances." },
  { topic: "security-admin", term: "Contextual Security", short: "ServiceNow's term for the ACL system.", long: "Layered: table → field → row. ACL evaluation order matters; admin role bypasses table ACLs but not row/field unless 'admin override' is set." },
  { topic: "security-admin", term: "Cross-Scope Privilege", short: "Allow scopes to call each other's APIs.", long: "sys_scope_privilege. Required when a custom app must read a record in another scope." },
  { topic: "security-admin", term: "Edge Encryption", short: "Encrypt sensitive fields before they reach SN.", long: "Premium add-on; proxies field values via customer-managed keys. Different from CMK." },
  { topic: "security-admin", term: "Field-Level Encryption", short: "Encrypt specific fields at rest.", long: "Pre-existing fields encrypted with platform-managed keys. Searchable only via exact match." },
  { topic: "security-admin", term: "Multi-Factor Auth", short: "MFA via authenticator or email.", long: "Configurable per user/role; integrates with SSO IdPs that handle MFA themselves." },
  { topic: "security-admin", term: "SAML SSO", short: "Federated login via identity provider.", long: "Configure under Multi-Provider SSO. Match assertions to sys_user.user_name or email." },
  { topic: "security-admin", term: "User Criteria", short: "Reusable audience for catalog/KB.", long: "Combine roles/groups/users/companies. Attached to catalog items and KB articles to control who sees what." },
  { topic: "security-admin", term: "Read vs Write ACL", short: "Distinct rules per operation.", long: "An empty Read ACL on a table hides every row; an empty Write ACL prevents updates. Always test both." },
  { topic: "security-admin", term: "Inherited Roles", short: "Roles containing other roles.", long: "Granting 'itil' also grants its contained roles. Inspect via Role > Contains Roles related list." },

  // catalog-admin (additional)
  { topic: "catalog-admin", term: "Variable", short: "An input field on a catalog item.", long: "Types: Single-line text, Reference, Select Box, Multi-Row Variable Set, etc. Drives RITM payload." },
  { topic: "catalog-admin", term: "Multi-Row Variable Set", short: "Grid of repeating rows (MRVS).", long: "Use when users add N similar items (e.g. multiple users to onboard). Stored as JSON." },
  { topic: "catalog-admin", term: "Catalog Client Script", short: "Browser script on catalog forms.", long: "Use sparingly — Catalog UI Policy covers most show/hide/mandatory needs declaratively." },
  { topic: "catalog-admin", term: "Order Guide", short: "Wizard that orders multiple items.", long: "Asks shared questions once, then submits several catalog items as one Request." },
  { topic: "catalog-admin", term: "Catalog Category", short: "Grouping for items in the portal.", long: "Hierarchical; controls navigation. Items can appear in multiple categories." },
  { topic: "catalog-admin", term: "Catalog Workflow", short: "Legacy fulfillment graph.", long: "Drag-drop activities (Approval, Task). For new items, prefer Flow Designer." },
  { topic: "catalog-admin", term: "Fulfillment Flow", short: "Flow Designer flow on a catalog item.", long: "Set on the item; runs on RITM insert. Modern replacement for catalog workflows." },
  { topic: "catalog-admin", term: "Producer Script", short: "Server script on a Record Producer.", long: "Maps variables to fields on the produced record. Runs before insert." },
  { topic: "catalog-admin", term: "Available For", short: "User criteria on the item.", long: "Controls portal visibility. 'Not Available For' wins on conflict." },
  { topic: "catalog-admin", term: "Two-Step Checkout", short: "Cart review before submit.", long: "System property enables a cart preview. Off by default for one-click order." },
  { topic: "catalog-admin", term: "Item Designer", short: "Low-code item authoring tool.", long: "For non-developers to build items; outputs the same sc_cat_item under the hood." },

  // reporting (additional)
  { topic: "reporting", term: "Pivot Table", short: "Cross-tab report.", long: "Rows × columns × measure. Great for SLA breach counts by group × priority." },
  { topic: "reporting", term: "Scheduled Report", short: "Email a report on cron.", long: "PDF/CSV/XLSX to users/groups. Watch attachment size limits." },
  { topic: "reporting", term: "Visualization Types", short: "Chart styles available.", long: "Bar, column, line, area, pie, donut, funnel, heatmap, gauge. Pick by message, not novelty." },
  { topic: "reporting", term: "Performance Analytics", short: "Trend-style analytics add-on (PA).", long: "Collects daily snapshots into indicator scores; powers KPIs and forecasts. Licensed separately." },
  { topic: "reporting", term: "Indicator Source", short: "Defines the population for an indicator.", long: "Encoded query against a table; reusable across many indicators." },
  { topic: "reporting", term: "Scorecard", short: "Detailed view of one indicator over time.", long: "Trend chart, targets, breakdowns, comments. Drilldown from a dashboard widget." },
  { topic: "reporting", term: "Dashboard Tab", short: "Page within a dashboard.", long: "Each tab has its own canvas of widgets; tabs share filters via Interactive Filters." },
  { topic: "reporting", term: "Interactive Filter", short: "Dashboard-wide control.", long: "Date range, group, etc. Applies to all matching widgets — no per-report editing." },
  { topic: "reporting", term: "Report ACL", short: "Who can see/share a report.", long: "report_view/report_publisher roles + sharing on the report record. Audit before sharing PII reports broadly." },
  { topic: "reporting", term: "DB View", short: "Cross-table join for reporting.", long: "Define a join across tables in System Definition > Database Views. Reports can run against the view." },
  { topic: "reporting", term: "Visual Task Board", short: "Kanban-style task view.", long: "Built from a filter; cards = records, lanes = field values. Drag to update state." },

  // sam-pro
  { topic: "sam-pro", term: "Software Asset Management Pro", short: "Premium SAM application.", long: "ServiceNow's licensed SAM offering. Adds Publisher Packs, SaaS License Management, Reclamation, and the Content Library Service on top of SAM Foundation." },
  { topic: "sam-pro", term: "Content Library Service (CLS)", short: "Cloud-hosted normalization data.", long: "ServiceNow-managed catalog of publishers, products, and software models. Normalizes raw Discovery strings into canonical entries so reconciliation is accurate." },
  { topic: "sam-pro", term: "Software Model", short: "A purchasable edition of a product.", long: "e.g. 'Microsoft Visio Professional 2021'. Links discovered installs to entitlements during reconciliation. Lives on samp_sw_product_model." },
  { topic: "sam-pro", term: "Entitlement", short: "Proof of purchase / right-to-use.", long: "Stored on alm_license. Holds quantity, metric, contract reference, and tied software model. Source of 'what you own'." },
  { topic: "sam-pro", term: "License Metric", short: "How a license is measured.", long: "Per User, Per Device, Per Core, Processor, PVU (IBM), Named User Plus (Oracle), CAL, Concurrent. Drives the reconciliation math." },
  { topic: "sam-pro", term: "Reconciliation", short: "Compare entitlements vs installs.", long: "Scheduled engine that calculates compliance position per software model — surplus, compliant, or non-compliant. Results land on samp_sw_reconciliation_result." },
  { topic: "sam-pro", term: "Reclamation Rule", short: "Identify unused installs.", long: "Criteria (e.g. last_used > 90 days) that generate Reclamation Candidates. Workflow then notifies user and triggers SCCM/Intune uninstall to recover the license." },
  { topic: "sam-pro", term: "Publisher Pack", short: "Vendor-specific licensing rules.", long: "Engineering packs for Oracle, Microsoft, IBM, SAP, Adobe, Salesforce. Encode core factors, PVU tables, CAL math, and audit-grade compliance logic." },
  { topic: "sam-pro", term: "SaaS License Management", short: "Track cloud subscriptions.", long: "Ingests usage from Microsoft 365, Zoom, Salesforce, Adobe CC, AWS, Google Workspace, etc. Finds unused / duplicate assignments and powers SaaS reclamation." },
  { topic: "sam-pro", term: "Software Discovery Model", short: "How Discovery feeds SAM.", long: "Discovery + SCCM/Intune/JAMF/BigFix populate cmdb_sam_sw_install. CLS normalizes; reconciliation consumes the normalized installs." },
  { topic: "sam-pro", term: "License Workbench", short: "Compliance command center.", long: "Single page per software model showing entitlements, installs, allocations, reclamation candidates, contracts, and remediation actions." },
  { topic: "sam-pro", term: "Allocation", short: "Assign an entitlement to a CI/user.", long: "Records who consumes a license. Required for named-user metrics and helpful for chargeback and audit defense." },
  { topic: "sam-pro", term: "True-Up / True-Down", short: "Adjust position post-reconciliation.", long: "True-up: buy more to close a gap. True-down: drop seats at renewal. SAM Pro feeds Procurement with hard numbers." },
  { topic: "sam-pro", term: "Audit Defense Workspace", short: "Workspace for vendor audits.", long: "Curates the evidence package — entitlements, contracts, installs, allocation — so you can respond to a publisher audit in days, not months." },
  { topic: "sam-pro", term: "Software Spend Detection", short: "Find shadow IT software spend.", long: "Parses AP / expense / contract data to surface software purchases that never made it into SAM. Common discovery: 20–30% hidden SaaS." },
];


/* ============== QUIZZES ============== */

export const ADMIN_QUIZZES: QuizQuestion[] = [
  // platform-admin
  {
    id: "ad-pa1", topic: "platform-admin",
    question: "Where do instance-wide configuration switches typically live?",
    options: ["sys_properties", "sys_dictionary", "sys_user_preference", "sys_log"],
    correctIndex: 0,
    explain: "sys_properties stores global key/value settings, queried via gs.getProperty().",
    whyCorrect: "sys_properties is the canonical config table. Use gs.getProperty('name', 'default') in scripts; admins toggle behavior without touching code.",
    whyWrong: {
      1: "sys_dictionary describes table schemas, not config switches.",
      2: "sys_user_preference is per-user UI state (filters, list widths).",
      3: "sys_log is read-only log output.",
    },
    learnMore: ["Mark sensitive properties as private so they don't leak via REST.", "Cache property reads in hot loops — gs.getProperty is fast but not free."],
  },
  {
    id: "ad-pa2", topic: "platform-admin",
    question: "Fastest way to open the Incident list?",
    options: ["Navigate via menus", "Type `incident.list` in the Filter Navigator", "Open the home page widget", "Use a saved bookmark only"],
    correctIndex: 1,
    explain: "Filter Navigator accepts `<table>.list` and `<table>.do` shortcuts.",
    whyWrong: {
      0: "Works but slow once you know the table name.",
      2: "Depends on the home dashboard being configured.",
      3: "Bookmarks help, but typing is faster for ad-hoc.",
    },
  },
  {
    id: "ad-pa3", topic: "platform-admin",
    question: "Where do you hide a module from non-admins?",
    options: ["Set the module's `roles` field", "Delete the module", "Add a UI Policy", "Add an ACL to sys_app_module"],
    correctIndex: 0,
    explain: "Modules have a roles field — only users with one of those roles see the module.",
    whyWrong: {
      1: "Destructive and easy to forget you removed it.",
      2: "UI Policies act on forms, not navigation.",
      3: "Heavy-handed; the built-in roles field is the supported way.",
    },
  },
  {
    id: "ad-pa4", topic: "platform-admin",
    question: "Where are user-specific filters & list column widths persisted?",
    options: ["sys_user_preference", "sys_properties", "Each user's profile", "The browser only"],
    correctIndex: 0,
    explain: "Personal UI state lives in sys_user_preference, keyed by user.",
  },
  {
    id: "ad-pa5", topic: "platform-admin",
    question: "An admin module isn't appearing for itil users — most likely cause?",
    options: ["The module's roles field excludes itil", "ACL missing", "Update set not committed", "Cache not flushed"],
    correctIndex: 0,
    explain: "Module visibility is gated by its `roles` field, independent of ACLs.",
  },
  {
    id: "ad-pa6", topic: "platform-admin",
    question: "Best place to override instance behavior for an upgrade-safe customization?",
    options: ["Customize the OOB business rule directly", "Create a new scoped business rule with the override flag", "Edit the table column definitions", "Disable plugins"],
    correctIndex: 1,
    explain: "Scoped/custom rules survive upgrades; modifying OOB artifacts gets skipped or causes conflicts during family upgrades.",
  },

  // security-admin
  {
    id: "ad-sa1", topic: "security-admin",
    question: "ACL evaluation order (all must pass) is:",
    options: ["Role → Condition → Script", "Script → Condition → Role", "Condition → Role → Script", "Role → Script → Condition"],
    correctIndex: 0,
    explain: "Roles first, then condition, then script. All must pass.",
    learnMore: ["Field ACLs can further restrict table ACLs but never widen them.", "Use the Security Debug tool to see exactly which ACL granted/denied access."],
  },
  {
    id: "ad-sa2", topic: "security-admin",
    question: "Where do you grant a role to many users at once?",
    options: ["Add role to a group; users in the group inherit it", "Edit each user record", "Create an ACL", "Use sys_properties"],
    correctIndex: 0,
    explain: "Group roles cascade to all members — the standard pattern.",
  },
  {
    id: "ad-sa3", topic: "security-admin",
    question: "A Data Policy differs from a UI Policy because it…",
    options: ["Runs in the browser only", "Applies for imports, API, and scripts too — not just forms", "Only works in classic UI", "Replaces ACLs"],
    correctIndex: 1,
    explain: "Data Policies enforce mandatory/readonly server-side; UI Policies only affect the form.",
  },
  {
    id: "ad-sa4", topic: "security-admin",
    question: "User can read a record but a sensitive field is blank. Where to look?",
    options: ["Field-level ACL on that field", "Business rule", "Data policy", "Catalog UI policy"],
    correctIndex: 0,
    explain: "Field-level ACLs can hide individual columns even when the row-level ACL grants read.",
  },
  {
    id: "ad-sa5", topic: "security-admin",
    question: "Best way to debug 'why can user X see this row?'",
    options: ["Impersonate + Security Debug", "Read sys_log", "Disable ACLs temporarily", "Ask the user"],
    correctIndex: 0,
    explain: "Impersonate the user, enable Security Debug, navigate to the row — see exactly which ACL evaluated true.",
  },
  {
    id: "ad-sa6", topic: "security-admin",
    question: "Best practice for service accounts used by integrations:",
    options: ["Use a real user's credentials", "Dedicated user, minimum roles, named `<system>_integration`", "Shared admin account", "OAuth only — no user"],
    correctIndex: 1,
    explain: "Dedicated, narrowly-scoped users let you audit and revoke per integration.",
  },

  // catalog-admin
  {
    id: "ad-ca1", topic: "catalog-admin",
    question: "Catalog item submission produces which records?",
    options: ["REQ + RITM (+ SCTASKs per fulfillment)", "Only an Incident", "RITM only", "REQ + Incident"],
    correctIndex: 0,
    explain: "Each submission creates a REQ (umbrella), one RITM per item, and SCTASKs from the workflow / flow.",
  },
  {
    id: "ad-ca2", topic: "catalog-admin",
    question: "Best way to show/hide a variable based on another variable's value:",
    options: ["Catalog UI Policy", "Catalog Client Script", "Business Rule", "ACL"],
    correctIndex: 0,
    explain: "Catalog UI Policies are declarative and auditable; reach for them first.",
  },
  {
    id: "ad-ca3", topic: "catalog-admin",
    question: "Same 6 fields used on 10 items — best approach?",
    options: ["Re-create the variables on each item", "Build a Variable Set, attach to each item", "Use a single global variable", "Use UI Policies"],
    correctIndex: 1,
    explain: "Variable Sets are reusable and prevent drift.",
  },
  {
    id: "ad-ca4", topic: "catalog-admin",
    question: "User wants the portal form to create an Incident, not a RITM. Use:",
    options: ["Catalog Item", "Record Producer", "Order Guide", "Workflow"],
    correctIndex: 1,
    explain: "Record Producers turn portal forms directly into target table records (incident, change, etc.).",
  },
  {
    id: "ad-ca5", topic: "catalog-admin",
    question: "Order Guide is used to…",
    options: ["Bundle related catalog items behind one wizard", "Replace workflows", "Hide variables", "Group reports"],
    correctIndex: 0,
    explain: "Order Guide gathers info once and orders multiple items (e.g. 'New Hire' bundles laptop + email + access).",
  },
  {
    id: "ad-ca6", topic: "catalog-admin",
    question: "Modern automation behind catalog items uses…",
    options: ["Legacy Workflow Editor only", "Flow Designer (preferred) or Workflow", "Business Rules", "Notifications"],
    correctIndex: 1,
    explain: "Flow Designer is the strategic platform; Workflow is supported but legacy.",
  },

  // reporting
  {
    id: "ad-rp1", topic: "reporting",
    question: "Difference between a Report and a Performance Analytics Indicator:",
    options: ["Reports show point-in-time; Indicators snapshot over time", "Reports are server, Indicators are client", "They are the same", "Indicators only work on Incident"],
    correctIndex: 0,
    explain: "Reports query live data; indicators snapshot scores at intervals to build trends.",
  },
  {
    id: "ad-rp2", topic: "reporting",
    question: "Share a dashboard with the entire IT department:",
    options: ["Share with a group", "Email screenshots", "Make it public", "Each user clones it"],
    correctIndex: 0,
    explain: "Group sharing on dashboards is the supported, governed path.",
  },
  {
    id: "ad-rp3", topic: "reporting",
    question: "Best widget to compare value across a dimension (e.g. incidents per group):",
    options: ["Bar / Pivot", "Single Score", "Speedometer", "Time series"],
    correctIndex: 0,
    explain: "Bars or pivots compare categories; time series compares over time.",
  },
  {
    id: "ad-rp4", topic: "reporting",
    question: "User says 'my report is empty' but data exists. First thing to check:",
    options: ["The report's filter and ACLs (impersonate)", "Restart the instance", "Rebuild indexes", "Re-import the data"],
    correctIndex: 0,
    explain: "Most often it's an over-narrow filter or an ACL hiding rows from that user.",
  },
  {
    id: "ad-rp5", topic: "reporting",
    question: "PA indicator scores are stored where?",
    options: ["pa_scores", "sys_report", "sysauto_report", "incident"],
    correctIndex: 0,
    explain: "pa_scores stores the time-series snapshots used by Performance Analytics widgets.",
  },
  {
    id: "ad-rp6", topic: "reporting",
    question: "Scheduled email of a report uses…",
    options: ["Scheduled Reports (sysauto_report)", "Business Rule", "Flow only", "Manual cron"],
    correctIndex: 0,
    explain: "Scheduled Reports email the rendered report (PDF/Excel/Inline) on a cadence.",
  },

  // sam-pro
  {
    id: "ad-sm1", topic: "sam-pro",
    question: "Which engine compares purchased entitlements against discovered installs?",
    options: ["Reconciliation", "Discovery", "Flow Designer", "Performance Analytics"],
    correctIndex: 0,
    explain: "Reconciliation is SAM Pro's compliance engine — it produces the surplus / compliant / non-compliant position per software model.",
    whyWrong: {
      1: "Discovery just inventories what's installed; it doesn't compare to entitlements.",
      2: "Flow Designer automates workflows, e.g. reclamation, but doesn't compute compliance.",
      3: "PA reports trends over time — different concern.",
    },
    learnMore: ["Reconciliation is scheduled; you can also run it on demand from the License Workbench.", "Results land on samp_sw_reconciliation_result."],
  },
  {
    id: "ad-sm2", topic: "sam-pro",
    question: "What does the Content Library Service (CLS) do?",
    options: ["Normalizes raw install strings to canonical publishers/products/models", "Stores PDFs of contracts", "Backs up the CMDB", "Hosts learning content"],
    correctIndex: 0,
    explain: "CLS is ServiceNow's cloud-hosted normalization catalog — without it, every reconciliation is wrong.",
  },
  {
    id: "ad-sm3", topic: "sam-pro",
    question: "You found 137 installs of Visio but own 100 licenses. Right SAM Pro response?",
    options: ["Create Reclamation Candidates for unused installs, then SCCM-uninstall", "Edit the entitlement quantity to 137", "Delete 37 install records", "Disable Discovery for Visio"],
    correctIndex: 0,
    explain: "Reclamation closes the gap legitimately by recovering unused licenses. Inflating entitlements falsifies compliance.",
  },
  {
    id: "ad-sm4", topic: "sam-pro",
    question: "Best way to handle Oracle DB Enterprise's Processor Core Factor licensing?",
    options: ["Oracle Publisher Pack", "Custom Script Include", "Count installs", "Ignore — count users"],
    correctIndex: 0,
    explain: "Publisher Packs (Oracle, MS, IBM, SAP, Adobe, Salesforce) encode each vendor's metric rules and audit math.",
  },
  {
    id: "ad-sm5", topic: "sam-pro",
    question: "Which SAM Pro module surfaces duplicate Microsoft 365 license assignments?",
    options: ["SaaS License Management", "Discovery probes", "Update Sets", "Notifications"],
    correctIndex: 0,
    explain: "SaaS License Management ingests usage from publisher APIs (M365 Graph, Zoom, Salesforce, Adobe CC, etc.) and flags overlap.",
  },
  {
    id: "ad-sm6", topic: "sam-pro",
    question: "Where do entitlement records live?",
    options: ["alm_license", "cmdb_ci_server", "sc_req_item", "sys_user"],
    correctIndex: 0,
    explain: "alm_license stores the right-to-use record: quantity, metric, contract, software model.",
  },
];

/* ============== SECTION PLAN ============== */

export const ADMIN_SECTIONS: Record<string, QuizSection[]> = {
  "platform-admin": [
    { label: "Navigation", icon: "🧭", count: 3 },
    { label: "Config & properties", icon: "🛠️", count: 3 },
  ],
  "security-admin": [
    { label: "Roles & groups", icon: "👥", count: 3 },
    { label: "ACL deep-dive", icon: "🔐", count: 3 },
  ],
  "catalog-admin": [
    { label: "Items & variables", icon: "🛒", count: 3 },
    { label: "Fulfillment", icon: "🚚", count: 3 },
  ],
  reporting: [
    { label: "Reports & sharing", icon: "📊", count: 3 },
    { label: "Performance Analytics", icon: "📈", count: 3 },
  ],
  "sam-pro": [
    { label: "Discovery & normalization", icon: "🔎", count: 3 },
    { label: "Reconciliation & reclamation", icon: "⚖️", count: 3 },
  ],
};

