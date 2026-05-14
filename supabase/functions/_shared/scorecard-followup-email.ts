// P93E-E4 / E4B — Shared scorecard follow-up email builder + sender.
//
// Both the public dispatcher (scorecard-followup) and the admin resend
// function (admin-resend-scorecard-followup) import these helpers so the
// sender identity, reply-to, body copy, and honest-status semantics stay
// identical. Server-only — never imported from frontend code.
//
// Secrets (server-only): RESEND_API_KEY, RGS_EMAIL_FROM /
// FOLLOWUP_EMAIL_FROM, RGS_EMAIL_REPLY_TO.

const DEFAULT_FOLLOWUP_FROM =
  "John Matthew Chubb <jmchubb@revenueandgrowthsystems.com>";
const DEFAULT_FOLLOWUP_REPLY_TO = "jmchubb@revenueandgrowthsystems.com";
const SENDER_DOMAIN = "revenueandgrowthsystems.com";

function senderDomainOf(value: string): string | null {
  const match =
    value.match(/<\s*([^>\s]+)\s*>/) ?? value.match(/([^\s<>]+@[^\s<>]+)/);
  const addr = match?.[1]?.trim().toLowerCase() ?? "";
  const at = addr.lastIndexOf("@");
  if (at <= 0 || at === addr.length - 1) return null;
  return addr.slice(at + 1);
}

export function safeFollowupFrom(): string {
  const candidate =
    Deno.env.get("RGS_EMAIL_FROM") ??
    Deno.env.get("FOLLOWUP_EMAIL_FROM") ??
    DEFAULT_FOLLOWUP_FROM;
  return senderDomainOf(candidate) === SENDER_DOMAIN
    ? candidate
    : DEFAULT_FOLLOWUP_FROM;
}

export function safeFollowupReplyTo(): string {
  const candidate =
    Deno.env.get("RGS_EMAIL_REPLY_TO") ?? DEFAULT_FOLLOWUP_REPLY_TO;
  return senderDomainOf(candidate) === SENDER_DOMAIN
    ? candidate
    : DEFAULT_FOLLOWUP_REPLY_TO;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function scoreBracket(score: number | null): {
  label:
    | "Systemic Stability"
    | "Operational Strain"
    | "High Volatility"
    | "Score Submitted";
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

export function topSlippingGear(pillarResults: unknown): string | null {
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

export function leadEmailBody(args: {
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

export type FollowupSendStatus =
  | "sent"
  | "failed"
  | "skipped_missing_config"
  | "skipped_provider_error";

export async function sendLeadFollowupEmail(args: {
  to: string;
  firstName: string;
  businessName: string;
  scoreLow: number | null;
  scoreHigh: number | null;
  scoreEstimate: number | null;
  recommendedFocus: string[];
  topSlippingGear: string | null;
}): Promise<{
  status: FollowupSendStatus;
  error: string | null;
  from: string;
  providerMessageId: string | null;
}> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = safeFollowupFrom();
  const replyTo = safeFollowupReplyTo();
  if (!apiKey) {
    return { status: "skipped_missing_config", error: null, from, providerMessageId: null };
  }
  try {
    const { html, text, subject } = leadEmailBody(args);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    if (r.ok) {
      let providerMessageId: string | null = null;
      try {
        const body = (await r.json()) as { id?: unknown };
        if (typeof body?.id === "string") providerMessageId = body.id;
      } catch { /* ignore */ }
      return { status: "sent", error: null, from, providerMessageId };
    }
    let detail = `resend_${r.status}`;
    try {
      const t = await r.text();
      if (t) detail = `${detail}: ${t.slice(0, 300)}`;
    } catch { /* ignore */ }
    return { status: "failed", error: detail, from, providerMessageId: null };
  } catch (e) {
    return {
      status: "failed",
      error: String((e as Error)?.message ?? e).slice(0, 300),
      from,
      providerMessageId: null,
    };
  }
}
