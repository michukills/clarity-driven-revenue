// P20.5 — Safe promote-to-task helper for ranked intelligence issues.
//
// Converts a ranked Leak (from analyzeLeaks → AdminLeakView.top3 / .ranked)
// into a `client_tasks` row in **admin-review/draft** state
// (`client_visible: false`, `released_at: null`). The existing
// `releaseClientTask()` flow remains the only path to expose the task to
// the client.
//
// Guarantees:
//   * Only admins can succeed here (RLS: "Admin manage client tasks" is
//     ALL/USING/WITH CHECK is_admin(auth.uid())). Non-admin callers will
//     receive an RLS error and the helper returns `{ ok: false, ... }`.
//   * Duplicate prevention: a leak (identified by stable `customer_id +
//     issue_title`) is never promoted twice. The schema has no
//     `source_leak_id` column, so we match on `customer_id + issue_title`,
//     which is stable per leak rule via `Leak.message`.
//   * No admin-only scoring internals (rationale, raw factors) are written
//     into client-visible fields. Scoring context is intentionally not
//     persisted here — admin scoring stays in `priority_engine_scores`
//     when a roadmap exists.
//   * Audit: emits `task_assigned` via `logPortalAudit` with a SAFE payload
//     (task id, gear, priority band/score, confidence). Never logs
//     rationale, AI prompt content, or internal notes.

import { supabase } from "@/integrations/supabase/client";
import { logPortalAudit } from "@/lib/portalAudit";
import type { Leak } from "@/lib/leakEngine/leakObject";
import type { RankedLeak } from "@/lib/leakEngine";

export type PromoteResult =
  | {
      ok: true;
      task_id: string;
      duplicate: false;
    }
  | {
      ok: true;
      task_id: string;
      duplicate: true;
    }
  | {
      ok: false;
      error: string;
    };

function clientNextStep(leak: Leak): string {
  const fix = (leak.recommended_fix || "").trim();
  if (fix.length > 0) return fix;
  return "Confirm the issue with your team, then take the first suggested action.";
}

function clientExpectedOutcome(leak: Leak): string {
  switch (leak.category) {
    case "financial_visibility":
      return "Clearer revenue picture and fewer surprises.";
    case "workflow":
    case "operations":
      return "More repeatable operations and less owner firefighting.";
    case "conversion":
    case "demand":
      return "More of the work you're already winning turns into revenue.";
    case "retention":
      return "Stronger repeat revenue from customers you've already earned.";
    default:
      return "Better visibility and a more stable next step.";
  }
}

function clientWhyItMatters(leak: Leak): string {
  const dollars = leak.estimated_revenue_impact;
  if (dollars && dollars > 0) {
    return `Estimated revenue at risk: $${Math.round(dollars).toLocaleString("en-US")}. Fixing this protects revenue you've already earned or are about to lose.`;
  }
  return "This affects revenue stability or owner control and should be addressed early.";
}

/**
 * Promote a ranked leak into a `client_tasks` row in admin-review state.
 *
 * NOTE: This function is admin-only by RLS. Callers should still gate the UI.
 */
export async function promoteLeakToTask(args: {
  customer_id: string;
  ranked: RankedLeak;
}): Promise<PromoteResult> {
  const { customer_id, ranked } = args;
  const { leak, scored } = ranked;

  if (!customer_id) {
    return { ok: false, error: "customer_id required" };
  }

  // Duplicate prevention. We match on (customer_id, issue_title). The leak
  // `message` is the canonical stable label per rule, so re-promoting the
  // same leak resolves to the existing draft/released task.
  try {
    const { data: existing, error: selErr } = await supabase
      .from("client_tasks")
      .select("id")
      .eq("customer_id", customer_id)
      .eq("issue_title", leak.message)
      .limit(1)
      .maybeSingle();
    if (selErr) return { ok: false, error: selErr.message };
    if (existing?.id) {
      return { ok: true, task_id: existing.id, duplicate: true };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // Insert in admin-review/draft state. `releaseClientTask` is the only
  // sanctioned path that flips client_visible=true.
  const { data: inserted, error: insErr } = await supabase
    .from("client_tasks")
    .insert({
      customer_id,
      roadmap_id: null,
      priority_score_id: null,
      rank: scored.rank,
      issue_title: leak.message,
      why_it_matters: clientWhyItMatters(leak),
      evidence_summary: leak.recommended_fix?.slice(0, 240) ?? null,
      priority_band: scored.priority_band,
      expected_outcome: clientExpectedOutcome(leak),
      next_step: clientNextStep(leak),
      client_visible: false,
      released_at: null,
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return { ok: false, error: insErr?.message ?? "insert failed" };
  }

  // Best-effort, safe-payload audit. Never include rationale, AI prompt
  // content, or internal notes.
  void logPortalAudit("task_assigned", customer_id, {
    task_id: inserted.id,
    source: "leak_intelligence",
    gear: leak.gear,
    priority_band: scored.priority_band,
    priority_score: scored.priority_score,
    confidence: leak.confidence,
  });

  return { ok: true, task_id: inserted.id, duplicate: false };
}