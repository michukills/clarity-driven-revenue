/**
 * SOP / Training Bible AI Assist (admin-only).
 *
 * Drafts or improves an SOP entry for the implementation lane.
 * Output is admin-only by default (status=draft, client_visible=false,
 * admin must review before applying / publishing).
 *
 * - All AI traffic goes through the Lovable AI Gateway server-side.
 * - No frontend / admin / client source file may read LOVABLE_API_KEY
 *   or hit the gateway directly.
 * - Admin auth is required and verified before the gateway is called.
 * - Logged into ai_run_logs (admin-only RLS) for usage visibility.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { buildAiPriorityPreamble } from "../_shared/ai-priority-preamble.ts";
import { attachAiOutputEnvelope } from "../_shared/ai-output-envelope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Mode = "draft" | "improve";

interface SopSeed {
  mode?: Mode;
  // identity / context
  customer_id?: string | null;
  sop_entry_id?: string | null;
  industry_context?: string | null;
  // raw inputs
  task_description?: string | null;
  current_process_notes?: string | null;
  desired_outcome?: string | null;
  role_team?: string | null;
  known_bottlenecks?: string | null;
  software_tools?: string | null;
  customer_handoff_points?: string | null;
  quality_issues?: string | null;
  what_usually_goes_wrong?: string | null;
  what_owner_wants_standardized?: string | null;
  // existing SOP body when improving
  existing?: {
    title?: string | null;
    purpose?: string | null;
    role_team?: string | null;
    trigger_when_used?: string | null;
    inputs_tools_needed?: string | null;
    quality_standard?: string | null;
    common_mistakes?: string | null;
    escalation_point?: string | null;
    owner_decision_point?: string | null;
    training_notes?: string | null;
    client_summary?: string | null;
    steps?: { order: number; instruction: string; expected_outcome?: string | null; note?: string | null }[];
  } | null;
}

const SOP_TOOL = {
  type: "function",
  function: {
    name: "emit_sop_draft",
    description:
      "Return a clear, repeatable SOP draft for the RGS implementation lane. Output is a DRAFT — admin must review before publishing.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        purpose: { type: "string" },
        role_team: { type: "string" },
        trigger_when_used: { type: "string" },
        inputs_tools_needed: { type: "string" },
        steps: {
          type: "array",
          description:
            "5-12 LEGO-style numbered steps. Each step has a single, unambiguous instruction.",
          items: {
            type: "object",
            properties: {
              order: { type: "integer" },
              instruction: { type: "string" },
              expected_outcome: { type: "string" },
              note: { type: "string" },
            },
            required: ["order", "instruction"],
          },
        },
        quality_standard: { type: "string" },
        common_mistakes: { type: "string" },
        escalation_point: { type: "string" },
        owner_decision_point: { type: "string" },
        training_notes: { type: "string" },
        client_summary: { type: "string" },
        admin_review_notes: {
          type: "string",
          description:
            "Admin-only notes: what to verify, what was assumed, what is missing.",
        },
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        missing_validation: { type: "array", items: { type: "string" } },
      },
      required: ["title", "steps", "client_summary", "admin_review_notes", "confidence"],
    },
  },
};

const SYSTEM_PROMPT = `${buildAiPriorityPreamble({ task_type: "sop_training_bible", tool_key: "sop_training_bible" })}

You are an experienced operations/SOP writer working inside the RGS Operating System.

You produce a DRAFT SOP for the implementation lane. The goal is repeatable, high-quality, efficient, owner-independent operating instructions that a new team member could follow with minimal interpretation — closer to LEGO-style instructions for business tasks.

The output is a DRAFT. An RGS admin will review and edit before anything is shown to a client. You never publish. You never set anything client-visible.

Required output discipline:
- 5-12 numbered steps. Each step is one action, in plain English, with the expected outcome where useful.
- Avoid vague verbs ("manage", "handle", "deal with"). Use specific verbs ("open", "enter", "confirm", "send", "log").
- Quality standard = the definition of done a reviewer can check.
- Common mistakes = 2-5 concrete failure modes someone new actually makes.
- Escalation point = when to stop and ask, who to ask, and what to send them.
- Owner decision point = when the business owner (not the doer) has to make a call, and what info they need to make it well.
- Training notes = what a new person should practice or shadow first.
- client_summary = the plain-language version safe to show the client.
- admin_review_notes = what the admin should verify, what was assumed, what is missing.
- Always populate missing_validation with the most important questions the admin should answer to upgrade this from draft to validated.
- confidence = "low" with thin input, "medium" with most fields, "high" only when bottlenecks, tools, and desired outcome are all provided.

Voice + safety (RGS / Matt voice):
- Calm, plain-English, owner-respecting. No hype, no motivational language, no agency tone, no flattery, no shaming.
- Banned filler in customer-safe text: "unlock", "empower", "optimize", "actionable insights", "next level", "supercharge", "leverage", "maximize", "transform", "growth hacks", "dominate", "crush it", "seamless", "scalable", "game-changing", "autopilot", "command center", "cockpit", "AI-generated".
- Tools, SOPs, and operating controls are decision support, not automatic fixes. Never imply RGS operates the business.
- Do NOT promise outcomes. Do NOT promise unlimited support, indefinite advisory access, or done-for-you operations.
- Do NOT provide legal, tax, accounting, HR, payroll, insurance, healthcare, or compliance advice. If a step touches a regulated area, write "review with the appropriate licensed professional before taking action".
- Do NOT certify compliance. Do NOT guarantee renewal, ROI, revenue, or compliance outcomes.
- Cannabis / MMJ / MMC contexts are dispensary / retail / rec operations only — Not healthcare, not patient care, not HIPAA. State-specific rules may apply; review with qualified counsel where required.

Always call the emit_sop_draft tool. Never reply in free text.`;

function buildPrompt(seed: SopSeed): string {
  const lines: string[] = [];
  const mode: Mode = seed.mode === "improve" ? "improve" : "draft";
  lines.push(`Mode: ${mode === "improve" ? "Improve the existing SOP draft." : "Generate a new SOP draft from raw notes."}`);
  if (seed.industry_context) lines.push(`Industry context: ${seed.industry_context}`);
  if (seed.role_team) lines.push(`Role / team: ${seed.role_team}`);
  if (seed.task_description) lines.push(`Task description: ${seed.task_description}`);
  if (seed.desired_outcome) lines.push(`Desired outcome: ${seed.desired_outcome}`);
  if (seed.current_process_notes) lines.push(`Current process notes:\n${seed.current_process_notes}`);
  if (seed.known_bottlenecks) lines.push(`Known bottlenecks: ${seed.known_bottlenecks}`);
  if (seed.software_tools) lines.push(`Software / tools used: ${seed.software_tools}`);
  if (seed.customer_handoff_points) lines.push(`Customer handoff points: ${seed.customer_handoff_points}`);
  if (seed.quality_issues) lines.push(`Quality issues: ${seed.quality_issues}`);
  if (seed.what_usually_goes_wrong) lines.push(`What usually goes wrong: ${seed.what_usually_goes_wrong}`);
  if (seed.what_owner_wants_standardized) lines.push(`What the owner wants standardized: ${seed.what_owner_wants_standardized}`);
  if (mode === "improve" && seed.existing) {
    lines.push("Existing SOP draft to improve (preserve intent, fix clarity, sequencing, and gaps):");
    lines.push(JSON.stringify(seed.existing));
  }
  return lines.join("\n");
}

async function logRun(opts: {
  url: string;
  serviceRole: string;
  status: "succeeded" | "failed" | "disabled";
  model: string | null;
  runBy: string | null;
  customerId: string | null;
  sopId: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
  mode: Mode;
}) {
  try {
    const admin = createClient(opts.url, opts.serviceRole, { auth: { persistSession: false } });
    await admin.from("ai_run_logs").insert({
      feature: "sop_ai_assist",
      provider: "lovable_ai_gateway",
      model: opts.model,
      status: opts.status,
      object_table: "sop_training_entries",
      object_id: opts.sopId,
      prompt_tokens: opts.promptTokens ?? null,
      completion_tokens: opts.completionTokens ?? null,
      total_tokens: opts.totalTokens ?? null,
      error_message: opts.errorMessage ?? null,
      run_by: opts.runBy,
      metadata: {
        mode: opts.mode,
        customer_id: opts.customerId,
      },
    });
  } catch (e) {
    console.error("ai_run_logs insert failed", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminAuth = await requireAdmin(req, corsHeaders);
    if (!adminAuth.ok) return adminAuth.response;

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

    const seed = (await req.json()) as SopSeed;
    const mode: Mode = seed.mode === "improve" ? "improve" : "draft";
    const customerId = seed.customer_id ?? null;
    const sopId = seed.sop_entry_id ?? null;

    if (!LOVABLE_API_KEY) {
      await logRun({
        url, serviceRole, status: "disabled", model: null, runBy: adminAuth.userId,
        customerId, sopId, errorMessage: "LOVABLE_API_KEY missing", mode,
      });
      return new Response(
        JSON.stringify({ error: "AI gateway not configured (LOVABLE_API_KEY missing)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!seed || typeof seed !== "object") {
      return new Response(JSON.stringify({ error: "Invalid seed payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hasInput =
      !!seed.task_description ||
      !!seed.current_process_notes ||
      !!seed.desired_outcome ||
      (mode === "improve" && !!seed.existing);
    if (!hasInput) {
      return new Response(
        JSON.stringify({ error: "Provide a task description, current process notes, desired outcome, or an existing SOP to improve." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userPrompt = buildPrompt(seed);

    const aiResponse = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [SOP_TOOL],
        tool_choice: { type: "function", function: { name: "emit_sop_draft" } },
      }),
    });

    if (aiResponse.status === 429) {
      await logRun({ url, serviceRole, status: "failed", model, runBy: adminAuth.userId, customerId, sopId, errorMessage: "rate_limited", mode });
      return new Response(
        JSON.stringify({ error: "AI rate limit reached, please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResponse.status === 402) {
      await logRun({ url, serviceRole, status: "failed", model, runBy: adminAuth.userId, customerId, sopId, errorMessage: "credits_exhausted", mode });
      return new Response(
        JSON.stringify({ error: "AI workspace credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      await logRun({ url, serviceRole, status: "failed", model, runBy: adminAuth.userId, customerId, sopId, errorMessage: `gateway_${aiResponse.status}`, mode });
      return new Response(
        JSON.stringify({ error: "AI draft unavailable right now. Manual SOP editor still works." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await aiResponse.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    const usage = payload?.usage ?? {};
    if (!argsRaw) {
      await logRun({ url, serviceRole, status: "failed", model, runBy: adminAuth.userId, customerId, sopId, errorMessage: "no_tool_call", mode });
      return new Response(
        JSON.stringify({ error: "AI returned no structured SOP. Try again or use the manual editor." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Tool args JSON parse failed", e);
      await logRun({ url, serviceRole, status: "failed", model, runBy: adminAuth.userId, customerId, sopId, errorMessage: "parse_error", mode });
      return new Response(
        JSON.stringify({ error: "AI returned malformed SOP payload." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    await logRun({
      url, serviceRole, status: "succeeded", model, runBy: adminAuth.userId,
      customerId, sopId,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
      mode,
    });

    // Force admin-only defaults on the returned draft envelope.
    return new Response(
      JSON.stringify({
        sop: parsed,
        defaults: {
          status: "draft",
          client_visible: false,
          review_state: "not_reviewed",
        },
        review_required: true,
        client_visible: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("sop-ai-assist error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});