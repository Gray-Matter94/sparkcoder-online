/**
 * Extra depth for /learn/irm-architect-interview-questions:
 *  - QUICK_ANSWERS: an on-page answer summary a reader (or an AI answer engine)
 *    can lift directly, matching the "what will they ask me" intent.
 *  - SCENARIO_QA: role-specific, architect-level scenario questions with a
 *    recommended answer, an alternate approach, and the pitfall interviewers
 *    listen for.
 */

export interface QuickAnswer {
  q: string;
  a: string;
}

export interface ScenarioQA {
  id: string;
  /** Which slice of the architect role this probes. */
  role: string;
  question: string;
  situation: string;
  answer: string[];
  alternate: string;
  pitfall: string;
}

export const QUICK_ANSWERS: QuickAnswer[] = [
  {
    q: "What does a ServiceNow IRM architect actually own?",
    a: "The GRC data model (profile types, profiles, entity hierarchy), the risk scoring framework, control and indicator design, and the integration contracts between IRM, CMDB, ITSM, and Vendor Risk. You own how risk is measured and evidenced — not the day-to-day assessments.",
  },
  {
    q: "Which tables should you be able to name from memory?",
    a: "sn_risk_risk, sn_risk_definition, sn_risk_criteria, sn_grc_profile, sn_grc_profile_type, sn_grc_policy, sn_compliance_control, sn_compliance_policy_statement, sn_grc_indicator, sn_grc_indicator_result, sn_grc_issue, sn_grc_remediation_task, sn_vdr_risk_asmt_assessment.",
  },
  {
    q: "How is residual risk calculated?",
    a: "Residual = inherent × (1 − aggregate control effectiveness), where inherent = likelihood × impact scored before controls. Aggregate effectiveness is averaged across mapped controls, never compounded.",
  },
  {
    q: "Profile vs. entity vs. entity type — what's the difference?",
    a: "An entity type (sn_grc_profile_type) defines what class of thing is assessed; a profile (sn_grc_profile) is one assessable instance pointing at a source record; entity filters populate profiles automatically from a table condition, so the population stays live.",
  },
  {
    q: "When do you use an indicator instead of an attestation?",
    a: "Use an indicator whenever the evidence already exists in a table and can be queried on a schedule — access reviews, change approvals, patch currency. Reserve attestations for judgement-based controls with no queryable source.",
  },
  {
    q: "How does IRM connect to CMDB?",
    a: "Through profiles built on cmdb_ci_service or a CI class, so risks inherit the service hierarchy and criticality. Business Service profiles let a single risk statement roll up across every supporting CI without duplicating risk records.",
  },
  {
    q: "What's the difference between a policy and a policy statement?",
    a: "The policy (sn_grc_policy) is the governing document; policy statements (sn_compliance_policy_statement) are the individually testable requirements inside it, and controls are created from statements against entities.",
  },
  {
    q: "How do you scope a phased IRM rollout?",
    a: "Phase 1 policy and compliance on one authority document, phase 2 risk management with a single scoring framework, phase 3 continuous monitoring indicators, phase 4 vendor and business continuity. Each phase must produce audit-usable evidence before the next starts.",
  },
  {
    q: "Which IRM work belongs in Flow Designer vs. script?",
    a: "Orchestration, approvals, task creation, and cross-module handoffs go in Flow Designer. Scripts are for indicator result computation, scoring overrides, and data transforms — anything that must return a value rather than route work.",
  },
  {
    q: "What KPIs prove the IRM program is working?",
    a: "Control test coverage and pass rate, indicator breach mean-time-to-remediate, percentage of risks with current assessments, issue aging, and the share of controls monitored continuously rather than attested.",
  },
];

export const SCENARIO_QA: ScenarioQA[] = [
  {
    id: "framework-design",
    role: "Scoring framework design",
    question:
      "The business wants a 1–5 risk matrix, internal audit wants a 1–10 monetary scale. How do you design the framework?",
    situation:
      "Two stakeholder groups score risk on incompatible scales, and both need to appear in the same executive heat map.",
    answer: [
      "Pick one canonical scale on the risk framework (sn_risk_framework) and store all scores in it — normalization at read time is what breaks reporting.",
      "Model the monetary view as impact criteria (sn_risk_criteria) with band definitions mapped onto the canonical 1–5 impact levels, so audit's dollar thresholds drive the score rather than living beside it.",
      "Expose the monetary figure as a separate read-only field for reporting; it is an attribute of the risk, not a second scoring dimension.",
      "Lock the matrix behind a change-controlled update set — rescoring history is unusable if the matrix silently changes.",
    ],
    alternate:
      "If the two groups genuinely assess different risk registers (operational vs. financial), run two frameworks and reconcile only at the entity-hierarchy roll-up. Defensible, but it doubles calibration effort and needs an explicit mapping table.",
    pitfall:
      "Letting each BU define its own likelihood labels. The heat map then aggregates numbers that mean different things, and the first audit finding is against your framework.",
  },
  {
    id: "entity-filters",
    role: "Data model & entity population",
    question:
      "Profiles are being created manually and drift from reality. How do you fix the entity layer?",
    situation:
      "5,000 CIs exist but only 300 profiles, many pointing at retired services.",
    answer: [
      "Replace manual creation with entity filters: a condition on the source table (for example cmdb_ci_service where operational_status = Operational) attached to the profile type.",
      "Let the scheduled entity-population job create and retire profiles, so profile lifecycle follows CI lifecycle automatically.",
      "Use the entity hierarchy (parent/child profile relationships) so a risk on a parent business service rolls down without duplicating risk records.",
      "Keep an exception list for profiles that must exist without a CI — vendors, processes — under their own profile type rather than loosening the filter.",
    ],
    alternate:
      "For a CMDB that is not yet trustworthy, populate profiles from the Application Service or Service Portfolio layer first — far fewer records, curated ownership — and expand to CI classes once CMDB health scores clear your threshold.",
    pitfall:
      "Filtering on a field that CMDB Discovery rewrites nightly. Profiles then churn, and every churn resets assessment history.",
  },
  {
    id: "control-inheritance",
    role: "Control architecture",
    question:
      "One SOX control applies to 40 applications. Do you create 40 controls?",
    situation:
      "The compliance team is copy-pasting controls per application and test evidence is fragmenting.",
    answer: [
      "Create one policy statement, then let control generation create one control per entity — 40 controls, but generated and governed from a single statement.",
      "Test the control once per entity where evidence is entity-specific; use a shared indicator with an entity-scoped query when the evidence is queryable.",
      "Map controls to the statement, never entity-to-entity, so a statement change re-flows to every generated control.",
      "Use control objectives to group the 40 into one reportable line for the audit committee.",
    ],
    alternate:
      "Where a control genuinely operates centrally (a single change-approval gate), attach it to a parent process profile and let entity inheritance cover the children. Fewer records and one test — but only defensible if the control truly executes once.",
    pitfall:
      "Answering 'one control, 40 entities' with no inheritance model. Interviewers are checking whether you know evidence has to be attributable per entity.",
  },
  {
    id: "indicator-performance",
    role: "Continuous monitoring at scale",
    question:
      "Your nightly indicators now take six hours and overlap the backup window. How do you tune them?",
    situation:
      "400 indicators, most written as GlideRecord loops with getRowCount().",
    answer: [
      "Convert counting indicators to GlideAggregate — a COUNT aggregate replaces a full row walk and is the single biggest win.",
      "Stagger indicator schedules by control family instead of running one blanket job, and set realistic frequencies: access reviews monthly, change controls weekly.",
      "Push entity-scoped indicators to an indicator template with a parameterized query so one compiled script serves many entities.",
      "Index the queried columns on the source table, and cap lookbacks with a bounded date window rather than an open-ended query.",
    ],
    alternate:
      "For very high-volume sources, compute the metric outside IRM (a scheduled job writing to a summary table, or an external data warehouse) and have the indicator read the pre-aggregated row. Fast and cheap, at the cost of an extra freshness dependency to document.",
    pitfall:
      "Leaving getRowCount() on an unindexed table and blaming the platform. Also: returning a value without assigning to the result variable, which records a silent zero.",
  },
  {
    id: "vendor-risk",
    role: "Third-party / vendor risk",
    question:
      "How do you architect vendor risk so tiering drives assessment depth?",
    situation:
      "1,200 suppliers, and the team is sending the same 200-question assessment to all of them.",
    answer: [
      "Model vendors as their own profile type sourced from core_company, with tier derived from data criticality, spend, and service dependency.",
      "Use assessment templates per tier — tier 1 gets the full questionnaire plus evidence requests, tier 3 gets an attestation-only short form.",
      "Trigger reassessment from events (contract renewal, breach notification, tier change) rather than a fixed annual cycle alone.",
      "Feed findings back as risks and issues against the vendor profile so they appear in the same register as internal risk.",
    ],
    alternate:
      "Where a third-party risk-exchange feed is available, import external ratings as an indicator on the vendor profile and reserve questionnaires for tier 1 and anomalies. Cuts effort sharply, but you must document the external methodology for auditors.",
    pitfall:
      "Tiering on spend alone. A low-spend vendor with production data access is a tier 1 risk, and that is exactly the follow-up question.",
  },
  {
    id: "audit-evidence",
    role: "Audit defensibility",
    question:
      "An external auditor asks you to prove a control was effective in Q2. What do you show them?",
    situation:
      "The control passed, but the auditor wants the trail, not the status field.",
    answer: [
      "Show the control test result record for the Q2 period with its attached evidence, tester, and date — the status field alone is never the answer.",
      "Show the indicator results for the period with the query definition version, proving what was actually measured.",
      "Show the audit history on the control and risk records for any mid-period scoring or ownership change.",
      "Show issue and remediation-task records for any breach, including closure evidence, to demonstrate the loop closed.",
    ],
    alternate:
      "Where the volume is large, produce a period report from the Audit Management module (engagement + audit tasks) that pre-binds the evidence, instead of walking records live. Cleaner for the auditor, but it needs the audit module implemented and maintained.",
    pitfall:
      "Allowing controls to be closed without evidence, or allowing evidence attachments to be deleted. Both make the whole period unauditable regardless of pass rate.",
  },
  {
    id: "acl-segregation",
    role: "Access & segregation of duties",
    question:
      "How do you stop a control owner from marking their own control effective?",
    situation:
      "GRC roles were granted broadly during rollout and now segregation of duties is a finding.",
    answer: [
      "Separate the roles: control owner maintains the control, an independent tester or approver records the test result.",
      "Enforce with an ACL on the test-result table plus a data policy preventing the tester field from equalling the owner.",
      "Use the delegated-development-free path: no scripted ACL where a role and a condition suffice — scripted ACLs on GRC tables are the hardest thing to audit later.",
      "Report the exceptions as an indicator so violations surface as issues rather than being blocked silently.",
    ],
    alternate:
      "Where headcount makes independent testing impossible, keep self-testing but require a compensating approval step in Flow Designer with the exception documented against the control. Honest and auditable; blocking outright would just push work off-platform.",
    pitfall:
      "Relying on UI policy to hide the field. Anything enforced only in the client is not a control, and the interviewer will ask about the REST API path.",
  },
  {
    id: "migration",
    role: "Legacy migration & upgrades",
    question:
      "You inherit an instance on the legacy sn_grc_risk table. How do you move to IRM Advanced?",
    situation:
      "Years of scoring history, custom fields, and reports built on the old table.",
    answer: [
      "Map the legacy model first: risk statements, entity references, scoring fields, and every custom field's real usage — a surprising share is dead.",
      "Stand up the new framework (sn_risk_definition, criteria, sn_risk_risk) in a sub-production instance and migrate a representative slice before committing.",
      "Migrate history as closed assessment records rather than rewriting current scores, so trend reporting survives without falsifying prior-period data.",
      "Rebuild reports against the new tables and retire the old ones deliberately — leaving both live guarantees two versions of the truth.",
    ],
    alternate:
      "For instances with thin history, cut over cleanly: freeze the legacy register read-only for audit reference and start the new register from the current assessment cycle. Fastest path, but you lose in-tool trend continuity.",
    pitfall:
      "Migrating scores without migrating the scoring framework they were produced under. The numbers then look comparable and are not.",
  },
  {
    id: "itsm-integration",
    role: "Cross-module integration",
    question:
      "How should GRC remediation interact with Change and Incident?",
    situation:
      "Remediation tasks are being duplicated as change requests by hand.",
    answer: [
      "Keep sn_grc_remediation_task as the system of record for the GRC obligation, and spawn change_request or incident from it via Flow Designer with a stored back-reference.",
      "Drive GRC task state from the linked record's closure, not the reverse — the operational record is where the work happens.",
      "Carry the control and profile references onto the change so the audit trail links the fix to the requirement.",
      "Never auto-close the GRC task on change closure without an evidence check; closure state and evidence are separate gates.",
    ],
    alternate:
      "If the change process is heavy and remediation is mostly configuration, keep remediation entirely in GRC tasks and reference changes only where a CI is touched. Less overhead, but you must be able to explain the boundary to audit.",
    pitfall:
      "Two-way state sync between GRC tasks and change requests. It loops, and it hides which record is authoritative.",
  },
  {
    id: "risk-appetite",
    role: "Executive reporting",
    question:
      "The CRO says the heat map is green but they don't believe it. How do you diagnose it?",
    situation:
      "Aggregate residual risk looks healthy while incidents keep occurring.",
    answer: [
      "Check assessment currency first: green driven by stale assessments is the most common cause, so report percentage of risks assessed within the cycle alongside the score.",
      "Check control effectiveness sourcing — effectiveness asserted by attestation with no test result inflates every residual downstream.",
      "Check entity coverage: risks scored only on the assessed 300 profiles while 5,000 entities exist means the map is green by omission.",
      "Add a data-quality indicator on the register itself so the program monitors its own inputs.",
    ],
    alternate:
      "Present a dual view — residual risk next to a confidence score derived from assessment age, evidence quality, and coverage. It reframes the conversation honestly, though it needs executive buy-in to introduce a second number.",
    pitfall:
      "Defending the number instead of the inputs. Senior interviewers are testing whether you treat a risk score as evidence or as output of a data pipeline you own.",
  },
];
