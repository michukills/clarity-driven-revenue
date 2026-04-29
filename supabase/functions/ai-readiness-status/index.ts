/**
 * P18 — Admin-only AI readiness status.
 *
 * Lets the admin dashboard confirm whether the deployed backend is actually
 * configured for AI before a paid launch. Does not expose secrets.
 */

import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminAuth = await requireAdmin(req, corsHeaders);
  if (!adminAuth.ok) return adminAuth.response;

  const hasLovableKey = !!Deno.env.get("LOVABLE_API_KEY");
  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

  return new Response(
    JSON.stringify({
      ok: true,
      ai_gateway_configured: hasLovableKey,
      model,
      public_ai_calls: false,
      scorecard_public_path: "deterministic",
      diagnostic_public_path: "deterministic",
      report_ai_assist: hasLovableKey ? "ready" : "needs_lovable_api_key",
      seed_helpers: hasLovableKey ? "ready" : "needs_lovable_api_key",
      billing: "Lovable AI usage bills through Cloud & AI balance.",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
