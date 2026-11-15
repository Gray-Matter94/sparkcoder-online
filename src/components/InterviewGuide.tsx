import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";
import { createTechArticleSchema, SITE_URL } from "@/lib/editorial";
import { SHARE_PREVIEW_META } from "@/lib/share-preview";
import { INTERVIEW_GUIDES, type InterviewGuide as Guide } from "@/lib/content/interview-guides";

export function interviewGuideHead(guide: Guide) {
  const url = `${SITE_URL}${guide.path}`;
  const title = `${guide.title} — SparkCoder`;
  return {
    meta: [
      { title },
      { name: "description", content: guide.description },
      { property: "og:title", content: title },
      { property: "og:description", content: guide.description },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
      ...SHARE_PREVIEW_META,
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(createTechArticleSchema({
        headline: guide.title, description: guide.description, url,
        datePublished: "2026-11-15", dateModified: "2026-11-15",
        audienceType: "ServiceNow interview candidates", about: guide.title,
      })) },
      { type: "application/ld+json", children: JSON.stringify({
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "SparkCoder", item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Interview preparation", item: `${SITE_URL}/servicenow-interview-questions-and-answers` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      }) },
    ],
  };
}

export function InterviewGuideLinks() {
  return <section className="space-y-3" aria-label="Focused interview guides">
    <h2 className="font-display text-xl text-accent">ServiceNow interview topic guides</h2>
    <ul className="space-y-3">
      {INTERVIEW_GUIDES.map(guide => <li key={guide.path}>
        <Button asChild variant="outline" className="dark-glass-option h-auto w-full justify-between whitespace-normal p-4 text-left">
          <Link to={guide.path}>
            <span className="min-w-0 space-y-1">
              <span className="block font-display text-base">{guide.title}</span>
              <span className="block text-xs leading-relaxed text-muted-foreground">{guide.description}</span>
            </span>
            <ArrowRight aria-hidden="true" className="shrink-0" />
          </Link>
        </Button>
      </li>)}
    </ul>
  </section>;
}

export function InterviewGuide({ guide }: { guide: Guide }) {
  const { progress } = useProgress();
  return <div className="min-h-screen flex flex-col">
    <ErrorBoundary name="Stats"><StatsBar progress={progress} back /></ErrorBoundary>
    <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
      <header className="space-y-4">
        <p className="text-xs uppercase text-accent font-bold">Interview preparation · 8 questions</p>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight break-words">{guide.title}</h1>
        <p className="text-sm leading-relaxed text-foreground/85">{guide.intro}</p>
        <p className="text-xs text-muted-foreground">
          By <Link to="/about" className="text-accent underline">SparkCoder Editorial Team</Link>
          {" · "}Published <time dateTime="2026-11-15">November 15, 2026</time>
          {" · "}Independent practice material, not official interview or certification questions.
        </p>
        <Button asChild><Link to="/practice/$category" params={{ category: guide.category }} search={{ difficulty: undefined }}>{guide.practiceLabel}<ArrowRight aria-hidden="true" /></Link></Button>
      </header>
      <nav aria-label="Questions in this guide" className="border-y border-border py-5 space-y-3">
        <h2 className="font-display text-xl">Questions in this guide</h2>
        <ul className="space-y-2 text-sm">
          {guide.questions.map(q => <li key={q.id}><a href={`#${q.id}`} className="text-accent underline underline-offset-4">{q.question}</a></li>)}
        </ul>
      </nav>
      {guide.questions.map(q => <section key={q.id} id={q.id} className="space-y-3 scroll-mt-20">
        <h2 className="font-display text-xl sm:text-2xl">{q.question}</h2>
        <p className="text-sm leading-relaxed text-foreground/85">{q.answer}</p>
        {q.code && <pre className="rounded-lg border border-border bg-panel p-4 overflow-x-auto text-xs leading-relaxed"><code>{q.code}</code></pre>}
        <h3 className="font-display text-base text-accent">Scenario follow-up</h3>
        <p className="text-sm leading-relaxed text-foreground/85">{q.followUp}</p>
        <p className="text-xs text-muted-foreground">Platform reference: {q.sources.map((index, i) => {
          const source = guide.sources[index];
          return source ? <span key={index}>{i > 0 ? "; " : ""}<a href={source.url} className="text-accent underline">{source.title}</a></span> : null;
        })}</p>
      </section>)}
      <section className="border-t border-border pt-6 space-y-3">
        <h2 className="font-display text-xl">Preparation checklist</h2>
        <ul className="list-disc pl-5 text-sm leading-relaxed space-y-2 text-foreground/85">
          <li>Explain the requirement, choose the execution context, then describe the trade-off.</li>
          <li>State assumptions about release, interface, scope, and field values.</li>
          <li>Describe one failure case and the test that would detect it.</li>
          <li>Use the matching practice questions to turn an explanation into working code.</li>
        </ul>
        <Button asChild><Link to="/practice/$category" params={{ category: guide.category }} search={{ difficulty: undefined }}>{guide.practiceLabel}<ArrowRight aria-hidden="true" /></Link></Button>
      </section>
      <InterviewGuideLinks />
      <Button asChild variant="outline"><Link to="/servicenow-interview-questions-and-answers">All ServiceNow interview questions</Link></Button>
    </main>
  </div>;
}