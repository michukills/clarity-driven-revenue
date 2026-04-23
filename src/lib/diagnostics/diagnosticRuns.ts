/**
 * P11.8 — Diagnostic sub-tools reactivation.
 *
 * Durable, versioned, signal-emitting persistence layer for the diagnostic
 * sub-tools (Stability Scorecard, Revenue Leak Finder, Persona Builder,
 * Journey Mapper, Process Breakdown).
 *
 * Each save creates a new versioned row in `diagnostic_tool_runs`, computes
 * a comparison summary versus the prior run, and emits insight signals when
 * the run reveals a material truth. Learning controls are honored (signal
 * emission lives in `diagnosticRunSignalEmitter`).
 */

import { supabase } from "@/integrations/supabase/client";

export type DiagnosticToolKey =
  | "rgs_stability_scorecard"
  | "revenue_leak_finder"
  | "buyer_persona_tool"
  | "customer_journey_mapper"
  | "process_breakdown_tool";

export const DIAGNOSTIC_TOOL_KEYS: DiagnosticToolKey[] = [
  "rgs_stability_scorecard",
  "revenue_leak_finder",
  "buyer_persona_tool",
  "customer_journey_mapper",
  "process_breakdown_tool",
];

export const DIAGNOSTIC_TOOL_LABELS: Record<DiagnosticToolKey, string> = {
  rgs_stability_scorecard: "Business Stability Index™",
  revenue_leak_finder: "Revenue Leak Detection Engine™",
  buyer_persona_tool: "Buyer Intelligence Engine™",
  customer_journey_mapper: "Customer Journey Mapping System™",
  process_breakdown_tool: "Process Clarity Engine™",
};

export type DiagnosticRunStatus = "draft" | "completed" | "archived";

export interface DiagnosticToolRunRow {
  id: string;
  customer_id: string;
  tool_key: string;
  tool_label: string | null;
  version_number: number;
  status: DiagnosticRunStatus;
  run_date: string;
  result_summary: string | null;
  result_payload: Record<string, unknown>;
  comparison_summary: string | null;
  prior_run_id: string | null;
  is_latest: boolean;
  result_score: number | null;
  confidence: string | null;
  source: string | null;
  source_ref: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function isDiagnosticToolKey(k: string | null | undefined): k is DiagnosticToolKey {
  return !!k && (DIAGNOSTIC_TOOL_KEYS as string[]).includes(k);
}

/* ───────────────────────── result extraction ───────────────────────── */

/**
 * Pull a normalized score (0–100, higher = healthier) and confidence from
 * the loose summary/payload shape produced by each diagnostic tool. Tools
 * vary, so we look in a small set of well-known places.
 */
export function extractScore(payload: any, summary: any): number | null {
  const candidates: any[] = [
    summary?.score,
    summary?.health,
    summary?.overall_score,
    summary?.overall,
    payload?.result?.score,
    payload?.score,
  ];
  for (const v of candidates) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  return null;
}

export function extractConfidence(payload: any, summary: any): string | null {
  const v = summary?.confidence ?? payload?.confidence ?? null;
  return typeof v === "string" ? v : null;
}

/**
 * Build a short human-readable result summary line for an admin list row.
 * Falls back to a count of structured fields so something always shows.
 */
export function buildResultSummary(toolKey: string, payload: any, summary: any): string {
  const s = summary && typeof summary === "object" ? summary : {};
  const score = extractScore(payload, summary);
  const parts: string[] = [];
  if (score != null) parts.push(`Score ${score}/100`);
  if (typeof s.band === "string") parts.push(String(s.band));
  if (typeof s.headline === "string") parts.push(s.headline);
  if (typeof s.status === "string") parts.push(s.status);
  if (Array.isArray(s.top_categories) && s.top_categories.length) {
    parts.push(`Top: ${s.top_categories.slice(0, 2).join(", ")}`);
  }
  if (parts.length === 0) {
    const keys = Object.keys(s).slice(0, 3);
    if (keys.length) parts.push(`${keys.length} field(s) captured`);
    else parts.push(`${DIAGNOSTIC_TOOL_LABELS[toolKey as DiagnosticToolKey] ?? toolKey} run completed`);
  }
  return parts.join(" · ");
}

/**
 * Compare two runs and return a one-liner describing change direction.
 */
export function buildComparisonSummary(
  current: { score: number | null; payload: any },
  prior: { score: number | null; payload: any } | null,
): string {
  if (!prior) return "First recorded run for this tool — no prior baseline yet.";
  const cs = current.score;
  const ps = prior.score;
  if (cs != null && ps != null) {
    const delta = cs - ps;
    if (Math.abs(delta) < 1) return `Unchanged versus prior run (score ${cs}).`;
    if (delta > 0) return `Improved by ${delta} pts versus prior run (${ps} → ${cs}).`;
    return `Worsened by ${Math.abs(delta)} pts versus prior run (${ps} → ${cs}).`;
  }
  return "Prior run recorded but no comparable score — manual review recommended.";
}

/* ───────────────────────── persistence ───────────────────────── */

export async function listDiagnosticRuns(
  customerId: string,
  toolKey?: DiagnosticToolKey,
): Promise<DiagnosticToolRunRow[]> {
  let q = supabase
    .from("diagnostic_tool_runs" as any)
    .select("*")
    .eq("customer_id", customerId)
    .order("run_date", { ascending: false })
    .limit(200);
  if (toolKey) q = q.eq("tool_key", toolKey);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as DiagnosticToolRunRow[];
}

export async function getLatestRun(
  customerId: string,
  toolKey: DiagnosticToolKey,
): Promise<DiagnosticToolRunRow | null> {
  const { data, error } = await supabase
    .from("diagnostic_tool_runs" as any)
    .select("*")
    .eq("customer_id", customerId)
    .eq("tool_key", toolKey)
    .eq("is_latest", true)
    .maybeSingle();
  if (error) return null;
  return (data as unknown as DiagnosticToolRunRow) ?? null;
}

export interface RecordRunInput {
  customerId: string;
  toolKey: DiagnosticToolKey;
  toolLabel?: string;
  payload: Record<string, unknown>;
  summary: Record<string, unknown>;
  source?: string;
  sourceRef?: string;
  status?: DiagnosticRunStatus;
}

export interface RecordRunResult {
  run: DiagnosticToolRunRow;
  prior: DiagnosticToolRunRow | null;
}

/**
 * Persist a new diagnostic run. Always inserts a new row (re-runs preserve
 * history). Computes version + comparison summary against the prior latest.
 */
export async function recordDiagnosticRun(input: RecordRunInput): Promise<RecordRunResult | null> {
  if (!input.customerId || !input.toolKey) return null;

  const prior = await getLatestRun(input.customerId, input.toolKey);
  const score = extractScore(input.payload, input.summary);
  const confidence = extractConfidence(input.payload, input.summary);
  const result_summary = buildResultSummary(input.toolKey, input.payload, input.summary);
  const comparison_summary = buildComparisonSummary(
    { score, payload: input.payload },
    prior ? { score: prior.result_score, payload: prior.result_payload } : null,
  );

  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;

  const row = {
    customer_id: input.customerId,
    tool_key: input.toolKey,
    tool_label: input.toolLabel ?? DIAGNOSTIC_TOOL_LABELS[input.toolKey] ?? input.toolKey,
    version_number: (prior?.version_number ?? 0) + 1,
    status: input.status ?? "completed",
    run_date: new Date().toISOString(),
    result_summary,
    result_payload: { ...input.payload, summary: input.summary },
    comparison_summary,
    prior_run_id: prior?.id ?? null,
    is_latest: true,
    result_score: score,
    confidence,
    source: input.source ?? "manual",
    source_ref: input.sourceRef ?? null,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("diagnostic_tool_runs" as any)
    .insert([row])
    .select("*")
    .single();
  if (error) {
    if (typeof console !== "undefined") {
      console.warn("[diagnosticRuns] insert failed:", error.message);
    }
    return null;
  }
  return { run: data as unknown as DiagnosticToolRunRow, prior };
}

export async function archiveRun(id: string): Promise<void> {
  await supabase
    .from("diagnostic_tool_runs" as any)
    .update({ status: "archived", is_latest: false })
    .eq("id", id);
}
