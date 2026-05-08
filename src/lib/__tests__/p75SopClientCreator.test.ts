/**
 * P75 — SOP / Training Bible Creator: client UI + AI assist contract.
 *
 * Locks the client-side authoring surface so future edits cannot
 * silently regress security, AI safety, or mobile usability.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");
const allMigrations = () => {
  const dir = path.join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(path.join(dir, f), "utf8"))
    .join("\n");
};
function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  for (const name of readdirSync(abs)) {
    const rel = path.join(dir, name);
    const full = path.join(abs, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(rel);
  }
  return out;
}

describe("P75 — SOP client creator contract", () => {
  it("portal route stays gated by ClientToolGuard with sop_training_bible key", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(
      /path="\/portal\/tools\/sop-training-bible"[\s\S]*ClientToolGuard\s+toolKey="sop_training_bible"/,
    );
  });

  it("client SOP page exposes a creator UI (not read-only)", () => {
    const f = read("src/pages/portal/tools/SopTrainingBible.tsx");
    expect(f).toMatch(/data-testid="client-sop-creator"/);
    expect(f).toMatch(/data-testid="sop-new"/);
    expect(f).toMatch(/data-testid="sop-save"/);
    expect(f).toMatch(/clientUpsertSopEntry/);
    expect(f).toMatch(/clientListOwnSopDrafts/);
    expect(f).toMatch(/clientDeleteSopDraft/);
    expect(f).toMatch(/callClientSopAi/);
  });

  it("client page never references admin notes or admin SOP service helpers", () => {
    const f = read("src/pages/portal/tools/SopTrainingBible.tsx");
    expect(f).not.toMatch(/internal_notes/);
    expect(f).not.toMatch(/adminListSopEntries|adminCreateSopEntry|adminUpdateSopEntry|adminArchiveSopEntry/);
    expect(f).not.toMatch(/from\(["']sop_training_entries/);
  });

  it("client page mounts MobileActionBar and adds bottom padding for sticky bar", () => {
    const f = read("src/pages/portal/tools/SopTrainingBible.tsx");
    expect(f).toMatch(/MobileActionBar/);
    expect(f).toMatch(/pb-24 md:pb-8/);
    expect(f).toMatch(/min-h-\[44px\]/);
  });

  it("client AI disclosure and professional review disclosure are visible in the UI", () => {
    const f = read("src/pages/portal/tools/SopTrainingBible.tsx");
    expect(f).toMatch(/data-testid="ai-disclosure"/);
    expect(f).toMatch(/created with AI assistance/);
    expect(f).toMatch(
      /does not provide legal, HR, OSHA, cannabis compliance, healthcare privacy, licensing, tax, accounting, or professional certification advice/,
    );
  });

  it("client helper module wires the right RPCs and edge function", () => {
    const f = read("src/lib/sopTrainingBible.ts");
    expect(f).toMatch(/rpc\(\s*["']client_list_own_sop_drafts["']/);
    expect(f).toMatch(/rpc\(\s*["']client_upsert_sop_entry["']/);
    expect(f).toMatch(/rpc\(\s*["']client_delete_sop_draft["']/);
    expect(f).toMatch(/functions\.invoke\(\s*\n?\s*["']client-sop-ai-assist["']/);
    expect(f).toMatch(/findForbiddenSopPhrases/);
  });

  it("forbidden phrase scrubber blocks unsafe claims", async () => {
    const mod = await import("@/lib/sopForbiddenPhrases");
    const hits = mod.findForbiddenSopPhrases({
      title: "Legally compliant payroll process",
      purpose: "Provides HR advice to staff",
      training_notes: "guaranteed safe",
    });
    expect(hits.length).toBeGreaterThanOrEqual(3);
    expect(hits.map((h) => h.phrase.toLowerCase())).toEqual(
      expect.arrayContaining(["legally compliant", "hr advice", "guaranteed"]),
    );
  });

  it("P75 migration locks down client RPCs with SECURITY DEFINER + REVOKE/GRANT", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/FUNCTION public\.client_upsert_sop_entry[\s\S]*SECURITY DEFINER/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.client_upsert_sop_entry[\s\S]*FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.client_upsert_sop_entry[\s\S]*TO authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.client_delete_sop_draft\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.client_delete_sop_draft\(uuid\) TO authenticated/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.client_list_own_sop_drafts\(uuid\) FROM PUBLIC/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.client_list_own_sop_drafts\(uuid\) TO authenticated/);
  });

  it("client_upsert_sop_entry forces client_visible=false and does not accept admin notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.client_upsert_sop_entry[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    const body = m![0];
    expect(body).toMatch(/client_visible\s*=\s*false/);
    expect(body).not.toMatch(/_internal_notes/);
    expect(body).not.toMatch(/internal_notes\s*=\s*_/);
    expect(body).toMatch(/created_by_role/);
  });

  it("client_list_own_sop_drafts return columns do not include internal_notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.client_list_own_sop_drafts[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
  });

  it("client SOP RLS lets the owning client read their own drafts but not other tenants", () => {
    const sql = allMigrations();
    expect(sql).toMatch(
      /Client read own drafts sop_training_entries[\s\S]*user_owns_customer\(auth\.uid\(\), customer_id\)[\s\S]*created_by_role = 'client'[\s\S]*created_by = auth\.uid\(\)/,
    );
  });

  it("client-sop-ai-assist edge function reads API key only server-side and verifies ownership", () => {
    const f = read("supabase/functions/client-sop-ai-assist/index.ts");
    expect(f).toMatch(/Deno\.env\.get\("LOVABLE_API_KEY"\)/);
    expect(f).toMatch(/user_owns_customer/);
    expect(f).toMatch(/Authentication required/);
    expect(f).toMatch(/ai\.gateway\.lovable\.dev\/v1\/chat\/completions/);
    // Lean / process-efficiency thinking
    expect(f).toMatch(/Six Sigma/);
    // Human, non-generic voice
    expect(f).toMatch(/Calm, plain-English, owner-respecting/);
    // Client-safety
    expect(f).toMatch(/Never use "certified", "guaranteed", "compliant"/);
    // Disclosures returned to client
    expect(f).toMatch(/created with AI assistance/);
    expect(f).toMatch(/professional_review_disclosure/);
  });

  it("frontend code never reads or assigns AI provider secrets", () => {
    const offenders: string[] = [];
    // Only flag actual reads/usages of the secret, not admin help-text mentions.
    const banned =
      /(?:env\.[A-Z_]*?(?:LOVABLE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)|process\.env\.(?:LOVABLE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)|Bearer\s+\$\{(?:LOVABLE_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY))/;
    for (const root of ["src"]) {
      for (const rel of walk(root)) {
        if (rel.includes("__tests__")) continue;
        const c = read(rel);
        if (banned.test(c)) offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("SOP creator surfaces no banned positioning wording (deprecated construction metaphor)", () => {
    const banned = [
      new RegExp(["provides the blueprint and teaches the owner to", "lay", "the", "bricks"].join(" "), "i"),
      new RegExp(["teaches the owner to", "lay", "the", "bricks"].join(" "), "i"),
      new RegExp(["lay", "the", "bricks"].join(" "), "i"),
      /Mirror,\s*Not the Map/i,
    ];
    for (const rel of [
      "src/pages/portal/tools/SopTrainingBible.tsx",
      "src/lib/sopTrainingBible.ts",
      "src/lib/sopForbiddenPhrases.ts",
      "supabase/functions/client-sop-ai-assist/index.ts",
    ]) {
      const c = read(rel);
      for (const b of banned) expect(c, `${rel}: ${b}`).not.toMatch(b);
    }
  });
});