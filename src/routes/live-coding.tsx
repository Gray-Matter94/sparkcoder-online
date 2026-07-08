import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LIVE_CODING_QUESTIONS,
  LIVE_CODING_TOTAL,
  validateSolution,
  acceptAsAlternative,
  type LiveCodingQuestion,
  type Side,
  type ValidationResult,
} from "@/lib/live-coding-questions";
import {
  suggestAlternatives,
  type Alternative,
} from "@/lib/live-coding-alternatives.functions";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { runSandbox, type SandboxRunResult } from "@/lib/live-coding-sandbox";


export const Route = createFileRoute("/live-coding")({
  head: () => ({
    meta: [
      { title: "Live Coding Simulator — SparkCoder" },
      {
        name: "description",
        content:
          "Write ServiceNow scripts in an instance-style editor. 2000+ server & client tasks with an AI coach that points at the exact failing line.",
      },
      { property: "og:title", content: "Live Coding Simulator — SparkCoder" },
      {
        property: "og:description",
        content:
          "Practice ServiceNow scripting like a real interview: a live coding pane, AI feedback on the failing line, 500 curated tasks.",
      },
      { property: "og:url", content: "https://www.sparkcoder.online/live-coding" },
    ],
    links: [{ rel: "canonical", href: "https://www.sparkcoder.online/live-coding" }],
  }),
  component: LiveCoding,
});

// ------- Syntax highlighter (line-aware) -----------------------------------

const KEYWORDS =
  /\b(var|let|const|while|if|else|return|function|new|for|true|false|null|undefined)\b/g;
const STRINGS = /'([^'\\]|\\.)*'|"([^"\\]|\\.)*"/g;
const APIS =
  /\b(GlideRecord|GlideAggregate|GlideRecordSecure|GlideAjax|GlideDateTime|gs|g_form|g_user|current|previous|answer)\b/g;
const COMMENTS = /\/\/.*$/;

type Tok = { t: string; c: string };

function highlightLine(line: string): Tok[] {
  const cm = line.match(COMMENTS);
  const codePart = cm ? line.slice(0, cm.index!) : line;
  const commentPart = cm ? line.slice(cm.index!) : "";

  const tokens: Tok[] = [{ t: codePart, c: "text-zinc-100" }];
  const split = (re: RegExp, cls: string) => {
    const out: Tok[] = [];
    for (const tok of tokens) {
      if (tok.c !== "text-zinc-100") {
        out.push(tok);
        continue;
      }
      let last = 0;
      const s = tok.t;
      const r = new RegExp(re.source, re.flags);
      let m: RegExpExecArray | null;
      while ((m = r.exec(s)) !== null) {
        if (m.index > last) out.push({ t: s.slice(last, m.index), c: "text-zinc-100" });
        out.push({ t: m[0], c: cls });
        last = m.index + m[0].length;
        if (m.index === r.lastIndex) r.lastIndex += 1;
      }
      if (last < s.length) out.push({ t: s.slice(last), c: "text-zinc-100" });
    }
    return out;
  };

  let arr = tokens;
  arr = ((): Tok[] => {
    tokens.splice(0, tokens.length, ...split(STRINGS, "text-emerald-300"));
    return tokens;
  })();
  arr = ((): Tok[] => {
    tokens.splice(0, tokens.length, ...split(KEYWORDS, "text-pink-400"));
    return tokens;
  })();
  arr = ((): Tok[] => {
    tokens.splice(0, tokens.length, ...split(APIS, "text-amber-300"));
    return tokens;
  })();

  if (commentPart) arr.push({ t: commentPart, c: "text-zinc-400 italic" });
  return arr;
}

// ------- Line explainer ----------------------------------------------------
// Produces a short, human-readable "// comment" describing what the line does,
// and a quick heuristic flag for whether the line looks syntactically wrong.
// Sandbox errorLine still owns the authoritative "wrong" verdict.

function isLineLikelyBad(line: string): boolean {
  const stripped = line.replace(/\/\/.*$/, "");
  // Odd number of unescaped quotes on a single line → unterminated string.
  const singles = (stripped.match(/(^|[^\\])'/g) || []).length;
  const doubles = (stripped.match(/(^|[^\\])"/g) || []).length;
  if (singles % 2 === 1 || doubles % 2 === 1) return true;
  return false;
}

function explainLine(raw: string): string {
  const line = raw.trim();
  if (!line) return "";
  if (/^\/\//.test(line)) return "author comment";
  if (/^\/\*|\*\/\s*$/.test(line)) return "block comment";
  if (/^\}\s*else\s*\{?$/.test(line)) return "else branch — runs when the if condition is false";
  if (/^\}\s*else\s+if\s*\(/.test(line)) return "else-if branch — tests the next condition";
  if (/^\}\)?;?\s*$/.test(line)) return "closes the previous block";
  if (/^\{\s*$/.test(line)) return "opens a new block";

  // Variable declarations for common ServiceNow objects.
  const decl = line.match(/^\s*(var|let|const)\s+(\w+)\s*=\s*new\s+(\w+)\s*\(\s*['"]?([^'")]*)['"]?\s*\)/);
  if (decl) {
    const [, , name, cls, arg] = decl;
    if (cls === "GlideRecord")
      return `create a GlideRecord "${name}" pointing at the ${arg || "?"} table`;
    if (cls === "GlideRecordSecure")
      return `create an ACL-aware GlideRecord "${name}" on ${arg || "?"}`;
    if (cls === "GlideAggregate")
      return `create a GlideAggregate "${name}" to group/count rows on ${arg || "?"}`;
    if (cls === "GlideDateTime")
      return `create a GlideDateTime "${name}"${arg ? ` for ${arg}` : ""}`;
    if (cls === "GlideAjax")
      return `create a client-side GlideAjax caller for Script Include "${arg}"`;
    return `declare "${name}" as a new ${cls}(${arg})`;
  }

  if (/^\s*(var|let|const)\s+\w+\s*=/.test(line)) {
    const m = line.match(/^\s*(?:var|let|const)\s+(\w+)/);
    return `declare local variable "${m?.[1] ?? ""}"`;
  }

  if (/\.addEncodedQuery\s*\(/.test(line)) return "apply an encoded query filter";
  if (/\.addActiveQuery\s*\(/.test(line)) return "filter to active records only";
  if (/\.addQuery\s*\(/.test(line)) {
    const m = line.match(/addQuery\s*\(\s*['"]([^'"]+)['"]/);
    return m ? `filter where ${m[1]} matches the given value` : "add a filter condition";
  }
  if (/\.orderByDesc\s*\(/.test(line)) return "sort results descending";
  if (/\.orderBy\s*\(/.test(line)) return "sort results ascending";
  if (/\.setLimit\s*\(/.test(line)) return "cap the number of rows returned";
  if (/\.query\s*\(\s*\)/.test(line)) return "execute the database query";
  if (/while\s*\(\s*\w+\.next\s*\(\s*\)\s*\)/.test(line)) return "loop over every matching row";
  if (/if\s*\(\s*\w+\.next\s*\(\s*\)\s*\)/.test(line)) return "advance to the first matching row";
  if (/\.next\s*\(\s*\)/.test(line)) return "step to the next row";
  if (/\.getValue\s*\(/.test(line)) {
    const m = line.match(/getValue\s*\(\s*['"]([^'"]+)['"]/);
    return m ? `read the raw value of the ${m[1]} field` : "read a raw field value";
  }
  if (/\.getDisplayValue\s*\(/.test(line)) return "read the human-readable display value";
  if (/\.setValue\s*\(/.test(line)) {
    const m = line.match(/setValue\s*\(\s*['"]([^'"]+)['"]/);
    return m ? `set the ${m[1]} field` : "set a field value";
  }
  if (/\.update\s*\(\s*\)/.test(line)) return "persist changes to the current row";
  if (/\.insert\s*\(\s*\)/.test(line)) return "insert a new row and return its sys_id";
  if (/\.deleteRecord\s*\(\s*\)/.test(line)) return "delete the current row";
  if (/\.deleteMultiple\s*\(\s*\)/.test(line)) return "delete every row matching the query";
  if (/\.updateMultiple\s*\(\s*\)/.test(line)) return "bulk-update every row matching the query";

  if (/gs\.(info|log|print)\s*\(/.test(line)) return "log an info message to system log";
  if (/gs\.warn\s*\(/.test(line)) return "log a warning to system log";
  if (/gs\.error\s*\(/.test(line)) return "log an error to system log";
  if (/gs\.addInfoMessage\s*\(/.test(line)) return "show an info banner to the user";
  if (/gs\.addErrorMessage\s*\(/.test(line)) return "show an error banner to the user";
  if (/gs\.hasRole\s*\(/.test(line)) return "check whether current user has the given role";
  if (/gs\.getUser(ID|Name)?\s*\(/.test(line)) return "read the current user identity";

  if (/g_form\.getValue\s*\(/.test(line)) return "read a field value from the client form";
  if (/g_form\.setValue\s*\(/.test(line)) return "set a field value on the client form";
  if (/g_form\.setMandatory\s*\(/.test(line)) return "toggle whether a field is required";
  if (/g_form\.setReadOnly\s*\(/.test(line)) return "toggle a field's read-only state";
  if (/g_form\.setVisible\s*\(/.test(line)) return "show or hide a field on the form";
  if (/g_form\.setDisplay\s*\(/.test(line)) return "show or hide a field (with layout)";
  if (/g_form\.addInfoMessage\s*\(/.test(line)) return "show an info message on the form";
  if (/g_form\.addErrorMessage\s*\(/.test(line)) return "show an error message on the form";
  if (/g_form\.clearMessages\s*\(/.test(line)) return "clear all form messages";

  if (/^function\s+\w+\s*\(/.test(line)) {
    const m = line.match(/^function\s+(\w+)/);
    return `define function "${m?.[1] ?? ""}"`;
  }
  if (/^\s*function\s*\(/.test(line)) return "anonymous function";
  if (/^return\b/.test(line)) return "return a value from the function";
  if (/^if\s*\(/.test(line)) return "conditional check";
  if (/^for\s*\(/.test(line)) return "for-loop iteration";
  if (/^while\s*\(/.test(line)) return "while-loop iteration";
  if (/\.addParam\s*\(/.test(line)) return "attach a GlideAjax parameter";
  if (/\.getXMLAnswer\s*\(/.test(line)) return "call Script Include, receive answer async";
  if (/\.getXML\s*\(/.test(line)) return "call Script Include, receive full XML async";

  return "statement";
}

// ------- Component ---------------------------------------------------------

type Filter = "all" | Side;

function LiveCoding() {
  const { progress, award } = useProgress();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const list = useMemo(() => {
    const bySide =
      filter === "all"
        ? LIVE_CODING_QUESTIONS
        : LIVE_CODING_QUESTIONS.filter((q) => q.side === filter);
    const needle = query.trim().toLowerCase();
    if (!needle) return bySide;
    const terms = needle.split(/\s+/).filter(Boolean);
    return bySide.filter((q) => {
      const hay = `${q.title} ${q.task} ${q.scriptType} ${q.filename} ${q.id}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [filter, query]);
  useEffect(() => {
    setIdx(0);
    setPage(0);
  }, [filter, query]);
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => {
    setPage(Math.floor(idx / PAGE_SIZE));
  }, [idx]);


  const q: LiveCodingQuestion =
    list[Math.min(idx, Math.max(0, list.length - 1))] ?? LIVE_CODING_QUESTIONS[0];
  const noResults = list.length === 0;


  const [code, setCode] = useState<string>(q.starter);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [sandbox, setSandbox] = useState<SandboxRunResult | null>(null);
  const [ran, setRan] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [patch, setPatch] = useState<string>("");
  const [patchMode, setPatchMode] = useState<"replace" | "insert">("replace");
  const [correctionDismissed, setCorrectionDismissed] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternative[] | null>(null);
  const [altsLoading, setAltsLoading] = useState(false);
  const [altsError, setAltsError] = useState<string | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const fetchAlternatives = useServerFn(suggestAlternatives);

  useEffect(() => {
    setCode(q.starter);
    setResult(null);
    setSandbox(null);
    setRan(false);
    setShowSolution(false);
    setPatch("");
    setPatchMode("replace");
    setCorrectionDismissed(false);
    setAlternatives(null);
    setAltsError(null);
  }, [q.id]);

  function handleRun(nextCode: string = code) {
    if (nextCode !== code) setCode(nextCode);
    const sb = runSandbox(nextCode);
    setSandbox(sb);
    let res: ValidationResult;
    if (!sb.ok) {
      res = {
        ok: false,
        passedCount: 0,
        totalChecks: q.checks.length,
        errorLine: sb.errorLine,
        message: `${sb.errorName ?? "Error"}: ${sb.errorMessage ?? "Script failed to execute."}`,
      };
    } else {
      res = validateSolution(q, nextCode);
      // Behavior-based acceptance: valid alternative approach.
      if (!res.ok && acceptAsAlternative(q, nextCode, true)) {
        res = {
          ok: true,
          passedCount: res.totalChecks,
          totalChecks: res.totalChecks,
          alternativeAccepted: true,
          message:
            "Alternative approach accepted — your script runs cleanly and uses the right APIs to satisfy the task.",
        };
      }
    }
    setResult(res);
    setRan(true);
    setCorrectionDismissed(false);
    if (sb.ok && res.ok) {
      award(`live-${q.id}`, 40);
    }
  }

  async function loadAlternatives() {
    setAltsLoading(true);
    setAltsError(null);
    try {
      const out = await fetchAlternatives({
        data: {
          questionId: q.id,
          side: q.side,
          scriptType: q.scriptType,
          title: q.title,
          task: q.task,
          referenceSolution: q.solution,
        },
      });
      setAlternatives(out.alternatives);
    } catch (err) {
      setAltsError(err instanceof Error ? err.message : "Failed to load alternatives.");
    } finally {
      setAltsLoading(false);
    }
  }

  function nextQuestion() {
    setIdx((i) => Math.min(list.length - 1, i + 1));
  }
  function prevQuestion() {
    setIdx((i) => Math.max(0, i - 1));
  }

  function onTab(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = code.slice(0, start) + "  " + code.slice(end);
      setCode(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  }

  // Keep pre scroll in sync with textarea so highlight aligns.
  function onScroll() {
    if (editorRef.current && preRef.current) {
      preRef.current.scrollTop = editorRef.current.scrollTop;
      preRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  }

  const [caretLine, setCaretLine] = useState<number>(-1);
  function syncCaret() {
    const el = editorRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const line = code.slice(0, pos).split("\n").length - 1;
    setCaretLine(line);
  }

  const lines = code.split("\n");
  const errorLine = ran && result && !result.ok ? result.errorLine : undefined;

  // ---- Correction mode: derive column range + suggested patch ------------
  const correction = useMemo(() => {
    if (!ran || !result || result.ok || errorLine === undefined) return null;
    const line = lines[errorLine] ?? "";

    // Column range: try to locate a keyword from the needle inside the line
    // so we can highlight the exact character range that's off. Falls back to
    // the sandbox column, then the whole line.
    let columnStart = 0;
    let columnEnd = line.length;
    if (result.needle) {
      const kw = result.needle.split(/[^A-Za-z_]/).find((w) => w.length > 3);
      if (kw) {
        const idxIn = line.indexOf(kw);
        if (idxIn >= 0) {
          columnStart = idxIn;
          columnEnd = idxIn + kw.length;
        }
      }
    } else if (sandbox && !sandbox.ok && typeof sandbox.errorColumn === "number") {
      columnStart = Math.max(0, sandbox.errorColumn - 1);
      columnEnd = Math.min(line.length, columnStart + 1);
    }

    // Suggested patch: the exact solution line where the missing pattern
    // lives, or (for sandbox crashes) the aligned solution line, or the
    // whole reference solution as a last resort.
    const solutionLines = q.solution.split("\n");
    let suggestedPatch = "";
    if (typeof result.solutionLine === "number" && solutionLines[result.solutionLine]) {
      suggestedPatch = solutionLines[result.solutionLine];
    } else if (solutionLines[errorLine]) {
      suggestedPatch = solutionLines[errorLine];
    } else {
      suggestedPatch = q.solution;
    }

    // Choose default mode: replace when the user's line is blank/comment,
    // otherwise insert after it so we don't clobber real work.
    const looksBlank = /^\s*(\/\/.*)?$/.test(line);
    return {
      line,
      errorLine,
      columnStart,
      columnEnd,
      suggestedPatch,
      defaultMode: looksBlank ? ("replace" as const) : ("insert" as const),
    };
  }, [ran, result, errorLine, lines, sandbox, q.solution]);

  // Prime the editable patch whenever a new correction becomes active.
  useEffect(() => {
    if (correction) {
      setPatch(correction.suggestedPatch);
      setPatchMode(correction.defaultMode);
    }
  }, [correction?.suggestedPatch, correction?.defaultMode, correction]);

  function applyPatchAndRun() {
    if (!correction) return;
    const src = lines.slice();
    if (patchMode === "replace") {
      src.splice(correction.errorLine, 1, ...patch.split("\n"));
    } else {
      src.splice(correction.errorLine + 1, 0, ...patch.split("\n"));
    }
    const nextCode = src.join("\n");
    handleRun(nextCode);
  }

  const serverCount = LIVE_CODING_QUESTIONS.filter((x) => x.side === "server").length;
  const clientCount = LIVE_CODING_QUESTIONS.filter((x) => x.side === "client").length;

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-5">
        <header className="space-y-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">💻</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold">
              SN Dev · Live Coding Simulator
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-[1]">
            Live Coding <span className="text-amber-300">Simulator.</span>
          </h1>
          <p className="text-xs text-muted-foreground max-w-xl">
            {LIVE_CODING_TOTAL} interview-grade tasks ({serverCount} server-side · {clientCount}{" "}
            client-side). The AI interviewer briefs you, you write the full script, and if you slip
            it points at the exact line to fix — just like a real ServiceNow instance review.
          </p>
        </header>

        {/* search + filters + navigator */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div
              role="tablist"
              aria-label="Filter tasks by side"
              className="inline-flex p-1 rounded-xl border-2 border-border bg-panel"
            >
              {(
                [
                  { id: "all" as const, label: "ALL", count: LIVE_CODING_TOTAL },
                  { id: "server" as const, label: "SERVER", count: serverCount },
                  { id: "client" as const, label: "CLIENT", count: clientCount },
                ]
              ).map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={filter === t.id}
                  onClick={() => setFilter(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-widest transition-all ${
                    filter === t.id
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} · {t.count}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <button
                onClick={prevQuestion}
                disabled={idx === 0 || noResults}
                aria-label="Previous task"
                className="size-8 grid place-items-center rounded-lg bg-panel border border-border disabled:opacity-30 hover:border-accent"
              >
                ‹
              </button>
              <span aria-live="polite">
                {noResults ? "0/0" : `#${idx + 1}/${list.length}`}
              </span>
              <button
                onClick={nextQuestion}
                disabled={idx >= list.length - 1 || noResults}
                aria-label="Next task"
                className="size-8 grid place-items-center rounded-lg bg-panel border border-border disabled:opacity-30 hover:border-accent"
              >
                ›
              </button>
            </div>
          </div>

          <div className="relative">
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
            >
              🔍
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 500 tasks — try 'GlideAggregate', 'onChange', 'incident'…"
              aria-label="Search live coding tasks by keyword"
              className="w-full h-10 pl-9 pr-24 rounded-xl bg-panel border-2 border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-amber-500/60"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 rounded-lg bg-zinc-800 text-[10px] font-bold tracking-widest text-muted-foreground hover:text-foreground border border-zinc-700"
              >
                CLEAR
              </button>
            )}
          </div>
          {query && (
            <p className="text-[11px] text-muted-foreground font-mono">
              {noResults
                ? `No tasks match "${query}"${filter !== "all" ? ` in ${filter.toUpperCase()}` : ""}.`
                : `${list.length} match${list.length === 1 ? "" : "es"} for "${query}"${
                    filter !== "all" ? ` in ${filter.toUpperCase()}` : ""
                  }.`}
            </p>
          )}
        </div>

        {noResults && (
          <section
            role="status"
            className="rounded-2xl border-2 border-dashed border-border bg-panel p-6 text-center space-y-2"
          >
            <p className="text-sm font-bold">No matching tasks</p>
            <p className="text-xs text-muted-foreground">
              Try a broader keyword, or reset the SERVER/CLIENT filter.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="mt-2 px-3 h-9 rounded-lg bg-zinc-800 text-amber-300 text-[11px] font-bold tracking-widest border border-zinc-700 hover:border-amber-500/50"
            >
              RESET FILTERS
            </button>
          </section>
        )}

        {!noResults && (
          <section
            aria-label="Browse tasks"
            className="rounded-2xl border-2 border-border bg-panel p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[11px] font-bold tracking-widest text-muted-foreground">
                BROWSE · showing {currentPage * PAGE_SIZE + 1}–
                {Math.min(list.length, (currentPage + 1) * PAGE_SIZE)} of {list.length}
              </p>
              <div className="flex items-center gap-1 font-mono text-xs">
                <button
                  onClick={() => setPage(0)}
                  disabled={currentPage === 0}
                  aria-label="First page"
                  className="h-7 px-2 rounded-md bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:border-accent"
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                  className="h-7 px-2 rounded-md bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:border-accent"
                >
                  ‹
                </button>
                <span aria-live="polite" className="px-2 text-muted-foreground">
                  page {currentPage + 1}/{pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Next page"
                  className="h-7 px-2 rounded-md bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:border-accent"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(pageCount - 1)}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Last page"
                  className="h-7 px-2 rounded-md bg-zinc-800 border border-zinc-700 disabled:opacity-30 hover:border-accent"
                >
                  »
                </button>
              </div>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {list
                .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                .map((item, i) => {
                  const globalIdx = currentPage * PAGE_SIZE + i;
                  const active = globalIdx === idx;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setIdx(globalIdx)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full text-left px-2.5 py-2 rounded-lg border font-mono text-[11px] transition-colors ${
                          active
                            ? "bg-amber-500/15 border-amber-500/60 text-amber-200"
                            : "bg-zinc-900/60 border-zinc-800 hover:border-accent"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground shrink-0">
                            #{globalIdx + 1}
                          </span>
                          <span
                            className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-widest ${
                              item.side === "server"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-sky-500/15 text-sky-300"
                            }`}
                          >
                            {item.side === "server" ? "SRV" : "CLI"}
                          </span>
                          <span className="truncate">{item.title}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </section>
        )}




        {/* Interviewer prompt */}
        <section
          aria-label="AI interviewer prompt"
          className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-2"
        >
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300 font-bold">
            <span className="size-6 rounded-full bg-amber-500/20 grid place-items-center">🤖</span>
            AI Interviewer
            <span className="ml-auto text-muted-foreground">
              {q.side === "server" ? "SERVER-SIDE" : "CLIENT-SIDE"} · {q.scriptType}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold leading-tight">{q.title}</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">{q.task}</p>
        </section>

        {/* Instance-style editor */}
        <section
          aria-label="Script editor"
          className="rounded-2xl overflow-hidden border-2 border-border bg-zinc-950 shadow-2xl"
        >
          <div className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border-b border-border">
            <div className="size-2 rounded-full bg-red-500/60" />
            <div className="size-2 rounded-full bg-amber-500/60" />
            <div className="size-2 rounded-full bg-green-500/60" />
            <span className="ml-2 text-[10px] text-muted-foreground font-mono truncate">
              instance ▸ Studio ▸ {q.filename}
            </span>
            <span className="ml-auto text-[10px] font-mono text-emerald-400/80 hidden sm:inline">
              dev10294 · JavaScript
            </span>
          </div>

          <div className="relative font-mono text-[13px] leading-6">
            {/* Line-number gutter + highlighted pre background */}
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 m-0 overflow-hidden pointer-events-none whitespace-pre p-0"
              style={{ tabSize: 2 }}
            >
              {lines.map((line, i) => {
                const isErr = errorLine === i;
                return (
                  <div
                    key={i}
                    className={`flex ${isErr ? "bg-destructive/30 border-l-4 border-l-destructive" : ""}`}
                  >
                    <span
                      role={isErr ? "img" : undefined}
                      aria-label={
                        isErr ? `Line ${i + 1} — error, needs fix` : undefined
                      }
                      className={`select-none px-2 py-0 text-right w-12 shrink-0 border-r border-zinc-800 font-bold ${
                        isErr
                          ? "text-destructive-foreground bg-destructive"
                          : "text-zinc-400 bg-zinc-900/60"
                      }`}
                    >
                      {isErr ? (
                        <span className="inline-flex items-center gap-0.5 justify-end">
                          <span aria-hidden="true">⚠</span>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                        </span>
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="pl-3 pr-4 whitespace-pre">
                      {isErr && (
                        <span className="sr-only">
                          Error on line {i + 1}. Fix required.{" "}
                        </span>
                      )}
                      {line.length === 0 ? (
                        <span>&nbsp;</span>
                      ) : isErr && correction && correction.columnEnd > correction.columnStart ? (
                        // Split the error line into pre / [range] / post so we
                        // can bg-highlight the exact failing chars while still
                        // syntax-coloring the outer segments. Inside the range
                        // we force the destructive-foreground so contrast on
                        // the red block stays AA-compliant regardless of the
                        // underlying syntax token color.
                        (() => {
                          const pre = line.slice(0, correction.columnStart);
                          const mid = line.slice(correction.columnStart, correction.columnEnd);
                          const post = line.slice(correction.columnEnd);
                          const paint = (s: string) =>
                            s.length === 0
                              ? null
                              : highlightLine(s).map((tok, j) => (
                                  <span key={j} className={tok.c}>
                                    {tok.t}
                                  </span>
                                ));
                          return (
                            <>
                              {paint(pre)}
                              <span
                                className="bg-destructive text-destructive-foreground font-bold rounded-sm underline decoration-wavy decoration-destructive-foreground underline-offset-2 px-0.5"
                                aria-label={`Failing range: ${mid}`}
                              >
                                {mid || " "}
                              </span>
                              {paint(post)}
                            </>
                          );
                        })()
                      ) : (
                        highlightLine(line).map((tok, j) => (
                          <Fragment key={j}>
                            <span className={tok.c}>{tok.t}</span>
                          </Fragment>
                        ))
                      )}
                    </span>
                  </div>
                );
              })}
              {/* trailing padding so caret at last line stays visible */}
              <div>&nbsp;</div>
            </pre>

            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setRan(false);
              }}
              onKeyDown={onTab}
              onScroll={onScroll}
              spellCheck={false}
              aria-label="ServiceNow script editor"
              className="relative block w-full min-h-[320px] bg-transparent text-transparent caret-amber-300 selection:bg-amber-500/30 outline-none resize-y whitespace-pre p-0"
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                lineHeight: "inherit",
                tabSize: 2,
                paddingLeft: "calc(3rem + 0.75rem)",
                paddingRight: "1rem",
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-zinc-900 border-t border-border">
            <button
              onClick={() => handleRun()}
              aria-label="Run script in sandbox and check against required patterns"
              className="px-4 h-10 rounded-lg bg-emerald-500 text-emerald-950 font-display tracking-wider text-sm shadow-[0_4px_0_#065f46] active:translate-y-0.5 active:shadow-none"
            >
              ▶ RUN &amp; CHECK
            </button>
            <button
              onClick={() => {
                setCode(q.starter);
                setResult(null);
                setSandbox(null);
                setRan(false);
              }}
              className="px-3 h-10 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold tracking-widest border border-zinc-700 hover:border-zinc-500"
            >
              RESET
            </button>
            <button
              onClick={() => setShowSolution((s) => !s)}
              className="px-3 h-10 rounded-lg bg-zinc-800 text-amber-300 text-xs font-bold tracking-widest border border-zinc-700 hover:border-amber-500/50"
            >
              {showSolution ? "HIDE SOLUTION" : "SHOW SOLUTION"}
            </button>
            <span className="ml-auto text-[10px] text-muted-foreground font-mono">
              {lines.length} lines · {code.length} chars
              {sandbox && ` · ${sandbox.durationMs.toFixed(0)}ms`}
            </span>
          </div>
        </section>

        {/* Sandbox execution output */}
        {ran && sandbox && (
          <section
            aria-label="Sandbox execution output"
            className={`rounded-2xl border-2 p-4 shadow-2xl ${
              sandbox.ok
                ? "bg-zinc-950 border-emerald-500/40"
                : "bg-zinc-950 border-destructive/60"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-xs">
              <span className="text-base">{sandbox.ok ? "🟢" : "🔴"}</span>
              <span className={sandbox.ok ? "text-emerald-400" : "text-destructive"}>
                {sandbox.ok ? "Sandbox: passed" : "Sandbox: failed"}
              </span>
              <span className="ml-auto font-mono text-muted-foreground normal-case tracking-normal">
                {sandbox.logs.length} log{sandbox.logs.length === 1 ? "" : "s"} ·{" "}
                {sandbox.durationMs.toFixed(0)}ms
              </span>
            </div>
            {!sandbox.ok && (
              <p className="text-sm text-destructive/90 mb-2">
                <strong>
                  {sandbox.errorName ?? "Error"} at line {(sandbox.errorLine ?? 0) + 1}
                  {sandbox.errorColumn ? `:${sandbox.errorColumn}` : ""}:
                </strong>{" "}
                {sandbox.errorMessage}
              </p>
            )}
            {sandbox.logs.length > 0 ? (
              <pre className="text-[12px] font-mono overflow-x-auto p-3 rounded-lg bg-black border border-zinc-800 max-h-56">
                {sandbox.logs.map((l, i) => {
                  const glyph =
                    l.level === "error"
                      ? "✕"
                      : l.level === "warn"
                        ? "⚠"
                        : l.level === "info"
                          ? "ℹ"
                          : "›";
                  const tone =
                    l.level === "error"
                      ? "text-destructive"
                      : l.level === "warn"
                        ? "text-amber-300"
                        : l.level === "info"
                          ? "text-emerald-300"
                          : "text-zinc-300";
                  return (
                    <div key={i} className={tone}>
                      <span aria-hidden="true" className="inline-block w-4 mr-1 font-bold">
                        {glyph}
                      </span>
                      <span className="text-zinc-400 mr-2 font-bold">
                        [{l.level.toUpperCase().padEnd(5)}]
                      </span>
                      <span className="sr-only">{l.level}: </span>
                      {l.message}
                    </div>
                  );
                })}
              </pre>
            ) : sandbox.ok ? (
              <p className="text-[11px] text-muted-foreground font-mono">
                Script executed cleanly with no output. Add gs.info(...) calls to trace values.
              </p>
            ) : null}
          </section>
        )}


        {/* AI coach feedback */}
        {ran && result && (
          <section
            role={result.ok ? "status" : "alert"}
            aria-live={result.ok ? "polite" : "assertive"}
            className={`rounded-2xl border-2 p-4 animate-pop shadow-2xl ${
              result.ok
                ? "bg-emerald-500/10 border-emerald-500 shadow-emerald-500/20"
                : "bg-destructive/10 border-destructive shadow-destructive/20"
            }`}
          >
            <div
              className={`flex items-center gap-2 mb-2 font-bold uppercase tracking-widest text-xs ${
                result.ok ? "text-emerald-400" : "text-destructive"
              }`}
            >
              <span className="text-base">{result.ok ? "✓" : "✕"}</span>
              <span>
                {result.ok
                  ? result.alternativeAccepted
                    ? "Alternative approach accepted"
                    : "Script accepted"
                  : "AI Coach — needs a fix"}
              </span>
              <span className="ml-auto font-mono text-muted-foreground">
                {result.passedCount}/{result.totalChecks} checks
              </span>
            </div>
            {result.ok ? (
              <>
                <p className="text-sm text-emerald-300/90 leading-relaxed">
                  {result.alternativeAccepted
                    ? result.message ??
                      "Your script runs cleanly and produces the correct result with a different approach. +40 XP banked."
                    : "Nailed it. Your script satisfies every required pattern for this task. +40 XP banked."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={nextQuestion}
                    disabled={idx >= list.length - 1}
                    className="px-4 h-10 rounded-lg bg-emerald-500 text-emerald-950 font-display tracking-wider text-sm shadow-[0_4px_0_#065f46] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    NEXT TASK →
                  </button>
                  <button
                    onClick={loadAlternatives}
                    disabled={altsLoading}
                    className="px-3 h-10 rounded-lg bg-zinc-800 text-amber-300 text-xs font-bold tracking-widest border border-zinc-700 hover:border-amber-500/50 disabled:opacity-50"
                  >
                    {altsLoading ? "LOADING…" : "💡 SHOW ALTERNATIVE APPROACHES"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-destructive/90 leading-relaxed">
                  <strong>Line {(result.errorLine ?? 0) + 1}:</strong> {result.message}
                </p>
                {result.needle && (
                  <pre className="mt-3 p-3 rounded-lg bg-zinc-950 border border-destructive/40 text-[12px] text-amber-300 overflow-x-auto">
                    {`// Expected somewhere in your script:\n${result.needle}`}
                  </pre>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Fix that line and hit RUN &amp; CHECK again.
                </p>
                <div className="mt-3">
                  <button
                    onClick={loadAlternatives}
                    disabled={altsLoading}
                    className="px-3 h-9 rounded-lg bg-zinc-800 text-amber-300 text-[11px] font-bold tracking-widest border border-zinc-700 hover:border-amber-500/50 disabled:opacity-50"
                  >
                    {altsLoading ? "LOADING…" : "💡 SUGGEST ALTERNATIVE APPROACHES"}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {/* Correction mode — editable suggested patch */}
        {ran && result && !result.ok && correction && !correctionDismissed && (
          <section
            aria-label="Correction mode with suggested patch"
            className="rounded-2xl border-2 border-amber-500/60 bg-amber-500/5 p-4 space-y-3 shadow-2xl shadow-amber-500/10"
          >
            <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs text-amber-300">
              <span className="text-base">🩹</span>
              <span>Correction mode</span>
              <span className="ml-auto font-mono text-muted-foreground normal-case tracking-normal">
                Line {correction.errorLine + 1} · cols{" "}
                {correction.columnStart + 1}–{correction.columnEnd + 1}
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
                Failing range
              </p>
              <pre className="text-[12px] font-mono p-3 rounded-lg bg-zinc-950 border border-destructive/40 overflow-x-auto">
                <div className="flex">
                  <span
                    className="text-destructive-foreground bg-destructive font-bold select-none w-10 shrink-0 text-right pr-2"
                    aria-label={`Line ${correction.errorLine + 1}, needs fix`}
                  >
                    <span aria-hidden="true">⚠ </span>
                    {String(correction.errorLine + 1).padStart(2, "0")}
                  </span>
                  <span className="pl-2">
                    {highlightLine(correction.line.slice(0, correction.columnStart)).map(
                      (t, j) => (
                        <span key={`p${j}`} className={t.c}>
                          {t.t}
                        </span>
                      ),
                    )}
                    <span
                      className="bg-destructive text-destructive-foreground font-bold rounded-sm underline decoration-wavy decoration-destructive-foreground underline-offset-2 px-0.5"
                      aria-label={`Failing range: ${correction.line.slice(correction.columnStart, correction.columnEnd) || "empty"}`}
                    >
                      {correction.line.slice(correction.columnStart, correction.columnEnd) ||
                        " "}
                    </span>
                    {highlightLine(correction.line.slice(correction.columnEnd)).map((t, j) => (
                      <span key={`s${j}`} className={t.c}>
                        {t.t}
                      </span>
                    ))}
                  </span>
                </div>
                <div className="flex" aria-hidden="true">
                  <span className="w-10 shrink-0" />
                  <span className="text-destructive font-bold whitespace-pre pl-2">
                    {" ".repeat(correction.columnStart) +
                      "^".repeat(Math.max(1, correction.columnEnd - correction.columnStart)) +
                      " FIX"}
                  </span>
                </div>
              </pre>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="patch-editor"
                  className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold"
                >
                  Suggested patch (editable)
                </label>
                <div
                  role="radiogroup"
                  aria-label="Patch mode"
                  className="inline-flex p-0.5 rounded-lg border border-border bg-panel"
                >
                  {(
                    [
                      { id: "replace" as const, label: `REPLACE L${correction.errorLine + 1}` },
                      { id: "insert" as const, label: `INSERT AFTER L${correction.errorLine + 1}` },
                    ]
                  ).map((m) => (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={patchMode === m.id}
                      onClick={() => setPatchMode(m.id)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-widest transition-all ${
                        patchMode === m.id
                          ? "bg-amber-500/20 text-amber-300"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="patch-editor"
                value={patch}
                onChange={(e) => setPatch(e.target.value)}
                spellCheck={false}
                rows={Math.min(8, Math.max(2, patch.split("\n").length + 1))}
                aria-label="Editable suggested patch"
                className="w-full font-mono text-[12px] leading-6 p-3 rounded-lg bg-zinc-950 border-2 border-amber-500/40 text-amber-100 caret-amber-300 outline-none focus:border-amber-500 resize-y whitespace-pre"
                style={{ tabSize: 2 }}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tweak the snippet if needed. Apply will {patchMode === "replace" ? "replace" : "insert after"}{" "}
                line {correction.errorLine + 1} and re-run.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={applyPatchAndRun}
                className="px-4 h-10 rounded-lg bg-amber-500 text-amber-950 font-display tracking-wider text-sm shadow-[0_4px_0_#92400e] active:translate-y-0.5 active:shadow-none"
              >
                🩹 APPLY PATCH &amp; RE-RUN
              </button>
              <button
                onClick={() => {
                  setPatch(correction.suggestedPatch);
                  setPatchMode(correction.defaultMode);
                }}
                className="px-3 h-10 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold tracking-widest border border-zinc-700 hover:border-zinc-500"
              >
                RESET PATCH
              </button>
              <button
                onClick={() => setCorrectionDismissed(true)}
                className="ml-auto px-3 h-10 rounded-lg bg-transparent text-muted-foreground text-xs font-bold tracking-widest hover:text-foreground"
              >
                DISMISS
              </button>
            </div>
          </section>
        )}

        {(altsError || alternatives) && (
          <section
            aria-label="Alternative approaches"
            className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              <span className="text-base">💡</span>
              Alternative approaches
              {alternatives && (
                <span className="ml-auto font-mono text-muted-foreground normal-case tracking-normal">
                  {alternatives.length} variant{alternatives.length === 1 ? "" : "s"}
                </span>
              )}
              <button
                onClick={() => {
                  setAlternatives(null);
                  setAltsError(null);
                }}
                className="ml-2 px-2 h-7 rounded-md bg-zinc-800 text-[10px] font-bold tracking-widest text-muted-foreground hover:text-foreground border border-zinc-700"
              >
                CLOSE
              </button>
            </div>
            {altsError && (
              <p className="text-sm text-destructive/90">{altsError}</p>
            )}
            {alternatives?.map((alt, i) => (
              <article
                key={i}
                className="rounded-xl border border-amber-500/30 bg-zinc-950/60 p-3 space-y-2"
              >
                <header className="flex items-baseline gap-2">
                  <span className="text-[10px] font-bold text-amber-300 tracking-widest">
                    APPROACH {i + 1}
                  </span>
                  <h3 className="text-sm font-bold">{alt.title}</h3>
                </header>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {alt.rationale}
                </p>
                <pre className="text-[12px] font-mono overflow-x-auto p-3 rounded-lg bg-black border border-zinc-800">
                  {alt.code.split("\n").map((line, j) => (
                    <div key={j} className="flex">
                      <span className="text-zinc-500 select-none w-8 shrink-0 text-right pr-2 font-bold">
                        {String(j + 1).padStart(2, "0")}
                      </span>
                      <span>
                        {highlightLine(line).map((tok, k) => (
                          <span key={k} className={tok.c}>
                            {tok.t}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setCode(alt.code);
                      setRan(false);
                    }}
                    className="px-3 h-8 rounded-md bg-zinc-800 text-amber-300 text-[10px] font-bold tracking-widest border border-zinc-700 hover:border-amber-500/50"
                  >
                    LOAD INTO EDITOR
                  </button>
                  <button
                    onClick={() => handleRun(alt.code)}
                    className="px-3 h-8 rounded-md bg-emerald-500 text-emerald-950 text-[10px] font-bold tracking-widest shadow-[0_3px_0_#065f46] active:translate-y-0.5 active:shadow-none"
                  >
                    ▶ LOAD &amp; RUN
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}


        {showSolution && (
          <section
            aria-label="Reference solution"
            className="rounded-2xl border border-border bg-panel p-4 space-y-2"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-amber-300 font-bold">
              📘 Reference solution
            </div>
            <pre className="text-[12px] font-mono overflow-x-auto p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              {q.solution.split("\n").map((line, i) => (
                <div key={i} className="flex">
                  <span className="text-zinc-400 select-none w-8 shrink-0 font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {highlightLine(line).map((tok, j) => (
                      <span key={j} className={tok.c}>
                        {tok.t}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </pre>
          </section>
        )}

        <nav className="pt-2 text-[11px] text-muted-foreground">
          <Link to="/" className="underline hover:text-amber-300">
            ← Back to Arcade
          </Link>
        </nav>
      </main>
    </div>
  );
}
