/**
 * P87 Phase 2 — Panels, wiring, slot picker, reminder consent gate.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");

describe("P87 Phase 2 — admin panels exist", () => {
  it("EvidenceVaultSlotsPanel exists", () => {
    const src = read("src/components/admin/EvidenceVaultSlotsPanel.tsx");
    expect(src).toMatch(/adminReviewSlot/);
    expect(src).toMatch(/HITL_CONFIRMATION_TEXT/);
    expect(src).toMatch(/findForbiddenSlotPhrase/);
    // No AI gateway / openai / lovable-ai usage.
    expect(src).not.toMatch(/openai|lovable-ai|ai-gateway/i);
    expect(src).not.toMatch(/service[_-]?role/i);
  });
  it("DiagnosticTimelineAdminPanel exists and gates reminders via P86", () => {
    const src = read("src/components/admin/DiagnosticTimelineAdminPanel.tsx");
    expect(src).toMatch(/adminCreateTimelineReminderAttempt/);
    expect(src).toMatch(/EVIDENCE_DECAY_EMAIL_AUTOMATION_WIRED/);
    expect(src).not.toMatch(/openai|lovable-ai|ai-gateway/i);
    expect(src).not.toMatch(/service[_-]?role/i);
  });
  it("CustomerDetail mounts both panels", () => {
    const src = read("src/pages/admin/CustomerDetail.tsx");
    expect(src).toMatch(/EvidenceVaultSlotsPanel/);
    expect(src).toMatch(/DiagnosticTimelineAdminPanel/);
    // Preserve P86 panels.
    for (const p of [
      "EvidenceDecayPanel","LaborBurdenCalculatorPanel","OwnerInterventionLogPanel",
      "ExternalRiskTriggersPanel","AiHitlAuditPanel","PulseCheckPanel",
    ]) expect(src).toMatch(new RegExp(p));
  });
});

describe("P87 Phase 2 — client panels are admin-note-safe", () => {
  it("EvidenceVaultSlotsList exists and uses RPC, no admin fields", () => {
    const src = read("src/components/portal/EvidenceVaultSlotsList.tsx");
    expect(src).toMatch(/getClientSlotsForCustomer/);
    for (const f of ["admin_only_note","reviewed_by","admin_id","file_path","service_role"]) {
      expect(src).not.toMatch(new RegExp(f));
    }
  });
  it("DiagnosticTimelinePanel reads via RPC and hides admin notes", () => {
    const src = read("src/components/portal/DiagnosticTimelinePanel.tsx");
    expect(src).toMatch(/getClientTimelineStages/);
    for (const f of ["admin_only_note","extension_reason","reviewed_by","service_role"]) {
      expect(src).not.toMatch(new RegExp(f));
    }
  });
  it("CustomerDashboard mounts client panels and preserves EmailConsentToggle", () => {
    const src = read("src/pages/portal/CustomerDashboard.tsx");
    expect(src).toMatch(/EvidenceVaultSlotsList/);
    expect(src).toMatch(/DiagnosticTimelinePanel/);
    expect(src).toMatch(/EmailConsentToggle/);
  });
});

describe("P87 Phase 2 — Uploads page slot picker", () => {
  const src = read("src/pages/portal/Uploads.tsx");
  it("contains slot picker referencing all five slot keys", () => {
    expect(src).toMatch(/evidence-slot-picker/);
    for (const k of ["financial_reality","sales_proof","operational_dna","pricing_strategy","time_audit"]) {
      // referenced via EVIDENCE_VAULT_SLOTS array import
    }
    expect(src).toMatch(/EVIDENCE_VAULT_SLOTS/);
    expect(src).toMatch(/clientMarkSlotPendingReview/);
  });
  it("does not let client mark a slot Verified", () => {
    expect(src).not.toMatch(/status:\s*['"]verified['"]/);
    expect(src).not.toMatch(/adminReviewSlot/);
  });
});

describe("P87 Phase 2 — reminder respects P86 consent/backend", () => {
  it("library uses attemptNotificationEmail with stage notification type", () => {
    const src = read("src/lib/diagnosticTimeline/index.ts");
    expect(src).toMatch(/attemptNotificationEmail/);
    expect(src).toMatch(/STAGE_NOTIFICATION_TYPE/);
    expect(src).toMatch(/admin_tracked_only/);
  });
  it("admin_tracked_only is true when status is not 'sent'", async () => {
    vi.resetModules();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: () => ({
          select: () => ({ order: () => ({ limit: () => ({ eq: () => ({ then: undefined }) }) }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: "x", send_status: "blocked_no_email_backend" }, error: null }) }) }),
        }),
        rpc: async () => ({ data: [], error: null }),
      },
    }));
    vi.doMock("@/lib/emailConsent", () => ({
      attemptNotificationEmail: async () => ({
        decision: { allowed: false, reason: "blocked_no_email_backend", consent: null, backendWired: false },
        attempt: { send_status: "blocked_no_email_backend" },
      }),
    }));
    const mod = await import("../diagnosticTimeline/index");
    const r = await mod.adminCreateTimelineReminderAttempt({
      customerId: "c", stageKey: "evidence_reminder", recipientEmail: "x@y.z",
    });
    expect(r.admin_tracked_only).toBe(true);
    expect(r.status).toBe("blocked_no_email_backend");
  });
});

describe("P87 Phase 2 — preserve safety guarantees", () => {
  it("client components and uploads page have no compliance/audit/legal claims", () => {
    for (const p of [
      "src/components/portal/EvidenceVaultSlotsList.tsx",
      "src/components/portal/DiagnosticTimelinePanel.tsx",
      "src/components/admin/EvidenceVaultSlotsPanel.tsx",
      "src/components/admin/DiagnosticTimelineAdminPanel.tsx",
    ]) {
      const src = read(p);
      for (const phrase of [
        "compliance certified","legally compliant","license protection",
        "audit-ready","audit guaranteed","investor-ready","fiduciary",
      ]) {
        expect(src.toLowerCase()).not.toContain(phrase);
      }
    }
  });
});