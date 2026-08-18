/**
 * Extra depth for /learn/csm-interview-questions:
 *  - QUICK_ANSWERS: an on-page answer summary a reader (or an AI answer engine)
 *    can lift directly for "what will they ask me in a CSM interview".
 *  - SCENARIO_QA: role-scoped Customer Service Management scenarios with a
 *    recommended answer, a genuine alternate approach, and the pitfall
 *    interviewers listen for.
 */

export interface QuickAnswer {
  q: string;
  a: string;
}

export interface ScenarioQA {
  id: string;
  /** Which slice of the CSM role this probes. */
  role: string;
  question: string;
  situation: string;
  answer: string[];
  alternate: string;
  pitfall: string;
}

export const QUICK_ANSWERS: QuickAnswer[] = [
  {
    q: "What is ServiceNow CSM in one sentence?",
    a: "Customer Service Management is the ServiceNow application that handles external customer cases end to end — intake through the Customer Service Portal or Employee-style portal, entitlement and SLA checks against the customer's contract, routing to support teams, and resolution linked back to the Account, Contact, and installed product.",
  },
  {
    q: "Which CSM tables should you be able to name from memory?",
    a: "sn_customer_service_case (extends task), customer_account, customer_contact, sn_customer_service_entitlement, service_contract, sn_install_base_item, sn_customer_service_case_task, sn_customer_service_special_handling_note, and for FSM wm_order plus wm_task.",
  },
  {
    q: "Account vs. Contact vs. Consumer — what's the difference?",
    a: "Account (customer_account) is the B2B company you sell to; Contact (customer_contact) is a person who works for that account and can raise cases for it; Consumer (csm_consumer) is a B2C individual with no account relationship. B2B cases key off Account + Contact, B2C cases key off Consumer, and entitlement logic differs for each.",
  },
  {
    q: "How does entitlement work on a case?",
    a: "When a case is created, CSM matches the Account (and optionally the product, contact, or install base item) against sn_customer_service_entitlement records. The matched entitlement drives which SLA attaches, whether the channel used is allowed, and whether service consumption is recorded against the contract.",
  },
  {
    q: "How is a CSM case different from an ITSM incident?",
    a: "Both extend task, but a case represents a commitment to an external customer, so it carries Account, Contact, Product, Entitlement, and contract-based SLAs. An incident represents an internal service disruption on cmdb_ci. CSM cases can spawn incidents through Case–Incident relationships so support and IT keep separate records of the same problem.",
  },
  {
    q: "What is Advanced Work Assignment used for in CSM?",
    a: "AWA pushes work to agents from service channels (case, chat, messaging, phone) based on capacity, skills, and assignment eligibility rather than letting agents cherry-pick a queue. It powers Agent Workspace inbox routing and is the modern replacement for assignment-only business rules.",
  },
  {
    q: "What does the Install Base give you?",
    a: "sn_install_base_item models what the customer actually owns — product instances, their lifecycle stage, hierarchy, and the asset they map to. It lets entitlement, warranty, and case history be scoped to a specific unit rather than the whole account.",
  },
  {
    q: "How do you let a customer's users see only their own account's cases?",
    a: "Through the Customer Service Portal's contact roles plus ACLs on sn_customer_service_case: sn_customer_service.customer sees their own cases, sn_customer_service.customer_admin sees the whole account, and partner roles add the partner-account dimension. Never rely on portal widget filtering alone — enforce it in ACLs.",
  },
  {
    q: "When would you use Case Tasks instead of child cases?",
    a: "Use Case Tasks for fulfilment work that belongs to one customer commitment and shouldn't have its own SLA or customer visibility. Use child cases when the work is a separate customer-facing commitment, or when a different account/contact owns it.",
  },
  {
    q: "What is Major Issue Management in CSM?",
    a: "It groups many customer cases under one Major Case so agents communicate once and resolve together: a Major Case Candidate is promoted to a Major Case, child cases are attached, and updates or resolution cascade to every child — the CSM equivalent of major incident handling.",
  },
];

export const SCENARIO_QA: ScenarioQA[] = [
  {
    id: "entitlement-mismatch",
    role: "CSM developer",
    question:
      "A Gold-contract customer's cases are attaching the default SLA instead of their contract SLA. How do you diagnose it?",
    situation:
      "Cases arrive from the portal with the right Account, but the SLA breach clock matches the out-of-box 8-hour target rather than the 2-hour Gold commitment, and consumption never posts to the contract.",
    answer: [
      "Check the entitlement match first: sn_customer_service_entitlement records must match on Account (or the account's parent, if Include child accounts is set), and on product/asset when the entitlement is scoped that way.",
      "Confirm the entitlement is active and in date — an expired service_contract silently drops the match and CSM falls back to the default.",
      "Verify the channel: entitlements restrict allowed channels, so a portal case can miss an entitlement configured for phone only.",
      "Then inspect the SLA definition condition on contract_sla — it usually keys off entitlement or contract fields, so a null entitlement makes only the generic definition qualify.",
      "Reproduce with a scripted case insert in Background Scripts and log the resolved entitlement, so you separate a matching problem from an SLA condition problem.",
    ],
    alternate:
      "If the customer's commercial model doesn't map cleanly to entitlement records, you can drive SLA selection from a contract field on the Account and a condition script on the SLA definition. It's simpler to reason about, but you lose entitlement consumption tracking and channel enforcement — acceptable only when contracts are uniform.",
    pitfall:
      "Fixing it by hardcoding the SLA in a business rule. It works for that one customer, breaks silently at renewal, and hides the real defect from anyone reading the entitlement configuration.",
  },
  {
    id: "case-to-incident",
    role: "CSM architect",
    question:
      "Twenty customers report the same outage. How do you model this so support and IT both work correctly?",
    situation:
      "Cases are piling up in the Tier 1 queue, IT is already investigating an infrastructure fault, and leadership wants one status message to all affected customers.",
    answer: [
      "Create or promote a Major Case: mark one case a Major Case Candidate, promote it, and attach the related cases as children so communication and resolution cascade.",
      "Relate the Major Case to the ITSM incident (Case–Incident relationship) rather than duplicating the technical investigation into CSM — IT keeps ownership of the cmdb_ci and root cause.",
      "Use the outbound communication plan on the Major Case so each child contact gets the same update, and the child case worknotes stay auditable.",
      "On incident resolution, resolve the Major Case, which propagates resolution code and notes to children; SLAs on each child still measure the customer commitment individually.",
    ],
    alternate:
      "Where Major Issue Management isn't licensed or configured, you can link child cases to a parent case and drive updates with a Flow Designer flow on the parent. You keep the grouping, but you lose candidate detection, the built-in communication plan, and the major-case reporting.",
    pitfall:
      "Closing the twenty customer cases as duplicates of the incident. The customer-facing commitment disappears from reporting and SLA attainment looks better than it actually was.",
  },
  {
    id: "portal-visibility",
    role: "CSM admin",
    question:
      "A customer's procurement user can see cases raised by other contacts at their company. Is that a bug?",
    situation:
      "The customer complains during a security review. Both users have the same portal login flow and neither is an internal agent.",
    answer: [
      "Establish intent first: sn_customer_service.customer_admin is designed to see all cases for their account, so the behaviour may be correct role assignment rather than a defect.",
      "If it isn't intended, check the contact's roles on customer_contact, then the read ACL on sn_customer_service_case — visibility must be enforced there, not in the portal widget query.",
      "For partner scenarios, confirm partner-account fields and whether the partner is allowed to see end-customer cases; that's a separate dimension from account admin.",
      "Test with impersonation from the Customer Service Portal, not the backend list, because portal pages layer their own data resource filters on top of ACLs.",
    ],
    alternate:
      "For unusual sharing rules (e.g. only cases for the contact's own site or product line), add a Before Query business rule that appends the encoded query for non-admin customer roles. It centralises the rule, but it applies to every access path including integrations, so it must be written defensively.",
    pitfall:
      "Filtering the portal list widget and calling it fixed. The record is still readable through the API and the case URL, which is exactly what a security review will find.",
  },
  {
    id: "csm-fsm-handoff",
    role: "CSM/FSM developer",
    question:
      "A case needs an on-site engineer visit. How does the CSM to Field Service handoff work?",
    situation:
      "Tier 2 has confirmed a hardware fault on an install base item and the customer needs someone dispatched within the entitlement window.",
    answer: [
      "From the case, create a Work Order (wm_order) — it carries the Account, Contact, location, and the install base item so the technician knows exactly which unit to service.",
      "Work Order Tasks (wm_task) hold the dispatchable units of work, with skills, part requirements, and a time window; Dynamic Scheduling or Central Dispatch assigns them.",
      "Keep the case open as the customer commitment: the case SLA continues to measure the customer-facing promise while the work order tracks field execution.",
      "Close the loop by writing resolution detail back to the case when the last work order task completes, so the customer sees one outcome rather than two systems' statuses.",
    ],
    alternate:
      "For simple visits you can model the dispatch as a Case Task with an assignment group of field engineers. It avoids FSM licensing and setup, but you lose scheduling, geolocation, parts, and technician mobile support — only viable at low volume.",
    pitfall:
      "Resolving the case as soon as the work order is created. It stops the SLA clock while the customer is still waiting, which is the fastest way to lose the trust of the metric.",
  },
  {
    id: "special-handling",
    role: "CSM developer",
    question:
      "A strategic account needs agents warned about handling rules before they touch a case. How do you implement that?",
    situation:
      "The account has a contractual no-callback rule and a named escalation contact. Agents keep missing it because it lives in a knowledge article nobody opens.",
    answer: [
      "Use Special Handling Notes (sn_customer_service_special_handling_note) attached to the Account, Contact, product, or install base item — they surface automatically in Agent Workspace when a matching case is opened.",
      "Set the note type and display behaviour so critical notes interrupt (modal) while informational notes sit in the contextual side panel.",
      "Keep the note short and actionable; put the long-form procedure in a linked knowledge article scoped to the account's user criteria.",
      "Audit adherence with a report on cases for that account where a phone interaction exists, rather than trusting that the warning was read.",
    ],
    alternate:
      "You can achieve a similar prompt with a UI Policy or a client script showing an info message on the case form. It works in the classic UI, but it doesn't render in Agent Workspace the same way and it isn't manageable by non-developers — special handling notes are configuration, not code.",
    pitfall:
      "Storing the rule only in a case template or an assignment rule comment. Nothing renders it to the agent at the moment of contact, so the contractual breach still happens.",
  },
  {
    id: "self-service-deflection",
    role: "CSM architect",
    question:
      "Leadership wants case volume down 20% without hurting satisfaction. What do you propose?",
    situation:
      "Most inbound cases are password, how-to, and order-status questions, and the portal search is barely used.",
    answer: [
      "Instrument first: report on case categories and the top contact reasons so deflection targets the actual volume drivers, not assumptions.",
      "Add type-ahead search and Knowledge suggestions on the case-create form so relevant articles appear before submission, and track deflection events in the portal.",
      "Automate the mechanical categories: order status becomes a portal lookup or an IntegrationHub call, password issues become a catalog-style flow — these need no agent judgement.",
      "Add Virtual Agent for the top three conversational intents with a clean handoff to live chat that carries the transcript into the case, so failed automation doesn't restart the customer's effort.",
      "Report on deflection alongside CSAT and reopen rate, so a volume drop that just pushes work into second contacts is visible.",
    ],
    alternate:
      "A narrower play is to route those categories to a low-cost triage queue with case templates and canned responses instead of automating them. It's faster to deliver and needs no Virtual Agent, but it caps the saving at agent efficiency rather than removing the contact.",
    pitfall:
      "Measuring deflection by case volume alone. If the article didn't answer the question the customer calls instead, volume moves channel and cost goes up while the dashboard looks green.",
  },
];
