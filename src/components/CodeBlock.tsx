import { Fragment } from "react";

interface Props {
  filename: string;
  lines: string[];
  slotContent: string | null; // text to render in {{SLOT}}
  slotState: "empty" | "filled" | "wrong" | "right";
}

const KEYWORDS = /\b(var|while|if|else|return|function|new|for|true|false|null)\b/g;
const STRINGS = /'([^']*)'|"([^"]*)"/g;
const APIS =
  /\b(GlideRecord|GlideAjax|GlideRecordSecure|gs|g_form|g_user|current|previous|gr|ga|Class|Object|AbstractAjaxProcessor)\b/g;

function highlight(line: string) {
  // very small, naive highlighter — order matters
  const tokens: { t: string; c: string }[] = [{ t: line, c: "text-foreground/90" }];
  function split(re: RegExp, cls: string) {
    const out: { t: string; c: string }[] = [];
    for (const tok of tokens) {
      if (tok.c !== "text-foreground/90") { out.push(tok); continue; }
      let last = 0;
      const s = tok.t;
      const r = new RegExp(re.source, re.flags);
      let m: RegExpExecArray | null;
      while ((m = r.exec(s)) !== null) {
        if (m.index > last) out.push({ t: s.slice(last, m.index), c: "text-foreground/90" });
        out.push({ t: m[0], c: cls });
        last = m.index + m[0].length;
        if (m.index === r.lastIndex) r.lastIndex++;
      }
      if (last < s.length) out.push({ t: s.slice(last), c: "text-foreground/90" });
    }
    tokens.splice(0, tokens.length, ...out);
  }
  split(STRINGS, "text-primary");
  split(KEYWORDS, "text-secondary");
  split(APIS, "text-accent");
  return tokens;
}

export function CodeBlock({ filename, lines, slotContent, slotState }: Props) {
  const slotClass =
    slotState === "wrong"
      ? "bg-destructive/20 border-destructive/60 text-destructive animate-shake"
      : slotState === "right"
        ? "bg-primary/20 border-primary/60 text-primary"
        : slotState === "filled"
          ? "bg-accent/15 border-accent/50 text-accent"
          : "bg-white/5 border-dashed border-zinc-600 text-muted-foreground";

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
      <div className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border-b border-border">
        <div className="size-2 rounded-full bg-red-500/50" />
        <div className="size-2 rounded-full bg-amber-500/50" />
        <div className="size-2 rounded-full bg-green-500/50" />
        <span className="ml-2 text-[10px] text-muted-foreground font-mono">{filename}</span>
      </div>
      <pre className="p-4 text-[13px] leading-7 font-mono overflow-x-auto scrollbar-thin">
        {lines.map((line, i) => {
          const num = String(i + 1).padStart(2, "0");
          const hasSlot = line.includes("{{SLOT}}");
          if (hasSlot) {
            const [before, after] = line.split("{{SLOT}}");
            return (
              <div key={i} className="flex flex-wrap items-center gap-x-1">
                <span className="text-muted-foreground select-none mr-3">{num}</span>
                <span>
                  {highlight(before).map((t, j) => (
                    <span key={j} className={t.c}>{t.t}</span>
                  ))}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded border-2 font-bold text-[12px] ${slotClass}`}
                >
                  {slotContent ?? "▢ ▢ ▢ ▢"}
                </span>
                <span>
                  {highlight(after).map((t, j) => (
                    <span key={j} className={t.c}>{t.t}</span>
                  ))}
                </span>
              </div>
            );
          }
          return (
            <div key={i} className="flex">
              <span className="text-muted-foreground select-none mr-3">{num}</span>
              <span>
                {highlight(line).map((t, j) => (
                  <Fragment key={j}>
                    <span className={t.c}>{t.t}</span>
                  </Fragment>
                ))}
              </span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
