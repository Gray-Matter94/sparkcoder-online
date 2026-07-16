import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow CSM Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow CSM interview prep: Case management, Accounts & Contacts, Entitlements & Assets, CSM/FSM data model, and ITSM integration — with runnable simulator traces.";
const URL = "https://www.sparkcoder.online/learn/csm-interview-questions";

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
    id: "case-management",
    title: "1. Case management — the CSM case lifecycle",
    prompt:
      "Walk me through what happens from the moment a customer submits a case in the portal to the moment it's resolved.",
    approach: [
      "The base table is sn_customer_service_case (extends task). A case must be linked to an Account and a Contact — that's how entitlement lookups work.",
      "State model: New → Open → Awaiting Info → Resolved → Closed. Assignment runs via matching rules or Advanced Work Assignment (AWA) when enabled.",
      "Every case check-in touches the SLA engine (contract_sla) and, if the account has an entitlement, records service consumption on service_entitlement.",
      "Closure requires resolution_code + resolution_notes; auto-close job (sn_customer_service.auto_close_resolved) moves Resolved → Closed after N days.",
    ],
    code: `// Before Insert BR on sn_customer_service_case
if (!current.account) {
  gs.addErrorMessage('Case must be linked to an Account');
  current.setAbortAction(true);
}
if (!current.contact) {
  current.contact = new global.CSMContactResolver()
    .findByEmail(current.contact_email);
}`,
    output: {
      table: "sn_customer_service_case",
      logs: [
        { time: "", text: "case CS0001042 created via portal", tone: "info" },
        { time: "", text: "account + contact linked ✓", tone: "ok" },
        { time: "", text: "entitlement 'Gold Support' matched", tone: "ok" },
        { time: "", text: "AWA routed to team: Tier 1", tone: "ok" },
      ],
      rows: [
        { number: "CS0001042", state: "open", updated: "awa", highlight: "ok" },
      ],
    },
    pitfall:
      "Creating cases without an Account. Entitlements, SLAs and reporting all key off Account — an orphan case skips billing and never counts toward a contract.",
  },
  {
    id: "entitlements-assets",
    title: "2. Entitlements & Assets — proving the customer is covered",
    prompt:
      "A customer calls, but their contract is expired. What tables and checks decide whether we work the case?",
    approach: [
      "Entitlements live on service_entitlement, linked to the Account (or a specific Product/Asset). Each has start_date, end_date, and units (cases, hours).",
      "On case create, the Entitlement engine (EntitlementUtils) picks the best matching active entitlement — Account + Product + type — and stamps it on the case.",
      "Assets (alm_asset / alm_hardware) that the customer owns are exposed as 'Install Base Items' on the account; a case can be tied to a specific asset for warranty checks.",
      "If no active entitlement is found, the case is flagged 'not entitled' — agents can override with a manager role but the audit trail records the bypass.",
    ],
    code: `// Script Include: EntitlementUtils.check
check: function(caseGr) {
  var ent = new GlideRecord('service_entitlement');
  ent.addQuery('account', caseGr.account);
  ent.addQuery('active', true);
  ent.addQuery('start_date', '<=', gs.nowDateTime());
  ent.addQuery('end_date',   '>=', gs.nowDateTime());
  ent.orderByDesc('priority');
  ent.setLimit(1);
  ent.query();
  return ent.next() ? ent.getUniqueValue() : null;
}`,
    output: {
      table: "service_entitlement",
      logs: [
        { time: "", text: "lookup account=ACME Corp", tone: "info" },
        { time: "", text: "active entitlements: 0", tone: "bad" },
        { time: "", text: "case flagged: NOT ENTITLED", tone: "bad" },
        { time: "", text: "manager override required", tone: "info" },
      ],
      rows: [
        { number: "CS0001077", state: "blocked", updated: "no ent", highlight: "bad" },
      ],
    },
    pitfall:
      "Assuming an Account-level entitlement covers every product. If the entitlement is scoped to a Product (or Asset), the engine won't match cases about a different product — leaving customers 'not entitled' even though they pay.",
  },
  {
    id: "data-model",
    title: "3. CSM / FSM data model — Accounts, Contacts, and the split with FSM",
    prompt:
      "Explain the CSM data model and how it hands off to Field Service Management.",
    approach: [
      "Core parties: customer_account (B2B), customer_contact (person at the account), consumer (B2C individuals). Contacts and Consumers both extend sys_user with restricted roles (sn_customerservice.customer, .consumer).",
      "Products / Install Base: sn_customerservice_product_model → alm_asset instances the customer owns. Cases can reference either.",
      "Case escalates to Field Service: from sn_customer_service_case → creates wm_order + wm_order_task on the FSM side. The case stays open until the work order closes.",
      "Both share Territory and Skills tables — that's how AWA and Dynamic Scheduling route the same customer to the same tech across CSM & FSM.",
    ],
    code: `// Server-side transition: Case → Work Order
var wo = new GlideRecord('wm_order');
wo.initialize();
wo.company           = current.account;
wo.contact           = current.contact;
wo.parent            = current.sys_id;   // links back to the case
wo.short_description = 'Onsite for ' + current.number;
wo.priority          = current.priority;
wo.insert();
current.work_notes = 'Field dispatch: ' + wo.number;`,
    output: {
      table: "wm_order",
      logs: [
        { time: "", text: "case CS0001042 → dispatch requested", tone: "info" },
        { time: "", text: "wm_order WO0004201 created", tone: "ok" },
        { time: "", text: "territory: NE-01 · skill: HVAC", tone: "info" },
        { time: "", text: "case paused until WO closes", tone: "info" },
      ],
      rows: [
        { number: "WO0004201", state: "pending dispatch", updated: "linked", highlight: "ok" },
      ],
    },
    pitfall:
      "Duplicating Contacts. If a contact is created via portal self-registration AND the CRM sync, two sys_user rows point to the same email — entitlement and case history split across both.",
  },
  {
    id: "itsm-integration",
    title: "4. CSM ↔ ITSM integration — when a case becomes an incident",
    prompt:
      "A customer reports an outage that's really a platform bug. How do we open an incident without losing the case audit trail?",
    approach: [
      "Use the OOB 'Create Incident' UI action on the case — it copies short_description + description, sets parent = case sys_id, and stamps caller_id from the case contact's linked sys_user.",
      "The case and incident are linked via task_relationship (or via the parent field on incident when using OOB). Case state moves to 'Awaiting Problem' while the incident is worked.",
      "Assignment: incidents route through ITSM assignment groups (support tiers), not CSM matching rules. Keep the groups distinct — mixing CSM agents and ITSM engineers in one group breaks reporting.",
      "When the incident is resolved, a Business Rule on incident.state=6 walks task_relationship, updates the parent case with resolution_notes, and reopens it for customer confirmation.",
    ],
    code: `// After Update BR on incident, when state changes to Resolved
(function(current, previous) {
  if (current.state != 6 || previous.state == 6) return;
  var rel = new GlideRecord('task_relationship');
  rel.addQuery('child', current.sys_id);
  rel.addQuery('type.name', 'Duplicate');
  rel.query();
  while (rel.next()) {
    var cs = new GlideRecord('sn_customer_service_case');
    if (cs.get(rel.parent)) {
      cs.state = 16; // Awaiting Info (customer confirmation)
      cs.work_notes = 'Linked incident ' + current.number + ' resolved: ' + current.close_notes;
      cs.update();
    }
  }
})(current, previous);`,
    output: {
      table: "incident",
      logs: [
        { time: "", text: "incident INC0021044 resolved", tone: "ok" },
        { time: "", text: "parent case CS0001042 found", tone: "info" },
        { time: "", text: "case state → Awaiting Info", tone: "ok" },
        { time: "", text: "notification sent to contact", tone: "ok" },
      ],
      rows: [
        { number: "CS0001042", state: "awaiting info", updated: "linked-inc", highlight: "ok" },
      ],
    },
    pitfall:
      "Closing the incident and forgetting the case. Without the relationship BR, the case stays 'Awaiting Problem' forever and gets flagged by SLA breach reports — customers get a ping from the SLA engine, not a resolution.",
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
  headline: "ServiceNow CSM Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-16",
  dateModified: "2026-07-16",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow CSM, Case Management, Entitlements, CSM/FSM data model, ITSM integration",
  audience: { "@type": "Audience", audienceType: "ServiceNow CSM Developers and Architects" },
};

export const Route = createFileRoute("/learn/csm-interview-questions")({
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
  component: CsmGuide,
});

function CsmGuide() {
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
            Interview Prep · CSM
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            CSM
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons on Case management, Entitlements & Assets, the
            CSM/FSM data model, and ITSM integration — the exact Customer Service
            Management topics senior interview loops probe, each with a runnable
            simulator trace.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/itsm-interview-questions" className="text-accent underline">
              ITSM guide
            </Link>{" "}
            and the{" "}
            <Link to="/learn/hrsd-interview-questions" className="text-accent underline">
              HRSD guide
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
