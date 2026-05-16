/**
 * P97 — Campaign Control audit logging.
 *
 * Thin write-only helper around `public.campaign_audit_events`. Admin
 * UI mutation paths call this after a successful brief/asset write so
 * every meaningful campaign action lands in a single, queryable log.
 *
 * Read is intentionally not exposed here — surface it through a future
 * admin-only query helper once the dashboard UI lands.
 */
import { supabase } from "@/integrations/supabase/client";

export type CampaignAuditAction =
  | "brief_created"
  | "brief_updated"
  | "brief_status_changed"
  | "brief_archived"
  | "asset_created"
  | "asset_updated"
  | "asset_status_changed"
  | "asset_archived"
  | "ai_brief_generated"
  | "ai_assets_generated"
  | "review_requested"
  | "approved"
  | "edits_requested"
  | "rejected"
  | "ready_to_publish_marked"
  | "manually_posted_marked"
  | "safety_blocked"
  | "safety_cleared"
  // P98 — Campaign Video Engine Phase 1
  | "video_project_created"
  | "video_outline_generated"
  | "video_scene_plan_generated"
  | "video_render_requested"
  | "video_render_succeeded"
  | "video_render_failed"
  | "video_render_setup_required"
  | "video_revision_requested"
  | "video_approved"
  | "video_rejected"
  | "video_archived"
  | "video_marked_ready_for_export"
  | "video_manual_publish_ready_marked"
  | "video_exported";

export interface CampaignAuditInput {
  action: CampaignAuditAction;
  customer_id?: string | null;
  rgs_workspace_key?: string | null;
  campaign_brief_id?: string | null;
  campaign_asset_id?: string | null;
  actor_user_id?: string | null;
  from_status?: string | null;
  to_status?: string | null;
  context?: Record<string, unknown>;
}

/**
 * Best-effort audit write. Never throws — audit failures must not
 * block the user's primary action, but they are logged for follow-up.
 */
export async function logCampaignAuditEvent(
  input: CampaignAuditInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const workspace_scope: "customer" | "rgs_internal" = input.rgs_workspace_key
      ? "rgs_internal"
      : "customer";

    if (workspace_scope === "customer" && !input.customer_id) {
      return { ok: false, error: "customer_id required for customer-scoped audit" };
    }
    if (workspace_scope === "rgs_internal" && !input.rgs_workspace_key) {
      return { ok: false, error: "rgs_workspace_key required for internal-scoped audit" };
    }

    const row = {
      action: input.action,
      workspace_scope,
      customer_id: workspace_scope === "customer" ? input.customer_id ?? null : null,
      rgs_workspace_key: workspace_scope === "rgs_internal" ? input.rgs_workspace_key ?? null : null,
      campaign_brief_id: input.campaign_brief_id ?? null,
      campaign_asset_id: input.campaign_asset_id ?? null,
      actor_user_id: input.actor_user_id ?? null,
      from_status: input.from_status ?? null,
      to_status: input.to_status ?? null,
      context: input.context ?? {},
    };

    const { error } = await supabase
      .from("campaign_audit_events" as never)
      .insert(row as never);

    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[campaignAudit] insert failed", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn("[campaignAudit] threw", msg);
    return { ok: false, error: msg };
  }
}