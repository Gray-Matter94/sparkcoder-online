/**
 * Deep-dive client script how-to guides.
 * Each entry gets its own indexable URL at /learn/client-script-how-to/{slug}.
 */

export interface ClientScriptStep {
  title: string;
  body: string;
  snippet?: string;
}

export interface ClientScriptGuide {
  slug: string;
  /** H1 / page headline */
  heading: string;
  /** <title> — keep under 60 chars where possible */
  title: string;
  description: string;
  /** Direct answer shown in the first screen */
  shortAnswer: string;
  /** Where the work happens in the platform UI */
  location: string;
  steps: ClientScriptStep[];
  pitfalls: string[];
  faq: { q: string; a: string }[];
  related: { slug: string; label: string }[];
}

export const CLIENT_SCRIPT_GUIDES: ClientScriptGuide[] = [
  {
    slug: "get-display-value",
    heading: "Get the display value in a client script",
    title: "How to Get Display Value in ServiceNow Client Script",
    description:
      "Use g_form.getDisplayBox('field').value or g_form.getDisplayValue('field') to read what the user sees, and getValue() for the sys_id — with copy-ready onChange code.",
    shortAnswer:
      "g_form.getValue('assigned_to') returns the sys_id. To read the label the user actually sees, use g_form.getDisplayValue('assigned_to') — or on older releases g_form.getDisplayBox('assigned_to').value. For choice and reference fields those two calls return different strings, so never compare a display value against a sys_id.",
    location:
      "System Definition → Client Scripts → New (type: onChange / onLoad), or the Catalog Client Scripts table for catalog items",
    steps: [
      {
        title: "Decide which value you actually need",
        body: "getValue() gives the stored value: a sys_id for reference fields, the choice value for choice fields. getDisplayValue() gives the human label. Validation and queries want the stored value; messages, confirmations and field defaults usually want the display value.",
        snippet: `var userId = g_form.getValue('assigned_to');        // 62826bf03710...
var userName = g_form.getDisplayValue('assigned_to'); // "Beth Anglin"`,
      },
      {
        title: "Read the display value in an onChange script",
        body: "Guard the top of every onChange script with the standard isLoading / newValue check, then read the display value from the field that changed.",
        snippet: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') return;

  var label = g_form.getDisplayValue('assigned_to');
  g_form.addInfoMessage('Assigned to ' + label);
}`,
      },
      {
        title: "Fall back to getDisplayBox for older instances",
        body: "getDisplayValue() is not available on every release or every field widget. getDisplayBox() returns the input element that holds the label, so read its .value — and null-check it, because read-only or hidden reference fields have no display box.",
        snippet: `function displayLabel(field) {
  if (g_form.getDisplayValue) return g_form.getDisplayValue(field);
  var box = g_form.getDisplayBox(field);
  return box ? box.value : g_form.getValue(field);
}`,
      },
      {
        title: "Read choice field labels the same way",
        body: "For a choice field getValue('priority') returns '1' while getDisplayValue('priority') returns '1 - Critical'. Compare against the value, display the label.",
        snippet: `if (g_form.getValue('priority') === '1') {
  g_form.addInfoMessage('Priority set to ' + g_form.getDisplayValue('priority'));
}`,
      },
      {
        title: "Set a display value without triggering more scripts",
        body: "g_form.setValue(field, sysId, displayValue) sets both halves of a reference field in one call, which stops the platform from doing an extra round trip to resolve the label. Pass the third argument whenever you already know it.",
        snippet: `g_form.setValue('assigned_to', userId, userName);`,
      },
      {
        title: "Test in both the classic form and Next Experience",
        body: "Open the record in the classic UI and in a workspace form, change the field, and confirm the message. Workspace forms ignore DOM access, so a script that reached into the display box element instead of using the g_form API will silently fail there.",
      },
    ],
    pitfalls: [
      "Comparing getDisplayValue() output to a sys_id — the strings never match, so the branch never fires.",
      "Using document.getElementById('sys_display.incident.assigned_to') — DOM access is unsupported and breaks in Next Experience and Service Portal.",
      "Forgetting the isLoading guard, which makes the script run once on form load with the stored value.",
      "Calling getDisplayBox() on a read-only or hidden field and dereferencing null.",
      "Calling setValue() with only the sys_id in a loop — each call forces a server lookup for the label.",
    ],
    faq: [
      {
        q: "What is the difference between g_form.getValue and g_form.getDisplayValue?",
        a: "getValue returns the stored database value — a sys_id for reference fields, the choice value for choice fields. getDisplayValue returns the label the user sees, such as the user's name or '1 - Critical'.",
      },
      {
        q: "Why does g_form.getDisplayBox return null?",
        a: "The field has no visible display input: it is hidden, read-only, or rendered by a widget that does not create a display box. Guard the call and fall back to getDisplayValue or getValue.",
      },
      {
        q: "Can I get the display value of a field that is not on the form?",
        a: "No. g_form only sees fields on the current form. Use GlideAjax to a client-callable Script Include, or add the field to the form as hidden.",
      },
    ],
    related: [
      { slug: "get-reference-field-value", label: "Reference field values" },
      { slug: "dot-walk-in-client-script", label: "Dot-walking limits" },
    ],
  },
  {
    slug: "get-reference-field-value",
    heading: "Get a reference field value in a client script",
    title: "How to Get Reference Field Value in Client Script",
    description:
      "Read reference fields with g_form.getValue for the sys_id, getReference for the whole record, or GlideAjax for one field — with async callback code you can copy.",
    shortAnswer:
      "g_form.getValue('caller_id') gives you the sys_id. To read fields on the referenced record, use g_form.getReference('caller_id', callback) with a callback so the lookup is asynchronous, or — better for one or two fields — call a client-callable Script Include with GlideAjax. Never call getReference() without a callback: it blocks the browser on a synchronous request.",
    location:
      "System Definition → Client Scripts, plus System Definition → Script Includes for the GlideAjax counterpart",
    steps: [
      {
        title: "Start with the sys_id",
        body: "If all you need is the reference itself — to compare it, to pass it to a server call, or to check for empty — getValue() is enough and costs nothing.",
        snippet: `var callerId = g_form.getValue('caller_id');
if (!callerId) {
  g_form.showFieldMsg('caller_id', 'Pick a caller first', 'error');
  return;
}`,
      },
      {
        title: "Use getReference with a callback for several fields",
        body: "getReference() returns a GlideRecord-like object for the referenced record. Always pass the callback function as the second argument — that makes the request asynchronous. Reading properties off the return value directly forces a synchronous call and freezes the form.",
        snippet: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  if (isLoading || newValue === '') return;

  g_form.getReference('caller_id', function (caller) {
    g_form.setValue('location', caller.location);
    g_form.setValue('u_caller_email', caller.email);
  });
}`,
      },
      {
        title: "Prefer GlideAjax when you need one or two fields",
        body: "getReference() pulls the entire record across the wire. For a single field, a client-callable Script Include returns only what you asked for and is measurably faster on wide tables.",
        snippet: `// Script Include: CallerUtils (Client callable = true)
var CallerUtils = Class.create();
CallerUtils.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
  getEmail: function () {
    var gr = new GlideRecord('sys_user');
    if (gr.get(this.getParameter('sysparm_user'))) return gr.getValue('email');
    return '';
  },
  type: 'CallerUtils'
});`,
      },
      {
        title: "Call the Script Include from the client script",
        body: "Instantiate GlideAjax with the Script Include name, add the method and parameters, then read the answer inside getXMLAnswer(). Everything that depends on the value must live inside that callback.",
        snippet: `var ga = new GlideAjax('CallerUtils');
ga.addParam('sysparm_name', 'getEmail');
ga.addParam('sysparm_user', g_form.getValue('caller_id'));
ga.getXMLAnswer(function (email) {
  if (email) g_form.setValue('u_caller_email', email);
});`,
      },
      {
        title: "Handle the empty and cleared cases",
        body: "An onChange script fires when the reference is cleared too, with newValue as an empty string. Return early on empty, and clear the dependent fields instead of leaving stale data on the form.",
        snippet: `if (newValue === '') {
  g_form.setValue('u_caller_email', '');
  return;
}`,
      },
      {
        title: "Confirm with the browser network tab",
        body: "Change the field and watch the requests. One xmlhttp call per change is expected; a blocked UI or a long pending request means a synchronous getReference() slipped through.",
      },
    ],
    pitfalls: [
      "Calling var caller = g_form.getReference('caller_id') with no callback — synchronous AJAX that freezes the form.",
      "Reading g_form.setValue() results outside the callback, where the value has not arrived yet.",
      "Using getReference() to fetch one field from a wide table instead of a targeted GlideAjax call.",
      "Forgetting Client callable = true on the Script Include, which makes every GlideAjax call return an empty answer.",
      "Leaving stale dependent field values when the reference is cleared.",
    ],
    faq: [
      {
        q: "Is g_form.getReference synchronous?",
        a: "It is synchronous unless you pass a callback function as the second argument. Always pass the callback — a synchronous call blocks the browser until the server responds.",
      },
      {
        q: "GlideAjax or getReference — which is faster?",
        a: "GlideAjax, when you need one or two fields, because it returns only those values. getReference is convenient when you need many fields from the same referenced record.",
      },
      {
        q: "Why is my GlideAjax answer empty?",
        a: "Usual causes: the Script Include is not Client callable, it does not extend AbstractAjaxProcessor, the sysparm_name does not match the method name, or an ACL blocks the user from reading the field.",
      },
    ],
    related: [
      { slug: "get-display-value", label: "Display values" },
      { slug: "debug-client-script", label: "Debug a client script" },
    ],
  },
  {
    slug: "dot-walk-in-client-script",
    heading: "Dot-walk in a client script",
    title: "How to Dot-Walk in a ServiceNow Client Script",
    description:
      "g_form cannot dot-walk. Use getReference with a callback, GlideAjax, or a dot-walked form field to read caller_id.manager.email safely from the client.",
    shortAnswer:
      "g_form.getValue('caller_id.department') returns nothing — g_form only knows fields that are on the form, so there is no client-side dot-walk. Get the related value one of three ways: add the dot-walked field to the form (fastest, no code), g_form.getReference() with a callback for several fields on the referenced record, or GlideAjax to a client-callable Script Include for anything deeper than one hop.",
    location:
      "Form Designer / form layout for dot-walked fields; System Definition → Client Scripts and Script Includes for the scripted routes",
    steps: [
      {
        title: "Understand why the dot-walk fails",
        body: "The client only has the fields rendered on the form. A dotted string is treated as a field name, no such field exists, and g_form returns an empty string — silently, with no error in the console.",
        snippet: `// Returns '' — there is no such field on the form
var dept = g_form.getValue('caller_id.department');`,
      },
      {
        title: "Try the no-code route first: put the field on the form",
        body: "In Form Designer, expand the reference field and drag the related field onto the layout. The platform loads it with the record, so g_form.getValue('caller_id.department') then works. Set it read-only, and hide it with a UI Policy if users should not see it.",
        snippet: `// After adding the dot-walked field to the form layout
var dept = g_form.getValue('caller_id.department');`,
      },
      {
        title: "Use getReference for one hop with several fields",
        body: "For multiple fields on the directly referenced record, one asynchronous getReference() call is enough. The callback receives a record object whose properties you read directly.",
        snippet: `g_form.getReference('caller_id', function (caller) {
  g_form.setValue('location', caller.location);
  g_form.setValue('department', caller.department);
});`,
      },
      {
        title: "Use GlideAjax for two or more hops",
        body: "getReference() only reaches the first record. Anything like caller_id.manager.email must be dot-walked on the server, where GlideRecord can walk as deep as you need, and returned as a plain value.",
        snippet: `// Script Include: CallerUtils (Client callable = true)
getManagerEmail: function () {
  var gr = new GlideRecord('sys_user');
  if (!gr.get(this.getParameter('sysparm_user'))) return '';
  return gr.manager.email ? gr.manager.email.toString() : '';
},`,
      },
      {
        title: "Return several values as JSON",
        body: "One round trip beats three. Build an object on the server, JSON.stringify it, and parse it in the callback.",
        snippet: `var ga = new GlideAjax('CallerUtils');
ga.addParam('sysparm_name', 'getCallerProfile');
ga.addParam('sysparm_user', g_form.getValue('caller_id'));
ga.getXMLAnswer(function (json) {
  var p = JSON.parse(json || '{}');
  g_form.setValue('u_manager_email', p.managerEmail || '');
  g_form.setValue('department', p.department || '');
});`,
      },
      {
        title: "Verify the value is not empty before you use it",
        body: "Every one of these paths can legitimately return an empty string — no caller, no manager, no read access. Branch on empty and show a field message rather than writing blanks onto the form.",
      },
    ],
    pitfalls: [
      "Assuming a dotted field name works in g_form — it returns an empty string with no error, which looks like a data problem.",
      "Chaining two hops through getReference callbacks, which serialises two round trips instead of doing the walk on the server.",
      "Dot-walking on the server without null-checking each hop; gr.manager.email throws nothing but yields an empty GlideElement when the manager is empty.",
      "Adding dot-walked fields to a form on a high-volume table without setting them read-only, letting users edit the referenced record by accident.",
      "Returning a GlideElement from a Script Include instead of calling toString() or getValue().",
    ],
    faq: [
      {
        q: "Can you dot-walk with g_form in a client script?",
        a: "No. g_form only exposes fields present on the form, so a dotted name returns an empty string. Add the dot-walked field to the form, or fetch the value with getReference or GlideAjax.",
      },
      {
        q: "How do I get a field two levels deep, like caller_id.manager.email?",
        a: "Do the dot-walk on the server in a client-callable Script Include and return the string through GlideAjax. getReference only reaches the first referenced record.",
      },
      {
        q: "Does adding a dot-walked field to the form slow it down?",
        a: "Marginally — the platform joins the referenced table when loading the form. One or two fields are fine; a dozen on a wide table is where you switch to GlideAjax.",
      },
    ],
    related: [
      { slug: "get-reference-field-value", label: "Reference field values" },
      { slug: "debug-client-script", label: "Debug a client script" },
    ],
  },
  {
    slug: "debug-client-script",
    heading: "Debug a client script",
    title: "How to Debug a Client Script in ServiceNow",
    description:
      "Debug client scripts with the browser console, debugger breakpoints, g_form.addInfoMessage, JS debugger logs and field messages — a repeatable checklist.",
    shortAnswer:
      "Client scripts run in the browser, so debug them there: open DevTools, add a debugger statement or console.log at the top of the function, reload the form, and step through. Confirm the script is actually running before you suspect the logic — the usual culprits are a wrong script type, a mismatched table or field, an inactive record, or an early return from the isLoading guard.",
    location:
      "Browser DevTools console, plus System Diagnostics → Session Debug → Debug All / Enable JavaScript Log & Field Watcher",
    steps: [
      {
        title: "Prove the script is running at all",
        body: "Put a log line on the first executable line, before any guard. If it never prints, the problem is registration, not logic: check Active, Table, UI Type, script Type, and the Field name on the client script record.",
        snippet: `function onChange(control, oldValue, newValue, isLoading, isTemplate) {
  console.log('[cs] onChange fired', { oldValue: oldValue, newValue: newValue, isLoading: isLoading });
  if (isLoading || newValue === '') return;
  // ...
}`,
      },
      {
        title: "Break on the line instead of logging",
        body: "A debugger statement pauses execution with DevTools open so you can inspect g_form, the arguments and the scope. Remove it before you move the update set — a stray debugger pauses every user with DevTools open.",
        snippet: `function onLoad() {
  debugger;
  var state = g_form.getValue('state');
}`,
      },
      {
        title: "Turn on the platform's client-side log",
        body: "System Diagnostics → Session Debug → Enable JavaScript Log and Field Watcher opens a debug pane on the form. It shows which client scripts and UI policies ran, in what order, and every field change — invaluable when a UI Policy is overwriting your value.",
      },
      {
        title: "Surface state on the form when the console is unavailable",
        body: "In Service Portal, mobile and workspace contexts the console can be awkward. g_form.addInfoMessage() and g_form.showFieldMsg() put the value in front of you on the form itself.",
        snippet: `g_form.addInfoMessage('state=' + g_form.getValue('state') +
  ' assigned=' + g_form.getValue('assigned_to'));`,
      },
      {
        title: "Check the network tab for async work",
        body: "For getReference or GlideAjax, open the Network tab and filter on xmlhttp. No request means your call never fired; a pending request means the answer has not arrived and any code outside the callback is running too early.",
        snippet: `ga.getXMLAnswer(function (answer) {
  console.log('[cs] answer', answer); // logs after the response, not before
});`,
      },
      {
        title: "Isolate, then narrow the scope",
        body: "Comment the body down to the smallest failing piece, confirm it, then add code back a block at a time. When it works on the classic form but not in a workspace or the portal, suspect DOM access or a UI-type restriction on the client script record.",
      },
    ],
    pitfalls: [
      "Debugging logic when the script is not running — always confirm with a log on the first line.",
      "Leaving a debugger statement or console.log in a promoted update set.",
      "Expecting an onChange script to fire on form load; the isLoading guard returns early by design.",
      "Assuming your value stuck when a UI Policy runs after the script and resets the field — the Field Watcher shows this immediately.",
      "Reading async results outside the callback, so the log shows the old value and the logic looks broken.",
      "Using alert() for debugging; it blocks the page and behaves differently across UI contexts.",
    ],
    faq: [
      {
        q: "How do I see console output from a ServiceNow client script?",
        a: "Open the browser DevTools console on the form. console.log works normally; jslog() is the older platform equivalent and requires the JavaScript Log to be enabled through Session Debug.",
      },
      {
        q: "Why does my client script work on the form but not in Service Portal?",
        a: "Portal and workspace forms do not support DOM access, and the client script's UI Type must include the relevant interface. Replace document/jQuery access with g_form calls and set UI Type to All.",
      },
      {
        q: "How do I tell whether a UI Policy or my client script set a field?",
        a: "Enable Session Debug → JavaScript Log and Field Watcher. The pane lists every client script and UI Policy execution in order, along with each field change.",
      },
    ],
    related: [
      { slug: "get-reference-field-value", label: "Reference field values" },
      { slug: "get-display-value", label: "Display values" },
    ],
  },
];

export function getClientScriptGuide(slug: string): ClientScriptGuide | undefined {
  return CLIENT_SCRIPT_GUIDES.find((g) => g.slug === slug);
}
