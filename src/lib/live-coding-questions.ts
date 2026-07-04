// Live Coding Simulator question bank.
// 500 ServiceNow scripting tasks (server + client). Each question ships with a
// canonical solution and a set of ordered "checks" the validator uses to
// pinpoint the first mistake — the same way an interviewer would point at the
// specific line that's wrong.

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

// ---------- Server side templates -----------------------------------------

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
];

type ServerTemplate = (t: (typeof SERVER_TABLES)[number], idx: number) => LiveCodingQuestion;

const serverTemplates: ServerTemplate[] = [
  // 1. Query all active records and log their number
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
  // 2. Query one record by number and update state to closed
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
  // 3. Count records by category/field
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
  // 4. Delete inactive records safely
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
  // 5. Insert a new record
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
    id: "",
    side: "server",
    scriptType: "Background Script",
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
  // 7. addQuery + addOrCondition
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
    filename: `bg_${t.table}_or_query.js`,
    title: `${t.label} where ${t.field} is A OR B`,
    task: `Query ${t.label} where ${t.field} == '${t.value}' OR ${t.field} == 'other'. Log how many rows the query returned via getRowCount().`,
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
    id: "",
    side: "server",
    scriptType: "Background Script",
    filename: `bg_${t.table}_encoded.js`,
    title: `${t.label} via encoded query`,
    task: `Use addEncodedQuery to fetch ${t.label} where active=true^${t.field}=${t.value}. Log the sys_id of each row.`,
    starter: `// Encoded query on ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.addEncodedQuery('active=true^${t.field}=${t.value}');\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.sys_id.toString());\n}`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `Start with GlideRecord('${t.table}').` },
      { needle: `addEncodedQuery('active=true^${t.field}=${t.value}')`, message: `Use addEncodedQuery with the exact encoded string 'active=true^${t.field}=${t.value}'.` },
      { needle: `.query()`, message: `Call .query() to execute.` },
      { needle: `while (gr.next())`, message: `Loop with while (gr.next()).` },
      { needle: `gs.info(`, message: `Log inside the loop with gs.info(...).` },
    ],
  }),
  // 9. update via setWorkflow(false)
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Fix Script",
    filename: `fix_${t.table}_silent.js`,
    title: `Silent bulk update on ${t.label}`,
    task: `Set ${t.field} to '${t.value}' on every ${t.label} record without triggering business rules or workflows. Use updateMultiple with setWorkflow(false).`,
    starter: `// Silent update ${t.table}\n`,
    solution: `var gr = new GlideRecord('${t.table}');\ngr.setValue('${t.field}', '${t.value}');\ngr.setWorkflow(false);\ngr.updateMultiple();`,
    checks: [
      { needle: `new GlideRecord('${t.table}')`, message: `GlideRecord for '${t.table}' first.` },
      { needle: `setValue('${t.field}', '${t.value}')`, message: `Stage the new value with setValue('${t.field}', '${t.value}').` },
      { needle: `setWorkflow(false)`, message: `Suppress business rules with setWorkflow(false).` },
      { needle: `updateMultiple()`, message: `Apply to every row with updateMultiple().` },
    ],
  }),
  // 10. Log user display name for records where u_owner set
  (t) => ({
    id: "",
    side: "server",
    scriptType: "Background Script",
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
];

// ---------- Client side templates -----------------------------------------

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
];

type ClientTemplate = (f: (typeof CLIENT_FIELDS)[number]) => LiveCodingQuestion;

const clientTemplates: ClientTemplate[] = [
  // 1. onChange: setMandatory on other field when this one is non-empty
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
    filename: `cs_${f.field}_mandatory.js`,
    title: `Make ${f.otherLabel} mandatory when ${f.label} is set`,
    task: `Write an onChange Client Script. When ${f.label} (${f.field}) has a non-empty value, mark ${f.otherLabel} (${f.other}) as mandatory. When it clears, drop the mandatory flag. Skip the run when isLoading or newValue is empty.`,
    starter: `function onChange(control, oldValue, newValue, isLoading) {\n  // your code here\n}`,
    solution: `function onChange(control, oldValue, newValue, isLoading) {\n  if (isLoading || newValue === '') {\n    g_form.setMandatory('${f.other}', false);\n    return;\n  }\n  g_form.setMandatory('${f.other}', true);\n}`,
    checks: [
      { needle: `if (isLoading || newValue === '')`, message: `Guard clause missing: exit early when isLoading or newValue === ''.` },
      { needle: `g_form.setMandatory('${f.other}', false)`, message: `When clearing, call g_form.setMandatory('${f.other}', false).` },
      { needle: `g_form.setMandatory('${f.other}', true)`, message: `When populated, call g_form.setMandatory('${f.other}', true).` },
    ],
  }),
  // 2. onLoad: setReadOnly if user has role
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onLoad)",
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
  // 3. onSubmit: block submit if field empty
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onSubmit)",
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
  // 4. onChange: setVisible/hidden based on value
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
  // 5. GlideAjax call
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
  // 6. addInfoMessage on change
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
  // 7. clearValue on other field when != value
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
  // 8. setValue based on other field
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
  // 9. setDisplay on load based on role
  (f) => ({
    id: "",
    side: "client",
    scriptType: "Client Script (onLoad)",
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
    id: "",
    side: "client",
    scriptType: "Client Script (onChange)",
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
];

// ---------- Build the 500-question bank -----------------------------------

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

function buildAll(): LiveCodingQuestion[] {
  const out: LiveCodingQuestion[] = [];
  serverTemplates.forEach((tpl, tIdx) => {
    SERVER_TABLES.forEach((t, i) => {
      const q = tpl(t, i);
      q.id = `srv-${tIdx + 1}-${t.table}`;
      // Normalize check needles so whitespace differences don't matter.
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

export const LIVE_CODING_TOTAL = LIVE_CODING_QUESTIONS.length; // 500

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
    // Locate the needle in the canonical solution to know which line the
    // interviewer should highlight.
    const solutionLines = q.solution.split("\n").map((l) => normalize(l));
    let solutionLine: number | undefined;
    for (let i = 0; i < solutionLines.length; i += 1) {
      if (solutionLines[i].includes(c.needle)) {
        solutionLine = i;
        break;
      }
    }
    // Guess the user's likely error line: the last line they wrote, or the
    // matching function/loop boundary. Fall back to solutionLine.
    const userLines = userCode.split("\n");
    let errorLine = Math.min(userLines.length - 1, solutionLine ?? userLines.length - 1);
    // Prefer a line that already contains a partial keyword from the needle.
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
