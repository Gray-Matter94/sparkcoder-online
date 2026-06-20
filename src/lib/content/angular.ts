import type { CategoryMeta, Question } from "../questions";
import type { Topic, Term } from "../glossary";
import type { QuizQuestion, QuizSection } from "../quizzes";

/* ============== CATEGORIES ============== */

export const ANGULAR_CATEGORIES: CategoryMeta[] = [
  { id: "ng-scope", name: "Scopes & Digest", emoji: "🔁", blurb: "$scope, $apply, $watch", color: "destructive", track: "angular-dev" },
  { id: "ng-directives", name: "Directives", emoji: "🧩", blurb: "ng-*, custom directives, link fn", color: "primary", track: "angular-dev" },
  { id: "ng-services", name: "Services & DI", emoji: "💉", blurb: "factory, service, provider", color: "accent", track: "angular-dev" },
  { id: "ng-http", name: "HTTP & Promises", emoji: "🌐", blurb: "$http, $q, interceptors", color: "secondary", track: "angular-dev" },
  { id: "ng-routing", name: "Routing", emoji: "🧭", blurb: "ngRoute, ui-router, resolve", color: "primary", track: "angular-dev" },
];

const T = (offset = 0) => {
  const base = new Date(2024, 0, 1, 10, 0, 0).getTime() + offset * 1000;
  const d = new Date(base);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
};

const okRow = (n: string, s: string) => ({ number: n, state: s, updated: "now", highlight: "ok" as const });
const badRow = (n: string, s: string) => ({ number: n, state: s, updated: "now", highlight: "bad" as const });

export const ANGULAR_QUESTIONS: Question[] = [
  // ----- Scopes & Digest -----
  {
    id: "ng-sc-1",
    category: "ng-scope",
    level: 1,
    filename: "ctrl.js",
    title: "Async work changed scope state but the view didn't update. Fix it.",
    code: [
      "app.controller('Ctrl', function($scope) {",
      "  setTimeout(function() {",
      "    $scope.name = 'Ada';",
      "    {{SLOT}}",
      "  }, 100);",
      "});",
    ],
    options: [
      { id: "a", text: "$scope.$apply();", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "// nothing — Angular polls automatically",
        correct: false,
        feedback: {
          title: "No polling",
          explain: "Angular only runs a digest when its own APIs ($http, ng-click, $timeout) trigger it. Native setTimeout is outside that loop.",
          sim: { rows: [badRow("View", "still empty")], logs: [{ time: T(), text: "model changed, DOM stale", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "$scope.$digest();",
        correct: false,
        feedback: {
          title: "Throws if a digest is already running",
          explain: "$digest only runs on the current scope and errors with 'inprog' if one is already in flight. $apply wraps your code and calls $rootScope.$digest safely.",
          sim: { rows: [badRow("Error", "$digest already in progress")], logs: [{ time: T(), text: "use $apply, or $timeout instead of setTimeout", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "$scope",
      rows: [okRow("name", "Ada"), okRow("View", "rendered")],
      logs: [{ time: T(), text: "$apply → $rootScope.$digest → DOM updated", tone: "ok" }],
    },
    correctTeach: {
      title: "$apply bridges non-Angular async into the digest",
      explain: "Better still: use $timeout / $interval / $http — they wrap $apply for you. Reach for $apply only when integrating third-party libs (jQuery plugins, WebSocket callbacks).",
    },
  },
  {
    id: "ng-sc-2",
    category: "ng-scope",
    level: 2,
    filename: "form.html",
    title: "ng-model on a primitive in ng-if breaks two-way binding. Fix the model shape.",
    code: [
      "<div ng-if=\"show\">",
      "  <input ng-model=\"{{SLOT}}\">",
      "</div>",
    ],
    options: [
      { id: "a", text: "user.name", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "name",
        correct: false,
        feedback: {
          title: "Child scope shadows the primitive",
          explain: "ng-if/ng-repeat create child scopes. A primitive `name` is written to the child, never the parent — classic 'dot rule' violation.",
          sim: { rows: [badRow("parent.name", "undefined"), badRow("child.name", "typed value")], logs: [{ time: T(), text: "two-way binding silently broken", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "$parent.name",
        correct: false,
        feedback: {
          title: "Works but fragile",
          explain: "$parent traversal couples the template to a specific scope hierarchy. Wrap the value in an object instead.",
          sim: { rows: [badRow("Coupling", "breaks if you wrap in another ng-if")], logs: [{ time: T(), text: "always have a dot in ng-model", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "scope",
      rows: [okRow("user.name", "Ada"), okRow("Binding", "two-way")],
      logs: [{ time: T(), text: "Object reference shared across child scopes", tone: "ok" }],
    },
    correctTeach: {
      title: "Always have a dot in ng-model",
      explain: "Prototypal inheritance means writes to a primitive happen on the child scope. With an object, the child sees the same reference and writes flow back to the parent.",
    },
  },

  // ----- Directives -----
  {
    id: "ng-dr-1",
    category: "ng-directives",
    level: 2,
    filename: "myWidget.js",
    title: "Reusable widget directive — pick the isolated scope binding for a one-way string.",
    code: [
      "app.directive('myWidget', function() {",
      "  return {",
      "    scope: { title: {{SLOT}} },",
      "    template: '<h3>{{title}}</h3>'",
      "  };",
      "});",
    ],
    options: [
      { id: "a", text: "'@'", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "'='",
        correct: false,
        feedback: {
          title: "Two-way for a string is overkill",
          explain: "'=' creates a $watch and lets the child mutate the parent. For a static label, '@' is cheaper and prevents accidental writes.",
          sim: { rows: [badRow("Watchers", "+1 per instance")], logs: [{ time: T(), text: "use '@' for interpolated strings", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "'&'",
        correct: false,
        feedback: {
          title: "'&' is for callbacks, not data",
          explain: "'&' binds an expression you can invoke (like ng-click). For passing a value in, use '@' or '='.",
          sim: { rows: [badRow("title", "function reference")], logs: [{ time: T(), text: "template renders [object Function]", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "directive scope",
      rows: [okRow("title", "Hello (one-way @ binding)")],
      logs: [{ time: T(), text: "'@' = interpolated string, no watcher overhead", tone: "ok" }],
    },
    correctTeach: {
      title: "Three binding flavors",
      explain: "'@' = one-way string interpolation. '=' = two-way object binding (sets up a watcher). '&' = bound expression / callback. Pick the cheapest one that fits.",
    },
  },
  {
    id: "ng-dr-2",
    category: "ng-directives",
    level: 2,
    filename: "highlight.js",
    title: "Directive needs to manipulate the DOM — which lifecycle hook?",
    code: [
      "app.directive('highlight', function() {",
      "  return {",
      "    restrict: 'A',",
      "    {{SLOT}}: function(scope, element, attrs) {",
      "      element.css('background', 'yellow');",
      "    }",
      "  };",
      "});",
    ],
    options: [
      { id: "a", text: "link", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "compile",
        correct: false,
        feedback: {
          title: "compile runs once on the template",
          explain: "compile happens before the directive has a scope — you'd return a link function from inside it. For most DOM work, just use link.",
          sim: { rows: [badRow("scope", "undefined inside compile")], logs: [{ time: T(), text: "compile is for template transformations, not runtime DOM", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "controller",
        correct: false,
        feedback: {
          title: "controller is for shared logic",
          explain: "Use controller to expose an API for sibling/parent directives (via require). DOM manipulation belongs in link.",
          sim: { rows: [badRow("element", "not yet linked")], logs: [{ time: T(), text: "controller runs before link; DOM not stable", tone: "warn" }] },
        },
      },
    ],
    correctSim: {
      table: "lifecycle",
      rows: [okRow("compile", "template transformed"), okRow("controller", "exposed API"), okRow("link", "DOM ready ✔")],
      logs: [{ time: T(), text: "link fires after scope is bound — safe for jQuery-style ops", tone: "ok" }],
    },
    correctTeach: {
      title: "compile → controller → link",
      explain: "compile runs once per template, controller runs per instance (shared via require), link runs per instance after the scope is attached. Default to link.",
    },
  },

  // ----- Services & DI -----
  {
    id: "ng-sv-1",
    category: "ng-services",
    level: 1,
    filename: "userService.js",
    title: "Define a singleton that returns an object with methods.",
    code: [
      "app.{{SLOT}}('userService', function($http) {",
      "  return {",
      "    list: function() { return $http.get('/users'); }",
      "  };",
      "});",
    ],
    options: [
      { id: "a", text: "factory", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "service",
        correct: false,
        feedback: {
          title: "service expects a constructor",
          explain: "service() calls `new` on your function and uses `this` for members. Returning an object from a service is a code-smell — use factory.",
          sim: { rows: [badRow("Style", "mixes constructor + return")], logs: [{ time: T(), text: "factory matches 'returns an object' shape", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "value",
        correct: false,
        feedback: {
          title: "value can't inject dependencies",
          explain: "value() registers a static value with no injector. You can't inject $http here. Use factory or service.",
          sim: { rows: [badRow("$http", "Unknown provider")], logs: [{ time: T(), text: "value is for plain data, not services", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "$injector",
      rows: [okRow("userService", "singleton object")],
      logs: [{ time: T(), text: "factory function ran once; result cached", tone: "ok" }],
    },
    correctTeach: {
      title: "factory vs service vs provider",
      explain: "factory: returns a value (most common). service: instantiated with `new`, use `this`. provider: configurable in app.config() — needed when you must tweak it before injection runs.",
    },
  },
  {
    id: "ng-sv-2",
    category: "ng-services",
    level: 2,
    filename: "app.js",
    title: "Minification broke DI. Fix the controller registration.",
    code: [
      "{{SLOT}}",
    ],
    options: [
      {
        id: "a",
        text: "app.controller('Ctrl', ['$scope', '$http', function($scope, $http) { ... }]);",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "app.controller('Ctrl', function($scope, $http) { ... });",
        correct: false,
        feedback: {
          title: "Minifier renames $scope → a",
          explain: "Without an explicit DI annotation, Angular reads parameter names. Minification mangles them and the injector can't match.",
          sim: { rows: [badRow("Error", "Unknown provider: aProvider <- a")], logs: [{ time: T(), text: "Use array syntax or ng-annotate at build time", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: "app.controller('Ctrl', function(a, b) { var $scope = a; });",
        correct: false,
        feedback: {
          title: "Order-based hack — fragile",
          explain: "Renaming doesn't fix the lookup; Angular still asks for 'a' and 'b' providers. There are none.",
          sim: { rows: [badRow("Error", "Unknown provider: a")], logs: [{ time: T(), text: "always annotate explicitly", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "Injector",
      rows: [okRow("$scope", "injected"), okRow("$http", "injected")],
      logs: [{ time: T(), text: "Array syntax survives minification", tone: "ok" }],
    },
    correctTeach: {
      title: "Always annotate DI",
      explain: "Use the array syntax (`['$scope', fn]`) or run ng-annotate / babel-plugin-angularjs-annotate in your build. Implicit injection breaks the moment uglify runs.",
    },
  },

  // ----- HTTP & Promises -----
  {
    id: "ng-ht-1",
    category: "ng-http",
    level: 1,
    filename: "load.js",
    title: "$http returns a promise — chain a transformation.",
    code: [
      "$http.get('/api/users')",
      "  {{SLOT}}",
      "  .then(function(names) { $scope.names = names; });",
    ],
    options: [
      {
        id: "a",
        text: ".then(function(res) { return res.data.map(function(u) { return u.name; }); })",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: ".success(function(data) { return data.map(function(u) { return u.name; }); })",
        correct: false,
        feedback: {
          title: ".success/.error are deprecated",
          explain: "Removed in Angular 1.6. They don't return chainable promises either — the next .then gets nothing useful.",
          sim: { rows: [badRow(".then receives", "undefined")], logs: [{ time: T(), text: "use .then everywhere", tone: "bad" }] },
        },
      },
      {
        id: "c",
        text: ".map(function(res) { return res.data.name; })",
        correct: false,
        feedback: {
          title: "No .map on promises",
          explain: "$http returns a $q promise — only .then/.catch/.finally. Promises are not arrays.",
          sim: { rows: [badRow("Error", "$http.get(...).map is not a function")], logs: [{ time: T(), text: "transform inside .then", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "Promise chain",
      rows: [okRow("res.data", "[{name:Ada},{name:Bob}]"), okRow("$scope.names", "[Ada, Bob]")],
      logs: [{ time: T(), text: "Chained .then transformed the payload", tone: "ok" }],
    },
    correctTeach: {
      title: "$http always wraps in {data, status, headers}",
      explain: "First .then unwraps to res.data. Return a value from .then and the next .then sees it. Reject by throwing or returning $q.reject(err).",
    },
  },
  {
    id: "ng-ht-2",
    category: "ng-http",
    level: 2,
    filename: "parallel.js",
    title: "Wait for both API calls to finish, then render once.",
    code: [
      "var p1 = $http.get('/a');",
      "var p2 = $http.get('/b');",
      "{{SLOT}}.then(function(results) {",
      "  $scope.a = results[0].data;",
      "  $scope.b = results[1].data;",
      "});",
    ],
    options: [
      { id: "a", text: "$q.all([p1, p2])", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "p1.then(function() { return p2; })",
        correct: false,
        feedback: {
          title: "Serial — defeats the parallelism",
          explain: "This waits for /a, THEN starts /b. You wanted them concurrent.",
          sim: { rows: [badRow("Total time", "~2× slower")], logs: [{ time: T(), text: "use $q.all for parallel fan-out", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "Promise.all([p1, p2])",
        correct: false,
        feedback: {
          title: "Outside the digest",
          explain: "Native Promise resolves outside Angular's $apply. Your view won't update until the next digest. Stick to $q in 1.x.",
          sim: { rows: [badRow("View", "stale until next click")], logs: [{ time: T(), text: "use $q.all so resolutions trigger digest", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "$q",
      rows: [okRow("a", "loaded"), okRow("b", "loaded"), okRow("View", "rendered once")],
      logs: [{ time: T(), text: "Both requests resolved in parallel", tone: "ok" }],
    },
    correctTeach: {
      title: "$q.all for parallel, sequence with .then chains",
      explain: "$q.all takes an array (resolves to array) or object (resolves to object). Any one rejection rejects the whole. Use $q.race / sequential chains as needed.",
    },
  },

  // ----- Routing -----
  {
    id: "ng-rt-1",
    category: "ng-routing",
    level: 2,
    filename: "routes.js",
    title: "Don't show the route until the user data is loaded.",
    code: [
      "$stateProvider.state('profile', {",
      "  url: '/profile/:id',",
      "  templateUrl: 'profile.html',",
      "  controller: 'ProfileCtrl',",
      "  {{SLOT}}",
      "});",
    ],
    options: [
      {
        id: "a",
        text: "resolve: { user: function($stateParams, userService) { return userService.get($stateParams.id); } }",
        correct: true,
        feedback: { title: "", explain: "", sim: { rows: [], logs: [] } },
      },
      {
        id: "b",
        text: "// fetch in the controller, show a spinner",
        correct: false,
        feedback: {
          title: "Flash of empty state",
          explain: "Controller-fetch renders the template first, then the data arrives. Users see an empty form for a moment — fine sometimes, but resolve is the cleaner pattern.",
          sim: { rows: [badRow("FOEC", "100–400ms flash")], logs: [{ time: T(), text: "resolve blocks transition until promise settles", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "onEnter: function() { return userService.get(); }",
        correct: false,
        feedback: {
          title: "onEnter can't inject route params cleanly",
          explain: "onEnter runs after the transition starts; its return value isn't injected into the controller. resolve is the correct API.",
          sim: { rows: [badRow("Controller", "user undefined")], logs: [{ time: T(), text: "use resolve to pass data into controller", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "ui-router",
      rows: [okRow("Resolve user", "200 OK"), okRow("Transition", "completes"), okRow("Controller", "user injected")],
      logs: [{ time: T(), text: "Template renders only after resolve promise resolves", tone: "ok" }],
    },
    correctTeach: {
      title: "resolve = pre-fetch + inject",
      explain: "Each resolve key becomes injectable in the controller. Failure rejects the transition — wire $stateChangeError to a fallback view. Same pattern in ngRoute via $routeProvider.when({ resolve }).",
    },
  },
  {
    id: "ng-rt-2",
    category: "ng-routing",
    level: 1,
    filename: "app.config.js",
    title: "Read /users/42 — which API gives `42`?",
    code: [
      "app.controller('UserCtrl', function({{SLOT}}) {",
      "  var id = params.id;",
      "});",
    ],
    options: [
      { id: "a", text: "$stateParams) { var params = $stateParams;", correct: true, feedback: { title: "", explain: "", sim: { rows: [], logs: [] } } },
      {
        id: "b",
        text: "$location) { var params = $location;",
        correct: false,
        feedback: {
          title: "$location is URL utilities",
          explain: "$location.path() / .search() return the raw URL pieces. You'd have to parse :id yourself. Use $stateParams (ui-router) or $routeParams (ngRoute).",
          sim: { rows: [badRow("params.id", "undefined")], logs: [{ time: T(), text: "use the params service for matched routes", tone: "warn" }] },
        },
      },
      {
        id: "c",
        text: "$scope) { var params = $scope.$routeParams;",
        correct: false,
        feedback: {
          title: "Not a $scope property",
          explain: "Route params aren't auto-attached to $scope. Inject the right service.",
          sim: { rows: [badRow("params", "undefined")], logs: [{ time: T(), text: "inject $stateParams / $routeParams", tone: "bad" }] },
        },
      },
    ],
    correctSim: {
      table: "router",
      rows: [okRow("$stateParams.id", "42")],
      logs: [{ time: T(), text: "ui-router resolved :id from the URL", tone: "ok" }],
    },
    correctTeach: {
      title: "Two routers, two services",
      explain: "ngRoute → $routeParams. ui-router → $stateParams. Both expose the URL match params; pick whichever router the project uses.",
    },
  },
];

/* ============== TOPICS ============== */

export const ANGULAR_TOPICS: Topic[] = [
  { id: "ng-core", name: "Core Concepts", tagline: "Modules, controllers, two-way binding.", emoji: "🅰️", track: "angular-dev", blurb: "AngularJS 1.x in one page: angular.module, controllers, $scope, two-way data binding via the digest cycle." },
  { id: "ng-digest", name: "Digest & Scopes", tagline: "$apply, $watch, $watchCollection.", emoji: "🔁", track: "angular-dev", blurb: "How dirty-checking actually works, why too many watchers slow you down, and the 'dot rule' that trips up every junior dev." },
  { id: "ng-directives-topic", name: "Directives", tagline: "ng-*, custom directives, compile vs link.", emoji: "🧩", track: "angular-dev", blurb: "The most powerful and confusing AngularJS feature: restrict, scope bindings ('@', '=', '&'), transclusion, and the compile/controller/link order." },
  { id: "ng-services-topic", name: "Services & DI", tagline: "factory, service, provider, value.", emoji: "💉", track: "angular-dev", blurb: "Singletons everywhere: pick factory by default, service when you want `new`, provider when config-time setup matters." },
];

export const ANGULAR_TERMS: Term[] = [
  { topic: "ng-core", term: "Module", short: "Container for controllers, services, directives.", long: "`angular.module('app', ['ngRoute'])` declares an app and its dependencies. Second arg is required on creation, omitted on lookup." },
  { topic: "ng-core", term: "Controller", short: "Glue between scope and view.", long: "Should be thin: wire data from services to $scope, expose handlers. Keep business logic in services so it's testable." },
  { topic: "ng-core", term: "Two-way binding", short: "Model ↔ view via the digest cycle.", long: "ng-model writes form input to $scope; Angular re-renders the DOM when scope changes during a $digest. Costly if abused." },
  { topic: "ng-core", term: "Expression", short: "JavaScript-like snippet evaluated against scope.", long: "`{{user.name}}` and `ng-click='save()'` are expressions. No control flow, no `new`, no comparisons against window globals." },

  { topic: "ng-digest", term: "Digest cycle", short: "Loop that dirty-checks every watcher.", long: "Runs until two consecutive passes produce identical values, or the TTL (default 10) fires. Each $watch adds work, so prune them." },
  { topic: "ng-digest", term: "$apply", short: "Enter the digest from outside Angular.", long: "$apply(fn) runs fn then $rootScope.$digest. Required for jQuery callbacks, setTimeout, WebSocket events. Prefer $timeout / $http which wrap it." },
  { topic: "ng-digest", term: "$watch", short: "Register a function to react to scope changes.", long: "`$scope.$watch('user.name', fn)`. Use $watchCollection for shallow array/object diff, $watch(...true) for deep — both expensive." },
  { topic: "ng-digest", term: "Dot rule", short: "Always have a dot in ng-model.", long: "Child scopes (ng-if, ng-repeat) inherit prototypally — writes to primitives stay on the child. Bind to an object property so reads/writes share the same reference." },

  { topic: "ng-directives-topic", term: "restrict", short: "Where the directive can appear.", long: "'A' attribute (default), 'E' element, 'C' class, 'M' comment. Most reusable widgets use 'E' or 'A'." },
  { topic: "ng-directives-topic", term: "Isolated scope", short: "scope: {} creates a sandboxed scope.", long: "Prevents the directive from polluting (or being polluted by) the parent. Bindings: '@' interp string, '=' two-way, '<' one-way, '&' callback." },
  { topic: "ng-directives-topic", term: "Transclusion", short: "Insert the parent's content into your template.", long: "Set `transclude: true` and use `ng-transclude` in the template. Use 'element' transclusion for structural directives like ng-if." },
  { topic: "ng-directives-topic", term: "compile vs link", short: "Template transform vs runtime wiring.", long: "compile runs once per template (shared). link runs per instance, after scope is bound — your normal DOM/scope hook." },

  { topic: "ng-services-topic", term: "factory", short: "Function that returns the service value.", long: "Most common pattern. `app.factory('x', function(deps) { return { ... }; })`. The return value is the singleton." },
  { topic: "ng-services-topic", term: "service", short: "Constructor function, instantiated with `new`.", long: "`app.service('x', function() { this.do = ...; })`. Use when you prefer ES5 class-style. Equivalent expressive power to factory." },
  { topic: "ng-services-topic", term: "provider", short: "Configurable service.", long: "Has a $get function returning the service. Only providers can be injected into app.config() — use when setup must happen before injection (e.g. $httpProvider interceptors)." },
  { topic: "ng-services-topic", term: "$q", short: "Angular's promise library.", long: "$q.defer() / $q.when() / $q.all(). Resolutions auto-trigger a digest, unlike native Promise. Stick to $q in 1.x unless you wrap manually." },
];

/* ============== QUIZZES ============== */

export const ANGULAR_QUIZZES: QuizQuestion[] = [
  // ng-core
  { id: "a-c1", topic: "ng-core", question: "angular.module('app', []) — what does the second argument do?", options: ["Lists controllers", "Declares module dependencies", "Sets the base URL", "Enables strict DI"], correctIndex: 1, explain: "The array names other modules this one depends on. Omit it (single-arg call) to look the module up instead of creating it." },
  { id: "a-c2", topic: "ng-core", question: "What does {{1 + 2}} render?", options: ["{{1+2}}", "3", "Error", "undefined"], correctIndex: 1, explain: "Curlies are an Angular expression evaluated against the current scope. Math works." },
  { id: "a-c3", topic: "ng-core", question: "Two-way binding is implemented via…", options: ["Proxy objects", "Dirty checking in the digest cycle", "Native Object.observe", "WebSockets"], correctIndex: 1, explain: "Each $watch holds last value; every digest pass compares current vs last and fires listeners on change." },
  { id: "a-c4", topic: "ng-core", question: "Controller-as syntax (`ng-controller='Ctrl as vm'`) helps with…", options: ["Performance", "Avoiding $scope and the dot-rule trap", "Async loading", "Routing"], correctIndex: 1, explain: "vm is a real object on scope, so writes are object-property writes — no primitive shadowing in child scopes." },
  { id: "a-c5", topic: "ng-core", question: "ng-app=\"myApp\" auto-bootstraps…", options: ["After document.ready", "Synchronously when Angular parses the DOM", "Only via manual angular.bootstrap()", "Never"], correctIndex: 0, explain: "Angular waits for DOMContentLoaded, then bootstraps the module named in ng-app. For manual control use angular.bootstrap()." },
  { id: "a-c6", topic: "ng-core", question: "Why prefer services over fat controllers?", options: ["They're faster", "Reusable + unit-testable without a DOM", "Required by Angular", "They auto-cache HTTP"], correctIndex: 1, explain: "Controllers are coupled to a view; services aren't. Test services with plain Jasmine; mock $http via $httpBackend." },

  // ng-digest
  { id: "a-d1", topic: "ng-digest", question: "setTimeout updates $scope. View doesn't refresh. Cheapest fix:", options: ["$scope.$apply", "Use $timeout instead", "Use $watch", "Use Object.observe"], correctIndex: 1, explain: "$timeout already wraps the callback in $apply and handles error cases. Drop-in replacement for setTimeout in Angular code." },
  { id: "a-d2", topic: "ng-digest", question: "$watch vs $watchCollection — when do you use $watchCollection?", options: ["Deep diff every property", "Shallow diff of top-level array/object members", "Watch a single primitive", "Never; deprecated"], correctIndex: 1, explain: "$watchCollection notices add/remove/replace at top level — cheaper than $watch(..., true), more aware than the default reference check." },
  { id: "a-d3", topic: "ng-digest", question: "TTL exceeded (10 digest iterations). Most likely cause:", options: ["Too many watchers", "A watcher mutates a value another watcher depends on", "Slow HTTP", "Browser memory"], correctIndex: 1, explain: "Watcher A sets X, watcher B sees X change and sets Y, A re-fires… Angular gives up after 10 passes." },
  { id: "a-d4", topic: "ng-digest", question: "Performance tip — when a list of 5,000 rows never changes:", options: ["ng-repeat", "ng-repeat with track by $index", "one-time binding (::)", "$watch true"], correctIndex: 2, explain: "`{{::user.name}}` registers a watcher, fires once, then deregisters. Massive win on static data." },
  { id: "a-d5", topic: "ng-digest", question: "The 'dot rule' exists because…", options: ["Angular caches by dot path", "Child scopes inherit prototypally — primitives get shadowed", "Performance reasons", "Required by JS"], correctIndex: 1, explain: "Writing user.name updates the shared object reference; writing name shadows it on the child scope." },
  { id: "a-d6", topic: "ng-digest", question: "Cheapest way to integrate a non-Angular event callback:", options: ["scope.$digest()", "scope.$apply(fn)", "Polling with $interval", "Manual DOM update"], correctIndex: 1, explain: "$apply runs fn then $digest from $rootScope, with error handling and 'inprog' protection." },

  // ng-directives-topic
  { id: "a-dr1", topic: "ng-directives-topic", question: "scope: { value: '=' } means…", options: ["One-way string", "Two-way data binding", "Callback expression", "Inherited scope"], correctIndex: 1, explain: "'=' sets up a bidirectional $watch between parent and isolated scope." },
  { id: "a-dr2", topic: "ng-directives-topic", question: "Which restrict value lets `<my-tag></my-tag>` work?", options: ["A", "E", "C", "M"], correctIndex: 1, explain: "'E' for element. Default is 'A' (attribute)." },
  { id: "a-dr3", topic: "ng-directives-topic", question: "Sibling directives share state via…", options: ["$scope.$parent", "require: '^myParent' + controller", "$rootScope", "localStorage"], correctIndex: 1, explain: "require fetches the named directive's controller and passes it as the 4th arg of link." },
  { id: "a-dr4", topic: "ng-directives-topic", question: "Use compile (not link) when…", options: ["You need DOM events", "You're transforming the template before instances exist", "You inject services", "You manage $scope"], correctIndex: 1, explain: "compile sees the raw template once; useful when generating sub-templates that will be linked many times." },
  { id: "a-dr5", topic: "ng-directives-topic", question: "ng-transclude is paired with…", options: ["template: 'static'", "transclude: true and ng-transclude in the template", "scope: {} only", "controllerAs"], correctIndex: 1, explain: "Mark the directive with transclude:true, then drop ng-transclude where the parent content should land." },
  { id: "a-dr6", topic: "ng-directives-topic", question: "Custom directive needs to call back into the parent — which binding?", options: ["'@'", "'='", "'&'", "'<'"], correctIndex: 2, explain: "'&' captures the parent expression so the directive can invoke it: `onSave({user: u})`." },

  // ng-services-topic
  { id: "a-sv1", topic: "ng-services-topic", question: "Default service style for new code:", options: ["factory", "service", "value", "provider"], correctIndex: 0, explain: "factory is the most flexible: return any value, no `new` semantics to learn." },
  { id: "a-sv2", topic: "ng-services-topic", question: "You need to configure a service at config-time. Which form?", options: ["factory", "service", "provider", "value"], correctIndex: 2, explain: "Only providers can be injected into app.config(). Example: $httpProvider.interceptors.push(...)." },
  { id: "a-sv3", topic: "ng-services-topic", question: "Annotate DI with array syntax because…", options: ["It runs faster", "Minification mangles parameter names", "Required by Angular", "It enables strict mode"], correctIndex: 1, explain: "Implicit DI reads function param names — uglify renames them. Array form keeps the original names as strings." },
  { id: "a-sv4", topic: "ng-services-topic", question: "$q.defer is mostly used to…", options: ["Wrap a callback API as a promise", "Cache HTTP responses", "Speed up the digest", "Combine promises"], correctIndex: 0, explain: "Create a deferred, hand it to a callback API, return deferred.promise. In modern code prefer $q(executor) (Promise constructor style)." },
  { id: "a-sv5", topic: "ng-services-topic", question: "Mock $http in unit tests with…", options: ["$httpBackend", "jasmine.spyOn", "fetch-mock", "Just call the real API"], correctIndex: 0, explain: "ngMock's $httpBackend records expectations, flushes responses, and verifies no unmet requests." },
  { id: "a-sv6", topic: "ng-services-topic", question: "Services are singletons per…", options: ["Controller", "Module", "Injector (typically one per app)", "Scope"], correctIndex: 2, explain: "The injector instantiates each service once and caches it. One injector per app means one instance per app." },
];

export const ANGULAR_SECTIONS: Record<string, QuizSection[]> = {
  "ng-core": [
    { label: "Bootstrap & binding", icon: "🅰️", count: 3 },
    { label: "Best practices", icon: "✨", count: 3 },
  ],
  "ng-digest": [
    { label: "Digest cycle", icon: "🔁", count: 3 },
    { label: "Perf & gotchas", icon: "⚡", count: 3 },
  ],
  "ng-directives-topic": [
    { label: "Basics", icon: "🧩", count: 3 },
    { label: "Advanced patterns", icon: "🛠️", count: 3 },
  ],
  "ng-services-topic": [
    { label: "Service flavors", icon: "💉", count: 3 },
    { label: "DI & testing", icon: "🧪", count: 3 },
  ],
};
