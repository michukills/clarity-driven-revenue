/**
 * P13.3.B — AI Persona Seed.
 *
 * Generates a hypothesis Buyer Persona from a small admin-supplied seed
 * (product, problem, price, geography, etc.) using the Lovable AI Gateway.
 *
 * Output is intentionally labelled as a HYPOTHESIS — every returned field
 * carries `needs_validation: true` and a confidence level. The shape is
 * extracted via tool calling so the client can map it cleanly into the
 * existing persona schema without parsing free-form JSON.
 */

import { requireAdmin } from "../_shared/admin-auth.ts";

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
  best_customers?: string;
  bad_fit_customers?: string;
  sales_notes?: string;
}

const PERSONA_TOOL = {
  type: "function",
  function: {
    name: "emit_hypothesis_persona",
    description:
      "Return a single hypothesis Buyer Persona derived from the seed. Every field is a hypothesis until a human validates it.",
    parameters: {
      type: "object",
      properties: {
        confidence: { type: "string", enum: ["low", "medium", "high"] },
        rationale: { type: "string" },
        evidence_used: { type: "array", items: { type: "string" } },
        missing_validation: { type: "array", items: { type: "string" } },
        identity: {
          type: "object",
          properties: {
            fictional_name: { type: "string" },
            age_range: { type: "string" },
            role_or_job: { type: "string" },
            household_or_business_context: { type: "string" },
            lifestyle: { type: "string" },
            interests: { type: "string" },
            day_to_day_routine: { type: "string" },
            where_they_shop: { type: "string" },
            media_consumption: { type: "string" },
            online_behavior: { type: "string" },
            what_they_care_about: { type: "string" },
          },
          required: ["fictional_name", "role_or_job"],
          additionalProperties: false,
        },
        company_segment_fit: { type: "string" },
        pain_urgency: { type: "string" },
        buying_trigger: { type: "string" },
        budget_logic: { type: "string" },
        decision_authority: { type: "string" },
        objections: { type: "string" },
        desired_outcome: { type: "string" },
        messaging_angle: { type: "string" },
        trust_signals: { type: "string" },
        acquisition_channels: { type: "string" },
        follow_up_strategy: { type: "string" },
        disqualifiers: { type: "string" },
        next_validation_questions: { type: "array", items: { type: "string" } },
        client_safe_summary: { type: "string" },
        admin_strategy_notes: { type: "string" },
      },
      required: [
        "confidence",
        "rationale",
        "identity",
        "pain_urgency",
        "desired_outcome",
        "client_safe_summary",
        "admin_strategy_notes",
      ],
      additionalProperties: false,
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
  if (seed.best_customers) lines.push(`- Known best-fit customers: ${seed.best_customers}`);
  if (seed.bad_fit_customers) lines.push(`- Known bad-fit customers: ${seed.bad_fit_customers}`);
  if (seed.sales_notes) lines.push(`- Sales / review notes: ${seed.sales_notes}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are an experienced B2B/B2C buyer-persona strategist working inside the RGS Operating System.

You are generating a HYPOTHESIS persona from a small seed of admin-supplied facts. You are NOT being given real customer evidence — so you must:
- Be specific and useful, but never present lifestyle, age, media or routine details as facts.
- Use plausible, well-reasoned hypotheses grounded in the seed.
- Set confidence to "low" when the seed is thin (under ~3 fields), "medium" when most strategic seeds are present, "high" only when known best/bad customers and sales notes are also provided.
- Always populate "missing_validation" with the most important questions a human should answer to upgrade this from hypothesis to evidence-backed.
- Keep "client_safe_summary" plain-language and free of internal sales tactics, budget judgements, or disqualifier language.
- Put any tactical / qualification / disqualifier / budget logic in "admin_strategy_notes" or the dedicated admin-only fields (decision_authority, budget_logic, disqualifiers, follow_up_strategy).
- Invent a fictional first-name persona label (e.g. "Operator-Owner Olivia"). Never reuse a real customer's name.

Always call the emit_hypothesis_persona tool. Never reply in free text.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const adminAuth = await requireAdmin(req, corsHeaders);
    if (!adminAuth.ok) return adminAuth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI gateway not configured (LOVABLE_API_KEY missing)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const seed = (await req.json()) as SeedInput;
    if (!seed || (typeof seed !== "object")) {
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [PERSONA_TOOL],
        tool_choice: { type: "function", function: { name: "emit_hypothesis_persona" } },
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
        JSON.stringify({ error: "AI returned no structured persona. Try again or use the manual builder." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Tool args JSON parse failed", e, argsRaw);
      return new Response(
        JSON.stringify({ error: "AI returned malformed persona payload." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ persona: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("persona-ai-seed error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
