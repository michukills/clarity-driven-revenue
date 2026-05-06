/**
 * P88 — Welcome simplification, Next Best Action, Admin Operational
 * Queue, and reminder tracking honesty. Pure deterministic tests.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  pickNextBestAction,
  NEXT_BEST_ACTION_LABEL,
  type NextBestActionInput,
} from "@/lib/nextBestAction";
import {
  reminderStatusLabel,
  REMINDER_STATUS_LABEL,
  isEmailBackendWired,
} from "@/lib/adminCommandCenter";

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

const baseInput: NextBestActionInput = {
  consentActive: true,
  vaultOpen: true,
  evidenceSlots: [],
  timelineStages: [{ stage_key: "evidence_vault_opens", status: "scheduled" }],
};

describe("P88 — pickNextBestAction priority order", () => {
  it("1: missing consent wins when reminders are relevant", () => {
    const r = pickNextBestAction({ ...baseInput, consentActive: false });
    expect(r.key).toBe("missing_email_consent");
    expect(r.priority).toBe(1);
    expect(r.href).toBe("/portal/account");
  });

  it("does not surface consent when no reminders are relevant", () => {
    const r = pickNextBestAction({
      consentActive: false,
      vaultOpen: false,
      evidenceSlots: [],
      timelineStages: [],
      reportReady: false,
    });
    expect(r.key).toBe("none");
  });

  it("2: evidence slot attention beats expiring/timeline/etc when vault open", () => {
    const r = pickNextBestAction({
      ...baseInput,
      evidenceSlots: [
        { slot_key: "financial_reality", status: "missing" },
        { slot_key: "sales_proof", status: "expiring_soon" },
      ],
      timelineStages: [{ stage_key: "evidence_vault_opens", status: "overdue" }],
    });
    expect(r.key).toBe("evidence_slot_attention");
    expect(r.priority).toBe(2);
    expect(r.href).toBe("/portal/uploads");
  });

  it("evidence attention is suppressed when vault is closed", () => {
    const r = pickNextBestAction({
      consentActive: true,
      vaultOpen: false,
      evidenceSlots: [{ slot_key: "financial_reality", status: "missing" }],
      timelineStages: [{ stage_key: "rgs_review", status: "scheduled" }],
    });
    expect(r.key).not.toBe("evidence_slot_attention");
  });

  it("3: expiring evidence is surfaced after vault closes", () => {
    const r = pickNextBestAction({
      consentActive: true,
      vaultOpen: false,
      evidenceSlots: [{ slot_key: "financial_reality", status: "expiring_soon" }],
      timelineStages: [{ stage_key: "rgs_review", status: "scheduled" }],
    });
    expect(r.key).toBe("evidence_expiring");
    expect(r.priority).toBe(3);
  });

  it("4: timeline overdue beats clarification/report/tool", () => {
    const r = pickNextBestAction({
      consentActive: true,
      vaultOpen: false,
      evidenceSlots: [],
      timelineStages: [{ stage_key: "rgs_review", status: "overdue" }],
      clarificationRequests: 1,
      reportReady: true,
      tools: [{ key: "x", overdue: true }],
    });
    expect(r.key).toBe("timeline_overdue");
    expect(r.priority).toBe(4);
  });

  it("5/6/7/8/9: clarification → report → tool → wait → none", () => {
    expect(
      pickNextBestAction({
        consentActive: true, vaultOpen: false, clarificationRequests: 2,
        reportReady: true, tools: [{ key: "x", incomplete: true }],
      }).key,
    ).toBe("clarification_request");
    expect(
      pickNextBestAction({ consentActive: true, vaultOpen: false, reportReady: true }).key,
    ).toBe("report_ready");
    expect(
      pickNextBestAction({
        consentActive: true, vaultOpen: false,
        tools: [{ key: "x", incomplete: true }],
      }).key,
    ).toBe("tool_incomplete");
    expect(
      pickNextBestAction({
        consentActive: true, vaultOpen: false,
        timelineStages: [{ stage_key: "rgs_review", status: "scheduled" }],
        awaitingAdminReview: true,
      }).key,
    ).toBe("wait_for_admin");
    expect(
      pickNextBestAction({ consentActive: true, vaultOpen: false }).key,
    ).toBe("none");
  });

  it("every key has a stable label", () => {
    for (const k of Object.keys(NEXT_BEST_ACTION_LABEL)) {
      expect(NEXT_BEST_ACTION_LABEL[k as keyof typeof NEXT_BEST_ACTION_LABEL]).toBeTruthy();
    }
  });
});

describe("P88 — reminder tracking honesty", () => {
  it("never claims sent for blocked or admin-tracked statuses", () => {
    expect(reminderStatusLabel("blocked_no_email_backend")).toMatch(/admin-tracked/i);
    expect(reminderStatusLabel("blocked_missing_consent")).toMatch(/has not granted/i);
    expect(reminderStatusLabel("blocked_revoked_consent")).toMatch(/revoked/i);
    expect(reminderStatusLabel("admin_tracked_only")).toMatch(/admin-tracked/i);
    expect(reminderStatusLabel("failed")).toMatch(/failed/i);
    expect(reminderStatusLabel(null)).toMatch(/not scheduled/i);
    expect(reminderStatusLabel("sent")).toBe("Sent");
  });
  it("none of the non-sent labels contain the word 'Sent' as a status", () => {
    for (const [k, label] of Object.entries(REMINDER_STATUS_LABEL)) {
      if (k === "sent") continue;
      expect(label.toLowerCase()).not.toMatch(/^sent\b/);
    }
  });
  it("email backend wiring is honestly false for now", () => {
    expect(isEmailBackendWired()).toBe(false);
  });
});

describe("P88 — wiring & no-leak guarantees", () => {
  const dash = read("src/pages/portal/CustomerDashboard.tsx");
  const adminDash = read("src/pages/admin/AdminDashboard.tsx");
  const nbaCard = read("src/components/portal/NextBestActionCard.tsx");
  const opQueue = read("src/components/admin/AdminOperationalQueuePanel.tsx");

  it("client dashboard mounts NextBestActionCard, evidence vault, timeline, consent", () => {
    expect(dash).toMatch(/NextBestActionCard/);
    expect(dash).toMatch(/EvidenceVaultSlotsList/);
    expect(dash).toMatch(/DiagnosticTimelinePanel/);
    expect(dash).toMatch(/EmailConsentToggle/);
  });

  it("admin dashboard mounts the AdminOperationalQueuePanel", () => {
    expect(adminDash).toMatch(/AdminOperationalQueuePanel/);
  });

  it("client NextBestActionCard does not import admin-only data helpers", () => {
    expect(nbaCard).not.toMatch(/adminCommandCenter/);
    expect(nbaCard).not.toMatch(/admin_only_note/);
    expect(nbaCard).not.toMatch(/reviewed_by/);
    expect(nbaCard).not.toMatch(/service_role/i);
  });

  it("admin queue panel uses honest 'admin-tracked' wording when backend not wired", () => {
    expect(opQueue).toMatch(/admin-tracked only/i);
    expect(opQueue).toMatch(/automated email not wired/i);
    expect(opQueue).not.toMatch(/calendar.*automated|live sync/i);
  });

  it("client surfaces avoid compliance/audit/legal certification claims", () => {
    for (const src of [dash, nbaCard]) {
      expect(src).not.toMatch(/compliance certified/i);
      expect(src).not.toMatch(/audit-ready/i);
      expect(src).not.toMatch(/legal compliance/i);
      expect(src).not.toMatch(/guaranteed results/i);
    }
  });

  it("client NextBestActionCard never claims an email was sent", () => {
    expect(nbaCard).not.toMatch(/email (was )?sent/i);
  });
});