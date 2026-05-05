/**
 * Implementation Completion Add-On — contract tests.
 * Verifies AI SOP backend boundary, admin-only gating, dedupe shape,
 * default visibility, and docs presence.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("sop-ai-assist edge function", () => {
  const src = read("supabase/functions/sop-ai-assist/index.ts");

  it("requires admin auth before reading the AI key", () => {
    const a = src.indexOf("await requireAdmin(req, corsHeaders)");
    const k = src.indexOf('Deno.env.get("LOVABLE_API_KEY")');
    expect(a).toBeGreaterThan(-1);
    expect(k).toBeGreaterThan(-1);
    expect(a).toBeLessThan(k);
  });

  it("forces admin-only defaults and never sets client_visible true", () => {
    expect(src).toContain('client_visible: false');
    expect(src).toContain('status: "draft"');
    expect(src).toContain('review_required: true');
    expect(src).not.toMatch(/client_visible:\s*true/);
    expect(src).not.toMatch(/status:\s*["']approved["']/);
  });

  it("includes RGS scope/safety guardrails (no legal/HIPAA/guarantees/unlimited)", () => {
    expect(src).toMatch(/legal, tax, accounting, HR/);
    expect(src).toMatch(/Not healthcare, not patient care, not HIPAA/);
    expect(src).toMatch(/Do NOT promise outcomes/);
    expect(src).toMatch(/unlimited support/);
  });

  it("logs runs into ai_run_logs (no new logging system)", () => {
    expect(src).toContain('"ai_run_logs"');
    expect(src).toContain('feature: "sop_ai_assist"');
  });
});

describe("Frontend never holds AI secrets for SOP assist", () => {
  const files = walk(resolve(root, "src"));
  const ALLOWED = new Set([
    resolve(root, "src/lib/__tests__/aiAssistWiringContract.test.ts"),
    resolve(root, "src/lib/__tests__/implementationCompletionAddOn.test.ts"),
    resolve(root, "src/lib/__tests__/reportGeneratorTieringContract.test.ts"),
    resolve(root, "src/lib/__tests__/edgeFunctionSecurity.test.ts"),
    resolve(root, "src/lib/__tests__/aiPromptVoiceContract.test.ts"),
    resolve(root, "src/lib/__tests__/p75ARgsAiBrainRegistry.test.ts"),
  ]);
  it("no frontend file calls the AI gateway directly", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (ALLOWED.has(f)) continue;
      const s = readFileSync(f, "utf8");
      if (/ai\.gateway\.lovable\.dev/.test(s) || /Deno\.env\.get\(["']LOVABLE_API_KEY["']\)/.test(s)) offenders.push(f);
    }
    expect(offenders, offenders.join(",")).toHaveLength(0);
  });
  it("SOP admin invokes the edge function via supabase.functions.invoke", () => {
    const seed = read("src/lib/implementationSeed.ts");
    expect(seed).toContain('supabase.functions.invoke("sop-ai-assist"');
  });
});

describe("Implementation seed/bulk/reorder helpers", () => {
  const seed = read("src/lib/implementationSeed.ts");
  it("seeded roadmap items default to admin-only (client_visible:false)", () => {
    expect(seed).toMatch(/seedRoadmapFromPriorityActions[\s\S]*client_visible: false/);
  });
  it("preserves source IDs from priority actions on seeded roadmap items", () => {
    expect(seed).toContain("source_priority_action_item_id: p.source_id");
  });
  it("skips duplicates (preview marks them and seeder filters them)", () => {
    expect(seed).toContain("duplicate: existingSourceIds.has(a.id)");
    expect(seed).toMatch(/if \(p\.duplicate\) \{ skipped \+= 1; continue; \}/);
  });
  it("bulk tracker entries default not client-visible and do not change access gates", () => {
    expect(seed).toMatch(/bulkCreateTrackerFromEffectiveTools[\s\S]*client_visible: false/);
    expect(seed).not.toMatch(/grant_access|revoke_access|setToolAccess/);
  });
  it("reorder writes via the existing admin update path", () => {
    expect(seed).toContain("adminUpdateRoadmapItem(id, { sort_order:");
  });
});

describe("Migration adds source link + dedupe guards", () => {
  const dir = resolve(root, "supabase/migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(join(dir, f), "utf8"));
  const all = files.join("\n");
  it("adds source_priority_action_item_id column to implementation_roadmap_items", () => {
    expect(all).toMatch(/ADD COLUMN IF NOT EXISTS source_priority_action_item_id/);
  });
  it("adds unique guards for seeded items and active tracker entries", () => {
    expect(all).toMatch(/uniq_impl_roadmap_items_pat_source/);
    expect(all).toMatch(/uniq_tool_training_tracker_active/);
  });
});

describe("Docs", () => {
  const md = read("docs/rgs-implementation-tool-deep-hardening.md");
  it("mentions the SOP AI assist + auto-seed + bulk tracker + reorder", () => {
    expect(md).toMatch(/SOP AI/i);
    expect(md).toMatch(/Auto-seed|Seed roadmap/i);
    expect(md).toMatch(/Bulk.{0,20}tracker/i);
    expect(md).toMatch(/Reorder|sort_order/i);
  });
});
