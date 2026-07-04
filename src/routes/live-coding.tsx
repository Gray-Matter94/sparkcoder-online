import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import {
  LIVE_CODING_QUESTIONS,
  LIVE_CODING_TOTAL,
  validateSolution,
  type LiveCodingQuestion,
  type Side,
  type ValidationResult,
} from "@/lib/live-coding-questions";
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
          "Write ServiceNow scripts end-to-end in a colorful instance-style editor. 500 server-side and client-side tasks with an AI coach that points at the exact line to fix.",
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

// ------- Component ---------------------------------------------------------

type Filter = "all" | Side;

function LiveCoding() {
  const { progress, award } = useProgress();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
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
  }, [filter, query]);

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
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(q.starter);
    setResult(null);
    setSandbox(null);
    setRan(false);
    setShowSolution(false);
    setPatch("");
    setPatchMode("replace");
    setCorrectionDismissed(false);
  }, [q.id]);

  function handleRun(nextCode: string = code) {
    if (nextCode !== code) setCode(nextCode);
    const sb = runSandbox(nextCode);
    setSandbox(sb);
    // If the sandbox crashed, skip pattern checks — candidate must fix the
    // crash first. The error line comes from the real stack trace.
    const res: ValidationResult = sb.ok
      ? validateSolution(q, nextCode)
      : {
          ok: false,
          passedCount: 0,
          totalChecks: q.checks.length,
          errorLine: sb.errorLine,
          message: `${sb.errorName ?? "Error"}: ${sb.errorMessage ?? "Script failed to execute."}`,
        };
    setResult(res);
    setRan(true);
    setCorrectionDismissed(false);
    if (sb.ok && res.ok) {
      award(`live-${q.id}`, 40);
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
                {sandbox.logs.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.level === "error"
                        ? "text-destructive"
                        : l.level === "warn"
                          ? "text-amber-300"
                          : l.level === "info"
                            ? "text-emerald-300"
                            : "text-zinc-300"
                    }
                  >
                    <span className="text-zinc-600 mr-2">
                      [{l.level.toUpperCase().padEnd(5)}]
                    </span>
                    {l.message}
                  </div>
                ))}
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
              <span>{result.ok ? "Script accepted" : "AI Coach — needs a fix"}</span>
              <span className="ml-auto font-mono text-muted-foreground">
                {result.passedCount}/{result.totalChecks} checks
              </span>
            </div>
            {result.ok ? (
              <>
                <p className="text-sm text-emerald-300/90 leading-relaxed">
                  Nailed it. Your script satisfies every required pattern for this task. +40 XP
                  banked.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={nextQuestion}
                    disabled={idx >= list.length - 1}
                    className="px-4 h-10 rounded-lg bg-emerald-500 text-emerald-950 font-display tracking-wider text-sm shadow-[0_4px_0_#065f46] active:translate-y-0.5 active:shadow-none disabled:opacity-40"
                  >
                    NEXT TASK →
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
                  <span className="text-zinc-600 select-none w-8 shrink-0 text-right pr-2">
                    {String(correction.errorLine + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {highlightLine(correction.line.slice(0, correction.columnStart)).map(
                      (t, j) => (
                        <span key={`p${j}`} className={t.c}>
                          {t.t}
                        </span>
                      ),
                    )}
                    <span className="bg-destructive/60 rounded-sm">
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
                  <span className="w-8 shrink-0" />
                  <span className="text-destructive whitespace-pre">
                    {" ".repeat(correction.columnStart) +
                      "^".repeat(Math.max(1, correction.columnEnd - correction.columnStart))}
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
                  <span className="text-zinc-600 select-none w-8 shrink-0">
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
