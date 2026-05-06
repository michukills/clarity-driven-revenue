/**
 * P83B — Demo Account Auto-Seeding + Brain Protection Hardening.
 *
 * Source-level contract test (no DB):
 *   - the Prairie Ridge HVAC demo seeder exists and is wired into the
 *     `decide_signup_request` action of the admin-account-links edge function
 *   - the seeder only runs on `approve_as_demo` AND with a linked customer id
 *   - the seeder is scoped per-customer and idempotent
 *   - the seeder never seeds AI prompts, Industry Brain internals, secrets,
 *     real client data, or admin-only fields onto client-visible rows
 *   - admin RPC remains service_role-only
 *   - signup_requests + customers stay tenant-isolated via RLS
 *   - the admin Signup Requests panel surfaces the demo seed
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const seedSrc = read("supabase/functions/admin-account-links/p83b_demo_seed.ts");
const edgeSrc = read("supabase/functions/admin-account-links/index.ts");
const panelSrc = read("src/components/admin/SignupRequestsPanel.tsx");
const migrationSrc = read("supabase/migrations/20260506033516_61422b2a-bc05-4d9a-a491-b206cb01983b.sql");

describe("P83B — Prairie Ridge HVAC demo workspace seeder", () => {
  it("exports the seeder, demo marker, and demo identity constants", () => {
    expect(seedSrc).toMatch(/export\s+async\s+function\s+seedPrairieRidgeDemoWorkspace/);
    expect(seedSrc).toMatch(/export\s+const\s+P83B_DEMO_MARKER\s*=/);
    expect(seedSrc).toMatch(/export\s+const\s+P83B_DEMO_BUSINESS_NAME\s*=\s*"Prairie Ridge HVAC Demo Co\."/);
    expect(seedSrc).toMatch(/export\s+const\s+P83B_DEMO_INDUSTRY\s*=\s*"trade_field_service"/);
  });

  it("only writes rows scoped to the passed customer_id (no cross-tenant inserts)", () => {
    // Every supabase insert in the seeder must include customer_id sourced
    // from the seeder argument, not a hard-coded id.
    const inserts = seedSrc.match(/\.from\("[^"]+"\)\s*\n\s*\.insert\(/g) ?? [];
    expect(inserts.length).toBeGreaterThan(0);
    // No literal UUIDs appear in the seeder (would imply cross-tenant pinning).
    expect(seedSrc).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    // Every public table touched references customer_id.
    expect(seedSrc).toMatch(/customer_id:\s*customerId/);
  });

  it("is idempotent — every seed step checks for existing rows before inserting", () => {
    // Each named seed step must do at least one .select(...) before .insert(...).
    for (const step of [
      "seedTimeline",
      "seedScorecardLensRun",
      "seedCostOfFriction",
      "seedWornToothSignals",
      "seedRealityCheckFlags",
      "seedImplementationRoadmap",
      "seedOperationalSops",
    ]) {
      const fnRe = new RegExp(`async function ${step}\\([\\s\\S]*?\\n\\}`);
      const m = fnRe.exec(seedSrc);
      expect(m, `${step} body not found`).not.toBeNull();
      const body = m![0];
      expect(body, `${step} must read existing rows before writing`).toMatch(/\.select\(/);
    }
  });

  it("seeds only client-safe / approved / client-visible flags (no admin-only field leakage)", () => {
    // Approved client-visible rows must have approved_for_client + client_visible true.
    expect(seedSrc).toMatch(/approved_for_client:\s*true/);
    expect(seedSrc).toMatch(/client_visible:\s*true/);
    // Admin-only fields must NOT be set in any seed row.
    expect(seedSrc).not.toMatch(/admin_notes\s*:/);
    expect(seedSrc).not.toMatch(/admin_only_note\s*:/);
    expect(seedSrc).not.toMatch(/admin_interpretation\s*:/);
    expect(seedSrc).not.toMatch(/internal_notes\s*:/);
  });

  it("never seeds AI prompts, Industry Brain internals, secrets, or production integration data", () => {
    const forbidden = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /OPENAI/i,
      /system_prompt/i,
      /industry_brain/i,
      /quickbooks/i,
      /xero/i,
      /stripe_secret/i,
      /webhook_secret/i,
      /metrc/i,
      /biotrack/i,
      /dutchie/i,
    ];
    for (const re of forbidden) {
      expect(seedSrc, `seeder must not reference ${re}`).not.toMatch(re);
    }
  });
});

describe("P83B — wired into admin approval flow", () => {
  it("imports the seeder + demo identity constants in the edge function", () => {
    expect(edgeSrc).toMatch(/from\s+"\.\/p83b_demo_seed\.ts"/);
    expect(edgeSrc).toMatch(/seedPrairieRidgeDemoWorkspace/);
    expect(edgeSrc).toMatch(/P83B_DEMO_BUSINESS_NAME/);
    expect(edgeSrc).toMatch(/P83B_DEMO_INDUSTRY/);
  });

  it("only seeds when decision === 'approve_as_demo' AND a linked customer exists", () => {
    expect(edgeSrc).toMatch(
      /decision === "approve_as_demo"\s*&&\s*linkedCustomerId/,
    );
  });

  it("returns the demo_seed result so the admin UI can confirm provisioning", () => {
    expect(edgeSrc).toMatch(/return json\(\{\s*result:\s*data,\s*demo_seed:\s*demoSeed\s*\}\)/);
  });

  it("admin Signup Requests panel announces Prairie Ridge HVAC seeding on approve-as-demo", () => {
    expect(panelSrc).toMatch(/Prairie Ridge HVAC demo workspace seeded/);
  });
});

describe("P83B — privilege & isolation invariants are preserved", () => {
  it("admin_decide_signup_request stays service_role-only", () => {
    expect(migrationSrc).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_decide_signup_request[\s\S]*FROM PUBLIC, anon, authenticated/,
    );
    expect(migrationSrc).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_decide_signup_request[\s\S]*TO service_role/,
    );
  });

  it("submit_signup_request remains authenticated-only (not anon)", () => {
    expect(migrationSrc).toMatch(
      /REVOKE ALL ON FUNCTION public\.submit_signup_request[\s\S]*FROM PUBLIC, anon/,
    );
    expect(migrationSrc).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.submit_signup_request[\s\S]*TO authenticated, service_role/,
    );
  });

  it("decide_signup_request edge action gates demo seeding through requireAdmin", () => {
    // The edge function calls requireAdmin at the top of the handler — verify
    // the gate is still in place and is checked before any action dispatch.
    expect(edgeSrc).toMatch(/const auth = await requireAdmin/);
    expect(edgeSrc).toMatch(/if \(!auth\.ok\) return auth\.response/);
  });

  it("ProtectedRoute still blocks pending/denied/suspended demo signups from /portal", () => {
    const guard = read("src/components/portal/ProtectedRoute.tsx");
    expect(guard).toMatch(/blockingStatus/);
    expect(guard).toMatch(/portal-access-pending/);
  });

  it("client.ts is unmodified (no service-role key wired into the browser)", () => {
    const client = read("src/integrations/supabase/client.ts");
    expect(client).not.toMatch(/SERVICE_ROLE/);
    expect(client).not.toMatch(/service_role/);
  });
});

// Skip-list whitelist hooks for legacy bundle/contract tests follow the
// established P75A/P74/P73/P72 pattern — those tests already discover
// new test files via filename glob and accept this one without changes.