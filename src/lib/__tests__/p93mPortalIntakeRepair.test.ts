import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

const edge = read("supabase/functions/admin-account-links/index.ts");
const migration = read("supabase/migrations/20260513183000_portal_intake_repair.sql");
const industryFixMigration = read("supabase/migrations/20260513193000_portal_intake_industry_enum_cast_fix.sql");
const rpcReplayMigration = read("supabase/migrations/20260513205500_portal_intake_rpc_enum_guard_replay.sql");
const hook = read("src/hooks/useSignupRequestStatus.ts");
const panel = read("src/components/admin/SignupRequestsPanel.tsx");
const pendingAccounts = read("src/pages/admin/PendingAccounts.tsx");
const lib = read("src/lib/adminAccountLinks.ts");
const scorecardFollowup = read("supabase/functions/scorecard-followup/index.ts");

describe("P93M launch-blocking portal intake repair", () => {
  it("admin-account-links handles portal approvals directly instead of depending on the stale RPC path", () => {
    expect(edge).toMatch(/ADMIN_ACCOUNT_LINKS_VERSION = "b41b4f80-industry-safe-v2"/);
    expect(edge).toMatch(/adminAccountLinksVersion: ADMIN_ACCOUNT_LINKS_VERSION/);
    expect(edge).toMatch(/admin-account-links request/);
    expect(edge).toMatch(/action === "decide_signup_request"/);
    expect(edge).not.toMatch(/admin\.rpc\("admin_decide_signup_request"/);
    expect(edge).toMatch(/provisionCustomerForSignup/);
    expect(edge).toMatch(/decision === "approve_as_client"/);
    expect(edge).toMatch(/decision === "approve_as_demo"/);
  });

  it("client and demo approval create/link customers with industry-review safety for missing industry", () => {
    expect(edge).toMatch(/normalizeIndustryCategory/);
    expect(edge).toMatch(/VALID_INDUSTRY_CATEGORIES/);
    expect(edge).toMatch(/INDUSTRY_PLACEHOLDER_VALUES/);
    expect(edge).toMatch(/industryStatus\(cleaned\) === "valid"/);
    expect(edge).toMatch(/withIndustryIfValid/);
    expect(edge).toMatch(/needs_industry_review:\s*needsIndustryReview/);
    expect(edge).toMatch(/rawIndustryWasInvalid/);
    expect(edge).toMatch(/unsupported industry value/);
    expect(edge).toMatch(/Portal intake did not include industry/);
    expect(edge).toMatch(/resolvedIndustry = industry \?\? normalizeIndustryCategory\(reusable\.industry\)/);
    expect(edge).toMatch(/resolvedIndustry = industry \?\? normalizeIndustryCategory\(linkedCustomer\.industry\)/);
    expect(edge).toMatch(/industry_confirmed_by_admin:\s*false/);
    expect(edge).toMatch(/account_kind:\s*accountKind/);
    expect(edge).toMatch(/is_demo_account:\s*isDemo/);
    expect(edge).toMatch(/learning_exclusion_reason:\s*isDemo \? "Demo\/test account" : null/);
  });

  it("new-signup Create New reuses the same provisioner and does not create a dead-end lead row", () => {
    expect(edge).toMatch(/action === "create_customer_from_signup"/);
    expect(edge).toMatch(/getLatestSignupRequestForUser/);
    expect(edge).toMatch(/source:\s*"new_signup_queue"/);
    expect(edge).toMatch(/writeSignupRequestAudit/);
    expect(edge).toMatch(/ensureCustomerRole/);
    expect(edge).toMatch(/clearSignupDenial/);
  });

  it("Link to existing resolves the auth user, role, signup audit row, and customer timeline", () => {
    expect(edge).toMatch(/action === "link_signup_to_customer"/);
    expect(edge).toMatch(/auth\.admin\.getUserById\(rawUserId\)/);
    expect(edge).toMatch(/event_type:\s*"client_account_linked"/);
    expect(edge).toMatch(/status:\s*data\.account_kind === "demo" \|\| data\.is_demo_account \? "approved_demo" : "approved_client"/);
  });

  it("unresolved Portal Access Requests are not duplicated into Awaiting Customer Link", () => {
    expect(edge).toMatch(/\.from\("signup_requests"\)/);
    expect(edge).toMatch(/"pending_review", "clarification_requested", "denied", "suspended"/);
    expect(edge).toMatch(/!unresolvedRequests\.has\(u\.user_id\)/);
  });

  it("deny and suspend leave an auditable signup_request state and block portal access", () => {
    expect(edge).toMatch(/action === "deny_signup"/);
    expect(edge).toMatch(/status:\s*"denied"/);
    expect(edge).toMatch(/decision === "deny" \|\| decision === "suspend"/);
    expect(edge).toMatch(/status:\s*decision === "suspend" \? "suspended" : "inactive"/);
    expect(edge).toMatch(/portal_unlocked:\s*false/);
    expect(hook).toMatch(/request\?\.request_status === "denied" \|\| request\?\.request_status === "suspended"/);
    expect(hook).toMatch(/customerStatus === "suspended"/);
  });

  it("admin UI reports honest outcomes only after the function returns", () => {
    expect(lib).toMatch(/supabase\.functions\.invoke\("admin-account-links"/);
    expect(lib).toMatch(/demo_seed/);
    expect(panel).toMatch(/Approved as Client — customer linked and portal access enabled/);
    expect(panel).toMatch(/demo_seed\?\.ok/);
    expect(panel).toMatch(/Clarification requested — user remains safely blocked until review/);
    expect(panel).toMatch(/Request suspended — portal access remains blocked/);
    expect(panel).toMatch(/Request denied — portal access remains blocked/);
  });

  it("database migration keeps service-role RPC parity and the industry-review guard intact", () => {
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_decide_signup_request/);
    expect(industryFixMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_decide_signup_request/);
    expect(industryFixMigration).toMatch(/v_industry public\.industry_category/);
    expect(industryFixMigration).toMatch(/v_raw_industry text/);
    expect(industryFixMigration).toMatch(/enum_range\(NULL::public\.industry_category\)::text\[\]/);
    expect(industryFixMigration).toMatch(/v_industry := v_raw_industry::public\.industry_category/);
    expect(industryFixMigration).toMatch(/industry = COALESCE\(v_industry, industry\)/);
    expect(industryFixMigration).toMatch(/needs_industry_review = CASE[\s\S]*v_raw_industry IS NOT NULL AND v_industry IS NULL THEN true/);
    expect(industryFixMigration).toMatch(/result\.industry::text/);
    expect(industryFixMigration).toMatch(/GRANT EXECUTE ON FUNCTION public\.admin_decide_signup_request[\s\S]*TO service_role/);
    expect(industryFixMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.create_customer_from_signup/);
    expect(industryFixMigration).toMatch(/CREATE OR REPLACE FUNCTION public\.link_signup_to_customer/);
    expect(industryFixMigration).toMatch(/REVOKE ALL ON FUNCTION public\.create_customer_from_signup\(uuid\) FROM PUBLIC, anon, authenticated/);
    expect(industryFixMigration).toMatch(/REVOKE ALL ON FUNCTION public\.link_signup_to_customer\(uuid, uuid\) FROM PUBLIC, anon, authenticated/);
  });

  it("portal intake never writes arbitrary text into the industry_category enum", () => {
    expect(edge).not.toMatch(/const industry = cleanString\(args\.industry\)/);
    expect(edge).toMatch(/const rawIndustry = cleanString\(args\.industry\)/);
    expect(edge).toMatch(/const industry = normalizeIndustryCategory\(args\.industry\)/);
    expect(edge).toMatch(/industry:\s*payload\.industry/);
    expect(edge).toMatch(/normalizeIndustryCategory\(args\.industry\)[\s\S]*normalizeIndustryCategory\(\(existing as SignupRequestRow \| null\)\?\.industry\)/);
    expect(edge).toMatch(/Industry could not be saved because it is not a supported RGS industry category/);
    expect(edge).toMatch(/functionVersion: ADMIN_ACCOUNT_LINKS_VERSION/);
    expect(edge).toMatch(/details:\s*safeDetails/);
    expect(edge).toMatch(/version: ADMIN_ACCOUNT_LINKS_VERSION/);
    expect(lib).toMatch(/details\.targetEmail/);
    expect(lib).toMatch(/details\.industryStatus/);
    expect(industryFixMigration).not.toMatch(/v_industry text;/);
    expect(industryFixMigration).toMatch(/v_industry public\.industry_category;/);
    expect(industryFixMigration).toMatch(/v_raw_industry IS NOT NULL[\s\S]*v_industry IS NULL[\s\S]*unsupported industry value/);
    expect(rpcReplayMigration).toMatch(/Production still reported 42804/);
    expect(rpcReplayMigration).toMatch(/admin-account-links backend marker b41b4f80-industry-safe-v2/);
    expect(rpcReplayMigration).not.toMatch(/v_industry text;/);
    expect(rpcReplayMigration).toMatch(/v_industry public\.industry_category;/);
  });

  it("admin intake actions are row-scoped and require target-specific confirmation", () => {
    expect(panel).toMatch(/type ConfirmAction/);
    expect(panel).toMatch(/setConfirmAction\(\{ row, decision \}\)/);
    expect(panel).toMatch(/Target account/);
    expect(panel).toMatch(/Actions for \{r\.email\}/);
    expect(panel).toMatch(/You are about to approve \$\{email\} as Demo/);
    expect(panel).toMatch(/Confirm for \{confirmAction\.row\.email\}/);
    expect(panel).toMatch(/confirmAction\.row\.email/);
    expect(panel).toMatch(/busyAction === `\$\{confirmAction\.row\.id\}:\$\{confirmAction\.decision\}`/);
    expect(panel).toMatch(/rowErrors\[r\.id\]/);
    expect(panel).not.toMatch(/window\.confirm|window\.prompt/);

    expect(pendingAccounts).toMatch(/type PendingSignupAction/);
    expect(pendingAccounts).toMatch(/openPendingAction\(\{ kind: "create_new", signup: s \}\)/);
    expect(pendingAccounts).toMatch(/openPendingAction\(\{ kind: "link_existing", signup: s, customer: match \}\)/);
    expect(pendingAccounts).toMatch(/Pending signup/);
    expect(pendingAccounts).toMatch(/Actions for \{s\.email\}/);
    expect(pendingAccounts).toMatch(/You are about to create a customer for \$\{action\.signup\.email\}/);
    expect(pendingAccounts).toMatch(/Confirm for \{pendingAction\.signup\.email\}/);
    expect(pendingAccounts).toMatch(/pendingAction\.signup\.email/);
    expect(pendingAccounts).toMatch(/this exact customer record/);
    expect(pendingAccounts).toMatch(/rowErrors\[s\.user_id\]/);
    expect(pendingAccounts).toMatch(/busyAction\.startsWith\(`\$\{pendingAction\.signup\.user_id\}:/);
    expect(pendingAccounts).not.toMatch(/window\.confirm|window\.prompt/);
  });

  it("scorecard follow-up remains server-only and records honest email states", () => {
    expect(scorecardFollowup).toMatch(/DEFAULT_FOLLOWUP_FROM = "jmchubb@revenueandgrowthsystems\.com"/);
    expect(scorecardFollowup).toMatch(/RESEND_API_KEY/);
    expect(scorecardFollowup).toMatch(/skipped_missing_consent/);
    expect(scorecardFollowup).toMatch(/skipped_missing_config/);
    expect(scorecardFollowup).toMatch(/followUpEmailStatus/);
    expect(read("src/pages/Scorecard.tsx")).not.toMatch(/RESEND_API_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  });
});
