// Centralized automation logic registry for the RGS OS.
// Phase 1: declarative map of automation rules. Some are wired (DB triggers
// or app code), others are placeholders for Phase 2.
//
// Surface this on the admin "Operations / SOP" → Automations viewer.

export type AutomationStatus = "wired" | "placeholder";
export type AutomationLayer = "database" | "app" | "edge_function" | "manual";

export type AutomationRule = {
  id: string;
  domain: string; // RGS OS domain that owns the rule
  trigger: string;
  action: string;
  status: AutomationStatus;
  layer: AutomationLayer;
  notes?: string;
};

export const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "stage_change_assign_tools",
    domain: "Tool Distribution System",
    trigger: "Client stage changes (e.g. enters Diagnostic or Implementation)",
    action: "Auto-assign matching Diagnostic / Implementation tools",
    status: "wired",
    layer: "database",
    notes:
      "DB trigger auto_assign_tools_on_stage_change + tool_categories_for_stage(). Idempotent via unique (customer_id, resource_id).",
  },
  {
    id: "implementation_added_unlock_portal",
    domain: "Client Management",
    trigger: "Client moves into 'implementation_added' stage",
    action: "Unlock portal, seed default checklist, log timeline event",
    status: "wired",
    layer: "database",
    notes: "handle_customer_stage_change() trigger.",
  },
  {
    id: "addon_purchase_assign_tools",
    domain: "Add-On / Monitoring System",
    trigger: "Admin marks add-on package as purchased",
    action: "Assign all add-on-category tools in that package to the client",
    status: "placeholder",
    layer: "app",
    notes: "Today: admin assigns add-on tools manually from Client Management → Tools tab.",
  },
  {
    id: "scorecard_submission_creates_lead",
    domain: "Scorecard System",
    trigger: "Public scorecard submission with email captured",
    action: "Create a Lead in CRM / Pipeline (stage = 'lead')",
    status: "placeholder",
    layer: "edge_function",
    notes: "Phase 2: wire scorecard submit → POST to edge fn → insert into customers.",
  },
  {
    id: "diagnostic_due_flag_status",
    domain: "Diagnostic System",
    trigger: "Diagnostic delivery date approaches or passes",
    action: "Flag diagnostic as 'at risk' / 'overdue' on Command Center",
    status: "placeholder",
    layer: "app",
    notes: "Phase 2: requires diagnostics table with due_date.",
  },
  {
    id: "diagnostic_complete_suggest_next",
    domain: "Diagnostic System",
    trigger: "Diagnostic marked complete",
    action: "Suggest Implementation engagement or relevant Add-Ons in Client Management",
    status: "placeholder",
    layer: "app",
  },
  {
    id: "client_upload_notify",
    domain: "Client Management",
    trigger: "Client uploads a file to portal",
    action: "Add timeline event + admin notification",
    status: "placeholder",
    layer: "app",
    notes: "Today: uploads land in customer_uploads but no timeline/notification event is emitted.",
  },
  {
    id: "monitoring_threshold_breach",
    domain: "Add-On / Monitoring System",
    trigger: "Revenue & Risk Monitor™ input crosses a risk threshold",
    action: "Surface in Add-On / Monitoring dashboard + admin alert",
    status: "placeholder",
    layer: "app",
  },
];

export const automationByDomain = () => {
  const map = new Map<string, AutomationRule[]>();
  for (const r of AUTOMATION_RULES) {
    const arr = map.get(r.domain) ?? [];
    arr.push(r);
    map.set(r.domain, arr);
  }
  return map;
};