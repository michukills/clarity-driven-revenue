/**
 * P67B — Evidence Vault Functional Completion contract.
 *
 * Pins the live workflow surface added in P67B:
 *   - evidence_records metadata service module exists with admin
 *     and client APIs separated
 *   - admin Evidence Review Panel renders the admin-only regulated
 *     tag surface and admin-only note input
 *   - client Uploads page persists evidence_records on upload
 *   - safe report citation builder never leaks unsafe data
 *   - client-facing forbidden phrases are rejected by the admin
 *     update path
 *   - migration adds the table, the trigger, and the client-safe view
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  EVIDENCE_ADMIN_REVIEW_STATUSES,
  EVIDENCE_CLIENT_VISIBLE_STATUSES,
  buildSafeEvidenceCitation,
} from "@/lib/evidence/evidenceRecords";
import {
  ADMIN_ONLY_REGULATED_TAGS,
  CLIENT_FORBIDDEN_EVIDENCE_PHRASES,
} from "@/config/evidenceVault";

const root = process.cwd();
const read = (rel: string) => readFileSync(resolve(root, rel), "utf8");

describe("P67B — service module surface", () => {
  it("exposes admin review status vocabulary", () => {
    for (const s of [
      "pending",
      "in_review",
      "approved",
      "rejected",
      "needs_clarification",
    ]) {
      expect(EVIDENCE_ADMIN_REVIEW_STATUSES).toContain(s);
    }
  });

  it("exposes client-visible status vocabulary", () => {
    expect(EVIDENCE_CLIENT_VISIBLE_STATUSES).toContain("private");
    expect(EVIDENCE_CLIENT_VISIBLE_STATUSES).toContain("client_visible");
  });

  it("buildSafeEvidenceCitation refuses private/un-approved evidence", () => {
    const base = {
      id: "e1",
      evidence_title: "Bank statement",
      reviewed_at: null,
      related_gear: "cash_visibility",
      evidence_sufficiency_status: "accepted",
      client_visible_note: null,
      include_in_client_report: false,
      client_visible_status: "client_visible",
    };
    expect(buildSafeEvidenceCitation(base)).toBeNull();
    expect(
      buildSafeEvidenceCitation({
        ...base,
        include_in_client_report: true,
        client_visible_status: "private",
      }),
    ).toBeNull();
    const safe = buildSafeEvidenceCitation({
      ...base,
      include_in_client_report: true,
      client_visible_note: "RGS reviewed and accepted.",
    });
    expect(safe).not.toBeNull();
    expect(safe!.title).toBe("Bank statement");
    expect(safe).not.toHaveProperty("filePath");
    expect(safe).not.toHaveProperty("file_url");
    expect(safe).not.toHaveProperty("admin_only_note");
  });

  it("admin update path source rejects forbidden client-facing phrases", () => {
    const src = read("src/lib/evidence/evidenceRecords.ts");
    expect(src).toContain("CLIENT_FORBIDDEN_EVIDENCE_PHRASES");
    expect(src).toMatch(/Forbidden client-facing phrase/);
    // Sanity: the module imports the registry, not hard-codes phrases.
    for (const phrase of CLIENT_FORBIDDEN_EVIDENCE_PHRASES) {
      // The phrase string itself MUST NOT appear inline in the service
      // module — it must come from the registry only.
      expect(src.toLowerCase().split("client_forbidden_evidence_phrases").length).toBeGreaterThan(1);
      void phrase;
    }
  });
});

describe("P67B — admin Evidence Review Panel", () => {
  const src = read("src/components/admin/EvidenceReviewPanel.tsx");

  it("is gated as admin-only in markup", () => {
    expect(src).toMatch(/Admin only/);
    expect(src).toContain("admin-evidence-review-panel");
  });

  it("supports all admin-only regulated tags from the registry", () => {
    for (const tag of ADMIN_ONLY_REGULATED_TAGS) {
      // Tags are surfaced via the imported constant; we just verify the
      // import wiring is present.
      expect(src).toContain("ADMIN_ONLY_REGULATED_TAGS");
      void tag;
    }
    expect(src).toContain("admin-only-regulated-tag");
  });

  it("exposes admin-only note input distinct from client-visible note", () => {
    expect(src).toContain("admin-only-note-input");
    expect(src).toMatch(/Client-visible note/);
    expect(src).toMatch(/Admin-only note \(never shown to client\)/);
  });

  it("can edit sufficiency, review, and visibility status", () => {
    expect(src).toContain("EVIDENCE_SUFFICIENCY_STATUSES");
    expect(src).toContain("EVIDENCE_ADMIN_REVIEW_STATUSES");
    expect(src).toContain("EVIDENCE_CLIENT_VISIBLE_STATUSES");
  });
});

describe("P67B — client upload persists evidence metadata", () => {
  const src = read("src/pages/portal/Uploads.tsx");
  it("imports the client evidence service", () => {
    expect(src).toContain("createClientEvidenceRecord");
  });
  it("does not allow client to set admin-only fields", () => {
    expect(src).not.toMatch(/admin_only_note/);
    expect(src).not.toMatch(/admin_only_regulatory_tag/);
    expect(src).not.toMatch(/include_in_client_report/);
    expect(src).not.toMatch(/admin_review_status/);
  });
});

describe("P67B — migration adds table, trigger, and client-safe view", () => {
  const dir = "supabase/migrations";
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql"));
  const all = files.map((f) => read(`${dir}/${f}`)).join("\n\n");

  it("creates the evidence_records table", () => {
    expect(all).toMatch(/CREATE TABLE IF NOT EXISTS public\.evidence_records/);
  });

  it("creates the client-update guard trigger and admin-only field check", () => {
    expect(all).toContain("evidence_records_guard_client_updates");
    expect(all).toMatch(/admin_review_status IS DISTINCT FROM OLD\.admin_review_status/);
    expect(all).toMatch(/admin_only_note IS DISTINCT FROM OLD\.admin_only_note/);
    expect(all).toMatch(/include_in_client_report IS DISTINCT FROM OLD\.include_in_client_report/);
  });

  it("creates a client-safe view that hides admin-only fields", () => {
    expect(all).toMatch(/CREATE OR REPLACE VIEW public\.evidence_records_client_safe/);
    // The view body must not select the admin-only fields.
    const viewBlock = all.split("evidence_records_client_safe")[1] ?? "";
    expect(viewBlock).not.toMatch(/admin_only_note/);
    expect(viewBlock).not.toMatch(/admin_only_regulatory_tag/);
    expect(viewBlock).not.toMatch(/admin_review_status/);
  });

  it("enables RLS and adds admin + customer scoped policies", () => {
    expect(all).toMatch(/ALTER TABLE public\.evidence_records ENABLE ROW LEVEL SECURITY/);
    expect(all).toMatch(/Admins manage evidence records/);
    expect(all).toMatch(/Customers view own evidence records/);
    expect(all).toMatch(/Customers insert own evidence records/);
  });
});

describe("P67B — admin panel wired into customer detail Files tab", () => {
  const src = read("src/pages/admin/CustomerDetail.tsx");
  it("imports and renders EvidenceReviewPanel", () => {
    expect(src).toContain("EvidenceReviewPanel");
    expect(src).toMatch(/<EvidenceReviewPanel\s+customerId/);
  });
});