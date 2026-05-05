/**
 * P67 — Evidence-Linked Scoring + RGS Evidence Vault™ Hardening contract.
 *
 * Pins scope-safe Evidence Vault vocabulary, the
 * "Operational Readiness, Not Regulatory Assurance" principle,
 * redaction warning + owner confirmation behavior on the client upload
 * surface, and forbidden client-facing self-certification phrases.
 * Intentionally does NOT touch deterministic scoring or the
 * existing `customer_uploads` table / `client-uploads` bucket — both
 * are reused as-is.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EVIDENCE_USE_CONTEXTS,
  EVIDENCE_SUFFICIENCY_STATUSES,
  EVIDENCE_SUFFICIENCY_CLIENT_LABEL,
  ADMIN_ONLY_REGULATED_TAGS,
  CLIENT_FORBIDDEN_EVIDENCE_PHRASES,
  OPERATIONAL_READINESS_PRINCIPLE,
  VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER,
  VAULT_DATA_PORTABILITY_NOTE,
  VAULT_NON_FIDUCIARY_DISCLAIMER,
  VAULT_REDACTION_WARNING,
  VAULT_REDACTION_CONFIRMATION_LABEL,
  VAULT_CANNABIS_MMJ_NOTE,
  EVIDENCE_VAULT_NAME,
  COMPLIANCE_EVIDENCE_VAULT_NAME,
} from "@/config/evidenceVault";
import { RGS_NAMES } from "@/config/rgsNaming";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("P67 — Evidence Vault registry", () => {
  it("inherits canonical names from the P66 registry", () => {
    expect(EVIDENCE_VAULT_NAME).toBe(RGS_NAMES.evidenceVault);
    expect(COMPLIANCE_EVIDENCE_VAULT_NAME).toBe(
      RGS_NAMES.complianceEvidenceVault,
    );
  });

  it("exposes the required evidence_use_context vocabulary", () => {
    for (const ctx of [
      "diagnostic",
      "scorecard",
      "structural_health_report",
      "repair_map",
      "compliance_visibility",
      "financial_visibility",
      "implementation",
      "monthly_review",
      "system_ledger",
      "control_system",
    ] as const) {
      expect(EVIDENCE_USE_CONTEXTS).toContain(ctx);
    }
  });

  it("exposes the required sufficiency statuses with client-safe labels", () => {
    for (const s of [
      "not_provided",
      "provided",
      "needs_review",
      "accepted",
      "insufficient",
      "client_clarification_needed",
      "redaction_needed",
      "professional_review_recommended",
    ] as const) {
      expect(EVIDENCE_SUFFICIENCY_STATUSES).toContain(s);
      expect(EVIDENCE_SUFFICIENCY_CLIENT_LABEL[s]).toBeTruthy();
    }
    // Client-facing labels must never imply legal/regulatory certification.
    for (const label of Object.values(EVIDENCE_SUFFICIENCY_CLIENT_LABEL)) {
      for (const banned of CLIENT_FORBIDDEN_EVIDENCE_PHRASES) {
        expect(label.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    }
  });

  it("declares admin-only regulated tags", () => {
    for (const tag of [
      "regulatory_audit_ready",
      "needs_professional_review",
      "not_sufficient_for_compliance_review",
      "operationally_useful_not_compliance_certified",
      "redaction_needed_admin",
      "possible_sensitive_data",
      "third_party_professional_review_recommended",
    ] as const) {
      expect(ADMIN_ONLY_REGULATED_TAGS).toContain(tag);
    }
  });

  it("Operational Readiness principle disclaims regulated/financial assurance", () => {
    const m = OPERATIONAL_READINESS_PRINCIPLE;
    expect(m).not.toMatch(/mirror, not the map/i);
    expect(m).toMatch(/operational readiness/i);
    expect(m).toMatch(/regulatory assurance/i);
    expect(m).toMatch(/fiduciary/i);
    expect(m).toMatch(/healthcare privacy/i);
  });

  it("Vault is positioned as temporary repository, not official record", () => {
    expect(VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER).toMatch(/temporary repository/i);
    expect(VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER).toMatch(
      /not the client'?s official compliance record keeper/i,
    );
    expect(VAULT_DATA_PORTABILITY_NOTE).toMatch(/independent copies/i);
  });

  it("non-fiduciary financial disclaimer is present", () => {
    expect(VAULT_NON_FIDUCIARY_DISCLAIMER).toMatch(/GAAP/);
    expect(VAULT_NON_FIDUCIARY_DISCLAIMER).toMatch(/fiduciary/);
    expect(VAULT_NON_FIDUCIARY_DISCLAIMER).toMatch(/valuation/);
  });

  it("redaction warning + owner confirmation copy is present", () => {
    expect(VAULT_REDACTION_WARNING).toMatch(/PHI/);
    expect(VAULT_REDACTION_WARNING).toMatch(/SSN/);
    expect(VAULT_REDACTION_WARNING).toMatch(/Redact/);
    expect(VAULT_REDACTION_CONFIRMATION_LABEL).toMatch(/I confirm/);
    expect(VAULT_REDACTION_CONFIRMATION_LABEL).toMatch(/redacted/i);
  });

  it("MMJ/cannabis note does not drift into general healthcare logic", () => {
    expect(VAULT_CANNABIS_MMJ_NOTE).toMatch(/dispensary/i);
    expect(VAULT_CANNABIS_MMJ_NOTE).not.toMatch(/patient care/i);
    expect(VAULT_CANNABIS_MMJ_NOTE).not.toMatch(/HIPAA/);
  });
});

describe("P67 — Client upload surface adoption", () => {
  const src = read("src/pages/portal/Uploads.tsx");

  it("uses the canonical Evidence Vault name as the page title", () => {
    expect(src).toMatch(/EVIDENCE_VAULT_NAME/);
  });

  it("renders the Operational Readiness principle and vault disclaimers", () => {
    expect(src).toMatch(/OPERATIONAL_READINESS_PRINCIPLE/);
    expect(src).toMatch(/VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER/);
    expect(src).toMatch(/VAULT_DATA_PORTABILITY_NOTE/);
  });

  it("renders the redaction warning and owner confirmation checkbox", () => {
    expect(src).toMatch(/VAULT_REDACTION_WARNING/);
    expect(src).toMatch(/VAULT_REDACTION_CONFIRMATION_LABEL/);
    expect(src).toMatch(/redactionConfirmed/);
    // Upload is gated on the checkbox.
    expect(src).toMatch(/!redactionConfirmed/);
    expect(src).toMatch(/owner_redaction_confirmed/);
  });

  it("does NOT introduce any client-facing self-certification phrasing", () => {
    for (const banned of CLIENT_FORBIDDEN_EVIDENCE_PHRASES) {
      expect(src.toLowerCase()).not.toContain(banned.toLowerCase());
    }
  });

  it("preserves the existing customer_uploads table + client-uploads bucket", () => {
    expect(src).toMatch(/from\("customer_uploads"\)/);
    expect(src).toMatch(/from\("client-uploads"\)/);
  });
});

describe("P67 — Evidence Vault registry safety", () => {
  it("registry text contains no client-facing forbidden phrases", () => {
    const allText = [
      OPERATIONAL_READINESS_PRINCIPLE,
      VAULT_NOT_OFFICIAL_RECORD_DISCLAIMER,
      VAULT_DATA_PORTABILITY_NOTE,
      VAULT_NON_FIDUCIARY_DISCLAIMER,
      VAULT_REDACTION_WARNING,
      VAULT_REDACTION_CONFIRMATION_LABEL,
      VAULT_CANNABIS_MMJ_NOTE,
      ...Object.values(EVIDENCE_SUFFICIENCY_CLIENT_LABEL),
    ]
      .join(" \n ")
      .toLowerCase();
    for (const banned of CLIENT_FORBIDDEN_EVIDENCE_PHRASES) {
      expect(allText).not.toContain(banned.toLowerCase());
    }
  });
});