import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("P86 UI & Wiring", () => {
  const adminPanels = [
    "src/components/admin/LaborBurdenCalculatorPanel.tsx",
    "src/components/admin/OwnerInterventionLogPanel.tsx",
    "src/components/admin/ExternalRiskTriggersPanel.tsx",
    "src/components/admin/AiHitlAuditPanel.tsx",
    "src/components/admin/PulseCheckPanel.tsx",
    "src/components/admin/EvidenceDecayPanel.tsx",
  ];
  it("all admin panels exist", () => {
    for (const p of adminPanels) expect(existsSync(resolve(process.cwd(), p))).toBe(true);
  });
  it("CustomerDetail imports all P86 admin panels", () => {
    const s = read("src/pages/admin/CustomerDetail.tsx");
    for (const name of [
      "LaborBurdenCalculatorPanel", "OwnerInterventionLogPanel",
      "ExternalRiskTriggersPanel", "AiHitlAuditPanel", "PulseCheckPanel",
      "EvidenceDecayPanel",
    ]) expect(s).toContain(name);
  });
  it("ReportView mounts client P86 components", () => {
    const s = read("src/pages/portal/ReportView.tsx");
    for (const name of ["EvidenceDecayList", "LaborBurdenCard", "OwnerInterventionList", "ExternalRiskList"]) {
      expect(s).toContain(name);
    }
  });
  it("CustomerDashboard mounts EmailConsentToggle", () => {
    expect(read("src/pages/portal/CustomerDashboard.tsx")).toContain("EmailConsentToggle");
  });
  it("client components do not reference admin-only fields", () => {
    for (const f of [
      "src/components/portal/EvidenceDecayList.tsx",
      "src/components/portal/LaborBurdenCard.tsx",
      "src/components/portal/OwnerInterventionList.tsx",
      "src/components/portal/ExternalRiskList.tsx",
    ]) {
      const s = read(f);
      expect(s).not.toMatch(/admin_notes/);
      expect(s).not.toMatch(/admin_id/);
    }
  });
  it("admin panels do not call AI gateways", () => {
    for (const p of adminPanels) {
      const s = read(p);
      expect(s).not.toMatch(/openai|lovable-ai|ai-gateway/i);
    }
  });
  it("honest labels appear", () => {
    const ext = read("src/components/admin/ExternalRiskTriggersPanel.tsx");
    expect(ext.toLowerCase()).toContain("no live external monitoring");
    const labor = read("src/components/admin/LaborBurdenCalculatorPanel.tsx");
    expect(labor.toLowerCase()).toContain("manual export");
    expect(labor.toLowerCase()).toContain("no live syncs");
    const pulse = read("src/components/admin/PulseCheckPanel.tsx");
    expect(pulse.toLowerCase()).toContain("no calendar automation");
  });
});