/**
 * P86 — Email Consent / Communication Permission Gate.
 *
 * Deterministic gate. RGS does NOT send automated emails unless:
 *  - email automation is wired (EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED),
 *  - consent_status === 'active',
 *  - unsubscribe_status === 'subscribed',
 *  - notification_type is allowed by preference_json (default: allowed).
 *
 * No third-party email backend is wired. Every send call therefore
 * resolves to either `blocked_no_email_backend` or
 * `blocked_missing_consent` / `blocked_revoked_consent` /
 * `admin_tracked_only`. Honest labels only.
 *
 * NOTE: Final consent wording / unsubscribe rules should be reviewed
 * by qualified counsel. This file is risk-reduction product logic,
 * not legal advice.
 */
import { supabase } from "@/integrations/supabase/client";
import { EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED } from "@/config/evidenceDecay";

export const EMAIL_CONSENT_VERSION = "rgs-consent-v1-2026-05";
export const EMAIL_CONSENT_TEXT =
  "I agree to receive operational emails from Revenue & Growth Systems related to my RGS account, including evidence-expiration reminders, report-ready notices, account notifications, and other operational communications. I can revoke this consent at any time from my RGS portal account settings.";

export type EmailConsentStatus = "active" | "revoked" | "missing" | "unknown";
export type EmailUnsubStatus =
  | "subscribed"
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "unknown";
export type EmailConsentSource =
  | "signup"
  | "checkout"
  | "portal_onboarding"
  | "admin_invite"
  | "manual_admin"
  | "preference_center"
  | "other";

export type EmailSendStatus =
  | "sent"
  | "blocked_missing_consent"
  | "blocked_revoked_consent"
  | "blocked_no_email_backend"
  | "admin_tracked_only"
  | "failed";

export interface EmailConsentRow {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  email: string;
  consent_status: EmailConsentStatus;
  consent_source: EmailConsentSource;
  consent_text: string;
  consent_version: string;
  consented_at: string | null;
  revoked_at: string | null;
  unsubscribe_status: EmailUnsubStatus;
  preference_json: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export interface CanSendEmailInput {
  customerId?: string | null;
  userId?: string | null;
  email?: string | null;
  notificationType: string;
}

export interface CanSendEmailResult {
  allowed: boolean;
  reason: EmailSendStatus | "ok";
  consent?: EmailConsentRow | null;
  /** True iff a real email backend is wired. Currently always false. */
  backendWired: boolean;
}

/** Look up the most recent consent row matching email/user/customer. */
export async function getEmailConsentStatus(
  args: { customerId?: string | null; userId?: string | null; email?: string | null },
): Promise<EmailConsentRow | null> {
  let q = (supabase as any)
    .from("email_communication_consents")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (args.email) q = q.eq("email", args.email.toLowerCase().trim());
  else if (args.userId) q = q.eq("user_id", args.userId);
  else if (args.customerId) q = q.eq("customer_id", args.customerId);
  else return null;
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? [])[0] as EmailConsentRow) ?? null;
}

export interface RecordEmailConsentInput {
  customer_id?: string | null;
  user_id?: string | null;
  email: string;
  consent_source: EmailConsentSource;
  ip_address?: string | null;
  user_agent?: string | null;
  preference_json?: Record<string, unknown>;
}

export async function recordEmailConsent(input: RecordEmailConsentInput) {
  const row = {
    customer_id: input.customer_id ?? null,
    user_id: input.user_id ?? null,
    email: input.email.toLowerCase().trim(),
    consent_status: "active" as EmailConsentStatus,
    consent_source: input.consent_source,
    consent_text: EMAIL_CONSENT_TEXT,
    consent_version: EMAIL_CONSENT_VERSION,
    consented_at: new Date().toISOString(),
    revoked_at: null,
    unsubscribe_status: "subscribed" as EmailUnsubStatus,
    preference_json: input.preference_json ?? {},
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
  };
  const { data, error } = await (supabase as any)
    .from("email_communication_consents")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data as EmailConsentRow;
}

export async function revokeEmailConsent(consentId: string) {
  const { error } = await (supabase as any)
    .from("email_communication_consents")
    .update({
      consent_status: "revoked",
      revoked_at: new Date().toISOString(),
      unsubscribe_status: "unsubscribed",
    })
    .eq("id", consentId);
  if (error) throw error;
}

export async function updateEmailPreferences(
  consentId: string,
  preferences: Record<string, unknown>,
) {
  const { error } = await (supabase as any)
    .from("email_communication_consents")
    .update({ preference_json: preferences })
    .eq("id", consentId);
  if (error) throw error;
}

/**
 * Pure decision function. Exposed for tests + callers that already hold
 * a consent row.
 */
export function evaluateEmailSendDecision(
  consent: EmailConsentRow | null,
  notificationType: string,
  backendWired: boolean = EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED,
): CanSendEmailResult {
  if (!backendWired) {
    return { allowed: false, reason: "blocked_no_email_backend", consent, backendWired };
  }
  if (!consent) {
    return { allowed: false, reason: "blocked_missing_consent", consent, backendWired };
  }
  if (consent.consent_status !== "active") {
    return { allowed: false, reason: "blocked_revoked_consent", consent, backendWired };
  }
  if (consent.unsubscribe_status !== "subscribed") {
    return { allowed: false, reason: "blocked_revoked_consent", consent, backendWired };
  }
  const prefs = consent.preference_json ?? {};
  if (notificationType in prefs && (prefs as any)[notificationType] === false) {
    return { allowed: false, reason: "blocked_revoked_consent", consent, backendWired };
  }
  return { allowed: true, reason: "ok", consent, backendWired };
}

export async function canSendNotificationEmail(
  input: CanSendEmailInput,
): Promise<CanSendEmailResult> {
  const consent = await getEmailConsentStatus({
    customerId: input.customerId,
    userId: input.userId,
    email: input.email,
  });
  return evaluateEmailSendDecision(consent, input.notificationType);
}

export interface LogEmailAttemptInput {
  customer_id?: string | null;
  user_id?: string | null;
  email: string;
  notification_type: string;
  related_record_type?: string | null;
  related_record_id?: string | null;
  consent_checked: boolean;
  consent_status_at_send?: EmailConsentStatus | null;
  send_status: EmailSendStatus;
  email_backend?: string | null;
  provider_message_id?: string | null;
  failure_reason?: string | null;
}

export async function logEmailNotificationAttempt(input: LogEmailAttemptInput) {
  const { data, error } = await (supabase as any)
    .from("email_notification_attempts")
    .insert({
      ...input,
      email: input.email.toLowerCase().trim(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * High-level safe sender. Today this NEVER actually sends — it always
 * resolves to a blocked/admin-tracked outcome and logs an attempt.
 * When a real email backend is wired, the `// TODO: real send` branch
 * becomes the actual provider call.
 */
export async function attemptNotificationEmail(input: CanSendEmailInput & {
  related_record_type?: string | null;
  related_record_id?: string | null;
}) {
  const decision = await canSendNotificationEmail(input);
  const attempt = await logEmailNotificationAttempt({
    customer_id: input.customerId ?? null,
    user_id: input.userId ?? null,
    email: (input.email ?? decision.consent?.email ?? "unknown@unknown").toString(),
    notification_type: input.notificationType,
    related_record_type: input.related_record_type ?? null,
    related_record_id: input.related_record_id ?? null,
    consent_checked: true,
    consent_status_at_send: decision.consent?.consent_status ?? "missing",
    send_status: decision.allowed ? "admin_tracked_only" : decision.reason as EmailSendStatus,
    email_backend: null,
    provider_message_id: null,
    failure_reason: null,
  });
  return { decision, attempt };
}

export const EMAIL_CONSENT_LEGAL_REVIEW_NOTE =
  "Legal review note: consent text, unsubscribe handling, and notification-type opt-outs should be reviewed by qualified counsel before reliance. RGS treats this as risk-reduction product logic, not legal advice.";