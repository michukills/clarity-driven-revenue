// P13.Reports.AI.1 — Evidence collector.
// Pulls structured context for a customer from across the OS so the
// deterministic engine (and, when admin-triggered, the AI prompt) can
// reason from real data instead of generic filler.
//
// Free-safe: pure database reads, no AI calls.

import { supabase } from "@/integrations/supabase/client";
import type { EvidenceItem, EvidenceSnapshot } from "./types";

const safe = <T,>(p: Promise<{ data: T | null; error: any }>) =>
  p.then((r) => ({ data: (r.data ?? null) as T | null, error: r.error })).catch(
    () => ({ data: null as T | null, error: null }),
  );

function pushCount(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
}

export interface CollectOptions {
  /** When provided, the scorecard run is included as primary scorecard evidence. */
  scorecardRunId?: string | null;
}

export async function collectCustomerEvidence(
  customerId: string,
  opts: CollectOptions = {},
): Promise<EvidenceSnapshot> {
  const items: EvidenceItem[] = [];
  const counts: Record<string, number> = {};
  const notes: string[] = [];

  // --- Customer profile + lifecycle ---
  const customer = await safe(
    supabase.from("customers").select("*").eq("id", customerId).maybeSingle(),
  );
  const c: any = customer.data;
  if (!c) {
    return {
      collected_at: new Date().toISOString(),
      customer_id: customerId,
      scorecard_run_id: opts.scorecardRunId ?? null,
      customer_label: "Unknown customer",
      is_demo_account: false,
      items: [],
      counts: {},
      notes: ["Customer record not found."],
    };
  }

  const customerLabel = c.business_name || c.full_name || c.email || "Customer";
  const isDemo = !!c.is_demo_account;

  items.push({
    source: "customers",
    module: "Customer profile",
    title: `${customerLabel}`,
    detail: [
      c.business_description ? `About: ${c.business_description}` : null,
      c.monthly_revenue ? `Stated monthly revenue: ${c.monthly_revenue}` : null,
      c.goals ? `Stated goals: ${c.goals}` : null,
      `Lifecycle: ${c.lifecycle_state}`,
      `Stage: ${c.stage}`,
      `Track: ${c.track}`,
      c.next_action ? `Next action: ${c.next_action}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    client_safe: true,
    is_admin_entered: true,
    is_demo: isDemo,
  });

  const packages = [
    c.package_diagnostic && "Diagnostic",
    c.package_implementation && "Implementation",
    c.package_revenue_tracker && "Revenue Tracker",
    c.package_ongoing_support && "Ongoing Support",
    c.package_addons && "Add-ons",
    c.package_full_bundle && "Full Bundle",
  ].filter(Boolean) as string[];
  if (packages.length) {
    items.push({
      source: "customers.packages",
      module: "Packages & entitlements",
      title: "Active packages",
      value: packages,
      detail: packages.join(", "),
      client_safe: false,
      is_admin_entered: true,
    });
  }

  // --- Connected sources ---
  const integrations = await safe(
    supabase
      .from("customer_integrations")
      .select("provider,status,last_sync_at,last_sync_status,last_sync_error,connected_at")
      .eq("customer_id", customerId),
  );
  const integ = (integrations.data as any[]) ?? [];
  pushCount(counts, "integrations", integ.length);
  for (const i of integ) {
    items.push({
      source: "customer_integrations",
      module: "Connected sources",
      title: `${i.provider}`,
      detail: `Status: ${i.status}${i.last_sync_at ? ` · last sync ${new Date(i.last_sync_at).toLocaleDateString()}` : " · never synced"}${i.last_sync_error ? ` · error: ${i.last_sync_error}` : ""}`,
      occurred_at: i.last_sync_at ?? i.connected_at,
      client_safe: false,
      is_synced: i.last_sync_status === "ok",
    });
  }
  if (!integ.length) {
    notes.push("No connected sources on file. Source confidence will be lower.");
  }

  // --- QuickBooks period summaries ---
  const qb = await safe(
    supabase
      .from("quickbooks_period_summaries")
      .select("*")
      .eq("customer_id", customerId)
      .order("period_end", { ascending: false })
      .limit(3),
  );
  const qbRows = (qb.data as any[]) ?? [];
  pushCount(counts, "quickbooks_periods", qbRows.length);
  for (const q of qbRows) {
    items.push({
      source: "quickbooks_period_summaries",
      module: "QuickBooks",
      title: `Period ${q.period_start} → ${q.period_end}`,
      value: {
        revenue: q.revenue,
        expenses: q.expenses,
        net: q.net_income,
      },
      detail: `Revenue ${q.revenue ?? "—"} · Expenses ${q.expenses ?? "—"} · Net ${q.net_income ?? "—"}`,
      occurred_at: q.period_end,
      client_safe: true,
      is_synced: true,
    });
  }

  // --- RCC weekly check-ins (most recent 4) ---
  const checkins = await safe(
    supabase
      .from("weekly_checkins")
      .select("*")
      .eq("customer_id", customerId)
      .order("week_end", { ascending: false })
      .limit(4),
  );
  const ckRows = (checkins.data as any[]) ?? [];
  pushCount(counts, "weekly_checkins", ckRows.length);
  for (const w of ckRows) {
    items.push({
      source: "weekly_checkins",
      module: "RCC weekly check-in",
      title: `Week ending ${w.week_end}`,
      detail: [
        w.wins ? `Wins: ${w.wins}` : null,
        w.blockers ? `Blockers: ${w.blockers}` : null,
        w.next_actions ? `Next: ${w.next_actions}` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No notes captured.",
      occurred_at: w.week_end,
      client_safe: true,
      is_admin_entered: false,
    });
  }

  // --- Cash position ---
  const cash = await safe(
    supabase
      .from("cash_position_snapshots")
      .select("*")
      .eq("customer_id", customerId)
      .order("snapshot_date", { ascending: false })
      .limit(1),
  );
  const cashRow = ((cash.data as any[]) ?? [])[0];
  if (cashRow) {
    items.push({
      source: "cash_position_snapshots",
      module: "Cash position",
      title: `Cash on ${cashRow.snapshot_date}`,
      value: cashRow.cash_on_hand,
      detail: `Cash on hand ${cashRow.cash_on_hand} · Available ${cashRow.available_cash ?? "—"} · Restricted ${cashRow.restricted_cash ?? "—"}`,
      occurred_at: cashRow.snapshot_date,
      client_safe: true,
    });
  }

  // --- Obligations / overdue AR proxy via invoice_entries ---
  const invoices = await safe(
    supabase
      .from("invoice_entries")
      .select("status,amount,amount_collected,due_date")
      .eq("customer_id", customerId)
      .limit(500),
  );
  const invs = (invoices.data as any[]) ?? [];
  if (invs.length) {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = invs.filter(
      (i) => i.status !== "paid" && i.due_date && i.due_date < today,
    );
    const overdueAmount = overdue.reduce(
      (s, i) => s + Number(i.amount ?? 0) - Number(i.amount_collected ?? 0),
      0,
    );
    pushCount(counts, "invoices", invs.length);
    items.push({
      source: "invoice_entries",
      module: "Receivables",
      title: `Overdue invoices`,
      value: { count: overdue.length, amount: overdueAmount },
      detail: `${overdue.length} overdue of ${invs.length} total · ~${overdueAmount.toFixed(2)} outstanding`,
      client_safe: true,
    });
  }

  // --- Scorecard runs (conversational) ---
  const scorecardQuery = supabase
    .from("scorecard_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
  const scQuery = opts.scorecardRunId
    ? scorecardQuery.eq("id", opts.scorecardRunId)
    : scorecardQuery.eq("email", c.email ?? "__none__");
  const sc = await safe(scQuery);
  const scRows = (sc.data as any[]) ?? [];
  pushCount(counts, "scorecard_runs", scRows.length);
  for (const s of scRows) {
    items.push({
      source: "scorecard_runs",
      module: "Conversational Scorecard",
      title: `${s.business_name} — band ${s.overall_band ?? "—"}`,
      value: {
        band: s.overall_band,
        confidence: s.overall_confidence,
        score_estimate: s.overall_score_estimate,
      },
      detail: `Confidence: ${s.overall_confidence} · Estimate: ${s.overall_score_estimate ?? "—"} (range ${s.overall_score_low ?? "—"}-${s.overall_score_high ?? "—"})`,
      occurred_at: s.created_at,
      confidence: (s.overall_confidence as any) ?? "low",
      client_safe: true,
    });
  }

  // --- Stability score history (legacy / numeric) ---
  const stab = await safe(
    supabase
      .from("customer_stability_scores")
      .select("score,recorded_at,source")
      .eq("customer_id", customerId)
      .order("recorded_at", { ascending: false })
      .limit(2),
  );
  for (const sx of (stab.data as any[]) ?? []) {
    items.push({
      source: "customer_stability_scores",
      module: "Legacy stability score",
      title: `Score ${sx.score}`,
      detail: `Source: ${sx.source}`,
      occurred_at: sx.recorded_at,
      client_safe: true,
      is_legacy: true,
    });
  }

  // --- Diagnostic tool runs ---
  const diags = await safe(
    supabase
      .from("diagnostic_tool_runs")
      .select("tool_key,tool_label,result_summary,result_score,confidence,run_date,is_latest")
      .eq("customer_id", customerId)
      .eq("is_latest", true)
      .order("run_date", { ascending: false })
      .limit(8),
  );
  const diagRows = (diags.data as any[]) ?? [];
  pushCount(counts, "diagnostic_tool_runs", diagRows.length);
  for (const d of diagRows) {
    items.push({
      source: "diagnostic_tool_runs",
      module: d.tool_label || d.tool_key,
      title: d.tool_label || d.tool_key,
      detail: d.result_summary || "No summary captured.",
      value: d.result_score,
      occurred_at: d.run_date,
      confidence: (d.confidence as any) ?? undefined,
      client_safe: true,
    });
  }

  // --- Owner dependency, bottlenecks, SOPs ---
  const owner = await safe(
    supabase
      .from("owner_dependence_items")
      .select("task_name,risk_level,replacement_ready,delegation_status")
      .eq("customer_id", customerId)
      .limit(20),
  );
  const ownerRows = (owner.data as any[]) ?? [];
  pushCount(counts, "owner_dependence_items", ownerRows.length);
  if (ownerRows.length) {
    const high = ownerRows.filter((o) => o.risk_level === "high").length;
    items.push({
      source: "owner_dependence_items",
      module: "Owner dependency",
      title: `${ownerRows.length} owner-only tasks tracked`,
      detail: `${high} marked high risk.`,
      value: { count: ownerRows.length, high },
      client_safe: false,
    });
  }

  const bottlenecks = await safe(
    supabase
      .from("operational_bottlenecks")
      .select("title,severity,status,frequency")
      .eq("customer_id", customerId)
      .neq("status", "resolved")
      .limit(20),
  );
  const bnRows = (bottlenecks.data as any[]) ?? [];
  pushCount(counts, "operational_bottlenecks", bnRows.length);
  for (const b of bnRows.slice(0, 8)) {
    items.push({
      source: "operational_bottlenecks",
      module: "Operational bottleneck",
      title: b.title,
      detail: `Severity ${b.severity} · ${b.frequency} · status ${b.status}`,
      client_safe: false,
    });
  }

  const sops = await safe(
    supabase
      .from("operational_sops")
      .select("title,documented_level,status")
      .eq("customer_id", customerId)
      .limit(20),
  );
  const sopRows = (sops.data as any[]) ?? [];
  pushCount(counts, "operational_sops", sopRows.length);
  if (sopRows.length) {
    const undocumented = sopRows.filter(
      (s) => s.documented_level === "none" || s.documented_level === "informal",
    ).length;
    items.push({
      source: "operational_sops",
      module: "SOPs",
      title: `${sopRows.length} SOPs tracked`,
      detail: `${undocumented} are undocumented or informal.`,
      value: { total: sopRows.length, undocumented },
      client_safe: false,
    });
  }

  // --- Pipeline ---
  const deals = await safe(
    supabase
      .from("client_pipeline_deals")
      .select("status,estimated_value,weighted_value,expected_close_date")
      .eq("customer_id", customerId)
      .limit(200),
  );
  const dealRows = (deals.data as any[]) ?? [];
  pushCount(counts, "client_pipeline_deals", dealRows.length);
  if (dealRows.length) {
    const open = dealRows.filter((d) => d.status === "open");
    const weighted = open.reduce((s, d) => s + Number(d.weighted_value ?? 0), 0);
    const value = open.reduce((s, d) => s + Number(d.estimated_value ?? 0), 0);
    items.push({
      source: "client_pipeline_deals",
      module: "Sales pipeline",
      title: `${open.length} open deals`,
      value: { open: open.length, value, weighted },
      detail: `Open value ~${value.toFixed(0)} · weighted ~${weighted.toFixed(0)}`,
      client_safe: false,
    });
  }

  // --- Implementation: tasks + checklist ---
  const tasks = await safe(
    supabase
      .from("customer_tasks")
      .select("status,title,due_date")
      .eq("customer_id", customerId)
      .limit(100),
  );
  const taskRows = (tasks.data as any[]) ?? [];
  pushCount(counts, "customer_tasks", taskRows.length);
  if (taskRows.length) {
    const open = taskRows.filter((t) => t.status !== "completed").length;
    const done = taskRows.length - open;
    items.push({
      source: "customer_tasks",
      module: "Implementation tasks",
      title: `Tasks: ${done}/${taskRows.length} complete`,
      value: { open, done, total: taskRows.length },
      client_safe: false,
    });
  }

  const checklist = await safe(
    supabase
      .from("checklist_items")
      .select("completed,title")
      .eq("customer_id", customerId)
      .limit(100),
  );
  const clRows = (checklist.data as any[]) ?? [];
  if (clRows.length) {
    const done = clRows.filter((c) => c.completed).length;
    items.push({
      source: "checklist_items",
      module: "Implementation checklist",
      title: `Checklist: ${done}/${clRows.length}`,
      value: { done, total: clRows.length },
      client_safe: false,
    });
  }

  // --- Customer notes (admin-only) ---
  const cnotes = await safe(
    supabase
      .from("customer_notes")
      .select("content,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(3),
  );
  for (const n of (cnotes.data as any[]) ?? []) {
    items.push({
      source: "customer_notes",
      module: "Admin notes",
      title: "Internal note",
      detail: (n.content as string).slice(0, 280),
      occurred_at: n.created_at,
      client_safe: false,
      is_admin_entered: true,
    });
  }

  // --- Uploads ---
  const uploads = await safe(
    supabase
      .from("customer_uploads")
      .select("file_name,created_at")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(5),
  );
  const upRows = (uploads.data as any[]) ?? [];
  pushCount(counts, "customer_uploads", upRows.length);
  if (upRows.length) {
    items.push({
      source: "customer_uploads",
      module: "Uploaded files",
      title: `${upRows.length} recent files`,
      detail: upRows.map((u) => u.file_name).join(", "),
      client_safe: false,
      is_imported: true,
    });
  }

  if (isDemo) {
    notes.push("Demo/test account — content may include seeded showcase data.");
  }

  return {
    collected_at: new Date().toISOString(),
    customer_id: customerId,
    scorecard_run_id: opts.scorecardRunId ?? null,
    customer_label: customerLabel,
    is_demo_account: isDemo,
    items,
    counts,
    notes,
  };
}

/**
 * Collect evidence from a scorecard_runs row only — used when there is no
 * customer record yet (e.g. an inbound lead from /scorecard).
 */
export async function collectScorecardLeadEvidence(
  scorecardRunId: string,
): Promise<EvidenceSnapshot> {
  const { data } = await supabase
    .from("scorecard_runs")
    .select("*")
    .eq("id", scorecardRunId)
    .maybeSingle();
  const items: EvidenceItem[] = [];
  const notes: string[] = [];
  if (!data) {
    return {
      collected_at: new Date().toISOString(),
      customer_id: null,
      scorecard_run_id: scorecardRunId,
      customer_label: "Unknown lead",
      is_demo_account: false,
      items: [],
      counts: {},
      notes: ["Scorecard run not found."],
    };
  }
  const s: any = data;
  const label = s.business_name || `${s.first_name} ${s.last_name}`.trim();
  items.push({
    source: "scorecard_runs",
    module: "Conversational Scorecard",
    title: `${label} — band ${s.overall_band ?? "—"}`,
    value: {
      band: s.overall_band,
      confidence: s.overall_confidence,
      score_estimate: s.overall_score_estimate,
    },
    detail: `Confidence: ${s.overall_confidence} · Estimate: ${s.overall_score_estimate ?? "—"} (range ${s.overall_score_low ?? "—"}-${s.overall_score_high ?? "—"})`,
    occurred_at: s.created_at,
    confidence: (s.overall_confidence as any) ?? "low",
    client_safe: true,
  });

  const pillars = (s.pillar_results as any[]) ?? [];
  for (const p of pillars) {
    items.push({
      source: "scorecard_runs.pillar_results",
      module: `Pillar: ${p.pillar_label ?? p.pillar_key}`,
      title: `Band ${p.band ?? "—"} (${p.confidence ?? "—"})`,
      detail: p.rationale ?? "",
      client_safe: true,
    });
  }
  const missing = (s.missing_information as any[]) ?? [];
  if (missing.length) {
    notes.push(`Scorecard flagged ${missing.length} missing-info items.`);
  }
  return {
    collected_at: new Date().toISOString(),
    customer_id: null,
    scorecard_run_id: scorecardRunId,
    customer_label: label,
    is_demo_account: false,
    items,
    counts: { scorecard_runs: 1, pillars: pillars.length },
    notes,
  };
}