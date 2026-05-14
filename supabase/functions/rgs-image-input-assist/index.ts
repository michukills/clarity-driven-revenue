/**
 * P94A — Image/document-to-input assist.
 *
 * Authenticated client/admin helper. It extracts draft structured input from
 * selected files, but never writes the extracted values. The caller must show
 * the draft and require human confirmation before any downstream save.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const GUIDE_VERSION = "p94a-guide-bots-v1";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Surface = "client" | "admin";

type ExtractionFieldInput = {
  key?: unknown;
  label?: unknown;
  value?: unknown;
  confidence?: unknown;
  source_note?: unknown;
  sensitivity?: unknown;
};

const EXTRACTION_TOOL = {
  type: "function",
  function: {
    name: "emit_rgs_input_extraction",
    description:
      "Return draft structured fields from an uploaded image/document. Nothing is verified or written.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        recommended_destination: { type: "string" },
        fields: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              value: { type: "string" },
              confidence: { type: "string", enum: ["low", "medium", "high"] },
              source_note: { type: "string" },
              sensitivity: { type: "string", enum: ["normal", "sensitive", "regulated_review"] },
            },
            required: ["key", "label", "value", "confidence", "source_note", "sensitivity"],
          },
        },
        warnings: { type: "array", items: { type: "string" } },
      },
      required: ["summary", "recommended_destination", "fields", "warnings"],
    },
  },
};

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

function anonClient(auth: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase anon environment not configured");
  return createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
}

async function getAuth(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const { data } = await anonClient(auth).auth.getUser();
  const userId = data?.user?.id ?? null;
  if (!userId) return null;
  const admin = adminClient();
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
  return { userId, isAdmin: isAdmin === true };
}

function baseWarnings(mimeType: string): string[] {
  const warnings = [
    "AI extraction is a draft only. Confirm or edit before storing or using it.",
    "Do not upload sensitive personal, health, financial, regulated, or client-private data unless it belongs in this RGS workspace.",
    "This does not verify evidence or provide legal, tax, accounting, compliance, valuation, or financial advice.",
  ];
  if (!/^image\/|application\/pdf|text\/|application\/vnd/.test(mimeType)) {
    warnings.unshift("This file type may not extract cleanly. Use a screenshot, image, PDF, or text export when possible.");
  }
  return warnings;
}

function fallback(surface: Surface, mimeType: string, mode: "unavailable" | "deterministic", summary?: string) {
  return {
    version: GUIDE_VERSION,
    surface,
    mode,
    draftLabel: "AI-assisted draft",
    summary:
      summary ??
      "Extraction needs the backend AI gateway. No data was written. You can still describe the material manually.",
    fields: [],
    recommendedDestination: surface === "admin" ? "Admin review notes" : "Portal upload or clarification note",
    warnings: baseWarnings(mimeType),
    requiresConfirmationBeforeWrite: true,
    verified: false,
  };
}

async function verifyCustomerScope(surface: Surface, userId: string, isAdmin: boolean, customerId: string | null) {
  if (surface === "admin") {
    if (!isAdmin) return { ok: false, response: json({ error: "Admin access required" }, 403) };
    return { ok: true, customerId };
  }
  const admin = adminClient();
  if (!customerId) {
    const { data } = await admin
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle();
    return { ok: true, customerId: data?.id ?? null };
  }
  const { data } = await admin
    .from("customers")
    .select("id,user_id")
    .eq("id", customerId)
    .maybeSingle();
  if (!data || data.user_id !== userId) return { ok: false, response: json({ error: "Forbidden" }, 403) };
  return { ok: true, customerId };
}

async function logRun(input: {
  status: "succeeded" | "failed" | "disabled";
  model: string | null;
  userId: string;
  surface: Surface;
  customerId: string | null;
  error?: string | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}) {
  try {
    const admin = adminClient();
    await admin.from("ai_run_logs").insert({
      feature: "p94a_image_input_assist",
      provider: "lovable_ai_gateway",
      model: input.model,
      status: input.status,
      object_table: input.customerId ? "customers" : null,
      object_id: input.customerId,
      prompt_tokens: input.usage?.prompt_tokens ?? null,
      completion_tokens: input.usage?.completion_tokens ?? null,
      total_tokens: input.usage?.total_tokens ?? null,
      estimated_cost_usd: null,
      error_message: input.error ?? null,
      metadata: {
        guide_version: GUIDE_VERSION,
        surface: input.surface,
        write_actions: "none",
        requires_confirmation_before_write: true,
        verified: false,
      },
      run_by: input.userId,
    } as Record<string, unknown>);
  } catch (e) {
    console.error("p94a image assist ai_run_logs insert failed", e);
  }
}

function systemPrompt(surface: Surface): string {
  return `You are extracting draft structured input for Revenue & Growth Systems (${surface} surface).

Rules:
- Output draft fields only. Do not verify evidence.
- Do not provide legal, tax, accounting, compliance, valuation, fiduciary, or financial advice.
- Do not infer facts that are not visible or provided.
- Mark uncertainty with low confidence.
- Flag sensitive or regulated information for human review.
- Cannabis/MMJ/dispensary content is operational-readiness evidence only, never compliance certification.
- The result must remain AI-assisted draft data and requires human confirmation before any write.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";
  try {
    const auth = await getAuth(req);
    if (!auth) return json({ error: "Authentication required" }, 401);

    const body = await req.json().catch(() => ({}));
    const surface: Surface = body?.surface === "admin" ? "admin" : "client";
    const route = typeof body?.route === "string" ? body.route : "";
    const customerId = typeof body?.customerId === "string" ? body.customerId : null;
    const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 180) : "uploaded file";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType.slice(0, 100) : "application/octet-stream";
    const text = typeof body?.text === "string" ? body.text.slice(0, 10000) : "";
    const imageDataUrl = typeof body?.imageDataUrl === "string" && body.imageDataUrl.startsWith("data:image/")
      ? body.imageDataUrl.slice(0, 5_000_000)
      : "";

    const scope = await verifyCustomerScope(surface, auth.userId, auth.isAdmin, customerId);
    if (!scope.ok) return scope.response!;

    if (!text && !imageDataUrl) {
      return json(fallback(surface, mimeType, "deterministic", "No extractable text or supported image data was provided."), 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await logRun({ status: "disabled", model, userId: auth.userId, surface, customerId: scope.customerId, error: "LOVABLE_API_KEY missing" });
      return json(fallback(surface, mimeType, "unavailable"));
    }

    const userContent: unknown[] = [
      {
        type: "text",
        text: [
          `Route: ${route}`,
          `File name: ${fileName}`,
          `MIME type: ${mimeType}`,
          "Extract likely structured fields that could help RGS workflow input.",
          text ? `Text content:\n${text}` : "Image content is attached. Extract only visible information.",
        ].join("\n\n"),
      },
    ];
    if (imageDataUrl) {
      userContent.push({ type: "image_url", image_url: { url: imageDataUrl } });
    }

    const aiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt(surface) },
          { role: "user", content: userContent },
        ],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "function", function: { name: "emit_rgs_input_extraction" } },
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      await logRun({ status: "failed", model, userId: auth.userId, surface, customerId: scope.customerId, error: `gateway_${aiResponse.status}` });
      return json(fallback(surface, mimeType, "unavailable", "Extraction is unavailable right now. No data was written."), 200);
    }

    const payload = await aiResponse.json();
    const argsRaw = payload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!argsRaw) {
      await logRun({ status: "failed", model, userId: auth.userId, surface, customerId: scope.customerId, error: "no_tool_call" });
      return json(fallback(surface, mimeType, "unavailable", "Extraction returned no structured draft. No data was written."), 200);
    }

    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    await logRun({ status: "succeeded", model, userId: auth.userId, surface, customerId: scope.customerId, usage: payload?.usage ?? null });
    return json({
      version: GUIDE_VERSION,
      surface,
      mode: "ai_backed",
      draftLabel: "AI-assisted draft",
      summary: String(parsed?.summary ?? "Draft extracted for review."),
      fields: Array.isArray(parsed?.fields)
        ? (parsed.fields as ExtractionFieldInput[]).slice(0, 16).map((field, idx) => ({
            key: String(field?.key ?? `field_${idx + 1}`).slice(0, 80),
            label: String(field?.label ?? "Field").slice(0, 120),
            value: String(field?.value ?? "").slice(0, 1000),
            confidence: ["low", "medium", "high"].includes(field?.confidence) ? field.confidence : "low",
            sourceNote: String(field?.source_note ?? "AI-assisted extraction").slice(0, 240),
            sensitivity: ["normal", "sensitive", "regulated_review"].includes(field?.sensitivity)
              ? field.sensitivity
              : "normal",
          }))
        : [],
      recommendedDestination: String(parsed?.recommended_destination ?? (surface === "admin" ? "Admin review notes" : "Portal upload or clarification note")),
      warnings: [...baseWarnings(mimeType), ...(Array.isArray(parsed?.warnings) ? parsed.warnings.map(String) : [])].slice(0, 8),
      requiresConfirmationBeforeWrite: true,
      verified: false,
    });
  } catch (e) {
    console.error("p94a rgs-image-input-assist error", e);
    return json({ error: "Image/document assist unavailable. No data was written.", version: GUIDE_VERSION }, 500);
  }
});
