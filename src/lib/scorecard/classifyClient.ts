// P93E-E2D — Client wrapper for the scorecard-classify edge function.
//
// Sends owner-written plain-English answers + the canonical rubric
// option allow-list per question, receives back classifier-mapped
// option_ids, and exposes a helper to fold those into the existing
// V3Answers shape consumed by scoreScorecardV3().

import { supabase } from "@/integrations/supabase/client";
import {
  GEARS_V3,
  RUBRIC_VERSION_V3,
  emptyAnswersV3,
  type GearId,
  type V3Answers,
} from "@/lib/scorecard/rubricV3";

export interface OwnerAnswerInput {
  question_id: string;
  gear: GearId;
  prompt: string;
  owner_text: string;
}

export interface ClassifierResult {
  question_id: string;
  gear: string;
  owner_text: string;
  classified_option_id: string;
  classified_option_label: string;
  confidence: "high" | "medium" | "low";
  classification_rationale: string;
  insufficient_detail: boolean;
  follow_up_question: string | null;
  classifier_type: "ai" | "rules" | "fallback";
}

export interface ClassifyResponse {
  classifier_status: "ai" | "rules_fallback" | "rules";
  rubric_version: string;
  classifications: ClassifierResult[];
}

/** Build the per-question allow-list payload from the canonical rubric. */
export function buildClassifyPayload(
  ownerAnswers: OwnerAnswerInput[],
  runId?: string,
) {
  const byQ = new Map<string, { gear: GearId; prompt: string; allowed: { id: string; label: string; weight: number }[] }>();
  for (const g of GEARS_V3) {
    for (const q of g.questions) {
      byQ.set(q.id, {
        gear: g.id,
        prompt: q.prompt,
        allowed: q.options.map((o) => ({
          id: o.id,
          label: o.label,
          weight: o.weight,
        })),
      });
    }
  }
  const answers = ownerAnswers
    .map((a) => {
      const meta = byQ.get(a.question_id);
      if (!meta) return null;
      return {
        question_id: a.question_id,
        gear: meta.gear,
        prompt: meta.prompt,
        owner_text: (a.owner_text || "").slice(0, 1500),
        allowed_options: meta.allowed,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    rubric_version: RUBRIC_VERSION_V3,
    run_id: runId,
    answers,
  };
}

/** Invoke the classifier edge function. Throws on transport-level errors. */
export async function classifyScorecardAnswers(
  ownerAnswers: OwnerAnswerInput[],
  runId?: string,
): Promise<ClassifyResponse> {
  const body = buildClassifyPayload(ownerAnswers, runId);
  const { data, error } = await supabase.functions.invoke<ClassifyResponse>(
    "scorecard-classify",
    { body },
  );
  if (error) throw error;
  if (!data) throw new Error("classifier_empty_response");
  return data;
}

/**
 * Fold classifier results into the V3Answers shape that
 * scoreScorecardV3() consumes. Unknown question_ids / option_ids are
 * left as null (the deterministic scorer treats null as 0 credit).
 */
export function classificationsToV3Answers(
  results: ClassifierResult[],
): V3Answers {
  const out = emptyAnswersV3();
  const allowedByQ = new Map<string, { gear: GearId; ids: Set<string> }>();
  for (const g of GEARS_V3) {
    for (const q of g.questions) {
      allowedByQ.set(q.id, {
        gear: g.id,
        ids: new Set(q.options.map((o) => o.id)),
      });
    }
  }
  for (const c of results) {
    const meta = allowedByQ.get(c.question_id);
    if (!meta) continue;
    if (!meta.ids.has(c.classified_option_id)) continue;
    out[meta.gear][c.question_id] = c.classified_option_id;
  }
  return out;
}

/**
 * Owner contexts payload used by flattenAnswersV3. We treat the original
 * owner text as the "context" so admins see the verbatim answer alongside
 * the classified option. Score still derives only from option_id.
 */
export function classificationsToOwnerContexts(
  ownerAnswers: OwnerAnswerInput[],
): Partial<Record<GearId, Record<string, string>>> {
  const out: Partial<Record<GearId, Record<string, string>>> = {};
  for (const a of ownerAnswers) {
    if (!out[a.gear]) out[a.gear] = {};
    out[a.gear]![a.question_id] = (a.owner_text || "").slice(0, 1000);
  }
  return out;
}