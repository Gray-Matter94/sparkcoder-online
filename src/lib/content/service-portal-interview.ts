/**
 * Content for /learn/service-portal-interview-questions.
 *  - QUICK_ANSWERS: short, quotable answers to the Service Portal questions
 *    that open almost every screening call.
 *  - SCENARIO_QA: role-scoped Service Portal scenarios with a recommended
 *    answer, a genuine alternate approach, and the pitfall interviewers
 *    listen for.
 */

export interface QuickAnswer {
  q: string;
  a: string;
}

export interface ScenarioQA {
  id: string;
  role: string;
  question: string;
  situation: string;
  answer: string[];
  alternate: string;
  pitfall: string;
}

export const QUICK_ANSWERS: QuickAnswer[] = [
  {
    q: "What is Service Portal in one sentence?",
    a: "Service Portal is ServiceNow's AngularJS-based front end that renders portal pages from records — sp_portal points at a theme and a homepage, pages hold containers and rows, rows hold columns, and columns hold widget instances — so end users get a responsive self-service experience without the classic UI16 platform UI.",
  },
  {
    q: "Name the core Service Portal tables.",
    a: "sp_portal (the portal itself), sp_page, sp_container, sp_row, sp_column, sp_instance (a widget placed on a page), sp_widget, sp_header_footer, sp_theme, sp_css, sp_ng_template (Angular templates), sp_angular_provider (client-side services), and sp_rectangle/sp_instance_menu for menus.",
  },
  {
    q: "What are the four parts of a widget?",
    a: "HTML template (Angular/Jelly-free markup), CSS (SCSS scoped to the widget), Server script (runs server-side, populates the `data` object), and Client script (an Angular controller with `$scope`, `c.data`, `c.server.update()`, `c.server.get()`). Option schema and demo data are the two supporting pieces.",
  },
  {
    q: "How do the server script and client controller talk to each other?",
    a: "Through the shared `data` object. The server script writes to `data`; the controller reads it as `c.data`. `c.server.update()` posts the whole `c.data` back and re-runs the server script (`input` is then populated); `c.server.get({...})` sends a one-off payload without replacing `c.data`.",
  },
  {
    q: "$sp vs GlideSystem — what is $sp for?",
    a: "`$sp` is the Service Portal server-side API available inside widget server scripts: `$sp.getParameter()` for URL params, `$sp.getRecord()` for the current record, `$sp.getWidget()` to embed another widget, `$sp.getStream()`, `$sp.canReadRecord()`, and `$sp.getForm()`/`getFields()` for form rendering.",
  },
  {
    q: "How do you embed one widget inside another?",
    a: "Server-side: `data.myWidget = $sp.getWidget('widget-id', {optionOverrides});` then in the HTML `<sp-widget widget=\"data.myWidget\"></sp-widget>`. That is the supported pattern — never try to inject a widget by writing raw HTML.",
  },
  {
    q: "Is Service Portal security separate from platform security?",
    a: "No. Widget server scripts run with the session user's rights, so ACLs still apply, and `$sp.canReadRecord()` exists to check before rendering. The two portal-specific controls are the widget's Public flag plus the page's/portal's role requirements — hiding a link is not security.",
  },
  {
    q: "How do you pass data between portal pages?",
    a: "Via URL parameters read with `$sp.getParameter('sys_id')` on the target page, or by storing shared state in a client-side Angular provider (sp_angular_provider) when the value must survive widget boundaries on the same page. Avoid session properties for anything user-facing.",
  },
  {
    q: "What is the difference between a widget option schema and instance options?",
    a: "The option schema defines the fields (name, type, default, label) a widget exposes; each sp_instance stores the values for one placement. Read them in the server script with `options.field_name`, so the same widget can be reused with different titles, tables, or limits.",
  },
  {
    q: "How do you debug a slow or broken portal page?",
    a: "Append `?sysparm_ng_debug=true` (widget outlines and instance details), use the Widget Editor's data preview, check the browser console for Angular digest errors, add `gs.info`/`gs.debug` in the server script and read them in the transaction log, and use the Transaction (Portal) log plus Slow Portal Transactions to find heavy GlideRecord loops.",
  },
];

export const SCENARIO_QA: ScenarioQA[] = [
  {
    id: "widget-n-plus-one",
    role: "Service Portal developer",
    question:
      "A homepage widget listing open requests takes eight seconds to render. How do you fix it?",
    situation:
      "The widget loops over the user's requests and, inside the loop, does a fresh GlideRecord query per record to get the requested item name and the approver display name.",
    answer: [
      "Confirm the cost server-side first: wrap the server script sections in `new GlideDateTime()` deltas or log timings, so you prove it is query volume and not a client-side digest problem.",
      "Kill the N+1: query the child table once with `addQuery('request', 'IN', sysIds)` and build a keyed JavaScript object, then join in memory instead of querying inside the loop.",
      "Use dot-walking (`gr.request_item.cat_item.name.getDisplayValue()`) or `GlideAggregate` for counts instead of loading whole records you only count.",
      "Cap the payload: `setLimit()` plus paging in the widget, and send only the fields the template renders — a fat `data` object also costs serialization and digest time.",
      "Cache what is genuinely static per user with a `sys_user_preference` or a short-lived cached provider, and re-measure after each change.",
    ],
    alternate:
      "You can move the read to a scripted REST or a Table API call fired from the client controller so the page paints before the list arrives. It improves perceived speed, but you now own loading and error states, and the data is no longer available for server-side rendering or accessibility fallbacks.",
    pitfall:
      "Speeding it up by switching to a GlideRecordSecure-free admin-style query or a `gs.getUser()` bypass. It gets fast by skipping ACLs, and it will leak other people's requests.",
  },
  {
    id: "acl-vs-widget",
    role: "Service Portal / security",
    question:
      "A user reports seeing a record in a portal widget they should not have access to. Where do you look?",
    situation:
      "The widget renders a list from a custom table; the record does not appear in the platform list view for that user, but does appear on the portal.",
    answer: [
      "Check whether the widget's server script queries with `GlideRecord` (unrestricted in scope terms of ACL evaluation on read of fields it prints) versus `GlideRecordSecure`, which enforces read ACLs row by row.",
      "Verify the widget is not marked Public, which lets an unauthenticated or lower-privileged session reach the server script.",
      "Add `$sp.canReadRecord(table, sysId)` guards before pushing anything into `data`, and never rely on template-level `ng-if` to hide sensitive values — the payload already left the server.",
      "Audit what the server script places in `data`: even one dot-walked field from a protected table is a leak once it is serialized to the browser.",
      "Retest as the affected user with impersonation, then confirm with the Security Debug (ACL) view on the platform record.",
    ],
    alternate:
      "For read-heavy public pages you can pre-shape a safe projection table (or a view) that only ever holds publishable fields, and query that from the widget. It removes the per-row ACL cost, but you take on keeping the projection in sync and correctly scoped.",
    pitfall:
      "Answering only 'add an ACL'. Interviewers want to hear that a widget server script is a server endpoint, so hidden fields, `ng-if`, and CSS never protect data.",
  },
  {
    id: "form-vs-catalog",
    role: "Service Portal architect",
    question:
      "The business wants a multi-step intake form on the portal. Record Producer, Catalog Item, or a custom widget?",
    situation:
      "Six steps, conditional questions, a file upload, and a requirement that partially completed submissions can be resumed a day later.",
    answer: [
      "Default to a Catalog Item with variable sets and a multi-row variable set when the outcome is a fulfilment request — you inherit the catalog UI, variable client scripts, price/approval handling, and the Requested Item record for free.",
      "Choose a Record Producer when the outcome is a single record on a specific table (a case, a change) and you want the platform's form engine rather than the catalog engine.",
      "Only build a custom widget when the interaction genuinely cannot be expressed as variables — and be explicit that you are then re-implementing validation, attachments, i18n and accessibility yourself.",
      "For resumability, persist a draft record (or a `sys_user_preference` payload) on each step and rehydrate it on load; the catalog does not resume by itself.",
      "Whatever the front end, keep validation server-side too — client-side variable scripts are convenience, not enforcement.",
    ],
    alternate:
      "On a modern instance, the answer can be Employee Center plus a UI Builder (Next Experience) page instead of a Service Portal widget. It is the strategic direction, but it splits your maintenance across two front-end technologies, so state that trade-off explicitly.",
    pitfall:
      "Reaching for a custom widget first. It reads as unfamiliarity with the catalog engine, and it usually loses accessibility, localisation and approval integration.",
  },
  {
    id: "server-update-loop",
    role: "Service Portal developer",
    question:
      "A widget re-runs its server script repeatedly and the page flickers. What is happening?",
    situation:
      "The developer called `c.server.update()` inside a `$scope.$watch` on `c.data`, so every response mutates the watched object and triggers another round trip.",
    answer: [
      "Explain the loop: `c.server.update()` replaces `c.data`, the watcher fires on the new object, and it calls update again — a classic Angular digest feedback loop.",
      "Fix it by only calling the server from explicit user actions or from a watcher on a single primitive field, not the whole `c.data` object.",
      "Use `c.server.get({action: 'refreshList'})` for targeted reads so the response does not replace `c.data` at all.",
      "Guard the server script with an `input.action` switch, so an accidental round trip cannot re-run write logic.",
      "Verify with the network tab that one interaction now produces exactly one POST to the widget endpoint.",
    ],
    alternate:
      "You can keep the watcher and debounce it (`$timeout` with a cancel token) when the field genuinely needs live server validation — cheaper to write, but it still sends traffic on every keystroke burst, so it only suits low-volume pages.",
    pitfall:
      "Silencing the symptom with `$scope.$applyAsync` or a flag that skips the second run. The round trips keep happening and the widget becomes unmaintainable.",
  },
  {
    id: "theme-branding",
    role: "Service Portal admin",
    question:
      "How do you brand a portal without breaking future upgrades?",
    situation:
      "Marketing wants new fonts, colours, a custom header, and a different homepage layout across two portals that share most styling.",
    answer: [
      "Style through the theme: create an sp_theme with SCSS variables in sp_css records, attach shared CSS to the theme and portal-specific overrides to the individual portal.",
      "Override Bootstrap variables (`$brand-primary`, `$navbar-default-bg`, font stacks) rather than writing `!important` rules against generated class names, which change between releases.",
      "Clone the out-of-box header/footer into your own sp_header_footer record instead of editing the baseline one, so upgrades do not conflict.",
      "Clone baseline pages and widgets you need to change (`copy` in the Widget Editor) and point the portal at your clones — a modified baseline widget shows as a skipped update on every upgrade.",
      "Keep layout in containers/rows/columns rather than hardcoded markup, so responsive breakpoints keep working.",
    ],
    alternate:
      "For a small tweak you can add a portal-level CSS record instead of a full theme clone. It is faster and lower risk, but it fragments styling across records and gets hard to reason about once more than a couple of overrides exist.",
    pitfall:
      "Editing baseline widgets and the stock header directly. It works today and generates a pile of upgrade conflicts and skipped records later.",
  },
  {
    id: "portal-vs-employee-center",
    role: "Service Portal architect",
    question:
      "Should a new self-service experience be built on Service Portal or Employee Center?",
    situation:
      "The customer is on a current release, has an existing heavily customised Service Portal, and wants a unified employee landing experience.",
    answer: [
      "State the direction of travel: Employee Center is built on Next Experience and UI Builder, is where ServiceNow invests, and ships taxonomy-driven navigation, quick links and content curation out of the box.",
      "Service Portal remains fully supported and is still the right answer for existing customisations, for external/customer-facing portals with heavy bespoke widgets, and where the team's skills are AngularJS.",
      "Recommend a staged approach: stand up Employee Center for navigation and content, keep high-value Service Portal pages reachable, and migrate widget by widget rather than in one cutover.",
      "Be explicit that Service Portal widgets do not run inside UI Builder pages — a migration is a rewrite into components, not a copy.",
      "Tie the recommendation to constraints: release, licensing, internal skills, and how much bespoke widget logic exists.",
    ],
    alternate:
      "Staying on Service Portal alone is a legitimate choice when the roadmap is short and the portal already performs. You keep one technology and one skill set, at the cost of missing new employee-experience features and eventually facing a larger migration.",
    pitfall:
      "Answering with a flat 'Employee Center, always'. Interviewers are probing whether you weigh existing investment and team capability, not whether you can name the newest product.",
  },
  {
    id: "search-typeahead",
    role: "Service Portal developer",
    question:
      "Portal search returns knowledge articles but not catalog items. How do you diagnose it?",
    situation:
      "Users searching a product name get KB results only, though the matching catalog item is active and visible in the catalog.",
    answer: [
      "Check the portal's Search Source configuration (sp_search_source) and which sources are attached to the portal's search page — a missing catalog source explains it immediately.",
      "Confirm the catalog source's search script and data template actually return rows for the term when run in Background Scripts as the affected user.",
      "Verify catalog visibility: user criteria on the item and category decide whether a user can see it, and search honours that.",
      "Check the item is published, active, and in a catalog attached to the portal, and that the search term matches indexed fields (name, short description) rather than only a variable label.",
      "Re-test with impersonation, and compare against an admin session to separate 'not indexed' from 'not permitted'.",
    ],
    alternate:
      "You can add a single unified search source backed by a scripted query across tables instead of separate sources. It gives one relevance model to tune, but you lose per-source configuration and have to implement permission filtering yourself.",
    pitfall:
      "Assuming a text-index rebuild is the fix. On this symptom it is almost always search-source configuration or user criteria, and a reindex wastes a maintenance window.",
  },
  {
    id: "accessibility-i18n",
    role: "Service Portal developer",
    question:
      "How do you make a custom widget accessible and translatable?",
    situation:
      "The widget ships with icon-only buttons, colour-coded status pills, and English strings written directly in the HTML template.",
    answer: [
      "Translate through the platform: wrap strings with `${...}` in templates or `gs.getMessage()` in the server script so they resolve from sys_ui_message, and never concatenate translated fragments.",
      "Give icon-only controls a text label or `aria-label`, and pair every colour cue with an icon or text so status is not conveyed by colour alone.",
      "Use real semantic elements — `<button>`, `<table>`, headings in order — because Angular templates make it easy to build a div-only interface that screen readers cannot navigate.",
      "Manage focus on dynamic updates: announce async results in an `aria-live` region and move focus into opened panels or modals.",
      "Test with keyboard only plus a screen reader, and check contrast of your theme's SCSS variables rather than trusting the design mock.",
    ],
    alternate:
      "For quick wins you can rely on the out-of-box widgets, which are already accessible and translated, and restrict custom code to layout. Less flexible visually, but it removes an entire class of compliance defects.",
    pitfall:
      "Treating accessibility as a QA pass at the end. Retro-fitting semantics into an Angular template built from divs is usually a rewrite of the widget.",
  },
];
