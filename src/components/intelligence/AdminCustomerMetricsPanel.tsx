// P20.8 — Admin-only structured metrics input panel.
//
// Compact form for entering structured customer business metrics. Shows
// shared fields plus the subset relevant to the customer's resolved
// industry. Empty fields stay null. Admin-only by RLS; this component
// also refuses to mount on internal/admin operating accounts.

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";
import {
  getLatestCustomerMetrics,
  upsertCustomerMetrics,
} from "@/lib/customerMetrics/service";
import type {
  CustomerBusinessMetrics,
  CustomerMetricsConfidence,
  CustomerMetricsSource,
} from "@/lib/customerMetrics/types";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

type CustomerLike = {
  id: string;
  industry?: string | null;
  account_kind?: string | null;
};

const SOURCES: CustomerMetricsSource[] = [
  "manual",
  "csv_upload",
  "file_upload",
  "quickbooks",
  "pos_export",
  "admin_assumption",
  "client_input",
];
const CONFIDENCES: CustomerMetricsConfidence[] = [
  "Confirmed",
  "Estimated",
  "Needs Verification",
];

type FormState = Record<string, string>;

function toForm(m: CustomerBusinessMetrics | null): FormState {
  const f: FormState = {};
  if (!m) return f;
  for (const [k, v] of Object.entries(m)) {
    if (v === null || v === undefined) continue;
    f[k] = typeof v === "boolean" ? String(v) : String(v);
  }
  return f;
}

function parseNum(v: string): number | null {
  if (v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function parseBool(v: string): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

interface FieldDef {
  name: string;
  label: string;
  kind: "number" | "bool" | "pct" | "money" | "count";
  hint?: string;
}

const SHARED_FIELDS: FieldDef[] = [
  { name: "has_weekly_review", label: "Has weekly review", kind: "bool" },
  { name: "has_assigned_owners", label: "Has assigned owners", kind: "bool" },
  { name: "owner_is_bottleneck", label: "Owner is bottleneck", kind: "bool" },
  { name: "uses_manual_spreadsheet", label: "Uses manual spreadsheet", kind: "bool" },
  { name: "profit_visible", label: "Profit is visible", kind: "bool" },
  { name: "source_attribution_visible", label: "Source attribution visible", kind: "bool" },
];

const TRADES_FIELDS: FieldDef[] = [
  { name: "estimates_sent", label: "Estimates sent", kind: "count" },
  { name: "estimates_unsent", label: "Estimates unsent", kind: "count" },
  { name: "follow_up_backlog", label: "Follow-up backlog", kind: "count" },
  { name: "jobs_completed", label: "Jobs completed", kind: "count" },
  {
    name: "jobs_completed_not_invoiced",
    label: "Jobs completed, not invoiced",
    kind: "count",
  },
  { name: "gross_margin_pct", label: "Gross margin %", kind: "pct", hint: "0–100" },
  { name: "has_job_costing", label: "Has job costing", kind: "bool" },
  { name: "service_line_visibility", label: "Service-line visibility", kind: "bool" },
  { name: "unpaid_invoice_amount", label: "Unpaid invoices ($)", kind: "money" },
];

const RESTAURANT_FIELDS: FieldDef[] = [
  { name: "daily_sales", label: "Daily sales ($)", kind: "money" },
  { name: "food_cost_pct", label: "Food cost %", kind: "pct", hint: "0–100" },
  { name: "labor_cost_pct", label: "Labor cost %", kind: "pct", hint: "0–100" },
  {
    name: "gross_margin_pct_restaurant",
    label: "Gross margin %",
    kind: "pct",
    hint: "0–100",
  },
  { name: "tracks_waste", label: "Tracks waste", kind: "bool" },
  { name: "has_daily_reporting", label: "Has daily reporting", kind: "bool" },
  { name: "menu_margin_visible", label: "Menu margin visible", kind: "bool" },
  {
    name: "vendor_cost_change_pct",
    label: "Vendor cost change %",
    kind: "pct",
    hint: "-100..100",
  },
  { name: "average_ticket", label: "Average ticket ($)", kind: "money" },
];

const RETAIL_FIELDS: FieldDef[] = [
  { name: "dead_stock_value", label: "Dead stock value ($)", kind: "money" },
  { name: "inventory_turnover", label: "Inventory turnover (x)", kind: "number" },
  { name: "stockout_count", label: "Stockout count", kind: "count" },
  { name: "return_rate_pct", label: "Return rate %", kind: "pct", hint: "0–100" },
  { name: "has_category_margin", label: "Has category margin", kind: "bool" },
  {
    name: "high_sales_low_margin_count",
    label: "High sales / low margin SKU count",
    kind: "count",
  },
  { name: "inventory_value", label: "Inventory value ($)", kind: "money" },
  { name: "average_order_value", label: "Average order value ($)", kind: "money" },
];

const CANNABIS_FIELDS: FieldDef[] = [
  { name: "cannabis_gross_margin_pct", label: "Gross margin %", kind: "pct", hint: "0–100" },
  { name: "cannabis_product_margin_visible", label: "Product margin visible", kind: "bool" },
  { name: "cannabis_category_margin_visible", label: "Category margin visible", kind: "bool" },
  { name: "cannabis_dead_stock_value", label: "Dead stock value ($)", kind: "money" },
  { name: "cannabis_stockout_count", label: "Stockout count", kind: "count" },
  { name: "cannabis_inventory_turnover", label: "Inventory turnover (x)", kind: "number" },
  { name: "cannabis_shrinkage_pct", label: "Shrinkage %", kind: "pct", hint: "0–100" },
  {
    name: "cannabis_discount_impact_pct",
    label: "Discount impact %",
    kind: "pct",
    hint: "0–100",
  },
  {
    name: "cannabis_promotion_impact_pct",
    label: "Promotion impact %",
    kind: "pct",
    hint: "0–100",
  },
  {
    name: "cannabis_vendor_cost_increase_pct",
    label: "Vendor cost increase %",
    kind: "pct",
    hint: "-100..100",
  },
  {
    name: "cannabis_payment_reconciliation_gap",
    label: "Payment reconciliation gap",
    kind: "bool",
  },
  {
    name: "cannabis_has_daily_or_weekly_reporting",
    label: "Has daily/weekly reporting",
    kind: "bool",
  },
  {
    name: "cannabis_uses_manual_pos_workaround",
    label: "Uses manual POS workaround",
    kind: "bool",
  },
  {
    name: "cannabis_high_sales_low_margin_count",
    label: "High sales / low margin SKU count",
    kind: "count",
  },
  { name: "cannabis_inventory_value", label: "Inventory value ($)", kind: "money" },
];

function fieldsForIndustry(industry: IndustryCategory): FieldDef[] {
  switch (industry) {
    case "trade_field_service":
      return TRADES_FIELDS;
    case "restaurant":
      return RESTAURANT_FIELDS;
    case "retail":
      return RETAIL_FIELDS;
    case "mmj_cannabis":
      return CANNABIS_FIELDS;
    default:
      return [];
  }
}

export interface AdminCustomerMetricsPanelProps {
  customer: CustomerLike;
  industry: IndustryCategory;
  onSaved?: () => void;
}

export function AdminCustomerMetricsPanel({
  customer,
  industry,
  onSaved,
}: AdminCustomerMetricsPanelProps) {
  const { toast } = useToast();
  const isClientFlow = isCustomerFlowAccount(customer);
  const [form, setForm] = useState<FormState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isClientFlow) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getLatestCustomerMetrics(customer.id)
      .then((row) => {
        if (!cancelled) setForm(toForm(row));
      })
      .catch(() => {
        if (!cancelled) setForm({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow]);

  if (!isClientFlow) {
    return null;
  }

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        industry,
        source: (form.source as CustomerMetricsSource) || "manual",
        confidence:
          (form.confidence as CustomerMetricsConfidence) || "Needs Verification",
      };
      const allFields = [
        ...SHARED_FIELDS,
        ...TRADES_FIELDS,
        ...RESTAURANT_FIELDS,
        ...RETAIL_FIELDS,
        ...CANNABIS_FIELDS,
      ];
      for (const f of allFields) {
        const raw = form[f.name];
        if (raw === undefined || raw === "") {
          payload[f.name] = null;
          continue;
        }
        payload[f.name] = f.kind === "bool" ? parseBool(raw) : parseNum(raw);
      }
      await upsertCustomerMetrics(customer.id, payload as never);
      toast({ title: "Metrics saved" });
      onSaved?.();
    } catch (e: any) {
      toast({
        title: "Could not save metrics",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const industryFields = fieldsForIndustry(industry);

  return (
    <section
      data-testid="admin-customer-metrics"
      className="rounded-xl border border-border bg-card/40 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Structured metrics (admin only)</h3>
        </div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          All fields optional
        </span>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Loading metrics…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Source</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.source ?? "manual"}
                onChange={(e) => set("source", e.target.value)}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Confidence</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.confidence ?? "Needs Verification"}
                onChange={(e) => set("confidence", e.target.value)}
              >
                {CONFIDENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FieldGroup
            title="Shared"
            fields={SHARED_FIELDS}
            form={form}
            onChange={set}
          />
          {industryFields.length > 0 && (
            <FieldGroup
              title={`Industry: ${industry}`}
              fields={industryFields}
              form={form}
              onChange={set}
            />
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={onSave} disabled={saving} size="sm">
              {saving ? "Saving…" : "Save metrics"}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function FieldGroup({
  title,
  fields,
  form,
  onChange,
}: {
  title: string;
  fields: FieldDef[];
  form: FormState;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.name}>
            <Label className="text-xs" htmlFor={`m-${f.name}`}>
              {f.label}
              {f.hint ? (
                <span className="ml-1 text-muted-foreground">({f.hint})</span>
              ) : null}
            </Label>
            {f.kind === "bool" ? (
              <select
                id={`m-${f.name}`}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form[f.name] ?? ""}
                onChange={(e) => onChange(f.name, e.target.value)}
              >
                <option value="">—</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            ) : (
              <Input
                id={`m-${f.name}`}
                type="number"
                inputMode="decimal"
                step="any"
                value={form[f.name] ?? ""}
                onChange={(e) => onChange(f.name, e.target.value)}
                className="mt-1"
                placeholder="—"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminCustomerMetricsPanel;