/**
 * P93E-E2G-P2.7C — Shared workflow empty/blocked state primitive.
 *
 * Replaces vague "No data" / "Nothing here" / "Select a customer" copy with
 * a specific block that answers, for any admin workspace surface:
 *   - what is missing
 *   - why it matters
 *   - what to do next
 *   - the primary action (when one is available)
 *
 * Two visual tones:
 *   - "empty"   — neutral muted card (nothing exists yet)
 *   - "blocked" — amber-tinted card (something is gating the next step)
 *
 * This is presentation only. It does not fetch state. Callers compose the
 * `title`, `body`, and `primary` action from existing workflow helpers
 * (e.g. `getCustomerWorkState`, `getAdminNextActions`) so logic stays
 * centralized.
 */
import { Link } from "react-router-dom";
import { AlertTriangle, Inbox } from "lucide-react";

export type WorkflowEmptyTone = "empty" | "blocked";

export interface WorkflowEmptyAction {
  label: string;
  to?: string;
  onClick?: () => void;
  /** Internal id for tests. */
  testId?: string;
}

export interface WorkflowEmptyStateProps {
  tone?: WorkflowEmptyTone;
  /** Specific, plain-English title. e.g. "No diagnostic interview started yet." */
  title: string;
  /** Why this matters / what to do next. Plain English. */
  body?: string;
  /** Primary CTA. Optional — omit when the next step lives elsewhere. */
  primary?: WorkflowEmptyAction;
  /** Optional secondary CTA. */
  secondary?: WorkflowEmptyAction;
  /** Test id for the wrapping block. */
  testId?: string;
}

function ActionButton({ action, variant }: { action: WorkflowEmptyAction; variant: "primary" | "secondary" }) {
  const cls =
    variant === "primary"
      ? "inline-flex items-center justify-center h-9 px-4 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-secondary transition-colors"
      : "inline-flex items-center justify-center h-9 px-4 rounded-md border border-border text-xs text-foreground hover:bg-muted/30 transition-colors";
  if (action.to) {
    return (
      <Link to={action.to} className={cls} data-testid={action.testId}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cls} data-testid={action.testId}>
      {action.label}
    </button>
  );
}

export function WorkflowEmptyState({
  tone = "empty",
  title,
  body,
  primary,
  secondary,
  testId,
}: WorkflowEmptyStateProps) {
  const blocked = tone === "blocked";
  const wrapperCls = blocked
    ? "rounded-lg border border-amber-400/30 bg-amber-400/5 p-6 text-left"
    : "rounded-lg border border-dashed border-border bg-card/40 p-6 text-left";
  const Icon = blocked ? AlertTriangle : Inbox;
  const iconCls = blocked ? "h-4 w-4 text-amber-300" : "h-4 w-4 text-muted-foreground";
  return (
    <div className={wrapperCls} data-testid={testId ?? "workflow-empty-state"} data-tone={tone}>
      <div className="flex items-start gap-3">
        <Icon className={`${iconCls} mt-0.5 shrink-0`} aria-hidden />
        <div className="min-w-0 space-y-2">
          <div className="text-sm text-foreground">{title}</div>
          {body ? <div className="text-xs text-muted-foreground leading-relaxed">{body}</div> : null}
          {(primary || secondary) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {primary ? <ActionButton action={primary} variant="primary" /> : null}
              {secondary ? <ActionButton action={secondary} variant="secondary" /> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkflowEmptyState;