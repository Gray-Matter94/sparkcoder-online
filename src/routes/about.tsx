import { createFileRoute, Link } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StatsBar } from "@/components/StatsBar";
import { useProgress } from "@/lib/progress";
import {
  EDITORIAL_TEAM_ID,
  ORGANIZATION_ID,
  SITE_URL,
  SPARKCODER_EDITORIAL_TEAM,
  SPARKCODER_ORGANIZATION,
} from "@/lib/editorial";

const TITLE = "About SparkCoder — Editorial Standards";
const DESCRIPTION =
  "How the SparkCoder Editorial Team creates, reviews, and updates practical ServiceNow interview questions, scripting guides, glossary entries, and tools.";
const URL = `${SITE_URL}/about`;

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "AboutPage",
              "@id": `${URL}#page`,
              url: URL,
              name: TITLE,
              description: DESCRIPTION,
              about: { "@id": ORGANIZATION_ID },
              mainEntity: { "@id": EDITORIAL_TEAM_ID },
            },
            SPARKCODER_ORGANIZATION,
            SPARKCODER_EDITORIAL_TEAM,
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { progress } = useProgress();

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-9 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            About · Editorial standards
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ABOUT
            <br />
            <span className="text-accent">SPARKCODER.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            SparkCoder is a free practice site for ServiceNow interviews and scripting. It
            combines concise answers, scenario questions, runnable code exercises, glossary
            definitions, and browser-based developer tools.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Who creates the content</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">
            The SparkCoder Editorial Team writes and maintains the learning material. The team
            identity is used consistently across guides so readers and search services can trace
            each article back to one editorial source. SparkCoder does not claim certifications,
            employer affiliations, or outcomes that cannot be verified.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">How material is reviewed</h2>
          <ol className="grid gap-3 sm:grid-cols-2">
            {[
              ["Start with the task", "Each page targets a specific interview question, platform concept, or scripting workflow."],
              ["Check primary sources", "Platform behavior is compared with official ServiceNow documentation where a stable source is available."],
              ["Make answers testable", "Code examples include concrete tables, APIs, expected behavior, and common failure modes."],
              ["Update honestly", "A page's updated date changes only when its explanations, examples, sources, or structure materially change."],
            ].map(([title, text]) => (
              <li key={title} className="rounded-2xl border-2 border-border bg-panel p-4 space-y-1">
                <h3 className="font-display text-base tracking-tight text-accent">{title}</h3>
                <p className="text-xs text-foreground/80 leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl tracking-tight">Sources and independence</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">
            SparkCoder is an independent educational project and is not affiliated with or
            endorsed by ServiceNow. ServiceNow product names are used only to identify the
            platform concepts being taught. When a guide depends on specific platform behavior,
            it links to relevant primary documentation so readers can verify the claim.
          </p>
          <a
            href="https://www.servicenow.com/docs/"
            rel="noreferrer"
            className="inline-flex text-sm text-accent underline underline-offset-4"
          >
            Official ServiceNow documentation
          </a>
        </section>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Corrections and feedback</h2>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Platform behavior changes across releases. If an explanation, table name, API, or
            code example needs correction, send the page URL and a description of the issue.
          </p>
          <Link
            to="/feedback"
            className="dark-glass-option inline-flex h-10 items-center rounded-xl border-2 border-accent/50 bg-accent/10 px-4 text-xs font-display uppercase text-accent"
          >
            Report a correction
          </Link>
        </section>
      </main>
    </div>
  );
}