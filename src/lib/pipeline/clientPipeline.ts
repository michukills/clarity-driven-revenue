/* P11.5 — Client Sales Pipeline data layer.
 *
 * Tables:
 *   - client_pipeline_stages
 *   - client_pipeline_deals
 *
 * Admin-managed under RLS. Client SELECT allowed but no client UI yet.
 */

import { supabase } from "@/integrations/supabase/client";

export type DealStatus = "open" | "won" | "lost" | "stalled" | "archived";

export interface PipelineStage {
  id: string;
  customer_id: string;
  stage_key: string;
  label: string;
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineDeal {
  id: string;
  customer_id: string;
  title: string;
  company_or_contact: string | null;
  source_channel: string | null;
  stage_id: string | null;
  estimated_value: number;
  probability_percent: number;
  weighted_value: number;
  created_date: string;
  last_activity_date: string | null;
  expected_close_date: string | null;
  status: DealStatus;
  loss_reason: string | null;
  notes: string | null;
  source: string | null;
  source_ref: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_STAGES: Array<{ key: string; label: string; order: number }> = [
  { key: "lead", label: "Lead", order: 10 },
  { key: "qualified", label: "Qualified", order: 20 },
  { key: "booked_call", label: "Booked Call", order: 30 },
  { key: "proposal_sent", label: "Proposal Sent", order: 40 },
  { key: "negotiation", label: "Negotiation", order: 50 },
  { key: "won", label: "Won", order: 60 },
  { key: "lost", label: "Lost", order: 70 },
];

/* ---------------- stages ---------------- */

export async function listStages(customerId: string): Promise<PipelineStage[]> {
  const { data, error } = await supabase
    .from("client_pipeline_stages")
    .select("*")
    .eq("customer_id", customerId)
    .order("display_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PipelineStage[];
}

export async function ensureDefaultStages(customerId: string): Promise<PipelineStage[]> {
  const existing = await listStages(customerId);
  if (existing.length > 0) return existing;
  const rows = DEFAULT_STAGES.map((s) => ({
    customer_id: customerId,
    stage_key: s.key,
    label: s.label,
    display_order: s.order,
    active: true,
  }));
  const { error } = await supabase
    .from("client_pipeline_stages")
    .upsert(rows, { onConflict: "customer_id,stage_key", ignoreDuplicates: true });
  if (error) throw error;
  return await listStages(customerId);
}

/* ---------------- deals ---------------- */

export async function listDeals(customerId: string): Promise<PipelineDeal[]> {
  const { data, error } = await supabase
    .from("client_pipeline_deals")
    .select("*")
    .eq("customer_id", customerId)
    .order("last_activity_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as PipelineDeal[];
}

export async function createDeal(input: {
  customer_id: string;
  title: string;
  company_or_contact?: string | null;
  source_channel?: string | null;
  stage_id?: string | null;
  estimated_value?: number;
  probability_percent?: number;
  expected_close_date?: string | null;
  status?: DealStatus;
  notes?: string | null;
  source?: string | null;
  source_ref?: string | null;
}): Promise<PipelineDeal> {
  const { data: auth } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("client_pipeline_deals")
    .insert({
      customer_id: input.customer_id,
      title: input.title,
      company_or_contact: input.company_or_contact ?? null,
      source_channel: input.source_channel ?? null,
      stage_id: input.stage_id ?? null,
      estimated_value: input.estimated_value ?? 0,
      probability_percent: input.probability_percent ?? 50,
      created_date: today,
      last_activity_date: today,
      expected_close_date: input.expected_close_date ?? null,
      status: input.status ?? "open",
      notes: input.notes ?? null,
      source: input.source ?? "Manual",
      source_ref: input.source_ref ?? null,
      created_by: auth.user?.id ?? null,
      updated_by: auth.user?.id ?? null,
    })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as PipelineDeal;
}

export async function updateDeal(
  id: string,
  patch: Partial<
    Pick<
      PipelineDeal,
      | "title"
      | "company_or_contact"
      | "source_channel"
      | "stage_id"
      | "estimated_value"
      | "probability_percent"
      | "expected_close_date"
      | "status"
      | "loss_reason"
      | "notes"
      | "last_activity_date"
    >
  >,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const next = { ...patch, updated_by: auth.user?.id ?? null } as typeof patch & {
    updated_by: string | null;
    last_activity_date?: string | null;
  };
  // Touch activity when status/stage changes if not provided.
  if (("stage_id" in patch || "status" in patch) && !("last_activity_date" in patch)) {
    next.last_activity_date = new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase
    .from("client_pipeline_deals")
    .update(next)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDeal(id: string): Promise<void> {
  const { error } = await supabase.from("client_pipeline_deals").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- derived metrics ---------------- */

export interface PipelineRollup {
  open_count: number;
  open_value: number;
  weighted_value: number;
  stalled_count: number;
  stalled_value: number;
  won_count: number;
  won_value: number;
  lost_count: number;
  lost_value: number;
  aging_count: number;
  aging_value: number;
  closing_this_month_count: number;
  closing_this_month_value: number;
  proposal_to_win_rate: number | null;
  call_to_proposal_rate: number | null;
  by_stage: Array<{
    stage_id: string | null;
    label: string;
    count: number;
    value: number;
  }>;
}

const AGING_DAYS = 30;

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
}

export function isAging(deal: PipelineDeal, today: string = new Date().toISOString().slice(0, 10)): boolean {
  if (deal.status !== "open") return false;
  const last = deal.last_activity_date ?? deal.created_date;
  return daysBetween(last, today) >= AGING_DAYS;
}

export function buildPipelineRollup(args: {
  stages: PipelineStage[];
  deals: PipelineDeal[];
}): PipelineRollup {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const stageMap = new Map(args.stages.map((s) => [s.id, s.label]));

  const rollup: PipelineRollup = {
    open_count: 0,
    open_value: 0,
    weighted_value: 0,
    stalled_count: 0,
    stalled_value: 0,
    won_count: 0,
    won_value: 0,
    lost_count: 0,
    lost_value: 0,
    aging_count: 0,
    aging_value: 0,
    closing_this_month_count: 0,
    closing_this_month_value: 0,
    proposal_to_win_rate: null,
    call_to_proposal_rate: null,
    by_stage: [],
  };

  const byStage = new Map<string | null, { label: string; count: number; value: number }>();

  let proposalCount = 0;
  let callCount = 0;

  for (const d of args.deals) {
    const v = Number(d.estimated_value) || 0;
    const w = Number(d.weighted_value) || 0;

    if (d.status === "open") {
      rollup.open_count += 1;
      rollup.open_value += v;
      rollup.weighted_value += w;
      if (isAging(d, today)) {
        rollup.aging_count += 1;
        rollup.aging_value += v;
      }
      if (
        d.expected_close_date &&
        d.expected_close_date >= monthStart &&
        d.expected_close_date <= monthEnd
      ) {
        rollup.closing_this_month_count += 1;
        rollup.closing_this_month_value += v;
      }
    } else if (d.status === "stalled") {
      rollup.stalled_count += 1;
      rollup.stalled_value += v;
    } else if (d.status === "won") {
      rollup.won_count += 1;
      rollup.won_value += v;
    } else if (d.status === "lost") {
      rollup.lost_count += 1;
      rollup.lost_value += v;
    }

    if (d.status !== "archived") {
      const key = d.stage_id;
      const label = (key && stageMap.get(key)) || "Unassigned";
      const cur = byStage.get(key) ?? { label, count: 0, value: 0 };
      cur.count += 1;
      cur.value += v;
      byStage.set(key, cur);

      const stageKeyLower = (label || "").toLowerCase();
      if (stageKeyLower.includes("proposal")) proposalCount += 1;
      if (stageKeyLower.includes("call")) callCount += 1;
    }
  }

  // Conversion rates: rough — based on counts of deals that passed through the
  // proposal stage vs deals won; same for booked call → proposal.
  if (proposalCount > 0) {
    rollup.proposal_to_win_rate = rollup.won_count / proposalCount;
  }
  if (callCount > 0) {
    rollup.call_to_proposal_rate = proposalCount / callCount;
  }

  // Order by stage display_order.
  const stageOrder = new Map(args.stages.map((s) => [s.id, s.display_order]));
  rollup.by_stage = Array.from(byStage.entries())
    .map(([stage_id, v]) => ({ stage_id, label: v.label, count: v.count, value: v.value }))
    .sort((a, b) => {
      const oa = a.stage_id ? stageOrder.get(a.stage_id) ?? 999 : 9999;
      const ob = b.stage_id ? stageOrder.get(b.stage_id) ?? 999 : 9999;
      return oa - ob;
    });

  return rollup;
}