// P96C — Shared Operational Friction Scan follow-up email builder + sender.
//
// Server-only. Sent by `scan-followup` to public visitors who completed the
// Scan and provided contact info with email_consent = true. This email is
// the public LEAD-GEN follow-up — it must NEVER imply a deterministic
// score, a completed Diagnostic, or a guaranteed outcome.
//
// Reuses the verified RGS sender identity established in
// `_shared/scorecard-followup-email.ts`. Same FROM, same reply-to, new body.
//
// Secrets (server-only): RESEND_API_KEY, RGS_EMAIL_FROM /
// FOLLOWUP_EMAIL_FROM, RGS_EMAIL_REPLY_TO.

const DEFAULT_SCAN_FROM =
  "John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>";
const DEFAULT_SCAN_REPLY_TO = "jmchubb@revenueandgrowthsystems.com";
const SENDER_DOMAIN = "revenueandgrowthsystems.com";

function senderDomainOf(value: string): string | null {
  const match =
    value.match(/<\s*([^>\s]+)\s*>/) ?? value.match(/([^\s<>]+@[^\s<>]+)/);
  const addr = match?.[1]?.trim().toLowerCase() ?? "";
  const at = addr.lastIndexOf("@");
  if (at <= 0 || at === addr.length - 1) return null;
  return addr.slice(at + 1);
}

export function safeScanFollowupFrom(): string {
  const candidate =
    Deno.env.get("RGS_EMAIL_FROM") ??
    Deno.env.get("FOLLOWUP_EMAIL_FROM") ??
    DEFAULT_SCAN_FROM;
  return senderDomainOf(candidate) === SENDER_DOMAIN
    ? candidate
    : DEFAULT_SCAN_FROM;
}

export function safeScanFollowupReplyTo(): string {
  const candidate =
    Deno.env.get("RGS_EMAIL_REPLY_TO") ?? DEFAULT_SCAN_REPLY_TO;
  return senderDomainOf(candidate) === SENDER_DOMAIN
    ? candidate
    : DEFAULT_SCAN_REPLY_TO;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ScanFollowupArgs {
  to: string;
  firstName: string;
  businessName: string;
  bottleneckHeadline: string | null;
  upstreamGearLabel: string | null;
  wornTeeth: string[];
  confidenceLabel: string | null;
}

export type ScanSendStatus = "sent" | "failed" | "skipped_missing_config";

export interface ScanSendResult {
  status: ScanSendStatus;
  error?: string;
  recipients?: string[];
  from?: string;
}

export function buildScanFollowupBody(args: ScanFollowupArgs): {
  subject: string;
  html: string;
  text: string;
} {
  const { firstName, businessName, bottleneckHeadline, upstreamGearLabel, wornTeeth, confidenceLabel } = args;
  const subject = "Your Operational Friction Scan read";
  const preheader =
    "Directional read from your Operational Friction Scan — what looked like the likely upstream bottleneck and the worn teeth showing wear.";
  const ctaUrl = "https://www.revenueandgrowthsystems.com/diagnostic";
  const wornList = wornTeeth
    .slice(0, 4)
    .map((w) => `<li style="margin:4px 0">${escape(w)}</li>`)
    .join("");
  const wornText = wornTeeth.slice(0, 4).map((w) => `- ${w}`).join("\n");
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;line-height:1.55;max-width:560px">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${escape(preheader)}</div>
  <p>Hi ${escape(firstName || "there")},</p>
  <p>Thanks for running the Operational Friction Scan${businessName ? ` for <strong>${escape(businessName)}</strong>` : ""}.</p>
  <p>This is a <strong>directional read</strong> from a short, self-reported scan — not a full Diagnostic. Here is what your scan suggested may be creating pressure:</p>
  ${bottleneckHeadline ? `<p><strong>Likely upstream bottleneck:</strong> ${escape(bottleneckHeadline)}${upstreamGearLabel ? ` &mdash; centered on <em>${escape(upstreamGearLabel)}</em>` : ""}.</p>` : ""}
  ${wornList ? `<p><strong>Worn teeth the scan picked up:</strong></p><ul style="margin:8px 0 16px 18px;padding:0">${wornList}</ul>` : ""}
  <p>The Operational Friction Scan is intentionally light. The deeper RGS Diagnostic combines three things to produce a real read:</p>
  <ol style="margin:8px 0 16px 18px;padding:0">
    <li style="margin:4px 0"><strong>Diagnostic Part 1 — Business Stability Scorecard</strong> (deterministic 0–1000 read across the five gears).</li>
    <li style="margin:4px 0"><strong>Owner Diagnostic Interview</strong> (captures the operating context the scorecard cannot infer).</li>
    <li style="margin:4px 0"><strong>Evidence / Review layer</strong> (where applicable, so the read is anchored in what is actually happening).</li>
  </ol>
  <p>If this scan rang true, the Diagnostic is the structured next step. RGS can help you decide what to inspect first.</p>
  <p style="margin:24px 0"><a href="${ctaUrl}" style="display:inline-block;background:#3a4a23;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600">See If the Diagnostic Is a Fit</a></p>
  <p style="font-size:12px;color:#666">Confidence on the scan read: ${escape(confidenceLabel ?? "medium")}. The scan is directional, not a full Diagnostic. Your business usually is not broken. The systems underneath it are what start slipping.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
  <p style="font-size:12px;color:#666">— John Matthew Chubb, Revenue &amp; Growth Systems</p>
  <p style="font-size:11px;color:#888;line-height:1.5">This message is operational orientation only. It is not legal, tax, accounting, compliance, valuation, or financial advice, and does not promise revenue, profit, growth, or business outcomes.</p>
</div>`;
  const text = `Hi ${firstName || "there"},

Thanks for running the Operational Friction Scan${businessName ? ` for ${businessName}` : ""}.

This is a directional read — not a full Diagnostic.

${bottleneckHeadline ? `Likely upstream bottleneck: ${bottleneckHeadline}${upstreamGearLabel ? ` (centered on ${upstreamGearLabel})` : ""}.\n` : ""}${wornText ? `Worn teeth the scan picked up:\n${wornText}\n\n` : ""}The deeper Diagnostic combines:
1) Diagnostic Part 1 — Business Stability Scorecard
2) Owner Diagnostic Interview
3) Evidence / Review layer

See if the Diagnostic is a fit: ${ctaUrl}

Confidence on the scan read: ${confidenceLabel ?? "medium"}. The scan is directional, not a full Diagnostic.

— John Matthew Chubb, Revenue & Growth Systems

This message is operational orientation only. It is not legal, tax, accounting, compliance, valuation, or financial advice, and does not promise revenue, profit, growth, or business outcomes.`;
  return { subject, html, text };
}

export async function sendScanFollowupEmail(args: ScanFollowupArgs): Promise<ScanSendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return { status: "skipped_missing_config", error: "RESEND_API_KEY not configured" };
  }
  const from = safeScanFollowupFrom();
  const replyTo = safeScanFollowupReplyTo();
  const recipients = [args.to];
  const { subject, html, text } = buildScanFollowupBody(args);
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return {
        status: "failed",
        error: `resend_${resp.status}:${body.slice(0, 200)}`,
        recipients,
        from,
      };
    }
    return { status: "sent", recipients, from };
  } catch (e) {
    return {
      status: "failed",
      error: String((e as Error)?.message ?? e).slice(0, 240),
      recipients,
      from,
    };
  }
}