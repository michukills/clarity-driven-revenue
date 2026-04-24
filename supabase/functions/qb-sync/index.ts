/**
 * qb-sync — pull P&L summary, open invoices, AR/AP aging for a period
 * and cache the result in `quickbooks_period_summaries` for RCC autofill.
 * Tokens are kept server-side; this endpoint returns only summary
 * numbers + status.
 */
import {
  adminClient,
  callerCanUseCustomer,
  corsHeaders,
  ensureFreshToken,
  getCallerUserId,
  loadQbEnv,
} from "../_shared/qb.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const env = loadQbEnv();
    if (!env.configured) {
      return json({ ok: false, message: "QuickBooks connection is not configured yet." });
    }

    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const customerId = body.customer_id as string | undefined;
    const periodStart = body.period_start as string | undefined;
    const periodEnd = body.period_end as string | undefined;
    if (!customerId || !periodStart || !periodEnd) {
      return json({ ok: false, message: "customer_id, period_start, period_end required" }, 400);
    }

    const admin = adminClient();
    const allowed = await callerCanUseCustomer(admin, userId, customerId);
    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { data: conn } = await admin
      .from("quickbooks_connections")
      .select("id, realm_id, status")
      .eq("customer_id", customerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!conn) return json({ ok: false, message: "No QuickBooks connection." });

    // Demo connections (realm_id starts with "demo-realm-") never call Intuit.
    // We surface the most recent cached period summary if one exists, and we
    // bump last_sync_at so the UI shows a fresh timestamp. This is honest:
    // the company name carries "(Demo)" and no real API call is made.
    if ((conn.realm_id ?? "").startsWith("demo-realm-")) {
      const { data: existing } = await admin
        .from("quickbooks_period_summaries")
        .select("period_start, period_end, revenue_total, expense_total")
        .eq("customer_id", customerId)
        .order("period_end", { ascending: false })
        .limit(1)
        .maybeSingle();
      await admin
        .from("quickbooks_connections")
        .update({ last_sync_at: new Date().toISOString(), last_error: null, status: "active" })
        .eq("id", conn.id);
      return json({
        ok: true,
        message: "Demo connection refreshed (no Intuit call).",
        summary: existing
          ? {
              period_start: existing.period_start,
              period_end: existing.period_end,
              revenue_total: existing.revenue_total,
              expense_total: existing.expense_total,
            }
          : undefined,
      });
    }

    const fresh = await ensureFreshToken(admin, env, conn.id);
    if (!fresh.ok) return json({ ok: false, message: fresh.reason });
    const token = fresh.access_token;
    const realmId = fresh.realm_id;

    // Mark a sync run row.
    const { data: runRow } = await admin
      .from("quickbooks_sync_runs")
      .insert({
        customer_id: customerId,
        connection_id: conn.id,
        period_start: periodStart,
        period_end: periodEnd,
        status: "running",
        scope: "pl+invoices+aging",
      })
      .select("id")
      .single();
    const runId = runRow?.id ?? null;

    const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
    const base = `${env.apiBase}/v3/company/${realmId}`;

    const fetchJson = async (url: string) => {
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return r.json();
    };

    let revenueTotal: number | null = null;
    let expenseTotal: number | null = null;
    let openInvoicesCount: number | null = null;
    let openInvoicesTotal: number | null = null;
    let arTotal: number | null = null;
    let apTotal: number | null = null;
    let arAging: Record<string, number> | null = null;
    let apAging: Record<string, number> | null = null;
    const raw: Record<string, unknown> = {};
    let errorMessage: string | null = null;

    try {
      // Profit & Loss summary.
      const pl = await fetchJson(
        `${base}/reports/ProfitAndLoss?start_date=${periodStart}&end_date=${periodEnd}&summarize_column_by=Total&minorversion=70`,
      );
      raw.profit_and_loss = pl;
      const totals = extractPlTotals(pl);
      revenueTotal = totals.revenue;
      expenseTotal = totals.expense;
    } catch (e) {
      errorMessage = `pl: ${(e as Error).message}`;
    }

    try {
      // Open invoices via query.
      const q = encodeURIComponent(
        "select Id, TotalAmt, Balance, DueDate from Invoice where Balance > '0' MAXRESULTS 1000",
      );
      const inv = await fetchJson(`${base}/query?query=${q}&minorversion=70`);
      raw.invoices = inv;
      const list = (inv?.QueryResponse?.Invoice ?? []) as Array<{ Balance?: number }>;
      openInvoicesCount = list.length;
      openInvoicesTotal = list.reduce((acc, i) => acc + (Number(i.Balance) || 0), 0);
    } catch (e) {
      errorMessage = errorMessage ? `${errorMessage}; inv: ${(e as Error).message}` : `inv: ${(e as Error).message}`;
    }

    try {
      const ar = await fetchJson(
        `${base}/reports/AgedReceivables?date_macro=Today&minorversion=70`,
      );
      raw.aged_receivables = ar;
      const ag = extractAging(ar);
      arAging = ag.buckets;
      arTotal = ag.total;
    } catch (e) {
      errorMessage = errorMessage ? `${errorMessage}; ar: ${(e as Error).message}` : `ar: ${(e as Error).message}`;
    }

    try {
      const ap = await fetchJson(
        `${base}/reports/AgedPayables?date_macro=Today&minorversion=70`,
      );
      raw.aged_payables = ap;
      const ag = extractAging(ap);
      apAging = ag.buckets;
      apTotal = ag.total;
    } catch (e) {
      // AP is often empty or unavailable; leave nulls.
    }

    const syncedAt = new Date().toISOString();

    // Upsert period summary.
    const { data: existing } = await admin
      .from("quickbooks_period_summaries")
      .select("id")
      .eq("customer_id", customerId)
      .eq("period_start", periodStart)
      .eq("period_end", periodEnd)
      .maybeSingle();
    const summaryRow = {
      customer_id: customerId,
      period_start: periodStart,
      period_end: periodEnd,
      revenue_total: revenueTotal,
      expense_total: expenseTotal,
      open_invoices_count: openInvoicesCount,
      open_invoices_total: openInvoicesTotal,
      ar_total: arTotal,
      ar_aging: arAging,
      ap_total: apTotal,
      ap_aging: apAging,
      raw_payload: raw,
      synced_at: syncedAt,
      source_run_id: runId,
    };
    if (existing) {
      await admin.from("quickbooks_period_summaries").update(summaryRow).eq("id", existing.id);
    } else {
      await admin.from("quickbooks_period_summaries").insert(summaryRow);
    }

    // Update connection + integration row.
    await admin
      .from("quickbooks_connections")
      .update({ last_sync_at: syncedAt, last_error: errorMessage, status: "active" })
      .eq("id", conn.id);
    await admin
      .from("customer_integrations")
      .update({ last_sync_at: syncedAt, last_sync_status: errorMessage ? "partial" : "ok", last_sync_error: errorMessage })
      .eq("customer_id", customerId)
      .eq("provider", "quickbooks");

    if (runId) {
      await admin
        .from("quickbooks_sync_runs")
        .update({
          status: errorMessage ? "partial" : "ok",
          completed_at: syncedAt,
          error_message: errorMessage,
          result_summary: {
            revenue_total: revenueTotal,
            expense_total: expenseTotal,
            open_invoices_count: openInvoicesCount,
            ar_total: arTotal,
            ap_total: apTotal,
          },
        })
        .eq("id", runId);
    }

    return json({
      ok: true,
      message: errorMessage ? `Synced with warnings: ${errorMessage}` : "Synced",
      summary: {
        period_start: periodStart,
        period_end: periodEnd,
        revenue_total: revenueTotal,
        expense_total: expenseTotal,
      },
    });
  } catch (e) {
    return json({ ok: false, message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/**
 * Walks an Intuit P&L report shape and returns the Total Income +
 * Total Expenses values. Intuit's report tree puts category roll-ups
 * inside Header/Summary nodes. We tolerate both.
 */
function extractPlTotals(pl: any): { revenue: number | null; expense: number | null } {
  let revenue: number | null = null;
  let expense: number | null = null;
  const cols = pl?.Columns?.Column ?? [];
  // Find the "Total" / amount column index. Default to the LAST column.
  const amountColIndex = Math.max(0, cols.length - 1);

  const visit = (row: any) => {
    const group = row?.group as string | undefined;
    const sumCols = row?.Summary?.ColData ?? row?.summary?.ColData ?? null;
    const amount = sumCols ? Number(sumCols[amountColIndex]?.value ?? 0) : null;
    if (group === "Income" && amount != null && !isNaN(amount)) revenue = amount;
    if (group === "Expenses" && amount != null && !isNaN(amount)) expense = amount;
    const childRows = row?.Rows?.Row;
    if (Array.isArray(childRows)) for (const c of childRows) visit(c);
  };

  const rows = pl?.Rows?.Row ?? [];
  if (Array.isArray(rows)) for (const r of rows) visit(r);
  return { revenue, expense };
}

/**
 * Walks an Intuit Aged Receivables / Payables report and pulls a
 * grand-total per aging bucket plus an overall total. Bucket names
 * are taken from the column headers when available.
 */
function extractAging(report: any): { buckets: Record<string, number>; total: number | null } {
  const cols = (report?.Columns?.Column ?? []) as Array<{ ColTitle?: string }>;
  const buckets: Record<string, number> = {};
  let total: number | null = null;

  // Find the grand-total summary row at the report root.
  const root = report?.Rows?.Row ?? [];
  const summary = (Array.isArray(root) ? root : [])
    .map((r: any) => r?.Summary?.ColData ?? r?.summary?.ColData)
    .find((cd: any) => Array.isArray(cd) && cd.length === cols.length);
  if (summary && Array.isArray(summary)) {
    summary.forEach((cell: any, i: number) => {
      const title = cols[i]?.ColTitle ?? `col_${i}`;
      const v = Number(cell?.value);
      if (!isNaN(v)) {
        if (i === 0) return; // first column is usually a label
        if (i === cols.length - 1) total = v;
        else buckets[title || `col_${i}`] = v;
      }
    });
  }
  return { buckets, total };
}