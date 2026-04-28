// P16.1 — Roadmap + top-3 client task generation.
//
// Idempotent: regenerating for the same report_draft_id reuses the existing
// roadmap row and replaces its scored issues + client tasks atomically from
// the admin's point of view (delete-then-reinsert).
//
// Admin-only entry point. Requires an admin-authenticated supabase client.

import { supabase } from "@/integrations/supabase/client";
import { deriveFactors, type RecommendationLike } from "./factorHeuristics";
import { rankIssues } from "./scoring";
import type { ClientTaskSeed, IndustryCategory, ScoredIssue, SuggestionSeed } from "./types";

const TOP_N = 3;

export interface GenerateRoadmapResult {
  roadmap_id: string;
  scored: ScoredIssue[];
  top_tasks: ClientTaskSeed[];
  regenerated: boolean;
}

export interface GenerateRoadmapInput {
  report_draft_id: string;
  customer_id: string;
  industry: IndustryCategory | null;
  /**
   * Recommendations to score. Only those with included_in_report=true should
   * be passed in; the caller is responsible for that filter.
   */
  recommendations: RecommendationLike[];
  generated_by: string | null;
}

function whyItMatters(rec: RecommendationLike): string {
  if (rec.explanation && rec.explanation.trim().length > 0) return rec.explanation.trim();
  return "This issue affects revenue stability or owner control and should be addressed early.";
}

function expectedOutcome(rec: RecommendationLike): string {
  const cat = (rec.category ?? "").toLowerCase();
  if (cat.includes("cash") || cat.includes("revenue")) {
    return "Clearer revenue picture and fewer surprises.";
  }
  if (cat.includes("operations") || cat.includes("process")) {
    return "More repeatable operations and less owner firefighting.";
  }
  return "Better visibility and a more stable next step.";
}

function nextStep(rec: RecommendationLike): string {
  return `Confirm the issue with your team, then take the first suggested action below.`;
}

function buildSuggestions(rec: RecommendationLike): SuggestionSeed[] {
  const seeds: SuggestionSeed[] = [
    {
      label: rec.title,
      detail: rec.explanation ?? undefined,
      source: "report",
      source_ref: rec.id,
      client_visible: true,
    },
    {
      label: "Document who owns this fix and the deadline",
      source: "admin_default",
      client_visible: true,
    },
    {
      label: "Set a short weekly check-in until this is closed",
      source: "admin_default",
      client_visible: true,
    },
  ];
  return seeds;
}

export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GenerateRoadmapResult> {
  const { report_draft_id, customer_id, industry, recommendations, generated_by } = input;

  // Score & rank everything that could become an issue.
  const scored = rankIssues(
    recommendations.map((r) => ({
      issue_key: r.rule_key ?? r.id,
      issue_title: r.title,
      source_recommendation_id: r.id,
      ...deriveFactors(r),
    }))
  );

  // Idempotency: find or create the roadmap.
  const { data: existing, error: selErr } = await supabase
    .from("execution_roadmaps")
    .select("id")
    .eq("report_draft_id", report_draft_id)
    .maybeSingle();
  if (selErr) throw selErr;

  let roadmap_id: string;
  let regenerated = false;

  if (existing?.id) {
    roadmap_id = existing.id;
    regenerated = true;
    const { error: updErr } = await supabase
      .from("execution_roadmaps")
      .update({
        industry: industry ?? null,
        regenerated_at: new Date().toISOString(),
      })
      .eq("id", roadmap_id);
    if (updErr) throw updErr;

    // Wipe dependent rows; FKs cascade so client_tasks + suggestions go too.
    const { error: delScoresErr } = await supabase
      .from("priority_engine_scores")
      .delete()
      .eq("roadmap_id", roadmap_id);
    if (delScoresErr) throw delScoresErr;
    const { error: delTasksErr } = await supabase
      .from("client_tasks")
      .delete()
      .eq("roadmap_id", roadmap_id);
    if (delTasksErr) throw delTasksErr;
  } else {
    const { data: created, error: insErr } = await supabase
      .from("execution_roadmaps")
      .insert({
        report_draft_id,
        customer_id,
        industry: industry ?? null,
        generated_by,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    roadmap_id = created.id;
  }

  // Insert priority scores.
  if (scored.length > 0) {
    const { error: scoresErr } = await supabase.from("priority_engine_scores").insert(
      scored.map((s) => ({
        roadmap_id,
        customer_id,
        source_recommendation_id: s.source_recommendation_id,
        issue_key: s.issue_key,
        issue_title: s.issue_title,
        impact: s.impact,
        visibility: s.visibility,
        ease_of_fix: s.ease_of_fix,
        dependency: s.dependency,
        priority_score: s.priority_score,
        priority_band: s.priority_band,
        rank: s.rank,
        rationale: s.rationale,
      }))
    );
    if (scoresErr) throw scoresErr;
  }

  // Build top-3 client task seeds.
  const top = scored.slice(0, TOP_N);
  const recById = new Map(recommendations.map((r) => [r.id, r]));
  const top_tasks: ClientTaskSeed[] = top.map((s) => {
    const rec = s.source_recommendation_id ? recById.get(s.source_recommendation_id) : undefined;
    const safeRec: RecommendationLike = rec ?? {
      id: s.source_recommendation_id ?? s.issue_key,
      title: s.issue_title,
      category: null,
      priority: null,
      explanation: null,
      related_pillar: null,
      origin: null,
      rule_key: null,
    };
    return {
      rank: s.rank,
      issue_title: s.issue_title,
      why_it_matters: whyItMatters(safeRec),
      evidence_summary:
        rec?.explanation?.slice(0, 240) ??
        "Based on findings in the accepted report.",
      priority_band: s.priority_band,
      expected_outcome: expectedOutcome(safeRec),
      next_step: nextStep(safeRec),
      suggestions: buildSuggestions(safeRec),
    };
  });

  // Persist client tasks (default hidden until admin releases).
  for (const task of top_tasks) {
    const matchingScore = scored.find((s) => s.rank === task.rank);
    const { data: insertedTask, error: tErr } = await supabase
      .from("client_tasks")
      .insert({
        customer_id,
        roadmap_id,
        priority_score_id: null, // backfilled below; need score row id
        rank: task.rank,
        issue_title: task.issue_title,
        why_it_matters: task.why_it_matters,
        evidence_summary: task.evidence_summary,
        priority_band: task.priority_band,
        expected_outcome: task.expected_outcome,
        next_step: task.next_step,
        client_visible: false,
        released_at: null,
        created_by: generated_by,
      })
      .select("id")
      .single();
    if (tErr) throw tErr;

    // Backfill priority_score_id link
    if (matchingScore) {
      const { data: scoreRow } = await supabase
        .from("priority_engine_scores")
        .select("id")
        .eq("roadmap_id", roadmap_id)
        .eq("issue_key", matchingScore.issue_key)
        .maybeSingle();
      if (scoreRow?.id) {
        await supabase
          .from("client_tasks")
          .update({ priority_score_id: scoreRow.id })
          .eq("id", insertedTask.id);
      }
    }

    if (task.suggestions.length > 0) {
      const { error: sErr } = await supabase.from("client_task_suggestions").insert(
        task.suggestions.map((sug, i) => ({
          client_task_id: insertedTask.id,
          label: sug.label,
          detail: sug.detail ?? null,
          source: sug.source,
          source_ref: sug.source_ref ?? null,
          display_order: i,
          client_visible: sug.client_visible ?? true,
        }))
      );
      if (sErr) throw sErr;
    }
  }

  return { roadmap_id, scored, top_tasks, regenerated };
}

export interface RoadmapView {
  roadmap: {
    id: string;
    customer_id: string;
    report_draft_id: string;
    industry: IndustryCategory | null;
    generated_at: string;
    regenerated_at: string | null;
  } | null;
  scores: Array<{
    id: string;
    issue_key: string;
    issue_title: string;
    impact: number;
    visibility: number;
    ease_of_fix: number;
    dependency: number;
    priority_score: number;
    priority_band: "critical" | "high" | "medium" | "low";
    rank: number;
    rationale: string | null;
  }>;
  client_tasks: Array<{
    id: string;
    rank: number;
    issue_title: string;
    priority_band: "critical" | "high" | "medium" | "low";
    why_it_matters: string | null;
    next_step: string | null;
    client_visible: boolean;
    released_at: string | null;
  }>;
}

export async function loadRoadmapForDraft(report_draft_id: string): Promise<RoadmapView> {
  const { data: roadmap, error } = await supabase
    .from("execution_roadmaps")
    .select("id, customer_id, report_draft_id, industry, generated_at, regenerated_at")
    .eq("report_draft_id", report_draft_id)
    .maybeSingle();
  if (error) throw error;
  if (!roadmap) return { roadmap: null, scores: [], client_tasks: [] };

  const [{ data: scores }, { data: tasks }] = await Promise.all([
    supabase
      .from("priority_engine_scores")
      .select("id, issue_key, issue_title, impact, visibility, ease_of_fix, dependency, priority_score, priority_band, rank, rationale")
      .eq("roadmap_id", roadmap.id)
      .order("rank", { ascending: true }),
    supabase
      .from("client_tasks")
      .select("id, rank, issue_title, priority_band, why_it_matters, next_step, client_visible, released_at")
      .eq("roadmap_id", roadmap.id)
      .order("rank", { ascending: true }),
  ]);

  return {
    roadmap: roadmap as RoadmapView["roadmap"],
    scores: (scores ?? []) as RoadmapView["scores"],
    client_tasks: (tasks ?? []) as RoadmapView["client_tasks"],
  };
}