// ServiceNow ADMIN live-coding path.
// Ordered stages an admin actually works through on the job: users → groups
// → roles → properties → choices → data hygiene → imports → jobs → audit.
// Each stage is a real template expanded over realistic variants, so every
// task is unique and validated by the same line-mapped checks.
import type { LiveCodingQuestion } from "./live-coding-questions";

export interface AdminStage {
  id: number;
  name: string;
  blurb: string;
}

export const ADMIN_STAGES: AdminStage[] = [
  { id: 1, name: "User administration", blurb: "Find, create and deactivate sys_user records safely." },
  { id: 2, name: "Group membership", blurb: "Manage sys_user_grmember and group managers." },
  { id: 3, name: "Role grants", blurb: "Audit and grant roles via sys_user_has_role." },
  { id: 4, name: "System properties", blurb: "Read and update sys_properties with gs.getProperty." },
  { id: 5, name: "Choice lists", blurb: "Add and retire sys_choice values without breaking forms." },
  { id: 6, name: "Data hygiene", blurb: "Bulk fixes with setWorkflow(false) and autoSysFields(false)." },
  { id: 7, name: "Import & transform", blurb: "Inspect import set rows and transform errors." },
  { id: 8, name: "Scheduled jobs", blurb: "Control sys_trigger and scheduled script executions." },
  { id: 9, name: "Audit & history", blurb: "Query sys_audit for who changed what and when." },
  { id: 10, name: "Instance health", blurb: "Count stuck events, emails and long-running transactions." },
];

type AdminQ = Omit<LiveCodingQuestion, "id"> & { stage: number };

const DEPTS = ["Finance", "HR", "IT", "Sales", "Legal", "Marketing", "Facilities", "Procurement", "Security", "Support", "Engineering", "Operations", "Payroll", "Audit", "Research", "Training", "Logistics", "Compliance", "Service Desk", "Network"];
const GROUPS = DEPTS.map((d) => `${d} Fulfillers`);
const ROLES = ["itil", "catalog_admin", "knowledge_admin", "report_admin", "asset", "approver_user", "itil_admin", "user_admin", "sn_incident_write", "sn_request_write", "change_manager", "problem_manager", "knowledge_manager", "template_editor", "survey_admin", "workspace_user", "cmdb_read", "sam_admin", "hr_basic", "csm_agent"];
const PROPS = ["glide.ui.session_timeout", "glide.email.smtp.active", "glide.ui.list.max_records", "glide.attachment.max_size", "glide.ui.per_page", "glide.sys.date_format", "glide.email.read.active", "glide.ui.timeout", "glide.security.use_csrf_token", "glide.login.no_blank_password", "glide.ui.attachment.drag_and_drop", "glide.knowman.search.instant_results", "glide.ui.related_list_timing", "glide.import_set_row.max_rows", "glide.notification.max_recipients", "glide.ui.autocomplete.limit", "glide.history.max_entries", "glide.cms.catalog.max_items", "glide.ui.list.allow_extended_fields", "glide.servlet.uri"];
const CHOICE_FIELDS: [string, string][] = [["incident", "category"], ["incident", "subcategory"], ["problem", "category"], ["change_request", "category"], ["sc_req_item", "stage"], ["kb_knowledge", "category"], ["sn_customerservice_case", "category"], ["alm_hardware", "substatus"], ["task", "contact_type"], ["cmdb_ci", "category"], ["incident", "close_code"], ["change_request", "close_code"], ["problem", "resolution_code"], ["sc_task", "contact_type"], ["hr_case", "contact_type"], ["cmdb_ci_server", "classification"], ["alm_asset", "install_status"], ["sys_user", "u_employee_type"], ["incident", "u_impact_area"], ["change_task", "change_task_type"]];
const TABLES = ["incident", "problem", "change_request", "sc_req_item", "sc_task", "kb_knowledge", "cmdb_ci", "alm_asset", "sys_user", "sys_user_group", "task", "change_task", "problem_task", "sn_customerservice_case", "hr_case", "cmdb_ci_server", "sysapproval_approver", "sys_attachment", "cmn_location", "core_company"];
const IMPORTS = DEPTS.map((d) => `u_imp_${d.toLowerCase().replace(/\s+/g, "_")}`);
const JOBS = DEPTS.map((d) => `${d} nightly cleanup`);

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const templates: ((i: number) => AdminQ)[] = [
  // Stage 1 — users
  (i) => {
    const d = DEPTS[i];
    return {
      stage: 1, side: "server", scriptType: "Fix Script (admin)",
      filename: `fix_deactivate_${slug(d)}_leavers.js`,
      title: `Deactivate ${d} users who never logged in`,
      task: `Find active sys_user records in the '${d}' department whose last_login_time is empty, set active = false and log how many you changed.`,
      starter: `// Deactivate ${d} users with no last login\n`,
      solution: `var count = 0;\nvar gr = new GlideRecord('sys_user');\ngr.addActiveQuery();\ngr.addQuery('department.name', '${d}');\ngr.addNullQuery('last_login_time');\ngr.query();\nwhile (gr.next()) {\n  gr.setValue('active', false);\n  gr.update();\n  count++;\n}\ngs.info('Deactivated ' + count);`,
      checks: [
        { needle: `new GlideRecord('sys_user')`, message: `Users live on sys_user — start there.` },
        { needle: `addActiveQuery()`, message: `Only touch active users: addActiveQuery().` },
        { needle: `addQuery('department.name', '${d}')`, message: `Dot-walk the department: addQuery('department.name', '${d}').` },
        { needle: `addNullQuery('last_login_time')`, message: `"Never logged in" means addNullQuery('last_login_time').` },
        { needle: `setValue('active', false)`, message: `Deactivate with setValue('active', false) — never delete users.` },
        { needle: `gr.update()`, message: `Persist each change with gr.update().` },
      ],
    };
  },
  // Stage 2 — group membership
  (i) => {
    const g = GROUPS[i];
    return {
      stage: 2, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_add_member_${slug(g)}.js`,
      title: `Add a user to ${g} without duplicates`,
      task: `Add user 'abel.tuter' to the group '${g}' via sys_user_grmember, but only if the membership doesn't already exist.`,
      starter: `// Add abel.tuter to ${g} once\n`,
      solution: `var user = new GlideRecord('sys_user');\nuser.get('user_name', 'abel.tuter');\nvar grp = new GlideRecord('sys_user_group');\ngrp.get('name', '${g}');\nvar m = new GlideRecord('sys_user_grmember');\nm.addQuery('user', user.getUniqueValue());\nm.addQuery('group', grp.getUniqueValue());\nm.query();\nif (!m.hasNext()) {\n  m.initialize();\n  m.setValue('user', user.getUniqueValue());\n  m.setValue('group', grp.getUniqueValue());\n  m.insert();\n}`,
      checks: [
        { needle: `get('user_name', 'abel.tuter')`, message: `Look up the user by user_name.` },
        { needle: `get('name', '${g}')`, message: `Look up the group by name: get('name', '${g}').` },
        { needle: `new GlideRecord('sys_user_grmember')`, message: `Memberships are rows on sys_user_grmember.` },
        { needle: `hasNext()`, message: `Check for an existing membership with hasNext() before inserting.` },
        { needle: `.insert()`, message: `Create the membership with insert().` },
      ],
    };
  },
  // Stage 3 — roles
  (i) => {
    const r = ROLES[i];
    return {
      stage: 3, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_audit_role_${slug(r)}.js`,
      title: `List every user holding the '${r}' role`,
      task: `Query sys_user_has_role for the role '${r}', limited to active users, and log each user's user_name. Finish by logging the total with getRowCount().`,
      starter: `// Audit holders of ${r}\n`,
      solution: `var gr = new GlideRecord('sys_user_has_role');\ngr.addQuery('role.name', '${r}');\ngr.addQuery('user.active', true);\ngr.query();\nwhile (gr.next()) {\n  gs.info(gr.user.user_name);\n}\ngs.info('Total: ' + gr.getRowCount());`,
      checks: [
        { needle: `new GlideRecord('sys_user_has_role')`, message: `Role grants live on sys_user_has_role.` },
        { needle: `addQuery('role.name', '${r}')`, message: `Filter by role name with a dot-walk: role.name.` },
        { needle: `addQuery('user.active', true)`, message: `Ignore inactive users: addQuery('user.active', true).` },
        { needle: `gs.info(gr.user.user_name)`, message: `Log the dot-walked gr.user.user_name.` },
        { needle: `getRowCount()`, message: `Report the total with getRowCount().` },
      ],
    };
  },
  // Stage 4 — properties
  (i) => {
    const p = PROPS[i];
    return {
      stage: 4, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_prop_${slug(p)}.js`,
      title: `Read and update ${p}`,
      task: `Log the current value of the system property '${p}' using gs.getProperty with a default of 'unset', then update it to 'true' with gs.setProperty.`,
      starter: `// Inspect and set ${p}\n`,
      solution: `var current = gs.getProperty('${p}', 'unset');\ngs.info('${p} = ' + current);\ngs.setProperty('${p}', 'true');`,
      checks: [
        { needle: `gs.getProperty('${p}', 'unset')`, message: `Read it with a safe default: gs.getProperty('${p}', 'unset').` },
        { needle: `gs.info(`, message: `Log the current value before changing it.` },
        { needle: `gs.setProperty('${p}', 'true')`, message: `Write it with gs.setProperty('${p}', 'true').` },
      ],
    };
  },
  // Stage 5 — choices
  (i) => {
    const [t, f] = CHOICE_FIELDS[i];
    return {
      stage: 5, side: "server", scriptType: "Fix Script (admin)",
      filename: `fix_retire_choice_${t}_${f}.js`,
      title: `Retire a ${t}.${f} choice safely`,
      task: `Mark the sys_choice value 'legacy' for ${t}.${f} as inactive (don't delete it — existing records still reference it).`,
      starter: `// Retire the 'legacy' choice on ${t}.${f}\n`,
      solution: `var ch = new GlideRecord('sys_choice');\nch.addQuery('name', '${t}');\nch.addQuery('element', '${f}');\nch.addQuery('value', 'legacy');\nch.query();\nwhile (ch.next()) {\n  ch.setValue('inactive', true);\n  ch.update();\n}`,
      checks: [
        { needle: `new GlideRecord('sys_choice')`, message: `Choice values are rows on sys_choice.` },
        { needle: `addQuery('name', '${t}')`, message: `On sys_choice the table is the 'name' column.` },
        { needle: `addQuery('element', '${f}')`, message: `The field is the 'element' column.` },
        { needle: `addQuery('value', 'legacy')`, message: `Target the stored value 'legacy'.` },
        { needle: `setValue('inactive', true)`, message: `Retire it with inactive = true instead of deleting.` },
      ],
    };
  },
  // Stage 6 — data hygiene
  (i) => {
    const t = TABLES[i];
    return {
      stage: 6, side: "server", scriptType: "Fix Script (admin)",
      filename: `fix_quiet_update_${t}.js`,
      title: `Silent bulk fix on ${t}`,
      task: `Set u_migrated = true on every ${t} record where u_migrated is empty, without firing business rules or changing sys_updated_on. Use setWorkflow(false), autoSysFields(false) and updateMultiple().`,
      starter: `// Quiet bulk update on ${t}\n`,
      solution: `var gr = new GlideRecord('${t}');\ngr.addNullQuery('u_migrated');\ngr.setWorkflow(false);\ngr.autoSysFields(false);\ngr.setValue('u_migrated', true);\ngr.updateMultiple();`,
      checks: [
        { needle: `new GlideRecord('${t}')`, message: `Open a GlideRecord on ${t}.` },
        { needle: `addNullQuery('u_migrated')`, message: `Scope it: addNullQuery('u_migrated').` },
        { needle: `setWorkflow(false)`, message: `Skip business rules and notifications with setWorkflow(false).` },
        { needle: `autoSysFields(false)`, message: `Keep sys_updated_on untouched with autoSysFields(false).` },
        { needle: `updateMultiple()`, message: `Apply it in one statement with updateMultiple() — no loop needed.` },
      ],
    };
  },
  // Stage 7 — imports
  (i) => {
    const t = IMPORTS[i];
    return {
      stage: 7, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_import_errors_${t}.js`,
      title: `Report failed rows in ${t}`,
      task: `Count rows in the import set table '${t}' whose sys_import_state is 'error', grouped by sys_import_state_comment, using GlideAggregate.`,
      starter: `// Group import errors on ${t}\n`,
      solution: `var ga = new GlideAggregate('${t}');\nga.addQuery('sys_import_state', 'error');\nga.addAggregate('COUNT');\nga.groupBy('sys_import_state_comment');\nga.query();\nwhile (ga.next()) {\n  gs.info(ga.getValue('sys_import_state_comment') + ': ' + ga.getAggregate('COUNT'));\n}`,
      checks: [
        { needle: `new GlideAggregate('${t}')`, message: `Counting is a GlideAggregate job.` },
        { needle: `addQuery('sys_import_state', 'error')`, message: `Only failed rows: sys_import_state = 'error'.` },
        { needle: `addAggregate('COUNT')`, message: `Ask for addAggregate('COUNT').` },
        { needle: `groupBy('sys_import_state_comment')`, message: `Group by the error comment.` },
        { needle: `getAggregate('COUNT')`, message: `Read each group's total with getAggregate('COUNT').` },
      ],
    };
  },
  // Stage 8 — scheduled jobs
  (i) => {
    const j = JOBS[i];
    return {
      stage: 8, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_run_job_${slug(j)}.js`,
      title: `Run "${j}" on demand`,
      task: `Look up the scheduled script (sysauto_script) named '${j}' and execute it immediately with gs.executeNow().`,
      starter: `// Trigger ${j} now\n`,
      solution: `var job = new GlideRecord('sysauto_script');\nif (job.get('name', '${j}')) {\n  gs.executeNow(job);\n}`,
      checks: [
        { needle: `new GlideRecord('sysauto_script')`, message: `Scheduled script definitions live on sysauto_script.` },
        { needle: `get('name', '${j}')`, message: `Fetch the job by name inside an if.` },
        { needle: `gs.executeNow(job)`, message: `Run it with gs.executeNow(job).` },
      ],
    };
  },
  // Stage 9 — audit
  (i) => {
    const t = TABLES[i];
    return {
      stage: 9, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_audit_${t}.js`,
      title: `Who changed state on ${t} today?`,
      task: `Query sys_audit for tablename '${t}', fieldname 'state', created today, newest first, and log user, oldvalue and newvalue.`,
      starter: `// Today's state changes on ${t}\n`,
      solution: `var a = new GlideRecord('sys_audit');\na.addQuery('tablename', '${t}');\na.addQuery('fieldname', 'state');\na.addQuery('sys_created_on', '>=', gs.beginningOfToday());\na.orderByDesc('sys_created_on');\na.query();\nwhile (a.next()) {\n  gs.info(a.user + ': ' + a.oldvalue + ' -> ' + a.newvalue);\n}`,
      checks: [
        { needle: `new GlideRecord('sys_audit')`, message: `Field-level history is on sys_audit.` },
        { needle: `addQuery('tablename', '${t}')`, message: `Filter by tablename '${t}'.` },
        { needle: `addQuery('fieldname', 'state')`, message: `Filter by fieldname 'state'.` },
        { needle: `gs.beginningOfToday()`, message: `Limit to today with gs.beginningOfToday().` },
        { needle: `orderByDesc('sys_created_on')`, message: `Newest first: orderByDesc('sys_created_on').` },
      ],
    };
  },
  // Stage 10 — health
  (i) => {
    const t = TABLES[i];
    return {
      stage: 10, side: "server", scriptType: "Background Script (admin)",
      filename: `bg_health_${t}.js`,
      title: `Stuck events for ${t}`,
      task: `Count sysevent rows in state 'ready' for table '${t}' older than one hour, using GlideAggregate and gs.hoursAgoStart(1).`,
      starter: `// Stuck event queue check for ${t}\n`,
      solution: `var ga = new GlideAggregate('sysevent');\nga.addQuery('state', 'ready');\nga.addQuery('table', '${t}');\nga.addQuery('sys_created_on', '<', gs.hoursAgoStart(1));\nga.addAggregate('COUNT');\nga.query();\nif (ga.next()) {\n  gs.info('Stuck: ' + ga.getAggregate('COUNT'));\n}`,
      checks: [
        { needle: `new GlideAggregate('sysevent')`, message: `The event queue is sysevent — count it with GlideAggregate.` },
        { needle: `addQuery('state', 'ready')`, message: `Unprocessed events are state 'ready'.` },
        { needle: `addQuery('table', '${t}')`, message: `Scope to table '${t}'.` },
        { needle: `gs.hoursAgoStart(1)`, message: `"Older than an hour" uses gs.hoursAgoStart(1).` },
        { needle: `getAggregate('COUNT')`, message: `Read the total with getAggregate('COUNT').` },
      ],
    };
  },
];

const VARIANTS = 20;

/** Admin path tasks, already ordered stage 1 → 10. */
export function buildAdminTasks(normalize: (s: string) => string): (LiveCodingQuestion & { stage: number })[] {
  const out: (LiveCodingQuestion & { stage: number })[] = [];
  templates.forEach((tpl, tIdx) => {
    for (let i = 0; i < VARIANTS; i++) {
      const q = tpl(i);
      out.push({
        ...q,
        id: `adm-${tIdx + 1}-${i + 1}`,
        checks: q.checks.map((c) => ({ ...c, needle: normalize(c.needle) })),
      });
    }
  });
  return out;
}
