// P99 — Campaign Video Render Claim
//
// External Remotion worker calls this to claim exactly one queued
// render job. Requires a shared secret. Returns ONLY the data needed
// to render. Never exposes admin notes, raw prompts unrelated to
// rendering, or unrelated customer data.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const sharedSecret = Deno.env.get("REMOTION_WORKER_SHARED_SECRET");
  if (!sharedSecret) {
    return jsonResponse({ error: "Render worker not configured" }, 503);
  }
  const provided = req.headers.get("x-remotion-worker-secret");
  if (!provided || provided !== sharedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Select the oldest queued job. Service-role bypasses RLS.
  const { data: jobs, error: jobsErr } = await admin
    .from("campaign_video_render_jobs")
    .select("id, campaign_video_project_id, worker_attempt_count")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (jobsErr) return jsonResponse({ error: jobsErr.message }, 500);
  if (!jobs || jobs.length === 0) {
    return jsonResponse({ job: null });
  }
  const job = jobs[0] as {
    id: string;
    campaign_video_project_id: string;
    worker_attempt_count: number;
  };

  // Load the related project (safe fields only).
  const { data: project, error: projErr } = await admin
    .from("campaign_video_projects")
    .select(
      "id, customer_id, rgs_workspace_key, workspace_scope, campaign_asset_id, campaign_brief_id, title, format, aspect_ratio, duration_seconds_min, duration_seconds_max, scene_plan, video_status, approval_status, archived",
    )
    .eq("id", job.campaign_video_project_id)
    .maybeSingle();

  if (projErr) return jsonResponse({ error: projErr.message }, 500);
  if (!project) return jsonResponse({ error: "Project not found" }, 404);
  if (project.archived) return jsonResponse({ error: "Project archived" }, 409);
  if (!project.scene_plan) return jsonResponse({ error: "Scene plan missing" }, 409);

  // Atomic-ish claim: only flip to in_progress if still queued.
  const startedAt = new Date().toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("campaign_video_render_jobs")
    .update({
      status: "in_progress",
      started_at: startedAt,
      worker_attempt_count: (job.worker_attempt_count ?? 0) + 1,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (claimErr) return jsonResponse({ error: claimErr.message }, 500);
  if (!claimed) {
    // Lost race with another worker — try again later.
    return jsonResponse({ job: null });
  }

  // Reflect the in-progress state on the project too.
  await admin
    .from("campaign_video_projects")
    .update({ video_status: "render_in_progress" })
    .eq("id", project.id)
    .in("video_status", ["render_queued", "scene_plan_ready"]);

  // Honest audit event.
  await admin.from("campaign_audit_events").insert({
    action: "video_render_worker_claimed",
    workspace_scope: project.workspace_scope ?? "customer",
    customer_id: project.customer_id ?? null,
    rgs_workspace_key: project.rgs_workspace_key ?? null,
    campaign_asset_id: project.campaign_asset_id ?? null,
    campaign_brief_id: project.campaign_brief_id ?? null,
    actor_user_id: null,
    from_status: "queued",
    to_status: "in_progress",
    context: { campaign_video_project_id: project.id, render_job_id: job.id },
  });

  // SAFE payload only. No admin_notes. No internal AI prompts.
  const targetPath = `${project.customer_id ?? "rgs"}/${project.id}/${job.id}.mp4`;

  return jsonResponse({
    job: {
      render_job_id: job.id,
      video_project_id: project.id,
      customer_id: project.customer_id,
      campaign_asset_id: project.campaign_asset_id,
      campaign_brief_id: project.campaign_brief_id,
      title: project.title,
      format: project.format,
      aspect_ratio: project.aspect_ratio,
      duration_seconds_min: project.duration_seconds_min,
      duration_seconds_max: project.duration_seconds_max,
      scene_plan: project.scene_plan,
      output: {
        bucket: "campaign-video-assets",
        path: targetPath,
        mime_type: "video/mp4",
      },
      started_at: startedAt,
    },
  });
});