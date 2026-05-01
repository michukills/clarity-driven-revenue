/**
 * P18 — Admin-only AI report/diagnostic assist.
 *
 * Public scorecard and diagnostic intake never call AI. This function is
 * admin-triggered from an existing deterministic report draft. It uses the
 * Lovable AI Gateway backend-side, logs token usage, and keeps the draft in
 * review. Nothing is client-facing until an admin approves it.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_VERSION = "p18.report-ai-assist.v1";

type DraftRow = {
  id: string;
  customer_id: string | null;
  scorecard_run_id: string | null;
  report_type: string;
  title: string | null;
  status: string;
  rubric_version: string;
  evidence_snapshot: unknown;
  draft_sections: { sections?: unknown[] } | null;
  recommendations: unknown[];
  risks: unknown[];
  missing_information: unknown[];
  confidence: string;
  admin_notes: string | null;
};

type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
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

function safeJson(value: unknown, max = 22000): string {
  const raw = JSON.stringify(value ?? null);
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max)}\n...[truncated for AI prompt safety]`;
}

async function logRun(
  admin: ReturnType<typeof adminClient>,
  input: {
    feature: string;
    model: string | null;
    status: "succeeded" | "failed" | "disabled";
    draftId: string | null;
    userId: string;
    usage?: Usage | null;
    error?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  await admin.from("ai_run_logs").insert({
    feature: input.feature,
    provider: "lovable_ai_gateway",
    model: input.model,
    status: input.status,
    object_table: "report_drafts",
    object_id: input.draftId,
    prompt_tokens: input.usage?.prompt_tokens ?? null,
    completion_tokens: input.usage?.completion_tokens ?? null,
    total_tokens: input.usage?.total_tokens ?? null,
    estimated_cost_usd: null,
    error_message: input.error ?? null,
    metadata: {
      billing_note: "Lovable AI Gateway usage is billed through Lovable Cloud & AI balance.",
      ai_version: AI_VERSION,
      ...(input.metadata ?? {}),
    },
    run_by: input.userId,
  } as any);
}

const REPORT_ASSIST_TOOL = {
  type: "function",
  function: {
    name: "emit_report_assist",
    description:
      "Return an evidence-grounded report draft assist payload. All output remains admin-review-only.",
    parameters: {
      type: "object",
      properties: {
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        rationale: { type: "string" },
        review_notes: { type: "array", items: { type: "string" } },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              body: { type: "string" },
              client_safe: { type: "boolean" },
            },
            required: ["key", "label", "body", "client_safe"],
            additionalProperties: false,
          },
        },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
              inference: { type: "boolean" },
              priority: { type: "string", enum: ["low", "medium", "high"] },
              client_safe: { type: "boolean" },
            },
            required: ["id", "title", "detail", "evidence_refs", "inference", "priority", "client_safe"],
            additionalProperties: false,
          },
        },
        risks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              title: { type: "string" },
              detail: { type: "string" },
              evidence_refs: { type: "array", items: { type: "string" } },
              severity: { type: "string", enum: ["low", "medium", "high"] },
              client_safe: { type: "boolean" },
            },
            required: ["id", "title", "detail", "evidence_refs", "severity", "client_safe"],
            additionalProperties: false,
          },
        },
        missing_information: {
          type: "array",
          items: {
            type: "object",
            properties: {
              area: { type: "string" },
              what_is_missing: { type: "string" },
              why_it_matters: { type: "string" },
            },
            required: ["area", "what_is_missing", "why_it_matters"],
            additionalProperties: false,
          },
        },
      },
      required: ["confidence", "rationale", "review_notes", "sections", "recommendations", "risks", "missing_information"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are an admin-only RGS report drafting assistant.

Voice (RGS / Matt voice):
- Calm, plain-English, owner-respecting. Sounds like a friend being honest with a small business owner — not a coach, consultant, agency, or AI.
- Diagnostic, not motivational. No hype. No "unlock", "empower", "optimize", "actionable insights", "next level", "powerful", "transform", "scalable", "leverage", "maximize", "robust", or similar filler.
- Practical and direct. Short sentences. No corporate consulting tone. No flattery. No shaming the owner.
- Where useful, frame findings as: what appears unstable, why it matters, what system area it connects to, and what the next practical step would be — without claiming certainty the evidence does not support.

Rules:
- Use ONLY the provided deterministic draft and evidence snapshot.
- Do not invent revenue, costs, percentages, customer facts, names, sources, or integrations.
- If evidence is missing, say what is missing instead of filling the gap.
- No guaranteed outcomes, no case-study claims, no "fully secure", no "bank-level security", no overpromises.
- Do not provide legal, tax, accounting, HR, or compliance advice.
- Keep all client_safe flags false. A human admin must review before anything is client-facing.
- Preserve section keys when possible.
- Return structured tool output only.

Service boundary (must be reflected in tone, never as a long disclaimer):
- RGS provides diagnosis, structure, visibility, and decision support. RGS does not run the business, manage employees, enforce adoption, replace legal/tax/accounting/HR/payroll/insurance/compliance professionals, or guarantee revenue, stabilization, or business outcomes.
- The owner keeps final decision authority and remains responsible for execution, staffing, compliance, and business outcomes.
- Frame recommendations as suggested next steps, decision points, or areas to review — not directives or guarantees.
- Distinguish likely patterns from proven facts. Prefer phrasing like "based on the information provided, this appears to be a system area worth reviewing" or "this finding should be treated as a starting point until validated against business records or owner review" when certainty is limited.
- If the evidence is incomplete, say so plainly and note that incomplete or inaccurate information may limit the usefulness of the finding.`;

const SCOPE_AND_EVIDENCE_RULES = `
Scope rules:
- A standard Diagnostic covers one primary business, one primary operating unit or location, and one primary product, service, or revenue line. If the evidence suggests multiple locations, brands, major service lines, or revenue models, note that RGS may recommend reviewing them separately or phasing the review so one weak area does not blur the rest of the system. Do not silently combine them.

Evidence + certainty rules:
- When information is incomplete, say so plainly. Do not make the business sound more certain than the evidence supports.
- Prefer "appears", "suggests", "may indicate", "based on the information provided", "this may be worth reviewing", or "there is not enough information to conclude" when evidence is limited.
- Use "observed" only when directly supported by submitted data.
- Do not recommend major action based on weak evidence without saying it should be validated first.
- Do not fill gaps with generic consulting assumptions. Add the missing area to missing_information instead.
- Avoid: "this proves", "this guarantees", "the business will", "the cause is definitely", "this will fix".`;

function buildPrompt(draft: DraftRow): string {
  return [
    `Report type: ${draft.report_type}`,
    `Title: ${draft.title ?? "Untitled"}`,
    `Rubric version: ${draft.rubric_version}`,
    `Current confidence: ${draft.confidence}`,
    "",
    "Deterministic draft sections:",
    safeJson(draft.draft_sections),
    "",
    "Current recommendations:",
    safeJson(draft.recommendations),
    "",
    "Current risks:",
    safeJson(draft.risks),
    "",
    "Current missing information:",
    safeJson(draft.missing_information),
    "",
    "Evidence snapshot:",
    safeJson(draft.evidence_snapshot),
    "",
    "Task: improve clarity, sequencing, and diagnostic usefulness while staying grounded in the evidence. Return only the structured report assist payload.",
  ].join("\n");
}

function forceAdminOnly(parsed: any) {
  const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const risks = Array.isArray(parsed.risks) ? parsed.risks : [];
  const missing = Array.isArray(parsed.missing_information) ? parsed.missing_information : [];

  return {
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "low",
    rationale: String(parsed.rationale ?? "AI assist completed; admin review required."),
    review_notes: Array.isArray(parsed.review_notes)
      ? parsed.review_notes.map((n: unknown) => String(n)).slice(0, 8)
      : [],
    sections: sections.slice(0, 8).map((s: any, i: number) => ({
      key: String(s.key ?? `section_${i + 1}`),
      label: String(s.label ?? `Section ${i + 1}`),
      body: String(s.body ?? ""),
      client_safe: false,
    })),
    recommendations: recommendations.slice(0, 8).map((r: any, i: number) => ({
      id: String(r.id ?? `ai_rec_${i + 1}`),
      title: String(r.title ?? "Recommendation"),
      detail: String(r.detail ?? ""),
      evidence_refs: Array.isArray(r.evidence_refs) ? r.evidence_refs.map((x: unknown) => String(x)).slice(0, 8) : [],
      inference: Boolean(r.inference ?? true),
      priority: ["low", "medium", "high"].includes(r.priority) ? r.priority : "medium",
      client_safe: false,
    })),
    risks: risks.slice(0, 8).map((r: any, i: number) => ({
      id: String(r.id ?? `ai_risk_${i + 1}`),
      title: String(r.title ?? "Risk"),
      detail: String(r.detail ?? ""),
      evidence_refs: Array.isArray(r.evidence_refs) ? r.evidence_refs.map((x: unknown) => String(x)).slice(0, 8) : [],
      severity: ["low", "medium", "high"].includes(r.severity) ? r.severity : "medium",
      client_safe: false,
    })),
    missing_information: missing.slice(0, 10).map((m: any) => ({
      area: String(m.area ?? "Missing information"),
      what_is_missing: String(m.what_is_missing ?? ""),
      why_it_matters: String(m.why_it_matters ?? ""),
    })),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let draftId: string | null = null;
  let userId = "unknown";
  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

  try {
    const adminAuth = await requireAdmin(req, corsHeaders);
    if (!adminAuth.ok) return adminAuth.response;
    userId = adminAuth.userId;

    const admin = adminClient();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const body = await req.json().catch(() => ({}));
    draftId = typeof body?.draft_id === "string" ? body.draft_id : null;
    if (!draftId) return json({ error: "draft_id is required" }, 400);

    const { data: draft, error: draftError } = await admin
      .from("report_drafts")
      .select("*")
      .eq("id", draftId)
      .maybeSingle();
    if (draftError) return json({ error: draftError.message }, 500);
    if (!draft) return json({ error: "Draft not found" }, 404);

    if (!LOVABLE_API_KEY) {
      await admin
        .from("report_drafts")
        .update({ ai_status: "disabled" } as any)
        .eq("id", draftId);
      await logRun(admin, {
        feature: "report_ai_assist",
        model,
        status: "disabled",
        draftId,
        userId,
        error: "LOVABLE_API_KEY missing",
      });
      return json({
        error: "AI gateway not configured. Deterministic draft remains available.",
        fallback: "deterministic",
      }, 503);
    }

    await admin
      .from("report_drafts")
      .update({ ai_status: "queued" } as any)
      .eq("id", draftId);

    const aiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n" + SCOPE_AND_EVIDENCE_RULES },
          { role: "user", content: buildPrompt(draft as DraftRow) },
        ],
        tools: [REPORT_ASSIST_TOOL],
        tool_choice: { type: "function", function: { name: "emit_report_assist" } },
      }),
    });

    if (aiResponse.status === 429) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: "rate_limited" });
      return json({ error: "AI rate limit reached. Deterministic draft remains available." }, 429);
    }
    if (aiResponse.status === 402) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: "workspace_credits_exhausted" });
      return json({ error: "AI workspace credits exhausted. Add Lovable Cloud & AI balance." }, 402);
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text().catch(() => "");
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, error: text.slice(0, 500) });
      return json({ error: "AI assist unavailable. Deterministic draft remains available." }, 502);
    }

    const payload = await aiResponse.json();
    const realUsage = (payload?.usage ?? null) as Usage | null;
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: "missing_tool_args" });
      return json({ error: "AI returned no structured draft assist." }, 502);
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: `malformed_tool_args: ${String(e)}` });
      return json({ error: "AI returned malformed draft assist." }, 502);
    }

    const cleaned = forceAdminOnly(parsed as any);
    const existingNotes = (draft as DraftRow).admin_notes?.trim();
    const aiNotes = [
      `AI assist (${AI_VERSION}) — admin review required.`,
      cleaned.rationale,
      ...cleaned.review_notes.map((n: string) => `- ${n}`),
    ].join("\n");

    const { error: updateError } = await admin
      .from("report_drafts")
      .update({
        generation_mode: "ai_assisted",
        ai_status: "complete",
        ai_model: model,
        ai_version: AI_VERSION,
        draft_sections: { sections: cleaned.sections },
        recommendations: cleaned.recommendations,
        risks: cleaned.risks,
        missing_information: cleaned.missing_information,
        confidence: cleaned.confidence,
        status: "needs_review",
        client_safe: false,
        admin_notes: existingNotes ? `${existingNotes}\n\n---\n${aiNotes}` : aiNotes,
      } as any)
      .eq("id", draftId);
    if (updateError) {
      await logRun(admin, { feature: "report_ai_assist", model, status: "failed", draftId, userId, usage: realUsage, error: updateError.message });
      return json({ error: updateError.message }, 500);
    }

    await admin.from("report_draft_learning_events").insert({
      draft_id: draftId,
      event_type: "section_rewritten",
      before_value: {
        generation_mode: "deterministic",
        status: (draft as DraftRow).status,
      } as any,
      after_value: {
        generation_mode: "ai_assisted",
        model,
        ai_version: AI_VERSION,
        confidence: cleaned.confidence,
      } as any,
      notes: "AI-assisted draft generated. Admin review required before client use.",
      actor_id: userId,
    } as any);

    await logRun(admin, {
      feature: "report_ai_assist",
      model,
      status: "succeeded",
      draftId,
      userId,
      usage: realUsage,
      metadata: { report_type: (draft as DraftRow).report_type },
    });

    return json({
      ok: true,
      draft_id: draftId,
      ai_status: "complete",
      model,
      usage: realUsage,
      review_required: true,
    });
  } catch (e) {
    try {
      const admin = adminClient();
      if (draftId) await admin.from("report_drafts").update({ ai_status: "failed" } as any).eq("id", draftId);
      await logRun(admin, {
        feature: "report_ai_assist",
        model,
        status: "failed",
        draftId,
        userId,
        error: e instanceof Error ? e.message : String(e),
      });
    } catch {
      // Avoid masking the original failure.
    }
    return json({ error: e instanceof Error ? e.message : "AI assist failed" }, 500);
  }
});
