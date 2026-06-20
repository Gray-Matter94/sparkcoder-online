import type { Category, Question, SimulatorOutput } from "./questions";

/**
 * Programmatic puzzle generator.
 * Each category gets ~500 puzzles built by combining real ServiceNow
 * tables / fields / methods with a handful of teaching templates.
 * Variations are deterministic so ids stay stable across reloads.
 */

const TABLES = [
  { name: "incident", label: "Incident", num: "INC", states: ["New", "In Progress", "On Hold", "Resolved", "Closed"] },
  { name: "problem", label: "Problem", num: "PRB", states: ["Open", "Known Error", "Resolved", "Closed"] },
  { name: "change_request", label: "Change", num: "CHG", states: ["New", "Assess", "Authorize", "Scheduled", "Implement"] },
  { name: "sc_request", label: "Request", num: "REQ", states: ["Pending Approval", "In Process", "Closed Complete"] },
  { name: "sc_req_item", label: "Requested Item", num: "RITM", states: ["Pending", "Open", "Work in Progress", "Closed Complete"] },
  { name: "sc_task", label: "Catalog Task", num: "SCTASK", states: ["Pending", "Open", "Work in Progress", "Closed Complete"] },
  { name: "task", label: "Task", num: "TASK", states: ["Open", "Pending", "Closed"] },
  { name: "sys_user", label: "User", num: "USR", states: ["active", "locked", "inactive"] },
  { name: "sys_user_group", label: "Group", num: "GRP", states: ["active", "inactive"] },
  { name: "cmdb_ci", label: "Configuration Item", num: "CI", states: ["Installed", "In Stock", "Retired"] },
  { name: "cmdb_ci_server", label: "Server CI", num: "SRV", states: ["Installed", "Retired"] },
  { name: "cmdb_ci_linux_server", label: "Linux Server", num: "LNX", states: ["Installed", "Retired"] },
  { name: "cmdb_ci_business_app", label: "Business App", num: "APP", states: ["Operational", "Retired"] },
  { name: "kb_knowledge", label: "KB Article", num: "KB", states: ["Draft", "Published", "Retired"] },
  { name: "approval_approver", label: "Approval", num: "APR", states: ["Requested", "Approved", "Rejected"] },
] as const;

const STRING_FIELDS = [
  "short_description",
  "description",
  "work_notes",
  "comments",
  "category",
  "subcategory",
  "u_environment",
  "u_region",
  "u_owner_team",
];

const REF_FIELDS = ["caller_id", "assigned_to", "assignment_group", "opened_by", "cmdb_ci", "company", "location", "manager"];

const STATE_NUMS = [1, 2, 3, 4, 6, 7, 8, 10];

function T(offset = 0) {
  const base = new Date(2024, 0, 1, 14, 20, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length];
}

function rows(tbl: { name: string; num: string; states: readonly string[] }, n: number, ok = true) {
  return Array.from({ length: n }, (_, i) => ({
    number: `${tbl.num}00${100 + i}`,
    state: pick(tbl.states, i),
    updated: `${i + 1}m ago`,
    highlight: (ok ? "ok" : "bad") as "ok" | "bad",
  }));
}

function makeQuestion(q: Omit<Question, "options"> & {
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
            explain: o.wrongExplain ?? "Re-read the snippet and try the canonical pattern.",
            sim: o.wrongSim ?? { rows: [], logs: [{ time: T(0), text: "Script produced an unexpected result.", tone: "bad" }] },
          },
    })),
  };
}

/* ------------------------------------------------------------------ */
/* GlideRecord templates                                              */
/* ------------------------------------------------------------------ */

function gliderecordPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // Template A: pick the right loop construct on a variety of tables
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-gr-loop-${seq}`,
        category: "gliderecord",
        level: 1 + ((i + k) % 3),
        filename: `${tbl.name}_iter.js`,
        title: `Iterate every '${tbl.label}' record and log its ${field}.`,
        code: [
          `var gr = new GlideRecord('${tbl.name}');`,
          `gr.query();`,
          ``,
          `{{SLOT}} {`,
          `  gs.info(gr.getValue('${field}'));`,
          `}`,
        ],
        options: [
          { id: "a", text: "while (gr.next())", correct: true },
          { id: "b", text: "if (gr.next())", correct: false, wrongTitle: "Only one record processed", wrongExplain: "`if (gr.next())` advances once. Use `while` to walk every row in the result set." },
          { id: "c", text: "for (gr.next())", correct: false, wrongTitle: "Syntax error", wrongExplain: "JavaScript `for` needs `(init; cond; update)`. Use `while (gr.next())`." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 3, true), logs: [
          { time: T(0), text: `GlideRecord('${tbl.name}') initialized`, tone: "info" },
          { time: T(1), text: `Iterated all matched rows`, tone: "ok" },
        ]},
        correctTeach: { title: "while() walks the entire result set", explain: "`gr.next()` returns false when the set is exhausted; `while` keeps pulling rows until then." },
      }));
    }
  });

  // Template B: addQuery + update
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const stateNum = pick(STATE_NUMS, i + k);
      out.push(makeQuestion({
        id: `gen-gr-upd-${seq}`,
        category: "gliderecord",
        level: 1 + ((i + k + 1) % 3),
        filename: `${tbl.name}_bulk_close.js`,
        title: `Set state to ${stateNum} on matching '${tbl.label}' records and persist.`,
        code: [
          `var gr = new GlideRecord('${tbl.name}');`,
          `gr.addQuery('state', ${(stateNum + 1) % 9});`,
          `gr.query();`,
          `while (gr.next()) {`,
          `  gr.state = ${stateNum};`,
          `  {{SLOT}};`,
          `}`,
        ],
        options: [
          { id: "a", text: "gr.update()", correct: true },
          { id: "b", text: "gr.insert()", correct: false, wrongTitle: "Duplicates created", wrongExplain: "`insert()` makes a NEW row each iteration; originals stay unchanged." },
          { id: "c", text: "gr.setValue('state', " + stateNum + ")", correct: false, wrongTitle: "Never persisted", wrongExplain: "setValue only changes the in-memory record — call `update()` to write to the DB." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 3, true), logs: [
          { time: T(0), text: `Updated 3 ${tbl.name} record(s) → state=${stateNum}`, tone: "ok" },
        ]},
        correctTeach: { title: "update() commits the current record", explain: "Inside `while (gr.next())`, `gr.update()` writes only the current row. For very large sets, prefer `setValue` + `updateMultiple()`." },
      }));
    }
  });

  // Template C: gr.get vs query+next
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 10; k++) {
      seq++;
      out.push(makeQuestion({
        id: `gen-gr-get-${seq}`,
        category: "gliderecord",
        level: 2 + ((i + k) % 2),
        filename: `${tbl.name}_lookup.js`,
        title: `Fetch ONE '${tbl.label}' record by sys_id efficiently.`,
        code: [
          `var gr = new GlideRecord('${tbl.name}');`,
          `{{SLOT}};`,
          `gs.info(gr.getValue('sys_id'));`,
        ],
        options: [
          { id: "a", text: "gr.get(sysId)", correct: true },
          { id: "b", text: "gr.addQuery('sys_id', sysId); gr.query(); gr.next()", correct: false, wrongTitle: "Works but wasteful", wrongExplain: "Use `.get(sysId)` — it queries by PK in one call." },
          { id: "c", text: "gr.getRecord(sysId)", correct: false, wrongTitle: "Method doesn't exist", wrongExplain: "Use `.get(sysId)` or `.get(field, value)`." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 1, true), logs: [{ time: T(0), text: `GlideRecord.get(sys_id) → true`, tone: "ok" }] },
        correctTeach: { title: ".get() is the idiomatic single-record fetch", explain: "Returns boolean and loads the record on success. Also supports `gr.get('field', value)`." },
      }));
    }
  });

  // Template D: setLimit
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 10; k++) {
      seq++;
      const limit = 1 + ((i + k) % 50);
      out.push(makeQuestion({
        id: `gen-gr-limit-${seq}`,
        category: "gliderecord",
        level: 2,
        filename: `${tbl.name}_topN.js`,
        title: `Return only ${limit} ${tbl.label} record(s).`,
        code: [
          `var gr = new GlideRecord('${tbl.name}');`,
          `gr.orderByDesc('sys_created_on');`,
          `{{SLOT}};`,
          `gr.query();`,
          `while (gr.next()) gs.info(gr.number);`,
        ],
        options: [
          { id: "a", text: `gr.setLimit(${limit})`, correct: true },
          { id: "b", text: `gr.limit = ${limit}`, correct: false, wrongTitle: "Property doesn't apply a row cap", wrongExplain: "Use the `setLimit(n)` method — assigning a property doesn't change SQL behavior." },
          { id: "c", text: `gr.addQuery('rowLimit', ${limit})`, correct: false, wrongTitle: "rowLimit isn't a field", wrongExplain: "Use `gr.setLimit(n)` — `addQuery` filters on real fields only." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, Math.min(limit, 3), true), logs: [{ time: T(0), text: `Query capped at ${limit} record(s)`, tone: "ok" }] },
        correctTeach: { title: "setLimit caps the result set in SQL", explain: "Issued as `LIMIT n` to the database — much cheaper than fetching all rows and breaking out of the loop." },
      }));
    }
  });

  // Template E: orderBy
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 10; k++) {
      seq++;
      out.push(makeQuestion({
        id: `gen-gr-order-${seq}`,
        category: "gliderecord",
        level: 2,
        filename: `${tbl.name}_recent.js`,
        title: `Get '${tbl.label}' records sorted by newest first.`,
        code: [
          `var gr = new GlideRecord('${tbl.name}');`,
          `{{SLOT}};`,
          `gr.query();`,
        ],
        options: [
          { id: "a", text: "gr.orderByDesc('sys_created_on')", correct: true },
          { id: "b", text: "gr.orderBy('sys_created_on')", correct: false, wrongTitle: "Ascending sort", wrongExplain: "`orderBy` sorts ascending (oldest first). Use `orderByDesc` for newest first." },
          { id: "c", text: "gr.addQuery('sys_created_on', 'DESC')", correct: false, wrongTitle: "Not a sort API", wrongExplain: "`addQuery` filters; for sorting use `orderBy / orderByDesc`." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 3, true), logs: [{ time: T(0), text: `ORDER BY sys_created_on DESC`, tone: "ok" }] },
        correctTeach: { title: "orderByDesc for newest first", explain: "Chain multiple `orderBy[Desc]` calls for tiebreakers; they apply in the order called." },
      }));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Business Rules templates                                           */
/* ------------------------------------------------------------------ */

function businessRulesPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-br-when-${seq}`,
        category: "business-rules",
        level: 1 + ((i + k) % 3),
        filename: `${tbl.name}_set_${field}_br.js`,
        title: `Set '${field}' on a '${tbl.label}' BEFORE the insert hits the DB.`,
        code: [
          `// Business Rule on '${tbl.name}'`,
          `// When: {{SLOT}}`,
          `(function executeRule(current, previous) {`,
          `  current.${field} = 'auto-set';`,
          `})(current, previous);`,
        ],
        options: [
          { id: "a", text: "before / insert", correct: true },
          { id: "b", text: "after / insert", correct: false, wrongTitle: "Triggers a second UPDATE", wrongExplain: "Mutating `current` after the write needs another UPDATE — use BEFORE." },
          { id: "c", text: "async / insert", correct: false, wrongTitle: "Runs too late", wrongExplain: "Async fires after commit — the user already saw the empty field." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 1, true), logs: [{ time: T(0), text: "Before-BR fired, single INSERT committed", tone: "ok" }] },
        correctTeach: { title: "Mutate current → use BEFORE", explain: "Same-record writes belong in BEFORE; cross-record writes in AFTER; slow/non-critical in ASYNC." },
      }));
    }
  });

  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-br-abort-${seq}`,
        category: "business-rules",
        level: 2,
        filename: `${tbl.name}_validate.js`,
        title: `Block a '${tbl.label}' insert when '${field}' is empty.`,
        code: [
          `(function executeRule(current, previous) {`,
          `  if (!current.${field}) {`,
          `    gs.addErrorMessage('${field} is required');`,
          `    {{SLOT}};`,
          `  }`,
          `})(current, previous);`,
        ],
        options: [
          { id: "a", text: "current.setAbortAction(true)", correct: true },
          { id: "b", text: "return false", correct: false, wrongTitle: "Doesn't abort", wrongExplain: "`return false` only exits the IIFE — the DB write still happens." },
          { id: "c", text: "gs.abort()", correct: false, wrongTitle: "Not a real API", wrongExplain: "There is no `gs.abort()`. Use `current.setAbortAction(true)` in a BEFORE rule." },
        ],
        correctSim: { table: tbl.name, rows: [{ number: "—", state: "Aborted", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "INSERT cancelled by setAbortAction(true)", tone: "ok" }] },
        correctTeach: { title: "setAbortAction cancels the DB op", explain: "Only effective in BEFORE business rules. Pair with `gs.addErrorMessage` for user feedback." },
      }));
    }
  });

  // current vs previous detection
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 10; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-br-change-${seq}`,
        category: "business-rules",
        level: 2 + ((i + k) % 2),
        filename: `${tbl.name}_on_${field}_change.js`,
        title: `Detect a change of '${field}' on '${tbl.label}'.`,
        code: [
          `(function executeRule(current, previous) {`,
          `  if ({{SLOT}}) {`,
          `    gs.info('${field} changed');`,
          `  }`,
          `})(current, previous);`,
        ],
        options: [
          { id: "a", text: `current.${field}.changes()`, correct: true },
          { id: "b", text: `current.${field} != previous.${field}`, correct: false, wrongTitle: "GlideElement quirks", wrongExplain: "Comparing GlideElements with `!=` is unreliable for nulls/types. Use `.changes()`." },
          { id: "c", text: `current.changes('${field}')`, correct: false, wrongTitle: "Wrong call shape", wrongExplain: "It's `current.<field>.changes()`, not a method on `current`." },
        ],
        correctSim: { table: tbl.name, rows: rows(tbl, 1, true), logs: [{ time: T(0), text: `Field change detected`, tone: "ok" }] },
        correctTeach: { title: ".changes() is the canonical change check", explain: "Variants: `.changesTo(val)` and `.changesFrom(val)` for direction-aware checks." },
      }));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Client Scripts templates                                           */
/* ------------------------------------------------------------------ */

function clientScriptsPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // onChange guard
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-cs-guard-${seq}`,
        category: "client-scripts",
        level: 1 + ((i + k) % 2),
        filename: `${tbl.name}_onChange_${field}.js`,
        title: `Skip the body of an onChange '${field}' script during form load.`,
        code: [
          `function onChange(control, oldValue, newValue, isLoading) {`,
          `  if ({{SLOT}}) return;`,
          `  // ... handler ...`,
          `}`,
        ],
        options: [
          { id: "a", text: "isLoading || newValue === ''", correct: true },
          { id: "b", text: "newValue == oldValue", correct: false, wrongTitle: "Doesn't cover form load", wrongExplain: "On form load both are set but `isLoading=true`. Skip on `isLoading`." },
          { id: "c", text: "!newValue", correct: false, wrongTitle: "Misses the load case", wrongExplain: "Doesn't catch the initial onChange triggered by load. Check `isLoading`." },
        ],
        correctSim: { table: tbl.name, rows: [], logs: [{ time: T(0), text: "Skipped on form load — fired only on user change", tone: "ok" }] },
        correctTeach: { title: "Always guard with isLoading", explain: "OnChange fires on form load too. Guard with `if (isLoading || newValue === '') return;`." },
      }));
    }
  });

  // Setting field mandatory
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 12; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-cs-mand-${seq}`,
        category: "client-scripts",
        level: 2,
        filename: `${tbl.name}_make_${field}_mandatory.js`,
        title: `Make '${field}' mandatory from a client script.`,
        code: [
          `function onChange(control, oldValue, newValue, isLoading) {`,
          `  if (isLoading) return;`,
          `  {{SLOT}};`,
          `}`,
        ],
        options: [
          { id: "a", text: `g_form.setMandatory('${field}', true)`, correct: true },
          { id: "b", text: `g_form.mandatory('${field}')`, correct: false, wrongTitle: "Method doesn't exist", wrongExplain: "Use `g_form.setMandatory(field, bool)`." },
          { id: "c", text: `current.setMandatory('${field}', true)`, correct: false, wrongTitle: "`current` is server-side", wrongExplain: "Client scripts use `g_form`, not `current`." },
        ],
        correctSim: { table: tbl.name, rows: [], logs: [{ time: T(0), text: `Field '${field}' now mandatory`, tone: "ok" }] },
        correctTeach: { title: "g_form is the client-side API", explain: "Use `g_form.setMandatory / setReadOnly / setVisible / setDisplay` on the client." },
      }));
    }
  });

  // Reading reference fields
  TABLES.forEach((tbl, i) => {
    for (let k = 0; k < 10; k++) {
      seq++;
      const field = pick(REF_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-cs-getref-${seq}`,
        category: "client-scripts",
        level: 2,
        filename: `${tbl.name}_get_${field}.js`,
        title: `Read the sys_id of '${field}' from a client script.`,
        code: [
          `function onChange(control, oldValue, newValue, isLoading) {`,
          `  if (isLoading) return;`,
          `  var refId = {{SLOT}};`,
          `}`,
        ],
        options: [
          { id: "a", text: `g_form.getValue('${field}')`, correct: true },
          { id: "b", text: `g_form.getReference('${field}').sys_id`, correct: false, wrongTitle: "Synchronous AJAX & extra cost", wrongExplain: "`getReference` fetches the full record (or fires a callback). For just the sys_id, use `getValue`." },
          { id: "c", text: `current.${field}.sys_id`, correct: false, wrongTitle: "`current` not available client-side", wrongExplain: "Client scripts can't use `current` — use `g_form.getValue`." },
        ],
        correctSim: { table: tbl.name, rows: [], logs: [{ time: T(0), text: `Got reference sys_id`, tone: "ok" }] },
        correctTeach: { title: "getValue returns the raw sys_id for refs", explain: "Use `getReference(name, callback)` only when you need the referenced record's fields." },
      }));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* GlideAjax templates                                                */
/* ------------------------------------------------------------------ */

function glideAjaxPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  const includeNames = ["UserUtils", "AccountUtils", "RegionUtils", "ApprovalUtils", "PricingUtils", "InventoryUtils", "OrgChartUtils", "TicketUtils"];

  includeNames.forEach((inc, i) => {
    for (let k = 0; k < 64; k++) {
      seq++;
      const method = ["getManagerName", "getRegion", "getCount", "getPrice", "getOwner", "getNextApprover"][k % 6];
      out.push(makeQuestion({
        id: `gen-ga-call-${seq}`,
        category: "glideajax",
        level: 1 + ((i + k) % 3),
        filename: `${inc}_call.js`,
        title: `Call ${inc}.${method} from a client script.`,
        code: [
          `var ga = new GlideAjax('${inc}');`,
          `ga.addParam('sysparm_name', '${method}');`,
          `ga.addParam('sysparm_user', g_form.getValue('caller_id'));`,
          `{{SLOT}};`,
        ],
        options: [
          { id: "a", text: `ga.getXMLAnswer(function(ans){ g_form.setValue('u_${method}', ans); })`, correct: true },
          { id: "b", text: `ga.execute()`, correct: false, wrongTitle: "No callback wired", wrongExplain: "`execute()` requires a separate callback registration; the easy path is `getXMLAnswer(cb)`." },
          { id: "c", text: `ga.send()`, correct: false, wrongTitle: "Not the API", wrongExplain: "`GlideAjax` exposes `getXMLAnswer / getXML`, not `send`." },
        ],
        correctSim: { rows: [{ number: `${inc}.${method}`, state: "200 OK", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "getXMLAnswer received string answer", tone: "ok" }] },
        correctTeach: { title: "getXMLAnswer is the simple async path", explain: "Build GlideAjax → addParam('sysparm_name', method) + extras → `getXMLAnswer(cb)`." },
      }));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ */
/* Script Includes templates                                          */
/* ------------------------------------------------------------------ */

function scriptIncludesPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  const names = ["UserUtils", "AccountUtils", "RegionUtils", "ApprovalUtils", "PricingUtils", "InventoryUtils", "OrgChartUtils", "TicketUtils", "AssetUtils", "NotifyUtils"];

  names.forEach((inc, i) => {
    for (let k = 0; k < 30; k++) {
      seq++;
      out.push(makeQuestion({
        id: `gen-si-extend-${seq}`,
        category: "script-includes",
        level: 1 + ((i + k) % 3),
        filename: `${inc}.js`,
        title: `Make ${inc} callable from a client via GlideAjax.`,
        code: [
          `var ${inc} = Class.create();`,
          `${inc}.prototype = Object.extendsObject({{SLOT}}, {`,
          `  doIt: function() { return this.getParameter('sysparm_x'); },`,
          `  type: '${inc}'`,
          `});`,
        ],
        options: [
          { id: "a", text: "AbstractAjaxProcessor", correct: true },
          { id: "b", text: "GlideRecord", correct: false, wrongTitle: "Wrong base class", wrongExplain: "GlideRecord is for DB access, not AJAX. Extend AbstractAjaxProcessor and tick 'Client Callable'." },
          { id: "c", text: "Object", correct: false, wrongTitle: "No AJAX plumbing", wrongExplain: "Without AbstractAjaxProcessor you don't inherit `getParameter()`." },
        ],
        correctSim: { rows: [{ number: `${inc}.doIt`, state: "200 OK", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "AJAX response delivered", tone: "ok" }] },
        correctTeach: { title: "Extend AbstractAjaxProcessor for client-callable SIs", explain: "Two boxes: 'Client callable' on the record, and extending AbstractAjaxProcessor in code." },
      }));
    }
  });

  // server-only helper pattern
  names.forEach((inc, i) => {
    for (let k = 0; k < 21; k++) {
      seq++;
      const field = pick(STRING_FIELDS, i + k);
      out.push(makeQuestion({
        id: `gen-si-helper-${seq}`,
        category: "script-includes",
        level: 2,
        filename: `${inc}.js`,
        title: `Add a server-only helper that returns the value of '${field}'.`,
        code: [
          `var ${inc} = Class.create();`,
          `${inc}.prototype = {`,
          `  initialize: function() {},`,
          `  get${field.replace(/_/g, "")}: function(sysId) {`,
          `    var gr = new GlideRecord('sys_user');`,
          `    if ({{SLOT}}) return gr.getValue('${field}');`,
          `    return '';`,
          `  },`,
          `  type: '${inc}'`,
          `};`,
        ],
        options: [
          { id: "a", text: "gr.get(sysId)", correct: true },
          { id: "b", text: "gr.next()", correct: false, wrongTitle: "Nothing was queried", wrongExplain: "You need `gr.get(sysId)` or `addQuery + query + next`." },
          { id: "c", text: "gr.query(sysId)", correct: false, wrongTitle: "Wrong signature", wrongExplain: "`query()` runs the prepared filters; use `get(sysId)` for a PK lookup." },
        ],
        correctSim: { rows: [{ number: "sys_user", state: "1 row", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "PK lookup succeeded", tone: "ok" }] },
        correctTeach: { title: "Server-only SIs skip AbstractAjaxProcessor", explain: "If the SI is only called from server code, omit the AJAX base class and skip 'Client callable'." },
      }));
    }
  });

  return out;
}

/* ------------------------------------------------------------------ */

import { adminGeneratedQuestions } from "./content/admin-gen";
import { javaGeneratedQuestions } from "./content/java-gen";
import { angularGeneratedQuestions } from "./content/angular-gen";

let cache: Question[] | null = null;
export function generatedQuestions(): Question[] {
  if (cache) return cache;
  cache = [
    ...gliderecordPool(),
    ...businessRulesPool(),
    ...clientScriptsPool(),
    ...glideAjaxPool(),
    ...scriptIncludesPool(),
    ...adminGeneratedQuestions(),
    ...javaGeneratedQuestions(),
    ...angularGeneratedQuestions(),
  ];
  return cache;
}

export function generatedQuestionsFor(cat: Category): Question[] {
  return generatedQuestions().filter((q) => q.category === cat);
}
