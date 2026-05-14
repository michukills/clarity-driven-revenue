/**
 * P93E-E2G-P2.7 — Customer Workbench Panel.
 *
 * Top-of-page panel that answers, for the customer the admin is viewing:
 *   - what stage they are in
 *   - what work needs to happen now
 *   - which tools to open
 *   - whether the account is demo / test / archived
 *
 * This sits ABOVE the existing AdminNextActionPanel so the admin sees the
 * lane-aware tool launcher set first, without scrolling.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Lock } from "lucide-react";
import {
  getCustomerWorkState,
  type CustomerWorkState,
  type ToolLauncher,
} from "@/lib/workflow/customerWorkState";
import { ACCOUNT_KIND_LABEL } from "@/lib/customers/accountKind";

function LauncherButton({ tool }: { tool: ToolLauncher }) {
  const tone =
    tool.emphasis === "primary"
      ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
      : "border-border bg-card/40 text-foreground hover:bg-card/60";
  const inner = (
    <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${tone}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium">{tool.label}</div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {tool.description}
        </p>
        {!tool.route && tool.blockedReason && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 inline-flex items-center gap-1">
            <Lock className="h-3 w-3" /> {tool.blockedReason}
          </p>
        )}
      </div>
      {tool.route && <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />}
    </div>
  );
  if (tool.route) {
    return (
      <Link to={tool.route} className="block hover:opacity-95 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div aria-disabled>{inner}</div>;
}

export interface CustomerWorkbenchPanelProps {
  customer: Record<string, unknown>;
  className?: string;
}

export function CustomerWorkbenchPanel({ customer, className }: CustomerWorkbenchPanelProps) {
  const state: CustomerWorkState = getCustomerWorkState(customer);
  const primary = state.toolLaunchers.filter((t) => t.emphasis === "primary");
  const secondary = state.toolLaunchers.filter((t) => t.emphasis === "secondary");

  return (
    <div
      className={"rounded-xl border border-border bg-card/40 p-4 " + (className ?? "")}
      data-testid="customer-workbench-panel"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
            <Briefcase className="h-3 w-3" /> Current Work
          </div>
          <div className="text-sm text-foreground font-medium mt-1">
            {state.laneLabel} · {state.lifecycleLabel}
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-snug">
            {state.currentWork} {state.nextStep}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded border border-border">
            {ACCOUNT_KIND_LABEL[state.accountKind]}
          </span>
          {state.isArchived && (
            <span className="px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-300">
              Archived
            </span>
          )}
        </div>
      </div>

      {state.blockedReason && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-100 text-xs px-3 py-2 mb-3">
          {state.blockedReason}
        </div>
      )}

      {primary.length > 0 && (
        <div className="space-y-2">
          {primary.map((t) => (
            <LauncherButton key={t.id} tool={t} />
          ))}
        </div>
      )}

      {secondary.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Supporting tools
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {secondary.map((t) => (
              <LauncherButton key={t.id} tool={t} />
            ))}
          </div>
        </div>
      )}

      {primary.length === 0 && secondary.length === 0 && !state.blockedReason && (
        <div className="text-xs text-muted-foreground italic">
          No lane-specific tools to launch right now.
        </div>
      )}
    </div>
  );
}

export default CustomerWorkbenchPanel;
