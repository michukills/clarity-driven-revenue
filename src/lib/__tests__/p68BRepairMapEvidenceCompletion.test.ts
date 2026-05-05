/**
 * P68B — Repair Map Evidence Completion contract test.
 * Pins the evidence-attachment workflow, client-safe rendering, and
 * "evidence-backed" labelling rules.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  renderRepairMapSlotClientSafe,
  type RepairMapItemForRender,
  findForbiddenClientPhrase,
} from "@/lib/reports/structuralHealthReport";
import { isUnsafeForClientVisibleRepairMap } from "@/lib/evidence/evidenceRecords";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const baseItem = (
  over: Partial<RepairMapItemForRender> = {},
): RepairMapItemForRender => ({
  id: "i1",
  title: "Tighten cash close",
  client_summary: "Owner-safe summary",
  internal_notes: null,
  gear: "financial_visibility",
  phase: "stabilize",
  priority: "high",
  client_visible: true,
  ...over,
});

describe("P68B — Repair Map evidence completion", () => {
  it("'evidence-backed' label appears only when client_safe_evidence is present", () => {
    const noEv = renderRepairMapSlotClientSafe("First 30 Days", [baseItem()]);
    expect(noEv).not.toMatch(/evidence-backed/);
    const withEv = renderRepairMapSlotClientSafe("First 30 Days", [
      baseItem({
        client_safe_evidence: [
          {
            evidence_id: "e1",
            title: "Bank reconciliation Q3",
            related_gear: "financial_visibility",
            status: "accepted",
            client_visible_note: "Reconciled through Sep 30",
            reviewed_at: null,
          },
        ],
      }),
    ]);
    expect(withEv).toMatch(/evidence-backed/);
    expect(withEv).toMatch(/Supported by: Bank reconciliation Q3/);
    expect(withEv).toMatch(/Reconciled through Sep 30/);
  });

  it("client-safe renderer never leaks admin internal_notes even with attached evidence", () => {
    const out = renderRepairMapSlotClientSafe("First 30 Days", [
      baseItem({
        internal_notes: "ADMIN-ONLY confidential",
        client_safe_evidence: [
          {
            evidence_id: "e1",
            title: "Doc",
            related_gear: null,
            status: "accepted",
            client_visible_note: null,
            reviewed_at: null,
          },
        ],
      }),
    ]);
    expect(out).not.toMatch(/ADMIN-ONLY/);
  });

  it("client-safe renderer never includes forbidden client-facing phrases", () => {
    const out = renderRepairMapSlotClientSafe("First 30 Days", [baseItem()]);
    expect(findForbiddenClientPhrase(out)).toBeNull();
  });

  it("isUnsafeForClientVisibleRepairMap flags private/unapproved/regulated/PII rows", () => {
    const safe = {
      client_visible_status: "client_visible",
      include_in_client_report: true,
      admin_review_status: "approved",
      admin_only_regulatory_tag: null,
      contains_possible_pii_phi: false,
    } as const;
    expect(isUnsafeForClientVisibleRepairMap(safe as never)).toBe(false);
    expect(
      isUnsafeForClientVisibleRepairMap({
        ...safe,
        client_visible_status: "private",
      } as never),
    ).toBe(true);
    expect(
      isUnsafeForClientVisibleRepairMap({
        ...safe,
        admin_review_status: "pending",
      } as never),
    ).toBe(true);
    expect(
      isUnsafeForClientVisibleRepairMap({
        ...safe,
        admin_only_regulatory_tag: "cannabis_compliance",
      } as never),
    ).toBe(true);
    expect(
      isUnsafeForClientVisibleRepairMap({
        ...safe,
        contains_possible_pii_phi: true,
      } as never),
    ).toBe(true);
    expect(
      isUnsafeForClientVisibleRepairMap({
        ...safe,
        include_in_client_report: false,
      } as never),
    ).toBe(true);
  });

  it("admin Repair Map UI wires the per-item Evidence Vault picker", () => {
    const src = read("src/pages/admin/ImplementationRoadmapAdmin.tsx");
    expect(src).toMatch(/RepairMapEvidencePanel/);
    const panel = read("src/components/admin/RepairMapEvidencePanel.tsx");
    expect(panel).toMatch(/adminAttachEvidenceToRepairMapItem/);
    expect(panel).toMatch(/adminDetachEvidenceFromRepairMapItem/);
    expect(panel).toMatch(/adminListCustomerEvidenceForRepairPicker/);
    expect(panel).toMatch(/isUnsafeForClientVisibleRepairMap/);
  });

  it("PDF export consumes approved+client-safe evidence via the dedicated RPC", () => {
    const src = read("src/pages/admin/ReportDraftDetail.tsx");
    expect(src).toMatch(/getClientRepairMapEvidence/);
    expect(src).toMatch(/client_safe_evidence/);
  });

  it("client Repair Map view uses 30/60/90 slots and only approved evidence", () => {
    const src = read("src/pages/portal/tools/ImplementationRoadmap.tsx");
    expect(src).toMatch(/First 30 Days — Stop the Slipping/);
    expect(src).toMatch(/Days 31–60 — Install the Missing Systems/);
    expect(src).toMatch(/Days 61–90 — Strengthen the Owner Independence Layer/);
    expect(src).toMatch(/getClientRepairMapEvidence/);
    // Must not call any admin evidence APIs from the client view.
    expect(src).not.toMatch(/adminListCustomerEvidenceForRepairPicker/);
    expect(src).not.toMatch(/admin_only_note/);
  });

  it("Reality Check Flags remain an honest placeholder (not invented in P68B)", () => {
    const src = read("src/lib/reports/structuralHealthReport.ts");
    expect(src).toMatch(/REALITY_CHECK_FLAGS_PLACEHOLDER_BODY/);
    expect(src).not.toMatch(/contradiction detected/);
  });
});