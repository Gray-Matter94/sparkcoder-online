import type { ExamQuestion } from "./csa-mock-exam";

const q = (
  id: string,
  domain: string,
  question: string,
  options: string[],
  correctIndex: number,
  explain: string,
): ExamQuestion => ({ id, domain, question, options, correctIndex, explain });

const F = "Foundation";
const T = "Design & Technical";
const B = "Build & Business";
const S = "Sell / Consume";
const M = "Manage & Governance";
const C = "CMDB Relationship & Adoption";

export const CSDM_EXAM_POOL: ExamQuestion[] = [
  q("csdm-1", C, "What is CSDM?", ["A prescriptive data model for how to populate the CMDB and related tables", "A replacement database for the CMDB", "A Discovery probe", "A reporting plugin"], 0, "CSDM (Common Service Data Model) is ServiceNow's prescriptive guidance for structuring service-related data across the CMDB and related tables."),
  q("csdm-2", C, "How does CSDM relate to the CMDB?", ["It replaces the CMDB", "It defines which classes and relationships to use inside the CMDB", "It only applies to HR data", "It is unrelated"], 1, "CSDM sits on top of the CMDB: it standardises classes, relationships and naming rather than replacing the CMDB."),
  q("csdm-3", F, "Which data belongs to the Foundation domain?", ["Locations, groups, users, companies, departments", "Business applications", "Service offerings", "Application services"], 0, "Foundation holds reference data used everywhere: users, groups, locations, companies, departments, contracts, product models."),
  q("csdm-4", F, "Why should Foundation data be clean before other domains?", ["Every other domain references it", "It speeds up Discovery probes", "It is required for licensing", "It controls UI themes"], 0, "Ownership, support groups and locations in every other domain point to Foundation records."),
  q("csdm-5", F, "Which Foundation table stores product models?", ["cmdb_model", "cmdb_ci_service", "sys_user_group", "alm_asset"], 0, "Product models live in cmdb_model and its extensions; they link CIs and assets to a model definition."),
  q("csdm-6", T, "What is an Application Service?", ["A deployed instance of an application, e.g. 'Payroll – Production'", "A catalog item", "A business capability", "A user group"], 0, "An Application Service represents a running deployment of an application stack in a specific environment."),
  q("csdm-7", T, "Which table holds Application Services?", ["cmdb_ci_service_auto (and its extensions)", "cmdb_ci_business_app", "service_offering", "cmdb_ci_computer"], 0, "Application Services are stored in cmdb_ci_service_auto and its children such as discovered or calculated services."),
  q("csdm-8", B, "What does a Business Application represent?", ["Software the business uses, independent of deployment", "A physical server", "A support contract", "A subscription"], 0, "A Business Application (cmdb_ci_business_app) is the logical application in the portfolio; Application Services are its deployments."),
  q("csdm-9", B, "How is a Business Application related to its Application Services?", ["Consumes::Consumed by", "Runs on::Runs", "Depends on::Used by", "Contains::Contained by"], 0, "CSDM uses Consumes::Consumed by from the Business Application to each Application Service."),
  q("csdm-10", B, "What does a Business Capability describe?", ["What the business does, e.g. 'Manage payroll'", "A server cluster", "A support group", "A Discovery schedule"], 0, "Business capabilities model what the organisation does, independent of how it is delivered."),
  q("csdm-11", S, "What is a Business Service?", ["A service exposed to business users or customers", "A server process", "An integration endpoint", "An update set"], 0, "Business Services (service_portfolio-based) represent services the business consumes, like 'Email'."),
  q("csdm-12", S, "What is a Service Offering?", ["A variation of a service with its own commitments, such as 'Email – Gold'", "A catalog variable", "A CI class", "A report"], 0, "Offerings split a service by level, audience or location and carry SLAs and subscribers."),
  q("csdm-13", S, "Which record should an incident's 'Service offering' field point to?", ["The Business or Technical Service Offering the user consumes", "The server", "The Business Application", "The user's department"], 0, "Linking tasks to offerings ties impact, SLAs and routing to the consumed service."),
  q("csdm-14", S, "What is a Technical Service?", ["A service delivered by IT to IT, such as 'Database hosting'", "A customer-facing service", "A business capability", "A product model"], 0, "Technical Services are IT-facing services consumed by Application Services or other IT teams."),
  q("csdm-15", S, "How are Service Offerings linked to Application Services?", ["Depends on::Used by from offering to application service", "Owns::Owned by", "Hosts::Hosted on", "Not linked"], 0, "Offerings depend on the Application Services that deliver them, enabling service impact."),
  q("csdm-16", M, "Which CSDM stage is commonly recommended to start with?", ["Foundation, then Crawl", "Fly", "Sell/Consume only", "Manage only"], 0, "CSDM adoption follows Foundation → Crawl → Walk → Run → Fly."),
  q("csdm-17", M, "What does the 'Crawl' stage typically include?", ["Business applications, application services, business services and offerings", "Only Discovery", "Only CMDB Health", "Agile portfolios"], 0, "Crawl introduces the core service objects needed to link tasks to services."),
  q("csdm-18", M, "Which field identifies who supports an Application Service?", ["Support group", "Caller", "Watch list", "Opened by"], 0, "Support group drives assignment; Managed by group and Owned by define accountability."),
  q("csdm-19", M, "What dashboard helps measure CSDM conformance?", ["CSDM Data Foundations dashboard", "Performance Analytics Home", "Flow Designer Executions", "Update Set Preview"], 0, "The CSDM Data Foundations dashboard reports gaps such as orphaned services or missing owners."),
  q("csdm-20", C, "Which tool populates infrastructure CIs that Application Services run on?", ["Discovery and Service Mapping", "Knowledge base", "Service Catalog", "Virtual Agent"], 0, "Discovery finds infrastructure; Service Mapping or tag-based mapping builds Application Service topology."),
  q("csdm-21", C, "Why avoid creating custom CI classes for services?", ["CSDM-provided classes keep upgrades, reporting and products working", "Custom classes are illegal", "They cannot store data", "They break ACLs"], 0, "Using the prescribed classes means ITSM, ITOM and SPM features recognise your data."),
  q("csdm-22", C, "Which component ensures CIs from many sources do not duplicate?", ["Identification and Reconciliation Engine (IRE)", "Transform scripts only", "UI Policies", "Client scripts"], 0, "The IRE applies identification rules and reconciliation precedence to every CI write."),
  q("csdm-23", T, "What is a Dynamic CI Group used for?", ["Grouping CIs by query, e.g. for technical service offerings", "Scheduling jobs", "Managing users", "Sending emails"], 0, "Dynamic CI Groups (cmdb_ci_query_based_service) build CI sets from queries and are often linked to technical offerings."),
  q("csdm-24", T, "Which environment value distinguishes Application Service deployments?", ["Environment field (e.g. Production, Test)", "Category", "Priority", "State"], 0, "Separate Application Services per environment, using the Environment attribute."),
  q("csdm-25", B, "Which domain is mainly owned by Enterprise Architecture / APM?", ["Design / Business (business applications, capabilities)", "Foundation only", "Sell/Consume only", "None"], 0, "Business Applications and Capabilities are portfolio data managed by EA and APM."),
  q("csdm-26", S, "What is a Service Portfolio used for?", ["Grouping services for lifecycle and reporting", "Holding Discovery credentials", "Storing attachments", "Defining ACLs"], 0, "Portfolios organise business and technical services for planning and reporting."),
  q("csdm-27", M, "What is a common anti-pattern in CSDM migrations?", ["Using Business Services for everything instead of offerings and application services", "Using Foundation data", "Assigning support groups", "Running Discovery"], 0, "Overloading one class flattens the model; CSDM separates consumption from delivery."),
  q("csdm-28", F, "Which record type links to a vendor and an expiry date and lives in Foundation?", ["Contract", "Application Service", "Service Offering", "Business Capability"], 0, "Contracts are Foundation data referenced across asset and service domains."),
  q("csdm-29", S, "What does subscribing a group to a Service Offering enable?", ["Targeted outage communication and service visibility for those users", "Admin rights", "Discovery access", "Update set commits"], 0, "Subscriptions define who consumes an offering, used for notifications and portal views."),
  q("csdm-30", C, "When migrating legacy cmdb_ci_service records, what is the best first step?", ["Classify each one as business service, application service or technical service", "Delete them all", "Rename the table", "Disable the IRE"], 0, "Classify legacy services, then move them to the right CSDM class in phases."),
];

export const CSDM_EXAM_LENGTH = CSDM_EXAM_POOL.length;
export const CSDM_EXAM_MINUTES = 45;
export const CSDM_PASS_PERCENT = 70;

export function drawCsdmExam(): ExamQuestion[] {
  const pool = [...CSDM_EXAM_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CSDM_EXAM_LENGTH);
}
