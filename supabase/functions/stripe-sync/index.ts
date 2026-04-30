/**
 * P20.13 — stripe-sync (scaffold).
 *
 * Honest scaffold for Stripe period-summary sync. Stripe connector
 * infrastructure is NOT yet provisioned in this project. Until it is,
 * this function:
 *
 *   1. Verifies the caller is an admin.
 *   2. Accepts an already-normalized summary payload from a trusted
 *      backend caller and upserts it into `stripe_period_summaries`.
 *   3. Reports `configured: false` if no Stripe secret env is present
 *      so the UI can show "Not configured" honestly.
 *
 * Tokens / API keys are NEVER read in the browser. No raw Stripe
 * payloads, charges, or PII are persisted by this scaffold.
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
  return !!Deno.env.get("STRIPE_SECRET_KEY");
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
      return json({ configured: configured(), provider: "stripe" });
    }

    if (!configured()) {
      return json({
        ok: false,
        configured: false,
        message:
          "Stripe connector is not configured on this project yet. " +
          "Provide a normalized summary via action=ingest_summary, or set " +
          "STRIPE_SECRET_KEY to enable live sync.",
      });
    }

    const customer_id = body?.customer_id as string | undefined;
    const summary = body?.summary as Record<string, unknown> | undefined;
    if (!customer_id || !summary?.period_start || !summary?.period_end) {
      return json({ ok: false, message: "customer_id, summary.period_start, summary.period_end required" }, 400);
    }

    const row = {
      customer_id,
      period_start: summary.period_start as string,
      period_end: summary.period_end as string,
      gross_volume: numOrNull(summary.gross_volume),
      net_volume: numOrNull(summary.net_volume),
      fees_total: numOrNull(summary.fees_total),
      refunds_total: numOrNull(summary.refunds_total),
      disputes_total: numOrNull(summary.disputes_total),
      successful_payment_count: intOrNull(summary.successful_payment_count),
      failed_payment_count: intOrNull(summary.failed_payment_count),
      source_account_id: strOrNull(summary.source_account_id),
      synced_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("stripe_period_summaries")
      .upsert(row, {
        onConflict: "customer_id,source_account_id,period_start,period_end",
      });
    if (error) return json({ ok: false, message: error.message }, 500);

    return json({
      ok: true,
      summary: {
        period_start: row.period_start,
        period_end: row.period_end,
        successful_payment_count: row.successful_payment_count,
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
function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s.slice(0, 200) : null;
}