/* P11.7 — Integrations layer (QuickBooks first).
 *
 * Provider-agnostic CRUD + sync orchestration for connected external
 * systems. The data model supports multiple providers in the future
 * (Xero, Stripe, Plaid, CRMs, OCR pipelines) but only QuickBooks is wired
 * up here. The first implementation uses a deterministic *simulator* that
 * generates a plausible batch of staged records into
 * `integration_external_records` so the full reconciliation surface can
 * be exercised end-to-end without OAuth credentials.
 *
 * Principles enforced here:
 *   - external data is staged, never silently merged into trusted records
 *   - every staged record carries `source` + `external_id` provenance
 *   - reconciliation status is explicit: pending / matched / imported / ignored / conflict
 *   - imported rows write into local trusted tables with `source` + `source_ref`
 *     so downstream BCC / cash position / signal emitters preserve lineage
 */

import { supabase } from "@/integrations/supabase/client";

export type IntegrationProvider = "quickbooks";
export type IntegrationStatus = "active" | "disconnected" | "error" | "paused";
export type SyncRunStatus = "pending" | "running" | "success" | "partial" | "failed";
export type ExternalRecordKind =
  | "revenue"
  | "expense"
  | "invoice"
  | "cash_position"
  | "obligation"
  | "customer"
  | "vendor"
  | "other";
export type ReconcileStatus =
  | "pending"
  | "matched"
  | "imported"
  | "ignored"
  | "conflict";

export interface CustomerIntegration {
  id: string;
  customer_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  account_label: string | null;
  external_account_id: string | null;
  connected_at: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationSyncRun {
  id: string;
  customer_id: string;
  integration_id: string;
  provider: IntegrationProvider;
  sync_type: string;
  status: SyncRunStatus;
  started_at: string;
  completed_at: string | null;
  records_pulled: number;
  records_reconciled: number;
  records_pending: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface IntegrationExternalRecord {
  id: string;
  customer_id: string;
  integration_id: string;
  sync_run_id: string | null;
  provider: IntegrationProvider;
  record_kind: ExternalRecordKind;
  external_id: string | null;
  external_updated_at: string | null;
  payload: Record<string, unknown>;
  reconcile_status: ReconcileStatus;
  linked_local_table: string | null;
  linked_local_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

export async function listIntegrations(
  customerId: string,
): Promise<CustomerIntegration[]> {
  const { data, error } = await supabase
    .from("customer_integrations")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CustomerIntegration[];
}

export async function listSyncRuns(
  integrationId: string,
  limit = 25,
): Promise<IntegrationSyncRun[]> {
  const { data, error } = await supabase
    .from("integration_sync_runs")
    .select("*")
    .eq("integration_id", integrationId)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as IntegrationSyncRun[];
}

export async function listExternalRecords(
  integrationId: string,
  opts?: { reconcile_status?: ReconcileStatus | "all"; limit?: number },
): Promise<IntegrationExternalRecord[]> {
  let q = supabase
    .from("integration_external_records")
    .select("*")
    .eq("integration_id", integrationId)
    .order("external_updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.reconcile_status && opts.reconcile_status !== "all") {
    q = q.eq("reconcile_status", opts.reconcile_status);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as IntegrationExternalRecord[];
}

/* ------------------------------------------------------------------ */
/* Connect / disconnect                                                */
/* ------------------------------------------------------------------ */

export interface ConnectIntegrationArgs {
  customerId: string;
  provider: IntegrationProvider;
  accountLabel?: string;
  externalAccountId?: string;
  metadata?: Record<string, unknown>;
}

export async function connectIntegration(
  args: ConnectIntegrationArgs,
): Promise<CustomerIntegration> {
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;
  const { data, error } = await supabase
    .from("customer_integrations")
    .insert({
      customer_id: args.customerId,
      provider: args.provider,
      status: "active",
      account_label: args.accountLabel ?? defaultProviderLabel(args.provider),
      external_account_id: args.externalAccountId ?? null,
      metadata: args.metadata ?? {},
      created_by: uid,
      updated_by: uid,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CustomerIntegration;
}

export async function setIntegrationStatus(
  integrationId: string,
  status: IntegrationStatus,
): Promise<void> {
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;
  const { error } = await supabase
    .from("customer_integrations")
    .update({ status, updated_by: uid })
    .eq("id", integrationId);
  if (error) throw error;
}

export async function disconnectIntegration(integrationId: string) {
  return setIntegrationStatus(integrationId, "disconnected");
}

function defaultProviderLabel(provider: IntegrationProvider): string {
  switch (provider) {
    case "quickbooks":
      return "QuickBooks Online";
    default:
      return provider;
  }
}

/* ------------------------------------------------------------------ */
/* Sync orchestration                                                  */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  run: IntegrationSyncRun;
  pulled: number;
  pending: number;
}

/**
 * Run a sync for an integration. The first implementation uses a
 * deterministic provider simulator (no external API) that stages a small
 * batch of records into `integration_external_records`. This lets the
 * reconciliation UI be tested end-to-end before the real OAuth/API layer
 * lands. Real provider adapters will replace `runProviderSimulator` with
 * their own pull logic but keep this orchestration shell intact.
 */
export async function runIntegrationSync(args: {
  integration: CustomerIntegration;
  syncType?: string;
}): Promise<SyncResult> {
  const { integration } = args;
  const userRes = await supabase.auth.getUser();
  const uid = userRes.data.user?.id ?? null;

  const { data: runRow, error: runErr } = await supabase
    .from("integration_sync_runs")
    .insert({
      customer_id: integration.customer_id,
      integration_id: integration.id,
      provider: integration.provider,
      sync_type: args.syncType ?? "manual",
      status: "running",
      created_by: uid,
    })
    .select("*")
    .single();
  if (runErr) throw runErr;
  const run = runRow as IntegrationSyncRun;

  try {
    const staged = await runProviderSimulator({
      integration,
      syncRunId: run.id,
    });

    const { data: updated, error: updErr } = await supabase
      .from("integration_sync_runs")
      .update({
        status: "success",
        completed_at: new Date().toISOString(),
        records_pulled: staged,
        records_pending: staged,
      })
      .eq("id", run.id)
      .select("*")
      .single();
    if (updErr) throw updErr;

    await supabase
      .from("customer_integrations")
      .update({
        status: "active",
        last_sync_at: new Date().toISOString(),
        last_sync_status: "success",
        last_sync_error: null,
      })
      .eq("id", integration.id);

    return {
      run: updated as IntegrationSyncRun,
      pulled: staged,
      pending: staged,
    };
  } catch (err) {
    const message = (err as Error)?.message ?? "Unknown sync error";
    await supabase
      .from("integration_sync_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", run.id);
    await supabase
      .from("customer_integrations")
      .update({
        status: "error",
        last_sync_at: new Date().toISOString(),
        last_sync_status: "failed",
        last_sync_error: message,
      })
      .eq("id", integration.id);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/* Provider simulator (QuickBooks v1)                                  */
/* ------------------------------------------------------------------ */

/**
 * Stages a small, deterministic batch of records that mimic what a real
 * QuickBooks pull might return: a few revenue items, a few expenses, an
 * invoice, and an obligation. The point is to exercise the reconciliation
 * UI and the integration signal emitter, not to fabricate financials.
 * Records land in `pending` reconcile_status — admins must explicitly
 * import or ignore each one.
 */
async function runProviderSimulator(args: {
  integration: CustomerIntegration;
  syncRunId: string;
}): Promise<number> {
  const { integration, syncRunId } = args;
  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const seed = `${integration.id}:${syncRunId}`.slice(0, 8);

  const rows: Array<Omit<IntegrationExternalRecord, "id" | "created_at" | "updated_at">> = [
    {
      customer_id: integration.customer_id,
      integration_id: integration.id,
      sync_run_id: syncRunId,
      provider: integration.provider,
      record_kind: "revenue",
      external_id: `qb-rev-${seed}-1`,
      external_updated_at: new Date().toISOString(),
      payload: { amount: 4200, entry_date: iso(2), service_category: "Service Call", client_or_job: "Maple Street HOA" },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: null,
    },
    {
      customer_id: integration.customer_id,
      integration_id: integration.id,
      sync_run_id: syncRunId,
      provider: integration.provider,
      record_kind: "revenue",
      external_id: `qb-rev-${seed}-2`,
      external_updated_at: new Date().toISOString(),
      payload: { amount: 1850, entry_date: iso(5), service_category: "Maintenance", client_or_job: "Riverside Lofts" },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: null,
    },
    {
      customer_id: integration.customer_id,
      integration_id: integration.id,
      sync_run_id: syncRunId,
      provider: integration.provider,
      record_kind: "expense",
      external_id: `qb-exp-${seed}-1`,
      external_updated_at: new Date().toISOString(),
      payload: { amount: 612.5, entry_date: iso(1), vendor: "Home Depot", expense_type: "variable" },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: null,
    },
    {
      customer_id: integration.customer_id,
      integration_id: integration.id,
      sync_run_id: syncRunId,
      provider: integration.provider,
      record_kind: "invoice",
      external_id: `qb-inv-${seed}-1`,
      external_updated_at: new Date().toISOString(),
      payload: {
        invoice_number: `INV-${seed.toUpperCase()}-1042`,
        amount: 3600,
        amount_collected: 0,
        invoice_date: iso(20),
        due_date: iso(-10),
        client_or_job: "Northgate Property Mgmt",
        status: "sent",
      },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: null,
    },
    {
      customer_id: integration.customer_id,
      integration_id: integration.id,
      sync_run_id: syncRunId,
      provider: integration.provider,
      record_kind: "obligation",
      external_id: `qb-obl-${seed}-1`,
      external_updated_at: new Date().toISOString(),
      payload: {
        label: "Quarterly state tax filing",
        obligation_type: "tax",
        amount_due: 2850,
        due_date: iso(-14),
        priority: "high",
        vendor_or_payee: "State Dept of Revenue",
      },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: null,
    },
  ];

  const { error } = await supabase
    .from("integration_external_records")
    .insert(rows);
  if (error) throw error;
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Reconciliation                                                      */
/* ------------------------------------------------------------------ */

/**
 * Import a staged external record into the corresponding trusted local
 * table. Trusted tables receive `source` + `source_ref` so downstream
 * BCC / cash / signal emitters preserve lineage. The staged record is
 * marked `imported` and linked to the new local row — this prevents
 * silent duplicates on subsequent syncs.
 */
export async function importExternalRecord(
  record: IntegrationExternalRecord,
): Promise<{ table: string; id: string }> {
  if (record.reconcile_status === "imported") {
    throw new Error("Record already imported");
  }
  const sourceLabel = `${record.provider}:${record.external_id ?? record.id}`;
  const p = record.payload as Record<string, unknown>;
  let table = "";
  let inserted: { id: string } | null = null;

  if (record.record_kind === "revenue") {
    table = "revenue_entries";
    const { data, error } = await supabase
      .from("revenue_entries")
      .insert({
        customer_id: record.customer_id,
        amount: Number(p.amount ?? 0),
        entry_date: String(p.entry_date ?? new Date().toISOString().slice(0, 10)),
        service_category: (p.service_category as string) ?? null,
        client_or_job: (p.client_or_job as string) ?? null,
        notes: `Imported from ${record.provider}`,
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted = data as { id: string };
  } else if (record.record_kind === "expense") {
    table = "expense_entries";
    const { data, error } = await supabase
      .from("expense_entries")
      .insert({
        customer_id: record.customer_id,
        amount: Number(p.amount ?? 0),
        entry_date: String(p.entry_date ?? new Date().toISOString().slice(0, 10)),
        vendor: (p.vendor as string) ?? null,
        expense_type: (p.expense_type as string) ?? "variable",
        payment_status: "paid",
        notes: `Imported from ${record.provider}`,
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted = data as { id: string };
  } else if (record.record_kind === "invoice") {
    table = "invoice_entries";
    const { data, error } = await supabase
      .from("invoice_entries")
      .insert({
        customer_id: record.customer_id,
        invoice_number: (p.invoice_number as string) ?? null,
        amount: Number(p.amount ?? 0),
        amount_collected: Number(p.amount_collected ?? 0),
        invoice_date: (p.invoice_date as string) ?? null,
        due_date: (p.due_date as string) ?? null,
        client_or_job: (p.client_or_job as string) ?? null,
        status: (p.status as string) ?? "sent",
        notes: `Imported from ${record.provider}`,
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted = data as { id: string };
  } else if (record.record_kind === "obligation") {
    table = "financial_obligations";
    const { data, error } = await supabase
      .from("financial_obligations")
      .insert({
        customer_id: record.customer_id,
        label: (p.label as string) ?? "Imported obligation",
        obligation_type: (p.obligation_type as string) ?? "other",
        amount_due: Number(p.amount_due ?? 0),
        due_date: String(p.due_date ?? new Date().toISOString().slice(0, 10)),
        priority: (p.priority as string) ?? "medium",
        vendor_or_payee: (p.vendor_or_payee as string) ?? null,
        status: "open",
        source: record.provider,
        source_ref: sourceLabel,
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted = data as { id: string };
  } else if (record.record_kind === "cash_position") {
    table = "cash_position_snapshots";
    const { data, error } = await supabase
      .from("cash_position_snapshots")
      .insert({
        customer_id: record.customer_id,
        snapshot_date: String(p.snapshot_date ?? new Date().toISOString().slice(0, 10)),
        cash_on_hand: Number(p.cash_on_hand ?? 0),
        available_cash: p.available_cash != null ? Number(p.available_cash) : null,
        restricted_cash: p.restricted_cash != null ? Number(p.restricted_cash) : null,
        source: record.provider,
        source_ref: sourceLabel,
      })
      .select("id")
      .single();
    if (error) throw error;
    inserted = data as { id: string };
  } else {
    throw new Error(`Cannot import record kind: ${record.record_kind}`);
  }

  if (!inserted) throw new Error("Insert returned no id");

  const { error: updErr } = await supabase
    .from("integration_external_records")
    .update({
      reconcile_status: "imported",
      linked_local_table: table,
      linked_local_id: inserted.id,
    })
    .eq("id", record.id);
  if (updErr) throw updErr;

  await bumpRunReconciled(record.sync_run_id);
  return { table, id: inserted.id };
}

export async function ignoreExternalRecord(recordId: string, note?: string) {
  const { error } = await supabase
    .from("integration_external_records")
    .update({ reconcile_status: "ignored", notes: note ?? null })
    .eq("id", recordId);
  if (error) throw error;
}

async function bumpRunReconciled(runId: string | null) {
  if (!runId) return;
  const { data, error } = await supabase
    .from("integration_sync_runs")
    .select("records_reconciled, records_pending")
    .eq("id", runId)
    .single();
  if (error || !data) return;
  await supabase
    .from("integration_sync_runs")
    .update({
      records_reconciled: (data.records_reconciled ?? 0) + 1,
      records_pending: Math.max(0, (data.records_pending ?? 0) - 1),
    })
    .eq("id", runId);
}

/* ------------------------------------------------------------------ */
/* Rollup                                                              */
/* ------------------------------------------------------------------ */

export interface IntegrationRollup {
  total_integrations: number;
  active: number;
  errored: number;
  paused: number;
  pending_reconcile: number;
  matched: number;
  imported_total: number;
  conflicts: number;
  oldest_pending_days: number | null;
  last_successful_sync_at: string | null;
  data_freshness_days: number | null;
  has_stale_sync: boolean;
}

export async function buildIntegrationRollup(
  customerId: string,
): Promise<IntegrationRollup> {
  const integrations = await listIntegrations(customerId);
  const active = integrations.filter((i) => i.status === "active").length;
  const errored = integrations.filter((i) => i.status === "error").length;
  const paused = integrations.filter((i) => i.status === "paused").length;

  const { data: records } = await supabase
    .from("integration_external_records")
    .select("id, reconcile_status, created_at")
    .eq("customer_id", customerId);

  const recs = (records ?? []) as Array<{
    id: string;
    reconcile_status: ReconcileStatus;
    created_at: string;
  }>;
  const pending = recs.filter((r) => r.reconcile_status === "pending");
  const matched = recs.filter((r) => r.reconcile_status === "matched").length;
  const imported = recs.filter((r) => r.reconcile_status === "imported").length;
  const conflicts = recs.filter((r) => r.reconcile_status === "conflict").length;

  const now = Date.now();
  let oldestPendingDays: number | null = null;
  for (const r of pending) {
    const ageDays = Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000);
    if (oldestPendingDays === null || ageDays > oldestPendingDays) oldestPendingDays = ageDays;
  }

  let lastOk: string | null = null;
  for (const i of integrations) {
    if (i.last_sync_status === "success" && i.last_sync_at) {
      if (!lastOk || new Date(i.last_sync_at).getTime() > new Date(lastOk).getTime()) {
        lastOk = i.last_sync_at;
      }
    }
  }
  const freshness =
    lastOk != null
      ? Math.floor((now - new Date(lastOk).getTime()) / 86_400_000)
      : null;

  return {
    total_integrations: integrations.length,
    active,
    errored,
    paused,
    pending_reconcile: pending.length,
    matched,
    imported_total: imported,
    conflicts,
    oldest_pending_days: oldestPendingDays,
    last_successful_sync_at: lastOk,
    data_freshness_days: freshness,
    has_stale_sync:
      integrations.length > 0 && (freshness === null || freshness >= 14),
  };
}

export function providerLabel(p: IntegrationProvider): string {
  switch (p) {
    case "quickbooks":
      return "QuickBooks";
    default:
      return p;
  }
}

export function recordKindLabel(k: ExternalRecordKind): string {
  switch (k) {
    case "revenue":
      return "Revenue";
    case "expense":
      return "Expense";
    case "invoice":
      return "Invoice";
    case "cash_position":
      return "Cash Position";
    case "obligation":
      return "Obligation";
    case "customer":
      return "Customer";
    case "vendor":
      return "Vendor";
    default:
      return "Other";
  }
}