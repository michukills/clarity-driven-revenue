/**
 * P93C — Admin Next Action Panel.
 *
 * Renders the deterministic next safe actions for an account. Pure
 * presentation. Uses `react-router-dom` Link for navigation when a route
 * exists; otherwise renders a disabled button with a plain-English reason.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Lock, ShieldAlert } from "lucide-react";
import {
  getAdminNextActions,
  type AdminNextAction,
  type AdminWorkflowContext,
} from "@/lib/workflowClarity/adminNextActions";
import {
  classifyAccount,
  type AccountInput,
} from "@/lib/accounts/accountClassification";

const PRIORITY_TONE: Record<AdminNextAction["priority"], string> = {
  primary: "border-primary/40 bg-primary/10 text-foreground",
  secondary: "border-border bg-muted/30 text-foreground",
  warning: "border-amber-500/40 bg-amber-500/10 text-foreground",
  blocked: "border-destructive/40 bg-destructive/10 text-foreground/80",
};

function ActionRow({ action }: { action: AdminNextAction }) {
  const tone = PRIORITY_TONE[action.priority];
  const Icon = action.priority === "blocked" ? Lock : ArrowRight;

  const inner = (
    <div
      className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${tone}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium flex items-center gap-2">
          {action.priority === "blocked" && (
            <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
          )}
          {action.label}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {action.description}
        </p>
        {action.requiresAdminReview && action.priority !== "blocked" && (
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
            Admin review required before client-visible output
          </p>
        )}
      </div>
      {action.priority !== "blocked" && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      )}
    </div>
  );

  if (action.isEnabled && action.targetRoute) {
    return (
      <Link to={action.targetRoute} className="block hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div aria-disabled={!action.isEnabled}>{inner}</div>;
}

export interface AdminNextActionPanelProps {
  input: AccountInput;
  context?: AdminWorkflowContext;
  className?: string;
  compact?: boolean;
}

export function AdminNextActionPanel({
  input,
  context,
  className,
  compact,
}: AdminNextActionPanelProps) {
  const c = classifyAccount(input);
  const actions = getAdminNextActions(input, context);
  const primary = actions.filter((a) => a.priority === "primary");
  const secondary = actions.filter((a) => a.priority === "secondary" || a.priority === "warning");
  const blocked = actions.filter((a) => a.priority === "blocked");

  return (
    <div
      className={
        "rounded-xl border border-border bg-card/40 p-4 " + (className ?? "")
      }
      data-testid="admin-next-action-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Next Safe Action
          </div>
          <div className="text-sm text-foreground font-medium">
            {c.displayLabel} · scope: {c.scopeBoundary.replace(/_/g, " ")}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {primary.length === 0 && (
          <div className="text-xs text-muted-foreground italic">
            No primary action available right now.
          </div>
        )}
        {primary.map((a) => (
          <ActionRow key={a.id} action={a} />
        ))}
      </div>

      {!compact && secondary.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Other Safe Actions
          </div>
          <div className="space-y-2">
            {secondary.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </div>
        </div>
      )}

      {!compact && blocked.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Blocked / Out of Scope
          </div>
          <div className="space-y-2">
            {blocked.map((a) => (
              <ActionRow key={a.id} action={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminNextActionPanel;