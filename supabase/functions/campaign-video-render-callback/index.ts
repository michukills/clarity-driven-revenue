// P99 — Campaign Video Render Callback
//
// External Remotion worker calls this to report SUCCESS or FAILURE
// for a previously claimed render job. Requires shared secret.
// Callback CANNOT approve a video. Callback CANNOT mark a video
// manual-publish-ready. Human approval remains required.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-remotion-worker-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CallbackBody {
  render_job_id?: string;
  outcome?: "success" | "failure";
  output_storage_bucket?: string;
  output_storage_path?: string;
  bytes?: number;
  duration_seconds_actual?: number;
  mime_type?: string;
  error_message?: string;
}

function safeErrorMessage(input: unknown): string {
  if (typeof input !== "string") return "Render failed.";
  // Strip likely stack-trace noise; keep first 240 chars only.
  const firstLine = input.split("\n")[0] ?? input;
  return firstLine.slice(0, 240);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const sharedSecret = Deno.env.get("REMOTION_WORKER_SHARED_SECRET");
  if (!sharedSecret) return jsonResponse({ error: "Render worker not configured" }, 503);
  const provided = req.headers.get("x-remotion-worker-secret");
  if (!provided || provided !== sharedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: CallbackBody;
  try {
    body = (await req.json()) as CallbackBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  if (!body.render_job_id || (body.outcome !== "success" && body.outcome !== "failure")) {
    return jsonResponse({ error: "render_job_id and outcome required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: "Server misconfigured" }, 500);
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: job, error: jobErr } = await admin
    .from("campaign_video_render_jobs")
    .select("id, campaign_video_project_id, status")
    .eq("id", body.render_job_id)
    .maybeSingle();
  if (jobErr) return jsonResponse({ error: jobErr.message }, 500);
  if (!job) return jsonResponse({ error: "Job not found" }, 404);

  // Only transition jobs that are in_progress or (defensive) queued.
  if (job.status !== "in_progress" && job.status !== "queued") {
    return jsonResponse({ error: `Job not in callable state (status=${job.status})` }, 409);
  }

  const { data: project } = await admin
    .from("campaign_video_projects")
    .select(
      "id, customer_id, rgs_workspace_key, workspace_scope, campaign_asset_id, campaign_brief_id, video_status, approval_status",
    )
    .eq("id", job.campaign_video_project_id)
    .maybeSingle();
  if (!project) return jsonResponse({ error: "Project not found" }, 404);

  const finishedAt = new Date().toISOString();

  if (body.outcome === "success") {
    if (!body.output_storage_bucket || !body.output_storage_path) {
      return jsonResponse({ error: "output_storage_bucket and output_storage_path required" }, 400);
    }
    if (body.output_storage_bucket !== "campaign-video-assets") {
      return jsonResponse({ error: "Invalid bucket" }, 400);
    }

    const { error: updJobErr } = await admin
      .from("campaign_video_render_jobs")
      .update({
        status: "draft_ready",
        finished_at: finishedAt,
        output_storage_bucket: body.output_storage_bucket,
        output_storage_path: body.output_storage_path,
        bytes: body.bytes ?? null,
        duration_seconds_actual: body.duration_seconds_actual ?? null,
        mime_type: body.mime_type ?? "video/mp4",
        error_message: null,
        last_worker_error: null,
      })
      .eq("id", job.id);
    if (updJobErr) return jsonResponse({ error: updJobErr.message }, 500);

    // NEVER approve. NEVER mark manual_publish_ready.
    await admin
      .from("campaign_video_projects")
      .update({ video_status: "render_draft_ready" })
      .eq("id", project.id);

    await admin.from("campaign_audit_events").insert({
      action: "video_render_succeeded",
      workspace_scope: project.workspace_scope ?? "customer",
      customer_id: project.customer_id ?? null,
      rgs_workspace_key: project.rgs_workspace_key ?? null,
      campaign_asset_id: project.campaign_asset_id ?? null,
      campaign_brief_id: project.campaign_brief_id ?? null,
      actor_user_id: null,
      from_status: "in_progress",
      to_status: "draft_ready",
      context: {
        campaign_video_project_id: project.id,
        render_job_id: job.id,
        bytes: body.bytes ?? null,
        duration_seconds_actual: body.duration_seconds_actual ?? null,
      },
    });

    return jsonResponse({ ok: true });
  }

  // failure
  const safeError = safeErrorMessage(body.error_message);
  const { error: failErr } = await admin
    .from("campaign_video_render_jobs")
    .update({
      status: "failed",
      finished_at: finishedAt,
      error_message: safeError,
      last_worker_error: safeError,
    })
    .eq("id", job.id);
  if (failErr) return jsonResponse({ error: failErr.message }, 500);

  await admin
    .from("campaign_video_projects")
    .update({ video_status: "render_failed" })
    .eq("id", project.id);

  await admin.from("campaign_audit_events").insert({
    action: "video_render_failed",
    workspace_scope: project.workspace_scope ?? "customer",
    customer_id: project.customer_id ?? null,
    rgs_workspace_key: project.rgs_workspace_key ?? null,
    campaign_asset_id: project.campaign_asset_id ?? null,
    campaign_brief_id: project.campaign_brief_id ?? null,
    actor_user_id: null,
    from_status: "in_progress",
    to_status: "failed",
    context: { campaign_video_project_id: project.id, render_job_id: job.id, reason: safeError },
  });

  return jsonResponse({ ok: true });
});