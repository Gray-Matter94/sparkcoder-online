import { createFileRoute, Link } from "@tanstack/react-router";
import { StatsBar } from "@/components/StatsBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useProgress } from "@/lib/progress";

const TITLE = "AngularJS Coding Test — Practice Questions with Answers";
const DESCRIPTION =
  "Hands-on AngularJS coding test on scopes, digest cycles, directives, services, $http promises and routing — with model answers and timed drills.";
const URL = "https://www.sparkcoder.online/angularjs-coding-test";

interface QA {
  q: string;
  a: string;
  code?: string;
  topic: string;
  practiceCategory: "ng-scope" | "ng-directives" | "ng-services" | "ng-http" | "ng-routing";
}

const QUESTIONS: QA[] = [
  {
    topic: "Scopes & Digest",
    practiceCategory: "ng-scope",
    q: "An async callback mutates $scope but the view doesn't update. Fix it.",
    a: "AngularJS only re-renders when a digest runs. Setting $scope from outside Angular (setTimeout, jQuery event, third-party SDK) leaves the digest unaware. Wrap the mutation in $scope.$apply() — or use $timeout / $http which schedule a digest for you.",
    code: `setTimeout(function () {
  $scope.$apply(function () {
    $scope.user = data;
  });
}, 500);`,
  },
  {
    topic: "Scopes & Digest",
    practiceCategory: "ng-scope",
    q: "What's the difference between $watch, $watchCollection, and $watchGroup?",
    a: "$watch does reference equality (or deep with a third arg). $watchCollection is a shallow check on array / object keys — cheaper than a deep watch when you only care about add/remove. $watchGroup fires once per digest for any change across a list of expressions, with the new + old arrays.",
  },
  {
    topic: "Directives",
    practiceCategory: "ng-directives",
    q: "Difference between compile, controller, pre-link, and post-link?",
    a: "Order: compile (template manipulation, runs once per template) → controller (DI-injected, runs per instance) → pre-link (parent before children) → post-link (children before parent — the default 'link' you write). Mutate DOM in post-link; transform the template in compile.",
  },
  {
    topic: "Directives",
    practiceCategory: "ng-directives",
    q: "Scope: true vs scope: {} vs scope: false — when do you pick which?",
    a: "false = share parent scope (cheap, but reads/writes pollute). true = new child scope that prototypically inherits (good for widgets that read parent state). {} = isolate scope (best for reusable components — explicit bindings with @, =, &).",
  },
  {
    topic: "Services & DI",
    practiceCategory: "ng-services",
    q: "factory vs service vs provider?",
    a: "factory: returns whatever you return — usually an object literal. service: NEW's your constructor (this. members become the API). provider: configurable at module.config() time via a $get() — use only when you need config-phase setup like an API base URL.",
  },
  {
    topic: "Services & DI",
    practiceCategory: "ng-services",
    q: "Why does minification break my AngularJS app?",
    a: "AngularJS infers dependencies from parameter names. Minifiers rename them to a, b, c. Use the inline array annotation: app.controller('X', ['$scope', '$http', function ($scope, $http) { ... }]) or ng-annotate to add it automatically.",
  },
  {
    topic: "HTTP & Promises",
    practiceCategory: "ng-http",
    q: "How do you cancel an in-flight $http request?",
    a: "Pass a timeout that's a $q.defer().promise; resolve the deferred to abort. New code can also pass an AbortController-style canceller via the request config timeout property.",
    code: `var canceller = $q.defer();
$http.get('/api/search', { timeout: canceller.promise });
// later
canceller.resolve();`,
  },
  {
    topic: "HTTP & Promises",
    practiceCategory: "ng-http",
    q: "What's the right way to attach a global auth header to every request?",
    a: "Write an $http interceptor with a request function that adds the header, register it in $httpProvider.interceptors during config phase. Don't monkey-patch $http or set defaults from a controller — interceptors are the only place that runs for every call.",
  },
  {
    topic: "Routing",
    practiceCategory: "ng-routing",
    q: "ngRoute vs ui-router — which would you pick?",
    a: "ui-router for any non-trivial app — it supports nested + named views, state-based navigation, and proper resolve cascades. ngRoute is fine for a single-level URL → template app, nothing more.",
  },
  {
    topic: "Routing",
    practiceCategory: "ng-routing",
    q: "What does resolve do in a route definition?",
    a: "resolve returns a map of promises that must settle before the route's controller instantiates. Use it to preload required data so the view never flashes empty; the resolved values are injected into the controller by name.",
  },
];

const QUIZ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Quiz",
  name: "AngularJS Coding Test",
  description: DESCRIPTION,
  url: URL,
  about: "AngularJS framework concepts",
  educationalLevel: "intermediate",
  numberOfQuestions: QUESTIONS.length,
};

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map((q) => ({
    "@type": "Question",
    name: q.q,
    acceptedAnswer: { "@type": "Answer", text: q.a },
  })),
};

export const Route = createFileRoute("/angularjs-coding-test")({
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
      { type: "application/ld+json", children: JSON.stringify(QUIZ_JSONLD) },
      { type: "application/ld+json", children: JSON.stringify(FAQ_JSONLD) },
    ],
  }),
  component: AngularCodingTestPage,
});

function AngularCodingTestPage() {
  const { progress } = useProgress();
  const topics = Array.from(new Set(QUESTIONS.map((q) => q.topic)));

  return (
    <div className="min-h-screen flex flex-col">
      <ErrorBoundary name="Stats">
        <StatsBar progress={progress} back />
      </ErrorBoundary>

      <main className="flex-1 max-w-3xl w-full mx-auto p-5 sm:p-8 space-y-8 pb-24">
        <header className="space-y-3 animate-fade-in">
          <span className="text-[10px] uppercase tracking-[0.25em] text-accent font-bold">
            Coding Test · AngularJS 1.x
          </span>
          <h1 className="font-display text-4xl sm:text-5xl leading-[0.95] tracking-tight">
            ANGULARJS
            <br />
            <span className="text-accent">CODING TEST.</span>
          </h1>
          <p className="text-sm text-foreground/85 leading-relaxed">
            Ten questions an AngularJS interviewer or take-home test will ask: digest
            timing, directive lifecycle, DI, $http cancellation, and ui-router resolves.
            Read, then run the timed drills to grade yourself.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              to="/practice/$category"
              params={{ category: "ng-scope" }} search={{ difficulty: undefined }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Drill: Scopes
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "ng-directives" }} search={{ difficulty: undefined }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Drill: Directives
            </Link>
            <Link
              to="/practice/$category"
              params={{ category: "ng-http" }} search={{ difficulty: undefined }}
              className="h-9 px-3 inline-flex items-center rounded-xl border-2 border-accent/50 bg-accent/10 text-accent text-xs font-display tracking-wider uppercase hover:bg-accent/20"
            >
              Drill: HTTP
            </Link>
          </div>
        </header>

        {topics.map((topic) => (
          <section key={topic} className="space-y-4">
            <h2 className="font-display text-2xl tracking-tight text-accent">
              {topic}
            </h2>
            <ol className="space-y-4">
              {QUESTIONS.filter((q) => q.topic === topic).map((q, i) => (
                <li
                  key={i}
                  className="rounded-2xl border-2 border-border bg-panel p-5 space-y-3"
                >
                  <h3 className="font-display text-base tracking-tight">{q.q}</h3>
                  <p className="text-sm text-foreground/85 leading-relaxed">{q.a}</p>
                  {q.code && (
                    <pre className="rounded-xl bg-zinc-900 text-foreground/90 text-[12px] font-mono p-4 overflow-x-auto border border-white/10">
                      <code>{q.code}</code>
                    </pre>
                  )}
                  <Link
                    to="/practice/$category"
                    params={{ category: q.practiceCategory }} search={{ difficulty: undefined }}
                    className="text-[11px] font-mono text-accent underline"
                  >
                    → Practice this topic
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </main>
    </div>
  );
}
