/**
 * P98 — Campaign Video data access layer.
 *
 * Thin admin-side helpers. RLS enforces tenant isolation; these
 * helpers add the deterministic-validation + audit wiring that the UI
 * must go through.
 */
import { supabase } from "@/integrations/supabase/client";
import { logCampaignAuditEvent } from "./campaignAudit";
import {
  isAssetEligibleForVideo,
  transitionCampaignVideo,
  type CampaignVideoAction,
  type CampaignVideoState,
} from "./campaignVideoStatusMachine";
import {
  generateRemotionScenePlan,
  generateVideoOutline,
  type VideoBrainContext,
} from "./campaignVideoBrain";

const TABLE = "campaign_video_projects" as const;
const RENDER_TABLE = "campaign_video_render_jobs" as const;
const REVIEW_TABLE = "campaign_video_reviews" as const;

export interface CreateVideoProjectInput {
  asset: { id: string; approval_status: string; campaign_brief_id?: string | null; title?: string | null };
  customer_id: string;
  workspace_scope?: "customer" | "rgs_internal";
  rgs_workspace_key?: string | null;
  actor_user_id?: string | null;
  brain_context: VideoBrainContext;
}

export async function adminCreateVideoProject(input: CreateVideoProjectInput) {
  const eligibility = isAssetEligibleForVideo({ approval_status: input.asset.approval_status });
  if (!eligibility.ok) {
    return { ok: false as const, error: eligibility.reason ?? "Asset not eligible." };
  }

  const outline = generateVideoOutline(input.brain_context);
  const scenePlan = generateRemotionScenePlan(outline, input.brain_context);

  const insertRow = {
    workspace_scope: input.workspace_scope ?? "customer",
    customer_id: input.workspace_scope === "rgs_internal" ? null : input.customer_id,
    rgs_workspace_key: input.workspace_scope === "rgs_internal" ? input.rgs_workspace_key ?? null : null,
    campaign_brief_id: input.asset.campaign_brief_id ?? null,
    campaign_asset_id: input.asset.id,
    title: outline.title,
    format: scenePlan.format,
    aspect_ratio: scenePlan.aspect_ratio,
    duration_seconds_min: scenePlan.duration_seconds_range[0],
    duration_seconds_max: scenePlan.duration_seconds_range[1],
    video_status: "scene_plan_ready",
    approval_status: "draft",
    manual_publish_status: "not_ready",
    outline: outline as unknown as Record<string, unknown>,
    scene_plan: scenePlan as unknown as Record<string, unknown>,
    ai_confidence_level: scenePlan.confidence_level,
    ai_confidence_reason: scenePlan.confidence_reason,
    missing_inputs: scenePlan.missing_inputs,
    risk_warnings: scenePlan.risk_warnings,
    human_review_checklist: scenePlan.human_review_checklist,
    claim_safety_notes: scenePlan.claim_safety_notes,
    client_safe_summary: outline.core_message,
    created_by: input.actor_user_id ?? null,
  };

  const { data, error } = await supabase
    .from(TABLE as never)
    .insert(insertRow as never)
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Insert failed." };
  }

  const project = data as { id: string };
  await logCampaignAuditEvent({
    action: "video_project_created",
    customer_id: insertRow.customer_id,
    rgs_workspace_key: insertRow.rgs_workspace_key,
    campaign_asset_id: input.asset.id,
    actor_user_id: input.actor_user_id ?? null,
    to_status: "scene_plan_ready",
    context: { campaign_video_project_id: project.id },
  });
  await logCampaignAuditEvent({
    action: "video_outline_generated",
    customer_id: insertRow.customer_id,
    rgs_workspace_key: insertRow.rgs_workspace_key,
    campaign_asset_id: input.asset.id,
    actor_user_id: input.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id },
  });
  await logCampaignAuditEvent({
    action: "video_scene_plan_generated",
    customer_id: insertRow.customer_id,
    rgs_workspace_key: insertRow.rgs_workspace_key,
    campaign_asset_id: input.asset.id,
    actor_user_id: input.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id },
  });
  // Phase 1: no render runner is wired. Record the honest setup-required state.
  await logCampaignAuditEvent({
    action: "video_render_setup_required",
    customer_id: insertRow.customer_id,
    rgs_workspace_key: insertRow.rgs_workspace_key,
    campaign_asset_id: input.asset.id,
    actor_user_id: input.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id, reason: "No Remotion runner wired in Phase 1." },
  });

  return { ok: true as const, project: data };
}

export interface ProjectRow {
  id: string;
  customer_id: string | null;
  rgs_workspace_key: string | null;
  campaign_asset_id: string;
  campaign_brief_id: string | null;
  video_status: CampaignVideoState["video_status"];
  approval_status: CampaignVideoState["approval_status"];
  manual_publish_status: CampaignVideoState["manual_publish_status"];
  outline: unknown;
  scene_plan: unknown;
}

export async function adminTransitionVideoProject(
  project: ProjectRow,
  action: CampaignVideoAction,
  ctx: { actor_user_id?: string | null; is_ai_actor?: boolean; notes?: string } = {},
) {
  // has_render_output is true only if a render job recorded a real output path.
  let has_render_output = false;
  const { data: jobs } = await supabase
    .from(RENDER_TABLE as never)
    .select("status,output_storage_path")
    .eq("campaign_video_project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (Array.isArray(jobs) && jobs.length > 0) {
    const j = jobs[0] as { status?: string; output_storage_path?: string | null };
    has_render_output = j.status === "draft_ready" && !!j.output_storage_path;
  }

  const state: CampaignVideoState = {
    video_status: project.video_status,
    approval_status: project.approval_status,
    manual_publish_status: project.manual_publish_status,
    has_outline: !!project.outline,
    has_scene_plan: !!project.scene_plan,
    has_render_output,
  };

  const outcome = transitionCampaignVideo(state, action, {
    actor_user_id: ctx.actor_user_id,
    is_ai_actor: ctx.is_ai_actor,
  });

  if (outcome.ok !== true) {
    return { ok: false as const, error: outcome.reason, code: outcome.code };
  }

  const patch: Record<string, unknown> = {
    video_status: outcome.next.video_status,
    approval_status: outcome.next.approval_status,
    manual_publish_status: outcome.next.manual_publish_status,
  };
  if (action === "approve") {
    patch.approved_by = ctx.actor_user_id ?? null;
    patch.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from(TABLE as never)
    .update(patch as never)
    .eq("id", project.id);
  if (error) {
    return { ok: false as const, error: error.message, code: "invalid_transition" as const };
  }

  await supabase.from(REVIEW_TABLE as never).insert({
    campaign_video_project_id: project.id,
    actor_user_id: ctx.actor_user_id ?? null,
    action: mapToReviewAction(action),
    prior_status: outcome.from_status,
    new_status: outcome.to_status,
    notes: ctx.notes ?? null,
  } as never);

  await logCampaignAuditEvent({
    action: outcome.audit_action as never,
    customer_id: project.customer_id,
    rgs_workspace_key: project.rgs_workspace_key,
    campaign_asset_id: project.campaign_asset_id,
    actor_user_id: ctx.actor_user_id ?? null,
    from_status: outcome.from_status,
    to_status: outcome.to_status,
    context: { campaign_video_project_id: project.id },
  });

  return { ok: true as const, transition: outcome };
}

function mapToReviewAction(action: CampaignVideoAction): string {
  switch (action) {
    case "request_revision":
      return "request_revision";
    case "approve":
      return "approve";
    case "reject":
      return "reject";
    case "archive":
      return "archive";
    case "mark_ready_for_export":
      return "mark_ready_for_export";
    case "mark_manual_publish_ready":
      return "mark_manual_publish_ready";
    case "mark_exported":
      return "mark_exported";
    default:
      return "note";
  }
}

export async function adminListVideoProjectsForAsset(assetId: string) {
  const { data, error } = await supabase
    .from(TABLE as never)
    .select("*")
    .eq("campaign_asset_id", assetId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as ProjectRow[];
}

export async function clientListVideoProjectsForCustomer(customerId: string) {
  // RLS returns only this customer's approved/visible records.
  const { data, error } = await supabase
    .from(TABLE as never)
    .select("id,title,format,video_status,approval_status,manual_publish_status,client_safe_summary,created_at")
    .eq("customer_id", customerId)
    .in("approval_status", ["approved"])
    .order("created_at", { ascending: false });
  if (error) return [];
  return data ?? [];
}

/**
 * P98 — Render-job helpers (honest, no-fake-rendering).
 *
 * The render runner is NOT wired in this phase. These helpers let an
 * admin honestly record:
 *   - a render *request* (queued)
 *   - a render *setup_required* outcome (no runner present)
 *   - a render *failed* outcome (when a future runner reports failure)
 * They never fabricate an output file or a `draft_ready` status.
 */
export interface RenderJobRow {
  id: string;
  campaign_video_project_id: string;
  status:
    | "queued"
    | "in_progress"
    | "draft_ready"
    | "failed"
    | "setup_required"
    | "dead_lettered";
  output_storage_bucket: string | null;
  output_storage_path: string | null;
  error_message: string | null;
  requested_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export async function adminListRenderJobs(projectId: string): Promise<RenderJobRow[]> {
  const { data, error } = await supabase
    .from(RENDER_TABLE as never)
    .select("*")
    .eq("campaign_video_project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as unknown as RenderJobRow[];
}

export async function adminRequestRender(
  project: ProjectRow,
  ctx: { actor_user_id?: string | null } = {},
) {
  // Gate the transition through the status machine first.
  const transitionRes = await adminTransitionVideoProject(project, "request_render", {
    actor_user_id: ctx.actor_user_id,
  });
  if (!transitionRes.ok) return transitionRes;

  const { error } = await supabase.from(RENDER_TABLE as never).insert({
    campaign_video_project_id: project.id,
    status: "queued",
    requested_by: ctx.actor_user_id ?? null,
  } as never);
  if (error) return { ok: false as const, error: error.message };

  await logCampaignAuditEvent({
    action: "video_render_requested",
    customer_id: project.customer_id,
    rgs_workspace_key: project.rgs_workspace_key,
    campaign_asset_id: project.campaign_asset_id,
    actor_user_id: ctx.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id },
  });
  return { ok: true as const };
}

export async function adminRecordRenderSetupRequired(
  project: ProjectRow,
  ctx: { actor_user_id?: string | null; reason?: string } = {},
) {
  const transitionRes = await adminTransitionVideoProject(project, "record_render_setup_required", {
    actor_user_id: ctx.actor_user_id,
  });
  if (!transitionRes.ok) return transitionRes;

  const { error } = await supabase.from(RENDER_TABLE as never).insert({
    campaign_video_project_id: project.id,
    status: "setup_required",
    error_message: ctx.reason ?? "Remotion render runner is not wired in this environment.",
    requested_by: ctx.actor_user_id ?? null,
  } as never);
  if (error) return { ok: false as const, error: error.message };

  await logCampaignAuditEvent({
    action: "video_render_setup_required",
    customer_id: project.customer_id,
    rgs_workspace_key: project.rgs_workspace_key,
    campaign_asset_id: project.campaign_asset_id,
    actor_user_id: ctx.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id, reason: ctx.reason ?? null },
  });
  return { ok: true as const };
}

export async function adminRecordRenderFailed(
  project: ProjectRow,
  ctx: { actor_user_id?: string | null; reason: string },
) {
  const transitionRes = await adminTransitionVideoProject(project, "record_render_failed", {
    actor_user_id: ctx.actor_user_id,
  });
  if (!transitionRes.ok) return transitionRes;

  const { error } = await supabase.from(RENDER_TABLE as never).insert({
    campaign_video_project_id: project.id,
    status: "failed",
    error_message: ctx.reason,
    requested_by: ctx.actor_user_id ?? null,
    finished_at: new Date().toISOString(),
  } as never);
  if (error) return { ok: false as const, error: error.message };

  await logCampaignAuditEvent({
    action: "video_render_failed",
    customer_id: project.customer_id,
    rgs_workspace_key: project.rgs_workspace_key,
    campaign_asset_id: project.campaign_asset_id,
    actor_user_id: ctx.actor_user_id ?? null,
    context: { campaign_video_project_id: project.id, reason: ctx.reason },
  });
  return { ok: true as const };
}

/**
 * P106 — Request a short-lived signed URL for the approved + ready
 * Campaign Video MP4. Routes through the `campaign-video-download`
 * edge function which enforces all access rules. Never opens a public
 * URL; never persists the token. Caller is responsible for navigating
 * the user to the URL (e.g. window.open) within the TTL.
 */
export async function requestCampaignVideoSignedDownload(
  videoProjectId: string,
): Promise<{ ok: true; signed_url: string; expires_in_seconds: number } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke("campaign-video-download", {
    body: { video_project_id: videoProjectId },
  });
  if (error) return { ok: false, error: error.message ?? "Download unavailable" };
  const payload = (data ?? {}) as { signed_url?: string; expires_in_seconds?: number; error?: string };
  if (!payload.signed_url) return { ok: false, error: payload.error ?? "Download unavailable" };
  return {
    ok: true,
    signed_url: payload.signed_url,
    expires_in_seconds: payload.expires_in_seconds ?? 0,
  };
}

/**
 * P106 — Admin-only readiness probe for the external Remotion worker.
 * Returns presence (not value) of the shared secret and a few safe
 * counters so the admin UI can render an honest setup state.
 */
export async function adminGetRenderWorkerStatus(): Promise<{
  worker_configured: boolean;
  queued_jobs: number;
  dead_lettered_jobs: number;
  recent_worker_activity_count: number;
  notes: string;
} | null> {
  const { data, error } = await supabase.functions.invoke("campaign-video-render-status", {
    body: {},
  });
  if (error) return null;
  return (data ?? null) as {
    worker_configured: boolean;
    queued_jobs: number;
    dead_lettered_jobs: number;
    recent_worker_activity_count: number;
    notes: string;
  };
}