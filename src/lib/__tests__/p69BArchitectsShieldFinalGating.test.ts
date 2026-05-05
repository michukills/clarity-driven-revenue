/**
 * P69B — Architect's Shield™ final gating + ORNRA language repair pass.
 *
 * Pins:
 *  - "Mirror, Not the Map" no longer appears in any client-facing
 *    Structural Health Report section, Repair Map view, Evidence Vault
 *    upload surface, or admin-approved client-visible review surface.
 *  - Operational Readiness, Not Regulatory Assurance is the canonical
 *    label/key/body for the corresponding report section.
 *  - Repair Map client view is gated on Architect's Shield™ acceptance
 *    (matching the registry's `requiredFor: repair_map_view`).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildStructuralHealthReportSections,
  OPERATIONAL_READINESS_REPORT_BODY,
  SECTION_KEY_OPERATIONAL_READINESS,
} from "@/lib/reports/structuralHealthReport";
import {
  AGREEMENT_REGISTRY,
  OPERATIONAL_READINESS_PRINCIPLE_LABEL,
} from "@/config/architectsShield";
import { OPERATIONAL_READINESS_PRINCIPLE } from "@/config/evidenceVault";
import type { EvidenceSnapshot } from "@/lib/reports/types";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const baseSnap = (): EvidenceSnapshot => ({
  collected_at: new Date().toISOString(),
  customer_id: "cust-1",
  scorecard_run_id: null,
  customer_label: "Acme Co",
  is_demo_account: false,
  items: [],
  counts: {},
  notes: [],
});

describe("P69B — Mirror/Map removed from client-facing surfaces", () => {
  const clientSurfaces = [
    "src/lib/reports/structuralHealthReport.ts",
    "src/pages/portal/Uploads.tsx",
    "src/pages/portal/ReportView.tsx",
    "src/pages/portal/tools/ImplementationRoadmap.tsx",
    "src/components/admin/EvidenceReviewPanel.tsx",
    "src/config/evidenceVault.ts",
  ];
  for (const path of clientSurfaces) {
    it(`${path} contains no client-facing Mirror/Map language`, () => {
      const src = read(path);
      expect(src).not.toMatch(/Mirror, Not the Map/);
      expect(src).not.toMatch(/MIRROR_NOT_THE_MAP/);
      expect(src).not.toMatch(/mirror_not_the_map/);
    });
  }

  it("Operational Readiness principle is exported from evidenceVault registry", () => {
    expect(OPERATIONAL_READINESS_PRINCIPLE).toMatch(/operational readiness/i);
    expect(OPERATIONAL_READINESS_PRINCIPLE).not.toMatch(/mirror, not the map/i);
  });
});

describe("P69B — Structural Health Report uses ORNRA section", () => {
  it("emits the Operational Readiness section label, key, and body", () => {
    const sections = buildStructuralHealthReportSections(baseSnap());
    const ornra = sections.find(
      (s) => s.key === SECTION_KEY_OPERATIONAL_READINESS,
    );
    expect(ornra).toBeTruthy();
    expect(ornra!.label).toBe(OPERATIONAL_READINESS_PRINCIPLE_LABEL);
    expect(ornra!.body).toBe(OPERATIONAL_READINESS_REPORT_BODY);
    expect(ornra!.client_safe).toBe(true);
    expect(sections.find((s) => s.key === "mirror_not_the_map")).toBeUndefined();
  });
});

describe("P69B — Architect's Shield™ gates Repair Map view", () => {
  it("registry still requires Architect's Shield™ for repair_map_view", () => {
    const def = AGREEMENT_REGISTRY.architects_shield_scope_agreement;
    expect(def.requiredFor).toContain("report_view");
    expect(def.requiredFor).toContain("repair_map_view");
  });

  it("ImplementationRoadmap page imports and consumes the gating helpers", () => {
    const src = read("src/pages/portal/tools/ImplementationRoadmap.tsx");
    expect(src).toMatch(/ArchitectsShieldAcceptance/);
    expect(src).toMatch(/isAcknowledgmentCurrent/);
    expect(src).toMatch(/architects_shield_scope_agreement/);
    expect(src).toMatch(/repair_map_view/);
    // Gate must short-circuit roadmap fetch when shield is not accepted.
    expect(src).toMatch(/shieldAccepted/);
  });

  it("ReportView still gates report viewing on Architect's Shield™ (regression guard)", () => {
    const src = read("src/pages/portal/ReportView.tsx");
    expect(src).toMatch(/ArchitectsShieldAcceptance/);
    expect(src).toMatch(/architects_shield_scope_agreement/);
    expect(src).toMatch(/isAcknowledgmentCurrent/);
  });
});
