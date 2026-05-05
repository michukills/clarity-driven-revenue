/**
 * E1 — Lifecycle demo runner.
 *
 * Idempotent, admin-only orchestration around `E1_LIFECYCLE_DEMO_SPECS`.
 * Reuses the existing `customers` table; never mutates non-demo rows;
 * scoped strictly by `@demo.rgs.local` email. Pairs with the existing
 * `showcaseSeed` (`@showcase.rgs.local`) and `demoSeed` (`@demo.rgs.local`
 * Demo A/B/C) — together they form the full demo dataset surface.
 *
 * SAFETY:
 *  - No raw SQL, no RPC, no service-role usage; client-side admin
 *    operations only.
 *  - Deletes are scoped via `.in("email", E1_DEMO_EMAILS)` and require
 *    the email-suffix invariant (`@demo.rgs.local`) — never broad
 *    industry / date filters.
 *  - Idempotent: lookup-by-email + upsert pattern.
 *  - No PDF artifact creation here. Report PDF seeding deferred.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  E1_DEMO_EMAILS,
  E1_LIFECYCLE_DEMO_SPECS,
  type E1DemoSpec,
} from "./e1LifecycleDemoSpecs";

const DEMO_SUFFIX = "@demo.rgs.local";

export interface E1SeedResult {
  ok: boolean;
  message: string;
  upserted: { key: string; email: string; id: string | null }[];
  errors: string[];
}

function assertDemoEmail(email: string) {
  if (!email.endsWith(DEMO_SUFFIX)) {
    throw new Error(`E1 seed refused: non-demo email rejected (${email})`);
  }
}

function specPatch(spec: E1DemoSpec): Record<string, unknown> {
  return {
    full_name: spec.full_name,
    business_name: spec.business_name,
    status: "active",
    payment_status: "paid",
    portal_unlocked: true,
    is_demo_account: true,
    account_kind: "demo",
    account_kind_notes: "E1 lifecycle demo — synthetic only.",
    lifecycle_notes: `E1 ${spec.lifecycle} — ${spec.purpose}`,
    learning_enabled: false,
    contributes_to_global_learning: false,
    learning_exclusion_reason: "E1 lifecycle demo / synthetic account",
    last_activity_at: new Date().toISOString(),
  };
}

export async function runE1LifecycleSeed(): Promise<E1SeedResult> {
  const result: E1SeedResult = {
    ok: true,
    message: "",
    upserted: [],
    errors: [],
  };

  for (const spec of E1_LIFECYCLE_DEMO_SPECS) {
    try {
      assertDemoEmail(spec.email);
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("email", spec.email)
        .maybeSingle();
      const patch = specPatch(spec);
      if (existing?.id) {
        const { error } = await (supabase.from("customers") as any).update(patch).eq("id", existing.id);
        if (error) result.errors.push(`${spec.key}: ${error.message}`);
        result.upserted.push({ key: spec.key, email: spec.email, id: existing.id });
      } else {
        const { data: created, error } = await (supabase.from("customers") as any)
          .insert({ email: spec.email, ...patch })
          .select("id")
          .single();
        if (error || !created) {
          result.errors.push(`${spec.key}: ${error?.message || "insert failed"}`);
          result.upserted.push({ key: spec.key, email: spec.email, id: null });
          result.ok = false;
        } else {
          result.upserted.push({ key: spec.key, email: spec.email, id: created.id as string });
        }
      }
    } catch (e: any) {
      result.errors.push(`${spec.key}: ${e?.message ?? String(e)}`);
      result.ok = false;
    }
  }

  result.message = result.ok
    ? "E1 lifecycle demo seeded. Re-run is safe."
    : "E1 lifecycle seed completed with errors — see details.";
  return result;
}

/**
 * Scoped reset for E1 lifecycle demo accounts only. Refuses to run
 * unless every email matches `@demo.rgs.local`. Never accepts a broad
 * filter by industry, date, or stage.
 */
export async function resetE1LifecycleDemo(): Promise<E1SeedResult> {
  const result: E1SeedResult = {
    ok: true,
    message: "",
    upserted: [],
    errors: [],
  };
  // Invariant: every targeted email must be a demo email. Fail closed.
  for (const email of E1_DEMO_EMAILS) assertDemoEmail(email);

  const { error } = await (supabase.from("customers") as any)
    .delete()
    .in("email", E1_DEMO_EMAILS)
    .eq("is_demo_account", true);
  if (error) {
    result.ok = false;
    result.errors.push(error.message);
    result.message = "E1 lifecycle reset failed.";
    return result;
  }
  result.message = `E1 lifecycle reset cleared ${E1_DEMO_EMAILS.length} scoped demo accounts.`;
  return result;
}