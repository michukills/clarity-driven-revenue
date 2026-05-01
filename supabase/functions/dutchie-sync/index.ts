/**
 * P20.14 — dutchie-sync (scaffold).
 *
 * Honest scaffold for Dutchie cannabis-retail period-summary sync.
 * Live Dutchie integration is NOT yet provisioned in this project.
 * Until it is, this function:
 *
 *   1. Verifies the caller is an admin (service role or admin user).
 *   2. Accepts an already-normalized summary payload from a trusted
 *      backend caller (a future ingest worker, or an admin-side paste
 *      of a Dutchie report) and upserts it into
 *      `dutchie_period_summaries`.
 *   3. Reports `configured: false` if no Dutchie API env is present so
 *      the UI can show "Not configured" honestly.
 *
 * Tokens / API keys are NEVER read in the browser. This function never
 * returns provider credentials, raw transactions, or token material.
 * Audit-friendly: only counts and period bounds are echoed.
 *
 * Cannabis/MMC scope: Dutchie is strictly cannabis retail / POS /
 * operations. Only retail and inventory fields are persisted; no
 * healthcare-style fields exist in the schema or this file.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const c = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data } = await c.auth.getUser();
  return data.user?.id ?? null;
}

async function isAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r: { role: string }) => r.role === "admin" || r.role === "platform_owner");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function configured(): boolean {
  // Live Dutchie integration is NOT wired yet. Configured only when
  // explicit Dutchie API env is present.
  return !!(Deno.env.get("DUTCHIE_API_KEY") || Deno.env.get("DUTCHIE_CLIENT_ID"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);
    const admin = adminClient();
    if (!(await isAdmin(admin, userId))) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = (body?.action as string | undefined) ?? "ingest_summary";

    if (action === "status") {
      return json({ configured: configured(), provider: "dutchie" });
    }

    // P20.16: normalized admin ingest does NOT require live API creds.
    if (action === "live_sync" && !configured()) {
      return json({
        ok: false,
        configured: false,
        message:
          "Dutchie integration is not configured on this project yet. " +
          "Provide a normalized summary via action=ingest_summary, or set " +
          "DUTCHIE_API_KEY / DUTCHIE_CLIENT_ID to enable live sync.",
      });
    }

    const customer_id = body?.customer_id as string | undefined;
    const summary = body?.summary as Record<string, unknown> | undefined;
    if (!customer_id || !summary?.period_start || !summary?.period_end) {
      return json({ ok: false, message: "customer_id, summary.period_start, summary.period_end required" }, 400);
    }

    // Whitelist mapped fields only — never persist raw transactions or
    // tokens. Dutchie is cannabis retail; only retail/inventory fields.
    const row = {
      customer_id,
      period_start: summary.period_start as string,
      period_end: summary.period_end as string,
      gross_sales: numOrNull(summary.gross_sales),
      net_sales: numOrNull(summary.net_sales),
      discounts_total: numOrNull(summary.discounts_total),
      promotions_total: numOrNull(summary.promotions_total),
      transaction_count: intOrNull(summary.transaction_count),
      average_ticket: numOrNull(summary.average_ticket),
      product_sales_total: numOrNull(summary.product_sales_total),
      category_sales_total: numOrNull(summary.category_sales_total),
      inventory_value: numOrNull(summary.inventory_value),
      dead_stock_value: numOrNull(summary.dead_stock_value),
      stockout_count: intOrNull(summary.stockout_count),
      inventory_turnover: numOrNull(summary.inventory_turnover),
      shrinkage_pct: numOrNull(summary.shrinkage_pct),
      payment_reconciliation_gap: boolOrNull(summary.payment_reconciliation_gap),
      has_recurring_period_reporting: boolOrNull(summary.has_recurring_period_reporting),
      product_margin_visible: boolOrNull(summary.product_margin_visible),
      category_margin_visible: boolOrNull(summary.category_margin_visible),
      source_account_id: strOrNull(summary.source_account_id),
      source_location_id: strOrNull(summary.source_location_id),
      synced_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("dutchie_period_summaries")
      .upsert(row, {
        onConflict: "customer_id,source_account_id,source_location_id,period_start,period_end",
      });
    if (error) return json({ ok: false, message: error.message }, 500);

    return json({
      ok: true,
      provider: "dutchie",
      live_api: false,
      configured: configured(),
      upserted: true,
      summary: { period_start: row.period_start, period_end: row.period_end },
    });
  } catch (e) {
    return json({ ok: false, message: (e as Error).message }, 500);
  }
});

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}
function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}
function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s.slice(0, 200) : null;
}