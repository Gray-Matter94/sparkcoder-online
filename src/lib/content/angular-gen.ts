import type { Category, Question, SimulatorOutput } from "../questions";

/**
 * Programmatic puzzle pool for the AngularJS (1.x) Developer track.
 */

const DIRECTIVES = ["ng-click", "ng-show", "ng-hide", "ng-if", "ng-repeat", "ng-model", "ng-bind", "ng-class", "ng-href", "ng-src"];
const SCOPE_FIELDS = ["user", "form", "items", "selected", "filter", "config", "tab", "page"];
const SERVICES = ["$http", "$q", "$timeout", "$interval", "$location", "$route", "$rootScope", "$compile"];
const STATES = ["home", "users", "users.detail", "settings", "billing", "billing.invoices"];
const HTTP_METHODS = ["get", "post", "put", "delete", "patch"];

function T(offset = 0) {
  const base = new Date(2024, 0, 1, 13, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[((i % arr.length) + arr.length) % arr.length];
}

function makeQ(q: Omit<Question, "options"> & {
  options: Array<{ id: string; text: string; correct: boolean; wrongTitle?: string; wrongExplain?: string; wrongSim?: SimulatorOutput }>;
}): Question {
  return {
    ...q,
    options: q.options.map((o) => ({
      id: o.id,
      text: o.text,
      correct: o.correct,
      feedback: o.correct
        ? { title: "", explain: "", sim: { rows: [], logs: [] } }
        : {
            title: o.wrongTitle ?? "Not quite",
            explain: o.wrongExplain ?? "Re-read the digest / DI rules — pick the idiomatic Angular 1 pattern.",
            sim: o.wrongSim ?? { rows: [], logs: [{ time: T(0), text: "View did not update or DI failed.", tone: "bad" }] },
          },
    })),
  };
}

/* ============ SCOPES & DIGEST ============ */
function scopePool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // Template A: async + $apply
  for (let i = 0; i < 14; i++) {
    seq++;
    const field = pick(SCOPE_FIELDS, i);
    out.push(makeQ({
      id: `gen-ng-apply-${seq}`,
      category: "ng-scope",
      level: 1 + (i % 3),
      filename: `Ctrl${seq}.js`,
      title: `Native ${i % 2 ? "setTimeout" : "WebSocket.onmessage"} mutated $scope.${field} but the view is stale. Fix.`,
      code: [
        `app.controller('Ctrl', function($scope) {`,
        `  ${i % 2 ? "setTimeout" : "ws.onmessage = "} (function() {`,
        `    $scope.${field} = ${i % 2 ? "'updated'" : "JSON.parse(evt.data)"};`,
        `    {{SLOT}}`,
        `  }${i % 2 ? ", 100);" : "};"}`,
        `});`,
      ],
      options: [
        { id: "a", text: "$scope.$apply();", correct: true },
        { id: "b", text: "$scope.$digest();", correct: false, wrongTitle: "Throws if a digest is already in flight", wrongExplain: "`$digest` only walks the current scope and errors with 'inprog' under contention. `$apply` calls `$rootScope.$digest` safely." },
        { id: "c", text: "// nothing — Angular polls", correct: false, wrongTitle: "Angular doesn't poll", wrongExplain: "Angular runs a digest only when its own APIs trigger it ($http, ng-click, $timeout). Native async needs $apply." },
      ],
      correctSim: { rows: [{ number: `$scope.${field}`, state: "rendered", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "$apply → $rootScope.$digest → DOM updated", tone: "ok" }] },
      correctTeach: { title: "$apply bridges non-Angular async into the digest", explain: "Prefer $timeout / $interval / $http — they wrap $apply for you. Use raw $apply only when integrating third-party libs." },
    }));
  }

  // Template B: dot rule in scope
  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-dotrule-${seq}`,
      category: "ng-scope",
      level: 2,
      filename: `form${seq}.html`,
      title: `ng-model on a primitive inside ng-if breaks two-way binding. Fix the model shape.`,
      code: [
        `<div ng-if="show">`,
        `  <input ng-model="{{SLOT}}">`,
        `</div>`,
      ],
      options: [
        { id: "a", text: "form.username", correct: true },
        { id: "b", text: "username", correct: false, wrongTitle: "Child scope shadows the primitive", wrongExplain: "ng-if creates a child scope. Assigning to a bare primitive writes to the child — the parent value never updates. Use an object: `form.username`." },
        { id: "c", text: "$parent.username", correct: false, wrongTitle: "$parent works but is fragile", wrongExplain: "Walking $parent breaks the moment you nest another scope-creating directive. Use the dot rule: always bind to a property of an object." },
      ],
      correctSim: { rows: [{ number: "form.username", state: "two-way bound across child scope", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Dot rule observed — parent object reference shared", tone: "ok" }] },
      correctTeach: { title: "Always have a dot in ng-model", explain: "Bind to `obj.prop`, not `prop`. Object references are inherited; primitives are shadowed on child scope writes." },
    }));
  }

  // Template C: $watch perf
  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-watch-${seq}`,
      category: "ng-scope",
      level: 2 + (i % 2),
      filename: `Watch${seq}.js`,
      title: `Watch a large array for changes without crushing the digest. Pick the cheapest variant.`,
      code: [
        `$scope.$watch{{SLOT}}('items', function(v) { ... });`,
      ],
      options: [
        { id: "a", text: "Collection", correct: true },
        { id: "b", text: "", correct: false, wrongTitle: "Reference watch misses internal mutations", wrongExplain: "Default $watch compares by reference. Push/splice on the same array won't fire. Use $watchCollection for shallow array/object changes." },
        { id: "c", text: ", true /* deep */", correct: false, wrongTitle: "Deep watch is the slowest path", wrongExplain: "Passing `true` does deep equality every digest — O(n) per cycle. Prefer $watchCollection unless you truly need deep nested change detection." },
      ],
      correctSim: { rows: [{ number: "$watchCollection", state: "shallow, O(n) on add/remove only", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Fires on item add/remove/replace, not internal mutation", tone: "ok" }] },
      correctTeach: { title: "Pick the cheapest watch", explain: "Identity: $watch (reference). Shallow: $watchCollection. Deep: $watch(expr, fn, true). Always prefer the lightest one that detects what you need." },
    }));
  }

  return out;
}

/* ============ DIRECTIVES ============ */
function directivePool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  DIRECTIVES.forEach((d, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-ng-builtin-${seq}`,
        category: "ng-directives",
        level: 1 + ((i + k) % 3),
        filename: `tpl${seq}.html`,
        title: `Pick the directive to ${d === "ng-click" ? "run a handler on click" : d === "ng-show" || d === "ng-hide" ? "show/hide based on a boolean (kept in DOM)" : d === "ng-if" ? "show/hide AND remove from DOM" : d === "ng-repeat" ? "render a list" : d === "ng-model" ? "two-way bind an input" : d === "ng-bind" ? "render text without {{}} flicker" : d === "ng-class" ? "toggle a CSS class on a boolean" : d === "ng-href" ? "build an href without showing the unrendered template" : "build an src without showing the unrendered template"}.`,
        code: [
          `<${d.startsWith("ng-h") || d === "ng-src" ? "a" : "div"} {{SLOT}}>...`,
        ],
        options: [
          { id: "a", text: `${d}="${d === "ng-click" ? "save()" : d === "ng-repeat" ? "i in items" : d === "ng-class" ? "{ active: isActive }" : "expr"}"`, correct: true },
          { id: "b", text: `${pick(DIRECTIVES.filter((x) => x !== d), i + k)}="..."`, correct: false, wrongTitle: "Wrong directive", wrongExplain: `That directive solves a different problem. Re-read the requirement and pick the one named for the behaviour.` },
          { id: "c", text: `data-${d}-x="..."`, correct: false, wrongTitle: "Made-up directive", wrongExplain: "Built-ins are exactly `ng-*`. The data- prefix is only used for HTML5-validity, not for renaming." },
        ],
        correctSim: { rows: [{ number: d, state: "applied", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Built-in ${d} compiled into the template`, tone: "ok" }] },
        correctTeach: { title: "Built-ins solve 90% of templating needs", explain: "Reach for custom directives only when you need to encapsulate complex DOM behaviour or third-party widgets." },
      }));
    }
  });

  // Isolate scope binding modes
  const bindings = [
    { sigil: "@", name: "string attribute" },
    { sigil: "=", name: "two-way binding" },
    { sigil: "&", name: "callback expression" },
    { sigil: "<", name: "one-way binding (1.5+)" },
  ];
  bindings.forEach((b, i) => {
    for (let k = 0; k < 5; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-ng-iso-${seq}`,
        category: "ng-directives",
        level: 2 + (k % 2),
        filename: `comp${seq}.js`,
        title: `In an isolate scope, which sigil gives a ${b.name}?`,
        code: [
          `scope: { value: '{{SLOT}}' }`,
        ],
        options: [
          { id: "a", text: b.sigil, correct: true },
          { id: "b", text: pick(bindings.filter((x) => x.sigil !== b.sigil), i + k).sigil, correct: false, wrongTitle: "Wrong binding mode", wrongExplain: `Sigils have specific meanings: @ string, = two-way, & callback, < one-way. Pick the one that matches.` },
          { id: "c", text: "*", correct: false, wrongTitle: "Not a valid sigil", wrongExplain: "Angular 1 isolate-scope sigils are exactly @, =, &, < (1.5+)." },
        ],
        correctSim: { rows: [{ number: `binding=${b.sigil}`, state: b.name, updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `Isolate scope created with ${b.sigil}`, tone: "ok" }] },
        correctTeach: { title: "Memorise the four sigils", explain: "Use < whenever possible (1.5+) — one-way is faster and avoids the digest churn of =." },
      }));
    }
  });

  return out;
}

/* ============ SERVICES & DI ============ */
function servicePool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  // factory vs service vs provider
  for (let i = 0; i < 12; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-factory-${seq}`,
      category: "ng-services",
      level: 1 + (i % 3),
      filename: `mod${seq}.js`,
      title: `Register a singleton that returns an object literal — pick the simplest recipe.`,
      code: [
        `app.{{SLOT}}('Api', function() {`,
        `  return { get: function() { ... } };`,
        `});`,
      ],
      options: [
        { id: "a", text: "factory", correct: true },
        { id: "b", text: "service", correct: false, wrongTitle: "service expects a constructor", wrongExplain: "`service` instantiates the function with `new`. Returning an object from a constructor is awkward — `factory` is the idiomatic choice when you have a literal." },
        { id: "c", text: "provider", correct: false, wrongTitle: "Provider is for config-time customization", wrongExplain: "Use `provider` only when consumers need to configure the service in app.config(). Otherwise `factory` is simpler." },
      ],
      correctSim: { rows: [{ number: "Api", state: "factory registered as singleton", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "factory() invoked once, result cached", tone: "ok" }] },
      correctTeach: { title: "factory → return any value; service → newed; provider → configurable", explain: "Default to factory. Use service when you actually want `this` semantics, provider when consumers need to configure at config-phase." },
    }));
  }

  // DI safe from minification
  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-minsafe-${seq}`,
      category: "ng-services",
      level: 2,
      filename: `Ctrl${seq}.js`,
      title: `Make this controller minification-safe.`,
      code: [
        `app.controller('Ctrl', {{SLOT}});`,
      ],
      options: [
        { id: "a", text: "['$scope', '$http', function($scope, $http) { ... }]", correct: true },
        { id: "b", text: "function($scope, $http) { ... }", correct: false, wrongTitle: "Breaks under minification", wrongExplain: "Minifiers rename `$scope` → `a`, `$http` → `b`. Angular then can't resolve injectables. Use the inline-array or $inject form." },
        { id: "c", text: "function(s, h) { ... }", correct: false, wrongTitle: "Lost dependency names entirely", wrongExplain: "Angular needs the original names to resolve. Use the inline-array annotation." },
      ],
      correctSim: { rows: [{ number: "Ctrl", state: "min-safe DI annotation", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Resolved $scope, $http after minify", tone: "ok" }] },
      correctTeach: { title: "Inline-array or $inject — always", explain: "Equivalent: `Ctrl.$inject = ['$scope', '$http'];`. Pick one convention and lint for it (ng-annotate handles it automatically)." },
    }));
  }

  SERVICES.forEach((svc, i) => {
    for (let k = 0; k < 4; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-ng-svc-${seq}`,
        category: "ng-services",
        level: 2 + (k % 2),
        filename: `use_${svc.replace("$", "")}_${seq}.js`,
        title: `Pick the built-in service to ${svc === "$http" ? "make an HTTP request" : svc === "$q" ? "build a deferred promise" : svc === "$timeout" ? "schedule work inside the digest" : svc === "$interval" ? "run a repeating digest-aware task" : svc === "$location" ? "read/write the URL" : svc === "$route" ? "configure route → template + controller" : svc === "$rootScope" ? "broadcast events app-wide" : "compile dynamic HTML into a directive-aware element"}.`,
        code: [
          `app.controller('X', ['{{SLOT}}', function(s) { ... }]);`,
        ],
        options: [
          { id: "a", text: svc, correct: true },
          { id: "b", text: pick(SERVICES.filter((s) => s !== svc), i + k), correct: false, wrongTitle: "Different service", wrongExplain: "That service exists but solves a different problem. Re-read the requirement." },
          { id: "c", text: `$ng${svc.slice(1)}`, correct: false, wrongTitle: "Made-up name", wrongExplain: "Built-in services use the original $-prefixed names. There's no $ng* convention in Angular 1." },
        ],
        correctSim: { rows: [{ number: svc, state: "injected", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `${svc} resolved by the DI container`, tone: "ok" }] },
        correctTeach: { title: "Built-in services start with $", explain: "Custom services should NOT use the $ prefix — that's reserved for Angular core." },
      }));
    }
  });

  return out;
}

/* ============ HTTP & PROMISES ============ */
function httpPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  HTTP_METHODS.forEach((m, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-ng-http-${m}-${seq}`,
        category: "ng-http",
        level: 1 + ((i + k) % 3),
        filename: `api${seq}.js`,
        title: `${m.toUpperCase()} /api/users${m === "get" ? "" : "/123"} the idiomatic way.`,
        code: [
          `$http.{{SLOT}}.then(function(res) { $scope.data = res.data; });`,
        ],
        options: [
          { id: "a", text: m === "get" || m === "delete" ? `${m}('/api/users/123')` : `${m}('/api/users/123', payload)`, correct: true },
          { id: "b", text: `${m}({ url: '/api/users/123' })`, correct: false, wrongTitle: "Wrong call shape", wrongExplain: "$http verb methods are: get(url), post(url, data), put(url, data), patch(url, data), delete(url). The object form is the generic `$http(config)`." },
          { id: "c", text: `$http({ method: '${m.toUpperCase()}' }).url('/api/users/123')`, correct: false, wrongTitle: "Not chainable like that", wrongExplain: "Use either `$http({method, url, data})` or the convenience verb methods. There's no .url() chaining." },
        ],
        correctSim: { rows: [{ number: `${m.toUpperCase()} /api/users/123`, state: "200 OK", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Promise resolved with response object", tone: "ok" }] },
        correctTeach: { title: "$http verb methods are the shortcut", explain: "Use them for ergonomic API calls; reach for $http({...}) only when you need full config control (transformRequest, timeout, cancel)." },
      }));
    }
  });

  for (let i = 0; i < 10; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-promise-chain-${seq}`,
      category: "ng-http",
      level: 2,
      filename: `chain${seq}.js`,
      title: `Chain two HTTP calls and surface the final result.`,
      code: [
        `$http.get('/a').then(function(ra) {`,
        `  {{SLOT}}`,
        `}).then(function(rb) {`,
        `  $scope.result = rb.data;`,
        `});`,
      ],
      options: [
        { id: "a", text: "return $http.get('/b?id=' + ra.data.id);", correct: true },
        { id: "b", text: "$http.get('/b?id=' + ra.data.id);", correct: false, wrongTitle: "Returned undefined — chain broken", wrongExplain: "Forgetting `return` means the next .then receives `undefined`. Always return the inner promise so the outer chain awaits it." },
        { id: "c", text: "$http.get('/b?id=' + ra.data.id).then(...);", correct: false, wrongTitle: "Nests instead of chains", wrongExplain: "This creates pyramid-of-doom nesting and the outer chain doesn't wait. Return the inner promise to flatten." },
      ],
      correctSim: { rows: [{ number: "GET /a → /b", state: "chained sequentially", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Outer chain awaited the inner promise", tone: "ok" }] },
      correctTeach: { title: "Always return the inner promise", explain: "`then` returns a NEW promise that resolves with whatever you `return`. Without return, the chain races past the inner call." },
    }));
  }

  for (let i = 0; i < 8; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-q-all-${seq}`,
      category: "ng-http",
      level: 2 + (i % 2),
      filename: `parallel${seq}.js`,
      title: `Fire ${2 + i} HTTP calls in parallel and wait for ALL of them.`,
      code: [
        `{{SLOT}}.then(function(results) {`,
        `  $scope.payload = results;`,
        `});`,
      ],
      options: [
        { id: "a", text: "$q.all([$http.get('/a'), $http.get('/b')])", correct: true },
        { id: "b", text: "$http.get('/a'); $http.get('/b');", correct: false, wrongTitle: "Fire-and-forget, no joining", wrongExplain: "Without $q.all you can't wait for both. The next line runs before either resolves." },
        { id: "c", text: "$http.get('/a').then($http.get('/b'))", correct: false, wrongTitle: "Sequential, not parallel", wrongExplain: "`.then(promise)` doesn't fire /b until /a resolves. Use `$q.all([...])` for parallelism." },
      ],
      correctSim: { rows: [{ number: "$q.all([2])", state: "both resolved", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Results arrive in input order", tone: "ok" }] },
      correctTeach: { title: "$q.all for fan-out, $q.race for first-wins", explain: "Both array and object inputs are supported. Use $q.allSettled (1.6+) to keep going on partial failure." },
    }));
  }

  return out;
}

/* ============ ROUTING ============ */
function routingPool(): Question[] {
  const out: Question[] = [];
  let seq = 0;

  STATES.forEach((state, i) => {
    for (let k = 0; k < 6; k++) {
      seq++;
      out.push(makeQ({
        id: `gen-ng-state-${seq}`,
        category: "ng-routing",
        level: 1 + ((i + k) % 3),
        filename: `routes${seq}.js`,
        title: `Define a ui-router state '${state}' that loads /tpl/${state.replace(/\./g, "-")}.html with controller '${state.split(".").slice(-1)[0]}Ctrl'.`,
        code: [
          `$stateProvider.state('${state}', {`,
          `  {{SLOT}},`,
          `  templateUrl: '/tpl/${state.replace(/\./g, "-")}.html',`,
          `  controller: '${state.split(".").slice(-1)[0]}Ctrl'`,
          `});`,
        ],
        options: [
          { id: "a", text: `url: '/${state.split(".").slice(-1)[0]}'`, correct: true },
          { id: "b", text: `path: '/${state.split(".").slice(-1)[0]}'`, correct: false, wrongTitle: "ui-router uses `url`, not `path`", wrongExplain: "Property name is `url`. (You may be confusing it with Express/React Router conventions.)" },
          { id: "c", text: `route: '/${state.split(".").slice(-1)[0]}'`, correct: false, wrongTitle: "Property doesn't exist", wrongExplain: "ui-router state config has `url`, `templateUrl`, `controller`, `resolve`. There is no `route` key." },
        ],
        correctSim: { rows: [{ number: state, state: "route registered", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: `$state.go('${state}') resolves correctly`, tone: "ok" }] },
        correctTeach: { title: "State config keys: url, templateUrl, controller, resolve", explain: "Dotted state names create parent/child hierarchy — the child URL is appended to the parent's url." },
      }));
    }
  });

  for (let i = 0; i < 12; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-resolve-${seq}`,
      category: "ng-routing",
      level: 2,
      filename: `resolve${seq}.js`,
      title: `Load user data BEFORE the controller boots — pick the right state key.`,
      code: [
        `$stateProvider.state('user', {`,
        `  url: '/user/:id',`,
        `  {{SLOT}}: {`,
        `    user: ['UserApi', '$stateParams', function(Api, p) { return Api.get(p.id); }]`,
        `  },`,
        `  controller: 'UserCtrl'`,
        `});`,
      ],
      options: [
        { id: "a", text: "resolve", correct: true },
        { id: "b", text: "data", correct: false, wrongTitle: "`data` is for arbitrary metadata", wrongExplain: "ui-router's `data` is a generic stash for state metadata (e.g. permission flags). For preload-with-promise behaviour, use `resolve`." },
        { id: "c", text: "loader", correct: false, wrongTitle: "Wrong framework", wrongExplain: "`loader` is React Router / Remix terminology. ui-router uses `resolve`." },
      ],
      correctSim: { rows: [{ number: "user.resolve", state: "promises awaited before controller", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "All resolves done → controller instantiated with injected data", tone: "ok" }] },
      correctTeach: { title: "resolve runs before the view renders", explain: "All resolve keys are injected by name into the controller. Use this to avoid 'undefined' flicker while data loads." },
    }));
  }

  for (let i = 0; i < 8; i++) {
    seq++;
    out.push(makeQ({
      id: `gen-ng-uiview-${seq}`,
      category: "ng-routing",
      level: 2 + (i % 2),
      filename: `layout${seq}.html`,
      title: `Mount the state's template into the layout. Which directive?`,
      code: [
        `<header>...</header>`,
        `<main {{SLOT}}></main>`,
      ],
      options: [
        { id: "a", text: 'ui-view', correct: true },
        { id: "b", text: 'ng-view', correct: false, wrongTitle: "That's ngRoute, not ui-router", wrongExplain: "`ng-view` belongs to Angular's built-in ngRoute. ui-router uses `ui-view` (and supports named/nested views)." },
        { id: "c", text: 'router-outlet', correct: false, wrongTitle: "That's Angular 2+ / Angular Router", wrongExplain: "AngularJS 1.x uses ui-view (ui-router) or ng-view (ngRoute). router-outlet is Angular 2+." },
      ],
      correctSim: { rows: [{ number: "<ui-view>", state: "rendered template injected", updated: "now", highlight: "ok" }], logs: [{ time: T(0), text: "Active state's templateUrl loaded into ui-view", tone: "ok" }] },
      correctTeach: { title: "ui-view = ui-router; ng-view = ngRoute", explain: "Named views (`<div ui-view='sidebar'>`) let you target multiple regions from a single state config." },
    }));
  }

  return out;
}

let cache: Question[] | null = null;
export function angularGeneratedQuestions(): Question[] {
  if (cache) return cache;
  cache = [...scopePool(), ...directivePool(), ...servicePool(), ...httpPool(), ...routingPool()];
  return cache;
}
export function angularGeneratedQuestionsFor(cat: Category): Question[] {
  return angularGeneratedQuestions().filter((q) => q.category === cat);
}
