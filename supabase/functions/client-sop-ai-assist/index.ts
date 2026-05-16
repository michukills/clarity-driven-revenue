/**
 * P75 — Client-side SOP / Training Bible AI assist.
 *
 * Authenticated client tool. Allows the signed-in customer (owner of the
 * referenced customer_id) to turn messy notes into a structured SOP draft
 * or refine an existing draft. Output stays a DRAFT — the client must
 * review and confirm before using it with their team. Output is never
 * automatically published, never marked client_visible by this function,
 * and is scrubbed for forbidden compliance/certification claims before
 * being returned to the browser.
 *
 * Security:
 *  - Requires a valid Supabase user JWT (no anon access).
 *  - Verifies the caller actually owns the customer_id (RLS-safe RPC
 *    `user_owns_customer` via service-role client).
 *  - LOVABLE_API_KEY is read server-side only.
 *  - All AI traffic goes through the Lovable AI Gateway (no direct
 *    provider calls).
 *  - Returned draft never contains admin notes or admin-only fields.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildAiPriorityPreamble } from "../_shared/ai-priority-preamble.ts";
import { attachAiOutputEnvelope } from "../_shared/ai-output-envelope.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Mode = "draft" | "improve" | "training_checklist" | "qa_checklist" | "handoff_gaps";

interface Seed {
  mode?: Mode;
  customer_id?: string | null;
  industry_context?: string | null;
  process_name?: string | null;
  role_team?: string | null;
  process_purpose?: string | null;
  tools_needed?: string | null;
  source_notes?: string | null;
  common_mistakes?: string | null;
  measurable_completion_standard?: string | null;
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

const FORBIDDEN: RegExp[] = [
  /\blegally\s+compliant\b/gi,
  /\bHR\s+compliant\b/gi,
  /\bOSHA\s+compliant\b/gi,
  /\bcannabis\s+compliant\b/gi,
  /\bHIPAA\s+compliant\b/gi,
  /\blicensing\s+compliant\b/gi,
  /\btax\s+compliant\b/gi,
  /\baccounting\s+compliant\b/gi,
  /\bcertified\b/gi,
  /\bguaranteed\b/gi,
  /\blegal\s+advice\b/gi,
  /\bHR\s+advice\b/gi,
  /\bOSHA\s+advice\b/gi,
  /\btax\s+advice\b/gi,
  /\baccounting\s+advice\b/gi,
  /\bcompliance\s+certification\b/gi,
  /\bregulatory\s+assurance\b/gi,
  /\bsafe\s+harbor\b/gi,
  /\benforcement[-\s]?proof\b/gi,
  /\bprofessional\s+certification\b/gi,
];

function scrub(s: unknown): unknown {
  if (typeof s === "string") {
    let out = s;
    for (const re of FORBIDDEN) out = out.replace(re, "[review with qualified professional]");
    return out;
  }
  if (Array.isArray(s)) return s.map(scrub);
  if (s && typeof s === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(s as Record<string, unknown>)) o[k] = scrub(v);
    return o;
  }
  return s;
}

const SOP_TOOL = {
  type: "function",
  function: {
    name: "emit_client_sop_draft",
    description:
      "Return a clear, repeatable SOP draft an owner can use internally with their team. Never include legal/HR/OSHA/cannabis/healthcare/tax/accounting/licensing/professional-certification claims.",
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
          description: "5-12 numbered steps, each one specific verb + outcome.",
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
        quality_standard: { type: "string", description: "Definition of done a reviewer can check." },
        common_mistakes: { type: "string" },
        escalation_point: { type: "string" },
        owner_decision_point: { type: "string" },
        training_notes: { type: "string" },
        training_checklist: { type: "array", items: { type: "string" } },
        qa_checklist: { type: "array", items: { type: "string" } },
        handoff_points: { type: "array", items: { type: "string" } },
        client_summary: { type: "string", description: "Plain-language summary safe for staff." },
        ai_assisted: { type: "boolean" },
      },
      required: ["title", "steps", "client_summary", "ai_assisted"],
    },
  },
};

const SYSTEM_PROMPT = `${buildAiPriorityPreamble({ task_type: "sop_training_bible", tool_key: "sop_training_bible" })}

You are a Six Sigma–style operations writer helping a small-business owner draft an internal SOP / training document inside the RGS Operating System.

Your job: turn the owner's messy notes into a clear, repeatable SOP that a new team member could follow with minimal interpretation.

Discipline:
- 5-12 numbered steps. Each is one action with a specific verb (open, enter, confirm, send, log) and the expected outcome.
- Quality standard = a definition of done a reviewer can actually check.
- Common mistakes = 2-5 concrete failure modes a new person makes.
- Escalation point = when to stop and ask, who to ask, what to send them.
- Owner decision point = what the owner (not the doer) has to decide and the info they need.
- training_checklist = the things a new person should be able to do before owning the SOP.
- qa_checklist = the checks a reviewer runs to confirm the SOP was followed.
- handoff_points = the moments the work moves between roles or systems.
- client_summary = the plain-language version safe to give staff.
- Always set ai_assisted = true.

Voice + safety:
- Calm, plain-English, owner-respecting. No hype, motivational, or agency tone.
- Never use "certified", "guaranteed", "compliant", "legal advice", "HR advice", "OSHA advice", "tax advice", "accounting advice", "compliance certification", "regulatory assurance", "safe harbor", "enforcement-proof", "professional certification".
- Do NOT provide legal, tax, accounting, HR, payroll, insurance, healthcare-privacy, OSHA, licensing, or cannabis-compliance advice. If a step touches a regulated area, write "review with the appropriate licensed professional before taking action".
- Do NOT certify compliance. Do NOT promise outcomes.
- Cannabis / MMJ / MMC contexts mean dispensary / retail / recreational operations only — not healthcare, not patient care, not HIPAA.

Always call the emit_client_sop_draft tool. Never reply in free text.`;

function buildPrompt(seed: Seed): string {
  const lines: string[] = [];
  const mode: Mode = (seed.mode as Mode) ?? "draft";
  const heading: Record<Mode, string> = {
    draft: "Create a structured SOP draft from these notes.",
    improve: "Improve this existing SOP — preserve intent, fix sequencing/clarity/gaps.",
    training_checklist: "Generate a training readiness checklist for this SOP.",
    qa_checklist: "Generate a quality-assurance checklist for this SOP.",
    handoff_gaps: "Identify handoff gaps and propose tightened handoff points for this SOP.",
  };
  lines.push(`Mode: ${heading[mode]}`);
  if (seed.industry_context) lines.push(`Industry context: ${seed.industry_context}`);
  if (seed.process_name) lines.push(`Process name: ${seed.process_name}`);
  if (seed.role_team) lines.push(`Role / team: ${seed.role_team}`);
  if (seed.process_purpose) lines.push(`Process purpose: ${seed.process_purpose}`);
  if (seed.tools_needed) lines.push(`Tools / software / materials: ${seed.tools_needed}`);
  if (seed.source_notes) lines.push(`Owner notes (raw):\n${seed.source_notes}`);
  if (seed.common_mistakes) lines.push(`Common mistakes: ${seed.common_mistakes}`);
  if (seed.measurable_completion_standard) lines.push(`Measurable completion standard: ${seed.measurable_completion_standard}`);
  if (mode === "improve" && seed.existing) {
    lines.push("Existing SOP to improve:\n" + JSON.stringify(seed.existing));
  }
  return lines.join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    });
    const { data: u, error: ue } = await userClient.auth.getUser();
    if (ue || !u?.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI assist not configured." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seed = (await req.json()) as Seed;
    if (!seed || typeof seed !== "object" || !seed.customer_id) {
      return new Response(JSON.stringify({ error: "customer_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership of the customer via service role + helper RPC.
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
    const { data: owns, error: ownsErr } = await admin.rpc("user_owns_customer", {
      _user_id: u.user.id,
      _customer_id: seed.customer_id,
    });
    if (ownsErr || owns !== true) {
      return new Response(JSON.stringify({ error: "Not authorized for this customer" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasInput =
      !!seed.process_name ||
      !!seed.source_notes ||
      !!seed.process_purpose ||
      (seed.mode === "improve" && !!seed.existing);
    if (!hasInput) {
      return new Response(
        JSON.stringify({ error: "Add a process name, notes, or purpose before asking for an AI draft." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(seed) },
        ],
        tools: [SOP_TOOL],
        tool_choice: { type: "function", function: { name: "emit_client_sop_draft" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "AI rate limit reached, please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI workspace credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(
        JSON.stringify({ error: "AI draft unavailable right now. The manual editor still works." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = await aiResp.json();
    const args = payload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(
        JSON.stringify({ error: "AI returned no structured SOP. Try again or use the manual editor." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    let parsed: any;
    try {
      parsed = typeof args === "string" ? JSON.parse(args) : args;
    } catch (e) {
      console.error("parse failed", e);
      return new Response(JSON.stringify({ error: "AI returned malformed SOP payload." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleaned = scrub(parsed);

    const body = attachAiOutputEnvelope(
      {
        sop: cleaned,
        ai_assisted: true,
        review_required: true,
        client_visible: false,
        disclosure:
          "This SOP draft was created with AI assistance. Review it carefully, adjust it to your business, and confirm it before using it with your team.",
        professional_review_disclosure:
          "AI can help structure process information, but it does not provide legal, HR, OSHA, cannabis compliance, healthcare privacy, licensing, tax, accounting, or professional certification advice.",
      },
      {
        title: "Client SOP AI draft",
        summary: "AI-assisted SOP draft for the client portal. Owner must review before using with the team.",
        surface: "client-sop-ai-assist",
        client_safe_output: true,
      },
    );
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("client-sop-ai-assist error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});