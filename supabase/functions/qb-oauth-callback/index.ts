/**
 * qb-oauth-callback — Intuit redirects the user's browser here after
 * they approve the connection. Validates `state`, exchanges the code
 * for tokens, persists them server-side, then bounces the user back to
 * the portal Connected Sources page with a result flag.
 *
 * verify_jwt = false (set in supabase/config.toml) because Intuit's
 * redirect carries no Supabase JWT.
 */
import { adminClient, corsHeaders, loadQbEnv } from "../_shared/qb.ts";

function htmlRedirect(url: string): Response {
  return new Response(
    `<!doctype html><meta http-equiv="refresh" content="0;url=${url}"><title>Redirecting…</title>`,
    {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      status: 302,
    },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const realmId = url.searchParams.get("realmId");
  const errorParam = url.searchParams.get("error");

  // Use the redirect_uri host as the portal base unless overridden.
  const env = loadQbEnv();
  const portalBase = (() => {
    const explicit = Deno.env.get("QUICKBOOKS_PORTAL_BASE");
    if (explicit) return explicit.replace(/\/$/, "");
    if (env.redirectUri) {
      try {
        const u = new URL(env.redirectUri);
        return `${u.protocol}//${u.host}`;
      } catch { /* ignore */ }
    }
    return "";
  })();

  const finishUrl = (status: "ok" | "error", msg?: string) => {
    const target = new URL(`${portalBase || ""}/portal/connected-sources`);
    target.searchParams.set("qb", status);
    if (msg) target.searchParams.set("msg", msg);
    return htmlRedirect(target.toString());
  };

  if (errorParam) return finishUrl("error", errorParam);
  if (!code || !state || !realmId) return finishUrl("error", "missing_params");
  if (!env.configured) return finishUrl("error", "not_configured");

  const admin = adminClient();

  // Validate state.
  const { data: stateRow, error: stateErr } = await admin
    .from("quickbooks_oauth_states")
    .select("customer_id, expires_at")
    .eq("state", state)
    .maybeSingle();
  if (stateErr || !stateRow) return finishUrl("error", "invalid_state");
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return finishUrl("error", "state_expired");
  }
  // One-shot: delete the state immediately.
  await admin.from("quickbooks_oauth_states").delete().eq("state", state);

  // Exchange code for tokens.
  const tokenResp = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${env.clientId}:${env.clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.redirectUri,
    }).toString(),
  });
  if (!tokenResp.ok) {
    const txt = await tokenResp.text().catch(() => "");
    return finishUrl("error", `token_exchange_failed:${txt.slice(0, 80)}`);
  }
  const tok = await tokenResp.json();
  const accessToken = tok.access_token as string;
  const refreshToken = tok.refresh_token as string;
  const accessExpiresAt = new Date(Date.now() + Number(tok.expires_in ?? 3600) * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + Number(tok.x_refresh_token_expires_in ?? 8640000) * 1000,
  ).toISOString();

  // Try to fetch CompanyInfo for a friendly company name.
  let companyName: string | null = null;
  try {
    const ciResp = await fetch(
      `${env.apiBase}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=70`,
      { headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` } },
    );
    if (ciResp.ok) {
      const ci = await ciResp.json();
      companyName = ci?.CompanyInfo?.CompanyName ?? null;
    }
  } catch { /* non-fatal */ }

  // Upsert connection — one active per (customer, realm).
  const { data: existing } = await admin
    .from("quickbooks_connections")
    .select("id")
    .eq("customer_id", stateRow.customer_id)
    .eq("realm_id", realmId)
    .maybeSingle();

  let connectionId: string | null = null;

  if (existing) {
    connectionId = existing.id;
    await admin
      .from("quickbooks_connections")
      .update({
        access_token_expires_at: accessExpiresAt,
        refresh_token_expires_at: refreshExpiresAt,
        company_name: companyName,
        status: "active",
        last_error: null,
      })
      .eq("id", existing.id);
  } else {
    const { data: inserted, error: insertErr } = await admin.from("quickbooks_connections").insert({
      customer_id: stateRow.customer_id,
      realm_id: realmId,
      access_token_expires_at: accessExpiresAt,
      refresh_token_expires_at: refreshExpiresAt,
      company_name: companyName,
      status: "active",
    }).select("id").single();
    if (insertErr || !inserted?.id) return finishUrl("error", "connection_save_failed");
    connectionId = inserted.id;
  }

  const { error: storeErr } = await admin.rpc("qb_store_connection_tokens", {
    _connection_id: connectionId,
    _access_token: accessToken,
    _refresh_token: refreshToken,
  });
  if (storeErr) return finishUrl("error", "token_store_failed");

  // Reflect status in the user-facing customer_integrations index row.
  const nowIso = new Date().toISOString();
  const { data: ci } = await admin
    .from("customer_integrations")
    .select("id")
    .eq("customer_id", stateRow.customer_id)
    .eq("provider", "quickbooks")
    .maybeSingle();
  if (ci) {
    await admin
      .from("customer_integrations")
      .update({
        status: "connected",
        account_label: companyName,
        connected_at: nowIso,
        last_sync_at: null,
      })
      .eq("id", ci.id);
  } else {
    await admin.from("customer_integrations").insert({
      customer_id: stateRow.customer_id,
      provider: "quickbooks",
      status: "connected",
      account_label: companyName,
      connected_at: nowIso,
    });
  }

  return finishUrl("ok");
});
