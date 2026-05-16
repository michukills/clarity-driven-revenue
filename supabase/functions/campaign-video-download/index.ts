// P99 — Campaign Video Download
//
// Returns a short-lived signed URL for an approved + ready video.
// Authenticated user only. Admins authorized for any project; customers
// only for their own approved + manual-publish-ready projects.
//
// NEVER returns permanent URLs. NEVER allows public bucket access.
// NEVER allows download for draft / rejected / archived / failed /
// setup_required / queued / in_progress jobs.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  let body: { video_project_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  if (!body.video_project_id) {
    return jsonResponse({ error: "video_project_id required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Is this user an admin?
  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  const isAdmin = !!roleRow;

  const { data: project, error: projErr } = await admin
    .from("campaign_video_projects")
    .select(
      "id, customer_id, workspace_scope, rgs_workspace_key, campaign_asset_id, campaign_brief_id, video_status, approval_status, manual_publish_status, archived",
    )
    .eq("id", body.video_project_id)
    .maybeSingle();
  if (projErr) return jsonResponse({ error: projErr.message }, 500);
  if (!project) return jsonResponse({ error: "Not found" }, 404);

  const deny = async (reason: string, status = 403) => {
    await admin.from("campaign_audit_events").insert({
      action: "video_download_denied",
      workspace_scope: project.workspace_scope ?? "customer",
      customer_id: project.customer_id ?? null,
      rgs_workspace_key: project.rgs_workspace_key ?? null,
      campaign_asset_id: project.campaign_asset_id ?? null,
      campaign_brief_id: project.campaign_brief_id ?? null,
      actor_user_id: userId,
      context: { campaign_video_project_id: project.id, reason },
    });
    return jsonResponse({ error: reason }, status);
  };

  // Tenant scoping for non-admin users.
  if (!isAdmin) {
    if (project.workspace_scope !== "customer" || !project.customer_id) {
      return deny("Not authorized");
    }
    const { data: customer } = await admin
      .from("customers")
      .select("id, user_id")
      .eq("id", project.customer_id)
      .maybeSingle();
    if (!customer || customer.user_id !== userId) {
      return deny("Not authorized");
    }
  }

  if (project.archived) return deny("Project archived", 409);
  if (project.approval_status !== "approved") {
    return deny("Video is not approved");
  }
  if (
    project.manual_publish_status !== "ready_for_manual_export" &&
    project.manual_publish_status !== "manual_publish_ready"
  ) {
    return deny("Video is not ready for manual export");
  }

  // Pick the most recent draft_ready render job with a real output path.
  const { data: jobs } = await admin
    .from("campaign_video_render_jobs")
    .select("id, status, output_storage_bucket, output_storage_path")
    .eq("campaign_video_project_id", project.id)
    .eq("status", "draft_ready")
    .not("output_storage_path", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const job = (jobs ?? [])[0] as
    | { id: string; status: string; output_storage_bucket: string | null; output_storage_path: string | null }
    | undefined;
  if (!job || !job.output_storage_path) {
    return deny("No rendered output available", 404);
  }

  const bucket = job.output_storage_bucket ?? "campaign-video-assets";
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(job.output_storage_path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    return jsonResponse({ error: "Could not create signed URL" }, 500);
  }

  await admin.from("campaign_audit_events").insert({
    action: "video_signed_url_issued",
    workspace_scope: project.workspace_scope ?? "customer",
    customer_id: project.customer_id ?? null,
    rgs_workspace_key: project.rgs_workspace_key ?? null,
    campaign_asset_id: project.campaign_asset_id ?? null,
    campaign_brief_id: project.campaign_brief_id ?? null,
    actor_user_id: userId,
    context: {
      campaign_video_project_id: project.id,
      render_job_id: job.id,
      ttl_seconds: SIGNED_URL_TTL_SECONDS,
    },
  });

  return jsonResponse({
    signed_url: signed.signedUrl,
    expires_in_seconds: SIGNED_URL_TTL_SECONDS,
  });
});