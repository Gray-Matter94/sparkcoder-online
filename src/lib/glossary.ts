import platformImg from "@/assets/learn-platform.jpg";
import itsmImg from "@/assets/learn-itsm.jpg";
import cmdbImg from "@/assets/learn-cmdb.jpg";
import flowImg from "@/assets/learn-flow.jpg";
import integrationImg from "@/assets/learn-integration.jpg";
import type { TrackId } from "./tracks";

/** Free-string topic id so each track can contribute its own topics. */
export type TopicId = string;

export interface Topic {
  id: TopicId;
  name: string;
  tagline: string;
  emoji: string;
  /** Optional hero image; tracks without bespoke art render an emoji+gradient. */
  image?: string;
  blurb: string;
  /** Which practice track this topic belongs to. */
  track: TrackId;
}

const SN_DEV_TOPICS: Topic[] = [
  {
    id: "platform",
    name: "Platform Basics",
    tagline: "The Now Platform — apps, tables, UI.",
    emoji: "🧱",
    image: platformImg,
    track: "servicenow-dev",
    blurb:
      "ServiceNow is a cloud platform-as-a-service (PaaS). Every record lives in a table, every screen is a form, and every piece of logic is configurable. Master the building blocks before the magic.",
  },
  {
    id: "itsm",
    name: "ITSM",
    tagline: "Incident, Problem, Change, Request.",
    emoji: "🎫",
    image: itsmImg,
    track: "servicenow-dev",
    blurb:
      "IT Service Management is the flagship suite — the four core processes (Incident, Problem, Change, Request) that interview panels grill you on first.",
  },
  {
    id: "cmdb",
    name: "CMDB",
    tagline: "Configuration items and their relationships.",
    emoji: "🗂️",
    image: cmdbImg,
    track: "servicenow-dev",
    blurb:
      "The Configuration Management Database is the single source of truth for everything in your environment — servers, apps, services, and how they connect.",
  },
  {
    id: "flow",
    name: "Flow Designer",
    tagline: "Low-code automation and workflows.",
    emoji: "🌊",
    image: flowImg,
    track: "servicenow-dev",
    blurb:
      "Flow Designer is ServiceNow's modern, no-code automation tool. It replaced Workflow Editor for most new automations and integrates cleanly with IntegrationHub.",
  },
  {
    id: "integration",
    name: "Integrations",
    tagline: "REST, SOAP, IntegrationHub, MID Server.",
    emoji: "🔌",
    image: integrationImg,
    track: "servicenow-dev",
    blurb:
      "Almost every real-world ServiceNow project talks to something else — Active Directory, Jira, AWS, SAP. Know the patterns and you'll never be stuck.",
  },
  {
    id: "scenario-based",
    name: "Scenario-Based Questions",
    tagline: "Architectural decisions & complex troubleshooting.",
    emoji: "🧩",
    track: "servicenow-dev",
    blurb:
      "The hardest ServiceNow interview round: open-ended scenarios where panels probe how you reason about design trade-offs, debug nasty production issues, and choose between business rules, flows, scripted REST, and integration patterns.",
  },
];

export interface Term {
  topic: TopicId;
  term: string;
  short: string;
  long: string;
}

const SN_DEV_TERMS: Term[] = [
  // Platform
  { topic: "platform", term: "Instance", short: "Your dedicated ServiceNow tenant.", long: "Each customer (and each dev / test / prod environment) gets its own URL like company.service-now.com. Code and data live inside the instance — there's no shared codebase across customers." },
  { topic: "platform", term: "Table", short: "A database table — every record lives in one.", long: "Tables can extend each other (Incident extends Task extends... ). Dot-walking lets you traverse references like incident.caller_id.email without a JOIN." },
  { topic: "platform", term: "Form & List", short: "The two main UI surfaces.", long: "A List shows many records as rows; a Form shows one record with all its fields. Both are auto-generated from the table definition and customizable per view." },
  { topic: "platform", term: "Application Scope", short: "Namespace that isolates an app's artifacts.", long: "Scoped apps prevent name collisions and protect their internals. The global scope is the legacy, unrestricted namespace — avoid it for new code." },
  { topic: "platform", term: "Update Set", short: "A bundle of customizations to ship between instances.", long: "Captures config records (business rules, UI policies, etc.) so you can move them dev → test → prod. Data records are NOT captured — use a data import or fix script for that." },

  // ITSM
  { topic: "itsm", term: "Incident", short: "An unplanned interruption to a service.", long: "Goal: restore service ASAP. Lives on the incident table (extends task). Priority is calculated from impact × urgency." },
  { topic: "itsm", term: "Problem", short: "The root cause of one or more incidents.", long: "Goal: prevent recurrence. A problem record links back to its incidents; a known error is a problem with a documented workaround." },
  { topic: "itsm", term: "Change", short: "A controlled modification to the environment.", long: "Three types: Standard (pre-approved), Normal (CAB approval), Emergency (fast-tracked). Goal: minimize risk to live services." },
  { topic: "itsm", term: "Request (RITM)", short: "A user asking for something from the catalog.", long: "A Request (REQ) contains one or more Requested Items (RITM), each of which spawns Catalog Tasks (SCTASK) for fulfillment teams." },
  { topic: "itsm", term: "SLA", short: "Service Level Agreement timer on a task.", long: "An SLA Definition attaches a stopwatch (e.g. 'resolve P1 in 4 hours') with pause conditions like 'awaiting user'. Breached SLAs drive escalations." },

  // CMDB
  { topic: "cmdb", term: "CI", short: "Configuration Item — a thing you manage.", long: "Servers, laptops, applications, services. Every CI lives on cmdb_ci or a child table like cmdb_ci_server." },
  { topic: "cmdb", term: "CI Class", short: "The type of a CI (table it lives on).", long: "Examples: cmdb_ci_linux_server, cmdb_ci_business_app. The CI Class hierarchy is what makes the CMDB queryable." },
  { topic: "cmdb", term: "Relationship", short: "How two CIs are connected.", long: "Stored on cmdb_rel_ci. Types like 'Runs on::Runs', 'Depends on::Used by'. Powers impact analysis and service maps." },
  { topic: "cmdb", term: "Discovery", short: "Agentless scan that populates the CMDB.", long: "Uses a MID Server to probe IPs, identify devices, and create / update CIs automatically. Pairs with Service Mapping for topology." },
  { topic: "cmdb", term: "CSDM", short: "Common Service Data Model.", long: "ServiceNow's prescriptive blueprint for how to organize CIs into Foundation → Design → Build → Manage Technical Services and Business Services." },

  // Flow Designer
  { topic: "flow", term: "Flow", short: "A trigger + sequence of actions.", long: "Created in Flow Designer (no code). Triggered by record events, schedules, inbound REST, or service catalog. The modern replacement for Workflow." },
  { topic: "flow", term: "Action", short: "A reusable step inside a flow.", long: "Built from steps like 'Look up records', 'Create record', or custom scripts. Actions can be shared across flows and packaged in spokes." },
  { topic: "flow", term: "Subflow", short: "A flow you call from another flow.", long: "Encapsulates reusable logic with inputs and outputs. Use subflows to keep flows readable and DRY." },
  { topic: "flow", term: "Spoke", short: "A pre-built integration pack for Flow Designer.", long: "ServiceNow ships spokes for Jira, Slack, MS Teams, Azure, etc. Each spoke adds ready-made actions you drag into flows." },
  { topic: "flow", term: "IntegrationHub", short: "The runtime that powers spokes & custom actions.", long: "Licensed add-on. Enables Action Designer steps like REST, PowerShell, and the spoke library. Required for most non-trivial integrations." },

  // Integration
  { topic: "integration", term: "REST Message", short: "Outbound REST call defined as a record.", long: "Configure endpoint, method, headers, and auth profile once; reuse across business rules, flows, and script includes via RESTMessageV2." },
  { topic: "integration", term: "Scripted REST API", short: "Custom inbound REST endpoint.", long: "Defines /api/<namespace>/<api>/<resource>. You write a server script that receives the request and returns a response — full control over inbound integrations." },
  { topic: "integration", term: "MID Server", short: "A Java agent inside the customer's network.", long: "Bridges ServiceNow (cloud) to on-prem systems for Discovery, Orchestration, and integrations that can't reach the public internet." },
  { topic: "integration", term: "Import Set", short: "Staging area for bulk data loads.", long: "Data lands on an import set table, then a Transform Map shapes and pushes it to the target table (e.g. user, cmdb_ci_server) with coalesce keys." },
  { topic: "integration", term: "Transform Map", short: "Field-by-field mapping from import set → target.", long: "Defines source-to-target field mapping, scripts, and coalesce rules. Onbefore/onafter scripts let you reshape data during the import." },

  // Scenario-based
  { topic: "scenario-based", term: "Business Rule vs Flow", short: "When to script server-side vs use Flow Designer.", long: "Use a business rule for tight, synchronous, table-level logic (validation, derived fields, abort). Use a Flow for multi-step orchestration, approvals, integrations, and anything a non-developer should maintain. Mixing both on the same table is the #1 source of duplicated logic in interview scenarios." },
  { topic: "scenario-based", term: "Performance Triage", short: "Slow form / slow list — where to look first.", long: "Check the slow query log, then onLoad/onChange client scripts, then display business rules, then dot-walked reference fields without indexes. Interviewers expect you to name the order, not just the tools." },
  { topic: "scenario-based", term: "Failed Integration", short: "Inbound REST request returns 500 — debug path.", long: "Start with the Scripted REST API's transaction log, then the system log for unhandled exceptions, then payload validation, then ACLs on the target table. Always mention idempotency: can the sender safely retry?" },
  { topic: "scenario-based", term: "Update Set Conflict", short: "Two devs change the same business rule.", long: "Last commit wins on import. Resolve by previewing the update set, accepting/skipping per record, and re-testing. Long-term fix: smaller, scoped update sets and a branch-per-story workflow." },
  { topic: "scenario-based", term: "Data Model Decision", short: "Extend a table vs add a reference field.", long: "Extend when the new record IS-A parent (Incident extends Task). Reference when it HAS-A relationship (Incident references Caller). Getting this wrong forces painful migrations later — a classic senior-developer interview probe." },
  { topic: "scenario-based", term: "Scoped vs Global", short: "Where should this customization live?", long: "Scoped apps for anything you'll ship, version, or hand off. Global only for cross-app utilities or legacy work. Scenario answer: explain the trade-off in cross-scope access and the API restrictions scoped apps impose." },
  { topic: "scenario-based", term: "ACL Debugging", short: "User can't see a record they should.", long: "Enable security debug, walk the ACL evaluation order (table → field → row), check role inheritance, and verify the condition / script blocks. Mention impersonation as your first reproduction step." },
  { topic: "scenario-based", term: "Async vs Sync Business Rule", short: "When does timing matter?", long: "Use async for non-blocking work like notifications, integrations, and analytics. Sync (before/after) for anything that must complete in the same transaction. Common interview trap: async rules can't reliably modify the current record before save." },
];

import { ADMIN_TOPICS, ADMIN_TERMS } from "./content/admin";
import { JAVA_TOPICS, JAVA_TERMS } from "./content/java";

export const TOPICS: Topic[] = [...SN_DEV_TOPICS, ...ADMIN_TOPICS, ...JAVA_TOPICS];
export const TERMS: Term[] = [...SN_DEV_TERMS, ...ADMIN_TERMS, ...JAVA_TERMS];

export function termsFor(topic: TopicId): Term[] {
  return TERMS.filter((t) => t.topic === topic);
}

export function topicsForTrack(track: TrackId): Topic[] {
  return TOPICS.filter((t) => t.track === track);
}

export function topicTrack(topicId: TopicId): TrackId | undefined {
  return TOPICS.find((t) => t.id === topicId)?.track;
}
