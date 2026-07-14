// Discovery Interview hub — 14 sub-modules, curated seed Q&A per section.
// The "Generate more" button on each section page calls the AI to expand
// the list on-demand via src/lib/discovery-questions.functions.ts.

export interface DefinitiveQA {
  id: string;
  question: string;
  answer: string;
  alternate?: string;
}

export interface ScenarioQA {
  id: string;
  title: string;
  scenario: string;
  approach: string[];
  code?: string;
  alternate: string;
  pitfall: string;
}

export interface DiscoverySection {
  slug: string;
  title: string;
  shortTitle: string;
  blurb: string;
  scope: string; // used as AI system-prompt scope
  definitive: DefinitiveQA[];
  scenario: ScenarioQA[];
}

// ---- small helpers to keep seed data terse -------------------------------

const d = (id: string, q: string, a: string, alternate?: string): DefinitiveQA => ({
  id,
  question: q,
  answer: a,
  alternate,
});

const s = (
  id: string,
  title: string,
  scenario: string,
  approach: string[],
  code: string,
  alternate: string,
  pitfall: string,
): ScenarioQA => ({ id, title, scenario, approach, code, alternate, pitfall });

// ---- sections -----------------------------------------------------------

export const DISCOVERY_SECTIONS: DiscoverySection[] = [
  {
    slug: "cmdb",
    shortTitle: "CMDB",
    title: "CMDB — core concepts, tables, governance",
    blurb:
      "How the Configuration Management Database is structured, extended, and governed.",
    scope:
      "ServiceNow CMDB fundamentals: cmdb_ci base table, class hierarchy, extensions, attributes, dictionary, ACLs, delegated administration, CMDB Data Manager, CI Class Manager, and general CMDB governance.",
    definitive: [
      d(
        "cmdb-1",
        "What is the CMDB in ServiceNow?",
        "A federated database of Configuration Items (CIs) and their relationships, rooted at cmdb_ci. Every CI class extends cmdb_ci, inheriting its columns and behavior.",
        "You can also describe it as the 'system of record for infrastructure and service context' that ITSM, Discovery, Service Mapping, and Event Management all read from.",
      ),
      d(
        "cmdb-2",
        "What is the parent table of every CI class?",
        "cmdb_ci. All CI classes (server, database, application, business service, etc.) extend it, so a query against cmdb_ci returns every CI regardless of class.",
      ),
      d(
        "cmdb-3",
        "What is the CI Class Manager?",
        "A modeling UI that lets admins view, extend, and edit CI classes, attributes, identification rules, and reconciliation rules without writing SQL — the canonical place to manage class-level configuration.",
      ),
      d(
        "cmdb-4",
        "What is CMDB Data Manager?",
        "A governance app for scheduled CI lifecycle actions (retire, delete, orphan cleanup) driven by policies, not one-off scripts.",
      ),
    ],
    scenario: [
      s(
        "cmdb-s1",
        "Extending a CI class without breaking upgrades",
        "You need to add a 'lease_expiry' field on Windows servers. Do you extend cmdb_ci_win_server or create a custom table?",
        [
          "Add columns to the existing OOB class via CI Class Manager; this preserves identification rules and inheritance.",
          "Never create a parallel u_windows_server table — you'd lose OOB identification, reconciliation, and Discovery mapping.",
          "Prefix custom columns with u_ so upgrades don't clash.",
        ],
        `// Add column via sys_dictionary (or CI Class Manager UI)
column.name = 'u_lease_expiry';
column.table = 'cmdb_ci_win_server';
column.type = 'glide_date';`,
        "Alternate: create a scoped application table that references the OOB CI (cmdb_ci_win_server) via a reference field — good when the data is app-specific rather than a CI property.",
        "Extending too deep in the tree forces every subclass to inherit the column. Extend at the lowest class that needs it.",
      ),
    ],
  },
  {
    slug: "discovery",
    shortTitle: "Discovery",
    title: "Discovery — probes, sensors, schedules, patterns",
    blurb: "How ServiceNow Discovery finds infrastructure and populates the CMDB.",
    scope:
      "ServiceNow Discovery: probes, sensors, patterns, Discovery schedules, IP ranges, credential-less discovery, Discovery status, ECC queue, credential affinity, phases (shazzam, classification, identification, exploration).",
    definitive: [
      d(
        "disc-1",
        "What are the four phases of Discovery?",
        "Shazzam (port scan), Classification (identify device type), Identification (match/create CI), Exploration (deep attribute + relationship collection).",
      ),
      d(
        "disc-2",
        "Probe vs Pattern — what's the difference?",
        "Probes are legacy JavaScript-driven data collectors. Patterns (Neebula) are declarative, versioned, and preferred — they run inside the MID Server and are easier to customize per class.",
        "Alternate: some horizontal scans still use probes for niche devices; patterns are the go-forward standard.",
      ),
      d(
        "disc-3",
        "What is the ECC Queue?",
        "ecc_queue — the async bus between the instance and MID Servers. Outputs are 'output' records; MID responses are 'input' records processed by sensors.",
      ),
      d(
        "disc-4",
        "What is credential-less discovery?",
        "A mode that fingerprints devices from open-port banners and SNMP without OS credentials — good for switches/routers and network sweep, limited on servers.",
      ),
    ],
    scenario: [
      s(
        "disc-s1",
        "Discovery skips half the servers in a subnet",
        "Discovery completes but only 40% of the /24 shows up as CIs. Where do you look first?",
        [
          "Check Shazzam results — if ports 22/135/445 didn't answer, the host wasn't reachable from that MID Server.",
          "Check credential affinity: the MID may not have credentials that succeed on the missing hosts.",
          "Confirm no ACL or firewall rule between MID and the target subnet.",
        ],
        `gs.info('Shazzam success: ' + gs.getProperty('discovery.shazzam.count'));
new GlideRecord('discovery_status').addQuery('number','DIS0012345');`,
        "Alternate: run a targeted 'quick discovery' from the MID Server against one missing IP to isolate whether it's network reachability or credentials.",
        "Blaming credentials when the real problem is firewall/ACL. Always verify Shazzam response first.",
      ),
    ],
  },
  {
    slug: "mid-servers",
    shortTitle: "MID Servers",
    title: "MID Servers — architecture, sizing, security",
    blurb: "The Java-based agent that brokers Discovery and integrations.",
    scope:
      "ServiceNow MID Server: installation, clustering, credential vault, mid_server table, capabilities, IP ranges, MID selection, upgrades, mutual TLS, external credential storage (CyberArk/Hashicorp), MID server load, ECC agent state.",
    definitive: [
      d(
        "mid-1",
        "What is a MID Server?",
        "A Java process installed inside the customer network that connects outbound to the ServiceNow instance and executes probes, patterns, and integrations locally.",
      ),
      d(
        "mid-2",
        "How do MID Servers authenticate to the instance?",
        "They authenticate as a dedicated instance user (usually 'mid.server.<name>') over HTTPS with basic auth or mutual TLS. Credentials are stored encrypted in the MID's config.xml keystore.",
      ),
      d(
        "mid-3",
        "What is MID Server clustering?",
        "Multiple MID Servers grouped into a cluster share load and provide failover for a network zone. Selection is by capability + IP range affinity, then round-robin within the cluster.",
      ),
      d(
        "mid-4",
        "Where should credentials be stored?",
        "Prefer an external vault (CyberArk, Hashicorp, Azure Key Vault) via the Credential Resolver. MID pulls at runtime; secrets never persist on disk.",
      ),
    ],
    scenario: [
      s(
        "mid-s1",
        "Sizing MID Servers for a global rollout",
        "5 datacenters, 30k CIs, 2 AWS VPCs. How many MID Servers and where?",
        [
          "One cluster per network zone (each DC + each VPC) — never span firewalls.",
          "Rule of thumb: 1 MID per ~5k CIs per Discovery cycle. Add a second for HA per zone.",
          "Sync credentials via one external vault; MIDs authenticate to the vault, not to a local keystore.",
        ],
        `// mid_server capability rows
mid.capabilities = ['Discovery','ServiceMapping'];
mid.ip_ranges    = ['10.42.0.0/16'];`,
        "Alternate: use a small 'utility' MID cluster dedicated to integrations (REST/JDBC) separate from Discovery MIDs so long-running jobs don't starve probes.",
        "Sharing one MID cluster across firewall zones — probes silently drop and CI counts look correct in dev.",
      ),
    ],
  },
  {
    slug: "ire",
    shortTitle: "IRE",
    title: "IRE — Identification & Reconciliation Engine",
    blurb: "The single entry point for every CI write.",
    scope:
      "Identification and Reconciliation Engine: identification rules, criteria priority, reconciliation rules, data source precedence, dependent identification, CI de-duplication, cmdb_ire_data_source_rule, payload API, cmdbTransformAPI.",
    definitive: [
      d(
        "ire-1",
        "What problem does IRE solve?",
        "It centralizes CI matching and write arbitration so Discovery, Service Mapping, and integrations can't create duplicate CIs or overwrite each other's authoritative attributes.",
      ),
      d(
        "ire-2",
        "What is an identification rule?",
        "A prioritized list of criteria (serial → MAC → name+IP → name) that IRE evaluates in order to match an incoming payload to an existing CI.",
      ),
      d(
        "ire-3",
        "What is a reconciliation rule?",
        "A declaration that a specific data source owns a specific attribute on a specific class — writes from lower-precedence sources are silently dropped for that field.",
      ),
      d(
        "ire-4",
        "What is dependent identification?",
        "IRE using a parent CI's identity to disambiguate a child (e.g. a database instance identified by name + parent server), preventing false matches across hosts.",
      ),
    ],
    scenario: [
      s(
        "ire-s1",
        "Integration silently drops updates",
        "A REST-based CMDB feed reports it succeeded but the CI 'environment' field never changes. What's happening?",
        [
          "IRE has a reconciliation rule granting a different data source ownership of that attribute.",
          "The integration write is accepted, then IRE drops the field per the ownership rule.",
          "Fix by either changing the data source name on the integration or updating the reconciliation rule precedence.",
        ],
        `// Inspect via cmdbTransformAPI response
{ result: { status: 'SUCCESS', items: [{ attributes: { environment: 'IGNORED' } }] } }`,
        "Alternate: call the identifyCI script include directly with a test payload in a background script to see exactly which rule dropped the field.",
        "Assuming HTTP 200 means the field wrote. Always inspect the IRE response payload.",
      ),
    ],
  },
  {
    slug: "cis",
    shortTitle: "CIs",
    title: "Configuration Items — modeling and attributes",
    blurb: "What a CI is, what attributes matter, and how CIs are keyed.",
    scope:
      "Configuration Items: sys_id, name, correlation_id, install_status, operational_status, environment, discovery_source, first_discovered, last_discovered, sys_class_name, name uniqueness, CI naming conventions.",
    definitive: [
      d(
        "ci-1",
        "What's the difference between install_status and operational_status?",
        "install_status is lifecycle (installed / in stock / retired). operational_status is runtime health (operational / non-operational / repair-in-progress). ITSM impact usually keys off operational_status.",
      ),
      d(
        "ci-2",
        "What is correlation_id used for?",
        "A stable external identifier (e.g. AWS ARN, VMware moref) written by the integration that discovered it. IRE uses it as a strong match key.",
      ),
      d(
        "ci-3",
        "What is discovery_source?",
        "The name of the source that wrote or last updated the CI (e.g. 'ServiceNow', 'SCCM', 'AWS Config'). Used by reconciliation rules to arbitrate writes.",
      ),
      d(
        "ci-4",
        "Can two CIs share the same name?",
        "Yes — name isn't unique. Uniqueness comes from identification rule criteria (serial, MAC, correlation_id + parent, etc.), not from the name field alone.",
      ),
    ],
    scenario: [
      s(
        "ci-s1",
        "Retiring a CI without breaking history",
        "A physical server is decommissioned. How do you retire the CI while preserving incident/change history?",
        [
          "Set install_status = 'Retired' and operational_status = 'Non-Operational'. Do NOT delete the record.",
          "CMDB Data Manager can run this as a scheduled policy (e.g. retire after 90 days of no discovery).",
          "History (audits, related tickets, relationships) is preserved for compliance and RCA.",
        ],
        `ci.install_status = 7; // Retired
ci.operational_status = 2;`,
        "Alternate: soft-delete via 'end-of-life' relationship to a replacement CI so dependencies visually redirect on service maps.",
        "Deleting CIs breaks incident/change relationships and audit trails. Retire, don't delete.",
      ),
    ],
  },
  {
    slug: "ci-classes-tables",
    shortTitle: "CI Classes & Tables",
    title: "CI Classes & Tables — hierarchy and inheritance",
    blurb: "How class hierarchy, table extension, and table-per-hierarchy work.",
    scope:
      "CI class hierarchy: cmdb_ci → cmdb_ci_computer → cmdb_ci_server → cmdb_ci_linux_server, table-per-hierarchy storage, sys_class_name, class-level ACLs, CI Class Manager, common classes (cmdb_ci_appl, cmdb_ci_business_app, cmdb_ci_service_technical).",
    definitive: [
      d(
        "cls-1",
        "How is CI data stored physically?",
        "Table-per-hierarchy: every CI row lives in the base cmdb_ci table plus its class-specific extension tables. sys_class_name identifies the concrete class.",
      ),
      d(
        "cls-2",
        "What is sys_class_name?",
        "A column on every extended table that stores the concrete class of the row, so a base-table query can return polymorphic results with the right subclass attributes.",
      ),
      d(
        "cls-3",
        "Difference between cmdb_ci_appl and cmdb_ci_business_app?",
        "cmdb_ci_appl is a runnable software instance (e.g. Tomcat process). cmdb_ci_business_app is the business-level app (e.g. 'Payroll') that consumers know by name.",
      ),
      d(
        "cls-4",
        "When should you create a new CI class?",
        "When a class of CI has distinct attributes AND distinct identification rules. If it only has extra fields, extend an existing class instead.",
      ),
    ],
    scenario: [
      s(
        "cls-s1",
        "Choosing where to add a container platform",
        "You need to model Kubernetes clusters, nodes, and pods. Where in the tree?",
        [
          "Use OOB Container CI classes (cmdb_ci_kubernetes_cluster, cmdb_ci_kubernetes_node, cmdb_ci_kubernetes_pod) if the plugin is enabled — they ship with identification rules.",
          "Only extend cmdb_ci_appl if you truly have a new class of thing (rare); otherwise use OOB and add u_ columns.",
        ],
        `sys_class_name = 'cmdb_ci_kubernetes_pod';
parent           = kubernetesNodeSysId;`,
        "Alternate: for exotic platforms, extend cmdb_ci_cloud_object rather than inventing a new root class — you inherit cloud discovery hooks.",
        "Inventing new root classes fragments identification and Service Mapping traversal.",
      ),
    ],
  },
  {
    slug: "relationships",
    shortTitle: "Relationships & Dependencies",
    title: "Relationships & Dependencies",
    blurb: "How CIs relate and how impact propagates.",
    scope:
      "cmdb_rel_ci, cmdb_rel_type, parent/child roles, 'Depends on::Used by', 'Runs on::Runs', dependency direction, business service maps, impact vs affected, suggested vs discovered relationships.",
    definitive: [
      d(
        "rel-1",
        "What table stores CI relationships?",
        "cmdb_rel_ci with parent, child, and type. Types come from cmdb_rel_type and define both directions (parent descriptor / child descriptor).",
      ),
      d(
        "rel-2",
        "Which direction does 'Depends on' point?",
        "The dependent CI is the PARENT of the relationship; the CI it depends on is the CHILD. Impact propagates from child up to parent.",
      ),
      d(
        "rel-3",
        "What is a suggested relationship?",
        "A relationship proposed by Service Mapping or Discovery that requires operator confirmation before it becomes authoritative.",
      ),
      d(
        "rel-4",
        "Do relationships have attributes?",
        "Yes — you can extend cmdb_rel_ci with columns (e.g. port, protocol) via CI Class Manager to enrich a specific relationship type.",
      ),
    ],
    scenario: [
      s(
        "rel-s1",
        "Impact analysis returns nothing",
        "Change on 'db-prod-01' shows no affected services. What's wrong?",
        [
          "Check cmdb_rel_ci direction — the DB must be the CHILD of 'Depends on' relationships from applications.",
          "Verify a path exists from the DB up through applications to a business service.",
          "Confirm 'operational' status on intermediate CIs; retired CIs break traversal.",
        ],
        `new GlideRecord('cmdb_rel_ci')
  .addQuery('child', dbSysId)
  .addQuery('type.name','Depends on::Used by');`,
        "Alternate: use the BSM map or 'Impacted Services' related list on the CI — visual traversal often exposes broken links faster than scripting.",
        "Reversing parent/child on custom relationship types silently breaks impact analysis.",
      ),
    ],
  },
  {
    slug: "service-mapping",
    shortTitle: "Service Mapping",
    title: "Service Mapping — top-down modeling",
    blurb: "Mapping business services from entry points down.",
    scope:
      "Service Mapping: entry points, tag-based mapping, traffic-based mapping, top-down discovery, connection sections in patterns, service model, cmdb_ci_service_discovered, application services, MID Server sizing for SM.",
    definitive: [
      d(
        "sm-1",
        "What starts a Service Mapping run?",
        "An entry point — typically a URL, load balancer VIP, or DNS name — that Service Mapping traces outward using patterns and traffic connections.",
      ),
      d(
        "sm-2",
        "Tag-based vs traffic-based mapping?",
        "Tag-based reads inventory metadata (tags in AWS/K8s/vCenter) to build the map. Traffic-based follows live process/network connections. Combine both for cloud-native + legacy stacks.",
      ),
      d(
        "sm-3",
        "What table stores mapped services?",
        "cmdb_ci_service_discovered, a subclass of cmdb_ci_service, with the entry point and the discovered topology attached as relationships.",
      ),
      d(
        "sm-4",
        "Does Service Mapping create infrastructure CIs?",
        "It CAN, but best practice is to let horizontal Discovery seed CIs and let Service Mapping only draw relationships and add service context.",
      ),
    ],
    scenario: [
      s(
        "sm-s1",
        "Service map full of 'unknown' nodes",
        "New mapping shows the entry point but most downstream nodes are 'unknown'. Why?",
        [
          "The MID Server can reach the app server but not the downstream tiers (firewall, credentials, or missing patterns).",
          "Underlying horizontal Discovery hasn't populated the DB/Cache CIs, so SM has nothing to attach to.",
          "Fix: run horizontal Discovery for those tiers first; then re-run SM.",
        ],
        `entryPoint.url = 'https://shop.example.com';
mid.capability = 'ServiceMapping';`,
        "Alternate: switch to tag-based mapping if the workloads are containerized — traffic-based mapping struggles with ephemeral pod IPs.",
        "Publishing a service map with unknown nodes to the change-approval dashboard misleads approvers.",
      ),
    ],
  },
  {
    slug: "integration-imports",
    shortTitle: "Integrations & Imports",
    title: "Integrations & Imports into the CMDB",
    blurb: "Getting CI data in from external systems.",
    scope:
      "CMDB integrations: IntegrationHub ETL, Import Sets, Transform Maps, cmdbTransformAPI (identify + reconcile), CSDM data import, ServiceGraph Connectors, staging tables, data source, robust transform vs IRE payload API.",
    definitive: [
      d(
        "int-1",
        "Should CMDB integrations use Import Sets or the IRE payload API?",
        "IRE payload API (via cmdbTransformAPI or ServiceGraph Connectors) is preferred — it enforces identification and reconciliation. Import Sets bypass IRE unless you explicitly call it in the transform.",
      ),
      d(
        "int-2",
        "What are ServiceGraph Connectors?",
        "Certified content packs that consume vendor telemetry (AWS Config, Azure Resource Graph, ADDM, etc.) and write directly through IRE — no custom transforms.",
      ),
      d(
        "int-3",
        "What is IntegrationHub ETL?",
        "A no-code data prep tool that maps source data to target CI classes, previews IRE decisions, and schedules loads — the modern replacement for hand-written transform scripts.",
      ),
      d(
        "int-4",
        "What is a staging table?",
        "An intermediate table (u_imp_*) that receives raw rows before transformation, giving you a clean row store for debugging and re-processing.",
      ),
    ],
    scenario: [
      s(
        "int-s1",
        "SCCM import creates duplicates",
        "An SCCM CSV import creates a new CI on every run even though hostnames match.",
        [
          "The transform map writes directly to cmdb_ci_computer instead of going through IRE.",
          "Fix: switch to IntegrationHub ETL or call cmdbTransformAPI in the transform script so identification runs.",
          "Set discovery_source = 'SCCM' so reconciliation rules can arbitrate.",
        ],
        `var api = new SNC.IdentificationEngineScriptableApi();
api.createOrUpdateCI('SCCM', JSON.stringify(payload));`,
        "Alternate: use the certified 'ServiceGraph Connector for SCCM' — it already wires IRE correctly and ships pre-tuned identifiers.",
        "Bypassing IRE on any CI write eventually corrupts the CMDB — every source must go through it.",
      ),
    ],
  },
  {
    slug: "ci-lifecycle",
    shortTitle: "CI Lifecycle",
    title: "CI Lifecycle Management",
    blurb: "Onboarding, updating, and retiring CIs by policy.",
    scope:
      "CI lifecycle: install_status transitions, CMDB Data Manager policies, stale CI cleanup, orphan CIs, aging out, absent CIs, first_discovered / last_discovered, retire vs delete, CMDB attestation.",
    definitive: [
      d(
        "life-1",
        "What is CMDB attestation?",
        "A periodic sign-off workflow where CI owners confirm attributes are still correct — required for many regulated environments (SOX, HIPAA).",
      ),
      d(
        "life-2",
        "What is an orphan CI?",
        "A CI with no relationships to any business service or application, usually because Discovery found the host but Service Mapping never ran.",
      ),
      d(
        "life-3",
        "When should a CI be marked 'Absent'?",
        "When Discovery expected to find it and didn't — CMDB Data Manager can flip install_status to 'Absent' after N failed cycles instead of immediately retiring.",
      ),
      d(
        "life-4",
        "What triggers first_discovered?",
        "It's stamped by IRE on initial CI creation from a discovery source; it never changes afterwards.",
      ),
    ],
    scenario: [
      s(
        "life-s1",
        "Stale CIs polluting reports",
        "Reports show 4,000 servers but only 3,100 are actually running. How do you clean up without breaking history?",
        [
          "Create a Data Manager policy: install_status → Absent after 30 days of no discovery.",
          "Escalate: Absent → Retired after 60 additional days if no attestation.",
          "Never bulk-delete — you'd lose incident/change history.",
        ],
        `policy.condition = 'last_discovered<javascript:gs.daysAgoStart(30)';
policy.action    = 'setInstallStatus=Absent';`,
        "Alternate: run 'discovery status' review with CI owners quarterly and let humans attest rather than automating retirement for regulated CIs.",
        "Auto-retiring CIs that just failed one Discovery cycle causes false 'gone' alarms and breaks impact analysis.",
      ),
    ],
  },
  {
    slug: "cmdb-health",
    shortTitle: "CMDB Health",
    title: "CMDB Health Dashboard",
    blurb: "Measuring completeness, correctness, and compliance.",
    scope:
      "CMDB Health Dashboard: KPIs (Completeness, Correctness, Compliance), required attributes, staleness, duplicates, orphans, health scorecard, class-level scoring, remediation workflows.",
    definitive: [
      d(
        "hlth-1",
        "What are the three CMDB Health KPIs?",
        "Completeness (required attributes filled), Correctness (identifier uniqueness, no duplicates), Compliance (relationships match CSDM). Each is scored 0-100 per class.",
      ),
      d(
        "hlth-2",
        "How is Correctness measured?",
        "By detecting duplicates, stale records (last_discovered too old), and CIs missing strong identifiers. It's driven by identification rule criteria.",
      ),
      d(
        "hlth-3",
        "What is a Health Scorecard?",
        "A per-class rollup showing weighted KPI scores and per-CI drilldowns, so you can target remediation by class rather than by individual record.",
      ),
      d(
        "hlth-4",
        "Where do 'required attribute' definitions come from?",
        "The Completeness dashboard reads required-attribute lists per class (configurable) plus dictionary-level 'mandatory' flags.",
      ),
    ],
    scenario: [
      s(
        "hlth-s1",
        "Completeness score suddenly drops 20 points",
        "Overnight the Windows Server completeness KPI drops from 88% to 68%. What do you check?",
        [
          "New required attribute was added (or made mandatory) on the class — every existing CI now fails.",
          "Discovery pattern change stopped populating a field.",
          "MID Server outage caused stale last_discovered timestamps, hiding data.",
        ],
        `new GlideRecord('cmdb_health_result')
  .addQuery('ci_class','cmdb_ci_win_server')
  .orderByDesc('sys_created_on');`,
        "Alternate: diff the sys_dictionary_history for that class over the last 24 hours — usually shows the config change that moved the score.",
        "Chasing 'bad data' when the root cause is a governance change that added a new required field.",
      ),
    ],
  },
  {
    slug: "itsm-integration",
    shortTitle: "ITSM Integration",
    title: "CMDB × ITSM — Incidents, Changes, Problems",
    blurb: "How the CMDB powers impact, CAB, and RCA.",
    scope:
      "CMDB and ITSM: CI reference on incident/change/problem, business service field, affected CIs, task_ci, impacted services, blackout windows, change collision detection, service outage, PIR.",
    definitive: [
      d(
        "itsm-1",
        "What table links tasks to CIs?",
        "task_ci — a many-to-many join between task and cmdb_ci enabling 'affected CIs' on incidents, problems, and changes.",
      ),
      d(
        "itsm-2",
        "What is change collision detection?",
        "A pre-approval check that flags overlapping change windows on the same or related CIs, using cmdb_rel_ci traversal.",
      ),
      d(
        "itsm-3",
        "How does an incident affect service availability?",
        "When cmdb_ci.operational_status flips to Non-Operational, an outage record (cmdb_ci_outage) is opened and rolls up impact through Depends on relationships.",
      ),
      d(
        "itsm-4",
        "What is the difference between Business Service and Configuration Item on an incident?",
        "Business Service is the consumer-facing service impacted; CI is the specific asset the incident is about. Both can be set, and BSM uses the CI's relationships to derive the service.",
      ),
    ],
    scenario: [
      s(
        "itsm-s1",
        "Change approval missed a critical downstream service",
        "A DB restart change was approved but broke a business service nobody flagged. How do you prevent it?",
        [
          "Enable change collision + service impact — CAB workflow uses cmdb_rel_ci to walk from the DB up to affected services.",
          "Make Business Services required on high-risk change categories.",
          "Add automated blackout checks against cmdb_ci_service.change_freeze windows.",
        ],
        `new GlideRecord('cmdb_ci_service')
  .addJoinQuery('cmdb_rel_ci','sys_id','parent')
  .addQuery('child', dbCi.sys_id);`,
        "Alternate: bolt on Predictive Intelligence 'similar changes' to surface historical incidents linked to the same CI class.",
        "Approving DB changes without walking the dependency tree — impact only appears at cutover.",
      ),
    ],
  },
  {
    slug: "csdm",
    shortTitle: "CSDM",
    title: "CSDM — Common Service Data Model",
    blurb: "The prescriptive blueprint for CMDB modeling.",
    scope:
      "CSDM 4.0: Foundation/Design/Build/Manage domains, service portfolio, service offering, business application, technical service, application service, sold products, ownership vs consumption, CSDM crawl-walk-run.",
    definitive: [
      d(
        "csdm-1",
        "What are the four CSDM domains?",
        "Foundation, Design, Build, Manage — modeling maturity increases from raw hardware (Foundation) to consumable, subscribed service offerings (Manage).",
      ),
      d(
        "csdm-2",
        "Difference between Service Offering and Business Application?",
        "Business Application is the app itself (Payroll). Service Offering is a specific consumable variant (Payroll — Gold SLA) tied to a customer/consumer and price.",
      ),
      d(
        "csdm-3",
        "What is a Technical Service?",
        "A team-managed service (e.g. 'Payroll API') that supports Business Applications; it's the operational unit for on-call, monitoring, and SLAs.",
      ),
      d(
        "csdm-4",
        "Do you need to fully adopt CSDM at once?",
        "No — CSDM ships a 'crawl-walk-run' roadmap. Foundation classes first, then Design/Build, and finally Manage-level service offerings.",
      ),
    ],
    scenario: [
      s(
        "csdm-s1",
        "Where do 'sold products' fit?",
        "Sales operations wants every SKU we sell in the CMDB. Which CSDM domain?",
        [
          "Manage domain — Product Offering / Sold Product classes, tied to Service Offerings.",
          "Sold Products link to customer accounts, entitlements, and revenue — they're consumption-facing, not infrastructure.",
          "Never model them under cmdb_ci_hardware or a random custom class.",
        ],
        `soldProduct.name         = 'Payroll — Gold';
soldProduct.service_offering = svcOffering.sys_id;`,
        "Alternate: if you only need subscription tracking, use the CSM Subscription table and reference the Service Offering — lighter than full Sold Product modeling.",
        "Stuffing SKUs into Business Application creates a 5,000-row 'app' list nobody trusts.",
      ),
    ],
  },
  {
    slug: "ham-sam",
    shortTitle: "HAM & SAM",
    title: "HAM & SAM — Hardware & Software Asset Management",
    blurb: "Asset lifecycle, contracts, entitlements, and reclamation.",
    scope:
      "HAM Pro and SAM Pro: alm_asset, alm_hardware, alm_license, software installations, software model, publisher packs, normalization, reclamation candidates, contracts, stockroom, transfer orders, asset lifecycle vs CI lifecycle.",
    definitive: [
      d(
        "ham-1",
        "What's the difference between an Asset and a CI?",
        "Asset (alm_asset) tracks the financial/contractual side (purchase, warranty, owner). CI (cmdb_ci) tracks the operational side. They're 1:1 linked via ci reference field.",
      ),
      d(
        "ham-2",
        "What does SAM Pro's 'normalization' do?",
        "Cleans raw software inventory (e.g. 'Adobe Acrobat 2020 v20.001.20095') into a canonical software model, feeding entitlement and reclamation.",
      ),
      d(
        "ham-3",
        "What is a reclamation candidate?",
        "A software installation flagged as underused (no login in N days) that could be uninstalled to free a license — SAM Pro surfaces this automatically.",
      ),
      d(
        "ham-4",
        "What is a publisher pack?",
        "A vendor-specific content bundle (Microsoft, Oracle, IBM) that ships normalization content and license metric templates for that publisher.",
      ),
    ],
    scenario: [
      s(
        "ham-s1",
        "Recovering 200 unused Adobe licenses",
        "SAM Pro shows 200 Adobe installs with no logins in 90 days. How do you reclaim safely?",
        [
          "Filter reclamation candidates in SAM Pro workspace by publisher + last-used.",
          "Generate an automated 'notify user → auto-uninstall in 14 days' workflow with a keep-request option.",
          "Update software entitlement counts after uninstall; audit trail lives on alm_license.",
        ],
        `installs.addQuery('publisher','Adobe')
        .addQuery('last_used','<javascript:gs.daysAgoStart(90)');`,
        "Alternate: negotiate with procurement to true-down at contract renewal rather than uninstalling — sometimes politically easier than reclamation workflows.",
        "Uninstalling without user notice — breaks trust and generates a wave of tickets. Always notify + grace period.",
      ),
    ],
  },
];

export function findSection(slug: string): DiscoverySection | undefined {
  return DISCOVERY_SECTIONS.find((s) => s.slug === slug);
}
