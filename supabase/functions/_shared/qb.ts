/**
 * Shared QuickBooks helpers for edge functions.
 * Tokens are loaded/persisted via the service-role client and never returned
 * to callers. Honest about "not configured" when env is missing.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface QbEnv {
  configured: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** "sandbox" or "production". Defaults to sandbox for safety. */
  environment: "sandbox" | "production";
  apiBase: string;
}

export function loadQbEnv(): QbEnv {
  const clientId = Deno.env.get("QUICKBOOKS_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("QUICKBOOKS_CLIENT_SECRET") ?? "";
  const redirectUri = Deno.env.get("QUICKBOOKS_REDIRECT_URI") ?? "";
  const environment = (Deno.env.get("QUICKBOOKS_ENV") ?? "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
  const apiBase = environment === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
  return {
    configured: !!(clientId && clientSecret && redirectUri),
    clientId,
    clientSecret,
    redirectUri,
    environment,
    apiBase,
  };
}

export function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

/** Verify the caller owns this customer OR is an admin. */
export async function callerCanUseCustomer(
  admin: SupabaseClient,
  userId: string,
  customerId: string,
): Promise<boolean> {
  const { data: customer } = await admin
    .from("customers")
    .select("user_id")
    .eq("id", customerId)
    .maybeSingle();
  if (customer?.user_id === userId) return true;

  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  return (roles ?? []).some((r) => r.role === "admin");
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Refresh the access token if expired. Returns the connection row with a
 *  fresh access_token. Marks the connection `expired` if refresh fails. */
export async function ensureFreshToken(
  admin: SupabaseClient,
  env: QbEnv,
  connectionId: string,
): Promise<{ ok: true; access_token: string; realm_id: string } | { ok: false; reason: string }> {
  const { data: conn, error } = await admin
    .from("quickbooks_connections")
    .select("id, realm_id, access_token, refresh_token, access_token_expires_at")
    .eq("id", connectionId)
    .maybeSingle();
  if (error || !conn) return { ok: false, reason: "Connection not found" };

  const expiresAt = conn.access_token_expires_at ? new Date(conn.access_token_expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 30_000) {
    return { ok: true, access_token: conn.access_token, realm_id: conn.realm_id };
  }

  // Refresh.
  const tokenResp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${env.clientId}:${env.clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }).toString(),
  });
  if (!tokenResp.ok) {
    const txt = await tokenResp.text().catch(() => "");
    await admin
      .from("quickbooks_connections")
      .update({ status: "expired", last_error: `Refresh failed: ${txt.slice(0, 240)}` })
      .eq("id", connectionId);
    return { ok: false, reason: "Refresh failed" };
  }
  const tok = await tokenResp.json();
  const access = tok.access_token as string;
  const refresh = (tok.refresh_token as string) ?? conn.refresh_token;
  const accessExp = new Date(Date.now() + (Number(tok.expires_in ?? 3600) * 1000)).toISOString();
  const refreshExp = new Date(Date.now() + (Number(tok.x_refresh_token_expires_in ?? 8640000) * 1000)).toISOString();
  await admin
    .from("quickbooks_connections")
    .update({
      access_token: access,
      refresh_token: refresh,
      access_token_expires_at: accessExp,
      refresh_token_expires_at: refreshExp,
      status: "active",
      last_error: null,
    })
    .eq("id", connectionId);
  return { ok: true, access_token: access, realm_id: conn.realm_id };
}
