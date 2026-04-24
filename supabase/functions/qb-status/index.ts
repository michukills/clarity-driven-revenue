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

    const { data: conn } = await admin
      .from("quickbooks_connections")
      .select("realm_id, company_name, status, last_sync_at, last_error")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Detect whether a stored connection row is a demo placeholder vs. a
    // real Intuit OAuth connection. We do not have a metadata column, so
    // demo rows MUST satisfy one of: realm_id starts with "demo-realm-"
    // or equals "demo", OR company_name contains "(Demo)".
    const isDemoRow = !!conn && (
      conn.realm_id === "demo" ||
      (typeof conn.realm_id === "string" && conn.realm_id.startsWith("demo-realm-")) ||
      (typeof conn.company_name === "string" && conn.company_name.includes("(Demo)"))
    );

    // Guardrail: a demo row may only be surfaced as an active connection
    // for customers explicitly flagged is_demo_account = true. Real
    // customers must never see a fake "active" QuickBooks connection
    // when OAuth env is missing.
    let isDemoCustomer = false;
    if (isDemoRow) {
      const { data: cust } = await admin
        .from("customers")
        .select("is_demo_account")
        .eq("id", customerId)
        .maybeSingle();
      isDemoCustomer = !!cust?.is_demo_account;
    }

    // If the connection row exists but it's a demo row on a non-demo
    // customer, hide it entirely and report the honest env state.
    const effectiveConn = conn && (!isDemoRow || isDemoCustomer) ? conn : null;

    if (!env.configured && !effectiveConn) {
      return json({
        state: "not_configured",
        realmId: null,
        companyName: null,
        lastSyncAt: null,
        lastError: null,
        isDemo: false,
      });
    }

    if (!effectiveConn) {
      return json({
        state: "disconnected",
        realmId: null,
        companyName: null,
        lastSyncAt: null,
        lastError: null,
        isDemo: false,
      });
    }

    let state: string = "connected";
    if (effectiveConn.status === "expired") state = "expired";
    else if (effectiveConn.status === "syncing") state = "syncing";
    else if (effectiveConn.status === "error") state = "error";

    return json({
      state,
      realmId: effectiveConn.realm_id,
      companyName: effectiveConn.company_name,
      lastSyncAt: effectiveConn.last_sync_at,
      lastError: effectiveConn.last_error,
      isDemo: isDemoRow && isDemoCustomer,
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
