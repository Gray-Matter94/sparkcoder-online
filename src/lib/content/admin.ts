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
};
