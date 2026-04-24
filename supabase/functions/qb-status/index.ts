/**
 * qb-status — return per-customer QuickBooks connection state.
 * Tokens are NEVER returned. Only honest status flags.
 */
import { adminClient, callerCanUseCustomer, corsHeaders, getCallerUserId, loadQbEnv } from "../_shared/qb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const env = loadQbEnv();
    const userId = await getCallerUserId(req);
    if (!userId) {
      return json({ state: "not_configured", realmId: null, companyName: null, lastSyncAt: null, lastError: "Not signed in" });
    }

    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id as string | undefined;
    if (!customerId) return json({ error: "customer_id required" }, 400);

    const admin = adminClient();
    const allowed = await callerCanUseCustomer(admin, userId, customerId);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    if (!env.configured) {
      return json({ state: "not_configured", realmId: null, companyName: null, lastSyncAt: null, lastError: null });
    }

    const { data: conn } = await admin
      .from("quickbooks_connections")
      .select("realm_id, company_name, status, last_sync_at, last_error")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conn) {
      return json({ state: "disconnected", realmId: null, companyName: null, lastSyncAt: null, lastError: null });
    }

    let state: string = "connected";
    if (conn.status === "expired") state = "expired";
    else if (conn.status === "syncing") state = "syncing";
    else if (conn.status === "error") state = "error";

    return json({
      state,
      realmId: conn.realm_id,
      companyName: conn.company_name,
      lastSyncAt: conn.last_sync_at,
      lastError: conn.last_error,
    });
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
