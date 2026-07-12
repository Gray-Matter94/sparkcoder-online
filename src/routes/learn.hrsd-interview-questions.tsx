import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow HRSD Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow HRSD interview prep: HR Profile security, Lifecycle Events, HR Criteria, and case routing — with runnable simulator traces.";
const URL = "https://www.sparkcoder.online/learn/hrsd-interview-questions";

interface Lesson {
  id: string;
  title: string;
  prompt: string;
  approach: string[];
  code: string;
  output: SimulatorOutput;
  pitfall: string;
}

const LESSONS: Lesson[] = [
  {
    id: "hr-profile-security",
    title: "1. HR Profile security — who can see what?",
    prompt:
      "A manager opens an HR case and can read the subject's home address. Compliance is unhappy. How is HR Profile access controlled?",
    approach: [
      "sn_hr_core_profile is the sensitive table — never grant public read.",
      "Access is governed by HR Security roles (sn_hr_core.basic, .manager, .admin) PLUS scoped ACLs on individual profile fields (SSN, address, DOB).",
      "The HR Profile record uses a Before-Query business rule to filter by employee relationship (subject, manager chain, HR agent assignment).",
      "Case-level 'confidentiality' flags hide entire cases from non-HR users, even ones with a read role.",
    ],
    code: `// Field-level ACL on sn_hr_core_profile.home_address
// Condition script:
answer = gs.hasRole('sn_hr_core.admin') ||
         gs.hasRole('sn_hr_core.manager') &&
         current.user.manager == gs.getUserID();`,
    output: {
      table: "sn_hr_core_profile",
      logs: [
        { time: "", text: "user role check: sn_hr_core.manager ✓", tone: "info" },
        { time: "", text: "relationship check: subject.manager == caller? NO", tone: "bad" },
        { time: "", text: "field home_address → BLOCKED", tone: "ok" },
      ],
      rows: [
        { number: "profile:emp0021", state: "restricted", updated: "acl", highlight: "ok" },
      ],
    },
    pitfall:
      "Granting sn_hr_core.manager broadly. The role gates the UI, but the row filter still needs a manager-chain check — without it, any manager sees every profile.",
  },
  {
    id: "lifecycle-events",
    title: "2. Lifecycle Events — how onboarding actually runs",
    prompt:
      "Explain the moving parts behind an Onboarding Lifecycle Event when HR marks a new hire's start date.",
    approach: [
      "A Lifecycle Event (LE) is triggered by a business condition — usually an HR Profile field change (start_date set, employment_type = new hire).",
      "The LE spawns Activity Sets (Pre-boarding, Day 1, Week 1) — each Activity Set holds ordered Activities (issue laptop, assign trainings, schedule intro).",
      "Each Activity creates its own HR Case or Task, routed via HR Services + HR Criteria to the right fulfillment group.",
      "You monitor progress on the Lifecycle Event Case, which rolls up child activity statuses.",
    ],
    code: `// Trigger condition on sn_hr_le_activity_set_trigger
current.hr_profile.start_date.changesTo() &&
!current.hr_profile.start_date.nil() &&
current.hr_profile.employment_type == 'new_hire';`,
    output: {
      table: "sn_hr_le_case",
      logs: [
        { time: "", text: "LE trigger fired: Onboarding", tone: "ok" },
        { time: "", text: "Activity Set: Pre-boarding (3 activities)", tone: "info" },
        { time: "", text: "Activity Set: Day 1 (5 activities)", tone: "info" },
        { time: "", text: "8 child cases created & routed", tone: "ok" },
      ],
      rows: [
        { number: "LE0001042", state: "in progress", updated: "3/8", highlight: "ok" },
      ],
    },
    pitfall:
      "Rebuilding onboarding as a single Flow Designer flow. You lose the LE dashboard, activity-set reuse, and the built-in HR Criteria targeting. Use LEs for HR workflows, Flow Designer for the fulfillment steps.",
  },
  {
    id: "hr-criteria",
    title: "3. HR Criteria — targeting services and knowledge",
    prompt:
      "Why do HR admins use HR Criteria instead of just user_criteria records like the Service Catalog?",
    approach: [
      "HR Criteria filter HR Services, Knowledge, Lifecycle Events, and Activities by employee attributes (department, location, employment_type, hr_profile fields).",
      "They evaluate against sn_hr_core_profile, not sys_user — so location-based rules follow the profile's work_location, not the user's default.",
      "Multiple criteria on a single service are OR'd by default — check 'Match all criteria' to switch to AND.",
      "Criteria run advanced scripts too — you can call a Script Include to hit an external HRIS for eligibility.",
    ],
    code: `// Advanced HR Criteria script
answer = (function() {
  var p = current.hr_profile.getRefRecord();
  if (p.employment_type != 'full_time') return false;
  var months = gs.dateDiff(p.start_date.getDisplayValue(),
                           gs.nowDateTime(), true) / 2592000;
  return months >= 6; // 6-month tenure requirement
})();`,
    output: {
      table: "sn_hr_core_criteria",
      logs: [
        { time: "", text: "criteria: 'Eligible for Tuition'", tone: "info" },
        { time: "", text: "employment_type=full_time ✓", tone: "ok" },
        { time: "", text: "tenure=8mo ≥ 6mo ✓", tone: "ok" },
        { time: "", text: "service visible to requester", tone: "ok" },
      ],
      rows: [
        { number: "svc:tuition", state: "visible", updated: "criteria", highlight: "ok" },
      ],
    },
    pitfall:
      "Copy-pasting Service Catalog user_criteria logic. HR Criteria have a different evaluation context (hr_profile, not sys_user); a rule that works in catalog silently fails in HRSD.",
  },
  {
    id: "case-routing",
    title: "4. HR Case routing — services, COEs, and assignment",
    prompt:
      "A benefits question goes to the Payroll team by mistake. Walk through how HR Case assignment is supposed to work.",
    approach: [
      "The HR Service (sn_hr_core_service) defines the topic and its owning HR COE (Center of Excellence).",
      "The COE holds the default assignment group — routing follows Service → COE → Group unless overridden.",
      "Assignment Rules on sn_hr_case can override for special cases (VIP, region-specific specialists).",
      "For Employee Center intake, the topic taxonomy maps directly to HR Services, so a mis-tagged topic sends the case to the wrong COE.",
    ],
    code: `// Assignment Rule condition
current.hr_service.name == 'Benefits — Enrollment' &&
current.opened_for.location.country == 'CA';
// Script sets group:
current.assignment_group = 'benefits_ca_specialists';`,
    output: {
      table: "sn_hr_case",
      logs: [
        { time: "", text: "service: Benefits — Enrollment", tone: "info" },
        { time: "", text: "COE default group: benefits_us", tone: "warn" },
        { time: "", text: "assignment rule matched: CA region", tone: "ok" },
        { time: "", text: "group → benefits_ca_specialists", tone: "ok" },
      ],
      rows: [
        { number: "HRC0001234", state: "assigned", updated: "benefits_ca", highlight: "ok" },
      ],
    },
    pitfall:
      "Editing the COE's default group to solve a one-off routing issue. Every other case flips too. Use an Assignment Rule for exceptions and keep COE defaults stable.",
  },
];

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LESSONS.map((l) => ({
    "@type": "Question",
    name: l.prompt,
    acceptedAnswer: {
      "@type": "Answer",
      text: `${l.approach.join(" ")} Watch out: ${l.pitfall}`,
    },
  })),
};

const ARTICLE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  headline: "ServiceNow HRSD Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-12",
  dateModified: "2026-07-12",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow HRSD, HR Profile security, Lifecycle Events, HR Criteria, Case routing",
  audience: { "@type": "Audience", audienceType: "ServiceNow HRSD Developers and Architects" },
};

export const Route = createFileRoute("/learn/hrsd-interview-questions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(ARTICLE_JSONLD) },
    ],
  }),
  component: HrsdGuide,
});

function HrsdGuide() {
  const { progress } = useProgress();
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = LESSONS.find((l) => l.id === activeId) ?? null;

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Interview Prep · HRSD
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            HRSD
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons on HR Profile security, Lifecycle Events, HR
            Criteria, and Case routing — the exact HRSD topics senior interview loops
            probe, each with a runnable simulator trace.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/itsm-interview-questions" className="text-accent underline">
              ITSM guide
            </Link>{" "}
            and the{" "}
            <Link to="/learn/flow-designer-interview-questions" className="text-accent underline">
              Flow Designer guide
            </Link>{" "}
            for full platform coverage.
          </p>
        </header>

        <ol className="space-y-6">
          {LESSONS.map((l) => (
            <li
              key={l.id}
              className="rounded-2xl border-2 border-border bg-panel overflow-hidden animate-fade-in"
            >
              <article className="p-5 space-y-4">
                <h2 className="font-display text-xl tracking-tight">{l.title}</h2>
                <p className="text-sm text-foreground/85 italic">“{l.prompt}”</p>

                <section aria-label="Approach">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    How to answer
                  </h3>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
                    {l.approach.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </section>

                <section aria-label="Reference script">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold mb-2">
                    Reference script
                  </h3>
                  <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                    <code>{l.code}</code>
                  </pre>
                </section>

                <section
                  aria-label="Common pitfall"
                  className="rounded-xl border border-destructive/40 bg-destructive/5 p-3"
                >
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-destructive font-bold mb-1">
                    Pitfall
                  </h3>
                  <p className="text-sm text-foreground/85">{l.pitfall}</p>
                </section>

                <button
                  onClick={() => setActiveId(activeId === l.id ? null : l.id)}
                  className="h-10 px-4 rounded-xl border-2 border-accent/50 bg-accent/10 text-accent font-display tracking-wider text-xs uppercase hover:bg-accent/20 transition-colors"
                  aria-expanded={activeId === l.id}
                  aria-controls={`sim-${l.id}`}
                >
                  {activeId === l.id ? "Hide simulator" : "Run in simulator"}
                </button>

                {activeId === l.id && active && (
                  <div id={`sim-${l.id}`}>
                    <Simulator output={active.output} status="done" resultTone="ok" />
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>

        <section className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3">
          <h2 className="font-display text-xl tracking-tight">Keep going</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/learn"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Glossary topics
            </Link>
            <Link
              to="/learn/itsm-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              ITSM Q&amp;A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
