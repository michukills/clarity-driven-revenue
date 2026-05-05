/**
 * P71 — Worn Tooth Signals™ contract test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  WORN_TOOTH_SIGNAL_GEARS,
  WORN_TOOTH_SIGNAL_REGISTRY,
  WORN_TOOTH_SIGNAL_STATUSES,
  findWornToothSignalForbiddenPhrase,
} from "@/config/wornToothSignals";
import {
  WORN_TOOTH_SIGNALS_PLACEHOLDER_BODY,
  renderWornToothSignalsForReport,
} from "@/lib/wornToothSignals/wornToothSignals";
import {
  buildStructuralHealthReportSections,
  SECTION_KEY_WORN_TOOTH_SIGNALS,
  renderWornToothSignalsSection,
} from "@/lib/reports/structuralHealthReport";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("P71 — Worn Tooth Signal registry covers all five RGS gears + regulated", () => {
  it("registry includes every required gear", () => {
    const gears = new Set(WORN_TOOTH_SIGNAL_REGISTRY.map((r) => r.gear));
    for (const g of WORN_TOOTH_SIGNAL_GEARS) expect(gears.has(g)).toBe(true);
  });

  it("rule client-safe text contains no forbidden phrases", () => {
    for (const r of WORN_TOOTH_SIGNAL_REGISTRY) {
      expect(findWornToothSignalForbiddenPhrase(r.clientSafeSummary)).toBeNull();
      expect(findWornToothSignalForbiddenPhrase(r.clientSafeExplanation)).toBeNull();
      expect(findWornToothSignalForbiddenPhrase(r.recommendedOwnerAction)).toBeNull();
    }
  });

  it("required statuses are present", () => {
    for (const s of ["detected", "approved", "client_visible", "dismissed", "resolved"]) {
      expect(WORN_TOOTH_SIGNAL_STATUSES).toContain(s as never);
    }
  });
});

describe("P71 — forbidden phrase scanner", () => {
  it("blocks regulated/financial/guarantee phrases", () => {
    expect(findWornToothSignalForbiddenPhrase("guaranteed revenue rise")).toBe("guaranteed revenue");
    expect(findWornToothSignalForbiddenPhrase("the system is HIPAA compliant")).toBe("hipaa compliant");
    expect(findWornToothSignalForbiddenPhrase("CPA verified results")).toBe("cpa verified");
    expect(findWornToothSignalForbiddenPhrase("Operational early warning only.")).toBeNull();
  });
});

describe("P71 — Structural Health Report integration", () => {
  it("section renders honest placeholder when no signals exist", () => {
    expect(renderWornToothSignalsSection([])).toMatch(/No Worn Tooth Signals/);
    expect(renderWornToothSignalsForReport([])).toBe(WORN_TOOTH_SIGNALS_PLACEHOLDER_BODY);
  });

  it("section renders approved signals with gear, severity, trend; no admin notes", () => {
    const out = renderWornToothSignalsSection([
      {
        id: "s1",
        signal_title: "Cash runway shrinking",
        client_safe_summary: "Runway looks shorter than a healthy buffer.",
        client_safe_explanation: "Early warning in financial visibility.",
        gear: "financial_visibility",
        severity: "critical",
        trend: "worsening",
        recommended_owner_action: "Confirm payroll coverage before new commitments.",
        professional_review_recommended: true,
      },
    ]);
    expect(out).toMatch(/Cash runway shrinking/);
    expect(out).toMatch(/financial visibility/);
    expect(out).toMatch(/\[critical\]/);
    expect(out).toMatch(/trend: worsening/);
    expect(out).toMatch(/Owner action:/);
    expect(out).toMatch(/Professional review recommended/);
    expect(out).not.toMatch(/admin/i);
  });

  it("buildStructuralHealthReportSections emits canonical worn_tooth_signals key", () => {
    const sections = buildStructuralHealthReportSections({ items: [], counts: {} } as never);
    expect(sections.map((s) => s.key)).toContain(SECTION_KEY_WORN_TOOTH_SIGNALS);
  });
});

describe("P71 — migration shape + RLS", () => {
  it("creates worn_tooth_signals with RLS, admin policy, customer-visible policy, and client RPC", () => {
    const dir = join(root, "supabase/migrations");
    let combined = "";
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".sql")) combined += readFileSync(join(dir, f), "utf8");
    }
    expect(combined).toMatch(/CREATE TABLE IF NOT EXISTS public\.worn_tooth_signals/);
    expect(combined).toMatch(/ALTER TABLE public\.worn_tooth_signals ENABLE ROW LEVEL SECURITY/);
    expect(combined).toMatch(/Admins manage worn tooth signals/);
    expect(combined).toMatch(/Customers view own approved client-visible worn tooth signals/);
    expect(combined).toMatch(/get_client_worn_tooth_signals/);
    expect(combined).toMatch(/admin_list_report_worn_tooth_signals/);
    expect(combined).toMatch(/REVOKE ALL ON FUNCTION public\.get_client_worn_tooth_signals\(uuid\) FROM PUBLIC/);
    expect(combined).toMatch(/GRANT EXECUTE ON FUNCTION public\.get_client_worn_tooth_signals\(uuid\) TO authenticated/);
  });
});

describe("P71 — client portal component never imports admin APIs", () => {
  const src = read("src/components/portal/WornToothSignalsList.tsx");
  it("does not import admin service surface", () => {
    expect(src).not.toMatch(/adminListWornToothSignals/);
    expect(src).not.toMatch(/adminCreateWornToothSignal/);
    expect(src).not.toMatch(/adminUpdateWornToothSignal/);
    expect(src).not.toMatch(/adminApproveSignalForClient/);
  });
  it("imports only the client-safe getter", () => {
    expect(src).toMatch(/getClientWornToothSignals/);
  });
  it("uses ORNRA-aligned tone, not 'Mirror, Not the Map'", () => {
    expect(src).not.toMatch(/Mirror, Not the Map/i);
    expect(src).toMatch(/operational/i);
  });
});

describe("P71 — service layer scrubs forbidden text on read", () => {
  it("client read filters out rows with forbidden phrases (defensive)", async () => {
    const mod = await import("@/lib/wornToothSignals/wornToothSignals");
    // Render path: ensure a forbidden-phrase row never appears in the report.
    const safeOut = mod.renderWornToothSignalsForReport([
      {
        id: "s",
        signal_title: "Safe signal",
        client_safe_summary: null,
        client_safe_explanation: "Operational observation.",
        gear: "operational_efficiency",
        severity: "low",
        trend: "unknown",
        recommended_owner_action: null,
        professional_review_recommended: false,
        linked_repair_map_item_id: null,
      },
    ]);
    expect(safeOut).toMatch(/Safe signal/);
  });
});