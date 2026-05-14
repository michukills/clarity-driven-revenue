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
// RGS_EMAIL_FROM / FOLLOWUP_EMAIL_FROM (optional override; default
// "John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>"),
// RGS_EMAIL_REPLY_TO (optional override; default
// "jmchubb@revenueandgrowthsystems.com"). Never touched by the frontend.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendAdminEmail } from "../_shared/admin-email.ts";
import {
  sendLeadFollowupEmail,
  topSlippingGear,
} from "../_shared/scorecard-followup-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ runId: z.string().uuid() });

// P93E-E4 — sender identity, reply-to, body builder, and Resend send all
// live in supabase/functions/_shared/scorecard-followup-email.ts so the
// public dispatcher and the admin resend function share identical
// behavior. Default sender:
//   "John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>"
// Default reply-to:
//   "jmchubb@revenueandgrowthsystems.com"
// Optional RGS_EMAIL_FROM / RGS_EMAIL_REPLY_TO secrets are honored only
// when they resolve to the verified revenueandgrowthsystems.com domain.

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
