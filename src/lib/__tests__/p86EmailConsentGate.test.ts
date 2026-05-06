import { describe, it, expect } from "vitest";
import {
  evaluateEmailSendDecision,
  EMAIL_CONSENT_TEXT,
  EMAIL_CONSENT_LEGAL_REVIEW_NOTE,
  type EmailConsentRow,
} from "@/lib/emailConsent";
import { EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED } from "@/config/evidenceDecay";

const baseConsent = (overrides: Partial<EmailConsentRow> = {}): EmailConsentRow => ({
  id: "c1", customer_id: null, user_id: null, email: "a@b.co",
  consent_status: "active", consent_source: "preference_center",
  consent_text: EMAIL_CONSENT_TEXT, consent_version: "v1",
  consented_at: new Date().toISOString(), revoked_at: null,
  unsubscribe_status: "subscribed", preference_json: {},
  ip_address: null, user_agent: null,
  created_at: "", updated_at: "", ...overrides,
});

describe("P86 Email Consent Gate", () => {
  it("backend currently not wired", () => {
    expect(EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED).toBe(false);
  });
  it("missing consent + backend off => blocked_no_email_backend", () => {
    const r = evaluateEmailSendDecision(null, "evidence_expiring", false);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("blocked_no_email_backend");
  });
  it("missing consent + backend on => blocked_missing_consent", () => {
    const r = evaluateEmailSendDecision(null, "evidence_expiring", true);
    expect(r.reason).toBe("blocked_missing_consent");
  });
  it("revoked => blocked_revoked_consent", () => {
    const r = evaluateEmailSendDecision(baseConsent({ consent_status: "revoked" }), "x", true);
    expect(r.reason).toBe("blocked_revoked_consent");
  });
  it("unsubscribed => blocked_revoked_consent", () => {
    const r = evaluateEmailSendDecision(baseConsent({ unsubscribe_status: "unsubscribed" }), "x", true);
    expect(r.reason).toBe("blocked_revoked_consent");
  });
  it("preference false for type => blocked", () => {
    const r = evaluateEmailSendDecision(baseConsent({ preference_json: { evidence_expiring: false } }), "evidence_expiring", true);
    expect(r.allowed).toBe(false);
  });
  it("active + backend on => allowed ok", () => {
    const r = evaluateEmailSendDecision(baseConsent(), "x", true);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("ok");
  });
  it("active + backend off => blocked_no_email_backend", () => {
    const r = evaluateEmailSendDecision(baseConsent(), "x", false);
    expect(r.reason).toBe("blocked_no_email_backend");
  });
  it("consent text + legal review note exist", () => {
    expect(EMAIL_CONSENT_TEXT.length).toBeGreaterThan(50);
    expect(EMAIL_CONSENT_LEGAL_REVIEW_NOTE.toLowerCase()).toContain("legal");
    expect(EMAIL_CONSENT_LEGAL_REVIEW_NOTE.toLowerCase()).toContain("not legal advice");
  });
});