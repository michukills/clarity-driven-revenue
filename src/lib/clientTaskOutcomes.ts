// P20.1 — Client task status + outcome loop helpers.
//
// All cross-table writes go through here so RLS contracts stay obvious:
//   - Client side: status updates + activity inserts (own released tasks).
//   - Admin side: review outcomes, validate, and seed learning events.
//
// Internal scoring fields are NEVER selected client-side.

import { supabase } from "@/integrations/supabase/client";
import {
  sameIndustryLearningDecision,
  crossIndustryLearningDecision,
  anonymizeForCrossIndustry,
} from "@/lib/industryGuardrails";

export type ClientTaskStatus = "open" | "in_progress" | "blocked" | "done";

export const CLIENT_STATUS_LABELS: Record<ClientTaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

// ---------- Client-facing ----------

export async function updateClientTaskStatus(params: {
  client_task_id: string;
  customer_id: string;
  from_status: string;
  to_status: ClientTaskStatus;
  note?: string;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  if (!userId) throw new Error("Not signed in");

  const { error: updErr } = await supabase
    .from("client_tasks")
    .update({ status: params.to_status })
    .eq("id", params.client_task_id);
  if (updErr) throw updErr;

  // Log status_changed activity
  const { error: logErr } = await supabase.from("client_task_activity").insert({
    client_task_id: params.client_task_id,
    customer_id: params.customer_id,
    actor_id: userId,
    actor_role: "client",
    activity_type: "status_changed",
    from_status: params.from_status,
    to_status: params.to_status,
    note: null,
  });
  if (logErr) throw logErr;

  // Optional contextual note
  if (params.note && params.note.trim().length > 0) {
    const activity_type =
      params.to_status === "blocked"
        ? "blocked_note_added"
        : params.to_status === "done"
        ? "completion_note_added"
        : "admin_note_added";

    const { error: noteErr } = await supabase.from("client_task_activity").insert({
      client_task_id: params.client_task_id,
      customer_id: params.customer_id,
      actor_id: userId,
      actor_role: "client",
      activity_type,
      from_status: null,
      to_status: null,
      note: params.note.trim(),
    });
    if (noteErr) throw noteErr;

    // For done, also stash the note onto the auto-created outcome draft.
    if (params.to_status === "done") {
      // Wait briefly for trigger-created row, then update.
      const { data: outcome } = await supabase
        .from("recommendation_outcomes")
        .select("id, client_completion_note")
        .eq("client_task_id", params.client_task_id)
        .maybeSingle();
      if (outcome?.id && !outcome.client_completion_note) {
        await supabase
          .from("recommendation_outcomes")
          .update({ client_completion_note: params.note.trim() })
          .eq("id", outcome.id);
      }
    }
  }
}

export interface ClientTaskActivityRow {
  id: string;
  client_task_id: string;
  actor_role: string;
  activity_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

export async function loadClientTaskActivity(
  client_task_id: string
): Promise<ClientTaskActivityRow[]> {
  const { data, error } = await supabase
    .from("client_task_activity")
    .select("id, client_task_id, actor_role, activity_type, from_status, to_status, note, created_at")
    .eq("client_task_id", client_task_id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ClientTaskActivityRow[];
}

// ---------- Admin-facing ----------

export type OutcomeStatus =
  | "pending_review"
  | "outcome_validated"
  | "outcome_rejected"
  | "needs_follow_up";

export interface AdminOutcomeRow {
  id: string;
  customer_id: string;
  client_task_id: string | null;
  roadmap_id: string | null;
  priority_score_id: string | null;
  source_recommendation_id: string | null;
  outcome_status: OutcomeStatus;
  client_completion_note: string | null;
  admin_measured_result: string | null;
  admin_impact_note: string | null;
  contributes_same_industry: boolean;
  contributes_cross_industry: boolean;
  industry_learning_event_id: string | null;
  cross_industry_learning_event_id: string | null;
  completed_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function loadPendingOutcomes(customer_id: string): Promise<AdminOutcomeRow[]> {
  const { data, error } = await supabase
    .from("recommendation_outcomes")
    .select(
      "id, customer_id, client_task_id, roadmap_id, priority_score_id, source_recommendation_id, outcome_status, client_completion_note, admin_measured_result, admin_impact_note, contributes_same_industry, contributes_cross_industry, industry_learning_event_id, cross_industry_learning_event_id, completed_at, reviewed_at, created_at"
    )
    .eq("customer_id", customer_id)
    .order("completed_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as AdminOutcomeRow[];
}

// ---------- P31 — Admin cross-customer outcome review ----------

export interface AdminOutcomeQueueRow extends AdminOutcomeRow {
  customer: {
    id: string;
    full_name: string | null;
    business_name: string | null;
  } | null;
  task: {
    id: string;
    issue_title: string | null;
  } | null;
}

/**
 * Cross-customer outcome list for the admin review dashboard/page.
 * RLS on recommendation_outcomes is admin-only, so this query naturally
 * returns nothing for non-admin sessions — no client-side trust is required.
 * Internal scoring fields (priority_score, score_context, scoring formula
 * details) are intentionally NOT selected.
 */
export async function loadOutcomeReviewQueue(params?: {
  status?: OutcomeStatus | "all";
  limit?: number;
}): Promise<AdminOutcomeQueueRow[]> {
  const status = params?.status ?? "pending_review";
  const limit = params?.limit ?? 100;

  let q = supabase
    .from("recommendation_outcomes")
    .select(
      [
        "id, customer_id, client_task_id, roadmap_id, priority_score_id, source_recommendation_id",
        "outcome_status, client_completion_note, admin_measured_result, admin_impact_note",
        "contributes_same_industry, contributes_cross_industry",
        "industry_learning_event_id, cross_industry_learning_event_id",
        "completed_at, reviewed_at, created_at",
        "customer:customers!recommendation_outcomes_customer_id_fkey(id, full_name, business_name)",
        "task:client_tasks!recommendation_outcomes_client_task_id_fkey(id, issue_title)",
      ].join(", "),
    );

  if (status !== "all") {
    q = q.eq("outcome_status", status);
  }

  // Sort: completed first, then created.
  q = q.order("completed_at", { ascending: false, nullsFirst: false }).limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown) as AdminOutcomeQueueRow[];
}

/** Lightweight count for dashboard badge. */
export async function countPendingOutcomeReviews(): Promise<number> {
  const { count, error } = await supabase
    .from("recommendation_outcomes")
    .select("id", { count: "exact", head: true })
    .eq("outcome_status", "pending_review");
  if (error) throw error;
  return count ?? 0;
}

export const OUTCOME_STATUS_LABEL: Record<OutcomeStatus, string> = {
  pending_review: "Pending review",
  needs_follow_up: "Needs follow-up",
  outcome_validated: "Validated",
  outcome_rejected: "Rejected",
};

/** Pure helper — easy to unit test. Sorts a queue with pending first, then by recency. */
export function sortOutcomeQueue<T extends Pick<AdminOutcomeRow, "outcome_status" | "completed_at" | "created_at">>(
  rows: T[],
): T[] {
  const statusRank: Record<OutcomeStatus, number> = {
    pending_review: 0,
    needs_follow_up: 1,
    outcome_validated: 2,
    outcome_rejected: 3,
  };
  return [...rows].sort((a, b) => {
    const ra = statusRank[a.outcome_status as OutcomeStatus] ?? 9;
    const rb = statusRank[b.outcome_status as OutcomeStatus] ?? 9;
    if (ra !== rb) return ra - rb;
    const ta = a.completed_at ?? a.created_at ?? "";
    const tb = b.completed_at ?? b.created_at ?? "";
    return tb.localeCompare(ta);
  });
}

export async function reviewOutcome(params: {
  outcome_id: string;
  outcome_status: OutcomeStatus;
  admin_measured_result?: string;
  admin_impact_note?: string;
  contributes_same_industry?: boolean;
  contributes_cross_industry?: boolean;
}): Promise<void> {
  const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
  const patch: any = {
    outcome_status: params.outcome_status,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  };
  if (params.admin_measured_result !== undefined) patch.admin_measured_result = params.admin_measured_result;
  if (params.admin_impact_note !== undefined) patch.admin_impact_note = params.admin_impact_note;
  if (params.contributes_same_industry !== undefined)
    patch.contributes_same_industry = params.contributes_same_industry;
  if (params.contributes_cross_industry !== undefined)
    patch.contributes_cross_industry = params.contributes_cross_industry;

  // Mapping outcome to legacy `outcome` column for backwards compatibility.
  if (params.outcome_status === "outcome_validated") patch.outcome = "helped";
  else if (params.outcome_status === "outcome_rejected") patch.outcome = "no_change";

  const { error } = await supabase
    .from("recommendation_outcomes")
    .update(patch)
    .eq("id", params.outcome_id);
  if (error) throw error;

  if (params.outcome_status === "outcome_validated") {
    await maybeCreateLearningEvents(params.outcome_id);
  }
}

async function maybeCreateLearningEvents(outcome_id: string): Promise<void> {
  // Reload the validated outcome.
  const { data: o, error: oErr } = await supabase
    .from("recommendation_outcomes")
    .select(
      "id, customer_id, client_task_id, roadmap_id, source_recommendation_id, contributes_same_industry, contributes_cross_industry, admin_measured_result, admin_impact_note, industry_learning_event_id, cross_industry_learning_event_id"
    )
    .eq("id", outcome_id)
    .maybeSingle();
  if (oErr) throw oErr;
  if (!o) return;

  // Find context: task title + customer industry
  const [taskRes, custRes] = await Promise.all([
    o.client_task_id
      ? supabase
          .from("client_tasks")
          .select("issue_title, priority_band, priority_score_id")
          .eq("id", o.client_task_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    supabase
      .from("customers")
      .select("industry, industry_confirmed_by_admin")
      .eq("id", o.customer_id)
      .maybeSingle(),
  ]);

  const issueTitle: string = taskRes?.data?.issue_title ?? "Validated improvement";
  const industry = custRes?.data?.industry as
    | "trade_field_service"
    | "retail"
    | "restaurant"
    | "mmj_cannabis"
    | "general_service"
    | "other"
    | null;
  const industryConfirmed = !!custRes?.data?.industry_confirmed_by_admin;

  // Stable pattern key from issue title (and recommendation id when present).
  const slug = issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  const recRef = o.source_recommendation_id ?? "task";
  const pattern_key = `outcome_${slug}_${recRef.slice(0, 8)}`;

  const evidence_summary =
    [o.admin_measured_result, o.admin_impact_note].filter(Boolean).join(" — ") ||
    "Admin-validated client outcome.";

  // P22.1 — Industry guardrails: same-industry learning requires a confirmed,
  // real industry. Missing / `other` / unconfirmed → restricted by default.
  const sameIndustryDecision = sameIndustryLearningDecision({
    industry,
    industryConfirmed,
  });

  // 1. Same-industry learning event
  if (o.contributes_same_industry && sameIndustryDecision.allowed && industry) {
    const { data: existing } = await supabase
      .from("industry_learning_events")
      .select("id")
      .eq("industry", industry)
      .eq("pattern_key", pattern_key)
      .maybeSingle();

    let learning_id = existing?.id as string | undefined;
    if (!learning_id) {
      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { data: created, error: cErr } = await supabase
        .from("industry_learning_events")
        .insert({
          industry,
          source_customer_id: o.customer_id,
          pattern_key,
          pattern_label: issueTitle,
          evidence_summary,
          confidence: "medium",
          outcome: "helped",
          is_cross_industry_eligible: !!o.contributes_cross_industry,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      learning_id = created.id;
    } else {
      await supabase
        .from("industry_learning_events")
        .update({
          is_cross_industry_eligible: !!o.contributes_cross_industry,
          evidence_summary,
        })
        .eq("id", learning_id);
    }

    if (learning_id && learning_id !== o.industry_learning_event_id) {
      await supabase
        .from("recommendation_outcomes")
        .update({ industry_learning_event_id: learning_id })
        .eq("id", outcome_id);
    }
  }

  // 2. Cross-industry learning event (anonymized — no customer identity).
  // Requires explicit admin approval per outcome and respects regulated-industry
  // guardrails (MMJ/cannabis must be generalized + admin-approved separately).
  const crossDecision = crossIndustryLearningDecision({
    industry,
    industryConfirmed,
    contributesCrossIndustry: !!o.contributes_cross_industry,
    // The presence of `contributes_cross_industry=true` on the outcome IS the
    // admin generalization approval signal at this layer; UI gates it upstream
    // with a regulated-industry warning before the flag can be set.
    generalizedApproval: !!o.contributes_cross_industry,
  });

  if (crossDecision.allowed) {
    const { data: existingX } = await supabase
      .from("cross_industry_learning_events")
      .select("id, source_industries")
      .eq("pattern_key", pattern_key)
      .maybeSingle();

    let xi_id = existingX?.id as string | undefined;
    const userId = (await supabase.auth.getUser()).data.user?.id ?? null;

    if (!xi_id) {
      const { data: created, error: cErr } = await supabase
        .from("cross_industry_learning_events")
        .insert({
          pattern_key,
          pattern_label: anonymizeForCrossIndustry(issueTitle),
          description: "Validated improvement applicable across industries.",
          evidence_summary: anonymizeForCrossIndustry(evidence_summary),
          source_industries: (industry ? [industry] : []) as any,
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (cErr) throw cErr;
      xi_id = created.id;
    } else if (industry) {
      const sources = (existingX?.source_industries ?? []) as string[];
      if (!sources.includes(industry)) {
        await supabase
          .from("cross_industry_learning_events")
          .update({ source_industries: [...sources, industry] as any })
          .eq("id", xi_id);
      }
    }

    if (xi_id && xi_id !== o.cross_industry_learning_event_id) {
      await supabase
        .from("recommendation_outcomes")
        .update({ cross_industry_learning_event_id: xi_id })
        .eq("id", outcome_id);
    }
  }
}
