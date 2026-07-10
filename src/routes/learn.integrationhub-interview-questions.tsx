import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulator } from "@/components/Simulator";
import { useProgress } from "@/lib/progress";
import { useState } from "react";
import type { SimulatorOutput } from "@/lib/questions";

const TITLE = "ServiceNow IntegrationHub & REST API Interview Questions — SparkCoder";
const DESCRIPTION =
  "ServiceNow IntegrationHub and REST API interview prep: REST vs SOAP, Spokes, authentication profiles, and Flow Designer error handling — with simulator traces.";
const URL =
  "https://www.sparkcoder.online/learn/integrationhub-interview-questions";

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
    id: "rest-vs-soap",
    title: "1. REST vs SOAP — which one do you pick, and why?",
    prompt:
      "The upstream vendor supports both REST and SOAP. Which do you wire into IntegrationHub, and how do you justify it in the review?",
    approach: [
      "REST is stateless, uses JSON, and maps cleanly to IntegrationHub REST Steps — lower payload, easier to debug in the outbound REST message logs.",
      "SOAP is contract-first (WSDL), heavier payload, and better when the vendor mandates WS-Security or strict schemas.",
      "In ServiceNow, prefer REST for modern SaaS integrations (Jira, Slack, GitHub) and reserve SOAP for legacy on-prem (SAP, Oracle EBS, older ITSM).",
      "Either way, wrap the call in a Subflow with an Action step so error handling and retries live outside the raw HTTP step.",
    ],
    code: `// REST Message — outbound to Jira
var r = new sn_ws.RESTMessageV2('Jira Cloud', 'createIssue');
r.setStringParameterNoEscape('summary', current.short_description);
r.setRequestHeader('Content-Type','application/json');

var resp = r.execute();
var status = resp.getStatusCode();      // 201 = created
var body   = resp.getBody();            // { "id":"10231", "key":"OPS-42" }

if (status !== 201) {
  gs.error('[Jira] create failed ' + status + ' ' + body);
}`,
    output: {
      table: "sys_rest_message",
      logs: [
        { time: "", text: "POST /rest/api/3/issue", tone: "info" },
        { time: "", text: "201 Created — key=OPS-42", tone: "ok" },
        { time: "", text: "outbound logged to syslog_transaction", tone: "info" },
      ],
      rows: [
        { number: "OPS-42", state: "created", updated: "rest", highlight: "ok" },
      ],
    },
    pitfall:
      "Don't call RESTMessageV2 straight from a Business Rule — a slow vendor blocks the transaction. Push the call into an async Subflow or an Event so the record save returns instantly.",
  },
  {
    id: "spokes",
    title: "2. IntegrationHub Spokes — what's inside, what's licensed?",
    prompt:
      "A team wants the Microsoft Teams Spoke. What do Spokes actually give you, and what's the licensing gotcha?",
    approach: [
      "A Spoke is a Scoped App containing pre-built Actions (post message, create channel, etc.), authentication profiles, and connection aliases.",
      "Actions are consumable inside Flow Designer without writing REST steps — the vendor API is abstracted behind typed inputs and outputs.",
      "Spokes require an IntegrationHub subscription tier: Starter, Standard, Professional, or Enterprise — each unlocks a wider Spoke catalog and higher transaction limits.",
      "Transactions are counted per outbound Action execution — plan Flows so a single event doesn't fan out into hundreds of billable calls.",
    ],
    code: `// Using the Microsoft Teams Spoke inside a Flow
// Trigger: incident.priority changes to 1
// Action:  Post Message (Teams Spoke)
inputs.connection = 'msteams_ops_channel';   // connection alias
inputs.message    = '🚨 P1 ' + current.number + ' — ' + current.short_description;

// The Spoke handles OAuth token refresh + retry
outputs.message_id = '17245552-abc';`,
    output: {
      table: "sys_hub_action",
      logs: [
        { time: "", text: "Spoke: Microsoft Teams", tone: "info" },
        { time: "", text: "Action: Post Message → #ops-alerts", tone: "info" },
        { time: "", text: "posted (id 17245552-abc) — 1 IH transaction", tone: "ok" },
      ],
      rows: [
        { number: "INC0012345", state: "notified", updated: "teams", highlight: "ok" },
      ],
    },
    pitfall:
      "A Flow that loops over N records and calls a Spoke Action per row is N transactions, not one. Batch server-side (or use a single bulk Action) before you burn the annual quota in a week.",
  },
  {
    id: "auth-profiles",
    title: "3. Authentication profiles — Basic, OAuth 2.0, mutual TLS",
    prompt:
      "How do you set up OAuth 2.0 for an outbound REST integration, and where does the refresh token actually live?",
    approach: [
      "Create an OAuth Provider profile under System OAuth → Application Registry (type: 'Connect to a third-party OAuth Provider').",
      "Bind it to a Connection & Credential Alias so Flow Designer / REST messages resolve the token at runtime — never hard-code the client secret in a script.",
      "ServiceNow stores access + refresh tokens in oauth_credential; refresh happens automatically before expiry when the token store record has a valid refresh_token.",
      "For mutual TLS, upload the client cert to the Certificates table and reference it on the Connection — the platform handles the TLS handshake.",
    ],
    code: `// Retrieve token programmatically (rarely needed — Spokes do it for you)
var oa = new sn_auth.GlideOAuthClient();
var params = { grant_type: 'refresh_token' };
var tokenResp = oa.requestTokenByRequest('jira_oauth', JSON.stringify(params));

var token = tokenResp.getToken();
gs.info('access_token expires_in=' + token.getExpiresIn());

// Attach to a REST message
r.setRequestHeader('Authorization','Bearer ' + token.getAccessToken());`,
    output: {
      table: "oauth_credential",
      logs: [
        { time: "", text: "profile: jira_oauth", tone: "info" },
        { time: "", text: "refresh_token used → new access_token (3599s)", tone: "ok" },
        { time: "", text: "credential row updated", tone: "info" },
      ],
      rows: [
        { number: "jira_oauth", state: "active", updated: "refresh", highlight: "ok" },
      ],
    },
    pitfall:
      "Basic Auth with a personal named account works — until that person leaves. Always bind integrations to a dedicated integration user + OAuth or cert, never a human account.",
  },
  {
    id: "flow-error-handling",
    title: "4. Flow Designer error handling — retries, alternate paths, alerting",
    prompt:
      "The vendor returned 502 for 4 minutes overnight. Your Flow silently dropped 30 records. What's the correct error-handling pattern?",
    approach: [
      "Wrap the risky Action in a Subflow so you can control the return contract, then check the HTTP status code in a Decision step.",
      "For transient errors (5xx, 429), throw a script step error inside a retry loop — Flow Designer honors the sys_hub_flow.retry_policy for automatic backoff.",
      "For permanent errors (4xx), branch to an alternate path that writes to a queue table and notifies the integration owner.",
      "Always log the raw response body — truncated errors in the operations logs are the #1 blocker when triaging production outages.",
    ],
    code: `// Subflow — resilient outbound call
try {
  var resp = restStep.execute();          // Action: Send REST Request
  if (resp.statusCode >= 500) throw 'retryable';
  if (resp.statusCode >= 400) {
    gs.eventQueue('integration.dead_letter', current, resp.body, resp.statusCode);
    return { status: 'dropped' };
  }
  return { status: 'ok', id: resp.body.id };
} catch (e) {
  // Flow Designer retry policy will re-invoke the Subflow
  throw new Error('retryable: ' + e);
}`,
    output: {
      table: "sys_hub_flow_context",
      logs: [
        { time: "", text: "attempt 1 → 502", tone: "warn" },
        { time: "", text: "retry (backoff 30s) → 502", tone: "warn" },
        { time: "", text: "retry (backoff 90s) → 201 Created", tone: "ok" },
        { time: "", text: "context COMPLETED — 1 record synced", tone: "ok" },
      ],
      rows: [
        { number: "INC0012399", state: "synced", updated: "retry3", highlight: "ok" },
      ],
    },
    pitfall:
      "Catching an error in a Script step and returning success masks the failure — the Flow context shows COMPLETED but the record never left. Re-throw so the platform records the failed run.",
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
  headline: "ServiceNow IntegrationHub & REST API Interview Questions",
  description: DESCRIPTION,
  url: URL,
  datePublished: "2026-07-10",
  dateModified: "2026-07-10",
  author: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  publisher: { "@type": "Organization", name: "SparkCoder Online", url: "https://www.sparkcoder.online" },
  about: "ServiceNow IntegrationHub, REST APIs, Spokes, and Flow Designer",
  audience: { "@type": "Audience", audienceType: "ServiceNow Developers and Architects" },
};

export const Route = createFileRoute("/learn/integrationhub-interview-questions")({
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
  component: IntegrationHubGuide,
});

function IntegrationHubGuide() {
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
            Interview Prep · IntegrationHub & REST
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            INTEGRATIONHUB
            <br />
            <span className="text-accent">INTERVIEW.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Four scenario lessons on REST vs SOAP, IntegrationHub Spokes, authentication
            profiles, and Flow Designer error handling — each with a runnable simulator
            trace showing the exact platform behavior.
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            Pair with the{" "}
            <Link to="/learn/flow-designer-interview-questions" className="text-accent underline">
              Flow Designer guide
            </Link>{" "}
            and the{" "}
            <Link to="/learn/discovery-interview-questions" className="text-accent underline">
              Discovery guide
            </Link>{" "}
            for full integration coverage.
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
              to="/learn/flow-designer-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              Flow Designer Q&amp;A
            </Link>
            <Link
              to="/learn/glideajax-interview-questions"
              className="h-10 px-4 inline-flex items-center rounded-xl border-2 border-border bg-background text-sm font-display tracking-wider uppercase hover:border-accent/50"
            >
              GlideAjax Q&amp;A
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
