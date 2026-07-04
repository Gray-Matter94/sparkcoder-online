// Sandboxed executor for the Live Coding Simulator.
// Runs the candidate ServiceNow script in an isolated function scope with
// mocked SN globals (GlideRecord, gs, g_form, GlideAjax, ...), captures
// console-style output, and maps any syntax/runtime error back to the exact
// line the candidate wrote — so the AI coach can point at that line.

export interface SandboxLog {
  level: "info" | "warn" | "error" | "log";
  message: string;
}

export interface SandboxRunResult {
  ok: boolean;
  logs: SandboxLog[];
  /** Zero-based line in the candidate's code where execution failed. */
  errorLine?: number;
  /** Zero-based column, when we can recover it. */
  errorColumn?: number;
  /** e.g. "SyntaxError", "ReferenceError". */
  errorName?: string;
  errorMessage?: string;
  /** ms spent inside the sandbox. */
  durationMs: number;
}

// ------- SN global mocks ---------------------------------------------------

function makeMocks(logs: SandboxLog[]) {
  const push = (level: SandboxLog["level"], args: unknown[]) =>
    logs.push({
      level,
      message: args
        .map((a) => (typeof a === "string" ? a : safeStringify(a)))
        .join(" "),
    });

  class MockGlideRecord {
    tableName: string;
    private _queries: { field: string; op: string; value: unknown }[] = [];
    private _cursor = -1;
    private _rows: Record<string, unknown>[] = [];
    private _limit = Infinity;
    private _order: string[] = [];
    sys_id = "";
    constructor(table: string) {
      this.tableName = String(table);
      // Fabricate a handful of rows so while(gr.next()) actually iterates.
      for (let i = 0; i < 3; i += 1) {
        this._rows.push({ sys_id: `mock_${this.tableName}_${i}`, number: `MOCK${i + 1}` });
      }
    }
    addQuery(field: string, opOrVal: unknown, maybeVal?: unknown) {
      if (arguments.length === 2)
        this._queries.push({ field, op: "=", value: opOrVal });
      else this._queries.push({ field, op: String(opOrVal), value: maybeVal });
      return this;
    }
    addEncodedQuery(_q: string) {
      return this;
    }
    addActiveQuery() {
      return this.addQuery("active", true);
    }
    orderBy(f: string) {
      this._order.push(String(f));
      return this;
    }
    orderByDesc(f: string) {
      this._order.push(`-${String(f)}`);
      return this;
    }
    setLimit(n: number) {
      this._limit = Number(n) || Infinity;
    }
    query() {
      this._cursor = -1;
    }
    next() {
      this._cursor += 1;
      if (this._cursor >= Math.min(this._rows.length, this._limit)) return false;
      const row = this._rows[this._cursor];
      Object.assign(this, row);
      this.sys_id = String(row.sys_id ?? "");
      return true;
    }
    hasNext() {
      return this._cursor + 1 < Math.min(this._rows.length, this._limit);
    }
    getRowCount() {
      return Math.min(this._rows.length, this._limit);
    }
    getUniqueValue() {
      return this.sys_id;
    }
    getValue(f: string) {
      return String((this as unknown as Record<string, unknown>)[f] ?? "");
    }
    getDisplayValue(f?: string) {
      if (!f) return this.sys_id;
      return this.getValue(f);
    }
    setValue(f: string, v: unknown) {
      (this as unknown as Record<string, unknown>)[f] = v;
    }
    setWorkflow(_b: boolean) {}
    autoSysFields(_b: boolean) {}
    initialize() {}
    insert() {
      return `mock_${this.tableName}_ins`;
    }
    update() {
      return this.sys_id || `mock_${this.tableName}_upd`;
    }
    updateMultiple() {}
    deleteRecord() {
      return true;
    }
    deleteMultiple() {}
    get(_a: unknown, _b?: unknown) {
      return this.next();
    }
    canRead() {
      return true;
    }
    canWrite() {
      return true;
    }
  }

  class MockGlideAggregate extends MockGlideRecord {
    addAggregate(_agg: string, _field?: string) {
      return this;
    }
    groupBy(_f: string) {
      return this;
    }
    getAggregate(_agg: string, _f?: string) {
      return "1";
    }
  }

  class MockGlideDateTime {
    private _v: Date;
    constructor(v?: string) {
      this._v = v ? new Date(v) : new Date();
    }
    getNumericValue() {
      return this._v.getTime();
    }
    getDisplayValue() {
      return this._v.toISOString();
    }
    addSeconds(s: number) {
      this._v = new Date(this._v.getTime() + Number(s) * 1000);
    }
    addDaysUTC(d: number) {
      this._v = new Date(this._v.getTime() + Number(d) * 86_400_000);
    }
  }

  class MockGlideAjax {
    private _params: Record<string, string> = {};
    constructor(private _name: string) {}
    addParam(k: string, v: unknown) {
      this._params[String(k)] = String(v);
    }
    getXML(cb: (r: unknown) => void) {
      setTimeout(() => cb({ responseXML: null, responseText: "" }), 0);
    }
    getXMLAnswer(cb: (a: string) => void) {
      setTimeout(() => cb("mock-answer"), 0);
    }
  }

  const gs = {
    info: (...a: unknown[]) => push("info", a),
    log: (...a: unknown[]) => push("log", a),
    print: (...a: unknown[]) => push("log", a),
    warn: (...a: unknown[]) => push("warn", a),
    error: (...a: unknown[]) => push("error", a),
    addInfoMessage: (...a: unknown[]) => push("info", a),
    addErrorMessage: (...a: unknown[]) => push("error", a),
    getUser: () => ({ getID: () => "mock-user", getName: () => "mock.user" }),
    getUserID: () => "mock-user",
    getUserName: () => "mock.user",
    hasRole: (_r: string) => true,
    nil: (v: unknown) => v === undefined || v === null || v === "",
    now: () => new Date().toISOString(),
    beginningOfToday: () => new Date().toISOString(),
    endOfToday: () => new Date().toISOString(),
    getProperty: (_k: string, d?: unknown) => d ?? "",
  };

  const g_form = {
    _values: {} as Record<string, unknown>,
    getValue(f: string) {
      return (this._values[f] as string) ?? "";
    },
    setValue(f: string, v: unknown) {
      this._values[f] = v;
    },
    setDisplay(_f: string, _b: boolean) {},
    setMandatory(_f: string, _b: boolean) {},
    setReadOnly(_f: string, _b: boolean) {},
    setVisible(_f: string, _b: boolean) {},
    clearValue(f: string) {
      this._values[f] = "";
    },
    addInfoMessage: (...a: unknown[]) => push("info", a),
    addErrorMessage: (...a: unknown[]) => push("error", a),
    clearMessages() {},
    isNewRecord: () => false,
  };

  const g_user = {
    userID: "mock-user",
    userName: "mock.user",
    hasRole: (_r: string) => true,
    hasRoleExactly: (_r: string) => true,
  };

  const current: Record<string, unknown> = {
    sys_id: "mock-current",
    getValue: (f: string) => String((current as Record<string, unknown>)[f] ?? ""),
    setValue: (f: string, v: unknown) => {
      (current as Record<string, unknown>)[f] = v;
    },
    getUniqueValue: () => "mock-current",
  };
  const previous: Record<string, unknown> = { ...current, sys_id: "mock-previous" };

  return {
    GlideRecord: MockGlideRecord,
    GlideRecordSecure: MockGlideRecord,
    GlideAggregate: MockGlideAggregate,
    GlideDateTime: MockGlideDateTime,
    GlideAjax: MockGlideAjax,
    gs,
    g_form,
    g_user,
    current,
    previous,
    answer: undefined,
  };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ------- Line mapping ------------------------------------------------------

// We wrap the candidate code in an IIFE. The wrapper adds ONE line above the
// candidate's line 1 — subtract that offset when reporting to the user.
const WRAPPER_LINE_OFFSET = 1;

interface ParsedLoc {
  line: number; // 1-based, in candidate code
  column?: number;
}

function parseErrorLocation(err: unknown, sourceUrl: string): ParsedLoc | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as { stack?: string; lineNumber?: number; columnNumber?: number };

  // Firefox exposes lineNumber directly.
  if (typeof e.lineNumber === "number" && e.lineNumber > 0) {
    return {
      line: Math.max(1, e.lineNumber - WRAPPER_LINE_OFFSET),
      column: e.columnNumber,
    };
  }

  const stack = e.stack;
  if (typeof stack !== "string") return undefined;
  // Look for `sourceUrl:<line>:<col>` (V8 / WebKit) or `@sourceUrl:<line>:<col>` (SM).
  const escaped = sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}:(\\d+):(\\d+)`);
  const m = stack.match(re);
  if (!m) return undefined;
  const rawLine = Number(m[1]);
  const col = Number(m[2]);
  const line = Math.max(1, rawLine - WRAPPER_LINE_OFFSET);
  return { line, column: col };
}

// ------- Runner ------------------------------------------------------------

export function runSandbox(userCode: string, timeoutMs = 750): SandboxRunResult {
  const logs: SandboxLog[] = [];
  const mocks = makeMocks(logs);
  const start = performance.now();
  const sourceUrl = `sn-candidate-${Math.random().toString(36).slice(2, 8)}.js`;

  // Wrap in a function so `return` at top-level is legal and globals scope
  // cleanly. Extra `\n` before user code keeps our offset predictable.
  const wrapped =
    `"use strict"; return (function(GlideRecord, GlideRecordSecure, GlideAggregate, GlideDateTime, GlideAjax, gs, g_form, g_user, current, previous){\n` +
    userCode +
    `\n/*__sn_end__*/}).apply(null, arguments);\n//# sourceURL=${sourceUrl}`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function(wrapped);

    // Cooperative timeout via Date.now polling isn't possible without
    // rewriting loops; a Function.call has no built-in cancel. We keep it
    // best-effort: infinite loops will hang the tab, so we set a wall-clock
    // guard against pathological cases by only allowing runs when the
    // parsed AST has no obvious `while(true)` / `for(;;)` patterns.
    if (looksLikeInfiniteLoop(userCode)) {
      return {
        ok: false,
        logs,
        errorLine: findLine(userCode, /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/) ?? 0,
        errorName: "SandboxError",
        errorMessage:
          "Refusing to run: detected an unbounded loop (while(true) / for(;;)). Add a termination condition.",
        durationMs: performance.now() - start,
      };
    }

    fn.call(
      null,
      mocks.GlideRecord,
      mocks.GlideRecordSecure,
      mocks.GlideAggregate,
      mocks.GlideDateTime,
      mocks.GlideAjax,
      mocks.gs,
      mocks.g_form,
      mocks.g_user,
      mocks.current,
      mocks.previous,
    );

    const durationMs = performance.now() - start;
    if (durationMs > timeoutMs) {
      return {
        ok: false,
        logs,
        errorName: "TimeoutError",
        errorMessage: `Script took ${durationMs.toFixed(0)}ms (limit ${timeoutMs}ms).`,
        durationMs,
      };
    }
    return { ok: true, logs, durationMs };
  } catch (err) {
    const loc = parseErrorLocation(err, sourceUrl);
    const e = err as Error;
    return {
      ok: false,
      logs,
      errorLine: loc ? loc.line - 1 : undefined,
      errorColumn: loc?.column,
      errorName: e?.name ?? "Error",
      errorMessage: e?.message ?? String(err),
      durationMs: performance.now() - start,
    };
  }
}

function looksLikeInfiniteLoop(code: string): boolean {
  return /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/.test(code);
}

function findLine(code: string, re: RegExp): number | undefined {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i += 1) if (re.test(lines[i])) return i;
  return undefined;
}
