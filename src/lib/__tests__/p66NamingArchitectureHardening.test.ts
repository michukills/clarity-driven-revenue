/**
 * P66 — Naming Architecture Hardening regression contract.
 *
 * Pins the canonical premium / scope-safe names and verifies that the
 * highest-visibility public surfaces use them. We deliberately do NOT
 * touch Supabase tables, route paths, or scoring logic — only display
 * labels and supporting copy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  RGS_NAMES,
  COMPLIANCE_EVIDENCE_VAULT_DISCLAIMER,
  STABILITY_TO_VALUE_DISCLAIMER,
} from "@/config/rgsNaming";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("P66 — Canonical RGS naming registry", () => {
  it("exposes the hardened public-facing names", () => {
    expect(RGS_NAMES.parentBrand).toBe("Revenue & Growth Systems LLC");
    expect(RGS_NAMES.framework).toBe("The RGS Stability System™");
    expect(RGS_NAMES.scorecard).toBe("RGS Business Stability Scorecard™");
    expect(RGS_NAMES.diagnosticOffer).toBe("RGS Business Stress Test™");
    expect(RGS_NAMES.diagnosticReport).toBe("RGS Structural Health Report™");
    expect(RGS_NAMES.repairMap).toBe("RGS Repair Map™");
    expect(RGS_NAMES.os).toBe("RGS Blueprint Engine™");
    expect(RGS_NAMES.monthlyPlatform).toBe("RGS Control System™");
    expect(RGS_NAMES.revenueSubsystem).toBe("Revenue Control System™");
    expect(RGS_NAMES.systemLedger).toBe("RGS System Ledger™");
    expect(RGS_NAMES.evidenceVault).toBe("RGS Evidence Vault™");
    expect(RGS_NAMES.complianceEvidenceVault).toBe(
      "Compliance Evidence Vault™",
    );
    expect(RGS_NAMES.riskMonitor).toBe("Revenue & Risk Monitor™");
    expect(RGS_NAMES.wornToothSignals).toBe("Worn Tooth Signals™");
    expect(RGS_NAMES.costOfFriction).toBe("Cost of Friction Calculator™");
    expect(RGS_NAMES.stabilityToValue).toBe("Stability-to-Value Lens™");
    expect(RGS_NAMES.adminPortal).toBe("RGS Command Center™");
    expect(RGS_NAMES.aiLayer).toBe("RGS Draft Assist™");
    expect(RGS_NAMES.realityCheckFlags).toBe("Reality Check Flags™");
    expect(RGS_NAMES.implementationOffer).toBe("RGS System Installation™");
  });

  it("preserves the five canonical gear labels", () => {
    expect(Object.values(RGS_NAMES.gears)).toEqual([
      "Demand Generation",
      "Revenue Conversion",
      "Operational Efficiency",
      "Financial Visibility",
      "Owner Independence",
    ]);
  });

  it("Compliance Evidence Vault™ disclaimer is scope-safe", () => {
    const d = COMPLIANCE_EVIDENCE_VAULT_DISCLAIMER;
    expect(d).toMatch(/operational organization/);
    expect(d).toMatch(/not legal advice/);
    expect(d).toMatch(/not.*compliance certification/);
    expect(d).toMatch(/license holder/);
  });

  it("Stability-to-Value Lens™ disclaimer disclaims valuation/financial advice", () => {
    const d = STABILITY_TO_VALUE_DISCLAIMER;
    expect(d).toMatch(/not a business valuation/);
    expect(d).toMatch(/not.*tax advice/);
    expect(d).toMatch(/not.*financial guarantee/);
  });
});

describe("P66 — Public surface adoption", () => {
  it("DiagnosticOffer page surfaces the hardened diagnostic + report + repair map names", () => {
    const src = read("src/pages/DiagnosticOffer.tsx");
    expect(src).toMatch(/RGS_NAMES\.diagnosticOffer/);
    expect(src).toMatch(/diagnosticReport/);
    expect(src).toMatch(/repairMap/);
    // Old generic phrasing should be gone from this page.
    expect(src).not.toMatch(/Structured diagnostic report \(PDF-style deliverable\)$/m);
  });

  it("Scorecard finalizer mentions Structural Health Report™ + Repair Map™", () => {
    const src = read("src/pages/diagnostic/StabilityScorecardTool.tsx");
    expect(src).toMatch(/RGS Structural Health Report™/);
    expect(src).toMatch(/RGS Repair Map™/);
  });

  it("Index step copy references the hardened report + repair map names", () => {
    const src = read("src/pages/Index.tsx");
    expect(src).toMatch(/RGS Structural Health Report™/);
    expect(src).toMatch(/RGS Repair Map™/);
  });
});

describe("P66 — Scope safety guardrails (must never appear in public copy)", () => {
  const PUBLIC_FILES = [
    "src/pages/DiagnosticOffer.tsx",
    "src/pages/Index.tsx",
    "src/pages/diagnostic/StabilityScorecardTool.tsx",
  ];
  const FORBIDDEN: { name: string; rx: RegExp }[] = [
    { name: "guaranteed revenue claim", rx: /guaranteed (revenue|growth|results|outcome|compliance)/i },
    { name: "done-for-you operator claim", rx: /done[- ]for[- ]you/i },
    { name: "we manage everything", rx: /we manage everything/i },
  ];
  for (const file of PUBLIC_FILES) {
    for (const f of FORBIDDEN) {
      it(`${file} does not contain ${f.name}`, () => {
        const src = read(file);
        expect(src).not.toMatch(f.rx);
      });
    }
  }
});