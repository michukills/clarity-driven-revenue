/**
 * qb-oauth-start — generate the Intuit authorize URL for the caller's
 * customer. Tokens never leave the server. State nonce is persisted so
 * the callback can prove the redirect originated from us.
 */
import {
  adminClient,
  callerCanUseCustomer,
  corsHeaders,
  getCallerUserId,
  loadQbEnv,
} from "../_shared/qb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const env = loadQbEnv();
    if (!env.configured) {
      return json({
        authorize_url: null,
        state: null,
        configured: false,
        message: "QuickBooks connection is not configured yet.",
      });
    }

    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id as string | undefined;
    if (!customerId) return json({ error: "customer_id required" }, 400);

    const admin = adminClient();
    const allowed = await callerCanUseCustomer(admin, userId, customerId);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    // Random URL-safe state token.
    const stateBytes = new Uint8Array(24);
    crypto.getRandomValues(stateBytes);
    const state = btoa(String.fromCharCode(...stateBytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");

    const { error: insertErr } = await admin
      .from("quickbooks_oauth_states")
      .insert({ state, customer_id: customerId, initiated_by: userId });
    if (insertErr) {
      return json({ error: `Could not start: ${insertErr.message}` }, 500);
    }

    const params = new URLSearchParams({
      client_id: env.clientId,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting openid profile email",
      redirect_uri: env.redirectUri,
      state,
    });
    const authorize_url = `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;

    return json({ authorize_url, state, configured: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}