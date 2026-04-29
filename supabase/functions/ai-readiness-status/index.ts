/**
 * P18 — Admin-only AI readiness status.
 *
 * Lets the admin dashboard confirm whether the deployed backend is actually
 * configured for AI before a paid launch. Does not expose secrets.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Supabase admin environment not configured");
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminAuth = await requireAdmin(req, corsHeaders);
  if (!adminAuth.ok) return adminAuth.response;

  const hasLovableKey = !!Deno.env.get("LOVABLE_API_KEY");
  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";
  const hasModelOverride = !!Deno.env.get("RGS_AI_MODEL");

  let usageSummary = {
    recent_runs_30d: 0,
    recent_failed_runs_30d: 0,
    recent_total_tokens_30d: null as number | null,
    last_run_at: null as string | null,
    last_error_at: null as string | null,
    last_error_message: null as string | null,
    balance_signal: hasLovableKey ? "untested" : "configure_lovable_api_key",
  };

  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const admin = adminClient();
    const { data: logs } = await admin
      .from("ai_run_logs")
      .select("status,total_tokens,error_message,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);

    const rows = Array.isArray(logs) ? logs : [];
    const failed = rows.filter((r: any) => r.status === "failed" || r.status === "disabled");
    const lastError = failed[0] as any | undefined;
    const recentTokens = rows.reduce((sum: number, r: any) => sum + (Number(r.total_tokens) || 0), 0);
    const creditError = failed.some((r: any) =>
      String(r.error_message ?? "").toLowerCase().includes("workspace_credits_exhausted"),
    );

    usageSummary = {
      recent_runs_30d: rows.length,
      recent_failed_runs_30d: failed.length,
      recent_total_tokens_30d: recentTokens > 0 ? recentTokens : null,
      last_run_at: rows[0]?.created_at ?? null,
      last_error_at: lastError?.created_at ?? null,
      last_error_message: lastError?.error_message ?? null,
      balance_signal: !hasLovableKey
        ? "configure_lovable_api_key"
        : creditError
          ? "top_up_required"
          : rows.length > 0
            ? "no_recent_credit_error"
            : "untested",
    };
  } catch (e) {
    console.error("ai-readiness usage summary failed", e);
  }

  const workflows = [
    {
      key: "scorecard_intake",
      label: "Scorecard intake",
      status: "ready",
      ai_mode: "deterministic_public_path",
      note:
        "Public scorecard scoring does not spend AI balance. Admin can use report AI assist after a deterministic draft exists.",
    },
    {
      key: "diagnostic_interview",
      label: "Diagnostic interview",
      status: "ready",
      ai_mode: "deterministic_public_path",
      note:
        "Public diagnostic intake does not spend AI balance. AI assist is admin-triggered during report drafting/review.",
    },
    {
      key: "report_ai_assist",
      label: "Report Draft AI Assist",
      status: hasLovableKey ? "ready" : "needs_lovable_api_key",
      ai_mode: "admin_backend_only",
      note: `Uses ${model}; output remains admin-review-only and logs usage in ai_run_logs.`,
    },
    {
      key: "seed_helpers",
      label: "Persona / Journey / Process seed helpers",
      status: hasLovableKey ? "ready" : "needs_lovable_api_key",
      ai_mode: "admin_backend_only",
      note: `Uses ${model}; outputs are hypotheses until an admin validates them.`,
    },
  ];

  const setupSteps = [
    hasLovableKey
      ? "LOVABLE_API_KEY is configured as a Supabase Edge Function secret."
      : "Add LOVABLE_API_KEY as a Supabase Edge Function secret before using admin AI assist.",
    hasModelOverride
      ? `RGS_AI_MODEL override is set to ${model}.`
      : `RGS_AI_MODEL is not set; backend defaults to ${model}.`,
    "Keep Lovable Cloud & AI balance funded before paid scorecard or diagnostic delivery.",
    "Run one admin-only AI report assist smoke test and confirm ai_run_logs records the attempt.",
  ];

  return new Response(
    JSON.stringify({
      ok: true,
      ai_gateway_configured: hasLovableKey,
      model,
      model_override_configured: hasModelOverride,
      public_ai_calls: false,
      scorecard_public_path: "deterministic",
      diagnostic_public_path: "deterministic",
      report_ai_assist: hasLovableKey ? "ready" : "needs_lovable_api_key",
      seed_helpers: hasLovableKey ? "ready" : "needs_lovable_api_key",
      billing: "Lovable AI usage bills through Cloud & AI balance.",
      scoring_authority: {
        scorecard: "deterministic_rubric",
        diagnostic: "deterministic_rubric_and_admin_review",
        ai_role:
          "AI can assist with interpretation, drafting, missing-information prompts, and report organization. AI does not directly assign the final 0-1000 score.",
      },
      balance_management: {
        balance_visible_in_app: false,
        top_up_path: "Lovable dashboard -> Settings -> Cloud & AI balance",
        docs_url: "https://docs.lovable.dev/integrations/cloud",
        note:
          "Lovable balance is managed in Lovable. This app monitors configuration, usage logs, and credit-exhausted errors.",
      },
      recommended_model: {
        current: model,
        default: "google/gemini-2.5-flash",
        recommendation:
          "Gemini Flash is the launch default for structured scorecard/diagnostic report assist. Use a Pro-class model only for deeper multi-document synthesis after cost and output quality are validated.",
      },
      usage_summary: usageSummary,
      workflows,
      setup_steps: setupSteps,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
