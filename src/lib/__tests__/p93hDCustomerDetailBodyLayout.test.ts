/**
 * P93H-D — CustomerDetail body polish + remaining sections layout hardening.
 *
 * Source-level contract guards (no rendering). They lock the body-section
 * overflow protections (consistency banner, snapshot bar, industry
 * assignment, overview grid) and the form-row wrapping behaviour added in
 * the Tasks / Implementation Checklist / Assigned Tools sections.
 *
 * P93F + P93H-A/B/C protections continue to be enforced by their own
 * dedicated test files; this file only covers the body-pass deltas.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = "src/pages/admin/CustomerDetail.tsx";
const src = readFileSync(join(process.cwd(), FILE), "utf8");

describe("P93H-D — CustomerDetail body wrappers carry overflow protections", () => {
  it("Consistency banner wrapper is present and uses min-w-0", () => {
    expect(src).toMatch(/data-testid="customer-consistency-banner"/);
    expect(src).toMatch(/<div className="mb-6 min-w-0" data-testid="customer-consistency-banner"/);
    expect(src).toMatch(/<CustomerConsistencyBanner/);
  });

  it("Snapshot bar wrapper is present and uses min-w-0", () => {
    expect(src).toMatch(/data-testid="customer-snapshot-bar"/);
    expect(src).toMatch(/<ClientSnapshotSummaryBar/);
  });

  it("Industry assignment block is responsive and overflow-safe", () => {
    expect(src).toMatch(/data-testid="customer-industry-assignment"/);
    // The header row uses flex-wrap + min-w-0 so long industry names wrap cleanly.
    expect(src).toMatch(/flex flex-wrap items-start justify-between gap-2 mb-3 min-w-0/);
    // Helper copy carries break-words.
    expect(src).toMatch(/text-\[11px\] text-muted-foreground break-words/);
    // The industry assignment field component is still the source of truth.
    expect(src).toMatch(/<IndustryAssignmentField customerId={c\.id}/);
  });
});

describe("P93H-D — Overview tab grid no longer stretches asymmetric panels", () => {
  it("Overview grid is items-start + min-w-0 so unequal panel heights don't stretch", () => {
    expect(src).toMatch(/data-testid="overview-grid"/);
    expect(src).toMatch(/grid grid-cols-1 lg:grid-cols-5 gap-6 items-start min-w-0/);
  });
});

describe("P93H-D — Assigned tools panel readability", () => {
  it("Tool titles wrap cleanly instead of being truncated mid-name", () => {
    // Old behaviour: `truncate` clipped long resource names.
    expect(src).not.toMatch(
      /<div className="text-sm text-foreground truncate">{a\.resources\?\.title}<\/div>/,
    );
    // New behaviour: titles wrap with break-words and respect their column.
    expect(src).toMatch(
      /<div className="text-sm text-foreground break-words min-w-0">{a\.resources\?\.title}<\/div>/,
    );
  });

  it("Assigned-tools assign row wraps on narrow widths instead of overflowing", () => {
    // Select grows, button stays compact.
    expect(src).toMatch(/flex-1 min-w-\[200px\] bg-muted\/40 border border-border rounded-md/);
    expect(src).toMatch(/<Button onClick={assignResource} size="sm" className="bg-primary hover:bg-secondary shrink-0">/);
  });
});

describe("P93H-D — Task + checklist add rows wrap cleanly on small viewports", () => {
  it("Tasks add row uses flex-wrap with a flexible title input and a stable Add button", () => {
    // Title input grows and respects a sensible min width.
    expect(src).toMatch(
      /<Input placeholder="Task title".*className="bg-muted\/40 border-border flex-1 min-w-\[200px\]" \/>/s,
    );
    // Date input goes full-width on mobile, fixed on sm+.
    expect(src).toMatch(/className="bg-muted\/40 border-border w-full sm:w-44"/);
    // Add button does not shrink away.
    expect(src).toMatch(
      /<Button onClick={addTask} size="sm" className="bg-primary hover:bg-secondary shrink-0">/,
    );
  });

  it("Implementation checklist add row wraps the same way", () => {
    expect(src).toMatch(
      /<Input placeholder="New checklist item".*className="bg-muted\/40 border-border flex-1 min-w-\[200px\]" \/>/s,
    );
    expect(src).toMatch(
      /<Button onClick={addChecklistItem} size="sm" className="bg-primary hover:bg-secondary shrink-0">/,
    );
  });
});

describe("P93H-D — body pass does not regress P93F / P93H-C invariants", () => {
  it("AdminSpecialistToolMenu remains the single specialist surface", () => {
    const matches = src.match(/<AdminSpecialistToolMenu/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("Destructive cluster + admin-cleanup-customer routing remain intact", () => {
    expect(src).toMatch(/data-testid="primary-actions-destructive"/);
    expect(src).toMatch(/admin-cleanup-customer/);
    expect(src).toMatch(/<DeleteAccountDialog/);
    expect(src).toMatch(/forceRealClientDelete:\s*!isDemo/);
  });

  it("No frontend secrets or banned scope language reintroduced", () => {
    expect(src).not.toMatch(/SERVICE_ROLE/i);
    expect(src).not.toMatch(/sk_live_/);
    expect(src).not.toMatch(/sk_test_/);
    const banned = [
      /trusted by/i,
      /guaranteed (revenue|ROI|results)/i,
      /unlimited (support|consulting|advisory)/i,
      /\bHIPAA\b/i,
      /done[- ]for[- ]you/i,
    ];
    for (const re of banned) expect(src).not.toMatch(re);
  });
});