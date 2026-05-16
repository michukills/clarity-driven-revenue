/**
 * P94A — Role-aware RGS guide bot.
 *
 * Public surface is intentionally data-free. Client/admin surfaces require
 * authenticated context and server-side tenant checks before any account
 * context is added. AI is assistive only; it cannot write, publish, score,
 * approve, send email, or verify evidence.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildAiPriorityPreamble } from "../_shared/ai-priority-preamble.ts";
import { attachAiOutputEnvelope } from "../_shared/ai-output-envelope.ts";

const GUIDE_VERSION = "p94a-guide-bots-v1";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Surface = "public" | "client" | "admin";

type UserContext = {
  userId: string | null;
  isAdmin: boolean;
};

type ContextSummary = {
  route: string;
  surface: Surface;
  accountLabel?: string | null;
  stageLabel?: string | null;
  assignedToolCount?: number | null;
  visibleReportCount?: number | null;
  evidenceRequestCount?: number | null;
  blockers?: string[];
};

const BOUNDARIES: Record<Surface, string[]> = {
  public: [
    "Public guidance only. No portal, client, or admin data is available here.",
    "The guide can explain RGS and route you to the Scorecard or Diagnostic, but it cannot fully diagnose a business from chat.",
    "No legal, tax, accounting, compliance, valuation, revenue, profit, or growth guarantees.",
  ],
  client: [
    "Client-safe guidance only. Admin notes, hidden scoring logic, and other client data are not available here.",
    "AI can help draft or organize inputs, but you confirm before anything is submitted.",
    "Deterministic scoring and RGS/admin review remain the source of truth.",
  ],
  admin: [
    "Admin-only guidance. It can summarize workflow context, but it cannot approve, publish, send, delete, or change scores.",
    "AI drafts and extraction results require admin review before client-visible use.",
    "Deterministic scoring, evidence review, and approval gates remain the source of truth.",
  ],
};

const PUBLIC_ACTIONS = [
  { label: "Take the Scorecard", href: "/scorecard", reason: "Start with the free first-pass stability check.", surface: "public" },
  { label: "Compare Scorecard vs Diagnostic", href: "/diagnostic", reason: "See what the paid Diagnostic examines beyond the public check.", surface: "public" },
  { label: "How RGS Works", href: "/what-we-do", reason: "Understand RGS as operating-structure architecture, not outsourced operation.", surface: "public" },
  { label: "Request Diagnostic", href: "/diagnostic-apply", reason: "Move toward the paid Diagnostic if the fit is clear.", surface: "public" },
];

const CLIENT_ACTIONS = [
  { label: "Open My Tools", href: "/portal/tools", reason: "Find assigned tools without exposing unassigned work.", surface: "client" },
  { label: "Upload Evidence", href: "/portal/uploads", reason: "Submit materials RGS requested for review.", surface: "client" },
  { label: "View Reports", href: "/portal/reports", reason: "Open approved client-visible reports only.", surface: "client" },
  { label: "Review Next Tasks", href: "/portal/priority-tasks", reason: "See what is waiting on you next.", surface: "client" },
];

const ADMIN_ACTIONS = [
  { label: "Review Scorecard Leads", href: "/admin/scorecard-leads", reason: "Check public submissions, email status, and next action.", surface: "admin" },
  { label: "Open Pending Accounts", href: "/admin/pending-accounts", reason: "Approve, deny, clarify, or link new portal requests.", surface: "admin" },
  { label: "Open Review Queue", href: "/admin/rgs-review-queue", reason: "Find drafts and items that need admin review before client visibility.", surface: "admin" },
  { label: "Open Customer List", href: "/admin/customers", reason: "Choose the account before using customer-scoped workflows.", surface: "admin" },
];

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

function anonClient(auth?: string | null) {
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anon) throw new Error("Supabase anon environment not configured");
  return createClient(url, anon, {
    global: auth ? { headers: { Authorization: auth } } : undefined,
    auth: { persistSession: false },
  });
}

async function getUserContext(req: Request): Promise<UserContext> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return { userId: null, isAdmin: false };
  const userClient = anonClient(auth);
  const { data } = await userClient.auth.getUser();
  const userId = data?.user?.id ?? null;
  if (!userId) return { userId: null, isAdmin: false };
  const admin = adminClient();
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
  return { userId, isAdmin: isAdmin === true };
}

function actionsFor(surface: Surface, route: string, message = "") {
  const text = `${route} ${message}`.toLowerCase();
  const base = surface === "admin" ? ADMIN_ACTIONS : surface === "client" ? CLIENT_ACTIONS : PUBLIC_ACTIONS;
  const prioritized = [...base];
  if (surface === "public" && /diagnostic|paid|review|fit/.test(text)) prioritized.sort((a) => (a.href === "/diagnostic" ? -1 : 1));
  if (surface === "public" && /score|stable|scorecard|free|0.?1000/.test(text)) prioritized.sort((a) => (a.href === "/scorecard" ? -1 : 1));
  if (surface === "client" && /upload|evidence|file|document|photo|image/.test(text)) prioritized.sort((a) => (a.href === "/portal/uploads" ? -1 : 1));
  if (surface === "admin" && /lead|scorecard|email|follow/.test(text)) prioritized.sort((a) => (a.href === "/admin/scorecard-leads" ? -1 : 1));
  if (surface === "admin" && /pending|approve|signup|request|demo|client|gig/.test(text)) prioritized.sort((a) => (a.href === "/admin/pending-accounts" ? -1 : 1));
  return prioritized.slice(0, 4);
}

function forbiddenClaims(text: string): boolean {
  return [
    /guarantee(?:d|s)?\s+(?:growth|revenue|profit|results|outcomes?)/i,
    /\b10x\b/i,
    /skyrocket/i,
    /legal advice/i,
    /tax advice/i,
    /accounting advice/i,
    /compliance certification/i,
    /valuation advice/i,
    /we will run your business/i,
    /done[- ]for[- ]you business operator/i,
  ].some((rx) => rx.test(text));
}

function deterministicAnswer(surface: Surface, message: string, context: ContextSummary): string {
  const text = message.toLowerCase();
  if (surface === "public") {
    if (/scorecard|score|0.?1000|free/.test(text)) {
      return "The free Scorecard is a first-pass stability check across Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence. It helps you see where the business may be slipping. It is not the full Diagnostic and does not promise outcomes.";
    }
    if (/diagnostic|paid|full review|next step/.test(text)) {
      return "The paid Diagnostic goes deeper than the public Scorecard. RGS reviews the operating structure, looks for what is working and what is slipping, and produces clearer repair direction. Implementation is separate unless purchased.";
    }
    return "RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control. I can explain the Scorecard, Diagnostic, Implementation, or RGS Control System and point you to the right next step.";
  }
  if (surface === "client") {
    const stage = context.stageLabel ? ` Your current visible stage is ${context.stageLabel}.` : "";
    if (/upload|evidence|file|document|photo|image/.test(text)) {
      return `Use the upload area for materials RGS requested, such as SOPs, screenshots, exports, notes, or process examples.${stage} Uploads are reviewed before they become official findings.`;
    }
    if (/tool|assigned|where/.test(text)) {
      return `Open My Tools to see only the tools assigned to your account.${stage} Locked tools stay locked until RGS assigns or unlocks them for your current scope.`;
    }
    return `I can help you understand your next action, assigned tools, evidence requests, and visible reports.${stage} I cannot see admin notes or make final findings.`;
  }
  const account = context.accountLabel ? ` for ${context.accountLabel}` : "";
  if (/lead|scorecard|email|follow/.test(text)) {
    return `Open Scorecard Leads to review submission quality, linked customer status, consent, follow-up email status, and the safest manual next action${account}.`;
  }
  if (/publish|report|draft|approve/.test(text)) {
    return `Before publishing anything client-visible${account}, confirm evidence, scope, draft status, client visibility, and approval state. AI can draft or summarize, but admin review controls the release.`;
  }
  return `I can help route the admin workflow${account}: what needs review, what is blocked, what evidence is missing, and what page to open next. I cannot approve, publish, send, delete, change access, or change deterministic scores.`;
}

async function countRows(admin: ReturnType<typeof adminClient>, table: string, customerId: string, clientVisibleOnly = false) {
  let query = admin.from(table).select("id", { count: "exact", head: true }).eq("customer_id", customerId);
  if (clientVisibleOnly) query = query.eq("client_visible", true);
  const { count } = await query;
  return count ?? 0;
}

async function buildContext(surface: Surface, route: string, customerId: string | null, user: UserContext): Promise<ContextSummary | Response> {
  const context: ContextSummary = { route, surface, blockers: [] };
  if (surface === "public") return context;

  if (!user.userId) return json({ error: "Authentication required" }, 401);
  const admin = adminClient();

  if (surface === "admin") {
    if (!user.isAdmin) return json({ error: "Admin access required" }, 403);
    if (!customerId) return context;
    const { data: customer, error } = await admin
      .from("customers")
      .select("id,business_name,full_name,email,stage,lifecycle_state,status,account_kind,is_demo_account,next_action,needs_industry_review")
      .eq("id", customerId)
      .maybeSingle();
    if (error) return json({ error: "Could not load admin context" }, 500);
    if (!customer) return context;
    context.accountLabel = customer.business_name || customer.full_name || customer.email;
    context.stageLabel = customer.lifecycle_state || customer.stage || customer.status;
    context.assignedToolCount = await countRows(admin, "resource_assignments", customer.id);
    context.visibleReportCount = await countRows(admin, "tool_report_artifacts", customer.id, true);
    context.evidenceRequestCount = await countRows(admin, "customer_uploads", customer.id);
    context.blockers = [
      customer.needs_industry_review ? "Industry needs admin review." : "",
      customer.next_action ? `Next action: ${customer.next_action}` : "",
      customer.is_demo_account ? "Demo/test account. Keep demo context separate from real client data." : "",
    ].filter(Boolean);
    return context;
  }

  let allowedCustomerId = customerId;
  if (!allowedCustomerId) {
    const { data: customer } = await admin
      .from("customers")
      .select("id")
      .eq("user_id", user.userId)
      .is("archived_at", null)
      .maybeSingle();
    allowedCustomerId = customer?.id ?? null;
  }
  if (!allowedCustomerId) return context;

  const { data: customer, error } = await admin
    .from("customers")
    .select("id,business_name,full_name,email,stage,lifecycle_state,status,account_kind,is_demo_account,user_id")
    .eq("id", allowedCustomerId)
    .maybeSingle();
  if (error) return json({ error: "Could not load client context" }, 500);
  if (!customer) return context;
  if (!user.isAdmin && customer.user_id !== user.userId) return json({ error: "Forbidden" }, 403);

  context.accountLabel = customer.business_name || customer.full_name || customer.email;
  context.stageLabel = customer.lifecycle_state || customer.stage || customer.status;
  context.assignedToolCount = await countRows(admin, "resource_assignments", customer.id);
  context.visibleReportCount = await countRows(admin, "tool_report_artifacts", customer.id, true);
  context.evidenceRequestCount = await countRows(admin, "customer_uploads", customer.id);
  context.blockers = customer.is_demo_account ? ["Demo/test context. No real client data is used."] : [];
  return context;
}

function buildSystemPrompt(surface: Surface): string {
  const preamble = buildAiPriorityPreamble({
    task_type: "rgs_guide",
    tool_key: "rgs_guide_bot",
  });
  return `${preamble}

You are the ${surface} RGS Guide Bot inside Revenue & Growth Systems.

RGS positioning:
"RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control."

Voice: calm, direct, practical, premium, owner-respecting, system-focused, human/Matt voice.

Role rules:
- public: explain RGS, Scorecard, Diagnostic, Implementation, RGS Control System, and route to public pages only.
- client: explain client-safe next steps, visible stage, assigned tools, evidence requests, and approved reports only.
- admin: guide admin workflow review, blockers, missing evidence, and next action.

Hard boundaries:
- Do not override deterministic scoring.
- Do not verify evidence.
- Do not publish, approve, send email, delete, change account state, change payment state, or change access.
- Do not expose admin notes to clients.
- Do not expose other client data.
- Do not expose secrets or raw provider errors.
- Do not provide legal, tax, accounting, compliance, valuation, fiduciary, or financial advice.
- Do not guarantee revenue, profit, growth, ROI, or outcomes.
- If unsure, say what can be checked next instead of guessing.

Return short practical guidance.`;
}

async function logRun(input: {
  status: "succeeded" | "failed" | "disabled";
  model: string | null;
  userId: string | null;
  surface: Surface;
  route: string;
  error?: string | null;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null;
}) {
  try {
    const admin = adminClient();
    await admin.from("ai_run_logs").insert({
      feature: "p94a_rgs_guide_bot",
      provider: "lovable_ai_gateway",
      model: input.model,
      status: input.status,
      object_table: null,
      object_id: null,
      prompt_tokens: input.usage?.prompt_tokens ?? null,
      completion_tokens: input.usage?.completion_tokens ?? null,
      total_tokens: input.usage?.total_tokens ?? null,
      estimated_cost_usd: null,
      error_message: input.error ?? null,
      metadata: {
        guide_version: GUIDE_VERSION,
        surface: input.surface,
        route: input.route,
        write_actions: "none",
        draft_only: true,
      },
      run_by: input.userId,
    } as Record<string, unknown>);
  } catch (e) {
    console.error("p94a guide ai_run_logs insert failed", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const model = Deno.env.get("RGS_AI_MODEL") ?? "google/gemini-2.5-flash";
  try {
    const body = await req.json().catch(() => ({}));
    const surface: Surface = body?.surface === "admin" || body?.surface === "client" ? body.surface : "public";
    const route = typeof body?.route === "string" ? body.route : "/";
    const message = typeof body?.message === "string" ? body.message.slice(0, 3000) : "";
    const customerId = typeof body?.customerId === "string" ? body.customerId : null;
    if (!message.trim()) return json({ error: "message is required" }, 400);

    const user = await getUserContext(req);
    const contextResult = await buildContext(surface, route, customerId, user);
    if (contextResult instanceof Response) return contextResult;
    const context = contextResult as ContextSummary;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const fallbackAnswer = deterministicAnswer(surface, message, context);
    const basePayload = {
      version: GUIDE_VERSION,
      surface,
      actions: actionsFor(surface, route, message),
      boundaries: BOUNDARIES[surface],
      contextSummary: context,
      draftOnly: true,
    };

    if (!LOVABLE_API_KEY) {
      await logRun({ status: "disabled", model, userId: user.userId, surface, route, error: "LOVABLE_API_KEY missing" });
      return json({
        ...basePayload,
        mode: "deterministic",
        answer: fallbackAnswer,
        aiAssisted: false,
      });
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
          { role: "system", content: buildSystemPrompt(surface) },
          {
            role: "user",
            content: [
              `Route: ${route}`,
              `Surface: ${surface}`,
              `Safe context summary: ${JSON.stringify(context).slice(0, 6000)}`,
              `Question: ${message}`,
            ].join("\n\n"),
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      await logRun({ status: "failed", model, userId: user.userId, surface, route, error: `gateway_${aiResponse.status}` });
      return json({
        ...basePayload,
        mode: "deterministic",
        answer: fallbackAnswer,
        aiAssisted: false,
      });
    }

    const payload = await aiResponse.json();
    const raw = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    const answer = raw && !forbiddenClaims(raw) ? raw : fallbackAnswer;
    await logRun({ status: "succeeded", model, userId: user.userId, surface, route, usage: payload?.usage ?? null });
    return json({
      ...basePayload,
      mode: "ai_backed",
      answer,
      aiAssisted: true,
    });
  } catch (e) {
    console.error("p94a rgs-guide-bot error", e);
    return json({ error: "Guide unavailable. Use the visible workflow controls.", version: GUIDE_VERSION }, 500);
  }
});
