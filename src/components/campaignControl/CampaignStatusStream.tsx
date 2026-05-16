/**
 * P104 — Campaign Status Stream.
 *
 * Chronological / priority-ordered list of real Campaign Control
 * events, derived strictly from already-persisted data (briefs,
 * assets, connection proofs). Never invents events. Never implies
 * platform posting, scheduling, paid ads, or live analytics.
 *
 * Two variants:
 *  - "admin"  — surfaces admin-safe detail (status transitions,
 *               draft / needs-review states).
 *  - "client" — filters admin-only detail; only shows approvals,
 *               manual-publish-ready states, and connection-status
 *               summaries that are client-safe.
 */
import {
  CheckCircle2,
  Clock,
  FileText,
  Megaphone,
  ShieldCheck,
  Video,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignStreamTone =
  | "neutral"
  | "ready"
  | "attention"
  | "blocked"
  | "info";

export type CampaignStreamIcon =
  | "brief"
  | "asset"
  | "approval"
  | "video"
  | "report"
  | "connection"
  | "review"
  | "warning";

export interface CampaignStreamEvent {
  id: string;
  label: string;
  detail?: string;
  /** ISO timestamp for ordering. Optional. */
  timestamp?: string | null;
  tone: CampaignStreamTone;
  icon: CampaignStreamIcon;
  /** Admin-only. Hidden from "client" variant. */
  adminOnly?: boolean;
  /** Extra admin-only diagnostic note. Hidden from "client" variant. */
  adminNote?: string;
}

const ICON: Record<CampaignStreamIcon, typeof CheckCircle2> = {
  brief: FileText,
  asset: Megaphone,
  approval: ShieldCheck,
  video: Video,
  report: Layers,
  connection: ShieldCheck,
  review: Clock,
  warning: AlertTriangle,
};

const TONE_DOT: Record<CampaignStreamTone, string> = {
  neutral: "border-border bg-background text-muted-foreground",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  attention: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  blocked: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  info: "border-primary/40 bg-primary/10 text-primary",
};

function fmtWhen(ts?: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

export interface CampaignStatusStreamProps {
  events: CampaignStreamEvent[];
  variant?: "admin" | "client";
  title?: string;
  className?: string;
  /** Optional honest footnote shown under the stream. */
  footnote?: string;
}

export function CampaignStatusStream({
  events,
  variant = "admin",
  title = "Campaign status stream",
  className,
  footnote,
}: CampaignStatusStreamProps) {
  const filtered =
    variant === "client" ? events.filter((e) => !e.adminOnly) : events;

  return (
    <section
      data-testid="campaign-status-stream"
      data-variant={variant}
      className={cn(
        "rounded-xl border border-border bg-card/40 p-4",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Status stream
          </div>
          <h3 className="mt-0.5 text-sm text-foreground">{title}</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-lg border border-border bg-background/30 p-3 text-xs text-muted-foreground"
          data-testid="campaign-status-stream-empty"
        >
          {variant === "client"
            ? "No campaign activity has been approved for delivery yet."
            : "No campaign activity recorded yet. Create or select a campaign brief to begin."}
        </div>
      ) : (
        <ol className="relative space-y-3 border-l border-border/60 pl-4">
          {filtered.map((ev) => {
            const Ico = ICON[ev.icon] ?? CheckCircle2;
            const when = fmtWhen(ev.timestamp);
            return (
              <li
                key={ev.id}
                data-testid={`campaign-status-event-${ev.id}`}
                className="relative"
              >
                <span
                  className={cn(
                    "absolute -left-[22px] flex h-5 w-5 items-center justify-center rounded-full border",
                    TONE_DOT[ev.tone],
                  )}
                >
                  <Ico className="h-2.5 w-2.5" />
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm text-foreground">{ev.label}</div>
                  {when ? (
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {when}
                    </span>
                  ) : null}
                </div>
                {ev.detail ? (
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    {ev.detail}
                  </p>
                ) : null}
                {variant === "admin" && ev.adminNote ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                    <span className="text-foreground/70">Admin note: </span>
                    {ev.adminNote}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {footnote ? (
        <p className="mt-3 text-[11px] text-muted-foreground">{footnote}</p>
      ) : null}
    </section>
  );
}

/**
 * Derive a Campaign Status Stream from already-persisted records.
 * Pure, deterministic, side-effect free. Returns priority-ordered
 * events (most recent first). Never invents events that lack data.
 */
export function buildCampaignStatusStreamEvents(input: {
  briefs?: Array<Record<string, any>> | null;
  assets?: Array<Record<string, any>> | null;
  proofs?: Array<Record<string, any>> | null;
}): CampaignStreamEvent[] {
  const events: CampaignStreamEvent[] = [];
  const briefs = input.briefs ?? [];
  const assets = input.assets ?? [];
  const proofs = input.proofs ?? [];

  for (const b of briefs) {
    const status = String(b.status ?? "draft");
    const ts = b.updated_at ?? b.created_at ?? null;
    if (status === "approved" || b.client_visible === true) {
      events.push({
        id: `brief-approved-${b.id ?? Math.random()}`,
        label: "Campaign brief approved for delivery",
        detail: b.objective ? String(b.objective) : undefined,
        timestamp: ts,
        tone: "ready",
        icon: "approval",
      });
    } else if (status === "needs_review") {
      events.push({
        id: `brief-review-${b.id ?? Math.random()}`,
        label: "Campaign brief needs review",
        detail: b.objective ? String(b.objective) : undefined,
        timestamp: ts,
        tone: "attention",
        icon: "brief",
        adminOnly: true,
      });
    } else {
      events.push({
        id: `brief-draft-${b.id ?? Math.random()}`,
        label: "Campaign brief draft created",
        detail: b.objective ? String(b.objective) : undefined,
        timestamp: ts,
        tone: "info",
        icon: "brief",
        adminOnly: true,
      });
    }
  }

  for (const a of assets) {
    const approval = String(a.approval_status ?? "draft");
    const publishing = String(a.publishing_status ?? "");
    const safety = String(a.safety_status ?? "");
    const ts = a.updated_at ?? a.created_at ?? a.approved_at ?? null;
    const title = a.title ? String(a.title) : "Campaign asset";

    if (publishing === "posted_manually") {
      events.push({
        id: `asset-manual-${a.id}`,
        label: `${title} — manually posted (recorded)`,
        detail:
          "Marked manually posted by admin. No platform publishing integration was used.",
        timestamp: a.posted_at ?? ts,
        tone: "ready",
        icon: "asset",
      });
      continue;
    }
    if (publishing === "ready_for_manual_post") {
      events.push({
        id: `asset-ready-${a.id}`,
        label: `${title} — ready for manual upload`,
        detail:
          "Approved. RGS does not post to platforms in this phase; upload manually outside the OS.",
        timestamp: ts,
        tone: "ready",
        icon: "approval",
      });
      continue;
    }
    if (approval === "approved") {
      events.push({
        id: `asset-approved-${a.id}`,
        label: `${title} — approved for delivery`,
        timestamp: a.approved_at ?? ts,
        tone: "ready",
        icon: "approval",
      });
      continue;
    }
    if (approval === "needs_review") {
      events.push({
        id: `asset-review-${a.id}`,
        label: `${title} — needs review`,
        detail:
          safety && safety !== "passed"
            ? `Safety check: ${safety.replace(/_/g, " ")}`
            : undefined,
        timestamp: ts,
        tone: "attention",
        icon: "review",
        adminOnly: true,
      });
      continue;
    }
    if (approval === "rejected") {
      events.push({
        id: `asset-rejected-${a.id}`,
        label: `${title} — rejected`,
        timestamp: ts,
        tone: "blocked",
        icon: "warning",
        adminOnly: true,
      });
      continue;
    }
    events.push({
      id: `asset-draft-${a.id}`,
      label: `${title} — draft generated`,
      timestamp: ts,
      tone: "info",
      icon: "asset",
      adminOnly: true,
    });
  }

  if (proofs.length === 0) {
    events.push({
      id: "no-connection-proof",
      label: "No platform publishing or analytics connection is proven",
      detail:
        "Manual posting and manual tracking remain available. No platform publishing is connected in this phase.",
      tone: "attention",
      icon: "connection",
    });
  } else {
    for (const p of proofs) {
      const status = String(p.status ?? "");
      const ready =
        status === "verified_live" || status === "sync_success";
      events.push({
        id: `proof-${p.id ?? `${p.provider}-${p.capability}`}`,
        label: `${p.provider} ${p.capability} — ${status.replace(/_/g, " ") || "status unknown"}`,
        detail: p.client_safe_summary
          ? String(p.client_safe_summary)
          : undefined,
        timestamp: p.last_verified_at ?? p.last_sync_at ?? null,
        tone: ready ? "ready" : "attention",
        icon: "connection",
      });
    }
  }

  events.sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });

  return events;
}

export default CampaignStatusStream;