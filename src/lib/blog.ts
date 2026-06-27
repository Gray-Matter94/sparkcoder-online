// 20-day ServiceNow scripting curriculum, grouped into 4 weekly blog posts.
// Used by /blog and /blog/$slug routes.

export interface BlogDay {
  day: number;
  title: string;
  goal: string;
  drill: string;
  takeaway: string;
}

export interface BlogPost {
  slug: string;
  week: number;
  title: string;
  subtitle: string;
  description: string; // <160 chars for meta
  ogTitle: string;
  publishedAt: string; // ISO
  updatedAt: string;
  readMinutes: number;
  hero: string; // short hook paragraph
  whoFor: string;
  outcomes: string[];
  days: BlogDay[];
  practice: { label: string; to: string }[];
  nextSlug?: string;
  prevSlug?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "week-1-servicenow-foundations",
    week: 1,
    title: "Week 1: ServiceNow Foundations — Data Dictionary, Tables, and Your First GlideRecord",
    subtitle: "Days 1–5 of the 20-Day ServiceNow Scripting Curriculum",
    description:
      "Day-by-day plan for your first ServiceNow week: data dictionary, table inheritance, scope, dot-walking, and your first GlideRecord query.",
    ogTitle: "Week 1: ServiceNow Foundations (Days 1–5) — SparkCoder",
    publishedAt: "2026-06-02T09:00:00Z",
    updatedAt: "2026-06-27T09:00:00Z",
    readMinutes: 9,
    hero:
      "If you only have 20 days before an interview or a new ServiceNow project, the first week is non-negotiable. You can't write a clean Business Rule or ACL until you know how the platform stores and exposes data. This is the week that pays off everything that follows.",
    whoFor:
      "Brand-new ServiceNow developers, admins moving into scripting, or experienced JS devs onboarding to the platform.",
    outcomes: [
      "Read any table's data dictionary and explain what each column means",
      "Navigate table inheritance (task → incident) without guessing",
      "Write a server-side GlideRecord query that actually returns the right rows",
      "Tell the difference between global and scoped apps in 30 seconds",
    ],
    days: [
      {
        day: 1,
        title: "Day 1: Understanding the ServiceNow Data Dictionary",
        goal: "Open sys_dictionary and decode any field on any table.",
        drill: "Pick the incident table. List every field with type=reference and write the table it points to.",
        takeaway:
          "The dictionary is the ground truth — column labels lie, dictionary entries don't. Always check max length, default value, and reference qualifier before scripting against a field.",
      },
      {
        day: 2,
        title: "Day 2: Tables, Inheritance, and the task Hierarchy",
        goal: "Map out task → incident, problem, change, sc_request and explain why a query on task returns rows from all of them.",
        drill: "Run sys_db_object filtered by super_class=task. Sketch the tree on paper.",
        takeaway:
          "Inheritance is why a single GlideRecord on task can update an incident. It's also why ACLs cascade. Treat the hierarchy as load-bearing knowledge.",
      },
      {
        day: 3,
        title: "Day 3: Global vs Scoped Applications",
        goal: "Understand why your script runs in one app but not another, and what cross-scope access requires.",
        drill: "Create a scoped app, add a table, then try to read it from a global Business Rule.",
        takeaway:
          "Scope isolates code by default. Cross-scope access needs explicit privileges. New code should be scoped — global is legacy.",
      },
      {
        day: 4,
        title: "Day 4: Your First GlideRecord Query",
        goal: "Write a server-side query that finds all active P1 incidents assigned to your group.",
        drill: "Use addQuery, addEncodedQuery, and orderByDesc. Compare the two query styles.",
        takeaway:
          "GlideRecord is the workhorse. Master next(), get(), and getValue() before you touch updates. setLimit() is your friend in dev.",
      },
      {
        day: 5,
        title: "Day 5: Dot-Walking and Reference Fields",
        goal: "Pull caller.manager.email in a single line without a second query.",
        drill: "On an incident GR, dot-walk three levels deep and log the value.",
        takeaway:
          "Dot-walking is free in the query but costs a join. Use it for reads; never assume it works in addQuery encoded strings the same way.",
      },
    ],
    practice: [
      { label: "GlideRecord puzzles", to: "/practice/gliderecord" },
      { label: "Platform basics quiz", to: "/learn/platform" },
    ],
    nextSlug: "week-2-server-side-scripting",
  },
  {
    slug: "week-2-server-side-scripting",
    week: 2,
    title: "Week 2: Server-Side Scripting — Business Rules, Script Includes, and the current/previous Trap",
    subtitle: "Days 6–10 of the 20-Day ServiceNow Scripting Curriculum",
    description:
      "Days 6–10: before/after Business Rules, current vs previous, abort patterns, reusable Script Includes, and when not to write a BR.",
    ogTitle: "Week 2: Server-Side Scripting (Days 6–10) — SparkCoder",
    publishedAt: "2026-06-09T09:00:00Z",
    updatedAt: "2026-06-27T09:00:00Z",
    readMinutes: 10,
    hero:
      "Week 2 is where most ServiceNow bugs are born. Business Rules look simple until you've recursed yourself into a 60-second save. This week you build the muscle memory to pick the right rule type and the right helper for the job.",
    whoFor: "Anyone who has read a Business Rule but never confidently written one.",
    outcomes: [
      "Pick before/after/async/display correctly the first time",
      "Use current and previous without nuking unrelated fields",
      "Move logic into a Script Include and call it from anywhere",
      "Recognize when a Flow or UI Policy is the better answer",
    ],
    days: [
      {
        day: 6,
        title: "Day 6: Business Rule Types and When to Use Each",
        goal: "Explain before, after, async, and display in one sentence each.",
        drill: "Take a real requirement (e.g. 'auto-assign on insert') and pick the right type. Defend it.",
        takeaway:
          "Before = mutate current. After = side effects on other records. Async = expensive work. Display = client-side prep. Pick wrong and you'll fight it for years.",
      },
      {
        day: 7,
        title: "Day 7: current, previous, and the Recursion Trap",
        goal: "Detect a real change with current.field.changesFrom() and avoid infinite loops.",
        drill: "Write a BR that updates description only when state changes — without calling current.update().",
        takeaway:
          "In a before rule, never call current.update() — the framework does it. previous is your diff log; use changes() and changesTo() instead of manual comparisons.",
      },
      {
        day: 8,
        title: "Day 8: Aborting and setAbortAction",
        goal: "Block a save with a friendly message that the user actually sees.",
        drill: "Reject closing an incident with no resolution notes. Show a message, not a stack trace.",
        takeaway:
          "current.setAbortAction(true) cancels the operation. Pair it with gs.addErrorMessage so the user knows why. Silent aborts are the worst UX in the platform.",
      },
      {
        day: 9,
        title: "Day 9: Script Includes — Reusable Server Libraries",
        goal: "Refactor a 40-line Business Rule into a Script Include with one public method.",
        drill: "Build an IncidentUtils class with a getPriorityLabel(grIncident) method. Call it from a BR.",
        takeaway:
          "Script Includes are how you stop copy-pasting. Use prototype-style classes for reuse, client_callable only when GlideAjax needs them. One class, one responsibility.",
      },
      {
        day: 10,
        title: "Day 10: When NOT to Write a Business Rule",
        goal: "Reach for UI Policy, Data Policy, Flow Designer, or ACL when they fit better.",
        drill: "Take three requirements; only one should end up as a Business Rule.",
        takeaway:
          "Validation that runs in browser AND server? Data Policy. Field show/hide? UI Policy. Cross-record orchestration? Flow. BRs are the catch-all, not the default.",
      },
    ],
    practice: [
      { label: "Business Rule puzzles", to: "/practice/business-rules" },
      { label: "Script Include puzzles", to: "/practice/script-includes" },
    ],
    prevSlug: "week-1-servicenow-foundations",
    nextSlug: "week-3-client-side-and-glideajax",
  },
  {
    slug: "week-3-client-side-and-glideajax",
    week: 3,
    title: "Week 3: Client-Side Scripting and GlideAjax — Without Touching the DOM",
    subtitle: "Days 11–15 of the 20-Day ServiceNow Scripting Curriculum",
    description:
      "Days 11–15: onLoad / onChange / onSubmit Client Scripts, async GlideAjax calls, and the DOM-free patterns ServiceNow expects.",
    ogTitle: "Week 3: Client-Side and GlideAjax (Days 11–15) — SparkCoder",
    publishedAt: "2026-06-16T09:00:00Z",
    updatedAt: "2026-06-27T09:00:00Z",
    readMinutes: 9,
    hero:
      "Client-side scripting is where new devs reach for jQuery and burn a week on a UI Builder upgrade. This week you'll write Client Scripts that survive every UI ServiceNow has shipped — Classic, Service Portal, Next Experience, UI Builder.",
    whoFor: "Devs who write Client Scripts that 'work locally' but break in Portal or Workspace.",
    outcomes: [
      "Pick onLoad vs onChange vs onSubmit without thinking",
      "Call a Script Include from the client without freezing the browser",
      "Stop using document.getElementById in ServiceNow forever",
      "Validate forms on the client AND the server",
    ],
    days: [
      {
        day: 11,
        title: "Day 11: onLoad, onChange, onSubmit — the Trinity",
        goal: "Wire the right lifecycle to the right requirement.",
        drill: "Default a field on load, react to a category change, and block submit if both are empty.",
        takeaway:
          "onLoad = set initial state. onChange = react. onSubmit = last-chance validation. Use g_form, never DOM.",
      },
      {
        day: 12,
        title: "Day 12: g_form — The Only API You Need on the Form",
        goal: "Read, set, hide, mandate, and clear fields without touching HTML.",
        drill: "Make assigned_to mandatory only when priority = 1.",
        takeaway:
          "g_form.setMandatory, setVisible, setValue, clearValue, addInfoMessage. These work in Classic, Portal, and Workspace. DOM access does not.",
      },
      {
        day: 13,
        title: "Day 13: GlideAjax — Async Calls from Client to Server",
        goal: "Call a client_callable Script Include and read the result without blocking the form.",
        drill: "Look up a user's manager's email when the caller changes. Show it as an info message.",
        takeaway:
          "Always use getXMLAnswer with a callback. Never use synchronous mode — it freezes the browser and is being removed.",
      },
      {
        day: 14,
        title: "Day 14: Building a client_callable Script Include",
        goal: "Extend AbstractAjaxProcessor and expose one method per use case.",
        drill: "Build UserLookupAjax with getManagerEmail(). Call it from yesterday's Client Script.",
        takeaway:
          "this.getParameter('sysparm_user') reads the input. return on the function ends up as the XML answer. Keep methods small; one method per Ajax call.",
      },
      {
        day: 15,
        title: "Day 15: Client Validation + Server Validation = Trust",
        goal: "Validate on the client for UX, on the server for security.",
        drill: "Reject a numeric field over 1000 in a Client Script AND a Business Rule.",
        takeaway:
          "Client validation is a courtesy. Anyone can bypass it via REST or a background script. Always mirror critical rules server-side.",
      },
    ],
    practice: [
      { label: "Client Script puzzles", to: "/practice/client-scripts" },
      { label: "GlideAjax puzzles", to: "/practice/glideajax" },
      { label: "GlideAjax interview questions", to: "/learn/glideajax-interview-questions" },
    ],
    prevSlug: "week-2-server-side-scripting",
    nextSlug: "week-4-security-integrations-interview",
  },
  {
    slug: "week-4-security-integrations-interview",
    week: 4,
    title: "Week 4: ACLs, Integrations, and Interview-Ready Scenarios",
    subtitle: "Days 16–20 of the 20-Day ServiceNow Scripting Curriculum",
    description:
      "Days 16–20: ACL scripting, Scripted REST APIs, REST Messages, debugging like a senior, and a final interview-style scenario.",
    ogTitle: "Week 4: ACLs, Integrations, Interview (Days 16–20) — SparkCoder",
    publishedAt: "2026-06-23T09:00:00Z",
    updatedAt: "2026-06-27T09:00:00Z",
    readMinutes: 10,
    hero:
      "By Week 4 you can move data around. Now you need to protect it and connect it. The last five days take you from 'I can write scripts' to 'I can answer the hard interview question without freezing.'",
    whoFor: "Devs prepping for a technical interview or their first solo project.",
    outcomes: [
      "Write an ACL that actually denies the right people",
      "Expose a Scripted REST API safely and consume one with a REST Message",
      "Debug a production issue without console.log everywhere",
      "Talk through a scenario question without panicking",
    ],
    days: [
      {
        day: 16,
        title: "Day 16: ACLs — The Order of Operations",
        goal: "Explain table.field, table.None, table.* and how they evaluate together.",
        drill: "Write an ACL that lets only the caller and the assignment group see the work_notes field.",
        takeaway:
          "ACLs are AND inside one rule, OR across rules. Most-specific wins. Script returns true to ALLOW; false denies. Read /learn/acl-scripting if any of that sounded fuzzy.",
      },
      {
        day: 17,
        title: "Day 17: Scripted REST APIs",
        goal: "Expose GET /api/x/yourcompany/incidents that returns the caller's open incidents.",
        drill: "Build the resource, set authentication, and call it from Postman with basic auth.",
        takeaway:
          "process the request, build a response object, return it. Never trust query params — validate with the same rigor as a Client Script bypass scenario.",
      },
      {
        day: 18,
        title: "Day 18: REST Messages — Calling Out to the World",
        goal: "Build a REST Message that hits a public API and parse the JSON response.",
        drill: "Call https://api.github.com/users/{name} and store the avatar_url on a custom table.",
        takeaway:
          "Use variable substitutions for inputs. Always check getStatusCode() before reading the body. Wrap in try/catch — network failures are not optional.",
      },
      {
        day: 19,
        title: "Day 19: Debugging Like a Senior",
        goal: "Use the Script Debugger, gs.info with prefixes, and the System Log to triage a bug in under 10 minutes.",
        drill: "Take a broken Business Rule (intentionally), find the bug, fix it without adding more than 2 log lines.",
        takeaway:
          "Logs are evidence, not bandages. Prefix every log with a tag you can grep. The debugger beats logs once you've used it three times.",
      },
      {
        day: 20,
        title: "Day 20: Interview Scenario Day",
        goal: "Solve one end-to-end scenario like an interviewer asked it.",
        drill:
          "'When a P1 incident is opened, notify the on-call manager, create a major incident task, and post to a Teams channel.' Whiteboard the design before writing any code.",
        takeaway:
          "Interviewers grade clarity, not cleverness. Name the components (BR, Flow, REST Message, notification), justify the order, and only then talk code.",
      },
    ],
    practice: [
      { label: "Scenario-based scripting guide", to: "/learn/scenario-based-scripting" },
      { label: "ACL scripting guide", to: "/learn/acl-scripting" },
      { label: "ServiceNow regex tester", to: "/tools/servicenow-regex-tester" },
    ],
    prevSlug: "week-3-client-side-and-glideajax",
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
