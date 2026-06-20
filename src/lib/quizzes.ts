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


  // Flow
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
