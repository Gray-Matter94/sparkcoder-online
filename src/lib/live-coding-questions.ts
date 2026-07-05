// Live Coding Simulator question bank.
// 2000 ServiceNow scripting tasks (server + client). Each question ships with
// a canonical solution and ordered "checks" the validator uses to pinpoint
// the first mistake — the same way an interviewer would point at the specific
// line that's wrong. Scenarios are drawn from commonly asked ServiceNow
// interview questions (GlideRecord/GlideAggregate/GlideDateTime, Business
// Rules, Client Scripts, GlideAjax, Script Includes, Fix Scripts, UI
// Actions, Scheduled Jobs, catalog client scripts, event queues, workflow
// scratchpads, cross-scope calls, and more) plus a set of less common
// "unique" variants (secure GRs, GlideEncrypter, GlideDBUtil, plural APIs).

export type Side = "server" | "client";

export interface LiveCheck {
  /** Normalized substring that MUST appear in the candidate's code. */
  needle: string;
  /** Human coach message when this check fails. */
  message: string;
}

export interface LiveCodingQuestion {
  id: string;
  side: Side;
  scriptType: string; // e.g. "Background Script", "Business Rule (before)"
  filename: string;
  title: string;
  task: string;
  starter: string;
  solution: string;
  checks: LiveCheck[];
}

// ---------- Server side data ----------------------------------------------

const SERVER_TABLES: { table: string; label: string; field: string; value: string }[] = [
  { table: "incident", label: "Incident", field: "category", value: "network" },
  { table: "problem", label: "Problem", field: "priority", value: "1" },
  { table: "change_request", label: "Change Request", field: "type", value: "normal" },
  { table: "sc_request", label: "Service Request", field: "approval", value: "requested" },
  { table: "sc_req_item", label: "Requested Item", field: "stage", value: "waiting" },
  { table: "sc_task", label: "Catalog Task", field: "state", value: "1" },
  { table: "cmdb_ci", label: "Configuration Item", field: "operational_status", value: "1" },
  { table: "cmdb_ci_server", label: "Server CI", field: "os", value: "Linux" },
  { table: "cmdb_ci_computer", label: "Computer CI", field: "manufacturer", value: "Dell" },
  { table: "sys_user", label: "User", field: "active", value: "true" },
  { table: "sys_user_group", label: "User Group", field: "type", value: "itil" },
  { table: "sla", label: "SLA Definition", field: "active", value: "true" },
  { table: "task", label: "Task", field: "state", value: "2" },
  { table: "kb_knowledge", label: "Knowledge Article", field: "workflow_state", value: "published" },
  { table: "cmn_location", label: "Location", field: "country", value: "IN" },
  { table: "core_company", label: "Company", field: "customer", value: "true" },
  { table: "sn_customerservice_case", label: "CSM Case", field: "state", value: "10" },
  { table: "hr_case", label: "HR Case", field: "state", value: "18" },
  { table: "change_task", label: "Change Task", field: "state", value: "2" },
  { table: "problem_task", label: "Problem Task", field: "state", value: "3" },
  { table: "sys_email", label: "Email", field: "type", value: "sent" },
  { table: "sys_journal_field", label: "Journal Field", field: "element", value: "comments" },
  { table: "sys_attachment", label: "Attachment", field: "content_type", value: "application/pdf" },
  { table: "cmdb_rel_ci", label: "CI Relationship", field: "type", value: "Depends on::Used by" },
  { table: "sys_user_role", label: "Role", field: "name", value: "admin" },
  { table: "sys_user_has_role", label: "User Role Grant", field: "state", value: "active" },
  { table: "sys_dictionary", label: "Dictionary Entry", field: "internal_type", value: "string" },
  { table: "sys_choice", label: "Choice List", field: "inactive", value: "false" },
  { table: "sys_script", label: "Business Rule", field: "when", value: "before" },
  { table: "sys_script_include", label: "Script Include", field: "client_callable", value: "true" },
  { table: "sys_ui_policy", label: "UI Policy", field: "active", value: "true" },
  { table: "sys_ui_action", label: "UI Action", field: "active", value: "true" },
  { table: "sysapproval_approver", label: "Approval", field: "state", value: "requested" },
  { table: "sysevent", label: "Event Queue", field: "state", value: "ready" },
  { table: "sys_trigger", label: "Scheduled Job", field: "state", value: "0" },
  { table: "sys_data_source", label: "Data Source", field: "type", value: "REST" },
  { table: "sys_import_set_row", label: "Import Row", field: "sys_import_state", value: "inserted" },
  { table: "sys_transform_map", label: "Transform Map", field: "run_business_rules", value: "true" },
  { table: "cmdb_ci_network_gear", label: "Network Gear", field: "u_status", value: "up" },
  { table: "cmdb_ci_appl", label: "Application CI", field: "install_status", value: "1" },
  { table: "cmdb_ci_database", label: "Database CI", field: "vendor", value: "Oracle" },
  { table: "cmdb_ci_vm_instance", label: "VM Instance", field: "power_state", value: "on" },
  { table: "cmdb_ci_service", label: "Business Service", field: "service_classification", value: "Business Service" },
  { table: "cmdb_ci_service_technical", label: "Technical Service", field: "operational_status", value: "1" },
  { table: "asset", label: "Asset", field: "install_status", value: "1" },
  { table: "alm_hardware", label: "Hardware Asset", field: "substatus", value: "available" },
  { table: "alm_license", label: "Software License", field: "license_type", value: "perpetual" },
  { table: "sn_hr_core_case_employee_relations", label: "HR ER Case", field: "state", value: "6" },
  { table: "u_project_task", label: "Project Task", field: "phase", value: "execute" },
  { table: "pm_project", label: "Project", field: "state", value: "work_in_progress" },
  { table: "rm_story", label: "Story", field: "state", value: "ready" },
  { table: "rm_defect", label: "Defect", field: "state", value: "open" },
  { table: "rm_scrum_task", label: "Scrum Task", field: "state", value: "-5" },
  { table: "sn_grc_control", label: "GRC Control", field: "state", value: "monitor" },
  { table: "sn_risk_risk", label: "Risk", field: "state", value: "monitor" },
  { table: "sn_compliance_policy", label: "Policy", field: "state", value: "published" },
  { table: "vtb_board", label: "Visual Task Board", field: "type", value: "flexible" },
  { table: "u_department_note", label: "Dept Note", field: "u_active", value: "true" },
  { table: "cmn_department", label: "Department", field: "primary_contact", value: "abel.tuter" },
  { table: "sys_history_line", label: "History Line", field: "field", value: "state" },
  { table: "sys_metadata", label: "Metadata", field: "sys_scope", value: "global" },
];

type ServerTemplate = (t: (typeof SERVER_TABLES)[number], idx: number) => LiveCodingQuestion;

const serverTemplates: ServerTemplate[] = [
  // 1. list active + log sys_id
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_list_active.js`,
    title: `List active ${t.label} records`,
    task: `Write a Background Script that queries all active ${t.label} records and logs each record's sys_id using gs.info.`,
    starter: `// Query active ${t.table} records and log the sys_id of each\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.addQuery('active', true);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.getUniqueValue());\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Start with a GlideRecord on the '${t.table}' table.` },
      { needle: `addQuery('active', true)`, message: `Filter to active records with addQuery('active', true).` },
      { needle: `.query()`, message: `You created the GlideRecord but never called .query() to run it.` },
      { needle: `while (gr.next())`, message: `Iterate the result set with while (gr.next()).` },
      { needle: `gs.info(`, message: `Log each record with gs.info(...).` },
    ],
  }),
  // 2. close one by number
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_close_one.js`,
    title: `Close a single ${t.label} by number`,
    task: `Fetch a single ${t.label} where number == 'REC0001001' and set its state to 7 (Closed), then update the record.`,
    starter: `// Look up ${t.table} number REC0001001 and close it\n`,
    solution: `var gr = new GlideRecord('${t.table}');\nif (gr.get('number', 'REC0001001')) {\n  gr.setValue('state', 7);\n  gr.update();\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Create a GlideRecord for '${t.table}'.` },
      { needle: `gr.get('number', 'REC0001001')`, message: `Use gr.get('number', 'REC0001001') so you fetch by the record number.` },
      { needle: `setValue('state', 7)`, message: `Close means state = 7 — use setValue('state', 7).` },
      { needle: `gr.update()`, message: `You changed the value but forgot to call gr.update() to persist it.` },
    ],
  }),
  // 3. GlideAggregate count
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_count.js`,
    title: `Count ${t.label} where ${t.field} = ${t.value}`,
    task: `Use GlideAggregate to count ${t.label} records where ${t.field} equals '${t.value}' and log the count.`,
    starter: `// Count ${t.table} where ${t.field} == '${t.value}'\n`,
    solution: `var ga = new GlideAggregate('${t.table}');\nga.addQuery('${t.field}', '${t.value}');\nga.addAggregate('COUNT');\nga.query();\nif (ga.next()) {\n  gs.info('Total: ' + ga.getAggregate('COUNT'));\n}`,
    checks: [
      { needle: `new GlideAggregate('${t.table}')`, message: `GlideAggregate is the right tool for counts, not GlideRecord.` },
      { needle: `addQuery('${t.field}', '${t.value}')`, message: `Filter to ${t.field} == '${t.value}'.` },
      { needle: `addAggregate('COUNT')`, message: `Missing addAggregate('COUNT') — that's what tells the API to count.` },
      { needle: `.query()`, message: `You built the aggregate but never called .query().` },
      { needle: `getAggregate('COUNT')`, message: `Read the count with getAggregate('COUNT').` },
    ],
  }),
  // 4. deleteMultiple
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_delete_inactive.js`,
    title: `Delete inactive ${t.label} records`,
    task: `Delete every ${t.label} record where active is false. Use deleteMultiple for efficiency.`,
    starter: `// Bulk-delete inactive ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.addQuery('active', false);\ngr.deleteMultiple();`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Instantiate GlideRecord for '${t.table}'.` },
      { needle: `addQuery('active', false)`, message: `Filter inactive rows with addQuery('active', false).` },
      { needle: `deleteMultiple()`, message: `Use deleteMultiple() — deleteRecord() only removes one row and needs a next() loop.` },
    ],
  }),
  // 5. insert
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_insert.js`,
    title: `Insert a new ${t.label}`,
    task: `Create a new ${t.label} record. Set short_description to 'Created by script' and ${t.field} to '${t.value}', then insert it.`,
    starter: `// Insert one ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.initialize();\ngr.setValue('short_description', 'Created by script');\ngr.setValue('${t.field}', '${t.value}');\ngr.insert();`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Create a GlideRecord for '${t.table}'.` },
      { needle: `initialize()`, message: `Call gr.initialize() before setting values on a brand-new record.` },
      { needle: `setValue('short_description', 'Created by script')`, message: `Set short_description exactly to 'Created by script'.` },
      { needle: `setValue('${t.field}', '${t.value}')`, message: `Set ${t.field} to '${t.value}'.` },
      { needle: `gr.insert()`, message: `You forgot to call gr.insert() — nothing is written without it.` },
    ],
  }),
  // 6. orderBy + setLimit
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_top10.js`,
    title: `Top 10 newest ${t.label}`,
    task: `Query the 10 most recently created ${t.label} records and log their number field.`,
    starter: `// Newest 10 ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.orderByDesc('sys_created_on');\ngr.setLimit(10);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.getValue('number'));\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Start with GlideRecord('${t.table}').` },
      { needle: `orderByDesc('sys_created_on')`, message: `"Newest" means orderByDesc('sys_created_on').` },
      { needle: `setLimit(10)`, message: `Cap the result set with setLimit(10).` },
      { needle: `.query()`, message: `Call .query() to actually execute.` },
      { needle: `while (gr.next())`, message: `Iterate with while (gr.next()).` },
      { needle: `getValue('number')`, message: `Log the number field with getValue('number').` },
    ],
  }),
  // 7. addOrCondition
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_or_query.js`,
    title: `${t.label} where ${t.field} is A OR B`,
    task: `Query ${t.label} where ${t.field} == '${t.value}' OR ${t.field} == 'other'. Log the row count via getRowCount().`,
    starter: `// OR condition on ${t.field}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\nvar q = gr.addQuery('${t.field}', '${t.value}');\nq.addOrCondition('${t.field}', 'other');\ngr.query();\ngs.info('Rows: ' + gr.getRowCount());`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord('${t.table}') first.` },
      { needle: `addQuery('${t.field}', '${t.value}')`, message: `First branch: addQuery('${t.field}', '${t.value}').` },
      { needle: `addOrCondition('${t.field}', 'other')`, message: `Chain the OR with addOrCondition on the same field.` },
      { needle: `.query()`, message: `Run the query with .query().` },
      { needle: `getRowCount()`, message: `Log the count using getRowCount().` },
    ],
  }),
  // 8. addEncodedQuery
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_encoded.js`,
    title: `${t.label} via encoded query`,
    task: `Use addEncodedQuery to fetch ${t.label} where active=true^${t.field}=${t.value}. Log the sys_id of each row.`,
    starter: `// Encoded query on ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.addEncodedQuery('active=true^${t.field}=${t.value}');\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.sys_id.toString());\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Start with GlideRecord('${t.table}').` },
      { needle: `addEncodedQuery('active=true^${t.field}=${t.value}')`, message: `Use addEncodedQuery with the exact encoded string.` },
      { needle: `.query()`, message: `Call .query() to execute.` },
      { needle: `while (gr.next())`, message: `Loop with while (gr.next()).` },
      { needle: `gs.info(`, message: `Log inside the loop with gs.info(...).` },
    ],
  }),
  // 9. setWorkflow(false) + updateMultiple
  (t) => ({
    id: "", side: "server", scriptType: "Fix Script",
    filename: `fix_${t.table}_silent.js`,
    title: `Silent bulk update on ${t.label}`,
    task: `Set ${t.field} to '${t.value}' on every ${t.label} record without triggering business rules or workflows.`,
    starter: `// Silent update ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.setValue('${t.field}', '${t.value}');\ngr.setWorkflow(false);\ngr.updateMultiple();`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord for '${t.table}' first.` },
      { needle: `setValue('${t.field}', '${t.value}')`, message: `Stage the new value with setValue('${t.field}', '${t.value}').` },
      { needle: `setWorkflow(false)`, message: `Suppress business rules with setWorkflow(false).` },
      { needle: `updateMultiple()`, message: `Apply to every row with updateMultiple().` },
    ],
  }),
  // 10. getDisplayValue reference
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_ref_display.js`,
    title: `Show sys_created_by for each ${t.label}`,
    task: `Loop over the newest 5 ${t.label} rows and log the sys_created_by user's display name using getDisplayValue().`,
    starter: `// Display name of the creator\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.orderByDesc('sys_created_on');\ngr.setLimit(5);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.getDisplayValue('sys_created_by'));\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Use GlideRecord('${t.table}').` },
      { needle: `orderByDesc('sys_created_on')`, message: `Newest first: orderByDesc('sys_created_on').` },
      { needle: `setLimit(5)`, message: `Cap the query at 5 with setLimit(5).` },
      { needle: `.query()`, message: `Execute with .query().` },
      { needle: `while (gr.next())`, message: `Iterate with while (gr.next()).` },
      { needle: `getDisplayValue('sys_created_by')`, message: `Display name needs getDisplayValue('sys_created_by') — getValue returns the sys_id.` },
    ],
  }),
  // 11. GlideDateTime older than 30 days
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_older_30d.js`,
    title: `${t.label} older than 30 days`,
    task: `Query ${t.label} rows created more than 30 days ago using GlideDateTime + addDaysUTC(-30). Log how many matched.`,
    starter: `// ${t.table} older than 30 days\n`,
    solution: `var cutoff = new GlideDateTime();\ncutoff.addDaysUTC(-30);\nvar gr = new GlideRecord('${t.table}');\ngr.addQuery('sys_created_on', '<', cutoff);\ngr.query();\ngs.info('Older: ' + gr.getRowCount());`,
    checks: [
      { needle: `new GlideDateTime()`, message: `Anchor "now" with new GlideDateTime().` },
      { needle: `addDaysUTC(-30)`, message: `Shift 30 days into the past with addDaysUTC(-30).` },
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord('${t.table}') for the query.` },
      { needle: `addQuery('sys_created_on', '<', cutoff)`, message: `Use addQuery with the '<' operator against the cutoff GlideDateTime.` },
      { needle: `.query()`, message: `Call .query().` },
      { needle: `getRowCount()`, message: `Log the size with getRowCount().` },
    ],
  }),
  // 12. Business Rule before insert defaulting
  (t) => ({
    id: "", side: "server", scriptType: "Business Rule (before insert)",
    filename: `br_${t.table}_default_${t.field}.js`,
    title: `Default ${t.field} on new ${t.label}`,
    task: `Write a before-insert Business Rule that defaults ${t.field} to '${t.value}' only when the incoming value is empty.`,
    starter: `(function executeRule(current, previous /*null when async*/) {\n  // your code\n})(current, previous);`,
    solution: `(function executeRule(current, previous) {\n  if (current.getValue('${t.field}') == '') {\n    current.setValue('${t.field}', '${t.value}');\n  }\n})(current, previous);`,
    checks: [
      { needle: `function executeRule(current, previous)`, message: `Keep the executeRule(current, previous) wrapper.` },
      { needle: `current.getValue('${t.field}') == ''`, message: `Guard with current.getValue('${t.field}') == '' so you don't overwrite user input.` },
      { needle: `current.setValue('${t.field}', '${t.value}')`, message: `Set the default with current.setValue('${t.field}', '${t.value}').` },
    ],
  }),
  // 13. Business Rule before update abort
  (t) => ({
    id: "", side: "server", scriptType: "Business Rule (before update)",
    filename: `br_${t.table}_abort_${t.field}.js`,
    title: `Reject ${t.field} changes on ${t.label}`,
    task: `Write a before-update Business Rule that aborts the save (current.setAbortAction(true)) and adds an error whenever ${t.field} was changed.`,
    starter: `(function executeRule(current, previous) {\n  // your code\n})(current, previous);`,
    solution: `(function executeRule(current, previous) {\n  if (current.${t.field}.changes()) {\n    gs.addErrorMessage('${t.field} cannot be changed');\n    current.setAbortAction(true);\n  }\n})(current, previous);`,
    checks: [
      { needle: `current.${t.field}.changes()`, message: `Detect the edit with current.${t.field}.changes().` },
      { needle: `gs.addErrorMessage(`, message: `Surface an error with gs.addErrorMessage(...).` },
      { needle: `current.setAbortAction(true)`, message: `Cancel the save with current.setAbortAction(true).` },
    ],
  }),
  // 14. Scheduled Job (Script) — daily housekeeping
  (t) => ({
    id: "", side: "server", scriptType: "Scheduled Script Execution",
    filename: `sched_${t.table}_housekeep.js`,
    title: `Nightly housekeeping for ${t.label}`,
    task: `Write a Scheduled Job body that deletes ${t.label} rows older than 365 days (sys_created_on).`,
    starter: `// Runs nightly\n`,
    solution: `var cutoff = new GlideDateTime();\ncutoff.addDaysUTC(-365);\nvar gr = new GlideRecord('${t.table}');\ngr.addQuery('sys_created_on', '<', cutoff);\ngr.deleteMultiple();`,
    checks: [
      { needle: `new GlideDateTime()`, message: `Anchor now with new GlideDateTime().` },
      { needle: `addDaysUTC(-365)`, message: `Roll back a year with addDaysUTC(-365).` },
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord('${t.table}').` },
      { needle: `addQuery('sys_created_on', '<', cutoff)`, message: `Filter with addQuery('sys_created_on', '<', cutoff).` },
      { needle: `deleteMultiple()`, message: `Bulk-delete with deleteMultiple().` },
    ],
  }),
  // 15. GlideAggregate GROUP BY
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_group_${t.field}.js`,
    title: `Group ${t.label} by ${t.field}`,
    task: `Use GlideAggregate to count ${t.label} rows grouped by ${t.field}. Log each group's value and count.`,
    starter: `// Group ${t.table} by ${t.field}\n`,
    solution: `var ga = new GlideAggregate('${t.table}');\nga.addAggregate('COUNT');\nga.groupBy('${t.field}');\nga.query();\nwhile (ga.next()) {\n  gs.info(ga.getValue('${t.field}') + ': ' + ga.getAggregate('COUNT'));\n}`,
    checks: [
      { needle: `new GlideAggregate('${t.table}')`, message: `GlideAggregate('${t.table}') is the right API for grouping.` },
      { needle: `addAggregate('COUNT')`, message: `Add addAggregate('COUNT').` },
      { needle: `groupBy('${t.field}')`, message: `Group by ${t.field} with groupBy('${t.field}').` },
      { needle: `.query()`, message: `Execute with .query().` },
      { needle: `while (ga.next())`, message: `Loop the groups with while (ga.next()).` },
      { needle: `getAggregate('COUNT')`, message: `Read each group's count with getAggregate('COUNT').` },
    ],
  }),
  // 16. GlideRecordSecure
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_secure_list.js`,
    title: `Secure list of ${t.label}`,
    task: `Use GlideRecordSecure to list ${t.label} respecting ACLs. Log the record number of the first 20.`,
    starter: `// Respect ACLs\n`,
    solution: `var gr = new GlideRecordSecure('${t.table}');\ngr.setLimit(20);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.getValue('number'));\n}`,
    checks: [
      { needle: `new GlideRecordSecure('${t.table}')`, message: `Use GlideRecordSecure — GlideRecord bypasses read ACLs.` },
      { needle: `setLimit(20)`, message: `Cap output with setLimit(20).` },
      { needle: `.query()`, message: `Run the query with .query().` },
      { needle: `while (gr.next())`, message: `Iterate with while (gr.next()).` },
      { needle: `getValue('number')`, message: `Read the number with getValue('number').` },
    ],
  }),
  // 17. gs.eventQueue
  (t) => ({
    id: "", side: "server", scriptType: "Business Rule (after insert)",
    filename: `br_${t.table}_event.js`,
    title: `Fire custom event on new ${t.label}`,
    task: `In an after-insert Business Rule, fire the event '${t.table}.created' via gs.eventQueue with current as the record and current.getValue('${t.field}') as parm1.`,
    starter: `(function executeRule(current, previous) {\n  // your code\n})(current, previous);`,
    solution: `(function executeRule(current, previous) {\n  gs.eventQueue('${t.table}.created', current, current.getValue('${t.field}'), '');\n})(current, previous);`,
    checks: [
      { needle: `gs.eventQueue('${t.table}.created', current`, message: `Fire the event with gs.eventQueue('${t.table}.created', current, ...).` },
      { needle: `current.getValue('${t.field}')`, message: `Pass current.getValue('${t.field}') as parm1.` },
    ],
  }),
  // 18. Script Include (client-callable) skeleton
  (t) => ({
    id: "", side: "server", scriptType: "Script Include (client-callable)",
    filename: `si_${t.table}_util.js`,
    title: `Script Include lookup for ${t.label}`,
    task: `Create a client-callable Script Include named ${t.label.replace(/\s+/g, "")}Util extending AbstractAjaxProcessor with a method get${t.label.replace(/\s+/g, "")}Count that queries the ${t.table} table and returns getRowCount as a string.`,
    starter: `var ${t.label.replace(/\s+/g, "")}Util = Class.create();\n${t.label.replace(/\s+/g, "")}Util.prototype = Object.extendsObject(AbstractAjaxProcessor, {\n  // your code\n  type: '${t.label.replace(/\s+/g, "")}Util'\n});`,
    solution: `var ${t.label.replace(/\s+/g, "")}Util = Class.create();\n${t.label.replace(/\s+/g, "")}Util.prototype = Object.extendsObject(AbstractAjaxProcessor, {\n  get${t.label.replace(/\s+/g, "")}Count: function() {\n    var gr = new GlideRecord('${t.table}');\n    gr.query();\n    return '' + gr.getRowCount();\n  },\n  type: '${t.label.replace(/\s+/g, "")}Util'\n});`,
    checks: [
      { needle: `Object.extendsObject(AbstractAjaxProcessor`, message: `Extend AbstractAjaxProcessor so the Script Include is client-callable.` },
      { needle: `get${t.label.replace(/\s+/g, "")}Count: function()`, message: `Define the method get${t.label.replace(/\s+/g, "")}Count as a function.` },
      { needle: `new GlideRecord('${t.table}')`, message: `Inside, query GlideRecord('${t.table}').` },
      { needle: `gr.query()`, message: `Execute the query with gr.query().` },
      { needle: `return '' + gr.getRowCount()`, message: `Return the count as a string with return '' + gr.getRowCount().` },
    ],
  }),
  // 19. try/catch with GlideRecord
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_try_catch.js`,
    title: `Safe update on ${t.label} with try/catch`,
    task: `Update ${t.label} where number == 'REC0001001' setting ${t.field} to '${t.value}'. Wrap the update in try/catch and log the error with gs.error on failure.`,
    starter: `// Safe update ${t.table}\n`,
    solution: `try {\n  var gr = new GlideRecord('${t.table}');\n  if (gr.get('number', 'REC0001001')) {\n    gr.setValue('${t.field}', '${t.value}');\n    gr.update();\n  }\n} catch (e) {\n  gs.error(e.message);\n}`,
    checks: [
      { needle: `try {`, message: `Wrap the update in a try { ... } block.` },
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord('${t.table}') inside the try.` },
      { needle: `gr.get('number', 'REC0001001')`, message: `Look up the record with gr.get('number', 'REC0001001').` },
      { needle: `setValue('${t.field}', '${t.value}')`, message: `Stage the new value with setValue('${t.field}', '${t.value}').` },
      { needle: `gr.update()`, message: `Persist with gr.update().` },
      { needle: `catch (e)`, message: `Handle failures with catch (e).` },
      { needle: `gs.error(e.message)`, message: `Log the error using gs.error(e.message).` },
    ],
  }),
  // 20. GlideDateTime diff (age of record)
  (t) => ({
    id: "", side: "server", scriptType: "Background Script",
    filename: `bg_${t.table}_age.js`,
    title: `Age of newest ${t.label} in days`,
    task: `Read the sys_created_on of the newest ${t.label} record and log its age in days using GlideDateTime.subtract().getDayPart().`,
    starter: `// Age in days\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.orderByDesc('sys_created_on');\ngr.setLimit(1);\ngr.query();\nif (gr.next()) {\n  var created = new GlideDateTime(gr.getValue('sys_created_on'));\n  var now = new GlideDateTime();\n  var diff = GlideDateTime.subtract(created, now);\n  gs.info('Age days: ' + diff.getDayPart());\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Start with GlideRecord('${t.table}').` },
      { needle: `orderByDesc('sys_created_on')`, message: `Get the newest with orderByDesc('sys_created_on').` },
      { needle: `setLimit(1)`, message: `You only need one row — setLimit(1).` },
      { needle: `new GlideDateTime(gr.getValue('sys_created_on'))`, message: `Wrap the created time in a GlideDateTime.` },
      { needle: `GlideDateTime.subtract(created, now)`, message: `Compute the delta with GlideDateTime.subtract(created, now).` },
      { needle: `getDayPart()`, message: `Grab the whole-day portion with getDayPart().` },
    ],
  }),
];

// ---------- Client side data ----------------------------------------------

const CLIENT_FIELDS: { field: string; label: string; other: string; otherLabel: string; value: string }[] = [
  { field: "caller_id", label: "Caller", other: "assignment_group", otherLabel: "Assignment Group", value: "abel.tuter" },
  { field: "assignment_group", label: "Assignment Group", other: "assigned_to", otherLabel: "Assigned To", value: "Network" },
  { field: "category", label: "Category", other: "subcategory", otherLabel: "Subcategory", value: "network" },
  { field: "subcategory", label: "Subcategory", other: "category", otherLabel: "Category", value: "dns" },
  { field: "priority", label: "Priority", other: "urgency", otherLabel: "Urgency", value: "1" },
  { field: "state", label: "State", other: "close_notes", otherLabel: "Close Notes", value: "6" },
  { field: "impact", label: "Impact", other: "priority", otherLabel: "Priority", value: "1" },
  { field: "urgency", label: "Urgency", other: "priority", otherLabel: "Priority", value: "1" },
  { field: "short_description", label: "Short Description", other: "description", otherLabel: "Description", value: "Outage" },
  { field: "description", label: "Description", other: "short_description", otherLabel: "Short Description", value: "Detailed" },
  { field: "cmdb_ci", label: "Configuration Item", other: "assignment_group", otherLabel: "Assignment Group", value: "SAP-SD-01" },
  { field: "u_country", label: "Country", other: "u_department", otherLabel: "Department", value: "US" },
  { field: "u_department", label: "Department", other: "u_project", otherLabel: "Project", value: "Finance" },
  { field: "u_project", label: "Project", other: "assignment_group", otherLabel: "Assignment Group", value: "Atlas" },
  { field: "opened_by", label: "Opened By", other: "caller_id", otherLabel: "Caller", value: "admin" },
  { field: "assigned_to", label: "Assigned To", other: "assignment_group", otherLabel: "Assignment Group", value: "fred.luddy" },
  { field: "comments", label: "Additional Comments", other: "work_notes", otherLabel: "Work Notes", value: "Please review" },
  { field: "work_notes", label: "Work Notes", other: "comments", otherLabel: "Comments", value: "Investigating" },
  { field: "close_notes", label: "Close Notes", other: "state", otherLabel: "State", value: "Resolved" },
  { field: "resolution_code", label: "Resolution Code", other: "close_notes", otherLabel: "Close Notes", value: "Solved" },
  { field: "contact_type", label: "Contact Type", other: "caller_id", otherLabel: "Caller", value: "phone" },
  { field: "location", label: "Location", other: "u_country", otherLabel: "Country", value: "HQ" },
  { field: "business_service", label: "Business Service", other: "cmdb_ci", otherLabel: "Configuration Item", value: "Email" },
  { field: "u_manager", label: "Manager", other: "assigned_to", otherLabel: "Assigned To", value: "beth.anglin" },
  { field: "u_cost_center", label: "Cost Center", other: "u_department", otherLabel: "Department", value: "CC-100" },
  { field: "u_vendor", label: "Vendor", other: "cmdb_ci", otherLabel: "Configuration Item", value: "Cisco" },
  { field: "u_environment", label: "Environment", other: "cmdb_ci", otherLabel: "Configuration Item", value: "prod" },
  { field: "u_risk", label: "Risk", other: "priority", otherLabel: "Priority", value: "high" },
  { field: "u_impact_users", label: "Impacted Users", other: "impact", otherLabel: "Impact", value: "500" },
  { field: "u_change_type", label: "Change Type", other: "risk", otherLabel: "Risk", value: "emergency" },
  { field: "u_reason", label: "Reason", other: "close_notes", otherLabel: "Close Notes", value: "expired" },
  { field: "u_hardware_asset", label: "Hardware Asset", other: "cmdb_ci", otherLabel: "Configuration Item", value: "LAP0001" },
  { field: "u_software_asset", label: "Software License", other: "cmdb_ci", otherLabel: "Configuration Item", value: "OFFICE-365" },
  { field: "u_approver", label: "Approver", other: "assignment_group", otherLabel: "Assignment Group", value: "fred.luddy" },
  { field: "u_start_date", label: "Start Date", other: "u_end_date", otherLabel: "End Date", value: "2024-01-01" },
  { field: "u_end_date", label: "End Date", other: "u_start_date", otherLabel: "Start Date", value: "2024-12-31" },
  { field: "u_ci_type", label: "CI Type", other: "cmdb_ci", otherLabel: "Configuration Item", value: "server" },
  { field: "u_service_offering", label: "Service Offering", other: "business_service", otherLabel: "Business Service", value: "Gold" },
  { field: "u_customer", label: "Customer", other: "account", otherLabel: "Account", value: "Acme" },
  { field: "u_channel", label: "Channel", other: "contact_type", otherLabel: "Contact Type", value: "chat" },
];

type ClientTemplate = (f: (typeof CLIENT_FIELDS)[number]) => LiveCodingQuestion;

const clientTemplates: ClientTemplate[] = [
  // 1. onChange setMandatory
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_mandatory.js`,
    title: `Make ${f.otherLabel} mandatory when ${f.label} is set`,
    task: `Write an onChange Client Script. When ${f.label} (${f.field}) has a non-empty value, mark ${f.otherLabel} (${f.other}) as mandatory. When it clears, drop the mandatory flag. Skip when isLoading or newValue is empty.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    g_form.setMandatory('${f.other}', false);\n    return;\n  }\n  g_form.setMandatory('${f.other}', true);\n}`,
    checks: [
      { needle: `if (isLoading || newValue === '')`, message: `Guard clause missing: exit early when isLoading or newValue === ''.` },
      { needle: `g_form.setMandatory('${f.other}', false)`, message: `When clearing, call g_form.setMandatory('${f.other}', false).` },
      { needle: `g_form.setMandatory('${f.other}', true)`, message: `When populated, call g_form.setMandatory('${f.other}', true).` },
    ],
  }),
  // 2. onLoad setReadOnly
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onLoad)",
    filename: `cs_${f.field}_readonly.js`,
    title: `Lock ${f.label} for non-admins`,
    task: `Write an onLoad Client Script that sets ${f.label} (${f.field}) to read-only unless the current user has the 'admin' role.`,
    starter: `function onLoad() {\n  // your code here\n}`,
    solution: `function onLoad() {\n  if (!g_user.hasRole('admin')) {\n    g_form.setReadOnly('${f.field}', true);\n  }\n}`,
    checks: [
      { needle: `g_user.hasRole('admin')`, message: `Use g_user.hasRole('admin') to detect an admin.` },
      { needle: `g_form.setReadOnly('${f.field}', true)`, message: `Lock the field with g_form.setReadOnly('${f.field}', true).` },
    ],
  }),
  // 3. onSubmit block
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onSubmit)",
    filename: `cs_${f.field}_required.js`,
    title: `Block submit when ${f.label} is empty`,
    task: `Write an onSubmit Client Script that cancels submission and shows an error message on ${f.label} (${f.field}) whenever the field is blank.`,
    starter: `function onSubmit() {\n  // your code here\n}`,
    solution: `function onSubmit() {\n  if (g_form.getValue('${f.field}') === '') {\n    g_form.showFieldMsg('${f.field}', '${f.label} is required', 'error');\n    return false;\n  }\n  return true;\n}`,
    checks: [
      { needle: `g_form.getValue('${f.field}')`, message: `Read the current value with g_form.getValue('${f.field}').` },
      { needle: `showFieldMsg('${f.field}'`, message: `Surface the error on the field itself using g_form.showFieldMsg('${f.field}', ...).` },
      { needle: `return false`, message: `You must return false from onSubmit to cancel the save.` },
    ],
  }),
  // 4. onChange setDisplay
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_toggle_${f.other}.js`,
    title: `Show ${f.otherLabel} only when ${f.label} == '${f.value}'`,
    task: `Write an onChange Client Script. Show ${f.otherLabel} (${f.other}) only when ${f.label} (${f.field}) equals '${f.value}', otherwise hide it. Ignore the initial load.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) {\n    return;\n  }\n  g_form.setDisplay('${f.other}', newValue === '${f.value}');\n}`,
    checks: [
      { needle: `if (isLoading)`, message: `Always guard against isLoading first so the script doesn't fire on page load.` },
      { needle: `g_form.setDisplay('${f.other}', newValue === '${f.value}')`, message: `Use g_form.setDisplay('${f.other}', newValue === '${f.value}') to toggle visibility.` },
    ],
  }),
  // 5. GlideAjax
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_ajax.js`,
    title: `GlideAjax lookup driven by ${f.label}`,
    task: `Write an onChange Client Script that calls Script Include 'MyAjaxUtil' method 'lookupFor${f.label.replace(/\s+/g, "")}' with the new value as 'sysparm_value' and sets ${f.otherLabel} (${f.other}) to the response.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    return;\n  }\n  var ga = new GlideAjax('MyAjaxUtil');\n  ga.addParam('sysparm_name', 'lookupFor${f.label.replace(/\s+/g, "")}');\n  ga.addParam('sysparm_value', newValue);\n  ga.getXMLAnswer(function (answer) {\n    g_form.setValue('${f.other}', answer);\n  });\n}`,
    checks: [
      { needle: `if (isLoading || newValue === '')`, message: `Guard against isLoading and empty newValue before firing the AJAX call.` },
      { needle: `new GlideAjax('MyAjaxUtil')`, message: `Instantiate GlideAjax with the Script Include name 'MyAjaxUtil'.` },
      { needle: `addParam('sysparm_name', 'lookupFor${f.label.replace(/\s+/g, "")}')`, message: `Pass sysparm_name = 'lookupFor${f.label.replace(/\s+/g, "")}' so the right method runs.` },
      { needle: `addParam('sysparm_value', newValue)`, message: `Forward the user's value with addParam('sysparm_value', newValue).` },
      { needle: `getXMLAnswer(function`, message: `Use getXMLAnswer(callback) — getXML() is deprecated for simple answers.` },
      { needle: `g_form.setValue('${f.other}', answer)`, message: `Inside the callback, write the answer back with g_form.setValue('${f.other}', answer).` },
    ],
  }),
  // 6. addInfoMessage
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_info.js`,
    title: `Announce ${f.label} changes`,
    task: `Write an onChange Client Script that shows an info message 'The ${f.label.toLowerCase()} changed to <newValue>' whenever the value actually changes. Skip the initial page load.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || oldValue === newValue) {\n    return;\n  }\n  g_form.addInfoMessage('The ${f.label.toLowerCase()} changed to ' + newValue);\n}`,
    checks: [
      { needle: `if (isLoading || oldValue === newValue)`, message: `Skip when isLoading OR when the value didn't actually change (oldValue === newValue).` },
      { needle: `g_form.addInfoMessage('The ${f.label.toLowerCase()} changed to '`, message: `The exact message must start with 'The ${f.label.toLowerCase()} changed to '.` },
      { needle: `+ newValue`, message: `Append the new value to the info message.` },
    ],
  }),
  // 7. clearValue
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_clear_${f.other}.js`,
    title: `Clear ${f.otherLabel} when ${f.label} changes away from '${f.value}'`,
    task: `Write an onChange Client Script that clears ${f.otherLabel} (${f.other}) whenever ${f.label} (${f.field}) is anything other than '${f.value}'.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) {\n    return;\n  }\n  if (newValue !== '${f.value}') {\n    g_form.clearValue('${f.other}');\n  }\n}`,
    checks: [
      { needle: `if (isLoading)`, message: `Bail out on isLoading first.` },
      { needle: `newValue !== '${f.value}'`, message: `Test newValue !== '${f.value}' so you only clear on the wrong value.` },
      { needle: `g_form.clearValue('${f.other}')`, message: `Use g_form.clearValue('${f.other}') — setValue('') is not the recommended API.` },
    ],
  }),
  // 8. setValue when other blank
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_default_${f.other}.js`,
    title: `Copy ${f.label} into ${f.otherLabel} when it's blank`,
    task: `Write an onChange Client Script that copies the new value of ${f.label} into ${f.otherLabel} (${f.other}), but only when ${f.otherLabel} is currently empty.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    return;\n  }\n  if (g_form.getValue('${f.other}') === '') {\n    g_form.setValue('${f.other}', newValue);\n  }\n}`,
    checks: [
      { needle: `if (isLoading || newValue === '')`, message: `Guard against isLoading and empty newValue up front.` },
      { needle: `g_form.getValue('${f.other}') === ''`, message: `Check the current value of ${f.other} with g_form.getValue('${f.other}') === ''.` },
      { needle: `g_form.setValue('${f.other}', newValue)`, message: `Fill it with g_form.setValue('${f.other}', newValue).` },
    ],
  }),
  // 9. onLoad setDisplay by role
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onLoad)",
    filename: `cs_${f.field}_hide_load.js`,
    title: `Hide ${f.label} for users without 'itil'`,
    task: `Write an onLoad Client Script that hides ${f.label} (${f.field}) from users who do NOT have the 'itil' role.`,
    starter: `function onLoad() {\n  // your code here\n}`,
    solution: `function onLoad() {\n  if (!g_user.hasRole('itil')) {\n    g_form.setDisplay('${f.field}', false);\n  }\n}`,
    checks: [
      { needle: `g_user.hasRole('itil')`, message: `Detect the role with g_user.hasRole('itil').` },
      { needle: `g_form.setDisplay('${f.field}', false)`, message: `Hide with g_form.setDisplay('${f.field}', false) — setVisible was renamed to setDisplay in modern releases.` },
    ],
  }),
  // 10. showFieldMsg warning
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_warn.js`,
    title: `Warn on ${f.label} = '${f.value}'`,
    task: `Write an onChange Client Script that shows a warning message on ${f.label} (${f.field}) saying 'Double-check this value' whenever the field is set to '${f.value}'.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) {\n    return;\n  }\n  g_form.hideFieldMsg('${f.field}', true);\n  if (newValue === '${f.value}') {\n    g_form.showFieldMsg('${f.field}', 'Double-check this value', 'warning');\n  }\n}`,
    checks: [
      { needle: `if (isLoading)`, message: `Bail on isLoading first.` },
      { needle: `g_form.hideFieldMsg('${f.field}', true)`, message: `Clear stale messages with g_form.hideFieldMsg('${f.field}', true) before deciding.` },
      { needle: `newValue === '${f.value}'`, message: `Only warn when newValue === '${f.value}'.` },
      { needle: `showFieldMsg('${f.field}', 'Double-check this value', 'warning')`, message: `Use showFieldMsg('${f.field}', 'Double-check this value', 'warning') exactly.` },
    ],
  }),
  // 11. Catalog Client Script — setValue on variable
  (f) => ({
    id: "", side: "client", scriptType: "Catalog Client Script (onChange)",
    filename: `ccs_${f.field}_var.js`,
    title: `Catalog: copy ${f.label} into ${f.otherLabel}`,
    task: `Write a Catalog onChange Client Script that copies newValue from variable '${f.field}' into variable '${f.other}' whenever it changes. Skip isLoading and empty values.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    return;\n  }\n  g_form.setValue('${f.other}', newValue);\n}`,
    checks: [
      { needle: `if (isLoading || newValue === '')`, message: `Guard against isLoading and empty newValue for catalog scripts too.` },
      { needle: `g_form.setValue('${f.other}', newValue)`, message: `Push into '${f.other}' with g_form.setValue('${f.other}', newValue).` },
    ],
  }),
  // 12. addOption / removeOption
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onLoad)",
    filename: `cs_${f.field}_choices.js`,
    title: `Restrict ${f.label} choices on load`,
    task: `Write an onLoad Client Script that removes the choice '${f.value}' from ${f.label} (${f.field}) and then adds a choice labelled 'Preferred' with value '${f.value}_pref'.`,
    starter: `function onLoad() {\n  // your code here\n}`,
    solution: `function onLoad() {\n  g_form.removeOption('${f.field}', '${f.value}');\n  g_form.addOption('${f.field}', '${f.value}_pref', 'Preferred');\n}`,
    checks: [
      { needle: `g_form.removeOption('${f.field}', '${f.value}')`, message: `Drop the unwanted choice with g_form.removeOption('${f.field}', '${f.value}').` },
      { needle: `g_form.addOption('${f.field}', '${f.value}_pref', 'Preferred')`, message: `Add the new choice with g_form.addOption('${f.field}', '${f.value}_pref', 'Preferred').` },
    ],
  }),
  // 13. GlideRecord (deprecated in browser) via GlideAjax — enforce no client GR
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_no_client_gr.js`,
    title: `Fetch reference detail for ${f.label} via GlideAjax`,
    task: `The candidate must AVOID client-side GlideRecord. Write an onChange that calls Script Include 'RefDetail' method 'get' with sysparm_field='${f.field}' and sysparm_value=newValue, then addInfoMessage the response.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here — do NOT use GlideRecord in the browser\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    return;\n  }\n  var ga = new GlideAjax('RefDetail');\n  ga.addParam('sysparm_name', 'get');\n  ga.addParam('sysparm_field', '${f.field}');\n  ga.addParam('sysparm_value', newValue);\n  ga.getXMLAnswer(function (answer) {\n    g_form.addInfoMessage(answer);\n  });\n}`,
    checks: [
      { needle: `new GlideAjax('RefDetail')`, message: `Use GlideAjax('RefDetail') — client-side GlideRecord is discouraged.` },
      { needle: `addParam('sysparm_name', 'get')`, message: `Pass sysparm_name = 'get'.` },
      { needle: `addParam('sysparm_field', '${f.field}')`, message: `Forward sysparm_field = '${f.field}'.` },
      { needle: `addParam('sysparm_value', newValue)`, message: `Forward sysparm_value = newValue.` },
      { needle: `getXMLAnswer(function`, message: `Use getXMLAnswer(callback).` },
      { needle: `g_form.addInfoMessage(answer)`, message: `Surface the answer with g_form.addInfoMessage(answer).` },
    ],
  }),
  // 14. onCellEdit (list edit)
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onCellEdit)",
    filename: `cs_${f.field}_cell_edit.js`,
    title: `Block list-edit of ${f.label} to '${f.value}'`,
    task: `Write an onCellEdit Client Script that cancels the list edit whenever the new value equals '${f.value}'. Show an info message and callback(false).`,
    starter: `function onCellEdit(sysIDs, table, oldValues, newValue, callback) {\n  var saveAndClose = true;\n  // your code\n  callback(saveAndClose);\n}`,
    solution: `function onCellEdit(sysIDs, table, oldValues, newValue, callback) {\n  var saveAndClose = true;\n  if (newValue === '${f.value}') {\n    g_form.addInfoMessage('Cannot set ${f.label} to ${f.value} from the list');\n    saveAndClose = false;\n  }\n  callback(saveAndClose);\n}`,
    checks: [
      { needle: `if (newValue === '${f.value}')`, message: `Detect the disallowed value with if (newValue === '${f.value}').` },
      { needle: `g_form.addInfoMessage('Cannot set ${f.label} to ${f.value} from the list')`, message: `Explain the block with g_form.addInfoMessage('Cannot set ${f.label} to ${f.value} from the list').` },
      { needle: `saveAndClose = false`, message: `Flip saveAndClose = false so the callback rejects the edit.` },
      { needle: `callback(saveAndClose)`, message: `Always finish onCellEdit with callback(saveAndClose).` },
    ],
  }),
  // 15. UI Policy Script (onCondition true)
  (f) => ({
    id: "", side: "client", scriptType: "UI Policy Script (Execute if true)",
    filename: `ui_${f.field}_true.js`,
    title: `UI Policy true: mandatory ${f.otherLabel}`,
    task: `In the "Execute if true" UI Policy script, mark ${f.otherLabel} (${f.other}) as mandatory and visible.`,
    starter: `function onCondition() {\n  // your code\n}`,
    solution: `function onCondition() {\n  g_form.setMandatory('${f.other}', true);\n  g_form.setDisplay('${f.other}', true);\n}`,
    checks: [
      { needle: `function onCondition()`, message: `Keep the function onCondition() wrapper — that's the UI Policy hook.` },
      { needle: `g_form.setMandatory('${f.other}', true)`, message: `Force required with g_form.setMandatory('${f.other}', true).` },
      { needle: `g_form.setDisplay('${f.other}', true)`, message: `Reveal the field with g_form.setDisplay('${f.other}', true).` },
    ],
  }),
  // 16. onSubmit confirm dialog
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onSubmit)",
    filename: `cs_${f.field}_confirm.js`,
    title: `Confirm submit when ${f.label} == '${f.value}'`,
    task: `Write an onSubmit Client Script that shows a confirm() dialog 'Really submit with ${f.label} = ${f.value}?' when ${f.field} equals '${f.value}'. Cancel the save on decline.`,
    starter: `function onSubmit() {\n  // your code\n}`,
    solution: `function onSubmit() {\n  if (g_form.getValue('${f.field}') === '${f.value}') {\n    var ok = confirm('Really submit with ${f.label} = ${f.value}?');\n    if (!ok) {\n      return false;\n    }\n  }\n  return true;\n}`,
    checks: [
      { needle: `g_form.getValue('${f.field}') === '${f.value}'`, message: `Guard with g_form.getValue('${f.field}') === '${f.value}'.` },
      { needle: `confirm('Really submit with ${f.label} = ${f.value}?')`, message: `Use confirm('Really submit with ${f.label} = ${f.value}?').` },
      { needle: `return false`, message: `Return false to cancel when the user declines.` },
    ],
  }),
  // 17. addDecoration + removeDecoration
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_decorate.js`,
    title: `Add a warning icon to ${f.label} when '${f.value}'`,
    task: `Write an onChange Client Script that adds a decoration icon-warning to ${f.field} when newValue == '${f.value}', otherwise removes it.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) {\n    return;\n  }\n  g_form.removeDecoration('${f.field}', 'icon-warning', 'Warning');\n  if (newValue === '${f.value}') {\n    g_form.addDecoration('${f.field}', 'icon-warning', 'Warning');\n  }\n}`,
    checks: [
      { needle: `if (isLoading)`, message: `Skip decorations on the initial load — guard on isLoading first.` },
      { needle: `g_form.removeDecoration('${f.field}', 'icon-warning', 'Warning')`, message: `Clear stale decorations with g_form.removeDecoration(...).` },
      { needle: `newValue === '${f.value}'`, message: `Only decorate when newValue === '${f.value}'.` },
      { needle: `g_form.addDecoration('${f.field}', 'icon-warning', 'Warning')`, message: `Add the icon with g_form.addDecoration('${f.field}', 'icon-warning', 'Warning').` },
    ],
  }),
  // 18. g_scratchpad read
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onLoad)",
    filename: `cs_${f.field}_scratchpad.js`,
    title: `Use g_scratchpad flag to lock ${f.label}`,
    task: `Write an onLoad Client Script that reads g_scratchpad.lock${f.label.replace(/\s+/g, "")} (a boolean prepared by a Display BR) and sets ${f.field} to read-only when it's true.`,
    starter: `function onLoad() {\n  // your code\n}`,
    solution: `function onLoad() {\n  if (g_scratchpad.lock${f.label.replace(/\s+/g, "")}) {\n    g_form.setReadOnly('${f.field}', true);\n  }\n}`,
    checks: [
      { needle: `g_scratchpad.lock${f.label.replace(/\s+/g, "")}`, message: `Read the display-BR flag with g_scratchpad.lock${f.label.replace(/\s+/g, "")}.` },
      { needle: `g_form.setReadOnly('${f.field}', true)`, message: `Lock with g_form.setReadOnly('${f.field}', true).` },
    ],
  }),
  // 19. flashField
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_flash.js`,
    title: `Flash ${f.label} yellow on '${f.value}'`,
    task: `Write an onChange Client Script that flashes ${f.field} with color '#ffff00' for 2 seconds whenever the new value is '${f.value}'.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading) {\n    return;\n  }\n  if (newValue === '${f.value}') {\n    g_form.flash('${f.field}', '#ffff00', 2);\n  }\n}`,
    checks: [
      { needle: `if (isLoading)`, message: `Skip on isLoading.` },
      { needle: `newValue === '${f.value}'`, message: `Only flash when newValue === '${f.value}'.` },
      { needle: `g_form.flash('${f.field}', '#ffff00', 2)`, message: `Use g_form.flash('${f.field}', '#ffff00', 2) — three args (field, color, seconds).` },
    ],
  }),
  // 20. Length validation client-side
  (f) => ({
    id: "", side: "client", scriptType: "Client Script (onSubmit)",
    filename: `cs_${f.field}_length.js`,
    title: `Reject long ${f.label}`,
    task: `Write an onSubmit Client Script that blocks the save when ${f.field} is longer than 40 characters. Show an error field message and return false.`,
    starter: `function onSubmit() {\n  // your code\n}`,
    solution: `function onSubmit() {\n  var val = g_form.getValue('${f.field}');\n  if (val && val.length > 40) {\n    g_form.showFieldMsg('${f.field}', '${f.label} must be 40 characters or fewer', 'error');\n    return false;\n  }\n  return true;\n}`,
    checks: [
      { needle: `var val = g_form.getValue('${f.field}')`, message: `Cache the value with var val = g_form.getValue('${f.field}').` },
      { needle: `val.length > 40`, message: `Detect the overflow with val.length > 40.` },
      { needle: `showFieldMsg('${f.field}', '${f.label} must be 40 characters or fewer', 'error')`, message: `Point at the field with showFieldMsg(..., 'error') using the exact copy.` },
      { needle: `return false`, message: `Return false to cancel the save.` },
    ],
  }),
];

// ---------- Build the 2000-question bank ----------------------------------

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function buildAll(): LiveCodingQuestion[] {
  const out: LiveCodingQuestion[] = [];
  serverTemplates.forEach((tpl, tIdx) => {
    SERVER_TABLES.forEach((t, i) => {
      const q = tpl(t, i);
      q.id = `srv-${tIdx + 1}-${t.table}`;
      q.checks = q.checks.map((c) => ({ ...c, needle: normalize(c.needle) }));
      out.push(q);
    });
  });
  clientTemplates.forEach((tpl, tIdx) => {
    CLIENT_FIELDS.forEach((f) => {
      const q = tpl(f);
      q.id = `cli-${tIdx + 1}-${f.field}`;
      q.checks = q.checks.map((c) => ({ ...c, needle: normalize(c.needle) }));
      out.push(q);
    });
  });
  return out;
}

export const LIVE_CODING_QUESTIONS: LiveCodingQuestion[] = buildAll();

export const LIVE_CODING_TOTAL = LIVE_CODING_QUESTIONS.length; // 2000

export interface ValidationResult {
  ok: boolean;
  /** Zero-based line in the candidate's code where the coach should point. */
  errorLine?: number;
  /** Line in the canonical solution where the missing pattern lives. */
  solutionLine?: number;
  message?: string;
  /** The failing needle (for debug / display). */
  needle?: string;
  passedCount: number;
  totalChecks: number;
}

/** Ordered check runner — returns the first failing check. */
export function validateSolution(
  q: LiveCodingQuestion,
  userCode: string,
): ValidationResult {
  const normalizedCode = normalize(userCode);
  let passed = 0;
  for (const c of q.checks) {
    if (normalizedCode.includes(c.needle)) {
      passed += 1;
      continue;
    }
    const solutionLines = q.solution.split("\n").map((l) => normalize(l));
    let solutionLine: number | undefined;
    for (let i = 0; i < solutionLines.length; i += 1) {
      if (solutionLines[i].includes(c.needle)) {
        solutionLine = i;
        break;
      }
    }
    const userLines = userCode.split("\n");
    let errorLine = Math.min(userLines.length - 1, solutionLine ?? userLines.length - 1);
    const keyword = c.needle.split(/[^A-Za-z_]/).find((w) => w.length > 3);
    if (keyword) {
      const hit = userLines.findIndex((l) => l.includes(keyword));
      if (hit >= 0) errorLine = hit;
    }
    return {
      ok: false,
      errorLine,
      solutionLine,
      message: c.message,
      needle: c.needle,
      passedCount: passed,
      totalChecks: q.checks.length,
    };
  }
  return { ok: true, passedCount: passed, totalChecks: q.checks.length };
}
