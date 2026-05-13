// Server-side admin email notification helper.
//
// Sends operational alerts to RGS owner/admin recipients via Resend if
// configured. ALL behavior is best-effort: missing config or send failures
// must NOT break the surrounding payment / invite / account workflow. The
// caller already wrote a row to admin_notifications (the dashboard fallback)
// before invoking this helper.
//
// Secrets used (server-only): RESEND_API_KEY, ADMIN_EMAIL_FROM,
// ADMIN_EMAIL_RECIPIENTS (comma-separated; defaults to info@ and jmchubb@).
// None of these are ever read or referenced by frontend code.
import { createClient } from "npm:@supabase/supabase-js@2";

export type AdminEmailEvent =
  | "intake_needs_review"
  | "diagnostic_paid"
  | "diagnostic_paid_invite_pending"
  | "portal_invite_accepted"
  | "existing_client_payment_link_created"
  | "existing_client_paid"
  | "existing_client_payment_failed"
  | "subscription_active"
  | "subscription_issue"
  | "scorecard_lead_captured";

export interface AdminEmailFields {
  businessName?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  offer?: string | null;
  paymentLane?: string | null;
  amountCents?: number | null;
  subtotalCents?: number | null;
  taxCents?: number | null;
  totalCents?: number | null;
  currency?: string | null;
  status?: string | null;
  intakeStatus?: string | null;
  stripeReference?: string | null;
  nextAction?: string | null;
  adminLink?: string | null;
  // Free-form extra context. Never include raw invite tokens or secrets.
  notes?: string | null;
}

const DEFAULT_RECIPIENTS = [
  "info@revenueandgrowthsystems.com",
  "jmchubb@revenueandgrowthsystems.com",
];

function getRecipients(): string[] {
  const raw = Deno.env.get("ADMIN_EMAIL_RECIPIENTS");
  if (!raw) return DEFAULT_RECIPIENTS;
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
  return list.length > 0 ? list : DEFAULT_RECIPIENTS;
}

function subjectFor(event: AdminEmailEvent, biz: string): string {
  switch (event) {
    case "intake_needs_review":
      return `RGS intake needs review — ${biz}`;
    case "diagnostic_paid":
      return `RGS Diagnostic paid — ${biz}`;
    case "diagnostic_paid_invite_pending":
      return `Action needed: send RGS portal invite — ${biz}`;
    case "portal_invite_accepted":
      return `RGS client account created — ${biz}`;
    case "existing_client_payment_link_created":
      return `RGS payment link created — ${biz}`;
    case "existing_client_paid":
      return `RGS client payment received — ${biz}`;
    case "existing_client_payment_failed":
      return `RGS payment issue — ${biz}`;
    case "subscription_active":
      return `RGS Revenue Control System active — ${biz}`;
    case "subscription_issue":
      return `Action needed: RGS subscription issue — ${biz}`;
    case "scorecard_lead_captured":
      return `RGS scorecard lead captured — ${biz}`;
  }
}

function fmtMoney(cents?: number | null, currency?: string | null): string {
  if (cents == null) return "—";
  const c = (currency ?? "usd").toUpperCase();
  return `${(cents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: c,
  })}`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildBody(event: AdminEmailEvent, f: AdminEmailFields): {
  html: string;
  text: string;
} {
  const lines: [string, string | null | undefined][] = [
    ["Event", event],
    ["Business", f.businessName],
    ["Client", f.clientName],
    ["Client email", f.clientEmail],
    ["Offer", f.offer],
    ["Payment lane", f.paymentLane],
    ["Amount", f.amountCents != null ? fmtMoney(f.amountCents, f.currency) : null],
    ["Subtotal", f.subtotalCents != null ? fmtMoney(f.subtotalCents, f.currency) : null],
    ["Tax", f.taxCents != null ? fmtMoney(f.taxCents, f.currency) : null],
    ["Total", f.totalCents != null ? fmtMoney(f.totalCents, f.currency) : null],
    ["Status", f.status],
    ["Intake status", f.intakeStatus],
    ["Stripe reference", f.stripeReference],
    ["Next action", f.nextAction],
    ["Notes", f.notes],
    ["Admin link", f.adminLink],
    ["Timestamp", new Date().toISOString()],
  ];
  const filtered = lines.filter(([, v]) => v != null && v !== "");
  const text = filtered.map(([k, v]) => `${k}: ${v}`).join("\n");
  const html =
    `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">` +
    filtered
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#666"><strong>${escape(
            k,
          )}</strong></td><td style="padding:4px 0">${escape(String(v))}</td></tr>`,
      )
      .join("") +
    `</table><p style="font-family:Arial,sans-serif;font-size:12px;color:#888;margin-top:16px">Operational alert from Revenue and Growth Systems. Not a marketing email.</p>`;
  return { html, text };
}

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/**
 * Send an admin alert email and (when notificationId is provided) record
 * the delivery outcome on admin_notifications via the service-role RPC.
 *
 * Always returns the resulting status; never throws.
 */
export async function sendAdminEmail(args: {
  event: AdminEmailEvent;
  notificationId?: string | null;
  fields: AdminEmailFields;
}): Promise<"sent" | "skipped_missing_config" | "failed"> {
  const { event, notificationId, fields } = args;
  const recipients = getRecipients();
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ADMIN_EMAIL_FROM") ?? Deno.env.get("INVITE_EMAIL_FROM");

  let status: "sent" | "skipped_missing_config" | "failed";
  let error: string | null = null;

  if (!apiKey || !from) {
    status = "skipped_missing_config";
  } else {
    try {
      const biz = fields.businessName?.trim() || fields.clientName?.trim() || "client";
      const { html, text } = buildBody(event, fields);
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject: subjectFor(event, biz),
          html,
          text,
        }),
      });
      if (r.ok) {
        status = "sent";
      } else {
        status = "failed";
        error = `resend_${r.status}`;
        try {
          const t = await r.text();
          if (t) error = `${error}: ${t.slice(0, 300)}`;
        } catch {
          // ignore
        }
        console.warn("admin email send failed", error);
      }
    } catch (e) {
      status = "failed";
      error = String((e as Error)?.message ?? e).slice(0, 300);
      console.warn("admin email send threw", error);
    }
  }

  if (notificationId) {
    try {
      const supa = adminClient();
      await supa.rpc("admin_notification_record_email_result", {
        _notification_id: notificationId,
        _status: status,
        _recipients: recipients,
        _error: error,
      });
    } catch (e) {
      console.warn("failed to record admin email result", e);
    }
  }

  return status;
}