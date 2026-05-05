/**
 * P66.Naming.1 — Canonical RGS naming registry.
 *
 * Single source of truth for premium, scope-safe names used across the
 * public site, client portal, admin portal, reports, and emails. Display
 * labels live here so individual surfaces stay consistent without
 * destructive route or schema renames.
 *
 * Registered/® marks are aspirational ™ usage — RGS does not claim
 * registered trademark status anywhere in code.
 */
export const RGS_NAMES = {
  parentBrand: "Revenue & Growth Systems LLC",
  parentShort: "RGS",
  positioning: "Business Systems Architecture for Owner-Led Companies",

  framework: "The RGS Stability System™",
  scorecard: "RGS Business Stability Scorecard™",
  scorecardScale: "0–1000 stability score",

  diagnosticOffer: "RGS Business Stress Test™",
  diagnosticReport: "RGS Structural Health Report™",
  repairMap: "RGS Repair Map™",

  os: "RGS Blueprint Engine™",
  monthlyPlatform: "RGS Control System™",
  revenueSubsystem: "Revenue Control System™",
  systemLedger: "RGS System Ledger™",

  evidenceVault: "RGS Evidence Vault™",
  complianceEvidenceVault: "Compliance Evidence Vault™",

  riskMonitor: "Revenue & Risk Monitor™",
  wornToothSignals: "Worn Tooth Signals™",

  costOfFriction: "Cost of Friction Calculator™",
  stabilityToValue: "Stability-to-Value Lens™",

  scopeShield: "Architect’s Shield™",
  scopeAgreement: "Architect’s Shield Scope Agreement",

  adminPortal: "RGS Command Center™",
  clientPortal: "RGS Client Portal",

  aiLayer: "RGS Draft Assist™",
  realityCheckFlags: "Reality Check Flags™",

  implementationOffer: "RGS System Installation™",

  // Five gears (primary labels).
  gears: {
    demand: "Demand Generation",
    revenue: "Revenue Conversion",
    operations: "Operational Efficiency",
    financial: "Financial Visibility",
    owner: "Owner Independence",
  },
  // Optional mechanical nicknames — supporting copy only.
  gearNicknames: {
    demand: "Fuel Intake",
    revenue: "The Spark",
    operations: "Engine Timing",
    financial: "The Gauge Cluster",
    owner: "The Owner Release Test",
  },
} as const;

export type RgsName = keyof typeof RGS_NAMES;

/**
 * Canonical scope-safety lines for cannabis/MMJ Compliance Evidence Vault™.
 * Use exactly when surfacing the vault on cannabis/MMJ surfaces.
 */
export const COMPLIANCE_EVIDENCE_VAULT_DISCLAIMER =
  "The Compliance Evidence Vault is for operational organization, " +
  "documentation readiness, and internal visibility. It is not legal " +
  "advice, compliance certification, privileged legal counsel, tax " +
  "advice, or a guarantee of regulatory compliance. Final responsibility " +
  "remains with the license holder and qualified legal/compliance/CPA " +
  "professionals.";

/**
 * Stability-to-Value Lens™ disclaimer — must accompany any value/ROI framing
 * derived from stability data.
 */
export const STABILITY_TO_VALUE_DISCLAIMER =
  "This is not a business valuation, appraisal, investment opinion, " +
  "lending opinion, tax advice, or financial guarantee. It is a strategic " +
  "lens showing how operational stability may affect perceived business " +
  "quality.";
