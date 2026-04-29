import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(
  join(root, "supabase/migrations/20260429041000_p14_supabase_security_hardening.sql"),
  "utf8",
);
const advisorFollowup = readFileSync(
  join(root, "supabase/migrations/20260429053500_p14_advisor_followup.sql"),
  "utf8",
);
const browserRpcGrantRemoval = readFileSync(
  join(root, "supabase/migrations/20260429055500_p14_remove_browser_admin_rpc_grants.sql"),
  "utf8",
);
const vaultQuickbooksKey = readFileSync(
  join(root, "supabase/migrations/20260429061000_p14_vault_quickbooks_key.sql"),
  "utf8",
);
const diagnosticInsertGuard = readFileSync(
  join(root, "supabase/migrations/20260429061200_p14_diagnostic_interview_public_insert_guard.sql"),
  "utf8",
);
const advisorFinalClamp = readFileSync(
  join(root, "supabase/migrations/20260429165000_p14_advisor_final_clamp.sql"),
  "utf8",
);

describe("P14 Supabase security hardening migration", () => {
  it("encrypts QuickBooks OAuth tokens and removes plaintext values", () => {
    expect(migration).toContain("access_token_ciphertext bytea");
    expect(migration).toContain("refresh_token_ciphertext bytea");
    expect(migration).toContain("pgp_sym_encrypt(access_token");
    expect(migration).toContain("access_token = NULL");
    expect(migration).toContain("refresh_token = NULL");
  });

  it("keeps token decrypt/encrypt RPCs service-role only", () => {
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM PUBLIC",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.qb_get_connection_tokens(uuid) FROM authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.qb_get_connection_tokens(uuid) TO service_role",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) FROM authenticated",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.qb_store_connection_tokens(uuid, text, text) TO service_role",
    );
  });

  it("adds client read access only for each user's own tool usage sessions", () => {
    const combined = `${migration}\n${advisorFollowup}`;
    expect(combined).toContain("ALTER TABLE public.tool_usage_sessions ENABLE ROW LEVEL SECURITY");
    expect(combined).toContain('CREATE POLICY "Clients read own tool_usage_sessions"');
    expect(combined).toContain("user_id = auth.uid()");
    expect(combined).toContain("public.user_owns_customer(auth.uid(), customer_id)");
    expect(combined).toContain("idx_tus_user_customer_started");
  });

  it("keeps the QuickBooks token table behind RLS and service-role table access", () => {
    expect(migration).toContain("ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated");
    expect(migration).toContain('CREATE POLICY "Service role manages quickbooks_connections"');
    expect(migration).toContain("GRANT ALL ON TABLE public.quickbooks_connections TO service_role");
  });

  it("uses a static advisor-followup migration to revoke broad function execution grants", () => {
    expect(advisorFollowup).toContain("ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC");
    expect(advisorFollowup).toContain("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC");
    expect(advisorFollowup).toContain("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon");
    expect(advisorFollowup).toContain("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated");
    expect(advisorFollowup).toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role");
  });

  it("removes direct browser EXECUTE grants from admin account-linking RPCs", () => {
    const fns = [
      "list_unlinked_signups()",
      "list_auth_users_for_link(text)",
      "create_customer_from_signup(uuid)",
      "link_signup_to_customer(uuid, uuid)",
      "repair_customer_links()",
      "set_customer_user_link(uuid, uuid, boolean)",
      "deny_signup(uuid, text)",
      "undeny_signup(uuid)",
    ];
    for (const fn of fns) {
      expect(browserRpcGrantRemoval).toContain(`REVOKE ALL ON FUNCTION public.${fn} FROM authenticated`);
      expect(browserRpcGrantRemoval).toContain(`GRANT EXECUTE ON FUNCTION public.${fn} TO service_role`);
    }
  });

  it("does not expose token values through the safe QuickBooks status view", () => {
    const viewStart = migration.indexOf("CREATE OR REPLACE VIEW public.quickbooks_connection_status");
    const viewEnd = migration.indexOf("REVOKE ALL ON TABLE public.quickbooks_connection_status");
    const viewSql = migration.slice(viewStart, viewEnd);
    expect(viewSql).toContain("realm_id");
    expect(viewSql).toContain("company_name");
    expect(viewSql).toContain("status");
    expect(viewSql).not.toContain("access_token_ciphertext");
    expect(viewSql).not.toContain("refresh_token_ciphertext");
    expect(viewSql).not.toContain(`${["access", "token"].join("_")},`);
    expect(viewSql).not.toContain(`${["refresh", "token"].join("_")},`);
  });

  it("keeps the QuickBooks token encryption key in Supabase Vault, not a co-located table", () => {
    const combined = `${migration}\n${vaultQuickbooksKey}`;
    const legacyTable = ["public", ["app_private", "secrets"].join("_")].join(".");
    expect(combined).toContain("CREATE EXTENSION IF NOT EXISTS supabase_vault");
    expect(combined).toContain("vault.create_secret");
    expect(combined).toContain("vault.decrypted_secrets");
    expect(combined).toContain("public.qb_token_encryption_key()");
    expect(combined).not.toContain(`CREATE TABLE IF NOT EXISTS ${legacyTable}`);
    expect(combined).not.toContain(legacyTable);
  });

  it("clamps public diagnostic interview inserts to raw answers only", () => {
    expect(diagnosticInsertGuard).toContain("CREATE TRIGGER diagnostic_interview_public_insert_guard_trg");
    expect(diagnosticInsertGuard).toContain("NEW.admin_brief := '{}'::jsonb");
    expect(diagnosticInsertGuard).toContain("NEW.evidence_map := '[]'::jsonb");
    expect(diagnosticInsertGuard).toContain("NEW.system_dependency_map := '[]'::jsonb");
    expect(diagnosticInsertGuard).toContain("NEW.validation_checklist := '[]'::jsonb");
    expect(diagnosticInsertGuard).toContain("NEW.missing_information := '[]'::jsonb");
    expect(diagnosticInsertGuard).toContain("NEW.confidence := 'low'");
    expect(diagnosticInsertGuard).toContain("octet_length(answers::text) <= 50000");
    expect(diagnosticInsertGuard).toContain("REVOKE UPDATE ON public.diagnostic_interview_runs FROM authenticated");
  });

  it("does not expose the diagnostic insert guard as a callable RPC", () => {
    expect(diagnosticInsertGuard).toContain(
      "REVOKE ALL ON FUNCTION public.diagnostic_interview_public_insert_guard() FROM PUBLIC",
    );
    expect(diagnosticInsertGuard).toContain(
      "REVOKE ALL ON FUNCTION public.diagnostic_interview_public_insert_guard() FROM authenticated",
    );
    expect(diagnosticInsertGuard).toContain(
      "GRANT EXECUTE ON FUNCTION public.diagnostic_interview_public_insert_guard() TO service_role",
    );
  });

  it("moves public SECURITY DEFINER helper logic behind private-schema invoker wrappers", () => {
    expect(advisorFinalClamp).toContain("CREATE SCHEMA IF NOT EXISTS private");
    expect(advisorFinalClamp).toContain("CREATE OR REPLACE FUNCTION private.is_admin");
    expect(advisorFinalClamp).toContain("SECURITY DEFINER");
    expect(advisorFinalClamp).toContain("CREATE OR REPLACE FUNCTION public.is_admin");
    expect(advisorFinalClamp).toContain("SECURITY INVOKER");
    expect(advisorFinalClamp).toContain(
      "SELECT * FROM private.get_effective_tools_for_customer(_customer_id)",
    );
    expect(advisorFinalClamp).toContain(
      "REVOKE ALL ON FUNCTION public.get_effective_tools_for_customer(uuid) FROM PUBLIC",
    );
  });

  it("moves QuickBooks token ciphertext out of the public API schema", () => {
    expect(advisorFinalClamp).toContain("CREATE TABLE IF NOT EXISTS private.quickbooks_connection_tokens");
    expect(advisorFinalClamp).toContain("DROP COLUMN IF EXISTS access_token_ciphertext");
    expect(advisorFinalClamp).toContain("DROP COLUMN IF EXISTS refresh_token_ciphertext");
    expect(advisorFinalClamp).toContain("FROM private.quickbooks_connection_tokens qct");
    expect(advisorFinalClamp).toContain("REVOKE ALL ON TABLE private.quickbooks_connection_tokens FROM authenticated");
  });

  it("explicitly enables RLS and safe grants on QuickBooks advisor tables", () => {
    expect(advisorFinalClamp).toContain("ALTER TABLE public.quickbooks_connections ENABLE ROW LEVEL SECURITY");
    expect(advisorFinalClamp).toContain("ALTER TABLE public.quickbooks_webhook_events ENABLE ROW LEVEL SECURITY");
    expect(advisorFinalClamp).toContain("ALTER TABLE public.quickbooks_sync_jobs ENABLE ROW LEVEL SECURITY");
    expect(advisorFinalClamp).toContain("REVOKE ALL ON TABLE public.quickbooks_connections FROM authenticated");
    expect(advisorFinalClamp).toContain("GRANT SELECT ON TABLE public.quickbooks_webhook_events TO authenticated");
    expect(advisorFinalClamp).toContain("GRANT SELECT ON TABLE public.quickbooks_sync_jobs TO authenticated");
  });
});
