// P96C — Operational Friction Scan lead follow-up dispatcher.
//
// Public, anonymous-callable edge function. The frontend invokes this
// function with a scan_leads row id immediately after a successful
// public scan lead insert. The function:
//
//   1. Re-reads the scan_leads row server-side (it NEVER trusts caller
//      payload for any field other than the row id).
//   2. Sends an admin alert email via the shared admin-email helper
//      (event "scan_lead_captured").
//   3. If the lead has email_consent = true, sends a Scan-specific
//      follow-up email to the lead from the shared verified RGS sender.
//   4. Records both send outcomes via the service-role
//      admin_record_scan_email_result RPC.
//
// Secrets (server-only): RESEND_API_KEY, ADMIN_EMAIL_FROM,
// RGS_EMAIL_FROM / FOLLOWUP_EMAIL_FROM, RGS_EMAIL_REPLY_TO.
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { sendAdminEmail } from "../_shared/admin-email.ts";
import { sendScanFollowupEmail } from "../_shared/scan-followup-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({ leadId: z.string().uuid() });

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
    const { leadId } = parsed.data;
    const supa = admin();

    const { data: lead, error: leadErr } = await supa
      .from("scan_leads")
      .select(
        "id, first_name, last_name, email, business_name, email_consent, " +
          "follow_up_email_status, admin_alert_email_status, " +
          "linked_customer_id, scan_summary, requested_next_step",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return ok({ skipped: "lead_not_found" });
    }

    const summary = (lead.scan_summary ?? {}) as {
      bottleneckHeadline?: string | null;
      upstreamGearLabel?: string | null;
      wornTeeth?: string[];
      confidenceLabel?: string | null;
    };

    let adminAlertStatus:
      | "sent"
      | "failed"
      | "skipped_missing_config"
      | "already_sent" =
      lead.admin_alert_email_status === "sent" ? "already_sent" : "skipped_missing_config";
    let followUpEmailStatus:
      | "sent"
      | "failed"
      | "skipped_missing_config"
      | "skipped_missing_consent"
      | "already_sent" =
      lead.follow_up_email_status === "sent" ? "already_sent" : "skipped_missing_consent";

    // 1) Admin alert.
    if (lead.admin_alert_email_status !== "sent") {
      const adminStatus = await sendAdminEmail({
        event: "scan_lead_captured",
        notificationId: null,
        fields: {
          businessName: lead.business_name,
          clientName: `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim(),
          clientEmail: lead.email,
          paymentLane: "public_non_client",
          intakeStatus: "scan_lead",
          nextAction: lead.linked_customer_id
            ? "Open the linked customer lead and review the Scan follow-up status"
            : "Open /admin/scan-leads and review the new Operational Friction Scan submission",
          adminLink: lead.linked_customer_id
            ? `/admin/customers/${lead.linked_customer_id}`
            : "/admin/scan-leads",
          notes:
            (summary.bottleneckHeadline
              ? `Bottleneck: ${summary.bottleneckHeadline}. `
              : "") +
            (summary.upstreamGearLabel
              ? `Upstream gear: ${summary.upstreamGearLabel}. `
              : "") +
            (lead.requested_next_step ? `Requested: ${lead.requested_next_step}` : ""),
        },
      });
      adminAlertStatus = adminStatus;
      try {
        await supa.rpc("admin_record_scan_email_result", {
          _lead_id: leadId,
          _kind: "admin_alert",
          _status: adminStatus,
          _error: null,
          _recipients: null,
        });
      } catch (e) {
        console.warn("scan-followup: failed to record admin alert result", e);
      }
    }

    // 2) Lead follow-up.
    if (lead.follow_up_email_status !== "sent") {
      if (!lead.email_consent) {
        followUpEmailStatus = "skipped_missing_consent";
        try {
          await supa.rpc("admin_record_scan_email_result", {
            _lead_id: leadId,
            _kind: "follow_up",
            _status: "skipped_missing_consent",
            _error: null,
            _recipients: null,
            _from: null,
          });
        } catch (e) {
          console.warn("scan-followup: failed to record skipped consent", e);
        }
      } else {
        const followup = await sendScanFollowupEmail({
          to: lead.email,
          firstName: lead.first_name ?? "",
          businessName: lead.business_name ?? "",
          bottleneckHeadline: summary.bottleneckHeadline ?? null,
          upstreamGearLabel: summary.upstreamGearLabel ?? null,
          wornTeeth: Array.isArray(summary.wornTeeth) ? summary.wornTeeth : [],
          confidenceLabel: summary.confidenceLabel ?? null,
        });
        followUpEmailStatus = followup.status;
        try {
          await supa.rpc("admin_record_scan_email_result", {
            _lead_id: leadId,
            _kind: "follow_up",
            _status: followup.status,
            _error: followup.error ?? null,
            _recipients: followup.recipients ?? null,
            _from: followup.from ?? null,
          });
        } catch (e) {
          console.warn("scan-followup: failed to record follow-up result", e);
        }
      }
    }

    return ok({
      adminAlertEmailStatus: adminAlertStatus,
      followUpEmailStatus,
      leadLinked: Boolean(lead.linked_customer_id),
    });
  } catch (e) {
    console.error("scan-followup: unexpected error", e);
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});