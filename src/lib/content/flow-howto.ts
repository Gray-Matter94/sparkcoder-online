/**
 * Deep-dive Flow Designer how-to guides.
 * Each entry gets its own indexable URL at /learn/flow-designer-how-to/{slug}.
 */

export interface HowToStepDetail {
  title: string;
  body: string;
  snippet?: string;
}

export interface FlowHowToGuide {
  slug: string;
  /** H1 / page headline */
  heading: string;
  /** <title> — keep under 60 chars where possible */
  title: string;
  description: string;
  /** Direct answer shown in the first screen */
  shortAnswer: string;
  /** Where the action lives in the UI */
  location: string;
  steps: HowToStepDetail[];
  pitfalls: string[];
  faq: { q: string; a: string }[];
  related: { slug: string; label: string }[];
}

export const FLOW_HOWTO_GUIDES: FlowHowToGuide[] = [
  {
    slug: "add-script-step",
    heading: "Add a script step in Flow Designer",
    title: "How to Add a Script Step in ServiceNow Flow Designer",
    description:
      "Step-by-step: add the Script action in Flow Designer, declare typed inputs and outputs, read inputs.x, set outputs.y, and debug the step — with copy-ready code.",
    shortAnswer:
      "Add Action → Utilities → Script, declare every value the script needs on the Inputs tab, declare what it returns on the Outputs tab, then read them as inputs.<name> and assign outputs.<name> inside the execute() function. A Flow Designer script has no current and no access to flow data you did not pass in as an input.",
    location: "Flow Designer → Add an Action, Flow Logic or Subflow → Action → Utilities → Script",
    steps: [
      {
        title: "Open the flow and add the Script action",
        body: "Open your flow, click Add an Action, Flow Logic or Subflow → Action, then choose Utilities → Script. The step lands wherever your cursor is in the flow, so add it after the step whose output you need.",
      },
      {
        title: "Declare typed inputs on the Inputs tab",
        body: "Click Create Variable / the Inputs tab and add one input per value the script needs. Give each a type (String, Reference, True/False, Date/Time). Then drag the upstream data pill — trigger record sys_id, a lookup result, a flow variable — into the matching input field. Nothing outside these inputs is visible to the script.",
      },
      {
        title: "Declare the outputs you want to return",
        body: "On the Outputs tab, add one output per value downstream steps need, again typed. Outputs are the only way a Script step hands data back to the flow.",
      },
      {
        title: "Write the script against inputs and outputs",
        body: "The body is wrapped in an execute(inputs, outputs) IIFE. Read with inputs.<name>, write with outputs.<name>. Always convert Glide values with toString() or getValue() before assigning them to a String output, otherwise you store a GlideElement object.",
        snippet: `(function execute(inputs, outputs) {
  var gr = new GlideRecord('incident');
  if (!gr.get(inputs.incident_sys_id)) {
    outputs.found = false;
    return;
  }

  outputs.found = true;
  outputs.short_desc = gr.getValue('short_description');
  outputs.priority = gr.getValue('priority');
  outputs.assignee_email = gr.assigned_to.email ? gr.assigned_to.email.toString() : '';
})(inputs, outputs);`,
      },
      {
        title: "Use the outputs downstream",
        body: "In the next step's field, open the data pill picker and expand your Script step — each declared output appears as a pill. Branch on it with Flow Logic → If when the script returns a boolean.",
      },
      {
        title: "Test and read the log",
        body: "Click Test (or Run Test), then open the execution details. Each step row shows its input and output values; gs.info() lines from the script appear in the step log and in System Logs → All filtered on the flow name.",
        snippet: `(function execute(inputs, outputs) {
  gs.info('[flow-debug] incident=' + inputs.incident_sys_id);
  // ... work ...
})(inputs, outputs);`,
      },
    ],
    pitfalls: [
      "Referencing current or previous — they do not exist in a Flow Designer script. Pass the record sys_id in as an input and re-query it.",
      "Returning a value with return or gs.print instead of assigning outputs.<name> — the flow sees nothing.",
      "Assigning a GlideElement to a String output (outputs.x = gr.short_description) — use getValue() or toString().",
      "Cross-scope calls failing silently: a Script step in a scoped app cannot reach a global Script Include unless that include is Accessible from: All application scopes.",
      "Long-running loops in a Script step. Flow Designer steps run in a transaction — move bulk work to an Action with a proper query step or a scheduled job.",
    ],
    faq: [
      {
        q: "Can a Flow Designer script step use current?",
        a: "No. current is only available in Business Rules and similar server-side contexts. In Flow Designer you pass the record (usually its sys_id) into a declared input and re-query it with GlideRecord.",
      },
      {
        q: "How do I return multiple values from a script step?",
        a: "Declare one output per value on the Outputs tab and assign each one inside execute(). There is no limit on the number of outputs, and each appears as its own data pill downstream.",
      },
      {
        q: "Where do gs.info() messages from a script step go?",
        a: "To the flow execution details for that step and to System Logs → All. Prefix your messages so you can filter them, for example gs.info('[flow-debug] ...').",
      },
    ],
    related: [
      { slug: "call-script-include", label: "Call a Script Include from a flow" },
      { slug: "call-subflow", label: "Call a subflow from a flow" },
    ],
  },
  {
    slug: "call-subflow",
    heading: "Call a subflow from a flow",
    title: "How to Call a Subflow in ServiceNow Flow Designer",
    description:
      "Step-by-step: define subflow inputs and outputs, add the Call a Subflow flow logic, map data pills, and choose synchronous vs asynchronous execution.",
    shortAnswer:
      "Define Inputs and Outputs on the subflow first, publish it, then in the parent flow choose Add Flow Logic → Call a Subflow, pick the subflow, and map a data pill into each input. The subflow's outputs then appear as pills for every step after it.",
    location: "Flow Designer → Add an Action, Flow Logic or Subflow → Flow Logic → Call a Subflow",
    steps: [
      {
        title: "Give the subflow typed inputs and outputs",
        body: "Open the subflow, click the Inputs / Outputs tabs at the top and add each parameter with a type. Reference inputs (for example Reference → Incident) are better than raw strings because the parent flow then gets record pills instead of sys_id text.",
      },
      {
        title: "Publish the subflow",
        body: "A draft subflow does not appear in the parent's picker. Click Save → Publish. Republish after changing the input or output signature, otherwise the parent keeps the old mapping.",
      },
      {
        title: "Add Call a Subflow in the parent flow",
        body: "In the parent flow: Add an Action, Flow Logic or Subflow → Flow Logic → Call a Subflow. Select your subflow by name; the Inputs panel populates from the subflow signature.",
      },
      {
        title: "Map data pills into the inputs",
        body: "Drag the trigger record, a lookup result, or a flow variable into each input. Required inputs must be filled or the flow errors at runtime, not at design time.",
      },
      {
        title: "Choose synchronous or asynchronous",
        body: "Leave the default (synchronous) when downstream steps need the subflow's outputs. Set it to run asynchronously only for fire-and-forget work — asynchronous calls return no outputs to the parent.",
      },
      {
        title: "Consume the outputs",
        body: "In any later step, open the pill picker and expand the Call a Subflow step to use its outputs. If you need those values inside a script, pass the pill into a declared Script step input.",
        snippet: `(function execute(inputs, outputs) {
  // inputs.subflow_result was mapped from the subflow's output pill
  outputs.is_approved = inputs.subflow_result === 'approved';
})(inputs, outputs);`,
      },
    ],
    pitfalls: [
      "Calling a subflow that is still in Draft — it will not show in the picker. Publish it.",
      "Expecting outputs from an asynchronous subflow call. Asynchronous means the parent moves on immediately and gets nothing back.",
      "Changing subflow inputs without reopening the parent flow: the parent keeps the stale mapping until you re-select the subflow.",
      "Deep nesting. Subflows can call subflows, but every level adds execution context — keep it to two levels for anything you have to debug in production.",
      "Using a subflow where a custom Action fits better. Actions are for reusable single operations, subflows for reusable multi-step processes with their own logic.",
    ],
    faq: [
      {
        q: "What is the difference between a subflow and an action in ServiceNow?",
        a: "An Action is one reusable operation built from steps (script, REST, record lookup) and is exposed in the action picker. A subflow is a reusable flow — it can contain flow logic, approvals, waits and multiple actions — and is called with Flow Logic → Call a Subflow.",
      },
      {
        q: "Can a subflow return values to the parent flow?",
        a: "Yes, through its declared Outputs, as long as the call is synchronous. Asynchronous subflow calls do not return data.",
      },
      {
        q: "Can I call a subflow from a script?",
        a: "Yes — use sn_fd.FlowAPI.getRunner().subflow('scope.subflow_name').inBackground().withInputs({...}).run() from server-side script. Inside Flow Designer itself, prefer the Call a Subflow flow logic.",
      },
    ],
    related: [
      { slug: "add-script-step", label: "Add a script step" },
      { slug: "call-script-include", label: "Call a Script Include from a flow" },
    ],
  },
  {
    slug: "call-script-include",
    heading: "Call a Script Include from a flow",
    title: "How to Call a Script Include in Flow Designer",
    description:
      "Step-by-step: call a Script Include from a Flow Designer script step, handle application scope, and wrap it in a custom Action so every flow can reuse it.",
    shortAnswer:
      "Script Includes are not directly selectable in Flow Designer. Call one from a Script step by instantiating it — new global.MyHelper().doWork(inputs.x) — and return the result through a declared output. For reuse across flows, wrap that script in a custom Action with typed inputs and outputs.",
    location:
      "Flow Designer → Action → Utilities → Script, or Process Automation → Action Designer for a reusable wrapper",
    steps: [
      {
        title: "Make the Script Include reachable",
        body: "Open the Script Include record. Client callable should be false for server-side flow use. If the flow lives in a different application scope, set Accessible from to All application scopes and make sure the Script Include is not marked private.",
      },
      {
        title: "Confirm the class exposes a callable method",
        body: "Flow Designer needs a normal prototype method that takes plain values and returns a plain value or object. Avoid methods that depend on current or on a session.",
        snippet: `var IncidentHelper = Class.create();
IncidentHelper.prototype = {
  initialize: function () {},

  classify: function (incidentSysId) {
    var gr = new GlideRecord('incident');
    if (!gr.get(incidentSysId)) return 'unknown';
    return gr.getValue('priority') === '1' ? 'critical' : 'standard';
  },

  type: 'IncidentHelper'
};`,
      },
      {
        title: "Add a Script step and declare inputs and outputs",
        body: "Add Action → Utilities → Script. Add an input for every argument the method needs (drag in the pill), and an output for the value you want back in the flow.",
      },
      {
        title: "Instantiate the Script Include with its scope prefix",
        body: "Use the full name: new global.IncidentHelper() for global, or new x_yourco_app.IncidentHelper() for a scoped app. Wrap the call in try/catch so a scope or typo error surfaces as a flow output instead of an opaque step failure.",
        snippet: `(function execute(inputs, outputs) {
  try {
    var helper = new global.IncidentHelper();
    outputs.classification = helper.classify(inputs.incident_sys_id);
    outputs.error = '';
  } catch (e) {
    outputs.classification = '';
    outputs.error = e.message;
    gs.error('[flow] IncidentHelper failed: ' + e.message);
  }
})(inputs, outputs);`,
      },
      {
        title: "Wrap it in a custom Action for reuse",
        body: "If more than one flow needs the call, go to Process Automation → Action Designer → New, add the same Script step, define the Action's Inputs and Outputs, and Publish. The Action then appears in every flow's action picker — no copy-pasted script.",
      },
      {
        title: "Test the step in isolation",
        body: "Run the flow test with a known record, then open the execution details for the Script step and check both the classification output and the error output before wiring downstream logic.",
      },
    ],
    pitfalls: [
      "Omitting the scope prefix (new IncidentHelper()) from a scoped flow — it throws at runtime even though the script saves fine.",
      "Script Include marked Client callable with client-only logic inside — GlideAjax helpers usually assume a request context that Flow Designer does not provide.",
      "Returning a GlideRecord or GlideElement from the Script Include. Return primitives or plain objects, then assign strings to your outputs.",
      "Relying on current inside the Script Include. Pass the sys_id in and query it.",
      "Swallowing errors with an empty catch — always write the message to an output or gs.error() so the flow's execution details show the cause.",
    ],
    faq: [
      {
        q: "Can Flow Designer call a Script Include directly?",
        a: "Not from the action picker. You call it from inside a Script step, or you publish a custom Action that contains that Script step and reuse the Action across flows.",
      },
      {
        q: "Why does my scoped flow fail to find a global Script Include?",
        a: "The Script Include must have Accessible from set to All application scopes, and you must instantiate it with the global. prefix. Both are required for a cross-scope call.",
      },
      {
        q: "Should I use a Script Include or an Action for reusable logic?",
        a: "Keep the business logic in the Script Include so other server-side code can use it, and expose it to flows through one thin custom Action. That gives you one implementation and a no-code interface.",
      },
    ],
    related: [
      { slug: "add-script-step", label: "Add a script step" },
      { slug: "call-subflow", label: "Call a subflow from a flow" },
    ],
  },
];

export function getFlowHowToGuide(slug: string): FlowHowToGuide | undefined {
  return FLOW_HOWTO_GUIDES.find((g) => g.slug === slug);
}
