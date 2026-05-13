/**
 * P93F — Specialist tool navigation menu.
 *
 * The customer detail header used to render ~14 equal-weight buttons in a
 * single row, which made the page feel like a button pile and pushed the
 * walkthrough/guidance content far down. This menu groups those navigations
 * by purpose, collapses them by default, and keeps the screen calm.
 *
 * Pure navigation. No business logic, no data fetching, no destructive
 * actions. Each item resolves to an existing admin route.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react";

type ToolLink = {
  label: string;
  path: string;
  helper?: string;
};

type ToolGroup = {
  key: string;
  title: string;
  description: string;
  items: ReadonlyArray<ToolLink>;
};

function buildGroups(customerId: string): ReadonlyArray<ToolGroup> {
  const base = `/admin/customers/${customerId}`;
  return [
    {
      key: "diagnostic",
      title: "Diagnostic & Findings",
      description: "Stability snapshot, scoring history, and clarification logs.",
      items: [
        { label: "Scorecard History", path: `${base}/scorecard-history`, helper: "Reviewed score snapshots." },
        { label: "SWOT Analysis", path: `${base}/swot-analysis`, helper: "Strengths, weaknesses, opportunities, threats." },
        { label: "Advisory Notes", path: `${base}/advisory-notes`, helper: "Bounded client-visible advisory + admin notes." },
      ],
    },
    {
      key: "operations",
      title: "Operations & SOPs",
      description: "How the business runs, who decides, and how work flows.",
      items: [
        { label: "SOP / Training Bible", path: `${base}/sop-training-bible`, helper: "Approved operating instructions." },
        { label: "Decision Rights", path: `${base}/decision-rights-accountability`, helper: "RACI for owner-level decisions." },
        { label: "Workflow Maps", path: `${base}/workflow-process-mapping`, helper: "Trigger, steps, handoffs, decisions." },
      ],
    },
    {
      key: "revenue",
      title: "Revenue & Risk",
      description: "Revenue, cash, receivables, pipeline, and risk visibility.",
      items: [
        { label: "Revenue & Risk Monitor", path: `${base}/revenue-risk-monitor`, helper: "Curate signals; toggle visibility." },
        { label: "Priority Action Tracker", path: `${base}/priority-action-tracker`, helper: "Reviewed signals → visible priorities." },
        { label: "Owner Decision Dashboard", path: `${base}/owner-decision-dashboard`, helper: "Owner-level decision prompts." },
      ],
    },
    {
      key: "financial",
      title: "Financial Visibility",
      description: "Connector and source visibility records and limits.",
      items: [
        { label: "Financial Visibility", path: `${base}/financial-visibility`, helper: "Connector + source visibility." },
      ],
    },
    {
      key: "delivery",
      title: "Delivery & Implementation",
      description: "Roll out the plan and track the systems that get installed.",
      items: [
        { label: "Implementation Roadmap", path: `${base}/implementation-roadmap`, helper: "Phases, items, client visibility." },
        { label: "Tool Training Tracker", path: `${base}/tool-assignment-training-tracker`, helper: "Access source, training, handoff." },
        { label: "Monthly System Review", path: `${base}/monthly-system-review`, helper: "Prepare and share monthly review." },
        { label: "RGS Control System", path: `${base}/rgs-control-system`, helper: "Lane snapshot + RCS subscription state." },
      ],
    },
    {
      key: "library",
      title: "Library & Health",
      description: "Approved resources and renewal/health visibility.",
      items: [
        { label: "Tool Library", path: `${base}/tool-library`, helper: "Approved guides, templates, checklists." },
        { label: "Client Health", path: `${base}/client-health`, helper: "Renewal/follow-up visibility (admin)." },
      ],
    },
  ];
}

export function AdminSpecialistToolMenu({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const groups = buildGroups(customerId);

  return (
    <section
      data-testid="admin-specialist-tool-menu"
      className="rounded-2xl border border-border bg-card/40"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="admin-specialist-tool-menu-toggle"
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-start gap-3 min-w-0">
          <ListChecks className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm text-foreground">Specialist tools for this account</div>
            <div className="text-[11px] text-muted-foreground">
              Grouped by purpose. Collapsed by default to keep the next action obvious.
            </div>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {open ? (
        <div className="border-t border-border p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div key={g.key} className="rounded-xl border border-border bg-card/40 p-3">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {g.title}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 mb-2">
                {g.description}
              </div>
              <ul className="space-y-1.5">
                {g.items.map((item) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      data-testid={`tool-link-${item.path}`}
                      className="w-full text-left rounded-md border border-border bg-muted/20 hover:bg-muted/40 px-3 py-2"
                    >
                      <div className="text-xs text-foreground">{item.label}</div>
                      {item.helper ? (
                        <div className="text-[10px] text-muted-foreground mt-0.5">{item.helper}</div>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default AdminSpecialistToolMenu;