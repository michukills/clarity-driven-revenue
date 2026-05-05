/**
 * P69 — Architect's Shield™ canonical scope agreement registry.
 *
 * Single source of truth for the Architect's Shield™ language used in
 * the public site, client portal, admin portal, reports, and PDFs.
 *
 * This module ONLY exports static config + agreement metadata. Acceptance
 * persistence lives in `src/lib/legal/clientAcknowledgments.ts` and the
 * `client_acknowledgments` table.
 *
 * Naming reuses the P66 RGS_NAMES registry. Acceptance vocabulary reuses
 * the P67/P67B Evidence Vault registry where it overlaps so we do not
 * create a parallel disclaimer system.
 */
import { RGS_NAMES } from "./rgsNaming";

/* ------------------------------------------------------------------ */
/* Agreement keys + versions                                           */
/* ------------------------------------------------------------------ */

export const ARCHITECTS_SHIELD_NAME = RGS_NAMES.scopeAgreement; // "Architect's Shield Scope Agreement"
export const ARCHITECTS_SHIELD_SHORT = RGS_NAMES.scopeShield;   // "Architect's Shield™"

export const AGREEMENT_KEYS = [
  "architects_shield_scope_agreement",
  "evidence_vault_redaction_notice",
  "regulated_industry_operational_readiness_notice",
  "ai_assist_disclosure",
  "report_scope_disclaimer",
  "implementation_scope_boundary",
  "rgs_control_system_scope_boundary",
  "nda_confidentiality_acknowledgment",
] as const;
export type AgreementKey = (typeof AGREEMENT_KEYS)[number];

export const ACCEPTANCE_CONTEXTS = [
  "diagnostic_access",
  "evidence_upload",
  "report_view",
  "repair_map_view",
  "implementation",
  "rgs_control_system",
  "regulated_industry_notice",
  "ai_assist_notice",
  "portal_first_login",
] as const;
export type AcceptanceContext = (typeof ACCEPTANCE_CONTEXTS)[number];

/** Bump these versions when the underlying clause text changes. */
export const ARCHITECTS_SHIELD_VERSION = "2026.05.1";
export const REPORT_SCOPE_DISCLAIMER_VERSION = "2026.05.1";
export const NDA_CONFIDENTIALITY_VERSION = "2026.05.1";
export const AI_ASSIST_DISCLOSURE_VERSION = "2026.05.1";
export const REGULATED_INDUSTRY_NOTICE_VERSION = "2026.05.1";

/* ------------------------------------------------------------------ */
/* Core Architect's Shield™ statement                                  */
/* ------------------------------------------------------------------ */

export const ARCHITECTS_SHIELD_CORE_STATEMENT =
  `${RGS_NAMES.parentBrand} is a Business Systems Architect. RGS ` +
  "diagnoses, designs, maps, and teaches. RGS does not operate the " +
  "client's business. The client remains responsible for business " +
  "decisions, implementation decisions, compliance decisions, legal " +
  "decisions, accounting and tax decisions, financial decisions, " +
  "employee decisions, and business outcomes.";

export const ARCHITECTS_SHIELD_BOUNDARIES: ReadonlyArray<string> = [
  "RGS does not manage client operations.",
  "RGS does not provide unlimited implementation.",
  "RGS does not provide emergency support unless separately contracted.",
  "RGS does not guarantee revenue growth.",
  "RGS does not guarantee cost savings.",
  "RGS does not guarantee compliance.",
  "RGS does not provide legal advice.",
  "RGS does not provide tax advice.",
  "RGS does not provide accounting advice.",
  "RGS does not provide investment advice.",
  "RGS does not provide fiduciary advice.",
  "RGS does not provide lending advice.",
  "RGS does not provide valuation or appraisal opinions.",
  "RGS does not provide healthcare privacy advice.",
  "RGS does not certify cannabis or MMJ compliance.",
  "RGS does not act as official record keeper.",
  "RGS does not provide professional or regulatory assurance.",
];

/* ------------------------------------------------------------------ */
/* Power Clauses                                                       */
/* ------------------------------------------------------------------ */

export const INDEPENDENT_PROFESSIONAL_CLAUSE =
  "User acknowledges that RGS findings, reports, scorecards, evidence " +
  "reviews, system recommendations, Reality Check Flags™, Repair Maps, " +
  "Structural Health Reports, and related materials do not replace the " +
  "need for specialized legal, tax, accounting, financial, valuation, " +
  "healthcare privacy, cannabis compliance, or regulatory counsel. " +
  "User agrees to submit RGS Structural Health Reports™, RGS Repair " +
  "Maps™, Evidence Vault™ materials, and any regulated-area " +
  "recommendations to their own licensed professionals before taking " +
  "action in regulated areas.";

export const REGULATORY_ASSURANCE_DISCLOSURE =
  "RGS is a technology platform and business architecture firm. RGS " +
  "does not possess or claim to possess the professional licenses, " +
  "regulatory authority, fiduciary status, legal authority, accounting " +
  "certification, valuation credential, or jurisdiction-specific " +
  "approvals required to provide legal, financial, tax, accounting, " +
  "compliance, investment, lending, valuation, healthcare privacy, " +
  "cannabis compliance, or regulatory assurance in any jurisdiction.";

export const REALITY_CHECK_FLAGS_LOGIC_DISCLAIMER =
  "Reality Check Flags™ are based on internal RGS heuristics, " +
  "deterministic scoring rules, evidence gaps, operational benchmarks, " +
  "and business-architecture logic. They are intended to identify " +
  "operational inconsistencies, missing evidence, risk indicators, and " +
  "areas requiring review. They are not legal determinations of fact, " +
  "compliance findings, audit opinions, accounting conclusions, " +
  "fiduciary advice, investment advice, tax advice, healthcare privacy " +
  "opinions, or regulatory rulings.";

/* ------------------------------------------------------------------ */
/* Operational Readiness, Not Regulatory Assurance (ORNRA)             */
/* ------------------------------------------------------------------ */

export const OPERATIONAL_READINESS_PRINCIPLE_LABEL =
  "Operational Readiness, Not Regulatory Assurance";

export const OPERATIONAL_READINESS_PRINCIPLE_BODY =
  "RGS helps assess and organize operational readiness, documentation " +
  "quality, evidence gaps, system maturity, and business stability. " +
  "RGS does not provide legal, tax, accounting, fiduciary, valuation, " +
  "healthcare privacy, cannabis compliance, or regulatory assurance. " +
  "RGS findings are business-operations observations and should be " +
  "reviewed by qualified professionals before being used for regulated, " +
  "legal, financial, tax, compliance, lending, investment, valuation, " +
  "or third-party reliance decisions.";

export const OPERATIONAL_READINESS_PLAIN_ENGLISH =
  "RGS can help you see whether your business systems and documentation " +
  "appear organized, complete, and review-ready. RGS does not decide " +
  "whether your business is legally compliant, financially audit-ready, " +
  "regulatory-safe, or protected from enforcement, penalties, disputes, " +
  "or third-party reliance.";

/* ------------------------------------------------------------------ */
/* Cannabis / MMJ chain of custody + portability                       */
/* ------------------------------------------------------------------ */

export const CANNABIS_RECORDKEEPER_DISCLAIMER =
  `The ${RGS_NAMES.evidenceVault} and ${RGS_NAMES.complianceEvidenceVault} ` +
  "are temporary repositories for diagnostic, audit-support, review, " +
  "organization, and operational visibility purposes. RGS is not the " +
  "client's official compliance record keeper, state-law record " +
  "custodian, seed-to-sale system of record, inventory compliance " +
  "officer, or regulatory reporting system. Client remains responsible " +
  "for maintaining all required records in the systems, formats, " +
  "timelines, and locations required by applicable law, regulators, " +
  "license authorities, tax authorities, and professional advisors.";

export const DATA_PORTABILITY_OBLIGATION =
  "Client is responsible for maintaining independent copies of all " +
  "uploaded materials, required compliance records, financial records, " +
  "tax records, licensing records, employee records, operational " +
  `records, and supporting documentation outside the RGS platform. The ` +
  `${RGS_NAMES.evidenceVault} may assist with organization and review ` +
  "but does not replace client's official systems of record or legal " +
  "record retention obligations.";

/* ------------------------------------------------------------------ */
/* Non-GAAP / non-fiduciary                                            */
/* ------------------------------------------------------------------ */

export const NON_GAAP_NON_FIDUCIARY_CLAUSE =
  "RGS does not perform audits under GAAP or any other formal " +
  "accounting standard. RGS does not prepare certified financial " +
  "statements, provide fiduciary services, provide investment advice, " +
  "issue lending opinions, prepare tax filings, or provide valuation " +
  `opinions. The ${RGS_NAMES.systemLedger}, Financial Visibility Gear, ` +
  `${RGS_NAMES.stabilityToValue}, and related tools are operational ` +
  "visibility tools only and are not financial statements or " +
  "third-party reliance materials.";

/* ------------------------------------------------------------------ */
/* Third-party reliance                                                */
/* ------------------------------------------------------------------ */

export const THIRD_PARTY_RELIANCE_DISCLAIMER =
  "No buyer, investor, lender, insurer, regulator, agency, partner, or " +
  `other third party may rely on an ${RGS_NAMES.scorecard}, ` +
  `${RGS_NAMES.diagnosticReport}, ${RGS_NAMES.repairMap}, ` +
  `${RGS_NAMES.stabilityToValue}, ${RGS_NAMES.systemLedger}, ` +
  `${RGS_NAMES.evidenceVault} materials, or related RGS outputs as a ` +
  "substitute for their own independent due diligence, professional " +
  "review, legal review, accounting review, compliance review, " +
  "underwriting, appraisal, valuation, audit, or inspection.";

/* ------------------------------------------------------------------ */
/* Redaction / PII / PHI                                               */
/* ------------------------------------------------------------------ */

export const REDACTION_RESPONSIBILITY_CLAUSE =
  "Client agrees not to upload unredacted sensitive personal " +
  "information, protected health information, social security numbers, " +
  "full customer or patient lists, payment card data, bank account " +
  "information, tax IDs, employee sensitive records, or legally " +
  "restricted information unless specifically requested by RGS in " +
  "writing and supported by appropriate safeguards. Client is " +
  "responsible for redacting sensitive data before upload.";

/* ------------------------------------------------------------------ */
/* Confidentiality / NDA / proprietary materials                       */
/* ------------------------------------------------------------------ */

export const NDA_CONFIDENTIALITY_CLAUSE =
  "Client acknowledges that RGS tools, frameworks, scorecards, reports, " +
  "score logic, diagnostic questions, portal workflows, templates, " +
  "playbooks, prompts, operating system structures, Industry Brain " +
  "content, AI-assist workflows, and related methods are proprietary " +
  "and confidential to RGS unless expressly marked public. Client " +
  "agrees not to copy, resell, license, publish, reverse engineer, " +
  "distribute, or use RGS proprietary materials to create a competing " +
  "system or service without written permission.";

/* ------------------------------------------------------------------ */
/* Service-specific scope boundaries                                   */
/* ------------------------------------------------------------------ */

export const DIAGNOSTIC_SCOPE_BOUNDARY = [
  "One-time diagnostic engagement.",
  "Implementation is not included unless separately contracted.",
  "Ongoing support is not included unless separately contracted.",
  "Report walkthroughs may be bounded to a defined session length.",
  "No guarantee of revenue, cost, or operational results.",
  "Owner remains responsible for decisions and actions taken on findings.",
] as const;

export const IMPLEMENTATION_SCOPE_BOUNDARY = [
  "Project-based support to install systems identified in the Repair Map.",
  "Does not mean indefinite execution or ongoing operations.",
  "Does not make RGS the operator of the client's business.",
  "No unlimited support is included.",
  "Changes outside the agreed scope may require a new agreement.",
  "Client remains responsible for adoption, use, and outcomes.",
] as const;

export const RGS_CONTROL_SYSTEM_SCOPE_BOUNDARY = [
  "Ongoing visibility and guided independence.",
  "Not unlimited implementation.",
  "Not emergency management.",
  "Not done-for-you operations.",
  "Not legal, tax, accounting, or compliance review.",
  "Bounded monthly visibility and advisory interpretation.",
] as const;

export const EVIDENCE_VAULT_SCOPE_BOUNDARY = [
  "Organization and operational visibility only.",
  "Not official recordkeeping.",
  "Not legal privilege.",
  "Not certification of compliance, audit, or regulatory readiness.",
  "Not a substitute for the client's official systems of record.",
  "Client must maintain independent copies of all required records.",
] as const;

export const AI_ASSIST_SCOPE_BOUNDARY = [
  `${RGS_NAMES.aiLayer} may draft, summarize, organize, or suggest language.`,
  "AI does not score, certify, approve, publish, or make final determinations.",
  "AI is not legal, tax, accounting, compliance, or professional advice.",
  "Reviewer review remains required where applicable before client delivery.",
] as const;

/* ------------------------------------------------------------------ */
/* Forbidden client-facing phrases (P69 list)                          */
/* ------------------------------------------------------------------ */

export const ARCHITECTS_SHIELD_FORBIDDEN_PHRASES = [
  "compliance certified",
  "legally compliant",
  "gaap audited",
  "fiduciary approved",
  "safe harbor guaranteed",
  "audit guaranteed",
  "regulatory approved",
  "lender ready",
  "valuation ready",
  "guaranteed compliance",
  "guaranteed revenue",
  "legal determination",
  "compliance determination",
  "certified valuation",
  "guaranteed business value",
  "rgs will run your business",
  "rgs manages everything",
  "unlimited support included",
  "guaranteed outcome",
  "official compliance record keeper",
  "regulatory assurance provider",
] as const;

export function findForbiddenShieldPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  for (const p of ARCHITECTS_SHIELD_FORBIDDEN_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Agreement metadata registry                                         */
/* ------------------------------------------------------------------ */

export interface AgreementDefinition {
  key: AgreementKey;
  name: string;
  version: string;
  summary: string;
  body: string[];
  /** Contexts where this agreement should be presented for acceptance. */
  contexts: AcceptanceContext[];
  /** Stage gating where acceptance should be required before access. */
  requiredFor: AcceptanceContext[];
}

export const AGREEMENT_REGISTRY: Record<AgreementKey, AgreementDefinition> = {
  architects_shield_scope_agreement: {
    key: "architects_shield_scope_agreement",
    name: ARCHITECTS_SHIELD_NAME,
    version: ARCHITECTS_SHIELD_VERSION,
    summary:
      "RGS is a Business Systems Architect — not your operator, attorney, " +
      "CPA, fiduciary, lender, appraiser, or regulator. You stay in charge " +
      "of business decisions and outcomes.",
    body: [
      ARCHITECTS_SHIELD_CORE_STATEMENT,
      ...ARCHITECTS_SHIELD_BOUNDARIES,
      INDEPENDENT_PROFESSIONAL_CLAUSE,
      REGULATORY_ASSURANCE_DISCLOSURE,
      THIRD_PARTY_RELIANCE_DISCLAIMER,
      NON_GAAP_NON_FIDUCIARY_CLAUSE,
    ],
    contexts: ["portal_first_login", "diagnostic_access", "report_view"],
    requiredFor: ["report_view", "repair_map_view"],
  },
  evidence_vault_redaction_notice: {
    key: "evidence_vault_redaction_notice",
    name: `${RGS_NAMES.evidenceVault} — Redaction & Recordkeeping Notice`,
    version: ARCHITECTS_SHIELD_VERSION,
    summary:
      "Redact sensitive information before upload. The Evidence Vault is " +
      "an organizing tool, not your official system of record.",
    body: [
      REDACTION_RESPONSIBILITY_CLAUSE,
      CANNABIS_RECORDKEEPER_DISCLAIMER,
      DATA_PORTABILITY_OBLIGATION,
    ],
    contexts: ["evidence_upload"],
    requiredFor: [],
  },
  regulated_industry_operational_readiness_notice: {
    key: "regulated_industry_operational_readiness_notice",
    name: "Operational Readiness, Not Regulatory Assurance — Notice",
    version: REGULATED_INDUSTRY_NOTICE_VERSION,
    summary:
      "For regulated industries, RGS reflects operational readiness only. " +
      "Qualified professionals must review before regulated decisions.",
    body: [
      OPERATIONAL_READINESS_PRINCIPLE_BODY,
      OPERATIONAL_READINESS_PLAIN_ENGLISH,
      INDEPENDENT_PROFESSIONAL_CLAUSE,
    ],
    contexts: ["regulated_industry_notice", "evidence_upload", "report_view"],
    requiredFor: [],
  },
  ai_assist_disclosure: {
    key: "ai_assist_disclosure",
    name: `${RGS_NAMES.aiLayer} — AI Assist Disclosure`,
    version: AI_ASSIST_DISCLOSURE_VERSION,
    summary:
      "AI may help draft and organize content. RGS reviews AI-assisted " +
      "output before client delivery; AI is not professional advice.",
    body: [...AI_ASSIST_SCOPE_BOUNDARY],
    contexts: ["ai_assist_notice"],
    requiredFor: [],
  },
  report_scope_disclaimer: {
    key: "report_scope_disclaimer",
    name: `${RGS_NAMES.diagnosticReport} — Scope Disclaimer`,
    version: REPORT_SCOPE_DISCLAIMER_VERSION,
    summary:
      "The report reflects current evidence. It is not a guarantee of " +
      "compliance, revenue, valuation, or third-party reliance.",
    body: [
      ARCHITECTS_SHIELD_CORE_STATEMENT,
      THIRD_PARTY_RELIANCE_DISCLAIMER,
      REALITY_CHECK_FLAGS_LOGIC_DISCLAIMER,
    ],
    contexts: ["report_view", "repair_map_view"],
    requiredFor: [],
  },
  implementation_scope_boundary: {
    key: "implementation_scope_boundary",
    name: `${RGS_NAMES.implementationOffer} — Scope Boundary`,
    version: ARCHITECTS_SHIELD_VERSION,
    summary:
      "Implementation is project-based and bounded — RGS installs, but " +
      "the client owns adoption and outcomes.",
    body: [...IMPLEMENTATION_SCOPE_BOUNDARY],
    contexts: ["implementation"],
    requiredFor: [],
  },
  rgs_control_system_scope_boundary: {
    key: "rgs_control_system_scope_boundary",
    name: `${RGS_NAMES.monthlyPlatform} — Scope Boundary`,
    version: ARCHITECTS_SHIELD_VERSION,
    summary:
      "Ongoing visibility and guided independence. Not unlimited " +
      "implementation, emergency management, or done-for-you operations.",
    body: [...RGS_CONTROL_SYSTEM_SCOPE_BOUNDARY],
    contexts: ["rgs_control_system"],
    requiredFor: [],
  },
  nda_confidentiality_acknowledgment: {
    key: "nda_confidentiality_acknowledgment",
    name: "RGS Confidentiality & Proprietary Materials Acknowledgment",
    version: NDA_CONFIDENTIALITY_VERSION,
    summary:
      "RGS proprietary materials are confidential. Do not copy, resell, " +
      "or use them to create a competing system without written permission.",
    body: [NDA_CONFIDENTIALITY_CLAUSE],
    contexts: ["portal_first_login", "report_view"],
    requiredFor: [],
  },
};

export const REQUIRED_AGREEMENTS_FOR_REPORT_ACCESS: AgreementKey[] = [
  "architects_shield_scope_agreement",
];

/**
 * Concise scope-safe lines suitable for inclusion in PDF reports.
 * Kept short to avoid making the report unreadable.
 */
export const REPORT_PDF_SCOPE_BULLETS: ReadonlyArray<string> = [
  `${RGS_NAMES.parentShort} is a Business Systems Architect — not your operator, attorney, CPA, fiduciary, lender, appraiser, or regulator.`,
  "Client remains responsible for actions and outcomes.",
  "Regulated areas (legal, tax, accounting, compliance, healthcare privacy, cannabis) require qualified professional review.",
  "No third-party reliance is granted to buyers, investors, lenders, insurers, or regulators.",
  `${RGS_NAMES.evidenceVault} is an organizing tool, not official recordkeeping.`,
  `${RGS_NAMES.aiLayer}, where used, is reviewed by an RGS reviewer before client delivery.`,
];
