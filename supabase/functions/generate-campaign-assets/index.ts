/**
 * P95 — Campaign Control asset generation.
 *
 * Admin-only, customer-scoped generation path. Uses the Lovable AI Gateway
 * backend-side when configured, stores AI-assisted drafts only, never approves,
 * never posts, and logs a campaign event. If the AI provider is unavailable,
 * the function returns safe rules-based drafts marked as non-AI fallback so the
 * workflow remains honest.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAMPAIGN_FUNCTION_VERSION = "p95-campaign-assets-v1";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Supabase admin environment not configured");
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

function safeString(value: unknown, max = 9000): string {
  return String(value ?? "").slice(0, max);
}

const FORBIDDEN = [
  /\bguarantee(?:d|s)?\b/i,
  /\bguaranteed (?:revenue|profit|growth|leads|roi|results?)\b/i,
  /\b10x\b/i,
  /\bskyrocket\b/i,
  /\bexplosive growth\b/i,
  /\blegal(?:ly)? compliant\b/i,
  /\bcompliance approved\b/i,
  /\btax advice\b/i,
  /\baccounting advice\b/i,
  /\bvaluation\b/i,
  /\btestimonial\b/i,
  /\bcase stud(?:y|ies)\b/i,
  /\bauto[- ]?post\b/i,
  /\bmass dm\b/i,
];

function safetyStatus(text: string): "passed" | "needs_review" | "blocked" {
  return FORBIDDEN.some((re) => re.test(text)) ? "blocked" : "passed";
}

const ALLOWED_ASSET_TYPES = new Set([
  "social_post",
  "ad_copy",
  "email",
  "follow_up",
  "landing_page_section",
  "image_prompt",
  "image_asset",
  "carousel",
  "story_graphic",
  "campaign_calendar",
  "sequence",
  "report_export",
]);

function safeAssetType(value: unknown): string {
  const raw = safeString(value, 80);
  return ALLOWED_ASSET_TYPES.has(raw) ? raw : "social_post";
}

function fallbackAssets(input: {
  businessName: string;
  objective: string;
  audience: string;
  offer: string;
  cta: string;
  channel: string;
}) {
  const intro = input.businessName
    ? `${input.businessName} should lead with a practical operating problem`
    : "The campaign should lead with a practical operating problem";
  return [
    {
      asset_type: "social_post",
      platform: input.channel || "manual",
      title: "Manual social draft",
      draft_content: `${intro}: owners can feel when demand, follow-up, delivery, money visibility, or owner dependence starts slipping. Use this campaign to invite right-fit owners to take the Business Stability Scorecard and see where attention should go first. CTA: ${input.cta || "Take the Business Stability Scorecard"}.`,
      client_safe_explanation:
        "Rules-based draft because AI generation was unavailable. Admin review is required before publishing.",
      admin_only_rationale:
        "Fallback draft keeps the workflow usable without claiming AI generation or connected posting.",
      manual_posting_instructions:
        "Copy into the selected platform manually after admin approval. Do not mark posted via integration unless a verified connection proof exists.",
    },
    {
      asset_type: "email",
      platform: "email",
      title: "Manual email draft",
      draft_content: `Subject: A practical check on what is slipping\n\nHi,\n\nIf ${input.offer || "the current offer"} is going to create stronger demand, the business needs enough structure behind it to capture interest, follow up, deliver cleanly, and keep visibility. The next step is not more noise. It is a clearer read on what should be marketed and what should be fixed first.\n\nCTA: ${input.cta || "Take the Business Stability Scorecard"}.`,
      client_safe_explanation:
        "Rules-based draft using the campaign brief. It does not promise results and must be reviewed.",
      admin_only_rationale:
        "Fallback email centers readiness and next action without outcome claims.",
      manual_posting_instructions:
        "Review, edit, approve, then send manually through the client's approved email platform.",
    },
    {
      asset_type: "report_export",
      platform: "client_deliverable",
      title: "Campaign strategy deliverable draft",
      draft_content: `Campaign objective: ${input.objective || "Clarify what to market next"}\n\nTarget audience: ${input.audience || "Best-fit buyer still needs validation"}\n\nOffer focus: ${input.offer || "Primary offer to be confirmed"}\n\nRecommended channel: ${input.channel || "Manual channel selection"}\n\nCTA: ${input.cta || "Take the Business Stability Scorecard"}\n\nScope: This is a campaign strategy draft. It does not include live posting, platform management, promised outcomes, legal/tax/accounting/compliance advice, or full RGS Diagnostic/Implementation work unless separately approved.`,
      client_safe_explanation:
        "Client-ready deliverable draft after admin review. It preserves campaign scope and missing-input boundaries.",
      admin_only_rationale:
        "Report-export asset gives standalone/gig work a deliverable path without pretending PDF/export automation is wired.",
      manual_posting_instructions:
        "Review and approve as a client-visible campaign deliverable. Export through the existing report workflow only if separately wired.",
    },
  ];
}

function systemPrompt(): string {
  return `You are the RGS Campaign Control assistant.
Return strict JSON only with {"assets":[...]}.
Create reviewed campaign drafts from the provided customer-specific context.
Every asset must be practical, calm, direct, premium, and owner-respecting.
Do not promise revenue, profit, growth, leads, ROI, compliance, legal, tax, accounting, fiduciary, valuation, or certification outcomes.
Do not invent proof, testimonials, case studies, metrics, customer results, urgency, scarcity, or live integrations.
Do not auto-post. Drafts require admin review and approval before publishing.
Deterministic RGS scoring remains the source of truth; do not recalculate or override it.
Cannabis/MMJ guidance must be operational and documentation visibility only.
For each asset include asset_type, platform, title, draft_content, client_safe_explanation, admin_only_rationale, manual_posting_instructions.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdmin(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const workspaceScope = safeString(body.workspace_scope || "customer", 40) === "rgs_internal"
      ? "rgs_internal"
      : "customer";
    const rgsWorkspaceKey = safeString(body.rgs_workspace_key || "rgs_marketing", 120);
    const customerId = workspaceScope === "customer" ? safeString(body.customer_id, 80) : "";
    const briefId = safeString(body.campaign_brief_id, 80);
    const recommendation = body.recommendation ?? {};
    if ((!customerId && workspaceScope === "customer") || !briefId) {
      return json({ error: "customer_id and campaign_brief_id are required for customer campaigns", version: CAMPAIGN_FUNCTION_VERSION }, 400);
    }
    if (workspaceScope === "rgs_internal" && !rgsWorkspaceKey) {
      return json({ error: "rgs_workspace_key is required", version: CAMPAIGN_FUNCTION_VERSION }, 400);
    }

    const admin = adminClient();
    let customer: Record<string, unknown>;
    if (workspaceScope === "customer") {
      const { data: customerRow, error: customerError } = await admin
        .from("customers")
        .select("id,business_name,industry,lifecycle_state,is_demo_account,account_kind")
        .eq("id", customerId)
        .maybeSingle();
      if (customerError) throw customerError;
      if (!customerRow) return json({ error: "customer_not_found", version: CAMPAIGN_FUNCTION_VERSION }, 404);
      customer = customerRow;
    } else {
      customer = {
        id: null,
        business_name: "Revenue & Growth Systems",
        industry: "general_service",
        lifecycle_state: "rgs_internal",
        account_kind: "rgs_internal",
        is_demo_account: false,
      };
    }

    const briefQuery = admin.from("campaign_briefs").select("*").eq("id", briefId);
    const scopedBriefQuery = workspaceScope === "customer"
      ? briefQuery.eq("customer_id", customerId).eq("workspace_scope", "customer")
      : briefQuery.eq("workspace_scope", "rgs_internal").eq("rgs_workspace_key", rgsWorkspaceKey);
    const { data: brief, error: briefError } = await scopedBriefQuery.maybeSingle();
    if (briefError) throw briefError;
    if (!brief) return json({ error: "campaign_brief_not_found", version: CAMPAIGN_FUNCTION_VERSION }, 404);

    const profileQuery = admin.from("campaign_profiles").select("*");
    const scopedProfileQuery = workspaceScope === "customer"
      ? profileQuery.eq("customer_id", customerId).eq("workspace_scope", "customer")
      : profileQuery.eq("workspace_scope", "rgs_internal").eq("rgs_workspace_key", rgsWorkspaceKey);
    const { data: profile } = await scopedProfileQuery
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const proofsQuery = admin
      .from("campaign_connection_proofs")
      .select("provider,capability,status,last_verified_at,last_sync_at,client_safe_summary");
    const scopedProofsQuery = workspaceScope === "customer"
      ? proofsQuery.eq("customer_id", customerId).eq("workspace_scope", "customer")
      : proofsQuery.eq("workspace_scope", "rgs_internal").eq("rgs_workspace_key", rgsWorkspaceKey);
    const { data: proofs } = await scopedProofsQuery;

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    const requestContext = {
      customer,
      profile,
      brief,
      recommendation,
      connection_proofs: proofs ?? [],
      connection_rule:
        "If a connection is not proven by connection_proofs, describe manual posting/tracking only.",
    };

    let generated: any[] | null = null;
    let generationMode: "ai_gateway" | "rules_fallback" = "rules_fallback";
    let providerError: string | null = null;

    if (aiKey) {
      try {
        const resp = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: systemPrompt() },
              { role: "user", content: JSON.stringify(requestContext) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!resp.ok) {
          providerError = `AI provider returned ${resp.status}`;
        } else {
          const payload = await resp.json();
          const raw = payload?.choices?.[0]?.message?.content;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          if (Array.isArray(parsed?.assets)) {
            generated = parsed.assets;
            generationMode = "ai_gateway";
          }
        }
      } catch (e) {
        providerError = e instanceof Error ? e.message : "AI provider failure";
      }
    }

    if (!generated) {
      const businessName = typeof customer.business_name === "string" ? customer.business_name : "";
      generated = fallbackAssets({
        businessName,
        objective: brief.objective ?? "",
        audience: brief.target_audience ?? "",
        offer: brief.offer_service_line ?? "",
        cta: brief.cta ?? "",
        channel: brief.channel_platform ?? "",
      });
    }

    const rows = generated.slice(0, 8).map((asset) => {
      const content = safeString(asset.draft_content, 12000);
      const status = safetyStatus(content);
      return {
        customer_id: workspaceScope === "customer" ? customerId : null,
        workspace_scope: workspaceScope,
        rgs_workspace_key: workspaceScope === "rgs_internal" ? rgsWorkspaceKey : null,
        campaign_brief_id: briefId,
        asset_type: safeAssetType(asset.asset_type),
        platform: safeString(asset.platform || brief.channel_platform || "manual", 120),
        title: safeString(asset.title || "Campaign draft", 180),
        draft_content: content,
        ai_draft_metadata: {
          ai_assisted: generationMode === "ai_gateway",
          generation_mode: generationMode,
          function_version: CAMPAIGN_FUNCTION_VERSION,
          provider_error: providerError,
          connection_proofs_checked: Array.isArray(proofs) ? proofs.length : 0,
        },
        safety_status: status,
        brand_check_status: status,
        approval_status: status === "blocked" ? "needs_review" : "draft",
        publishing_status: "manual_only",
        client_visible: false,
        client_safe_explanation: safeString(asset.client_safe_explanation, 2000),
        admin_only_rationale: safeString(asset.admin_only_rationale, 4000),
        manual_posting_instructions:
          safeString(asset.manual_posting_instructions, 2000) ||
          "Manual posting only until a verified campaign connection proof exists.",
        created_by: auth.userId,
        updated_by: auth.userId,
      };
    });

    const { data: stored, error: insertError } = await admin
      .from("campaign_assets")
      .insert(rows)
      .select("*");
    if (insertError) throw insertError;

    await admin.from("campaign_events").insert({
      customer_id: workspaceScope === "customer" ? customerId : null,
      workspace_scope: workspaceScope,
      rgs_workspace_key: workspaceScope === "rgs_internal" ? rgsWorkspaceKey : null,
      campaign_brief_id: briefId,
      event_type: "ai_generated",
      actor_id: auth.userId,
      actor_role: "admin",
      event_detail: {
        function_version: CAMPAIGN_FUNCTION_VERSION,
        generation_mode: generationMode,
        provider_error: providerError,
        stored_count: stored?.length ?? 0,
      },
    });

    await admin
      .from("campaign_briefs")
      .update({
        status: "generated",
        publishing_status: "manual_only",
        updated_by: auth.userId,
      })
      .eq("id", briefId)
      .eq(workspaceScope === "customer" ? "customer_id" : "rgs_workspace_key", workspaceScope === "customer" ? customerId : rgsWorkspaceKey);

    return json({
      status: "ok",
      version: CAMPAIGN_FUNCTION_VERSION,
      generationMode,
      providerError,
      assets: stored ?? [],
    });
  } catch (e) {
    console.error("generate-campaign-assets error", e);
    return json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        version: CAMPAIGN_FUNCTION_VERSION,
      },
      500,
    );
  }
});
