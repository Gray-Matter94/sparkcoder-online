import type { Question, Option } from "./questions";

export type LineStatus = "ok" | "error" | "fix" | "note";

export interface LineDiagnostic {
  /** 1-based line number as displayed in the code block. */
  line: number;
  /** The rendered source for this line (slot already substituted). */
  text: string;
  status: LineStatus;
  /** Plain-language explanation of what this line does / why it fails. */
  explain: string;
  /** For the faulty line: the corrected source. */
  suggestion?: string;
}

const SLOT = "{{SLOT}}";

/**
 * Heuristic, ServiceNow-aware explanation of a single line of script.
 * Deliberately pure + synchronous so it can be unit-tested and rendered inline.
 */
export function explainSnLine(raw: string): string {
  const l = raw.trim();
  if (!l) return "Blank line — spacing only, nothing executes here.";
  if (l.startsWith("//") || l.startsWith("/*") || l.startsWith("*"))
    return "Comment — ignored at runtime, but it documents intent for the next developer.";
  if (l === "}" || l === "})" || l === "});" || l === "};")
    return "Closes the block opened above. Everything indented inside it belongs to that scope.";

  if (/new\s+GlideRecord\s*\(/.test(l)) {
    const table = l.match(/GlideRecord\s*\(\s*['"]([^'"]+)/)?.[1];
    return `Creates a GlideRecord object against ${table ? `the '${table}' table` : "a table"}. Nothing is read from the database yet — this only prepares the query.`;
  }
  if (/\.addActiveQuery\s*\(/.test(l))
    return "Adds the encoded condition active=true. Shorthand for addQuery('active', true).";
  if (/\.addEncodedQuery\s*\(/.test(l))
    return "Applies a full encoded query string — handy for conditions copied from a filter, but it is not validated at runtime.";
  if (/\.addQuery\s*\(/.test(l)) {
    const field = l.match(/addQuery\s*\(\s*['"]([^'"]+)/)?.[1];
    return `Adds a filter on ${field ? `the '${field}' field` : "a field"}. Conditions are ANDed together until query() runs.`;
  }
  if (/\.orderBy(Desc)?\s*\(/.test(l))
    return "Sets the sort order applied by the database when the query executes.";
  if (/\.setLimit\s*\(/.test(l))
    return "Caps how many rows the database returns — a key guard against runaway queries.";
  if (/\.query\s*\(\s*\)/.test(l))
    return "Executes the query against the database. Only after this call does next() have rows to walk.";
  if (/\.get\s*\(/.test(l))
    return "Fetches a single record directly and returns true/false — no loop needed.";
  if (/while\s*\(.*\.next\s*\(\)/.test(l))
    return "Loops over every returned row. Each iteration re-points the same GlideRecord object at the next record.";
  if (/if\s*\(.*\.next\s*\(\)/.test(l))
    return "Reads only the first returned row. Correct for single-record lookups, wrong when you must process every match.";
  if (/\.next\s*\(\)/.test(l))
    return "Advances the cursor to the next record and returns false once the result set is exhausted.";
  if (/\.updateMultiple\s*\(/.test(l))
    return "Updates every record matching the query in one database call — fast, but it skips business rules and workflow.";
  if (/\.update\s*\(\s*\)/.test(l))
    return "Writes the pending field changes for the current record back to the database.";
  if (/\.insert\s*\(\s*\)/.test(l))
    return "Inserts a new record and returns its sys_id.";
  if (/\.deleteRecord\s*\(/.test(l))
    return "Deletes the current record. Irreversible — always confirm the query is scoped first.";
  if (/\.setValue\s*\(/.test(l))
    return "Sets a field value in memory. Nothing persists until update() or insert() is called.";
  if (/\.setAbortAction\s*\(\s*true/.test(l))
    return "Cancels the current database operation — only meaningful in a before business rule.";
  if (/\bprevious\./.test(l))
    return "Reads the pre-change snapshot of the record. Only populated on update operations, never on insert.";
  if (/\bcurrent\./.test(l))
    return "Reads or writes the record currently being processed by this rule/script.";
  if (/g_form\.(setValue|clearValue|setMandatory|setReadOnly|setDisplay|setVisible|addErrorMessage)/.test(l))
    return "Manipulates the form through the supported client API — the safe alternative to touching the DOM.";
  if (/g_form\.getValue/.test(l))
    return "Reads the current on-form value, which may differ from what is stored in the database.";
  if (/\bnewValue\b|\boldValue\b/.test(l))
    return "onChange client scripts receive the old and new field values as arguments — use them instead of re-reading the form.";
  if (/isLoading|isTemplate/.test(l))
    return "Guards the script so it does not run during form load or template application.";
  if (/new\s+GlideAjax\s*\(/.test(l))
    return "Instantiates a GlideAjax call bound to a client-callable Script Include.";
  if (/addParam\s*\(\s*['"]sysparm_name/.test(l))
    return "Names the Script Include method to run on the server.";
  if (/addParam\s*\(/.test(l))
    return "Passes an extra parameter to the server; every custom param must start with sysparm_.";
  if (/getXMLAnswer|getXML\s*\(/.test(l))
    return "Fires the request asynchronously and hands the response to the callback — never blocks the browser.";
  if (/getXMLWait/.test(l))
    return "Blocks the browser thread until the server responds. Unsupported on the client and a serious UX risk.";
  if (/Class\.create\s*\(\)|\bextendsObject\s*\(/.test(l))
    return "Declares the Script Include class. Extending AbstractAjaxProcessor is what makes it client-callable.";
  if (/\btype:\s*/.test(l))
    return "The type property must match the Script Include name or the class will not resolve.";
  if (/gs\.(info|log|print|debug|warn|error)\s*\(/.test(l))
    return "Writes to the system log so you can verify the script's behaviour in the instance.";
  if (/gs\.addInfoMessage|gs\.addErrorMessage/.test(l))
    return "Surfaces a message to the user in the UI banner.";
  if (/gs\.hasRole|gs\.getUserID|gs\.getUser\b/.test(l))
    return "Reads the session user context on the server for permission or ownership checks.";
  if (/^var\s/.test(l) || /^\s*(let|const)\s/.test(l))
    return "Declares a variable used later in the script.";
  if (/^function\s|=\s*function\s*\(/.test(l))
    return "Defines the function body executed when this script runs.";
  if (/^return\b/.test(l))
    return "Returns control (and any value) to the caller — nothing after this line in the block runs.";
  if (/^if\s*\(/.test(l))
    return "Branches: the indented block only runs when this condition is true.";
  return "Executes as part of the script flow.";
}

/**
 * Build a full line-by-line correction report for a failed puzzle attempt.
 * The faulty line is the one holding the answer slot.
 */
export function diagnoseAttempt(q: Question, picked: Option): LineDiagnostic[] {
  const correct = q.options.find((o) => o.correct);
  return q.code.map((rawLine, i) => {
    const hasSlot = rawLine.includes(SLOT);
    const text = hasSlot ? rawLine.replace(SLOT, picked.text) : rawLine;

    if (hasSlot) {
      const why = picked.feedback.explain.trim().split("\n")[0];
      return {
        line: i + 1,
        text,
        status: "error" as const,
        explain: `${picked.feedback.title}. ${why}`,
        suggestion: correct ? rawLine.replace(SLOT, correct.text) : undefined,
      };
    }

    return {
      line: i + 1,
      text,
      status: rawLine.trim() ? ("ok" as const) : ("note" as const),
      explain: explainSnLine(rawLine),
    };
  });
}

/** Short summary used as the heading of the correction panel. */
export function diagnosisSummary(report: LineDiagnostic[]): string {
  const bad = report.filter((r) => r.status === "error").map((r) => r.line);
  if (bad.length === 0) return "No faulty lines detected.";
  return `${bad.length} line${bad.length === 1 ? "" : "s"} need${bad.length === 1 ? "s" : ""} correction — line ${bad.join(", ")}.`;
}
