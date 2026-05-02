// P20.10 — Admin-only "Metric Context" display panel.
//
// PURE PRESENTATIONAL. Reads the latest `client_business_metrics` row for a
// customer and renders only the metrics that have values, grouped by
// Shared / Industry. Context-only fields (e.g. restaurant daily_sales,
// average_ticket, retail average_order_value) are clearly marked
// "Context"; finding-driving fields are marked "Used in findings".
//
// Does NOT change scoring, brain logic, or thresholds. Does NOT mount on
// the internal RGS/admin operating account. Cannabis/MMC copy is strictly
// regulated retail / inventory / margin / dispensary operations — no
// healthcare wording.

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";
import { getLatestCustomerMetrics } from "@/lib/customerMetrics/service";
import type { CustomerBusinessMetrics } from "@/lib/customerMetrics/types";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

type CustomerLike = {
  id: string;
  industry?: string | null;
  account_kind?: string | null;
};

type MetricKind = "money" | "pct" | "bool" | "count" | "number";
type MetricRole = "used_in_findings" | "context";

interface MetricDef {
  name: keyof CustomerBusinessMetrics;
  label: string;
  kind: MetricKind;
  role: MetricRole;
}

const SHARED: MetricDef[] = [
  { name: "has_weekly_review", label: "Weekly review", kind: "bool", role: "used_in_findings" },
  { name: "has_assigned_owners", label: "Assigned owners", kind: "bool", role: "used_in_findings" },
  { name: "owner_is_bottleneck", label: "Owner bottleneck", kind: "bool", role: "used_in_findings" },
  { name: "uses_manual_spreadsheet", label: "Manual spreadsheet", kind: "bool", role: "used_in_findings" },
  { name: "profit_visible", label: "Profit visibility", kind: "bool", role: "used_in_findings" },
  { name: "source_attribution_visible", label: "Source attribution", kind: "bool", role: "used_in_findings" },
];

const TRADES: MetricDef[] = [
  { name: "unpaid_invoice_amount", label: "Unpaid invoices", kind: "money", role: "used_in_findings" },
  { name: "estimates_sent", label: "Estimates sent", kind: "count", role: "used_in_findings" },
  { name: "estimates_unsent", label: "Estimates unsent", kind: "count", role: "used_in_findings" },
  { name: "follow_up_backlog", label: "Follow-up backlog", kind: "count", role: "used_in_findings" },
  { name: "jobs_completed", label: "Jobs completed", kind: "count", role: "used_in_findings" },
  { name: "jobs_completed_not_invoiced", label: "Jobs completed, not invoiced", kind: "count", role: "used_in_findings" },
  { name: "gross_margin_pct", label: "Gross margin", kind: "pct", role: "used_in_findings" },
  { name: "has_job_costing", label: "Job costing", kind: "bool", role: "used_in_findings" },
  { name: "service_line_visibility", label: "Service-line visibility", kind: "bool", role: "used_in_findings" },
];

const RESTAURANT: MetricDef[] = [
  { name: "daily_sales", label: "Daily sales", kind: "money", role: "context" },
  { name: "average_ticket", label: "Average ticket", kind: "money", role: "context" },
  { name: "food_cost_pct", label: "Food cost", kind: "pct", role: "used_in_findings" },
  { name: "labor_cost_pct", label: "Labor cost", kind: "pct", role: "used_in_findings" },
  { name: "gross_margin_pct_restaurant", label: "Gross margin", kind: "pct", role: "used_in_findings" },
  { name: "tracks_waste", label: "Tracks waste", kind: "bool", role: "used_in_findings" },
  { name: "has_daily_reporting", label: "Daily reporting", kind: "bool", role: "used_in_findings" },
  { name: "menu_margin_visible", label: "Menu margin visibility", kind: "bool", role: "used_in_findings" },
  { name: "vendor_cost_change_pct", label: "Vendor cost change", kind: "pct", role: "used_in_findings" },
];

const RETAIL: MetricDef[] = [
  { name: "inventory_value", label: "Inventory value", kind: "money", role: "used_in_findings" },
  { name: "average_order_value", label: "Average order value", kind: "money", role: "context" },
  { name: "dead_stock_value", label: "Dead stock value", kind: "money", role: "used_in_findings" },
  { name: "stockout_count", label: "Stockout count", kind: "count", role: "used_in_findings" },
  { name: "return_rate_pct", label: "Return rate", kind: "pct", role: "used_in_findings" },
  { name: "has_category_margin", label: "Category margin visibility", kind: "bool", role: "used_in_findings" },
  { name: "high_sales_low_margin_count", label: "High-sales / low-margin SKUs", kind: "count", role: "used_in_findings" },
];

// Cannabis / MMC = regulated retail / inventory / margin / dispensary
// operations only. Do NOT add patient/claim/reimbursement/appointment/
// provider/clinical/diagnosis/insurance fields here.
const CANNABIS: MetricDef[] = [
  { name: "cannabis_inventory_value", label: "Cannabis inventory value", kind: "money", role: "used_in_findings" },
  { name: "cannabis_dead_stock_value", label: "Cannabis dead stock value", kind: "money", role: "used_in_findings" },
  { name: "cannabis_stockout_count", label: "Cannabis stockout count", kind: "count", role: "used_in_findings" },
  { name: "cannabis_gross_margin_pct", label: "Cannabis gross margin", kind: "pct", role: "used_in_findings" },
  { name: "cannabis_product_margin_visible", label: "Product margin visibility", kind: "bool", role: "used_in_findings" },
  { name: "cannabis_category_margin_visible", label: "Category margin visibility", kind: "bool", role: "used_in_findings" },
  { name: "cannabis_shrinkage_pct", label: "Cannabis shrinkage", kind: "pct", role: "used_in_findings" },
  { name: "cannabis_discount_impact_pct", label: "Discount impact on margin", kind: "pct", role: "used_in_findings" },
  { name: "cannabis_promotion_impact_pct", label: "Promotion impact on margin", kind: "pct", role: "used_in_findings" },
  { name: "cannabis_vendor_cost_increase_pct", label: "Vendor cost increase", kind: "pct", role: "used_in_findings" },
  { name: "cannabis_payment_reconciliation_gap", label: "Payment reconciliation gap", kind: "bool", role: "used_in_findings" },
  { name: "cannabis_has_daily_or_weekly_reporting", label: "Daily/weekly reporting", kind: "bool", role: "used_in_findings" },
  { name: "cannabis_uses_manual_pos_workaround", label: "Manual POS workaround", kind: "bool", role: "used_in_findings" },
  { name: "cannabis_high_sales_low_margin_count", label: "High-sales / low-margin SKUs", kind: "count", role: "used_in_findings" },
];

function industryFields(industry: IndustryCategory): { label: string; fields: MetricDef[] } {
  switch (industry) {
    case "trade_field_service":
      return { label: "Trades / Services", fields: TRADES };
    case "restaurant":
      return { label: "Restaurant", fields: RESTAURANT };
    case "retail":
      return { label: "Retail", fields: RETAIL };
    case "mmj_cannabis":
      return { label: "Cannabis / MMJ / Rec (retail / inventory / margin)", fields: CANNABIS };
    default:
      return { label: "Industry", fields: [] };
  }
}

export function formatMetric(value: unknown, kind: MetricKind): string {
  if (value === null || value === undefined || value === "") return "Needs Verification";
  if (kind === "bool") {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Needs Verification";
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "Needs Verification";
  if (kind === "money") return `$${Math.round(n).toLocaleString("en-US")}`;
  if (kind === "pct") {
    // Stored 0..100 in the DB; render as a human percent.
    return `${Math.round(n * 10) / 10}%`;
  }
  if (kind === "count") return Math.round(n).toLocaleString("en-US");
  return String(n);
}

export interface AdminMetricContextPanelProps {
  customer: CustomerLike;
  industry: IndustryCategory;
  /**
   * Optional preloaded metrics (used by tests and to avoid re-fetching when
   * a parent already has the row).
   */
  metrics?: CustomerBusinessMetrics | null;
}

export function AdminMetricContextPanel({
  customer,
  industry,
  metrics: preloaded,
}: AdminMetricContextPanelProps) {
  const isClientFlow = isCustomerFlowAccount(customer);
  const [metrics, setMetrics] = useState<CustomerBusinessMetrics | null>(
    preloaded ?? null,
  );
  const [loading, setLoading] = useState(preloaded === undefined);

  useEffect(() => {
    if (preloaded !== undefined) {
      setMetrics(preloaded ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!isClientFlow) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getLatestCustomerMetrics(customer.id)
      .then((row) => {
        if (!cancelled) setMetrics(row);
      })
      .catch(() => {
        if (!cancelled) setMetrics(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow, preloaded]);

  const ind = industryFields(industry);

  const sharedRows = useMemo(
    () => SHARED.filter((f) => metrics && metrics[f.name] !== null && metrics[f.name] !== undefined),
    [metrics],
  );
  const industryRows = useMemo(
    () => ind.fields.filter((f) => metrics && metrics[f.name] !== null && metrics[f.name] !== undefined),
    [metrics, ind.fields],
  );

  // Derived: dead-stock ratio when both inventory_value and dead_stock_value
  // are present. Display-only; does not change scoring.
  const retailDeadStockRatio = useMemo(() => {
    if (industry !== "retail" || !metrics) return null;
    const dv = metrics.dead_stock_value;
    const iv = metrics.inventory_value;
    if (typeof dv === "number" && typeof iv === "number" && iv > 0) {
      return Math.round(((dv / iv) * 100) * 10) / 10;
    }
    return null;
  }, [metrics, industry]);
  const cannabisDeadStockRatio = useMemo(() => {
    if (industry !== "mmj_cannabis" || !metrics) return null;
    const dv = metrics.cannabis_dead_stock_value;
    const iv = metrics.cannabis_inventory_value;
    if (typeof dv === "number" && typeof iv === "number" && iv > 0) {
      return Math.round(((dv / iv) * 100) * 10) / 10;
    }
    return null;
  }, [metrics, industry]);

  if (!isClientFlow) return null;

  return (
    <section
      data-testid="admin-metric-context"
      className="rounded-xl border border-border bg-card/40 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Metric context (admin only)</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Display only · does not change scoring
        </span>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading metric context…</div>
      ) : !metrics ? (
        <p className="text-xs text-muted-foreground">
          No structured metrics on file yet. Use the Structured Metrics panel
          above to enter values you can support with evidence.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="text-[11px] text-muted-foreground">
            Source: <span className="text-foreground capitalize">{metrics.source ?? "manual"}</span>
            {" · "}
            Confidence: <span className="text-foreground">{metrics.confidence ?? "Needs Verification"}</span>
          </div>

          <MetricGroup title="Shared" rows={sharedRows} metrics={metrics} />

          {industryRows.length > 0 ? (
            <MetricGroup title={ind.label} rows={industryRows} metrics={metrics} />
          ) : (
            ind.fields.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                No {ind.label} metrics entered yet.
              </p>
            )
          )}

          {retailDeadStockRatio !== null && (
            <DerivedRow
              label="Dead stock ratio"
              value={`${retailDeadStockRatio}%`}
              hint="dead stock value ÷ inventory value"
            />
          )}
          {cannabisDeadStockRatio !== null && (
            <DerivedRow
              label="Cannabis dead stock ratio"
              value={`${cannabisDeadStockRatio}%`}
              hint="cannabis dead stock value ÷ cannabis inventory value"
            />
          )}
        </div>
      )}
    </section>
  );
}

function MetricGroup({
  title,
  rows,
  metrics,
}: {
  title: string;
  rows: MetricDef[];
  metrics: CustomerBusinessMetrics;
}) {
  if (rows.length === 0) {
    return (
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
          {title}
        </div>
        <p className="text-[11px] text-muted-foreground">No values entered.</p>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-1.5">
        {title}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
        {rows.map((f) => (
          <li
            key={String(f.name)}
            className="flex items-center justify-between text-xs"
            data-testid={`metric-row-${String(f.name)}`}
          >
            <span className="text-muted-foreground">{f.label}</span>
            <span className="flex items-center gap-2">
              <span className="text-foreground tabular-nums">
                {formatMetric(metrics[f.name], f.kind)}
              </span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] ${
                  f.role === "context"
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                }`}
              >
                {f.role === "context" ? "Context" : "Used in findings"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DerivedRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 p-2 text-xs"
      data-testid={`derived-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="text-muted-foreground">
        {label} <span className="text-[10px]">({hint})</span>
      </span>
      <span className="text-foreground tabular-nums">{value}</span>
    </div>
  );
}

export default AdminMetricContextPanel;