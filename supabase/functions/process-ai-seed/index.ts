/**
 * P13.5 — AI Process Breakdown Seed.
 *
 * Generates a hypothesis Process Breakdown across 14 guided sections
 * from a small admin-supplied seed (process name, trigger, where it
 * breaks, owner, tools, customer impact, estimated waste). Uses the
 * Lovable AI Gateway with structured tool calling.
 *
 * Output is a HYPOTHESIS — friction / waste / SOP / operating control /
 * implementation tasks stay admin-only on merge, and every section is
 * flagged needs-validation until a human confirms.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface SeedInput {
  process_name?: string;
  trigger?: string;
  where_it_breaks?: string;
  owner?: string;
  tools_used?: string;
  customer_impact?: string;
  estimated_waste?: string;
  context_notes?: string;
}

const PROCESS_TOOL = {
  type: "function",
  function: {
    name: "emit_hypothesis_process",
    description:
      "Return a single hypothesis Process Breakdown across the 14 RGS sections. Every field is a hypothesis until a human validates it.",
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
        sections: {
          type: "array",
          description:
            "One entry per section. Section keys, in any order: process_name, trigger, current_steps, owner, tools_used, handoffs, bottlenecks, waste, customer_impact, revenue_impact, sop_needed, operating_control, implementation_tasks. (Skip target_gear here — provide it via target_gear field.)",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Section key: process_name | trigger | current_steps | owner | tools_used | handoffs | bottlenecks | waste | customer_impact | revenue_impact | sop_needed | operating_control | implementation_tasks",
              },
              value: { type: "string" },
              evidence_source: { type: "string" },
              client_safe: { type: "boolean" },
            },
            required: ["key", "value"],
          },
        },
        target_gear: {
          type: "integer",
          description: "RGS Stability Gear 1-5 most relevant for this process.",
        },
        client_safe_summary: { type: "string" },
        admin_strategy_notes: { type: "string" },
      },
      required: ["confidence", "rationale", "sections", "client_safe_summary", "admin_strategy_notes"],
    },
  },
};

function buildPrompt(seed: SeedInput): string {
  const lines: string[] = [];
  lines.push("Seed input from the admin (only the process_name plus one of trigger/where_it_breaks is required):");
  if (seed.process_name) lines.push(`- Process name / area: ${seed.process_name}`);
  if (seed.trigger) lines.push(`- Trigger / starting event: ${seed.trigger}`);
  if (seed.where_it_breaks) lines.push(`- Where it breaks today: ${seed.where_it_breaks}`);
  if (seed.owner) lines.push(`- Current owner / role: ${seed.owner}`);
  if (seed.tools_used) lines.push(`- Tools / systems used: ${seed.tools_used}`);
  if (seed.customer_impact) lines.push(`- Customer impact: ${seed.customer_impact}`);
  if (seed.estimated_waste) lines.push(`- Estimated cost / time waste: ${seed.estimated_waste}`);
  if (seed.context_notes) lines.push(`- Other context: ${seed.context_notes}`);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are an experienced operations strategist working inside the RGS Operating System.

You generate a HYPOTHESIS Process Breakdown from a small admin seed. You are NOT being given the customer's actual process documentation, so you must:
- Cover the 13 narrative sections below (skip target_gear in the array — return it as the top-level target_gear instead):
  process_name, trigger, current_steps, owner, tools_used, handoffs, bottlenecks, waste, customer_impact, revenue_impact, sop_needed, operating_control, implementation_tasks.
- For "current_steps", produce a plausible 5-9 step bulleted list of how this kind of process typically runs in a small/mid services business.
- "bottlenecks" should highlight 3-5 likely friction points based on the seed.
- "waste" should call out rework, duplicate entry, owner-bottleneck risk in concrete terms.
- "customer_impact" should be specific moments the customer feels the breakdown.
- "revenue_impact" should connect the bottleneck to dollars or margin in plain language.
- "sop_needed" should name ONE SOP candidate (short title + when it triggers).
- "operating_control" should be cadence + owner + signal (e.g. "weekly handoff audit by ops lead, surfaced in BCC").
- "implementation_tasks" should be 3-5 small, outcome-led tasks.
- Always populate "missing_validation" with the most important questions a human should answer to upgrade this from hypothesis to evidence-backed.
- Keep "client_safe_summary" plain-language and free of internal diagnoses, blame, or sensitive operational language.
- Put any tactical / sequencing / escalation logic in "admin_strategy_notes".
- Set confidence to "low" when the seed is thin (under ~3 fields), "medium" when most strategic seeds are present, "high" only when waste estimate, owner, and tools_used are all provided.
- Map the process to the most likely RGS Stability Gear: 1 Demand, 2 Conversion, 3 Operations, 4 Financial Visibility, 5 Owner Independence (most processes will be Gear 3 or 5).
- Only set client_safe=true on a section if the value is safe to show the client (no internal diagnosis, no tactical sales language, no blame).

Always call the emit_hypothesis_process tool. Never reply in free text.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
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
    if (!seed.process_name && !seed.where_it_breaks && !seed.trigger) {
      return new Response(
        JSON.stringify({
          error: "Provide at least a process name, the trigger, or where it breaks.",
        }),
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
        tools: [PROCESS_TOOL],
        tool_choice: { type: "function", function: { name: "emit_hypothesis_process" } },
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
        JSON.stringify({ error: "AI returned no structured process. Try again or use the manual builder." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Tool args JSON parse failed", e, argsRaw);
      return new Response(
        JSON.stringify({ error: "AI returned malformed process payload." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ process: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-ai-seed error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});