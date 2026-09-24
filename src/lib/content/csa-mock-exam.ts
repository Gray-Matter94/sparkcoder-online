import { ADMIN_QUIZZES } from "./admin";

export interface ExamQuestion {
  id: string;
  domain: string;
  question: string;
  options: string[];
  correctIndex: number;
  explain: string;
}

const DOMAIN: Record<string, string> = {
  "platform-admin": "Platform Overview & Navigation",
  "security-admin": "Security & Access",
  "catalog-admin": "Service Catalog",
  reporting: "Reports & Dashboards",
  "sam-pro": "Data & CMDB",
};

const q = (
  id: string,
  domain: string,
  question: string,
  options: string[],
  correctIndex: number,
  explain: string,
): ExamQuestion => ({ id, domain, question, options, correctIndex, explain });

const CSA_EXTRA: ExamQuestion[] = [
  q("csa-1", "Platform Overview & Navigation", "Which field on a list lets you filter the application navigator by typing?", ["Filter Navigator", "Global search", "Breadcrumbs", "Context menu"], 0, "The Filter Navigator at the top of the application navigator filters modules as you type."),
  q("csa-2", "Platform Overview & Navigation", "What do breadcrumbs on a list represent?", ["Recently visited records", "The active filter conditions", "Update set history", "Parent tables"], 1, "Breadcrumbs show each filter condition; clicking one removes conditions to its right."),
  q("csa-3", "Platform Overview & Navigation", "Which suffix opens a table's form for a new record from the navigator?", [".list", ".do", ".form", ".config"], 1, "Typing <table>.do opens a new record form; <table>.list opens the list."),
  q("csa-4", "Platform Overview & Navigation", "Where can a user change their own language and time zone?", ["System Properties", "User preferences / profile", "Dictionary", "Update Sets"], 1, "Language and time zone are personal settings available from the user menu and profile."),
  q("csa-5", "Platform Overview & Navigation", "What is a Favorite in the application navigator?", ["A pinned link to a module, list or record", "An admin-only report", "A scheduled job", "A UI Policy"], 0, "Favorites are user-pinned shortcuts to modules, filtered lists or records."),
  q("csa-6", "Instance Configuration", "Which table stores the definition of every field on every table?", ["sys_db_object", "sys_dictionary", "sys_choice", "sys_properties"], 1, "sys_dictionary holds field (column) definitions; sys_db_object holds table definitions."),
  q("csa-7", "Instance Configuration", "What happens when you extend the Task table to create a new table?", ["It copies Task records", "It inherits Task fields and behavior", "It replaces Task", "It creates a database view"], 1, "Child tables inherit parent fields, and parent-level logic can apply to them."),
  q("csa-8", "Instance Configuration", "Which record type changes field attributes for a single child table without changing the parent?", ["Dictionary override", "Client script", "Data policy", "UI action"], 0, "Dictionary overrides change inherited field attributes, such as defaults or mandatory, for one child table."),
  q("csa-9", "Instance Configuration", "Where are selectable values for a Choice field stored?", ["sys_choice", "sys_dictionary", "sys_ui_policy", "sys_user_group"], 0, "Choice list options live in sys_choice."),
  q("csa-10", "Instance Configuration", "What is the main difference between a UI Policy and a Data Policy?", ["UI Policy runs server-side only", "Data Policy is enforced for all data sources, UI Policy only in forms", "They are identical", "Data Policy only hides fields"], 1, "Data Policies apply to imports, web services and forms; UI Policies only affect the form UI."),
  q("csa-11", "Instance Configuration", "Which tool lets a non-coder drag fields onto a form layout?", ["Form Designer", "Studio Script Editor", "Schema Map", "Transform Map"], 0, "Form Designer and Form Layout configure fields and sections on a form."),
  q("csa-12", "Instance Configuration", "What does a form view allow?", ["Different field layouts of the same table for different audiences", "A separate table", "A separate database", "Version control"], 0, "Views are alternate layouts of the same form or list, often role-based."),
  q("csa-13", "Security & Access", "How are roles best assigned to users?", ["Directly to each user", "Through groups", "Through UI Policies", "Through Business Rules"], 1, "Assigning roles to groups keeps access manageable; members inherit the group's roles."),
  q("csa-14", "Security & Access", "In ACL evaluation, which ACL is checked first for a field?", ["table.* only", "The most specific match, such as table.field", "The parent table only", "Random order"], 1, "ACLs are evaluated from most specific to most generic; table.field is checked before table.*."),
  q("csa-15", "Security & Access", "What three checks must pass for an ACL to grant access?", ["Roles, condition and script", "Group, location and department", "Update set, scope and view", "Dictionary, choice and label"], 0, "An ACL grants access only when its required roles, condition and script all evaluate true."),
  q("csa-16", "Security & Access", "Which role is required to create or edit ACLs?", ["admin", "security_admin (elevated)", "itil", "catalog_admin"], 1, "Editing ACLs requires elevating to the security_admin role."),
  q("csa-17", "Security & Access", "What does impersonating a user let an administrator do?", ["Reset their password", "See the instance with that user's access", "Delete their account", "Bypass all ACLs permanently"], 1, "Impersonation is used to test what a specific user can see and do."),
  q("csa-18", "Service Catalog", "What is a Record Producer?", ["A catalog item that creates a record on a table such as Incident", "A report type", "A scheduled import", "An ACL"], 0, "Record Producers use a catalog interface to create task-based records."),
  q("csa-19", "Service Catalog", "Where are ordered catalog items tracked after submission?", ["sc_request and sc_req_item", "incident and problem", "sys_user", "cmdb_ci"], 0, "An order creates a Request (sc_request) with Requested Items (sc_req_item)."),
  q("csa-20", "Service Catalog", "What do variable sets allow?", ["Reusing a group of variables across catalog items", "Setting system properties", "Scheduling reports", "Creating tables"], 0, "Variable sets bundle variables for reuse across many items."),
  q("csa-21", "Service Catalog", "Which feature controls who can see a catalog item?", ["User Criteria", "Dictionary override", "Transform map", "Choice list"], 0, "User Criteria define Available For / Not Available For access to catalog items and categories."),
  q("csa-22", "Knowledge & Collaboration", "Which record organizes knowledge articles for a specific audience with its own workflow?", ["Knowledge base", "Catalog category", "Update set", "Report source"], 0, "Each knowledge base has its own managers, audiences and publishing workflow."),
  q("csa-23", "Knowledge & Collaboration", "What triggers an email notification?", ["Record insert/update conditions or an event", "Only a scheduled job", "Only a UI action", "Only a client script"], 0, "Notifications fire when a record is inserted/updated and meets conditions, or when an event is fired."),
  q("csa-24", "Reports & Dashboards", "Which report type shows record counts grouped by category as bars?", ["Bar chart", "List", "Calendar", "Pivot table only"], 0, "Bar charts group records by a field and display counts."),
  q("csa-25", "Reports & Dashboards", "How do you share a report with a group?", ["Set its sharing to groups/users", "Export to PDF only", "Add it to an update set", "Create an ACL"], 0, "Reports can be shared with specific users, groups or everyone."),
  q("csa-26", "Data & CMDB", "What is the purpose of a Transform Map?", ["Mapping import set fields to target table fields", "Drawing CI relationships", "Setting ACLs", "Designing forms"], 0, "Transform Maps map staging (import set) columns to target table fields."),
  q("csa-27", "Data & CMDB", "Which field on a transform map prevents duplicate records on import?", ["Coalesce", "Mandatory", "Read only", "Display"], 0, "Coalesce fields match incoming rows to existing records to update instead of insert."),
  q("csa-28", "Data & CMDB", "What is the base table of the CMDB class hierarchy?", ["cmdb_ci", "task", "sys_user", "cmdb_rel_ci"], 0, "cmdb_ci is the base configuration item table; cmdb_rel_ci stores relationships."),
  q("csa-29", "Application Tools", "What does an update set capture?", ["Configuration changes such as forms and scripts", "All task records", "User data", "Attachments only"], 0, "Update sets track customization records (sys_update_xml), not transactional data."),
  q("csa-30", "Application Tools", "What must happen before committing a retrieved update set on the target instance?", ["Preview and resolve problems", "Delete the source instance", "Clone the instance", "Disable ACLs"], 0, "Retrieved update sets are previewed so collisions and missing references can be resolved before commit."),
];

export const CSA_EXAM_POOL: ExamQuestion[] = [
  ...ADMIN_QUIZZES.map((item) =>
    q(item.id, DOMAIN[item.topic] ?? "Platform", item.question, item.options, item.correctIndex, item.explain),
  ),
  ...CSA_EXTRA,
];

export const CSA_EXAM_LENGTH = Math.min(60, CSA_EXAM_POOL.length);
export const CSA_EXAM_MINUTES = 90;
export const CSA_PASS_PERCENT = 70;

export function drawExam(): ExamQuestion[] {
  const pool = [...CSA_EXAM_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CSA_EXAM_LENGTH);
}
