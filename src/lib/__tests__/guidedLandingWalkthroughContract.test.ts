import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const allMigrations = () =>
  readdirSync(join(root, "supabase/migrations"))
    .filter(f => f.endsWith(".sql"))
    .map(f => readFileSync(join(root, "supabase/migrations", f), "utf8"))
    .join("\n");

const APP = "src/App.tsx";
const WELCOME = "src/components/portal/GuidedClientWelcome.tsx";
const STAGE = "src/lib/clientStage.ts";
const ADMIN_PANEL = "src/components/admin/CommandGuidancePanel.tsx";
const WALK_LIB = "src/lib/toolWalkthroughVideos.ts";
const WALK_CARD = "src/components/portal/ToolWalkthroughCard.tsx";
const ADMIN_WALK = "src/pages/admin/WalkthroughVideosAdmin.tsx";
const DASH = "src/pages/portal/CustomerDashboard.tsx";

const BANNED: RegExp[] = [
  /fake testimonial/i, /fake case study/i, /trusted by/i,
  /real client results/i, /proven results/i,
  /guaranteed (revenue|ROI|results|improvement|stability|renewal|compliance|client success)/i,
  /RGS runs your business/i, /RGS handles everything/i,
  /done[- ]for[- ]you/i, /full[- ]service/i,
  /unlimited (support|consulting|advisory)/i, /emergency support/i,
  /AI advisor/i, /AI consultant/i, /Ask AI anything/i,
  /\blegal advice\b/i, /\btax advice\b/i, /\baccounting advice\b/i,
  /healthcare compliance/i, /patient care/i, /insurance claims/i, /HIPAA/i,
];

describe("Guided Landing + Walkthrough Framework contract", () => {
  it("client portal route exists and is protected", () => {
    const app = read(APP);
    expect(app).toMatch(/path="\/portal"[\s\S]*?<ProtectedRoute>[\s\S]*?CustomerDashboard/);
  });

  it("admin command route is protected by requireRole=admin", () => {
    const app = read(APP);
    expect(app).toMatch(/path="\/admin"[\s\S]*?requireRole="admin"[\s\S]*?AdminDashboard/);
  });

  it("admin walkthrough videos route is admin-only", () => {
    const app = read(APP);
    expect(app).toMatch(/\/admin\/walkthrough-videos[\s\S]*?requireRole="admin"[\s\S]*?WalkthroughVideosAdmin/);
  });

  it("client welcome includes stage, RGS doing, next step, and canonical sentence", () => {
    const w = read(WELCOME);
    const s = read(STAGE);
    expect(w).toMatch(/Where you are/);
    expect(w).toMatch(/What RGS is doing/);
    expect(w).toMatch(/Your next step/);
    expect(w).toMatch(/RGS_CANONICAL_PRODUCT_SENTENCE/);
    expect(s).toMatch(/Diagnostic finds the slipping gears/);
    expect(s).toMatch(/RGS Control System/);
  });

  it("client landing does not reference admin/internal/AI draft fields", () => {
    for (const f of [WELCOME, STAGE, WALK_CARD]) {
      const t = read(f);
      expect(t).not.toMatch(/internal_notes/);
      expect(t).not.toMatch(/admin_notes/);
      expect(t).not.toMatch(/admin_summary/);
      expect(t).not.toMatch(/ai_draft_content/);
    }
  });

  it("dashboard renders the guided welcome + walkthrough card", () => {
    const d = read(DASH);
    expect(d).toMatch(/GuidedClientWelcome/);
    expect(d).toMatch(/ToolWalkthroughCard/);
  });

  it("admin command guidance panel uses safe report/health signals", () => {
    const t = read(ADMIN_PANEL);
    expect(t).toMatch(/report_drafts/);
    expect(t).toMatch(/needs_review/);
    expect(t).toMatch(/client_health_records/);
    expect(t).toMatch(/attention_needed/);
    expect(t).toMatch(/renewal_risk_level/);
  });

  it("client walkthrough card uses the safe RPC, not direct table reads", () => {
    const t = read(WALK_CARD);
    const lib = read(WALK_LIB);
    expect(t).toMatch(/getClientWalkthroughVideos/);
    expect(lib).toMatch(/get_client_tool_walkthrough_videos/);
  });

  it("walkthrough table + RLS + RPC defined in migrations", () => {
    const sql = allMigrations();
    expect(sql).toMatch(/CREATE TABLE public\.tool_walkthrough_videos/);
    expect(sql).toMatch(/ALTER TABLE public\.tool_walkthrough_videos ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/Admins manage tool walkthrough videos/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.get_client_tool_walkthrough_videos/);
    expect(sql).toMatch(/video_status\s*=\s*'approved'/);
    expect(sql).toMatch(/client_visible\s*=\s*true/);
    expect(sql).toMatch(/archived_at IS NULL/);
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.get_client_tool_walkthrough_videos\(\) FROM PUBLIC, anon/);
  });

  it("walkthrough RPC return type does not include internal_notes", () => {
    const sql = allMigrations();
    const m = sql.match(/CREATE OR REPLACE FUNCTION public\.get_client_tool_walkthrough_videos[\s\S]*?\$\$;/);
    expect(m).toBeTruthy();
    expect(m![0]).not.toMatch(/internal_notes/);
    expect(m![0]).not.toMatch(/admin_notes/);
  });

  it("client UI surfaces 'Walkthrough video coming soon' fallback", () => {
    // Hardened in P66: fallback now reads "Walkthrough not published yet"
    // and is paired with a written "How to use this tool" guide.
    expect(read(WALK_CARD)).toMatch(/Walkthrough not published yet/);
  });

  it("admin walkthrough page warns against fabricated walkthroughs", () => {
    expect(read(ADMIN_WALK)).toMatch(/Do not publish placeholder or fabricated/i);
  });

  it("no banned scope-creep / fake-proof wording in touched files", () => {
    const files = [WELCOME, STAGE, ADMIN_PANEL, WALK_LIB, WALK_CARD, ADMIN_WALK];
    for (const f of files) {
      const text = read(f);
      for (const re of BANNED) {
        expect(text, `${f} matches ${re}`).not.toMatch(re);
      }
    }
  });

  it("no demo/fake video URLs introduced", () => {
    const files = [WELCOME, STAGE, ADMIN_PANEL, WALK_LIB, WALK_CARD, ADMIN_WALK];
    for (const f of files) {
      const text = read(f);
      expect(text).not.toMatch(/youtu\.?be\.com/i);
      expect(text).not.toMatch(/vimeo\.com/i);
      expect(text).not.toMatch(/example\.com/i);
    }
  });
});