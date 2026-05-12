/**
 * P93C — Admin Tool Guide Panel.
 *
 * Surfaces the recommended tools for an account along with purpose,
 * when to use, inputs, output, review requirements, and common mistakes.
 */
import {
  getRecommendedToolsForAccount,
  getToolBlockedReason,
  type AdminToolGuideEntry,
  type WorkflowContext,
} from "@/lib/workflowClarity/toolUseGuide";
import {
  classifyAccount,
  type AccountInput,
} from "@/lib/accounts/accountClassification";
import { Wrench, ShieldAlert } from "lucide-react";

function ToolEntry({
  entry,
  blockedReason,
}: {
  entry: AdminToolGuideEntry;
  blockedReason: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="text-sm font-medium text-foreground flex items-center gap-2">
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          {entry.toolName}
        </div>
        {blockedReason && (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-destructive">
            <ShieldAlert className="h-3 w-3" />
            Locked
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{entry.purpose}</p>
      {blockedReason ? (
        <p className="text-[11px] text-destructive mt-2">{blockedReason}</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-foreground/80">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              When to use
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              {entry.bestUsedWhen.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Common mistakes
            </div>
            <ul className="list-disc pl-4 space-y-0.5">
              {entry.commonMistakesToAvoid.slice(0, 3).map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Inputs needed
            </div>
            <div>{entry.requiredInputs.join(", ") || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Output
            </div>
            <div>
              {entry.outputType.replace(/_/g, " ")}
              {entry.adminReviewRequired ? " · admin review required" : ""}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Next step after use
            </div>
            <div>{entry.nextStepAfterUse.join(" → ") || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface AdminToolGuidePanelProps {
  input: AccountInput;
  workflowContext?: WorkflowContext;
  className?: string;
  limit?: number;
}

export function AdminToolGuidePanel({
  input,
  workflowContext,
  className,
  limit = 5,
}: AdminToolGuidePanelProps) {
  const c = classifyAccount(input);
  const recommended = getRecommendedToolsForAccount(input, workflowContext).slice(0, limit);

  return (
    <div
      className={
        "rounded-xl border border-border bg-card/40 p-4 " + (className ?? "")
      }
      data-testid="admin-tool-guide-panel"
    >
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Recommended Tools for This Account
        </div>
        <div className="text-sm text-foreground font-medium">
          {c.displayLabel}
        </div>
      </div>
      {recommended.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No tools are available for this account right now. Resolve account status first.
        </p>
      ) : (
        <div className="space-y-2">
          {recommended.map((entry) => (
            <ToolEntry
              key={entry.toolId}
              entry={entry}
              blockedReason={getToolBlockedReason(entry.toolId, input)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminToolGuidePanel;