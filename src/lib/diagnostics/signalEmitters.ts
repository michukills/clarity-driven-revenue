/* P10.2d — Signal emitters.
 *
 * Thin adapters that translate domain events (a saved weekly check-in,
 * an updated review status, a new Impact Ledger entry, an ended tool
 * usage session) into structured insight signals via `recordInsightSignal`.
 *
 * These emitters NEVER throw out of the calling flow — they swallow errors
 * because they live downstream of user-facing actions and must not break
 * the underlying save.
 *
 * Per-client learning controls are honored inside `recordInsightSignal`.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  recordInsightSignal,
  recordInsightSignals,
  type InsightSignalInput,
} from "./insightSignals";

async function safe<T>(p: PromiseLike<T>): Promise<T | null> {
  try {
    return await p;
  } catch (e) {
    if (typeof console !== "undefined") {
      console.warn("[signalEmitters] suppressed:", (e as Error)?.message);
    }
    return null;
  }
}

function rank(value: string | null | undefined): 0 | 1 | 2 | 3 {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v.includes("crit") || v.includes("urgent") || v.includes("severe")) return 3;
  if (v.includes("high") || v.includes("low") || v.includes("weak") || v.includes("poor"))
    return 2;
  if (v.includes("med") || v.includes("watch") || v.includes("mixed") || v.includes("some"))
    return 1;
  return 0;
}

// ─────────────────────────── Weekly check-in ───────────────────────────

export interface WeeklyCheckinSignalContext {
  customerId: string;
  /** week_end is the natural id surface for upserted check-ins. */
  weekEnd: string;
  cashConcern?: string | null;
  pipelineConfidence?: string | null;
  dataQuality?: string | null;
  repeatedIssue?: boolean | null;
  requestRgsReview?: boolean | null;
  processBlocker?: string | null;
  peopleBlocker?: string | null;
  salesBlocker?: string | null;
  cashBlocker?: string | null;
  ownerBottleneck?: string | null;
}

/**
 * Emit signals after a weekly check-in is saved. Looks up the row id by
 * (customer_id, week_end) so the signals reference the canonical row.
 */
export async function emitWeeklyCheckinSignals(
  ctx: WeeklyCheckinSignalContext,
): Promise<void> {
  if (!ctx.customerId || !ctx.weekEnd) return;

  const { data: row } = await safe(
    supabase
      .from("weekly_checkins")
      .select("id, week_start, week_end")
      .eq("customer_id", ctx.customerId)
      .eq("week_end", ctx.weekEnd)
      .maybeSingle(),
  ) as any;
  const sourceId: string | null = row?.id ?? null;
  const occurredAt = row?.week_end
    ? new Date(row.week_end).toISOString()
    : new Date().toISOString();

  const inputs: InsightSignalInput[] = [];
  const base = {
    customer_id: ctx.customerId,
    signal_source: "weekly_checkin" as const,
    source_table: "weekly_checkins",
    source_id: sourceId,
    occurred_at: occurredAt,
  };

  // Missing source data — partial / estimated / unsure data quality.
  const dq = (ctx.dataQuality ?? "").toLowerCase();
  if (dq && /partial|estimat|unsure|guess|incomplete/.test(dq)) {
    inputs.push({
      ...base,
      signal_type: "missing_source_data",
      strength: "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Source data incomplete",
      evidence_summary: `Weekly check-in marked data quality as "${ctx.dataQuality}".`,
    });
  }

  // Cash pressure.
  const cashRank = rank(ctx.cashConcern);
  if (cashRank >= 2) {
    inputs.push({
      ...base,
      signal_type: "cash_pressure",
      strength: cashRank === 3 ? "high" : "medium",
      confidence: "medium",
      related_pillar: "financial_visibility",
      evidence_label: "Cash concern reported",
      evidence_summary: `Cash concern marked "${ctx.cashConcern}" on this weekly check-in.`,
      client_safe: true,
    });
  }

  // Pipeline risk.
  const pipeRank = rank(ctx.pipelineConfidence);
  if (pipeRank >= 2) {
    inputs.push({
      ...base,
      signal_type: "pipeline_risk",
      strength: pipeRank === 3 ? "high" : "medium",
      confidence: "medium",
      related_pillar: "demand_generation",
      evidence_label: "Low pipeline confidence",
      evidence_summary: `Pipeline confidence reported as "${ctx.pipelineConfidence}".`,
    });
  }

  // Recurring blocker — repeated issue flag, or any blocker text present.
  const blockers = [
    ctx.processBlocker,
    ctx.peopleBlocker,
    ctx.salesBlocker,
    ctx.cashBlocker,
    ctx.ownerBottleneck,
  ].filter((b): b is string => !!b && b.trim().length > 0);
  if (ctx.repeatedIssue || blockers.length > 0) {
    const label = ctx.repeatedIssue
      ? "Repeated issue flagged"
      : "Operating blocker reported";
    inputs.push({
      ...base,
      signal_type: "recurring_blocker",
      strength: ctx.repeatedIssue ? "high" : "medium",
      confidence: ctx.repeatedIssue ? "high" : "medium",
      related_pillar: "operational_efficiency",
      evidence_label: label,
      evidence_summary: blockers.length
        ? `Blockers reported in ${blockers.length} area(s) on this weekly check-in.`
        : "Repeated issue flag set on this weekly check-in.",
    });
  }

  // Owner dependency — owner bottleneck text.
  if (ctx.ownerBottleneck && ctx.ownerBottleneck.trim()) {
    inputs.push({
      ...base,
      signal_type: "owner_dependency",
      strength: "medium",
      confidence: "medium",
      related_pillar: "owner_independence",
      evidence_label: "Owner bottleneck reported",
      evidence_summary: "Owner-as-bottleneck noted on this weekly check-in.",
    });
  }

  // Review requested.
  if (ctx.requestRgsReview) {
    inputs.push({
      ...base,
      signal_type: "review_requested",
      strength: "high",
      confidence: "high",
      related_pillar: null,
      evidence_label: "RGS review requested",
      evidence_summary: "Client requested RGS review on this weekly check-in.",
    });
  }

  await recordInsightSignals(inputs);
}

// ─────────────────────────── RGS review queue ───────────────────────────

export type ReviewSignalNextStatus =
  | "open"
  | "reviewing"
  | "resolved"
  | "dismissed"
  | "follow_up_needed";

export async function emitReviewStatusSignal(args: {
  customerId: string;
  requestId: string;
  nextStatus: ReviewSignalNextStatus;
  note?: string | null;
}): Promise<void> {
  const base = {
    customer_id: args.customerId,
    signal_source: "rgs_review" as const,
    source_table: "rgs_review_requests",
    source_id: args.requestId,
  };
  const inputs: InsightSignalInput[] = [];

  if (args.nextStatus === "reviewing" || args.nextStatus === "open") {
    inputs.push({
      ...base,
      signal_type: "review_requested",
      strength: "medium",
      confidence: "high",
      related_pillar: null,
      evidence_label: "RGS review in progress",
      evidence_summary: "Review request opened or moved into review.",
    });
  }
  if (args.nextStatus === "resolved" || args.nextStatus === "dismissed") {
    inputs.push({
      ...base,
      signal_type: "review_resolved",
      strength: "medium",
      confidence: "high",
      related_pillar: null,
      evidence_label: "RGS review resolved",
      evidence_summary:
        args.note?.trim()
          ? `Resolved with note: ${args.note.trim().slice(0, 200)}`
          : "Review request was resolved.",
    });
  }
  if (args.nextStatus === "follow_up_needed") {
    inputs.push({
      ...base,
      signal_type: "follow_up_gap",
      strength: "medium",
      confidence: "medium",
      related_pillar: "operational_efficiency",
      evidence_label: "Follow-up needed",
      evidence_summary:
        args.note?.trim()
          ? `Follow-up flagged: ${args.note.trim().slice(0, 200)}`
          : "Review marked as needing follow-up.",
    });
  }

  await recordInsightSignals(inputs);
}

// ─────────────────────────── Impact Ledger ───────────────────────────

export interface ImpactLedgerSignalInput {
  customerId: string;
  entryId: string;
  impactType: string;
  impactArea: string;
  title: string;
  status: string;
  visibility: string;
  confidenceLevel: "low" | "medium" | "high";
}

const PILLAR_BY_AREA: Record<string, InsightSignalInput["related_pillar"]> = {
  demand_generation: "demand_generation",
  revenue_conversion: "revenue_conversion",
  operational_efficiency: "operational_efficiency",
  financial_visibility: "financial_visibility",
  owner_independence: "owner_independence",
};

export async function emitImpactLedgerSignal(
  args: ImpactLedgerSignalInput,
): Promise<void> {
  const pillar = PILLAR_BY_AREA[args.impactArea] ?? null;
  const base = {
    customer_id: args.customerId,
    signal_source: "impact_ledger" as const,
    source_table: "customer_impact_ledger",
    source_id: args.entryId,
    related_pillar: pillar,
    confidence: args.confidenceLevel,
    client_safe: args.visibility === "client_visible",
  };

  let signal_type: InsightSignalInput["signal_type"] = "report_insight";
  if (
    args.status === "resolved" ||
    args.status === "verified" ||
    /risk|leak/i.test(args.impactType)
  ) {
    signal_type = "resolved_issue";
  } else if (/process|install|implement/i.test(args.impactType)) {
    signal_type = "implementation_progress";
  } else if (/leak/i.test(args.impactType)) {
    signal_type = "revenue_leak";
  } else if (/clarity|insight|strength/i.test(args.impactType)) {
    signal_type = "validated_strength";
  }

  await recordInsightSignal({
    ...base,
    signal_type,
    strength: args.confidenceLevel === "high" ? "high" : "medium",
    evidence_label: `Impact: ${args.title}`.slice(0, 140),
    evidence_summary: `Impact Ledger entry recorded (${args.impactType} / ${args.impactArea}, status ${args.status}).`,
  });
}

// ─────────────────────────── Tool usage ───────────────────────────

const ENGAGEMENT_THRESHOLD_SECONDS = 300; // 5 min active = meaningful
const ABANDONMENT_THRESHOLD_SECONDS = 30; // <30s active = abandonment
const ABANDONMENT_MIN_SESSIONS = 3;

export interface ToolUsageEndedInput {
  customerId: string;
  sessionId: string;
  toolKey: string | null;
  toolTitle: string;
  activeSeconds: number;
  exitReason?: string | null;
}

/**
 * Aggregated tool usage signal:
 *  - emit `high_engagement` once per session that crosses the meaningful threshold
 *  - emit `tool_abandonment` after N short sessions on the same tool inside 14 days
 * Per-session noise is intentionally avoided.
 */
export async function emitToolUsageSignal(
  args: ToolUsageEndedInput,
): Promise<void> {
  const toolKey = args.toolKey ?? args.toolTitle;
  if (!toolKey) return;

  if (args.activeSeconds >= ENGAGEMENT_THRESHOLD_SECONDS) {
    await recordInsightSignal({
      customer_id: args.customerId,
      signal_source: "tool_usage",
      signal_type: "high_engagement",
      source_table: "tool_usage_sessions",
      source_id: args.sessionId,
      strength: args.activeSeconds >= 1200 ? "high" : "medium",
      confidence: "medium",
      related_pillar: null,
      evidence_label: `Engaged with ${args.toolTitle}`,
      evidence_summary: `Active for ${Math.round(
        args.activeSeconds / 60,
      )} min in a single session of ${args.toolTitle}.`,
      metadata: { tool_key: toolKey, active_seconds: args.activeSeconds },
    });
    return;
  }

  // Short session — only emit abandonment if there's a recurring pattern.
  if (args.activeSeconds <= ABANDONMENT_THRESHOLD_SECONDS) {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await safe(
      supabase
        .from("tool_usage_sessions")
        .select("id, active_seconds, tool_key, tool_title")
        .eq("customer_id", args.customerId)
        .gte("started_at", since)
        .lte("active_seconds", ABANDONMENT_THRESHOLD_SECONDS),
    ) as any;
    if (error || !Array.isArray(data)) return;
    const sameTool = data.filter(
      (r: any) => (r.tool_key ?? r.tool_title) === toolKey,
    );
    if (sameTool.length >= ABANDONMENT_MIN_SESSIONS) {
      await recordInsightSignal({
        customer_id: args.customerId,
        signal_source: "tool_usage",
        signal_type: "tool_abandonment",
        source_table: "tool_usage_sessions",
        source_id: args.sessionId,
        strength: "medium",
        confidence: "medium",
        related_pillar: null,
        evidence_label: `Repeated quick exits from ${args.toolTitle}`,
        evidence_summary: `${sameTool.length} short sessions (<${ABANDONMENT_THRESHOLD_SECONDS}s active) for ${args.toolTitle} in the last 14 days.`,
        metadata: { tool_key: toolKey, short_sessions: sameTool.length },
      });
    }
  }
}