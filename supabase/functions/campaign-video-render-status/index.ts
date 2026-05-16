// P106 — Campaign Video Render Status
//
// Admin-only readiness probe. Returns whether the Remotion render
// worker is configured (shared secret present) and whether any worker
// has recently claimed/completed a job. Never returns the secret
// value, the service role key, or any cross-customer data. Safe to
// call from the admin Campaign Video panel to render an honest
// "rendering setup required" UI state.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleRow } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) return jsonResponse({ error: "Forbidden" }, 403);

  const workerConfigured = !!Deno.env.get("REMOTION_WORKER_SHARED_SECRET");

  // "Recently active" if any job moved past queued in the last 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recentActivity } = await admin
    .from("campaign_video_render_jobs")
    .select("id", { count: "exact", head: true })
    .gte("started_at", since);

  const { count: queuedCount } = await admin
    .from("campaign_video_render_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued");

  const { count: deadLetteredCount } = await admin
    .from("campaign_video_render_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "dead_lettered");

  // NEVER return the secret value itself; only its presence.
  return jsonResponse({
    worker_configured: workerConfigured,
    recent_worker_activity_count: recentActivity ?? 0,
    queued_jobs: queuedCount ?? 0,
    dead_lettered_jobs: deadLetteredCount ?? 0,
    notes: workerConfigured
      ? "Render worker secret is configured. Worker must be running externally to process queued jobs."
      : "Rendering setup required. Configure REMOTION_WORKER_SHARED_SECRET and deploy the external Remotion worker.",
  });
});