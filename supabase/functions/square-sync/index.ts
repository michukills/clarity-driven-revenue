/**
 * P20.13 — square-sync (scaffold).
 *
 * Honest scaffold for Square period-summary sync. Square OAuth /
 * connector infrastructure is NOT yet provisioned in this project.
 * Until it is, this function:
 *
 *   1. Verifies the caller is an admin (service role or admin user).
 *   2. Accepts an already-normalized summary payload from a trusted
 *      backend caller (e.g. a future ingest worker, or an admin-side
 *      paste of a Square report) and upserts it into
 *      `square_period_summaries`.
 *   3. Reports `configured: false` if no Square OAuth env is present
 *      so the UI can show "Not configured" honestly.
 *
 * Tokens / client secrets are NEVER read in the browser. This function
 * never returns provider credentials, raw transactions, or token
 * material. Audit-friendly: only counts and period bounds are echoed.
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
  // Live Square integration is NOT wired yet. We only report configured
  // when explicit Square OAuth env is present.
  return !!(Deno.env.get("SQUARE_CLIENT_ID") && Deno.env.get("SQUARE_CLIENT_SECRET"));
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
      return json({ configured: configured(), provider: "square" });
    }

    // P20.16: normalized admin ingest does NOT require live API creds.
    // Only `action=live_sync` (future) would require configured().
    if (action === "live_sync" && !configured()) {
      return json({
        ok: false,
        configured: false,
        message:
          "Square OAuth/connector is not configured on this project yet. " +
          "Provide a normalized summary via action=ingest_summary, or set " +
          "SQUARE_CLIENT_ID / SQUARE_CLIENT_SECRET to enable live sync.",
      });
    }

    const customer_id = body?.customer_id as string | undefined;
    const summary = body?.summary as Record<string, unknown> | undefined;
    if (!customer_id || !summary?.period_start || !summary?.period_end) {
      return json({ ok: false, message: "customer_id, summary.period_start, summary.period_end required" }, 400);
    }

    // Whitelist mapped fields only — never persist raw transactions/tokens.
    const row = {
      customer_id,
      period_start: summary.period_start as string,
      period_end: summary.period_end as string,
      gross_sales: numOrNull(summary.gross_sales),
      net_sales: numOrNull(summary.net_sales),
      discounts_total: numOrNull(summary.discounts_total),
      refunds_total: numOrNull(summary.refunds_total),
      tips_total: numOrNull(summary.tips_total),
      tax_total: numOrNull(summary.tax_total),
      transaction_count: intOrNull(summary.transaction_count),
      day_count: intOrNull(summary.day_count),
      has_recurring_period_reporting: boolOrNull(summary.has_recurring_period_reporting),
      source_account_id: strOrNull(summary.source_account_id),
      source_location_id: strOrNull(summary.source_location_id),
      synced_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("square_period_summaries")
      .upsert(row, {
        onConflict: "customer_id,source_account_id,source_location_id,period_start,period_end",
      });
    if (error) return json({ ok: false, message: error.message }, 500);

    return json({
      ok: true,
      provider: "square",
      live_api: false,
      configured: configured(),
      upserted: true,
      summary: {
        period_start: row.period_start,
        period_end: row.period_end,
      },
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