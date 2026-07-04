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

  if (commentPart) arr.push({ t: commentPart, c: "text-zinc-500 italic" });
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
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(q.starter);
    setResult(null);
    setSandbox(null);
    setRan(false);
    setShowSolution(false);
  }, [q.id]);

  function handleRun() {
    const sb = runSandbox(code);
    setSandbox(sb);
    // If the sandbox crashed, skip pattern checks — candidate must fix the
    // crash first. The error line comes from the real stack trace.
    const res: ValidationResult = sb.ok
      ? validateSolution(q, code)
      : {
          ok: false,
          passedCount: 0,
          totalChecks: q.checks.length,
          errorLine: sb.errorLine,
          message: `${sb.errorName ?? "Error"}: ${sb.errorMessage ?? "Script failed to execute."}`,
        };
    setResult(res);
    setRan(true);
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

        {/* filter + navigator */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div
            role="tablist"
            aria-label="Filter tasks"
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
              disabled={idx === 0}
              aria-label="Previous task"
              className="size-8 grid place-items-center rounded-lg bg-panel border border-border disabled:opacity-30 hover:border-accent"
            >
              ‹
            </button>
            <span>
              #{idx + 1}/{list.length}
            </span>
            <button
              onClick={nextQuestion}
              disabled={idx >= list.length - 1}
              aria-label="Next task"
              className="size-8 grid place-items-center rounded-lg bg-panel border border-border disabled:opacity-30 hover:border-accent"
            >
              ›
            </button>
          </div>
        </div>

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
                    className={`flex ${isErr ? "bg-destructive/25" : ""}`}
                  >
                    <span
                      className={`select-none px-3 py-0 text-right w-12 shrink-0 border-r border-zinc-800 ${
                        isErr
                          ? "text-destructive-foreground bg-destructive/60"
                          : "text-zinc-600 bg-zinc-900/60"
                      }`}
                    >
                      {isErr ? "▶" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="pl-3 pr-4 whitespace-pre">
                      {line.length === 0 ? (
                        <span>&nbsp;</span>
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
              onClick={handleRun}
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
