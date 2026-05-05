/**
 * P69 — Architect's Shield™ Scope Agreement + Client Responsibility
 * hardening contract test.
 *
 * Pins:
 *  - Canonical clauses + ORNRA principle
 *  - Power clauses (Independent Professional, Regulatory Assurance, Logic)
 *  - Cannabis recordkeeper / data portability / non-GAAP / 3rd-party reliance
 *  - NDA/confidentiality clause
 *  - Forbidden client-facing phrases
 *  - Click-wrap component + admin status panel exist
 *  - Report view consumes scope language and gates on Architect's Shield™
 *  - Acknowledgment service module shape
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARCHITECTS_SHIELD_NAME,
  ARCHITECTS_SHIELD_CORE_STATEMENT,
  ARCHITECTS_SHIELD_BOUNDARIES,
  INDEPENDENT_PROFESSIONAL_CLAUSE,
  REGULATORY_ASSURANCE_DISCLOSURE,
  REALITY_CHECK_FLAGS_LOGIC_DISCLAIMER,
  OPERATIONAL_READINESS_PRINCIPLE_LABEL,
  OPERATIONAL_READINESS_PRINCIPLE_BODY,
  OPERATIONAL_READINESS_PLAIN_ENGLISH,
  CANNABIS_RECORDKEEPER_DISCLAIMER,
  DATA_PORTABILITY_OBLIGATION,
  NON_GAAP_NON_FIDUCIARY_CLAUSE,
  THIRD_PARTY_RELIANCE_DISCLAIMER,
  REDACTION_RESPONSIBILITY_CLAUSE,
  NDA_CONFIDENTIALITY_CLAUSE,
  ARCHITECTS_SHIELD_FORBIDDEN_PHRASES,
  AGREEMENT_REGISTRY,
  AGREEMENT_KEYS,
  REQUIRED_AGREEMENTS_FOR_REPORT_ACCESS,
  REPORT_PDF_SCOPE_BULLETS,
  findForbiddenShieldPhrase,
} from "@/config/architectsShield";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("P69 — Architect's Shield™ canonical clauses", () => {
  it("uses the canonical Architect's Shield Scope Agreement name", () => {
    expect(ARCHITECTS_SHIELD_NAME).toMatch(/Architect.s Shield/);
  });

  it("core statement asserts Business Systems Architect and client responsibility", () => {
    expect(ARCHITECTS_SHIELD_CORE_STATEMENT).toMatch(/Business Systems Architect/);
    expect(ARCHITECTS_SHIELD_CORE_STATEMENT).toMatch(/does not operate/);
    expect(ARCHITECTS_SHIELD_CORE_STATEMENT).toMatch(/client remains responsible/i);
  });

  it("boundaries cover all required RGS scope exclusions", () => {
    const joined = ARCHITECTS_SHIELD_BOUNDARIES.join(" ").toLowerCase();
    for (const phrase of [
      "legal advice",
      "tax advice",
      "accounting advice",
      "fiduciary",
      "lending",
      "valuation",
      "healthcare privacy",
      "cannabis",
      "official record keeper",
      "regulatory assurance",
      "guarantee revenue",
      "guarantee compliance",
    ]) {
      expect(joined).toContain(phrase);
    }
  });

  it("Independent Professional Clause names regulated review channels", () => {
    expect(INDEPENDENT_PROFESSIONAL_CLAUSE).toMatch(/licensed professionals/i);
    expect(INDEPENDENT_PROFESSIONAL_CLAUSE).toMatch(/legal/);
    expect(INDEPENDENT_PROFESSIONAL_CLAUSE).toMatch(/tax/);
    expect(INDEPENDENT_PROFESSIONAL_CLAUSE).toMatch(/accounting/);
  });

  it("Regulatory Assurance Disclosure denies licenses/credentials", () => {
    expect(REGULATORY_ASSURANCE_DISCLOSURE).toMatch(/does not possess/i);
    expect(REGULATORY_ASSURANCE_DISCLOSURE).toMatch(/professional licenses/i);
  });

  it("Reality Check Flags logic disclaimer denies legal/regulatory determinations", () => {
    expect(REALITY_CHECK_FLAGS_LOGIC_DISCLAIMER).toMatch(/heuristics/i);
    expect(REALITY_CHECK_FLAGS_LOGIC_DISCLAIMER).toMatch(/not legal determinations/i);
  });
});

describe("P69 — Operational Readiness, Not Regulatory Assurance", () => {
  it("uses ORNRA label and avoids client-facing 'Mirror, Not the Map'", () => {
    expect(OPERATIONAL_READINESS_PRINCIPLE_LABEL).toBe(
      "Operational Readiness, Not Regulatory Assurance",
    );
    expect(OPERATIONAL_READINESS_PRINCIPLE_BODY).not.toMatch(/mirror, not the map/i);
    expect(OPERATIONAL_READINESS_PLAIN_ENGLISH).toMatch(/legally compliant/);
  });
});

describe("P69 — Regulated industry / financial / third-party reliance", () => {
  it("Cannabis recordkeeper disclaimer covers required exclusions", () => {
    expect(CANNABIS_RECORDKEEPER_DISCLAIMER).toMatch(/not the client's official compliance record keeper/i);
    expect(CANNABIS_RECORDKEEPER_DISCLAIMER).toMatch(/seed-to-sale/);
  });
  it("Data portability obligation requires independent client copies", () => {
    expect(DATA_PORTABILITY_OBLIGATION).toMatch(/independent copies/i);
  });
  it("Non-GAAP non-fiduciary clause denies audits and investment advice", () => {
    expect(NON_GAAP_NON_FIDUCIARY_CLAUSE).toMatch(/GAAP/);
    expect(NON_GAAP_NON_FIDUCIARY_CLAUSE).toMatch(/fiduciary/);
  });
  it("Third-party reliance disclaimer enumerates buyers, lenders, regulators", () => {
    expect(THIRD_PARTY_RELIANCE_DISCLAIMER).toMatch(/buyer/);
    expect(THIRD_PARTY_RELIANCE_DISCLAIMER).toMatch(/lender/);
    expect(THIRD_PARTY_RELIANCE_DISCLAIMER).toMatch(/regulator/);
    expect(THIRD_PARTY_RELIANCE_DISCLAIMER).toMatch(/independent due diligence/i);
  });
  it("Redaction responsibility clause requires owner action before upload", () => {
    expect(REDACTION_RESPONSIBILITY_CLAUSE).toMatch(/redacting sensitive data/i);
  });
  it("NDA confidentiality clause protects proprietary RGS materials", () => {
    expect(NDA_CONFIDENTIALITY_CLAUSE).toMatch(/proprietary and confidential/i);
    expect(NDA_CONFIDENTIALITY_CLAUSE).toMatch(/competing system/i);
  });
});

describe("P69 — Forbidden client-facing language", () => {
  it("forbidden list includes the P69 must-block phrases", () => {
    for (const phrase of [
      "guaranteed compliance",
      "guaranteed revenue",
      "compliance certified",
      "official compliance record keeper",
      "regulatory assurance provider",
      "rgs will run your business",
      "unlimited support included",
    ]) {
      expect(ARCHITECTS_SHIELD_FORBIDDEN_PHRASES).toContain(phrase);
    }
  });
  it("findForbiddenShieldPhrase catches forbidden text", () => {
    expect(findForbiddenShieldPhrase("Includes guaranteed compliance.")).toBe(
      "guaranteed compliance",
    );
    expect(findForbiddenShieldPhrase("Operational readiness review only.")).toBeNull();
  });
  it("canonical clause bodies do NOT contain forbidden phrases (positive-claim test)", () => {
    // Note: the Reality Check Flags Logic Disclaimer and Independent
    // Professional Clause intentionally NEGATE phrases like "legal
    // determinations" — they should not be scanned by the positive-claim
    // forbidden-phrase guard.
    for (const body of [
      ARCHITECTS_SHIELD_CORE_STATEMENT,
      REGULATORY_ASSURANCE_DISCLOSURE,
      OPERATIONAL_READINESS_PRINCIPLE_BODY,
      OPERATIONAL_READINESS_PLAIN_ENGLISH,
      CANNABIS_RECORDKEEPER_DISCLAIMER,
      DATA_PORTABILITY_OBLIGATION,
      NON_GAAP_NON_FIDUCIARY_CLAUSE,
      THIRD_PARTY_RELIANCE_DISCLAIMER,
      REDACTION_RESPONSIBILITY_CLAUSE,
      NDA_CONFIDENTIALITY_CLAUSE,
    ]) {
      expect(findForbiddenShieldPhrase(body)).toBeNull();
    }
    for (const bullet of REPORT_PDF_SCOPE_BULLETS) {
      expect(findForbiddenShieldPhrase(bullet)).toBeNull();
    }
  });
});

describe("P69 — Agreement registry + gating", () => {
  it("registers all required agreement keys", () => {
    for (const key of [
      "architects_shield_scope_agreement",
      "evidence_vault_redaction_notice",
      "regulated_industry_operational_readiness_notice",
      "ai_assist_disclosure",
      "report_scope_disclaimer",
      "implementation_scope_boundary",
      "rgs_control_system_scope_boundary",
      "nda_confidentiality_acknowledgment",
    ] as const) {
      expect(AGREEMENT_KEYS).toContain(key);
      const def = AGREEMENT_REGISTRY[key];
      expect(def.name).toBeTruthy();
      expect(def.version).toMatch(/\d{4}\.\d{2}\.\d+/);
      expect(def.body.length).toBeGreaterThan(0);
    }
  });
  it("Architect's Shield is required for report and Repair Map access", () => {
    expect(REQUIRED_AGREEMENTS_FOR_REPORT_ACCESS).toContain(
      "architects_shield_scope_agreement",
    );
    const def = AGREEMENT_REGISTRY.architects_shield_scope_agreement;
    expect(def.requiredFor).toContain("report_view");
    expect(def.requiredFor).toContain("repair_map_view");
  });
});

describe("P69 — UI integration", () => {
  it("client report view gates on Architect's Shield™ and renders scope bullets", () => {
    const src = read("src/pages/portal/ReportView.tsx");
    expect(src).toMatch(/ArchitectsShieldAcceptance/);
    expect(src).toMatch(/architects_shield_scope_agreement/);
    expect(src).toMatch(/REPORT_PDF_SCOPE_BULLETS/);
    expect(src).toMatch(/CLIENT_SAFE_REPORT_SELECT/); // P34/P68B not regressed
  });

  it("admin CustomerDetail mounts the Architect's Shield status panel", () => {
    const src = read("src/pages/admin/CustomerDetail.tsx");
    expect(src).toMatch(/ArchitectsShieldStatusPanel/);
  });

  it("click-wrap component persists acceptance via the service module", () => {
    const src = read("src/components/legal/ArchitectsShieldAcceptance.tsx");
    expect(src).toMatch(/recordAcknowledgment/);
    expect(src).toMatch(/getLatestAcknowledgment/);
    expect(src).toMatch(/AGREEMENT_REGISTRY/);
  });

  it("acknowledgment service uses the client_acknowledgments table", () => {
    const src = read("src/lib/legal/clientAcknowledgments.ts");
    expect(src).toMatch(/client_acknowledgments/);
    expect(src).toMatch(/recordAcknowledgment/);
    expect(src).toMatch(/listAcknowledgmentsForCustomer/);
    expect(src).toMatch(/isAcknowledgmentCurrent/);
  });
});

describe("P69 — does not regress existing safety tests", () => {
  it("legal-scope contract still ships", () => {
    const src = read("src/lib/__tests__/legalScopeLanguageContract.test.ts");
    expect(src.length).toBeGreaterThan(0);
  });
  it("Evidence Vault P67/P67B tests still ship", () => {
    const a = read("src/lib/__tests__/p67EvidenceVaultHardening.test.ts");
    const b = read("src/lib/__tests__/p67BEvidenceVaultFunctionalCompletion.test.ts");
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
  it("Structural Health Report P68/P68B tests still ship", () => {
    const a = read("src/lib/__tests__/p68StructuralHealthReportHardening.test.ts");
    const b = read("src/lib/__tests__/p68BRepairMapEvidenceCompletion.test.ts");
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
  });
});