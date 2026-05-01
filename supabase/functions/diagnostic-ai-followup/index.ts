/**
 * P36 — Optional AI-Guided Diagnostic Interviewer.
 *
 * Generates up to 2 adaptive follow-up questions for a given diagnostic
 * intake section, based on the client's saved deterministic answer.
 *
 * Hard rules (enforced by system prompt + structured output):
 *   - The AI may ONLY ask questions. It does not score, recommend, or
 *     reveal any internal scoring rubric.
 *   - The deterministic intake (`diagnostic_intake_answers`) remains the
 *     sole input to scoring. This function never writes to it.
 *   - Every generated question is persisted to `diagnostic_ai_followups`
 *     with model + rationale + actor for full audit.
 *   - Both admins and the owning customer can call this function.
 *   - 402 / 429 / model errors return a graceful fallback so the
 *     deterministic intake remains fully usable.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FOLLOWUP_TOOL = {
  type: "function",
  function: {
    name: "emit_followups",
    description:
      "Return up to 2 short, neutral follow-up QUESTIONS that would help the admin understand the answer better. Never give advice, never reveal scoring.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: {
            type: "object",
            properties: {
              question: { type: "string", minLength: 8, maxLength: 240 },
              rationale: { type: "string", maxLength: 240 },
            },
            required: ["question"],
            additionalProperties: false,
          },
        },
      },
      required: ["questions"],
      additionalProperties: false,
    },
  },
};

const SYSTEM_PROMPT = `You are a careful diagnostic interviewer inside the RGS Operating System.

Your ONLY job is to ask up to 2 short, neutral follow-up QUESTIONS that help an RGS admin understand the owner's answer in more detail.

Voice (RGS / Matt voice):
- Calm, plain-English, owner-respecting. Talk like a friend being honest with a small business owner — not a coach, consultant, or AI assistant.
- No motivational language. No hype. No "unlock", "empower", "optimize", "next level", "actionable insights", "powerful", "transform", or similar filler.
- No corporate consulting tone. No fake certainty. No flattery.
- Do not shame the owner or imply they are failing.

Hard rules:
- You MUST NOT give advice, recommendations, opinions, or "we suggest" language.
- You MUST NOT mention or imply any internal scoring, ranking, weighting, formulas, pillars, or rubrics. Never reveal how answers are evaluated.
- You MUST NOT promise outcomes or describe what the diagnostic will conclude.
- You MUST NOT provide legal, tax, accounting, HR, or compliance guidance.
- You MUST NOT ask for sensitive personal information (SSN, full bank/card numbers, passwords).
- Each question must be plain English, focused on a single missing detail in the owner's answer (e.g. who, how often, what tool, rough number).
- Keep each question under 40 words.
- If the owner's answer is already specific and complete, return only ONE question that asks for one concrete clarifying detail. Do not pad.
- Always call the emit_followups tool. Never reply in free text.`;

interface RequestBody {
  customer_id: string;
  section_key: string;
  section_label?: string;
  section_prompt?: string;
  saved_answer: string;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return jsonError("Authentication required", 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!url || !anon || !serviceRole) return jsonError("Auth environment not configured", 503);
    if (!LOVABLE_API_KEY) {
      return jsonError(
        "AI interviewer is not configured. Your saved intake answers are unaffected.",
        503,
      );
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return jsonError("Authentication required", 401);

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const customerId = (body?.customer_id || "").trim();
    const sectionKey = (body?.section_key || "").trim();
    const savedAnswer = (body?.saved_answer || "").trim();
    if (!customerId || !sectionKey) return jsonError("customer_id and section_key are required", 400);
    if (savedAnswer.length < 4) {
      return jsonError("Save your section answer before requesting AI follow-ups.", 400);
    }
    if (savedAnswer.length > 4000) {
      return jsonError("Section answer too long.", 400);
    }

    // Authorize: admin OR the owning customer.
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: user.id });
    let authorized = isAdmin === true;
    if (!authorized) {
      const { data: owns } = await admin.rpc("user_owns_customer", {
        _user_id: user.id,
        _customer_id: customerId,
      });
      authorized = owns === true;
    }
    if (!authorized) return jsonError("Not authorized for this customer", 403);

    // Lightweight per-customer rate limit: max 6 follow-up generations per
    // section in the last hour to keep cost bounded. Audit table is the
    // ledger.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await admin
      .from("diagnostic_ai_followups")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("section_key", sectionKey)
      .gte("created_at", oneHourAgo);
    if ((recentCount ?? 0) >= 6) {
      return jsonError(
        "Too many AI follow-ups for this section in the last hour. Try again later — your saved intake is unaffected.",
        429,
      );
    }

    const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

    const userPrompt = [
      `Diagnostic intake section: ${body.section_label || sectionKey}`,
      body.section_prompt ? `Original prompt to the client: ${body.section_prompt}` : "",
      "",
      "Client's saved answer (verbatim):",
      savedAnswer,
      "",
      "Ask up to 2 short follow-up questions that would help us understand this answer in more detail.",
    ]
      .filter(Boolean)
      .join("\n");

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
        tools: [FOLLOWUP_TOOL],
        tool_choice: { type: "function", function: { name: "emit_followups" } },
      }),
    });

    if (aiResponse.status === 429) {
      return jsonError(
        "AI is busy right now. Your saved intake is unaffected — try again in a moment.",
        429,
      );
    }
    if (aiResponse.status === 402) {
      return jsonError(
        "AI workspace credits exhausted. Deterministic intake still works as-is.",
        402,
      );
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("AI gateway error", aiResponse.status, text);
      return jsonError(
        "AI follow-ups unavailable right now. Your deterministic intake is unaffected.",
        502,
      );
    }

    const payload = await aiResponse.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return jsonError(
        "AI returned no follow-ups. Your deterministic intake is unaffected.",
        502,
      );
    }
    let parsed: { questions?: Array<{ question: string; rationale?: string }> };
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Tool args JSON parse failed", e, argsRaw);
      return jsonError("AI returned malformed payload.", 502);
    }
    const questions = (parsed?.questions || []).filter(
      (q) => q && typeof q.question === "string" && q.question.trim().length > 0,
    );
    if (questions.length === 0) {
      return jsonError("AI returned no follow-ups.", 502);
    }

    // Persist every question to the audit table.
    const inserts = questions.slice(0, 2).map((q) => ({
      customer_id: customerId,
      section_key: sectionKey,
      question: q.question.trim().slice(0, 1000),
      rationale: (q.rationale || "").trim().slice(0, 500) || null,
      model,
      created_by: user.id,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("diagnostic_ai_followups")
      .insert(inserts)
      .select("id, customer_id, section_key, question, rationale, model, created_at");

    if (insertError) {
      console.error("Insert followups failed", insertError);
      return jsonError("Could not save follow-ups.", 500);
    }

    return new Response(JSON.stringify({ followups: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("diagnostic-ai-followup error", e);
    return jsonError(e instanceof Error ? e.message : "Unknown error", 500);
  }
});