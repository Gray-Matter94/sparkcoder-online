import type { TopicId } from "./glossary";

export interface QuizQuestion {
  id: string;
  topic: TopicId;
  question: string;
  options: string[];
  correctIndex: number;
  explain: string;
}

export const QUIZZES: QuizQuestion[] = [
  // Platform
  { id: "p1", topic: "platform", question: "Which scope should new custom applications use?", options: ["Global", "Scoped (custom)", "System", "ITIL"], correctIndex: 1, explain: "Scoped apps isolate artifacts and prevent name collisions. Global is the legacy unrestricted namespace." },
  { id: "p2", topic: "platform", question: "What does dot-walking let you do?", options: ["Run SQL JOINs manually", "Traverse reference fields without a JOIN", "Walk through update sets", "Step through scripts line-by-line"], correctIndex: 1, explain: "Dot-walking traverses reference fields automatically, e.g. incident.caller_id.manager.email." },
  { id: "p3", topic: "platform", question: "Update Sets capture which of these?", options: ["Configuration records only", "Data records only", "Both config and data", "Attachments only"], correctIndex: 0, explain: "Update Sets ship configuration (business rules, UI policies, etc.). For data you need data imports or fix scripts." },
  { id: "p4", topic: "platform", question: "Incident extends which table?", options: ["cmdb_ci", "sys_user", "task", "sys_metadata"], correctIndex: 2, explain: "Incident extends Task, so it inherits state, assigned_to, sys_id, etc." },

  // ITSM
  { id: "i1", topic: "itsm", question: "Priority on an incident is calculated from…", options: ["Impact × Urgency", "Severity × Caller VIP", "Assignment Group × State", "SLA timer"], correctIndex: 0, explain: "Out of the box, Priority = Impact × Urgency via a Priority Lookup Rules table." },
  { id: "i2", topic: "itsm", question: "What's the primary goal of Problem Management?", options: ["Restore service fast", "Prevent recurrence by finding root cause", "Approve risky changes", "Fulfill catalog requests"], correctIndex: 1, explain: "Incident restores service; Problem prevents the next incident by addressing root cause." },
  { id: "i3", topic: "itsm", question: "Which change type is pre-approved and low risk?", options: ["Normal", "Emergency", "Standard", "Latent"], correctIndex: 2, explain: "Standard changes follow a pre-approved template (e.g. password reset). Normal needs CAB; Emergency is fast-tracked." },
  { id: "i4", topic: "itsm", question: "What does RITM stand for?", options: ["Requested IT Module", "Requested Item", "Routed Incident Ticket Manager", "Resource IT Management"], correctIndex: 1, explain: "A Request (REQ) contains one or more Requested Items (RITM), which spawn Catalog Tasks (SCTASK)." },

  // CMDB
  { id: "c1", topic: "cmdb", question: "Which table stores CI-to-CI relationships?", options: ["cmdb_ci", "cmdb_rel_ci", "cmdb_rel_type", "cmdb_ci_relationship"], correctIndex: 1, explain: "cmdb_rel_ci stores parent / child / type for every relationship between CIs." },
  { id: "c2", topic: "cmdb", question: "What populates the CMDB automatically?", options: ["Import Sets", "Discovery (with a MID Server)", "Flow Designer", "Business Rules"], correctIndex: 1, explain: "Discovery probes the network via a MID Server and creates/updates CIs based on identification rules." },
  { id: "c3", topic: "cmdb", question: "CSDM stands for…", options: ["Cloud Service Data Model", "Common Service Data Model", "Configuration Standard Data Map", "Customer Service Data Manager"], correctIndex: 1, explain: "CSDM is the prescriptive blueprint for organizing CIs across Foundation, Design, Build, and Manage domains." },
  { id: "c4", topic: "cmdb", question: "A Linux server CI lives on which class table?", options: ["cmdb_ci", "cmdb_ci_server", "cmdb_ci_linux_server", "cmdb_ci_computer"], correctIndex: 2, explain: "Each CI sits on the most specific class table; cmdb_ci_linux_server extends cmdb_ci_server which extends cmdb_ci." },

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

export function quizFor(topic: TopicId): QuizQuestion[] {
  return QUIZZES.filter((q) => q.topic === topic);
}
