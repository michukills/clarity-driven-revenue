// P13.Reports.AI.1 — Draft service: orchestrates evidence collection,
// deterministic generation, persistence, and learning-event logging.
//
// Free-safe by default. AI-assisted generation is admin-trigger only and is
// currently disabled (scaffolded for future enable). No anonymous AI calls.

import { supabase } from "@/integrations/supabase/client";
import {
  collectCustomerEvidence,
  collectScorecardLeadEvidence,
} from "./evidenceCollector";
import { buildDeterministicDraft, REPORT_RUBRIC_VERSION } from "./draftEngine";
import type {
  ReportDraftRow,
  ReportDraftStatus,
  ReportDraftType,
} from "./types";

/** P18 — AI-assisted drafting is admin-triggered and backend-only.
 * Public scorecard/diagnostic intake never calls AI. The deterministic path
 * remains the fallback when the Lovable AI Gateway is not configured. */
export const AI_DRAFTING_ENABLED = true;

export interface GenerateDraftInput {
  customer_id?: string | null;
  scorecard_run_id?: string | null;
  report_type: ReportDraftType;
  title?: string;
}

export async function generateDeterministicDraft(
  input: GenerateDraftInput,
): Promise<ReportDraftRow> {
  if (!input.customer_id && !input.scorecard_run_id) {
    throw new Error("Provide a customer_id or scorecard_run_id to generate a draft.");
  }

  const snapshot = input.customer_id
    ? await collectCustomerEvidence(input.customer_id, {
        scorecardRunId: input.scorecard_run_id ?? null,
      })
    : await collectScorecardLeadEvidence(input.scorecard_run_id!);

  const payload = buildDeterministicDraft(snapshot, input.report_type);

  const { data: u } = await supabase.auth.getUser();
  const actor = u.user?.id ?? null;

  const insertRow = {
    customer_id: input.customer_id ?? null,
    scorecard_run_id: input.scorecard_run_id ?? null,
    report_type: input.report_type,
    title:
      input.title ??
      `${labelForType(input.report_type)} draft — ${snapshot.customer_label}`,
    status: "draft" as ReportDraftStatus,
    generation_mode: "deterministic" as const,
    ai_status: "not_run" as const,
    rubric_version: REPORT_RUBRIC_VERSION,
    evidence_snapshot: snapshot as any,
    draft_sections: {
      sections: payload.sections,
      // P20.19 — persist the structured Stability Snapshot inside the
      // draft_sections JSON so the admin review panel can edit it
      // without a schema migration.
      ...(payload.stability_snapshot
        ? { stability_snapshot: payload.stability_snapshot }
        : {}),
    } as any,
    recommendations: payload.recommendations as any,
    risks: payload.risks as any,
    missing_information: payload.missing_information as any,
    confidence: payload.confidence,
    client_safe: false,
    generated_by: actor,
  };

  const { data, error } = await supabase
    .from("report_drafts")
    .insert([insertRow as any])
    .select()
    .single();
  if (error) throw error;

  // Best-effort learning event (RLS is admin-only).
  await supabase.from("report_draft_learning_events").insert([
    {
      draft_id: (data as any).id,
      event_type: "generated",
      after_value: { confidence: payload.confidence, mode: "deterministic" } as any,
      actor_id: actor,
    } as any,
  ]);

  return data as unknown as ReportDraftRow;
}

export async function generateAiAssistedDraft(draftId: string): Promise<{
  ok: true;
  draft_id: string;
  ai_status: "complete";
  model: string;
  usage?: unknown;
  review_required: true;
}> {
  const { data, error } = await supabase.functions.invoke("report-ai-assist", {
    body: { draft_id: draftId },
  });
  if (error) {
    throw new Error(error.message || "AI assist failed");
  }
  if (!data?.ok) {
    throw new Error(data?.error || "AI assist failed");
  }
  return data;
}

export function labelForType(t: ReportDraftType): string {
  switch (t) {
    case "diagnostic":
      return "Business Diagnostic Report";
    case "scorecard":
      return "Business Stability / Scorecard Report";
    case "rcc_summary":
      return "Revenue Control Summary";
    case "implementation_update":
      return "Implementation Progress Update";
  }
}

export async function logDraftEvent(
  draftId: string,
  eventType:
    | "edited"
    | "approved"
    | "archived"
    | "recommendation_accepted"
    | "recommendation_rejected"
    | "section_rewritten"
    | "admin_note_added"
    | "outcome_logged",
  payload: { section_key?: string; before?: unknown; after?: unknown; notes?: string } = {},
) {
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("report_draft_learning_events").insert([
    {
      draft_id: draftId,
      event_type: eventType,
      section_key: payload.section_key ?? null,
      before_value: (payload.before as any) ?? null,
      after_value: (payload.after as any) ?? null,
      notes: payload.notes ?? null,
      actor_id: u.user?.id ?? null,
    } as any,
  ]);
}
