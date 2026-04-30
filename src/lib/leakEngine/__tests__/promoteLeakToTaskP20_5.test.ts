// P20.5 — Tests for the safe promote-to-task helper.
//
// Verifies:
//  1. Inserts a draft client_tasks row (client_visible=false, released_at=null).
//  2. Preserves source-issue metadata (gear, score, band, confidence) in the
//     audit payload but never in client-visible fields.
//  3. Duplicate prevention — second promotion of the same leak returns
//     { duplicate: true } and does not insert again.
//  4. RLS error from the DB surfaces as { ok: false, error }.
//  5. Audit event is emitted with safe-only fields.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const insertedRows: any[] = [];
const auditCalls: Array<{ action: string; customer_id: string | null | undefined; details: any }> = [];
const existingByCustomerTitle = new Map<string, { id: string }>();
let nextInsertError: string | null = null;

vi.mock("@/integrations/supabase/client", () => {
  const fromImpl = (table: string) => {
    if (table !== "client_tasks") throw new Error(`unexpected table ${table}`);
    return {
      select() {
        // chained for both select-after-insert and existence check.
        const builder: any = {
          _eq: {} as Record<string, unknown>,
          eq(col: string, val: unknown) {
            this._eq[col] = val;
            return this;
          },
          limit() {
            return this;
          },
          maybeSingle: async () => {
            const key = `${builder._eq.customer_id}::${builder._eq.issue_title}`;
            const hit = existingByCustomerTitle.get(key);
            return { data: hit ?? null, error: null };
          },
          single: async () => ({ data: builder._lastInserted, error: null }),
        };
        return builder;
      },
      insert(row: any) {
        if (nextInsertError) {
          return {
            select() {
              return {
                single: async () => ({ data: null, error: { message: nextInsertError } }),
              };
            },
          };
        }
        const id = `task_${insertedRows.length + 1}`;
        const stored = { id, ...row };
        insertedRows.push(stored);
        existingByCustomerTitle.set(`${row.customer_id}::${row.issue_title}`, { id });
        return {
          select() {
            return {
              single: async () => ({ data: { id }, error: null }),
            };
          },
        };
      },
    };
  };
  return { supabase: { from: fromImpl } };
});

vi.mock("@/lib/portalAudit", () => ({
  logPortalAudit: vi.fn(async (action: string, customer_id: any, details: any) => {
    auditCalls.push({ action, customer_id, details });
  }),
}));

import { promoteLeakToTask } from "@/lib/leakEngine/promoteLeakToTask";
import type { RankedLeak } from "@/lib/leakEngine";

function buildRanked(overrides: Partial<RankedLeak["leak"]> = {}, scoredOverrides: Partial<RankedLeak["scored"]> = {}): RankedLeak {
  return {
    leak: {
      id: "leak_1",
      type: "delayed_invoicing",
      category: "financial_visibility",
      gear: 3,
      severity: "high",
      estimated_revenue_impact: 8200,
      confidence: "Confirmed",
      source: "engine",
      message: "Multiple completed jobs sat uninvoiced past 7 days.",
      recommended_fix: "Invoice within 24 hours of job completion.",
      industry_context: "trade_field_service",
      ...overrides,
    } as RankedLeak["leak"],
    scored: {
      rank: 1,
      priority_band: "high",
      priority_score: 18,
      impact: 8,
      visibility: 4,
      ease_of_fix: 4,
      dependency: 2,
      rationale: "high impact and visible",
      ...scoredOverrides,
    } as RankedLeak["scored"],
    explanation: "Top driver of unrealized revenue.",
  };
}

beforeEach(() => {
  insertedRows.length = 0;
  auditCalls.length = 0;
  existingByCustomerTitle.clear();
  nextInsertError = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("promoteLeakToTask (P20.5)", () => {
  it("inserts a draft task in admin-review state (client_visible=false)", async () => {
    const res = await promoteLeakToTask({ customer_id: "cust_a", ranked: buildRanked() });
    expect(res.ok).toBe(true);
    expect(insertedRows).toHaveLength(1);
    const row = insertedRows[0];
    expect(row.client_visible).toBe(false);
    expect(row.released_at).toBeNull();
    expect(row.customer_id).toBe("cust_a");
    expect(row.issue_title).toMatch(/uninvoiced/);
    expect(row.priority_band).toBe("high");
    expect(row.rank).toBe(1);
  });

  it("does not write admin scoring internals (rationale, raw factors) into client-visible fields", async () => {
    await promoteLeakToTask({ customer_id: "cust_a", ranked: buildRanked() });
    const row = insertedRows[0];
    const blob = JSON.stringify(row).toLowerCase();
    expect(blob).not.toContain("rationale");
    expect(blob).not.toContain("impact × 2");
    // raw scoring factor keys must not be written
    expect(row).not.toHaveProperty("dependency");
    expect(row).not.toHaveProperty("ease_of_fix");
  });

  it("prevents duplicate promotion of the same leak (same customer + issue_title)", async () => {
    const ranked = buildRanked();
    const first = await promoteLeakToTask({ customer_id: "cust_a", ranked });
    const second = await promoteLeakToTask({ customer_id: "cust_a", ranked });
    expect(first.ok && (first as any).duplicate).toBe(false);
    expect(second.ok && (second as any).duplicate).toBe(true);
    expect(insertedRows).toHaveLength(1);
  });

  it("returns { ok:false } when the DB rejects the insert (e.g., RLS denies a non-admin caller)", async () => {
    nextInsertError = "new row violates row-level security policy";
    const res = await promoteLeakToTask({ customer_id: "cust_a", ranked: buildRanked() });
    expect(res.ok).toBe(false);
    expect(res.ok === false && res.error).toMatch(/row-level security/i);
    expect(auditCalls).toHaveLength(0);
  });

  it("emits a safe audit event with no rationale or AI internals", async () => {
    await promoteLeakToTask({ customer_id: "cust_a", ranked: buildRanked() });
    // logPortalAudit is awaited via void; flush microtasks
    await new Promise((r) => setTimeout(r, 0));
    expect(auditCalls).toHaveLength(1);
    const call = auditCalls[0];
    expect(call.action).toBe("task_assigned");
    expect(call.customer_id).toBe("cust_a");
    expect(call.details).toMatchObject({
      source: "leak_intelligence",
      gear: 3,
      priority_band: "high",
      priority_score: 18,
      confidence: "Confirmed",
    });
    const safeBlob = JSON.stringify(call.details).toLowerCase();
    expect(safeBlob).not.toContain("rationale");
    expect(safeBlob).not.toContain("ai");
  });

  it("requires a customer_id", async () => {
    const res = await promoteLeakToTask({ customer_id: "", ranked: buildRanked() });
    expect(res.ok).toBe(false);
  });
});