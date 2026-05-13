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

function leadEmailBody(args: {
  firstName: string;
  businessName: string;
  scoreLow: number | null;
  scoreHigh: number | null;
  scoreEstimate: number | null;
  recommendedFocus: string[];
}): { html: string; text: string; subject: string } {
  const { firstName, businessName, scoreLow, scoreHigh, scoreEstimate, recommendedFocus } = args;
  const range =
    scoreLow != null && scoreHigh != null
      ? `${scoreLow}–${scoreHigh}`
      : scoreEstimate != null
      ? String(scoreEstimate)
      : "your read";
  const subject = `Your RGS Scorecard read — ${businessName}`;
  const focus = recommendedFocus
    .slice(0, 3)
    .map((f) => `<li style="margin:4px 0">${escape(f)}</li>`)
    .join("");
  const focusText = recommendedFocus.slice(0, 3).map((f) => `- ${f}`).join("\n");
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;max-width:560px">
  <p>Hi ${escape(firstName || "there")},</p>
  <p>Thanks for completing the Revenue &amp; Growth Systems Business Stability Scorecard for <strong>${escape(businessName)}</strong>.</p>
  <p>Your self-reported preliminary read is around <strong>${escape(range)}</strong> on the 0–1,000 scale. This is a starting signal, not a final diagnosis — RGS would validate it against real operating evidence before recommending action.</p>
  ${focus ? `<p><strong>Likely priority areas to look at first:</strong></p><ul>${focus}</ul>` : ""}
  <p>If you'd like a deeper review, the next step is the RGS Diagnostic — a structured evidence map of where the business is stable and where it may be slipping. You can review your read or request the Diagnostic here:</p>
  <p><a href="https://www.revenueandgrowthsystems.com/scorecard" style="display:inline-block;padding:10px 16px;background:#6B7B3A;color:#fff;text-decoration:none;border-radius:6px">Review your scorecard</a></p>
  <p>Reply to this email if you have any questions.</p>
  <p style="margin-top:24px">— Justin Chubb<br/>Revenue &amp; Growth Systems</p>
  <p style="font-size:11px;color:#888;margin-top:24px">You are receiving this because you submitted the public RGS Scorecard. RGS does not guarantee revenue results. This is operational visibility, not legal, tax, or financial advice.</p>
</div>`.trim();
  const text = [
    `Hi ${firstName || "there"},`,
    ``,
    `Thanks for completing the Revenue & Growth Systems Business Stability Scorecard for ${businessName}.`,
    ``,
    `Your self-reported preliminary read is around ${range} on the 0–1,000 scale. This is a starting signal, not a final diagnosis — RGS would validate it against real operating evidence before recommending action.`,
    ``,
    focusText ? `Likely priority areas to look at first:\n${focusText}\n` : "",
    `Review your scorecard: https://www.revenueandgrowthsystems.com/scorecard`,
    ``,
    `Reply to this email if you have any questions.`,
    ``,
    `— Justin Chubb`,
    `Revenue & Growth Systems`,
    ``,
    `You are receiving this because you submitted the public RGS Scorecard.`,
  ].join("\n");
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
          "overall_score_estimate, overall_score_low, overall_score_high, " +
          "recommended_focus",
      )
      .eq("id", runId)
      .maybeSingle();

    if (runErr || !run) {
      return ok({ skipped: "run_not_found" });
    }

    // Best-effort: try to link to an existing customer with the same email.
    try {
      const { data: existingCustomer } = await supa
        .from("customers")
        .select("id")
        .ilike("email", run.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingCustomer?.id) {
        await supa
          .from("scorecard_runs")
          .update({ linked_customer_id: existingCustomer.id })
          .eq("id", runId)
          .is("linked_customer_id", null);
      }
    } catch (e) {
      console.warn("scorecard-followup: customer linkage best-effort failed", e);
    }

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
          nextAction: "Open /admin/scorecard-leads and review the new lead",
          adminLink: "/admin/scorecard-leads",
          notes:
            `Score estimate: ${run.overall_score_estimate ?? "—"} ` +
            `(range ${run.overall_score_low ?? "—"}–${run.overall_score_high ?? "—"})`,
        },
      });
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
        });
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

    return ok({ status: "ok" });
  } catch (e) {
    console.error("scorecard-followup error", e);
    // Best-effort: never bubble up failures (frontend must not be blocked).
    return new Response(JSON.stringify({ status: "error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
