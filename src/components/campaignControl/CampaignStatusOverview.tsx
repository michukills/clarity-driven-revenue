/**
 * P104 — Campaign Control status overview row.
 *
 * Compact, scannable status cards for Brief / Assets / AI Review /
 * Video Plan / Reports / Manual Execution Readiness. Pure presentation —
 * derives state from already-fetched data. Never invents events, never
 * implies posting/scheduling/analytics that are not connected.
 */
import { cn } from "@/lib/utils";

export type CampaignStatusTone =
  | "neutral"
  | "ready"
  | "attention"
  | "blocked"
  | "info";

export interface CampaignStatusCard {
  key: string;
  label: string;
  state: string;
  tone: CampaignStatusTone;
  nextAction?: string;
  detail?: string;
  countBadge?: number;
}

const TONE_CLASS: Record<CampaignStatusTone, string> = {
  neutral: "border-border bg-card/40 text-foreground",
  ready: "border-emerald-500/30 bg-emerald-500/5 text-foreground",
  attention: "border-amber-500/30 bg-amber-500/5 text-foreground",
  blocked: "border-rose-500/30 bg-rose-500/5 text-foreground",
  info: "border-primary/30 bg-primary/5 text-foreground",
};

const PILL_CLASS: Record<CampaignStatusTone, string> = {
  neutral: "border-border bg-background/60 text-muted-foreground",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  info: "border-primary/40 bg-primary/10 text-primary",
};

export function CampaignStatusOverview({
  cards,
  className,
  testId = "campaign-status-overview",
}: {
  cards: CampaignStatusCard[];
  className?: string;
  testId?: string;
}) {
  if (!cards || cards.length === 0) return null;
  return (
    <section
      data-testid={testId}
      className={cn(
        "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className,
      )}
    >
      {cards.map((c) => (
        <div
          key={c.key}
          data-testid={`campaign-status-card-${c.key}`}
          className={cn(
            "flex h-full flex-col gap-2 rounded-xl border p-3",
            TONE_CLASS[c.tone],
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {c.label}
            </div>
            {typeof c.countBadge === "number" && c.countBadge > 0 ? (
              <span className="rounded-full border border-border bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {c.countBadge}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                PILL_CLASS[c.tone],
              )}
            >
              {c.state}
            </span>
          </div>
          {c.detail ? (
            <p className="text-[11px] leading-snug text-muted-foreground">
              {c.detail}
            </p>
          ) : null}
          {c.nextAction ? (
            <p className="mt-auto text-[11px] leading-snug text-foreground/85">
              <span className="text-muted-foreground">Next: </span>
              {c.nextAction}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export default CampaignStatusOverview;