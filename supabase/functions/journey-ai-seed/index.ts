/**
 * P13.4 — AI Customer Journey Seed.
 *
 * Generates a hypothesis Customer Journey (8 RGS stages) from a small
 * admin-supplied seed (product, problem, price, geography, persona hint,
 * etc.) using the Lovable AI Gateway with structured tool calling.
 *
 * Output is a HYPOTHESIS — every field is labelled needs-validation in
 * the merge step, and friction / recommended actions are routed admin-only.
 */

import { requireAdmin } from "../_shared/admin-auth.ts";
import { buildAiPriorityPreamble } from "../_shared/ai-priority-preamble.ts";
import { attachAiOutputEnvelope } from "../_shared/ai-output-envelope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface SeedInput {
  product_name?: string;
  product_description?: string;
  problem_solved?: string;
  price_or_range?: string;
  target_market?: string;
  buyer_type?: string;
  persona_hint?: string;
  best_customers?: string;
  bad_fit_customers?: string;
  sales_notes?: string;
}

const STAGE_KEYS = [
  "awareness",
  "problem_recognition",
  "consideration",
  "trust_building",
  "decision",
  "onboarding",
  "delivery",
  "retention",
] as const;

const JOURNEY_TOOL = {
  type: "function",
  function: {
    name: "emit_hypothesis_journey",
    description:
      "Return a single hypothesis Customer Journey across the 8 RGS stages. Every field is a hypothesis until a human validates it.",
    parameters: {
      type: "object",
      properties: {
        confidence: {
          type: "string",
          description: "One of: low, medium, high",
        },
        rationale: { type: "string" },
        evidence_used: { type: "array", items: { type: "string" } },
        missing_validation: { type: "array", items: { type: "string" } },
        stages: {
          type: "array",
          description:
            "Exactly 8 stages in order: awareness, problem_recognition, consideration, trust_building, decision, onboarding, delivery, retention.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Stage key: awareness | problem_recognition | consideration | trust_building | decision | onboarding | delivery | retention",
              },
              buyer_mindset: { type: "string" },
              buyer_question: { type: "string" },
              friction_point: { type: "string" },
              recommended_action: { type: "string" },
              target_gear: {
                type: "integer",
                description: "RGS Stability Gear 1-5",
              },
              evidence_source: { type: "string" },
              client_safe_mindset: { type: "boolean" },
            },
            required: ["key", "buyer_mindset", "buyer_question"],
          },
        },
        client_safe_summary: { type: "string" },
        admin_strategy_notes: { type: "string" },
      },
      required: ["confidence", "rationale", "stages", "client_safe_summary", "admin_strategy_notes"],
    },
  },
};

function buildPrompt(seed: SeedInput): string {
  const lines: string[] = [];
  lines.push("Seed input from the admin (everything is optional except product/problem):");
  if (seed.product_name) lines.push(`- Product / service: ${seed.product_name}`);
  if (seed.product_description) lines.push(`- Description: ${seed.product_description}`);
  if (seed.problem_solved) lines.push(`- Problem it solves: ${seed.problem_solved}`);
  if (seed.price_or_range) lines.push(`- Price / range: ${seed.price_or_range}`);
  if (seed.target_market) lines.push(`- Target market / geography: ${seed.target_market}`);
  if (seed.buyer_type) lines.push(`- Buyer type hint: ${seed.buyer_type}`);
  if (seed.persona_hint) lines.push(`- Persona hint: ${seed.persona_hint}`);
  if (seed.best_customers) lines.push(`- Known best-fit customers: ${seed.best_customers}`);
  if (seed.bad_fit_customers) lines.push(`- Known bad-fit customers: ${seed.bad_fit_customers}`);
  if (seed.sales_notes) lines.push(`- Sales / review notes: ${seed.sales_notes}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are an experienced B2B/B2C buyer-journey strategist working inside the RGS Operating System.

You generate a HYPOTHESIS Customer Journey from a small seed of admin-supplied facts. You are NOT being given real customer evidence, so you must:
- Cover all 8 stages: awareness, problem_recognition, consideration, trust_building, decision, onboarding, delivery, retention.
- For each stage, give a plausible buyer_mindset and buyer_question. friction_point and recommended_action are optional but useful when reasonable.
- Set confidence to "low" when the seed is thin (under ~3 fields), "medium" when most strategic seeds are present, "high" only when known best/bad customers and sales notes are also provided.
- Always populate "missing_validation" with the most important questions a human should answer to upgrade this from hypothesis to evidence-backed.
- Keep "client_safe_summary" plain-language and free of internal sales tactics, friction diagnoses, or disqualifier language.
- Put any tactical / qualification / disqualifier / sequencing logic in "admin_strategy_notes" or each stage's friction_point / recommended_action.
- Map each stage to the most likely RGS Stability Gear: 1 Demand, 2 Conversion, 3 Operations, 4 Financial Visibility, 5 Owner Independence.
- Only set client_safe_mindset=true on a stage if the buyer_mindset and buyer_question are safe to show the client (no internal sales tactics, no diagnosis of their team).

Voice + safety (RGS / Matt voice — applies to every customer-safe field, including client_safe_summary and any client_safe_mindset stage):
- Calm, plain-English, owner-respecting. Sounds like a friend being honest with a small business owner — not a coach, consultant, agency, or AI. No hype, no motivational language, no flattery, no shaming.
- Banned filler in customer-safe text: "unlock", "empower", "optimize", "actionable insights", "next level", "supercharge", "leverage", "maximize", "transform", "growth hacks", "dominate", "crush it", "seamless", "scalable", "game-changing", "autopilot", "command center", "cockpit", "AI-generated".
- Use "appears", "may suggest", "based on the information provided" when certainty is limited. Never imply guaranteed outcomes, revenue lifts, or "we will".
- Do NOT provide legal, tax, accounting, HR, payroll, insurance, or compliance advice. If a stage touches a regulated area, prefer "this should be reviewed with the appropriate licensed professional before action is taken." Cannabis / MMJ / MMC contexts are dispensary / retail / rec operations, not healthcare or patient care, and still require licensed compliance review.

RGS Stability System™ — five gears (use these names exactly when naming a gear in any output, customer-safe or admin-only): Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, Owner Independence. Map each stage to the integer 1-5 in target_gear (1=Demand Generation, 2=Revenue Conversion, 3=Operational Efficiency, 4=Financial Visibility, 5=Owner Independence). Do not rename, shorten, collapse, or invent gears.

Always call the emit_hypothesis_journey tool. Never reply in free text.`;

const PRIORITY_PREAMBLE = buildAiPriorityPreamble({
  task_type: "journey_architecture",
  tool_key: "customer_journey_map",
});
const FULL_SYSTEM_PROMPT = `${PRIORITY_PREAMBLE}\n\n${SYSTEM_PROMPT}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminAuth = await requireAdmin(req, corsHeaders);
    if (!adminAuth.ok) return adminAuth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured (LOVABLE_API_KEY missing)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const seed = (await req.json()) as SeedInput;
    if (!seed || typeof seed !== "object") {
      return new Response(JSON.stringify({ error: "Invalid seed payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!seed.product_name && !seed.product_description && !seed.problem_solved) {
      return new Response(
        JSON.stringify({ error: "Provide at least a product name, description, or the problem it solves." }),
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
          { role: "system", content: FULL_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [JOURNEY_TOOL],
        tool_choice: { type: "function", function: { name: "emit_hypothesis_journey" } },
      }),
    });

    if (aiResponse.status === 429) {
      return new Response(
        JSON.stringify({ error: "AI rate limit reached, please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResponse.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI workspace credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return new Response(
        JSON.stringify({ error: "AI draft unavailable right now. Manual builder still works." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await aiResponse.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return new Response(
        JSON.stringify({ error: "AI returned no structured journey. Try again or use the manual builder." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Tool args JSON parse failed", e, argsRaw);
      return new Response(
        JSON.stringify({ error: "AI returned malformed journey payload." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = attachAiOutputEnvelope(
      { journey: parsed },
      {
        title: "Customer journey AI draft",
        summary: "AI-assisted customer journey draft. Admin must review before any client-visible use.",
        surface: "journey-ai-seed",
        client_safe_output: false,
      },
    );
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("journey-ai-seed error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
