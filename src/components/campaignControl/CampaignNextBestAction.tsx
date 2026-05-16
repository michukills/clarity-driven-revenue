/**
 * P104 — Next Best Action panel.
 *
 * Pure presentation. Surfaces the single most useful next step for the
 * current Campaign Control state. Never invents work for unwired
 * features (no auto-posting, scheduling, paid ads, analytics).
 */
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CampaignNextBestActionProps {
  title: string;
  description?: string;
  hint?: string;
  variant?: "admin" | "client";
  className?: string;
}

export function CampaignNextBestAction({
  title,
  description,
  hint,
  variant = "admin",
  className,
}: CampaignNextBestActionProps) {
  return (
    <section
      data-testid="campaign-next-best-action"
      data-variant={variant}
      className={cn(
        "rounded-xl border border-primary/30 bg-primary/5 p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full border border-primary/40 bg-primary/10 p-1.5 text-primary">
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.16em] text-primary">
            Next best action
          </div>
          <div className="text-sm text-foreground">{title}</div>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
          {hint ? (
            <p className="text-[11px] text-muted-foreground/80">{hint}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default CampaignNextBestAction;