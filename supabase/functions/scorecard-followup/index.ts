// P93-L — Scorecard lead follow-up dispatcher.
//
// Public, anonymous-callable edge function. The frontend invokes this
// function with a scorecard_runs row id immediately after a successful
// public scorecard insert. The function:
//
//   1. Re-reads the scorecard_runs row server-side (it NEVER trusts caller
//      payload for any field other than the row id).
//   2. Sends an admin alert email to RGS owner/admin recipients via the
//      shared admin-email helper (event "scorecard_lead_captured").
//   3. If the lead has email_consent = true, sends a follow-up email to
//      the lead from FOLLOWUP_EMAIL_FROM (defaults to
//      jmchubb@revenueandgrowthsystems.com — info@ is NOT used until that
//      sender has been verified end-to-end).
//   4. Records both send outcomes back onto the scorecard_runs row via
//      the admin_record_scorecard_email_result service-role RPC.
//
// Secrets (server-only): RESEND_API_KEY, ADMIN_EMAIL_FROM,
// FOLLOWUP_EMAIL_FROM (optional override; default
// "jmchubb@revenueandgrowthsystems.com"). Never touched by the frontend.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendAdminEmail } from "../_shared/admin-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ runId: z.string().uuid() });

const DEFAULT_FOLLOWUP_FROM = "jmchubb@revenueandgrowthsystems.com";

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function scoreBracket(score: number | null): {
  label: "Systemic Stability" | "Operational Strain" | "High Volatility" | "Score Submitted";
  range: string;
  explanation: string;
} {
  if (score == null || !Number.isFinite(score)) {
    return {
      label: "Score Submitted",
      range: "Score pending",
      explanation:
        "Your Scorecard result was submitted, but we could not calculate the full score automatically. RGS can still review the submission and help identify the next step.",
    };
  }
  if (score >= 800) {
    return {
      label: "Systemic Stability",
      range: "800-1000",
      explanation:
        "The business shows stronger operating structure. The Diagnostic can still identify weak points, hidden concentration risks, owner-dependence, or scaling friction before they become expensive.",
    };
  }
  if (score >= 400) {
    return {
      label: "Operational Strain",
      range: "400-799",
      explanation:
        "The business may be working, but parts of the system likely depend too much on memory, manual effort, owner intervention, or inconsistent visibility.",
    };
  }
  return {
    label: "High Volatility",
    range: "0-399",
    explanation:
      "The business may be exposed to serious operational or revenue instability. This is not a reason to panic, but it is a reason to look closely at what is slipping first.",
  };
}

function topSlippingGear(pillarResults: unknown): string | null {
  if (!Array.isArray(pillarResults)) return null;
  const rows = pillarResults
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const r = row as { title?: unknown; score?: unknown };
      const title = typeof r.title === "string" ? r.title : null;
      const score = typeof r.score === "number" ? r.score : null;
      return title && score != null ? { title, score } : null;
    })
    .filter(Boolean) as { title: string; score: number }[];
  rows.sort((a, b) => a.score - b.score);
  return rows[0]?.title ?? null;
}

function cleanOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

async function ensureScorecardCustomerLink(args: {
  supa: ReturnType<typeof admin>;
  run: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    business_name: string | null;
    linked_customer_id?: string | null;
  };
}): Promise<string | null> {
  const { supa, run } = args;
  if (run.linked_customer_id) return run.linked_customer_id;

  const cleanEmail = run.email?.trim().toLowerCase();
  if (!cleanEmail) {
    console.warn(
      "scorecard-followup: missing lead email; skipping customer linkage",
      { runId: run.id },
    );
    return null;
  }

  try {
    const { data: existingCustomers, error: existingErr } = await supa
      .from("customers")
      .select("id")
      .ilike("email", cleanEmail)
      .order("created_at", { ascending: false })
      .limit(1);
    if (existingErr) throw existingErr;

    let customerId = existingCustomers?.[0]?.id ?? null;
    if (!customerId) {
      const firstName = cleanOptionalString(run.first_name);
      const lastName = cleanOptionalString(run.last_name);
      const businessName = cleanOptionalString(run.business_name);
      const fullName =
        [firstName, lastName].filter(Boolean).join(" ").trim() || cleanEmail;

      const { data: inserted, error: insertErr } = await supa
        .from("customers")
        .insert([
          {
            email: cleanEmail,
            full_name: fullName,
            business_name: businessName,
            lifecycle_state: "lead",
            stage: "lead",
            linked_scorecard_run_id: run.id,
            industry_intake_source: "public_scorecard",
            needs_industry_review: true,
            industry_confirmed_by_admin: false,
            industry_review_notes:
              "Created from public scorecard submission. Review before confirming industry, payment, portal access, or delivery scope.",
          },
        ])
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      customerId = inserted?.id ?? null;
    }

    if (customerId) {
      const { error: linkErr } = await supa
        .from("scorecard_runs")
        .update({ linked_customer_id: customerId })
        .eq("id", run.id)
        .is("linked_customer_id", null);
      if (linkErr) throw linkErr;
    }

    return customerId;
  } catch (e) {
    console.warn("scorecard-followup: customer lead linkage failed", {
      runId: run.id,
      error: String((e as Error)?.message ?? e).slice(0, 300),
    });
    return null;
  }
}

function leadEmailBody(args: {
  firstName: string;
  businessName: string;
  scoreLow: number | null;
  scoreHigh: number | null;
  scoreEstimate: number | null;
  recommendedFocus: string[];
  topSlippingGear: string | null;
}): { html: string; text: string; subject: string } {
  const {
    firstName,
    businessName,
    scoreLow,
    scoreHigh,
    scoreEstimate,
    recommendedFocus,
    topSlippingGear,
  } = args;
  const scoreDisplay =
    scoreLow != null && scoreHigh != null
      ? `${scoreLow}–${scoreHigh}`
      : scoreEstimate != null
      ? String(scoreEstimate)
      : "submitted";
  const bracket = scoreBracket(scoreEstimate);
  const ctaUrl = "https://www.revenueandgrowthsystems.com/diagnostic";
  const subject = "Your RGS Business Stability Score is ready";
  const preheader =
    "A first-pass view of where your business may be slipping across the five RGS operating gears.";
  const focus = recommendedFocus
    .slice(0, 3)
    .map((f) => `<li style="margin:4px 0">${escape(f)}</li>`)
    .join("");
  const focusText = recommendedFocus.slice(0, 3).map((f) => `- ${f}`).join("\n");
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;max-width:560px">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escape(preheader)}</div>
  <p>Hi ${escape(firstName || "there")},</p>
  <p>Thanks for completing the Revenue &amp; Growth Systems Business Stability Scorecard${businessName ? ` for <strong>${escape(businessName)}</strong>` : ""}.</p>
  <p>Your preliminary Business Stability Score is <strong>${escape(scoreDisplay)}</strong> on the 0–1,000 scale. That places the submission in <strong>${escape(bracket.label)}</strong> (${escape(bracket.range)}).</p>
  <p>${escape(bracket.explanation)}</p>
  <p>This score is not a final diagnosis. It is a first-pass stability check across five operating gears: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence.</p>
  ${topSlippingGear ? `<p>The gear showing the most strain in this first pass is <strong>${escape(topSlippingGear)}</strong>.</p>` : ""}
  <p>Revenue &amp; Growth Systems helps established small businesses see where their operating system is slipping before those issues turn into inconsistent revenue, owner burnout, operational drag, or financial confusion.</p>
  <p>Your business usually is not broken. The systems underneath it are what start slipping.</p>
  ${focus ? `<p><strong>Likely areas RGS would look at first:</strong></p><ul>${focus}</ul>` : ""}
  <p>The RGS Diagnostic is the deeper review. It looks beyond the public Scorecard, reviews the operating structure in more detail, and produces a clearer picture of what is working, what is slipping, and what to fix first.</p>
  <p><a href="${ctaUrl}" style="display:inline-block;padding:10px 16px;background:#6B7B3A;color:#fff;text-decoration:none;border-radius:6px">See If the Diagnostic Is a Fit</a></p>
  <p>After that, you can review the Diagnostic option. If it is a fit, RGS will use a deeper Diagnostic Interview and review process to prepare a Stability Snapshot and prioritized repair direction. Implementation is separate and not automatically included unless purchased.</p>
  <p>Reply to this email if you have a question about the score or the Diagnostic.</p>
  <p style="margin-top:24px">John Matthew Chubb<br/>Revenue &amp; Growth Systems</p>
  <p style="font-size:11px;color:#888;margin-top:24px">The public Scorecard is a directional first-pass stability check, not legal, tax, accounting, compliance, valuation, or financial advice, and not a guarantee of results.</p>
</div>`.trim();
  const text = [
    `Hi ${firstName || "there"},`,
    ``,
    `Thanks for completing the Revenue & Growth Systems Business Stability Scorecard${businessName ? ` for ${businessName}` : ""}.`,
    ``,
    `Your preliminary Business Stability Score is ${scoreDisplay} on the 0–1,000 scale. That places the submission in ${bracket.label} (${bracket.range}).`,
    ``,
    bracket.explanation,
    ``,
    `This score is not a final diagnosis. It is a first-pass stability check across five operating gears: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence.`,
    ``,
    topSlippingGear ? `The gear showing the most strain in this first pass is ${topSlippingGear}.` : "",
    topSlippingGear ? `` : "",
    `Revenue & Growth Systems helps established small businesses see where their operating system is slipping before those issues turn into inconsistent revenue, owner burnout, operational drag, or financial confusion.`,
    ``,
    `Your business usually is not broken. The systems underneath it are what start slipping.`,
    ``,
    focusText ? `Likely areas RGS would look at first:\n${focusText}\n` : "",
    `The RGS Diagnostic is the deeper review. It looks beyond the public Scorecard, reviews the operating structure in more detail, and produces a clearer picture of what is working, what is slipping, and what to fix first.`,
    ``,
    `See if the Diagnostic is a fit: ${ctaUrl}`,
    ``,
    `After that, you can review the Diagnostic option. If it is a fit, RGS will use a deeper Diagnostic Interview and review process to prepare a Stability Snapshot and prioritized repair direction. Implementation is separate and not automatically included unless purchased.`,
    ``,
    `Reply to this email if you have a question about the score or the Diagnostic.`,
    ``,
    `John Matthew Chubb`,
    `Revenue & Growth Systems`,
    ``,
    `The public Scorecard is a directional first-pass stability check, not legal, tax, accounting, compliance, valuation, or financial advice, and not a guarantee of results.`,
  ].filter((line) => line !== null).join("\n");
  return { html, text, subject };
}

async function sendLeadFollowupEmail(args: {
  to: string;
  firstName: string;
  businessName: string;
  scoreLow: number | null;
  scoreHigh: number | null;
  scoreEstimate: number | null;
  recommendedFocus: string[];
  topSlippingGear: string | null;
}): Promise<{ status: "sent" | "failed" | "skipped_missing_config"; error: string | null; from: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("FOLLOWUP_EMAIL_FROM") ?? DEFAULT_FOLLOWUP_FROM;
  if (!apiKey) {
    return { status: "skipped_missing_config", error: null, from };
  }
  try {
    const { html, text, subject } = leadEmailBody(args);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [args.to], subject, html, text }),
    });
    if (r.ok) return { status: "sent", error: null, from };
    let detail = `resend_${r.status}`;
    try {
      const t = await r.text();
      if (t) detail = `${detail}: ${t.slice(0, 300)}`;
    } catch { /* ignore */ }
    return { status: "failed", error: detail, from };
  } catch (e) {
    return { status: "failed", error: String((e as Error)?.message ?? e).slice(0, 300), from };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { runId } = parsed.data;
    const supa = admin();

    // Re-read the row server-side. NEVER trust caller payload.
    const { data: run, error: runErr } = await supa
      .from("scorecard_runs")
      .select(
          "id, first_name, last_name, email, business_name, email_consent, " +
          "follow_up_email_status, admin_alert_email_status, " +
          "linked_customer_id, overall_score_estimate, overall_score_low, overall_score_high, " +
          "recommended_focus, pillar_results",
      )
      .eq("id", runId)
      .maybeSingle();

    if (runErr || !run) {
      return ok({ skipped: "run_not_found" });
    }

    // Best-effort: link to the most recent customer with the same email,
    // or create a lead when this public scorecard email is new. This must
    // not block or fake the email follow-up outcome.
    const linkedCustomerId = await ensureScorecardCustomerLink({ supa, run });

    let adminAlertStatus: "sent" | "failed" | "skipped_missing_config" | "already_sent" =
      run.admin_alert_email_status === "sent" ? "already_sent" : "skipped_missing_config";
    let followUpEmailStatus:
      | "sent"
      | "failed"
      | "skipped_missing_config"
      | "skipped_missing_consent"
      | "already_sent" =
      run.follow_up_email_status === "sent" ? "already_sent" : "skipped_missing_consent";

    // 1) Admin alert (idempotent: skip if already sent).
    if (run.admin_alert_email_status !== "sent") {
      const adminStatus = await sendAdminEmail({
        event: "scorecard_lead_captured",
        notificationId: null,
        fields: {
          businessName: run.business_name,
          clientName: `${run.first_name ?? ""} ${run.last_name ?? ""}`.trim(),
          clientEmail: run.email,
          paymentLane: "public_non_client",
          intakeStatus: "scorecard_lead",
          nextAction: linkedCustomerId
            ? "Open the linked customer lead and review the scorecard follow-up status"
            : "Open /admin/scorecard-leads and review the unlinked scorecard submission",
          adminLink: linkedCustomerId
            ? `/admin/customers/${linkedCustomerId}`
            : "/admin/scorecard-leads",
          notes:
            `Score estimate: ${run.overall_score_estimate ?? "—"} ` +
            `(range ${run.overall_score_low ?? "—"}–${run.overall_score_high ?? "—"})`,
        },
      });
      adminAlertStatus = adminStatus;
      try {
        await supa.rpc("admin_record_scorecard_email_result", {
          _run_id: runId,
          _kind: "admin_alert",
          _status: adminStatus,
          _error: null,
          _recipients: null,
        });
      } catch (e) {
        console.warn("scorecard-followup: failed to record admin alert result", e);
      }
    }

    // 2) Lead follow-up.
    if (run.follow_up_email_status !== "sent") {
      if (!run.email_consent) {
        followUpEmailStatus = "skipped_missing_consent";
        try {
          await supa.rpc("admin_record_scorecard_email_result", {
            _run_id: runId,
            _kind: "follow_up",
            _status: "skipped_missing_consent",
            _error: null,
            _recipients: null,
            _from: null,
          });
        } catch (e) {
          console.warn("scorecard-followup: failed to record skipped consent", e);
        }
      } else {
        const followup = await sendLeadFollowupEmail({
          to: run.email,
          firstName: run.first_name ?? "",
          businessName: run.business_name ?? "",
          scoreLow: run.overall_score_low,
          scoreHigh: run.overall_score_high,
          scoreEstimate: run.overall_score_estimate,
          recommendedFocus: Array.isArray(run.recommended_focus)
            ? (run.recommended_focus as string[])
            : [],
          topSlippingGear: topSlippingGear(run.pillar_results),
        });
        followUpEmailStatus = followup.status;
        try {
          await supa.rpc("admin_record_scorecard_email_result", {
            _run_id: runId,
            _kind: "follow_up",
            _status: followup.status,
            _error: followup.error,
            _recipients: followup.status === "sent" ? [run.email] : null,
            _from: followup.from,
          });
        } catch (e) {
          console.warn("scorecard-followup: failed to record follow-up result", e);
        }
      }
    }

    return ok({
      status: "ok",
      linkedCustomerId: linkedCustomerId ?? null,
      leadLinked: Boolean(linkedCustomerId),
      followUpEmailStatus,
      adminAlertEmailStatus: adminAlertStatus,
    });
  } catch (e) {
    console.error("scorecard-followup error", e);
    // Best-effort: never bubble up failures (frontend must not be blocked).
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
