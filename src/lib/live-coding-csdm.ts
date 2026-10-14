// ServiceNow CSDM live-coding path.
// Stages follow the CSDM domains (Foundation → Design & Planning → Build &
// Integration → Service Delivery → Service Consumption) and finish with a
// phased migration stage (Crawl → Walk → Run → Fly). Each stage is a template
// expanded over 20 realistic variants, validated by line-mapped checks.
import type { LiveCodingQuestion } from "./live-coding-questions";

export interface CsdmStage {
  id: number;
  name: string;
  blurb: string;
}

export const CSDM_STAGES: CsdmStage[] = [
  { id: 1, name: "Foundation domain", blurb: "Locations, departments, companies and groups every other domain references." },
  { id: 2, name: "Design & Planning", blurb: "Business applications and their owners in the application portfolio." },
  { id: 3, name: "Build & Integration", blurb: "Link SDLC components to the business application they build." },
  { id: 4, name: "Service Delivery (technical)", blurb: "Technical services, offerings and application services over CIs." },
  { id: 5, name: "Service Consumption (sell/consume)", blurb: "Business services and offerings that users actually subscribe to." },
  { id: 6, name: "Phased migration", blurb: "Crawl → Walk → Run → Fly: audit gaps and backfill CSDM relationships." },
];

type CsdmQ = Omit<LiveCodingQuestion, "id"> & { stage: number };

const APPS = ["Payroll", "Expense", "CRM", "HR Portal", "Learning", "Billing", "Procurement", "Inventory", "Ticketing", "Analytics", "Mobile Banking", "Claims", "Recruiting", "Contracts", "Fleet", "Timesheet", "Supplier Portal", "Knowledge", "Travel", "Facilities Booking"];
const LOCATIONS = ["London", "New York", "Bangalore", "Sydney", "Berlin", "Toronto", "Singapore", "Paris", "Dublin", "Tokyo", "Chicago", "Madrid", "Hyderabad", "Austin", "Zurich", "Dubai", "Sao Paulo", "Warsaw", "Seattle", "Manila"];
const TECH = ["Email", "Database Hosting", "Kubernetes", "Network", "Storage", "Identity", "Backup", "Monitoring", "Load Balancing", "VPN", "Messaging", "File Share", "Web Hosting", "DNS", "Logging", "API Gateway", "Patching", "Printing", "Telephony", "Virtual Desktop"];
const BIZ = ["Pay Employees", "Submit Expenses", "Manage Customers", "Onboard Staff", "Train Employees", "Bill Clients", "Buy Goods", "Track Stock", "Get IT Help", "Report Insights", "Bank on Mobile", "File Claims", "Hire Talent", "Sign Contracts", "Manage Vehicles", "Log Time", "Work with Suppliers", "Find Answers", "Book Travel", "Book Rooms"];
const ENVS = ["Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production", "Production"];

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const templates: ((i: number) => CsdmQ)[] = [
  // Stage 1 — Foundation
  (i) => {
    const l = LOCATIONS[i];
    return {
      stage: 1, side: "server", scriptType: "Fix Script (CSDM)",
      filename: `fix_foundation_location_${slug(l)}.js`,
      title: `Create the ${l} location once (Foundation)`,
      task: `Foundation data comes first. Create a cmn_location named '${l}' only if it doesn't already exist, then log its sys_id.`,
      starter: `// Foundation: ensure cmn_location '${l}' exists\n`,
      solution: `var loc = new GlideRecord('cmn_location');\nloc.addQuery('name', '${l}');\nloc.query();\nif (!loc.hasNext()) {\n  loc.initialize();\n  loc.setValue('name', '${l}');\n  loc.insert();\n} else {\n  loc.next();\n}\ngs.info('Location: ' + loc.getUniqueValue());`,
      checks: [
        { needle: `new GlideRecord('cmn_location')`, message: `Locations are Foundation data on cmn_location.` },
        { needle: `addQuery('name', '${l}')`, message: `Look for an existing record first: addQuery('name', '${l}').` },
        { needle: `hasNext()`, message: `Avoid duplicates — check hasNext() before inserting.` },
        { needle: `setValue('name', '${l}')`, message: `Set the name with setValue('name', '${l}').` },
        { needle: `.insert()`, message: `Create it with insert().` },
      ],
    };
  },
  // Stage 2 — Design & Planning
  (i) => {
    const a = APPS[i];
    return {
      stage: 2, side: "server", scriptType: "Fix Script (CSDM)",
      filename: `fix_business_app_${slug(a)}.js`,
      title: `Register ${a} as a business application`,
      task: `In Design & Planning, create a cmdb_ci_business_app named '${a}' with an IT application owner (user 'abel.tuter'), only if it doesn't exist yet.`,
      starter: `// Design & Planning: register business application '${a}'\n`,
      solution: `var owner = new GlideRecord('sys_user');\nowner.get('user_name', 'abel.tuter');\nvar app = new GlideRecord('cmdb_ci_business_app');\napp.addQuery('name', '${a}');\napp.query();\nif (!app.hasNext()) {\n  app.initialize();\n  app.setValue('name', '${a}');\n  app.setValue('it_application_owner', owner.getUniqueValue());\n  app.insert();\n}`,
      checks: [
        { needle: `get('user_name', 'abel.tuter')`, message: `Resolve the owner by user_name first.` },
        { needle: `new GlideRecord('cmdb_ci_business_app')`, message: `Business applications live on cmdb_ci_business_app.` },
        { needle: `hasNext()`, message: `Check for an existing app with hasNext().` },
        { needle: `setValue('it_application_owner', owner.getUniqueValue()`, message: `Every business app needs an owner: setValue('it_application_owner', owner.getUniqueValue()).` },
        { needle: `.insert()`, message: `Create the record with insert().` },
      ],
    };
  },
  // Stage 3 — Build & Integration
  (i) => {
    const a = APPS[i];
    return {
      stage: 3, side: "server", scriptType: "Fix Script (CSDM)",
      filename: `fix_sdlc_component_${slug(a)}.js`,
      title: `Link the ${a} SDLC component to its business app`,
      task: `Create a cmdb_ci_sdlc_component named '${a} Codebase' and relate it to the '${a}' business application with a cmdb_rel_ci row (parent = component, child = app).`,
      starter: `// Build & Integration: relate SDLC component to '${a}'\n`,
      solution: `var app = new GlideRecord('cmdb_ci_business_app');\napp.get('name', '${a}');\nvar comp = new GlideRecord('cmdb_ci_sdlc_component');\ncomp.initialize();\ncomp.setValue('name', '${a} Codebase');\nvar compId = comp.insert();\nvar rel = new GlideRecord('cmdb_rel_ci');\nrel.initialize();\nrel.setValue('parent', compId);\nrel.setValue('child', app.getUniqueValue());\nrel.insert();`,
      checks: [
        { needle: `get('name', '${a}')`, message: `Find the business application by name first.` },
        { needle: `new GlideRecord('cmdb_ci_sdlc_component')`, message: `Build artefacts are cmdb_ci_sdlc_component records.` },
        { needle: `new GlideRecord('cmdb_rel_ci')`, message: `CSDM relationships are rows on cmdb_rel_ci.` },
        { needle: `setValue('parent', compId)`, message: `The component is the parent: setValue('parent', compId).` },
        { needle: `setValue('child', app.getUniqueValue()`, message: `The business app is the child: setValue('child', app.getUniqueValue()).` },
      ],
    };
  },
  // Stage 4 — Service Delivery (technical)
  (i) => {
    const t = TECH[i];
    return {
      stage: 4, side: "server", scriptType: "Fix Script (CSDM)",
      filename: `fix_tech_offering_${slug(t)}.js`,
      title: `Create a ${t} technical service offering`,
      task: `Find the technical service '${t}' (cmdb_ci_service_technical) and create a service_offering '${t} - ${ENVS[i]}' whose parent is that service.`,
      starter: `// Service Delivery: offering under technical service '${t}'\n`,
      solution: `var svc = new GlideRecord('cmdb_ci_service_technical');\nif (svc.get('name', '${t}')) {\n  var off = new GlideRecord('service_offering');\n  off.initialize();\n  off.setValue('name', '${t} - ${ENVS[i]}');\n  off.setValue('parent', svc.getUniqueValue());\n  off.insert();\n}`,
      checks: [
        { needle: `new GlideRecord('cmdb_ci_service_technical')`, message: `Technical services live on cmdb_ci_service_technical.` },
        { needle: `get('name', '${t}')`, message: `Look the service up by name: get('name', '${t}').` },
        { needle: `new GlideRecord('service_offering')`, message: `Offerings are service_offering records.` },
        { needle: `setValue('parent', svc.getUniqueValue()`, message: `An offering's parent is its service: setValue('parent', svc.getUniqueValue()).` },
        { needle: `.insert()`, message: `Create the offering with insert().` },
      ],
    };
  },
  // Stage 5 — Service Consumption
  (i) => {
    const b = BIZ[i];
    return {
      stage: 5, side: "server", scriptType: "Background Script (CSDM)",
      filename: `bg_business_offering_${slug(b)}.js`,
      title: `Count offerings for business service "${b}"`,
      task: `Users consume business service offerings. For the business service '${b}' (cmdb_ci_service_business), count its active service_offering records and warn if there are none.`,
      starter: `// Service Consumption: check offerings for '${b}'\n`,
      solution: `var biz = new GlideRecord('cmdb_ci_service_business');\nbiz.get('name', '${b}');\nvar off = new GlideRecord('service_offering');\noff.addActiveQuery();\noff.addQuery('parent', biz.getUniqueValue());\noff.query();\nvar n = off.getRowCount();\nif (n == 0) {\n  gs.warn('${b} has no offerings');\n}\ngs.info('Offerings: ' + n);`,
      checks: [
        { needle: `new GlideRecord('cmdb_ci_service_business')`, message: `Business services live on cmdb_ci_service_business.` },
        { needle: `get('name', '${b}')`, message: `Find the service by name: get('name', '${b}').` },
        { needle: `addActiveQuery()`, message: `Only count active offerings: addActiveQuery().` },
        { needle: `addQuery('parent', biz.getUniqueValue()`, message: `Filter offerings by parent: addQuery('parent', biz.getUniqueValue()).` },
        { needle: `getRowCount()`, message: `Read the total with getRowCount().` },
        { needle: `gs.warn(`, message: `Flag the gap with gs.warn(...).` },
      ],
    };
  },
  // Stage 6 — Phased migration
  (i) => {
    const a = APPS[i];
    return {
      stage: 6, side: "server", scriptType: "Fix Script (CSDM migration)",
      filename: `fix_crawl_owner_gap_${slug(a)}.js`,
      title: `Crawl phase: backfill ownerless apps like ${a}`,
      task: `Crawl phase: find business applications matching '${a}' with no IT application owner, set 'abel.tuter' as owner without triggering business rules, and log how many you fixed.`,
      starter: `// Phased migration (Crawl): backfill owners for '${a}'\n`,
      solution: `var owner = new GlideRecord('sys_user');\nowner.get('user_name', 'abel.tuter');\nvar count = 0;\nvar app = new GlideRecord('cmdb_ci_business_app');\napp.addQuery('name', 'CONTAINS', '${a}');\napp.addNullQuery('it_application_owner');\napp.query();\nwhile (app.next()) {\n  app.setWorkflow(false);\n  app.setValue('it_application_owner', owner.getUniqueValue());\n  app.update();\n  count++;\n}\ngs.info('Backfilled ' + count);`,
      checks: [
        { needle: `new GlideRecord('cmdb_ci_business_app')`, message: `Start from cmdb_ci_business_app.` },
        { needle: `addQuery('name', 'CONTAINS', '${a}')`, message: `Match the app family: addQuery('name', 'CONTAINS', '${a}').` },
        { needle: `addNullQuery('it_application_owner')`, message: `The gap is a missing owner: addNullQuery('it_application_owner').` },
        { needle: `setWorkflow(false)`, message: `Bulk migrations should skip business rules: setWorkflow(false).` },
        { needle: `app.update()`, message: `Save each fix with app.update().` },
      ],
    };
  },
];

const VARIANTS = 20;

/** CSDM path tasks, ordered stage 1 → 6. */
export function buildCsdmTasks(normalize: (s: string) => string): LiveCodingQuestion[] {
  const out: LiveCodingQuestion[] = [];
  templates.forEach((tpl, tIdx) => {
    for (let i = 0; i < VARIANTS; i++) {
      const q = tpl(i);
      out.push({
        ...q,
        path: "csdm",
        id: `csdm-${tIdx + 1}-${i + 1}`,
        checks: q.checks.map((c) => ({ ...c, needle: normalize(c.needle) })),
      });
    }
  });
  return out;
}
