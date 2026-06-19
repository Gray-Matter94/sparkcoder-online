export type Category =
  | "gliderecord"
  | "business-rules"
  | "client-scripts"
  | "glideajax"
  | "script-includes";

export interface CategoryMeta {
  id: Category;
  name: string;
  emoji: string;
  blurb: string;
  color: string; // tailwind color class fragment for accents
}

export const CATEGORIES: CategoryMeta[] = [
  { id: "gliderecord", name: "GlideRecord", emoji: "🗃️", blurb: "Server-side DB queries", color: "primary" },
  { id: "business-rules", name: "Business Rules", emoji: "⚙️", blurb: "Before/After/Async logic", color: "accent" },
  { id: "client-scripts", name: "Client Scripts", emoji: "🖱️", blurb: "onLoad / onChange / onSubmit", color: "secondary" },
  { id: "glideajax", name: "GlideAjax", emoji: "📡", blurb: "Client → Server calls", color: "primary" },
  { id: "script-includes", name: "Script Includes", emoji: "📦", blurb: "Reusable server libraries", color: "accent" },
];

export interface Option {
  id: string;
  text: string; // the code/snippet shown on the choice chip
  correct: boolean;
  /** If wrong, what the simulator shows + what to teach. */
  feedback: {
    title: string; // short headline
    explain: string; // multi-line teaching
    sim: SimulatorOutput;
  };
}

export interface SimulatorOutput {
  /** Rows shown in the fake instance table. */
  rows: { number: string; state: string; updated: string; highlight?: "ok" | "warn" | "bad" | "dim" }[];
  /** System log lines that "stream" in. */
  logs: { time: string; text: string; tone?: "info" | "ok" | "warn" | "bad" }[];
  /** Table name shown in header. */
  table?: string;
}

export interface Question {
  id: string;
  category: Category;
  level: number;
  filename: string;
  title: string;
  /** Code lines; one line contains the token {{SLOT}} to be filled with the chosen option. */
  code: string[];
  options: Option[];
  /** Output shown on a correct answer. */
  correctSim: SimulatorOutput;
  /** Detailed teaching shown on correct answer too (the "why it works"). */
  correctTeach: { title: string; explain: string };
}

const T = (offset = 0) => {
  const base = new Date(2024, 0, 1, 14, 20, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

export const QUESTIONS: Question[] = [
  // ----- GlideRecord -----
  {
    id: "gr-1",
    category: "gliderecord",
    level: 1,
    filename: "inc_processor.js",
    title: "Iterate through ALL active incidents and log each number.",
    code: [
      "var gr = new GlideRecord('incident');",
      "gr.addActiveQuery();",
      "gr.query();",
      "",
      "{{SLOT}} {",
      "  gs.info(gr.number);",
      "}",
    ],
    options: [
      {
        id: "a",
        text: "if (gr.next())",
        correct: false,
        feedback: {
          title: "Only the first record was logged",
          explain:
            "`if (gr.next())` advances the cursor exactly once and returns true/false. Your loop body runs at most one time, so you see one INC and stop.\n\nUse `while (gr.next())` to keep advancing the cursor until there are no records left.",
          sim: {
            table: "incident",
            rows: [
              { number: "INC0010001", state: "New", updated: "just now", highlight: "warn" },
              { number: "INC0010002", state: "In Progress", updated: "2m ago", highlight: "dim" },
              { number: "INC0010003", state: "On Hold", updated: "5m ago", highlight: "dim" },
            ],
            logs: [
              { time: T(0), text: "GlideRecord('incident') initialized", tone: "info" },
              { time: T(1), text: "Query returned 3 record(s)", tone: "info" },
              { time: T(2), text: "*** Script: INC0010001", tone: "warn" },
              { time: T(3), text: "Loop exited — only 1 of 3 records evaluated.", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "b",
        text: "while (gr.next())",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "c",
        text: "for (gr.next())",
        correct: false,
        feedback: {
          title: "Syntax error",
          explain:
            "A JavaScript `for` loop needs three parts: `for (init; condition; update)`. `for (gr.next())` is invalid syntax and the script will not compile.\n\nFor iterating a GlideRecord result set, the idiomatic pattern is `while (gr.next())`.",
          sim: {
            table: "incident",
            rows: [],
            logs: [
              { time: T(0), text: "Compile error: missing ';' in for-loop header", tone: "bad" },
              { time: T(1), text: "Script aborted before query executed.", tone: "bad" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [
        { number: "INC0010001", state: "New", updated: "just now", highlight: "ok" },
        { number: "INC0010002", state: "In Progress", updated: "2m ago", highlight: "ok" },
        { number: "INC0010003", state: "On Hold", updated: "5m ago", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "GlideRecord('incident') initialized", tone: "info" },
        { time: T(1), text: "Query returned 3 record(s)", tone: "info" },
        { time: T(2), text: "*** Script: INC0010001", tone: "ok" },
        { time: T(3), text: "*** Script: INC0010002", tone: "ok" },
        { time: T(4), text: "*** Script: INC0010003", tone: "ok" },
        { time: T(5), text: "Loop completed cleanly.", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "while() walks the entire result set",
      explain:
        "`gr.next()` moves the cursor to the next record and returns false when the set is exhausted. Pair it with `while` to visit every row. Use `if` only when you genuinely care about a single record (e.g. after `gr.get(sys_id)`).",
    },
  },
  {
    id: "gr-2",
    category: "gliderecord",
    level: 2,
    filename: "close_old.js",
    title: "Set all matched incidents to state 7 (Closed) and persist the change.",
    code: [
      "var gr = new GlideRecord('incident');",
      "gr.addQuery('state', 3);",
      "gr.query();",
      "while (gr.next()) {",
      "  gr.state = 7;",
      "  {{SLOT}};",
      "}",
    ],
    options: [
      { id: "a", text: "gr.update()", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "gr.insert()",
        correct: false,
        feedback: {
          title: "You inserted duplicates instead of updating",
          explain:
            "`insert()` creates a NEW row using the current field values. Inside a `while (gr.next())` loop this writes a fresh duplicate record per iteration — your originals stay in state 3 and your table fills with junk copies.\n\nUse `update()` to persist changes to the current record.",
          sim: {
            table: "incident",
            rows: [
              { number: "INC0010100", state: "On Hold (3)", updated: "1m ago", highlight: "warn" },
              { number: "INC0010101", state: "Closed (7) — DUP", updated: "now", highlight: "bad" },
              { number: "INC0010102", state: "Closed (7) — DUP", updated: "now", highlight: "bad" },
            ],
            logs: [
              { time: T(0), text: "Inserted INC0010101 (duplicate)", tone: "bad" },
              { time: T(1), text: "Inserted INC0010102 (duplicate)", tone: "bad" },
              { time: T(2), text: "Original 'On Hold' record never updated.", tone: "warn" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "gr.setValue('state', 7)",
        correct: false,
        feedback: {
          title: "Field changed in memory but never saved",
          explain:
            "`setValue()` only updates the field on the in-memory record. Nothing is written to the database until you call `update()` (or `updateMultiple()`). Without it, your loop ends and every record reverts.",
          sim: {
            table: "incident",
            rows: [
              { number: "INC0010100", state: "On Hold (3)", updated: "—", highlight: "warn" },
              { number: "INC0010101", state: "On Hold (3)", updated: "—", highlight: "warn" },
            ],
            logs: [
              { time: T(0), text: "Field 'state' set in memory", tone: "info" },
              { time: T(1), text: "No DB write detected. Changes lost.", tone: "bad" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [
        { number: "INC0010100", state: "Closed (7)", updated: "now", highlight: "ok" },
        { number: "INC0010101", state: "Closed (7)", updated: "now", highlight: "ok" },
        { number: "INC0010102", state: "Closed (7)", updated: "now", highlight: "ok" },
      ],
      logs: [
        { time: T(0), text: "Query matched 3 records (state=3)", tone: "info" },
        { time: T(1), text: "Updated INC0010100 → state=7", tone: "ok" },
        { time: T(2), text: "Updated INC0010101 → state=7", tone: "ok" },
        { time: T(3), text: "Updated INC0010102 → state=7", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "update() commits the in-memory record",
      explain:
        "Inside a `while (gr.next())` loop, `gr.update()` persists changes to the current record only. For very large sets prefer `gr.setValue(...)` + `gr.updateMultiple()` after the query (no loop) — it issues a single SQL UPDATE.",
    },
  },
  {
    id: "gr-3",
    category: "gliderecord",
    level: 3,
    filename: "user_lookup.js",
    title: "Fetch ONE user by sys_id efficiently. Choose the best method.",
    code: [
      "var gr = new GlideRecord('sys_user');",
      "{{SLOT}};",
      "gs.info(gr.getValue('user_name'));",
    ],
    options: [
      { id: "a", text: "gr.get(userSysId)", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "gr.addQuery('sys_id', userSysId); gr.query(); gr.next()",
        correct: false,
        feedback: {
          title: "Works, but wasteful",
          explain:
            "This pattern executes a full query + cursor walk just to grab one row. `GlideRecord.get(sys_id)` is purpose-built: it queries by primary key, loads the single record, and returns a boolean. Less code, less DB chatter.",
          sim: {
            table: "sys_user",
            rows: [{ number: "abel.tuter", state: "active", updated: "—", highlight: "warn" }],
            logs: [
              { time: T(0), text: "Executed full SELECT + cursor iteration", tone: "warn" },
              { time: T(1), text: "Result correct but 3x slower than .get()", tone: "warn" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "gr.getRecord(userSysId)",
        correct: false,
        feedback: {
          title: "That method doesn't exist on GlideRecord",
          explain:
            "There is no `getRecord(sysId)` on GlideRecord. You're thinking of `get(sys_id)` or `get(field, value)`. The script throws a TypeError on the missing function.",
          sim: {
            table: "sys_user",
            rows: [],
            logs: [
              { time: T(0), text: "TypeError: gr.getRecord is not a function", tone: "bad" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "sys_user",
      rows: [{ number: "abel.tuter", state: "active", updated: "just now", highlight: "ok" }],
      logs: [
        { time: T(0), text: "GlideRecord.get(sys_id) → true", tone: "ok" },
        { time: T(1), text: "*** Script: abel.tuter", tone: "ok" },
      ],
    },
    correctTeach: {
      title: ".get() is the idiomatic single-record fetch",
      explain:
        "`gr.get(sysId)` returns true/false and loads the record on success. Also supports `gr.get('field', value)` for non-PK lookups (returns first match).",
    },
  },

  // ----- Business Rules -----
  {
    id: "br-1",
    category: "business-rules",
    level: 1,
    filename: "set_priority_br.js",
    title: "Set priority BEFORE the insert hits the DB — without an extra UPDATE.",
    code: [
      "// Business Rule on 'incident'",
      "// When: {{SLOT}}",
      "(function executeRule(current, previous) {",
      "  if (current.impact == 1 && current.urgency == 1) {",
      "    current.priority = 1;",
      "  }",
      "})(current, previous);",
    ],
    options: [
      { id: "a", text: "before / insert,update", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "after / insert,update",
        correct: false,
        feedback: {
          title: "Triggers a second UPDATE",
          explain:
            "After-rules run after the record is written. Mutating `current` there saves the change with a follow-up UPDATE — doubling the writes and potentially re-triggering other rules.\n\nUse a *before* rule when you change fields on the same record.",
          sim: {
            table: "incident",
            rows: [{ number: "INC0010222", state: "Priority=1", updated: "now", highlight: "warn" }],
            logs: [
              { time: T(0), text: "INSERT incident", tone: "info" },
              { time: T(1), text: "After-BR fired → second UPDATE issued", tone: "warn" },
              { time: T(2), text: "Other after-rules re-evaluated. Loop risk!", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "async / insert,update",
        correct: false,
        feedback: {
          title: "Runs too late",
          explain:
            "Async business rules run in a queued job after the transaction commits. The user already sees `priority` unset on the form, and any current-cycle logic that depended on the new value runs against the old data.",
          sim: {
            table: "incident",
            rows: [{ number: "INC0010222", state: "Priority=(empty)", updated: "now", highlight: "bad" }],
            logs: [
              { time: T(0), text: "Form submitted, response sent to user", tone: "info" },
              { time: T(1), text: "Async job updated priority 2s later", tone: "warn" },
            ],
          },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [{ number: "INC0010222", state: "Priority=1 (Critical)", updated: "now", highlight: "ok" }],
      logs: [
        { time: T(0), text: "Before-BR fired (insert,update)", tone: "info" },
        { time: T(1), text: "current.priority assigned in memory", tone: "ok" },
        { time: T(2), text: "Single INSERT committed — no extra UPDATE", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Mutate current → use BEFORE",
      explain:
        "Rule of thumb: mutating fields on the same record? BEFORE. Reading the record and writing to OTHER records or external systems? AFTER. Anything slow / non-critical? ASYNC.",
    },
  },
  {
    id: "br-2",
    category: "business-rules",
    level: 2,
    filename: "abort_insert.js",
    title: "Block a record from being inserted when a validation fails.",
    code: [
      "(function executeRule(current, previous) {",
      "  if (!current.short_description) {",
      "    gs.addErrorMessage('Description is required');",
      "    {{SLOT}};",
      "  }",
      "})(current, previous);",
    ],
    options: [
      { id: "a", text: "current.setAbortAction(true)", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "return false",
        correct: false,
        feedback: {
          title: "Doesn't abort the transaction",
          explain:
            "`return false` exits the IIFE but ServiceNow has already accepted the operation. The record inserts anyway and the user only sees a warning message.",
          sim: {
            table: "incident",
            rows: [{ number: "INC0010333", state: "Inserted (no desc)", updated: "now", highlight: "bad" }],
            logs: [
              { time: T(0), text: "Error message shown to user", tone: "warn" },
              { time: T(1), text: "Record inserted anyway", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "gs.abort()",
        correct: false,
        feedback: {
          title: "Not a real API",
          explain:
            "There is no `gs.abort()`. Use `current.setAbortAction(true)` inside a BEFORE business rule to cancel the current insert/update.",
          sim: { rows: [], logs: [{ time: T(0), text: "TypeError: gs.abort is not a function", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "incident",
      rows: [{ number: "—", state: "Aborted before insert", updated: "now", highlight: "ok" }],
      logs: [
        { time: T(0), text: "Validation failed: short_description empty", tone: "warn" },
        { time: T(1), text: "current.setAbortAction(true) — INSERT cancelled", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "setAbortAction cancels the DB operation",
      explain:
        "Call `current.setAbortAction(true)` in a BEFORE rule to prevent the insert/update from committing. Pair it with `gs.addErrorMessage` so the user sees why.",
    },
  },

  // ----- Client Scripts -----
  {
    id: "cs-1",
    category: "client-scripts",
    level: 1,
    filename: "onChange_priority.js",
    title: "Skip the body when the form first loads. Choose the correct guard.",
    code: [
      "function onChange(control, oldValue, newValue, isLoading, isTemplate) {",
      "  {{SLOT}}",
      "  alert('Priority changed to ' + newValue);",
      "}",
    ],
    options: [
      { id: "a", text: "if (isLoading || newValue === '') return;", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "if (oldValue == newValue) return;",
        correct: false,
        feedback: {
          title: "Alert still fires on initial load",
          explain:
            "onChange fires once when the form loads with `isLoading = true`. Without checking `isLoading`, your alert pops the moment the user opens the form — annoying and not what was asked.",
          sim: {
            rows: [],
            logs: [
              { time: T(0), text: "Form load → onChange fired (isLoading=true)", tone: "warn" },
              { time: T(1), text: "alert('Priority changed to 3') shown to user", tone: "bad" },
            ],
          },
        },
      },
      {
        id: "c",
        text: "(nothing — let it run)",
        correct: false,
        feedback: {
          title: "Pop-up storm on every load",
          explain:
            "Always check `isLoading` (and usually empty `newValue`) at the top of an onChange script. Otherwise the script runs in unintended contexts and the user is bombarded.",
          sim: {
            rows: [],
            logs: [{ time: T(0), text: "alert fired on load — bad UX", tone: "bad" }],
          },
        },
      },
    ],
    correctSim: {
      rows: [],
      logs: [
        { time: T(0), text: "Form loaded — guard returned early", tone: "ok" },
        { time: T(1), text: "User changed Priority: 3 → 1", tone: "info" },
        { time: T(2), text: "alert('Priority changed to 1') shown", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Always guard onChange with isLoading",
      explain:
        "`isLoading` is true during the form's initial population. The boilerplate `if (isLoading || newValue === '') return;` prevents your code from running on load and on cleared fields. Add it to almost every onChange script.",
    },
  },
  {
    id: "cs-2",
    category: "client-scripts",
    level: 2,
    filename: "set_mandatory.js",
    title: "Make 'Assignment group' mandatory only when state = 2.",
    code: [
      "function onChange(control, oldValue, newValue, isLoading) {",
      "  if (isLoading) return;",
      "  {{SLOT}}('assignment_group', newValue == '2');",
      "}",
    ],
    options: [
      { id: "a", text: "g_form.setMandatory", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "g_form.setRequired",
        correct: false,
        feedback: {
          title: "Wrong API name",
          explain:
            "The g_form API uses `setMandatory(field, boolean)`. `setRequired` does not exist on g_form — confusing it with HTML attributes is common.",
          sim: { rows: [], logs: [{ time: T(0), text: "TypeError: g_form.setRequired is not a function", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "current.setMandatory",
        correct: false,
        feedback: {
          title: "current is server-side",
          explain:
            "`current` is a GlideRecord available in server scripts (Business Rules, Script Includes). In a Client Script you work with the form via `g_form`. There is no `current` object on the client.",
          sim: { rows: [], logs: [{ time: T(0), text: "ReferenceError: current is not defined", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      rows: [],
      logs: [
        { time: T(0), text: "State changed → 2 (In Progress)", tone: "info" },
        { time: T(1), text: "g_form.setMandatory('assignment_group', true)", tone: "ok" },
        { time: T(2), text: "Form field now shows red asterisk", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "g_form is your client-side toolbox",
      explain:
        "`g_form` exposes setMandatory, setVisible, setReadOnly, setValue, getValue, addErrorMessage and more. Memorise this object — it's the entire surface area of Client Scripts.",
    },
  },

  // ----- GlideAjax -----
  {
    id: "ga-1",
    category: "glideajax",
    level: 1,
    filename: "manager_lookup.js",
    title: "Read the server response correctly in the GlideAjax callback.",
    code: [
      "var ga = new GlideAjax('UserUtils');",
      "ga.addParam('sysparm_name', 'getManager');",
      "ga.addParam('sysparm_user', g_user.userID);",
      "ga.getXMLAnswer(function(answer) {",
      "  {{SLOT}};",
      "});",
    ],
    options: [
      { id: "a", text: "g_form.setValue('manager', answer)", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "g_form.setValue('manager', response.responseXML)",
        correct: false,
        feedback: {
          title: "Mixing two APIs",
          explain:
            "`response.responseXML` belongs to the older `getXML(callback)` flow (where the callback receives the full response). `getXMLAnswer` hands you just the string answer — use the `answer` argument directly.",
          sim: { rows: [], logs: [{ time: T(0), text: "ReferenceError: response is not defined", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "g_form.setValue('manager', ga.getAnswer())",
        correct: false,
        feedback: {
          title: "Synchronous call — deprecated",
          explain:
            "`ga.getAnswer()` runs synchronously and freezes the browser. ServiceNow strongly discourages it. Always prefer `getXMLAnswer(callback)` or `getXML(callback)` and consume the response in the callback.",
          sim: {
            rows: [],
            logs: [
              { time: T(0), text: "Synchronous AJAX blocked main thread (320ms)", tone: "warn" },
              { time: T(1), text: "Deprecated in modern ServiceNow releases", tone: "warn" },
            ],
          },
        },
      },
    ],
    correctSim: {
      rows: [{ number: "manager_sys_id=abc123", state: "applied", updated: "now", highlight: "ok" }],
      logs: [
        { time: T(0), text: "GlideAjax → UserUtils.getManager", tone: "info" },
        { time: T(1), text: "Server replied: abc123 (52ms)", tone: "ok" },
        { time: T(2), text: "g_form.setValue('manager', 'abc123')", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "getXMLAnswer hands you the string answer",
      explain:
        "Pattern: build a `GlideAjax(ScriptIncludeName)`, add params with `sysparm_name` (function) + extras, then `getXMLAnswer(cb)` where `cb(answer)` receives the string returned by the Script Include's method.",
    },
  },

  // ----- Script Includes -----
  {
    id: "si-1",
    category: "script-includes",
    level: 1,
    filename: "UserUtils.js",
    title: "Make this Script Include callable from a Client Script via GlideAjax.",
    code: [
      "var UserUtils = Class.create();",
      "UserUtils.prototype = Object.extendsObject({{SLOT}}, {",
      "  getManager: function() {",
      "    var u = this.getParameter('sysparm_user');",
      "    var gr = new GlideRecord('sys_user');",
      "    if (gr.get(u)) return gr.getValue('manager');",
      "    return '';",
      "  },",
      "  type: 'UserUtils'",
      "});",
    ],
    options: [
      { id: "a", text: "AbstractAjaxProcessor", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "GlideRecord",
        correct: false,
        feedback: {
          title: "Wrong base class",
          explain:
            "`GlideRecord` is for DB access, not for receiving AJAX calls. Extending it does not give you `getParameter()` and ServiceNow won't route GlideAjax requests to your methods.",
          sim: { rows: [], logs: [{ time: T(0), text: "Client got empty XMLAnswer — server method never invoked", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "Object",
        correct: false,
        feedback: {
          title: "No AJAX plumbing",
          explain:
            "Without extending `AbstractAjaxProcessor`, you don't inherit `getParameter()` and ServiceNow won't expose the methods to GlideAjax. Also remember to tick 'Client Callable' on the Script Include record.",
          sim: { rows: [], logs: [{ time: T(0), text: "Error: this.getParameter is not a function", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      rows: [{ number: "UserUtils.getManager", state: "200 OK", updated: "now", highlight: "ok" }],
      logs: [
        { time: T(0), text: "GlideAjax request received", tone: "info" },
        { time: T(1), text: "this.getParameter('sysparm_user') → abc123", tone: "ok" },
        { time: T(2), text: "Responded with manager sys_id", tone: "ok" },
      ],
    },
    correctTeach: {
      title: "Extend AbstractAjaxProcessor for client-callable SIs",
      explain:
        "Two checkboxes matter: 'Client callable' on the record, and extending `AbstractAjaxProcessor` in code (gives you `getParameter()` and the AJAX response wiring). Without both, the call silently returns nothing.",
    },
  },
];

export function questionsFor(cat: Category): Question[] {
  return QUESTIONS.filter((q) => q.category === cat);
}
