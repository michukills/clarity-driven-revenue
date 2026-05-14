// P93E-E2D — Scorecard Answer Classifier (server-side).
//
// Public endpoint (verify_jwt = false in supabase/config.toml).
// Maps owner-written plain-English answers to fixed v3 rubric option ids.
// Never returns a score. Score is computed deterministically by the
// client / scoreScorecardV3() against the canonical rubric in
// src/lib/scorecard/rubricV3.ts.
//
// Strategy:
//   1. Validate request shape with zod.
//   2. For each answer with usable owner_text:
//        a. If LOVABLE_API_KEY set, call Lovable AI Gateway with a
//           tool-call schema constrained to allowed option_ids.
//        b. Validate the AI response option_id ∈ allowed_options.
//        c. On any failure, fall back to deterministic keyword rules.
//   3. Conservative bias: when unsure, pick the lowest-weight option
//      and mark insufficient_detail = true with confidence "low".
//   4. Persist classifications to scorecard_answer_classifications via
//      the service-role client (bypasses RLS, table is admin-read only).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OptionSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(240),
  weight: z.number().min(0).max(1),
});

const AnswerInputSchema = z.object({
  question_id: z.string().min(1).max(120),
  gear: z.string().min(1).max(40),
  prompt: z.string().min(1).max(500),
  owner_text: z.string().max(2000).default(""),
  allowed_options: z.array(OptionSchema).min(2).max(10),
});

const RequestSchema = z.object({
  rubric_version: z.string().min(1).max(80),
  run_id: z.string().uuid().optional(),
  answers: z.array(AnswerInputSchema).min(1).max(60),
});

type AnswerInput = z.infer<typeof AnswerInputSchema>;

type ClassifierType = "ai" | "rules" | "fallback";

interface Classification {
  question_id: string;
  gear: string;
  owner_text: string;
  classified_option_id: string;
  classified_option_label: string;
  confidence: "high" | "medium" | "low";
  classification_rationale: string;
  insufficient_detail: boolean;
  follow_up_question: string | null;
  classifier_type: ClassifierType;
}

/* ---------- Deterministic rules fallback ---------- */

function lowestOption(opts: AnswerInput["allowed_options"]) {
  return [...opts].sort((a, b) => a.weight - b.weight)[0];
}
function highestOption(opts: AnswerInput["allowed_options"]) {
  return [...opts].sort((a, b) => b.weight - a.weight)[0];
}

/**
 * Score each allowed option against the owner text using simple keyword
 * heuristics derived from the option label. Conservative by design:
 * if no option clearly wins, return the lowest-weight option and flag
 * insufficient_detail.
 */
function rulesClassify(a: AnswerInput): Classification {
  const text = (a.owner_text || "").toLowerCase().trim();
  const tooShort = text.length < 12;
  if (tooShort) {
    const low = lowestOption(a.allowed_options);
    return {
      question_id: a.question_id,
      gear: a.gear,
      owner_text: a.owner_text,
      classified_option_id: low.id,
      classified_option_label: low.label,
      confidence: "low",
      classification_rationale:
        "Answer too short to classify confidently; scored conservatively.",
      insufficient_detail: true,
      follow_up_question:
        "Could you describe how this works in your business in a sentence or two?",
      classifier_type: "rules",
    };
  }

  // Strong negative / unsure phrases push to lowest-weight option.
  const unsureMarks = [
    "not sure",
    "no idea",
    "don't know",
    "dont know",
    "unknown",
    "not really",
    "no system",
    "none",
    "nothing",
    "not at all",
    "never",
  ];
  if (unsureMarks.some((m) => text.includes(m))) {
    const low = lowestOption(a.allowed_options);
    return {
      question_id: a.question_id,
      gear: a.gear,
      owner_text: a.owner_text,
      classified_option_id: low.id,
      classified_option_label: low.label,
      confidence: "medium",
      classification_rationale:
        "Answer signaled the system is not in place or not tracked.",
      insufficient_detail: false,
      follow_up_question: null,
      classifier_type: "rules",
    };
  }

  // Score each option by counting label-token matches in the owner text.
  const stop = new Set([
    "and","or","the","a","an","of","to","in","on","is","it","at","but","not",
    "we","our","my","i","with","for","by","from","this","that","mostly","some",
    "very","really","than","then","one","another","another","place","place.",
  ]);
  const tokens = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((t) => t && !stop.has(t) && t.length > 2);

  const textTokens = new Set(tokens(text));
  let best: { opt: AnswerInput["allowed_options"][number]; score: number } | null = null;
  for (const o of a.allowed_options) {
    const labelTokens = tokens(o.label);
    if (labelTokens.length === 0) continue;
    const hits = labelTokens.reduce((n, t) => (textTokens.has(t) ? n + 1 : n), 0);
    if (!best || hits > best.score) best = { opt: o, score: hits };
  }

  if (!best || best.score === 0) {
    // No clear keyword signal — be conservative.
    const low = lowestOption(a.allowed_options);
    return {
      question_id: a.question_id,
      gear: a.gear,
      owner_text: a.owner_text,
      classified_option_id: low.id,
      classified_option_label: low.label,
      confidence: "low",
      classification_rationale:
        "Answer did not contain clear signals matching any rubric state; scored conservatively.",
      insufficient_detail: true,
      follow_up_question:
        "Could you mention specifics — what tool, how often, or who owns it?",
      classifier_type: "rules",
    };
  }

  return {
    question_id: a.question_id,
    gear: a.gear,
    owner_text: a.owner_text,
    classified_option_id: best.opt.id,
    classified_option_label: best.opt.label,
    confidence: best.score >= 2 ? "medium" : "low",
    classification_rationale: `Matched rubric state by keyword overlap (${best.score} signal${best.score === 1 ? "" : "s"}).`,
    insufficient_detail: best.score < 2,
    follow_up_question: null,
    classifier_type: "rules",
  };
}

/* ---------- AI classification (Lovable AI Gateway) ---------- */

async function aiClassify(
  answers: AnswerInput[],
  apiKey: string,
): Promise<Classification[] | null> {
  // Build a constrained tool-call schema where each item must reference
  // a known question_id and option_id from the per-question allow lists.
  const allowedById = new Map<string, AnswerInput>();
  for (const a of answers) allowedById.set(a.question_id, a);

  const system = [
    "You are a structured classifier for a business systems assessment.",
    "Map each owner answer to ONE option id from its allowed_options list.",
    "You must NEVER invent option ids and you must NEVER assign scores.",
    "If an answer is vague, contradictory, or insufficient, choose the option closest to the LOWEST weight and set confidence to 'low' and insufficient_detail to true.",
    "Return only valid JSON via the provided tool.",
  ].join(" ");

  const user = {
    rubric_note:
      "Each option has a weight in [0,1]. Lower weight = weaker / less mature operational state.",
    items: answers.map((a) => ({
      question_id: a.question_id,
      gear: a.gear,
      prompt: a.prompt,
      owner_text: a.owner_text.slice(0, 1500),
      allowed_options: a.allowed_options.map((o) => ({
        id: o.id,
        label: o.label,
        weight: o.weight,
      })),
    })),
  };

  const tool = {
    type: "function",
    function: {
      name: "submit_classifications",
      description:
        "Return a classification per question with constrained option_id values.",
      parameters: {
        type: "object",
        properties: {
          classifications: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_id: { type: "string" },
                classified_option_id: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
                classification_rationale: { type: "string" },
                insufficient_detail: { type: "boolean" },
                follow_up_question: { type: "string" },
              },
              required: [
                "question_id",
                "classified_option_id",
                "confidence",
                "classification_rationale",
                "insufficient_detail",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["classifications"],
        additionalProperties: false,
      },
    },
  };

  let resp: Response;
  try {
    resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
        tools: [tool],
        tool_choice: {
          type: "function",
          function: { name: "submit_classifications" },
        },
      }),
    });
  } catch (e) {
    console.warn("scorecard-classify AI fetch error", e);
    return null;
  }

  if (!resp.ok) {
    console.warn("scorecard-classify AI non-200", resp.status);
    try { await resp.text(); } catch { /* drain */ }
    return null;
  }

  let payload: unknown;
  try { payload = await resp.json(); } catch { return null; }

  const toolCall =
    (payload as { choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[] })
      ?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!toolCall) return null;

  let parsed: { classifications?: unknown };
  try { parsed = JSON.parse(toolCall); } catch { return null; }

  const list = Array.isArray(parsed.classifications) ? parsed.classifications : null;
  if (!list) return null;

  const out: Classification[] = [];
  for (const a of answers) {
    const item = list.find(
      (x) => (x as { question_id?: string }).question_id === a.question_id,
    ) as
      | {
          question_id: string;
          classified_option_id: string;
          confidence: "high" | "medium" | "low";
          classification_rationale: string;
          insufficient_detail: boolean;
          follow_up_question?: string;
        }
      | undefined;

    if (!item) {
      out.push({ ...rulesClassify(a), classifier_type: "fallback" });
      continue;
    }
    const matched = a.allowed_options.find(
      (o) => o.id === item.classified_option_id,
    );
    if (!matched) {
      out.push({ ...rulesClassify(a), classifier_type: "fallback" });
      continue;
    }
    const conf =
      item.confidence === "high" || item.confidence === "medium" || item.confidence === "low"
        ? item.confidence
        : "low";
    out.push({
      question_id: a.question_id,
      gear: a.gear,
      owner_text: a.owner_text,
      classified_option_id: matched.id,
      classified_option_label: matched.label,
      confidence: conf,
      classification_rationale: String(item.classification_rationale ?? "").slice(0, 600),
      insufficient_detail: !!item.insufficient_detail,
      follow_up_question: item.follow_up_question
        ? String(item.follow_up_question).slice(0, 240)
        : null,
      classifier_type: "ai",
    });
  }
  return out;
}

/* ---------- Server ---------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "invalid_request",
        details: parsed.error.flatten(),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const { answers, rubric_version, run_id } = parsed.data;
  const apiKey = Deno.env.get("LOVABLE_API_KEY") || "";

  // Try AI for the subset that has usable text; rules-fallback for the rest.
  const usable = answers.filter((a) => (a.owner_text || "").trim().length >= 12);
  const skipped = answers.filter((a) => (a.owner_text || "").trim().length < 12);

  let aiResults: Classification[] | null = null;
  if (apiKey && usable.length > 0) {
    aiResults = await aiClassify(usable, apiKey);
  }

  const classifications: Classification[] = [];
  for (const a of answers) {
    if (aiResults) {
      const hit = aiResults.find((c) => c.question_id === a.question_id);
      if (hit) { classifications.push(hit); continue; }
    }
    if (skipped.includes(a) || !apiKey || !aiResults) {
      classifications.push(rulesClassify(a));
      continue;
    }
    classifications.push(rulesClassify(a));
  }

  // Persist if we have a run_id.
  if (run_id) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && serviceKey) {
        const sb = createClient(supabaseUrl, serviceKey);
        const rows = classifications.map((c) => ({
          run_id,
          question_id: c.question_id,
          gear: c.gear,
          owner_text: c.owner_text.slice(0, 2000),
          classified_option_id: c.classified_option_id,
          classified_option_label: c.classified_option_label,
          confidence: c.confidence,
          classification_rationale: c.classification_rationale,
          insufficient_detail: c.insufficient_detail,
          follow_up_question: c.follow_up_question,
          classifier_type: c.classifier_type,
          rubric_version,
        }));
        const { error } = await sb
          .from("scorecard_answer_classifications")
          .insert(rows);
        if (error) {
          console.warn("scorecard-classify persist error", error.message);
        }
      }
    } catch (e) {
      console.warn("scorecard-classify persist exception", e);
    }
  }

  return new Response(
    JSON.stringify({
      classifier_status: apiKey ? (aiResults ? "ai" : "rules_fallback") : "rules",
      rubric_version,
      classifications,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});