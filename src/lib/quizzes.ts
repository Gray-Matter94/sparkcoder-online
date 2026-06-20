import type { TopicId } from "./glossary";

export interface QuizQuestion {
  id: string;
  topic: TopicId;
  question: string;
  options: string[];
  correctIndex: number;
  /** Short summary shown right after answering. */
  explain: string;
  /** Optional richer breakdown rendered below `explain`. */
  whyCorrect?: string;
  /** Per-option pitfalls — keyed by option index. Shown when the user picks that wrong option. */
  whyWrong?: Record<number, string>;
  /** Short bullets with deeper context, gotchas, or follow-up reading prompts. */
  learnMore?: string[];
}


export const QUIZZES: QuizQuestion[] = [
  // Platform
  {
    id: "p1", topic: "platform",
    question: "Which scope should new custom applications use?",
    options: ["Global", "Scoped (custom)", "System", "ITIL"],
    correctIndex: 1,
    explain: "Scoped apps isolate artifacts and prevent name collisions. Global is the legacy unrestricted namespace.",
    whyCorrect: "A scoped application gets its own namespace (e.g. x_acme_myapp), its own roles, and explicit cross-scope access rules. That isolation is what makes apps safe to ship to other instances and to the Store.",
    whyWrong: {
      0: "Global has no namespace boundary, so two teams can clobber each other's business rules, script includes, and table names. ServiceNow has been steering custom work out of Global since the Geneva release.",
      2: "‘System’ isn't a user-selectable scope — those are platform-owned artifacts like sys_user and sys_metadata. You can't put custom apps there.",
      3: "ITIL is a role, not a scope. It controls what records a user can see, not where your app's code lives.",
    },
    learnMore: [
      "Scoped apps default to ‘Restricted’ for cross-scope reads/writes — you opt in per script include or table.",
      "Application files in a scoped app travel via the Application Repository, not Update Sets.",
    ],
  },
  {
    id: "p2", topic: "platform",
    question: "What does dot-walking let you do?",
    options: ["Run SQL JOINs manually", "Traverse reference fields without a JOIN", "Walk through update sets", "Step through scripts line-by-line"],
    correctIndex: 1,
    explain: "Dot-walking traverses reference fields automatically, e.g. incident.caller_id.manager.email.",
    whyCorrect: "When a field is a reference (foreign key), GlideRecord and the form engine resolve the join transparently. `gr.caller_id.manager.email` issues the lookups under the hood so you can write business logic without hand-rolling joins.",
    whyWrong: {
      0: "You never write SQL JOINs in ServiceNow — the platform abstracts the database. GlideRecord + dot-walking is the supported path.",
      2: "Update sets are tracked through the Local Update Sets module, not by ‘walking’ them.",
      3: "Stepping through scripts is the Script Debugger. Dot-walking is a data-access pattern.",
    },
    learnMore: [
      "Each dot-walk hop is an extra query — mind hot loops; use GlideAggregate or a database view for heavy joins.",
      "On a form, dot-walked fields appear with a small reference icon and are read-only by default.",
    ],
  },
  {
    id: "p3", topic: "platform",
    question: "Update Sets capture which of these?",
    options: ["Configuration records only", "Data records only", "Both config and data", "Attachments only"],
    correctIndex: 0,
    explain: "Update Sets ship configuration (business rules, UI policies, etc.). For data you need data imports or fix scripts.",
    whyCorrect: "Update Sets track changes to records flagged with the ‘sys_metadata’ marker — business rules, UI policies, client scripts, tables, ACLs. Those artifacts make up an application's configuration.",
    whyWrong: {
      1: "Operational data (incidents, users, CIs) is intentionally excluded. Moving data uses Import Sets, XML exports, or fix scripts.",
      2: "Mixing data into update sets is a classic anti-pattern — promotions become non-repeatable and overwrite live records in higher environments.",
      3: "Attachments to config records can ride along, but attachments alone aren't what update sets exist for.",
    },
    learnMore: [
      "Always run ‘Preview Update Set’ before committing — it surfaces collisions and lets you skip individual updates.",
      "Batch update sets to chain related changes and commit in one ordered pass.",
    ],
  },
  {
    id: "p4", topic: "platform",
    question: "Incident extends which table?",
    options: ["cmdb_ci", "sys_user", "task", "sys_metadata"],
    correctIndex: 2,
    explain: "Incident extends Task, so it inherits state, assigned_to, sys_id, etc.",
    whyCorrect: "Task is the abstract parent for any record that represents work — Incident, Problem, Change, RITM, SCTASK. That's why they share workflow fields (state, assignment_group, work_notes, SLA hooks).",
    whyWrong: {
      0: "cmdb_ci is the root of Configuration Items — servers and apps, not work records.",
      1: "sys_user is the people table. Incidents reference users via caller_id, but they don't extend it.",
      3: "sys_metadata is the parent of configuration artifacts (business rules, UI policies) — platform plumbing, not business data.",
    },
    learnMore: [
      "Querying `task` returns Incidents, Problems, Changes, etc. — handy for ‘all my work’ dashboards.",
      "Custom work tables should also extend Task so they inherit assignment, SLA, and notifications for free.",
    ],
  },

  // ITSM
  { id: "i1", topic: "itsm", question: "Priority on an incident is calculated from…", options: ["Impact × Urgency", "Severity × Caller VIP", "Assignment Group × State", "SLA timer"], correctIndex: 0, explain: "Out of the box, Priority = Impact × Urgency via a Priority Lookup Rules table.", whyCorrect: "The Priority Lookup Rules table (sys_priority) maps every (Impact, Urgency) pair to a Priority value. The Incident business rule reads that table on insert/update.", whyWrong: { 1: "Severity isn't an OOB field on Incident. VIP status can drive separate notifications but doesn't set Priority directly.", 2: "Assignment Group and State govern routing and workflow, not priority math.", 3: "SLAs are consumed by Priority — they don't produce it." }, learnMore: ["Customers often override the lookup table to tweak the 5×5 matrix without touching code.", "Major Incident workflows can promote Priority independently of the matrix."] },
  { id: "i2", topic: "itsm", question: "What's the primary goal of Problem Management?", options: ["Restore service fast", "Prevent recurrence by finding root cause", "Approve risky changes", "Fulfill catalog requests"], correctIndex: 1, explain: "Incident restores service; Problem prevents the next incident by addressing root cause.", whyCorrect: "Problem records pair a known error with a workaround and a fix, so the same outage doesn't keep recurring across many incidents.", whyWrong: { 0: "That's Incident Management — speed of restoration. Problem trades speed for durability of the fix.", 2: "Approving risky changes is Change Management (CAB).", 3: "Fulfilling catalog requests is Request Management (REQ → RITM → SCTASK)." }, learnMore: ["Major Incidents typically auto-create a Problem to drive RCA.", "Known Errors feed a Knowledge Base entry so L1 can apply the workaround."] },
  { id: "i3", topic: "itsm", question: "Which change type is pre-approved and low risk?", options: ["Normal", "Emergency", "Standard", "Latent"], correctIndex: 2, explain: "Standard changes follow a pre-approved template (e.g. password reset). Normal needs CAB; Emergency is fast-tracked.", whyCorrect: "A Standard Change Template encodes the steps and risk of a low-impact change so it can be executed repeatedly without CAB review.", whyWrong: { 0: "Normal changes require CAB approval and a full risk assessment.", 1: "Emergency changes bypass CAB only because of urgency — they're high-risk, not low-risk.", 3: "‘Latent’ isn't a ServiceNow change type." }, learnMore: ["Standard Change proposals start as Normal and graduate to Standard after enough successful executions.", "Templates can lock down fields so the change can only be raised in the approved shape."] },
  { id: "i4", topic: "itsm", question: "What does RITM stand for?", options: ["Requested IT Module", "Requested Item", "Routed Incident Ticket Manager", "Resource IT Management"], correctIndex: 1, explain: "A Request (REQ) contains one or more Requested Items (RITM), which spawn Catalog Tasks (SCTASK).", whyCorrect: "Catalog flow: REQ (the shopping cart) → RITM (one item in the cart) → SCTASK (the work to deliver it).", whyWrong: { 0: "Plausible expansion but not the ServiceNow term — the platform uses ‘Item’, not ‘Module’.", 2: "RITM has nothing to do with Incident; it's the Service Catalog stack.", 3: "‘Resource IT Management’ isn't a ServiceNow acronym." }, learnMore: ["Approvals usually attach to the RITM, not the REQ.", "SCTASKs route to fulfillment groups defined on the catalog item's workflow."] },

  // CMDB
  { id: "c1", topic: "cmdb", question: "Which table stores CI-to-CI relationships?", options: ["cmdb_ci", "cmdb_rel_ci", "cmdb_rel_type", "cmdb_ci_relationship"], correctIndex: 1, explain: "cmdb_rel_ci stores parent / child / type for every relationship between CIs.", whyCorrect: "Each row in cmdb_rel_ci has parent, child, and type — that triple defines one directed edge in the CI graph.", whyWrong: { 0: "cmdb_ci is the CI table itself (the nodes), not the edges.", 2: "cmdb_rel_type defines the *catalogue* of relationship types (‘Runs on’, ‘Depends on’) — it doesn't hold individual relationships.", 3: "cmdb_ci_relationship doesn't exist as an OOB table." }, learnMore: ["Dependency Views and Service Maps render by walking cmdb_rel_ci.", "Bad data here is a top cause of broken impact analysis — guard it with identification & reconciliation rules."] },
  { id: "c2", topic: "cmdb", question: "What populates the CMDB automatically?", options: ["Import Sets", "Discovery (with a MID Server)", "Flow Designer", "Business Rules"], correctIndex: 1, explain: "Discovery probes the network via a MID Server and creates/updates CIs based on identification rules.", whyCorrect: "Discovery schedules run probes (SSH, WMI, SNMP) from the MID Server, then sensors hand the payload to the Identification & Reconciliation Engine (IRE) which creates or updates the right CI.", whyWrong: { 0: "Import Sets can load CIs but they're manual feeds — not automatic discovery.", 2: "Flow Designer orchestrates work; it doesn't probe infrastructure.", 3: "Business Rules react to record changes — they can't reach out to scan the network." }, learnMore: ["Service Mapping is Discovery's app-aware sibling — top-down vs Discovery's bottom-up.", "All inserts/updates from any source should go through the IRE to avoid duplicate CIs."] },
  { id: "c3", topic: "cmdb", question: "CSDM stands for…", options: ["Cloud Service Data Model", "Common Service Data Model", "Configuration Standard Data Map", "Customer Service Data Manager"], correctIndex: 1, explain: "CSDM is the prescriptive blueprint for organizing CIs across Foundation, Design, Build, and Manage domains.", whyCorrect: "CSDM is ServiceNow's published standard for how Business Services, Application Services, and supporting CIs relate — a shared vocabulary across ITSM, ITOM, ITBM, and SecOps.", whyWrong: { 0: "Plausible but wrong — CSDM is not cloud-specific.", 2: "Not a real ServiceNow term.", 3: "Confuses CSDM with Customer Service Management (CSM)." }, learnMore: ["Crawl/Walk/Run/Fly maturity model guides phased adoption.", "Aligning to CSDM is a prerequisite for accurate Service Owner reporting and SAM/HAM integration."] },
  { id: "c4", topic: "cmdb", question: "A Linux server CI lives on which class table?", options: ["cmdb_ci", "cmdb_ci_server", "cmdb_ci_linux_server", "cmdb_ci_computer"], correctIndex: 2, explain: "Each CI sits on the most specific class table; cmdb_ci_linux_server extends cmdb_ci_server which extends cmdb_ci.", whyCorrect: "ServiceNow uses table-per-class inheritance, and a CI is stored on its most specific class so attributes unique to Linux servers (e.g. distribution) have a home.", whyWrong: { 0: "cmdb_ci is the abstract root — a CI lives *under* it, not directly on it.", 1: "cmdb_ci_server is the generic server class; Linux servers extend it further.", 3: "cmdb_ci_computer covers workstations/laptops, not servers." }, learnMore: ["Class Manager visualizes the hierarchy and lets you create custom child classes.", "Reclassification rules during Discovery promote a CI to a more specific class when richer data arrives."] },


  { id: "f1", topic: "flow", question: "Flow Designer replaced which tool for most new automations?", options: ["Workflow Editor", "GlideRecord", "Update Set Editor", "Performance Analytics"], correctIndex: 0, explain: "Flow Designer is the modern, low-code replacement for the legacy Workflow Editor." },
  { id: "f2", topic: "flow", question: "What's a Spoke?", options: ["A reusable subflow", "A pre-built integration pack", "A debugging tool", "A type of CI relationship"], correctIndex: 1, explain: "Spokes are integration packs (Slack, Jira, Azure, etc.) that add ready-made Flow Designer actions." },
  { id: "f3", topic: "flow", question: "Which is required to use most spokes?", options: ["Performance Analytics", "IntegrationHub", "Service Portal", "MID Server"], correctIndex: 1, explain: "IntegrationHub is the licensed runtime that powers spokes and custom Action Designer steps." },
  { id: "f4", topic: "flow", question: "When should you build a Subflow?", options: ["Never — flows can't call other flows", "For logic reused across multiple flows", "Only inside global scope", "For UI customization"], correctIndex: 1, explain: "Subflows encapsulate reusable logic with inputs/outputs so flows stay DRY and readable." },

  // Integration
  { id: "n1", topic: "integration", question: "A REST Message is used for…", options: ["Inbound REST endpoints", "Outbound REST calls", "Email notifications", "MID Server health"], correctIndex: 1, explain: "REST Messages define outbound calls. For inbound endpoints, use a Scripted REST API." },
  { id: "n2", topic: "integration", question: "When do you need a MID Server?", options: ["For all REST calls", "To reach systems behind the customer's firewall", "To run client scripts faster", "Only for SOAP integrations"], correctIndex: 1, explain: "The MID Server is a Java agent in the customer's network that bridges cloud → on-prem systems." },
  { id: "n3", topic: "integration", question: "What does an Import Set Transform Map do?", options: ["Encrypts data in transit", "Maps source fields to target table fields", "Schedules the import", "Validates SSL certs"], correctIndex: 1, explain: "Transform Maps shape data from the staging import_set table into the real target table (user, cmdb_ci, etc.)." },
  { id: "n4", topic: "integration", question: "Which is the inbound REST endpoint mechanism?", options: ["REST Message", "Scripted REST API", "Outbound Web Service", "MID Server Probe"], correctIndex: 1, explain: "Scripted REST APIs expose /api/<namespace>/<api>/<resource> with a server script you control." },
];

import { generatedQuizzesFor } from "./quiz-generator";
import { ADMIN_QUIZZES, ADMIN_SECTIONS } from "./content/admin";
import { JAVA_QUIZZES, JAVA_SECTIONS } from "./content/java";

QUIZZES.push(...ADMIN_QUIZZES, ...JAVA_QUIZZES);

function shuffleQ<T>(arr: T[], seed: number): T[] {
  const out = arr.slice();
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function quizFor(topic: TopicId): QuizQuestion[] {
  const handcrafted = QUIZZES.filter((q) => q.topic === topic);
  const generated = generatedQuizzesFor(topic);
  const seen = new Set<string>();
  const merged: QuizQuestion[] = [];
  for (const q of [...handcrafted, ...generated]) {
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    merged.push(q);
  }
  const seed = topic.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const head = merged.slice(0, handcrafted.length);
  const tail = shuffleQ(merged.slice(handcrafted.length), seed);
  return [...head, ...tail];
}

export interface QuizSection {
  label: string;
  /** Emoji or short icon shown beside the label. */
  icon?: string;
  /** Number of questions in this section. */
  count: number;
}

/**
 * Per-topic milestone breakdown. Sections are consumed in order; if the
 * total `count` is less than the quiz length, a trailing "Bonus round"
 * section absorbs the remainder.
 */
const SECTION_PLAN: Record<string, QuizSection[]> = {
  platform: [
    { label: "Core concepts", icon: "🧱", count: 2 },
    { label: "Data model", icon: "🗂️", count: 2 },
  ],
  itsm: [
    { label: "Incident & Problem", icon: "🚨", count: 2 },
    { label: "Change & Request", icon: "📝", count: 2 },
  ],
  cmdb: [
    { label: "CI relationships", icon: "🔗", count: 2 },
    { label: "Discovery & CSDM", icon: "🛰️", count: 2 },
  ],
  flow: [
    { label: "Flow Designer basics", icon: "⚡", count: 2 },
    { label: "Spokes & reuse", icon: "🔌", count: 2 },
  ],
  integration: [
    { label: "REST & inbound APIs", icon: "🌐", count: 2 },
    { label: "MID Server & imports", icon: "🔁", count: 2 },
  ],
  ...ADMIN_SECTIONS,
  ...JAVA_SECTIONS,
};

export function sectionsFor(topic: TopicId, total: number): QuizSection[] {
  const base = SECTION_PLAN[topic] ?? [];
  const planned = base.reduce((s, x) => s + x.count, 0);
  if (planned >= total) {
    // Trim trailing sections if quiz shrank.
    const out: QuizSection[] = [];
    let remaining = total;
    for (const s of base) {
      if (remaining <= 0) break;
      const c = Math.min(s.count, remaining);
      out.push({ ...s, count: c });
      remaining -= c;
    }
    return out;
  }
  return [...base, { label: "Bonus round", icon: "🎁", count: total - planned }];
}

export function sectionForIndex(
  sections: QuizSection[],
  idx: number,
): { section: QuizSection; sectionIdx: number; positionInSection: number } | null {
  let acc = 0;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (idx < acc + s.count) {
      return { section: s, sectionIdx: i, positionInSection: idx - acc };
    }
    acc += s.count;
  }
  return null;
}
