import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  FileText,
  Search,
  Plus,
  ExternalLink,
  Send,
  Archive,
  Trash2,
  Activity,
} from "lucide-react";
import type { BusinessControlReport, ReportType, ReportStatus } from "@/lib/bcc/reportTypes";
import {
  buildMonthlySnapshot,
  buildQuarterlySnapshot,
  defaultPeriod,
} from "@/lib/bcc/reportEngine";
import type { BccDataset } from "@/lib/bcc/types";

interface Customer {
  id: string;
  full_name: string;
  business_name: string | null;
  monitoring_status: string | null;
  monitoring_tier: string | null;
}

const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};
const TYPE_LABEL: Record<ReportType, string> = {
  monthly: "Monthly Business Health",
  quarterly: "Quarterly Stability Review",
};
const TIER_LABEL: Record<string, string> = {
  none: "None",
  monthly_monitoring: "Monthly Monitoring",
  quarterly_stability_review: "Quarterly Stability Review",
  full_business_control_monitoring: "Full Business Control Monitoring",
};
const MONITORING_STATUS_LABEL: Record<string, string> = {
  not_active: "Not active",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const fmtDate = (iso: string) =>
  `${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

async function loadFullDataset(customerId: string): Promise<BccDataset> {
  const [revenue, expenses, payroll, labor, invoices, cashflow, goals, weekly] = await Promise.all([
    supabase.from("revenue_entries").select("*").eq("customer_id", customerId),
    supabase.from("expense_entries").select("*").eq("customer_id", customerId),
    supabase.from("payroll_entries").select("*").eq("customer_id", customerId),
    supabase.from("labor_entries").select("*").eq("customer_id", customerId),
    supabase.from("invoice_entries").select("*").eq("customer_id", customerId),
    supabase.from("cash_flow_entries").select("*").eq("customer_id", customerId),
    supabase.from("business_goals").select("*").eq("customer_id", customerId),
    supabase.from("weekly_checkins").select("*").eq("customer_id", customerId).order("week_end", { ascending: false }),
  ]);
  return {
    revenue: (revenue.data as any) || [],
    expenses: (expenses.data as any) || [],
    payroll: (payroll.data as any) || [],
    labor: (labor.data as any) || [],
    invoices: (invoices.data as any) || [],
    cashflow: (cashflow.data as any) || [],
    goals: (goals.data as any) || [],
    weekly_checkins: (weekly.data as any) || [],
  };
}

export default function AdminReports() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<BusinessControlReport[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

  // Generate-draft form
  const [genCustomerId, setGenCustomerId] = useState<string>("");
  const [genType, setGenType] = useState<ReportType>("monthly");
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      supabase
        .from("business_control_reports")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id, full_name, business_name, monitoring_status, monitoring_tier")
        .order("full_name"),
    ]);
    if (r.data) setReports(r.data as any);
    if (c.data) setCustomers(c.data as any);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return reports.filter((r) => {
      if (customerFilter !== "all" && r.customer_id !== customerFilter) return false;
      if (typeFilter !== "all" && r.report_type !== typeFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (periodFilter !== "all") {
        const ym = r.period_end?.slice(0, 7);
        if (ym !== periodFilter) return false;
      }
      if (q) {
        const cust = customerMap.get(r.customer_id);
        const hay = [
          cust?.full_name,
          cust?.business_name,
          r.report_type,
          r.status,
          r.recommended_next_step,
          r.client_notes,
          r.internal_notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, search, customerFilter, typeFilter, statusFilter, periodFilter, customerMap]);

  const periodOptions = useMemo(() => {
    const set = new Set<string>();
    reports.forEach((r) => r.period_end && set.add(r.period_end.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [reports]);

  const generateDraft = async () => {
    if (!genCustomerId) {
      toast.error("Pick a client first.");
      return;
    }
    setGenerating(true);
    try {
      const cust = customerMap.get(genCustomerId);
      if (!cust) throw new Error("Client not found");
      const label = cust.business_name || cust.full_name;
      const period = defaultPeriod(genType);
      const dataset = await loadFullDataset(genCustomerId);
      const snapshot =
        genType === "monthly"
          ? buildMonthlySnapshot(dataset, period.start, period.end, label)
          : buildQuarterlySnapshot(dataset, period.start, period.end, label);

      const { data: u } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from("business_control_reports")
        .insert([
          {
            customer_id: genCustomerId,
            report_type: genType,
            period_start: period.start,
            period_end: period.end,
            status: "draft",
            health_score: snapshot.healthScore,
            recommended_next_step: snapshot.recommendedNextStep,
            report_data: snapshot as any,
            created_by: u.user?.id ?? null,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      toast.success("Draft report generated");
      if (created) navigate(`/admin/reports/${(created as any).id}`);
    } catch (e: any) {
      toast.error(e.message || "Could not generate report");
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: ReportStatus) => {
    const patch: any = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("business_control_reports").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Report ${STATUS_LABEL[status].toLowerCase()}`);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this report? This cannot be undone.")) return;
    const { error } = await supabase.from("business_control_reports").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Report deleted");
    load();
  };

  const updateMonitoring = async (
    customerId: string,
    field: "monitoring_status" | "monitoring_tier",
    value: string,
  ) => {
    const { error } = await supabase.from("customers").update({ [field]: value }).eq("id", customerId);
    if (error) return toast.error(error.message);
    toast.success("Monitoring updated");
    load();
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS · Recurring Value</div>
        <h1 className="mt-1 text-3xl text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Reports & Monitoring
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Generate Monthly Business Health Reports and Quarterly Stability Reviews from each
          client's weekly check-in data. Reports are saved as snapshots — once published, they
          do not change when new weekly data is entered.
        </p>
      </div>

      {/* Generate */}
      <section className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Generate draft report
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Client</label>
            <select
              value={genCustomerId}
              onChange={(e) => setGenCustomerId(e.target.value)}
              className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
            >
              <option value="">— Select client —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name || c.full_name} {c.business_name ? `· ${c.full_name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Report type</label>
            <select
              value={genType}
              onChange={(e) => setGenType(e.target.value as ReportType)}
              className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
            >
              <option value="monthly">Monthly Business Health</option>
              <option value="quarterly">Quarterly Stability Review</option>
            </select>
          </div>
          <Button onClick={generateDraft} disabled={generating} className="bg-primary hover:bg-secondary h-10">
            <Activity className="h-4 w-4" /> {generating ? "Generating…" : "Generate draft"}
          </Button>
        </div>
      </section>

      {/* Monitoring quick-manage */}
      <section className="bg-card border border-border rounded-xl p-5 mb-6">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
          Client monitoring tiers
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left py-2">Client</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Tier</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="py-2 text-foreground">{c.business_name || c.full_name}</td>
                  <td className="py-2">
                    <select
                      value={c.monitoring_status || "not_active"}
                      onChange={(e) => updateMonitoring(c.id, "monitoring_status", e.target.value)}
                      className="bg-muted/40 border border-border rounded-md px-2 py-1 text-xs text-foreground"
                    >
                      {Object.entries(MONITORING_STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2">
                    <select
                      value={c.monitoring_tier || "none"}
                      onChange={(e) => updateMonitoring(c.id, "monitoring_tier", e.target.value)}
                      className="bg-muted/40 border border-border rounded-md px-2 py-1 text-xs text-foreground"
                    >
                      {Object.entries(TIER_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Search</label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Client, type, status, notes…"
              className="pl-9 bg-muted/40 border-border"
            />
          </div>
        </div>
        <FilterSelect label="Client" value={customerFilter} onChange={setCustomerFilter}>
          <option value="all">All clients</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.business_name || c.full_name}</option>
          ))}
        </FilterSelect>
        <FilterSelect label="Type" value={typeFilter} onChange={setTypeFilter}>
          <option value="all">All types</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
        </FilterSelect>
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </FilterSelect>
        <FilterSelect label="Period" value={periodFilter} onChange={setPeriodFilter}>
          <option value="all">All periods</option>
          {periodOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </FilterSelect>
        <div className="text-xs text-muted-foreground pb-2">
          {filtered.length} of {reports.length} reports
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading reports…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No reports yet. Generate a draft above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Client</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Period</th>
                <th className="text-left px-4 py-3">Health</th>
                <th className="text-left px-4 py-3">Next step</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cust = customerMap.get(r.customer_id);
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3 text-foreground">{cust?.business_name || cust?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABEL[r.report_type]}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.health_score != null ? `${r.health_score}/100` : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.recommended_next_step || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={r.status as ReportStatus} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/reports/${r.id}`)} className="border-border h-8">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </Button>
                      {r.status === "draft" && (
                        <button
                          onClick={() => setStatus(r.id, "published")}
                          className="ml-2 text-emerald-400 hover:text-emerald-300"
                          title="Publish"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {r.status === "published" && (
                        <button
                          onClick={() => setStatus(r.id, "archived")}
                          className="ml-2 text-muted-foreground hover:text-foreground"
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => remove(r.id)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PortalShell>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-[160px]">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
      >
        {children}
      </select>
    </div>
  );
}

function StatusPill({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, string> = {
    draft: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    archived: "border-border bg-muted/30 text-muted-foreground",
  };
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded border ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
