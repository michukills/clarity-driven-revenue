import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

describe("Campaign Control security and connection proof contract", () => {
  const sql = read("supabase/migrations/20260514120000_campaign_control_core.sql");
  const app = read("src/App.tsx");
  const adminPage = read("src/pages/admin/CampaignControl.tsx");
  const rgsPage = read("src/pages/admin/RgsMarketingControl.tsx");
  const clientPage = read("src/pages/portal/tools/CampaignControl.tsx");
  const edge = read("supabase/functions/generate-campaign-assets/index.ts");

  it("creates the customer-scoped campaign tables and enables RLS", () => {
    for (const table of [
      "campaign_profiles",
      "campaign_briefs",
      "campaign_assets",
      "campaign_events",
      "campaign_performance",
      "campaign_learning_summaries",
      "campaign_connection_proofs",
    ]) {
      expect(sql).toMatch(new RegExp(`create table if not exists public\\.${table}`));
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} enable row level security`));
    }
  });

  it("guards client access through a client-safe RPC that excludes admin-only notes", () => {
    expect(sql).toMatch(/create or replace function public\.get_client_campaign_control/);
    expect(sql).toMatch(/public\.user_owns_customer\(v_uid, _customer_id\)/);
    const rpcBody = sql.slice(sql.indexOf("create or replace function public.get_client_campaign_control"));
    expect(rpcBody).not.toMatch(/admin_notes', b\.admin_notes/);
    expect(rpcBody).not.toMatch(/admin_only_rationale', a\.admin_only_rationale/);
    expect(rpcBody).toMatch(/client_visible = true/);
  });

  it("requires proof before GA4/platform imports or posted-via-integration status can be recorded", () => {
    expect(sql).toMatch(/campaign_assert_connection_proof/);
    expect(sql).toMatch(/new\.data_source in \('GA4','platform_import'\)/);
    expect(sql).toMatch(/p\.workspace_scope = 'rgs_internal'/);
    expect(sql).toMatch(/Verified campaign connection proof is required/);
    expect(sql).toMatch(/new\.publishing_status = 'posted_via_integration'/);
  });

  it("routes admin and client Campaign Control through existing role gates", () => {
    expect(app).toMatch(/\/admin\/campaign-control[\s\S]*requireRole="admin"/);
    expect(app).toMatch(/\/admin\/customers\/:customerId\/campaign-control[\s\S]*requireRole="admin"/);
    expect(app).toMatch(/\/portal\/tools\/campaign-control[\s\S]*ClientToolGuard toolKey="campaign_control_system"/);
    expect(app).toMatch(/\/admin\/rgs-marketing-control[\s\S]*requireRole="admin"/);
  });

  it("keeps the RGS marketing workspace admin-only and separated from customer/client data", () => {
    expect(sql).toMatch(/workspace_scope text not null default 'customer'/);
    expect(sql).toMatch(/rgs_workspace_key text/);
    expect(sql).toMatch(/workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null/);
    expect(rgsPage).toMatch(/RGS_MARKETING_WORKSPACE_KEY/);
    expect(rgsPage).toMatch(/adminListRgsCampaignProfiles/);
    expect(rgsPage).not.toMatch(/getClientCampaignControl/);
    expect(clientPage).not.toMatch(/rgs_workspace_key/);
  });

  it("entitles client access through the existing RGS Control System / Revenue Control Center lane, not a separate add-on", () => {
    expect(sql).toMatch(/'campaign_control_system'[\s\S]*'rgs_control_system'[\s\S]*'rcs_ongoing_visibility'/);
    expect(sql).toMatch(/v_campaign_control_center_active/);
    expect(sql).toMatch(/v_package_ongoing_support/);
    expect(sql).toMatch(/v_package_revenue_tracker/);
    expect(sql).toMatch(/control_center_package_active/);
    expect(sql).not.toMatch(/v_campaign_addon_active/);
    expect(sql).not.toMatch(/v_package_addons/);
  });

  it("admin UI exposes explicit connection-proof and manual fallback states", () => {
    expect(adminPage).toMatch(/Connection proof/);
    expect(adminPage).toMatch(/No proven analytics or publishing connection yet/);
    expect(adminPage).toMatch(/Manual posting\/tracking unless a connection proof is recorded/);
    expect(adminPage).toMatch(/Mark posted manually/);
    expect(adminPage).not.toMatch(/posted_via_integration/);
  });

  it("client UI only shows approved/client-safe campaign records and no admin rationale", () => {
    expect(clientPage).toMatch(/Only admin-approved, client-visible briefs appear here/);
    expect(clientPage).not.toMatch(/admin_only_rationale/);
    expect(clientPage).not.toMatch(/admin_notes/);
  });

  it("lets clients submit campaign inputs through a guarded Control Center RPC without generation or publishing authority", () => {
    expect(sql).toMatch(/create or replace function public\.upsert_client_campaign_profile_inputs/);
    expect(sql).toMatch(/public\.user_owns_customer\(v_uid, _customer_id\)/);
    expect(sql).toMatch(/requires_rgs_review/);
    expect(clientPage).toMatch(/clientSubmitCampaignInputs/);
    expect(clientPage).toMatch(/Campaign inputs/);
    expect(clientPage).toMatch(/Save inputs/);
    expect(clientPage).not.toMatch(/generateCampaignAssetsWithAi/);
    expect(clientPage).not.toMatch(/approval_status:\s*"approved"/);
    expect(clientPage).not.toMatch(/posted_via_integration/);
  });

  it("edge function is admin-authenticated, customer-scoped, and never auto-approves or auto-posts", () => {
    expect(edge).toMatch(/requireAdmin\(req,\s*corsHeaders\)/);
    expect(edge).toMatch(/\.eq\("customer_id", customerId\)/);
    expect(edge).toMatch(/approval_status/);
    expect(edge).toMatch(/publishing_status: "manual_only"/);
    expect(edge).toMatch(/campaign_events/);
    expect(edge).not.toMatch(/client_visible:\s*true/);
  });
});
