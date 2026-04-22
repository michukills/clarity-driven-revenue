import { useMemo, useState } from "react";
import { computeMetrics, computeHealth } from "@/lib/bcc/engine";
import { Money, fmtPct } from "./Money";
import type { BccDataset } from "@/lib/bcc/types";
import { HealthScoreCard } from "./HealthScoreCard";
import { ProfitDashboard } from "./ProfitDashboard";
import { CashFlowPanel } from "./CashFlowPanel";
import { RevenueTable, ExpenseTable, PayrollTable, InvoiceTable } from "./EntryTables";
import { RevenueQuickForm, ExpenseQuickForm, PayrollQuickForm, InvoiceQuickForm, CashFlowQuickForm } from "./QuickEntryForms";
import { BusinessControlReport } from "./BusinessControlReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowRight, DollarSign, Receipt, Users, FileText, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  data: BccDataset;
  customerId: string | null;
  isSample: boolean;
  audience: "client" | "admin";
  onChange: () => void;
  adminNotes?: string | null;
  /** Optional initial tab. Defaults to "overview". */
  defaultTab?: string;
  /** Notified when the user switches tabs (lets parent sync URL). */
  onTabChange?: (value: string) => void;
};

function ModuleCard({
  title,
  subtitle,
  formOpen,
  setFormOpen,
  form,
  table,
  customerId,
}: {
  title: string;
  subtitle: string;
  formOpen: boolean;
  setFormOpen: (b: boolean) => void;
  form: React.ReactNode;
  table: React.ReactNode;
  customerId: string | null;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm text-foreground font-medium">{title}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {customerId && (
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          >
            <Plus className="h-3 w-3" /> {formOpen ? "Close" : "Add entry"}
          </button>
        )}
      </div>
      {formOpen && customerId && <div className="mb-4 rounded-lg bg-muted/10 border border-border p-4">{form}</div>}
      {table}
    </section>
  );
}

export function BusinessControlCenterView({
  data, customerId, isSample, audience, onChange, adminNotes, defaultTab, onTabChange,
}: Props) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const h = useMemo(() => computeHealth(m, data), [m, data]);

  const [revOpen, setRevOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);

  const cid = customerId || "";

  // Controlled tab state — keeps URL deep-links and click-to-jump in sync.
  const [tab, setTab] = useState<string>(defaultTab || "overview");
  // Sync when parent changes defaultTab (e.g. user navigates back/forward).
  useMemo(() => {
    if (defaultTab && defaultTab !== tab) setTab(defaultTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  const goTab = (v: string) => {
    setTab(v);
    onTabChange?.(v);
  };

  return (
    <div className="space-y-6">
      {isSample && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          You are viewing sample data. Add a revenue, expense, payroll, invoice, or cash flow entry to start using your real numbers.
        </div>
      )}

      <Tabs value={tab} onValueChange={goTab} className="space-y-5">
        <TabsList className="bg-muted/20 border border-border h-10">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs">Payroll & Labor</TabsTrigger>
          <TabsTrigger value="invoices" className="text-xs">Invoices</TabsTrigger>
          <TabsTrigger value="cash" className="text-xs">Cash Flow</TabsTrigger>
          <TabsTrigger value="report" className="text-xs">Business Control Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <ProfitDashboard m={m} />
              <CashFlowPanel m={m} />
            </div>
            <div className="space-y-5">
              <HealthScoreCard health={h} />
            </div>
          </div>

          {/* Quick Access — every BCC module is reachable from Overview */}
          <section className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h3 className="text-sm text-foreground font-medium">Trackers</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Open a tracker to add entries or review what's been recorded.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <TrackerTile
                icon={DollarSign}
                title="Revenue Tracker"
                description="What came in — collected, pending, overdue, recurring vs one-time."
                onOpen={() => goTab("revenue")}
                count={data.revenue.length}
              />
              <TrackerTile
                icon={Receipt}
                title="Expense Tracker"
                description="What went out — fixed vs variable, by category and vendor."
                onOpen={() => goTab("expenses")}
                count={data.expenses.length}
              />
              <TrackerTile
                icon={Users}
                title="Payroll & Labor Tracker"
                description="Team and owner pay — and how labor splits across the business."
                onOpen={() => goTab("payroll")}
                count={data.payroll.length}
              />
              <TrackerTile
                icon={FileText}
                title="Invoices & Receivables"
                description="What's been invoiced, collected, and what's overdue."
                onOpen={() => goTab("invoices")}
                count={data.invoices.length}
              />
              <TrackerTile
                icon={Wallet}
                title="Cash Flow"
                description="Actual and expected cash movement and obligations."
                onOpen={() => goTab("cash")}
                count={data.cashflow.length}
              />
              <TrackerTile
                icon={ArrowRight}
                title="Business Control Report"
                description="What the numbers mean and the recommended RGS next step."
                onOpen={() => goTab("report")}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="revenue">
          {!isSample && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <SummaryStat label="Total revenue" value={<Money value={m.totalRevenue} />} />
              <SummaryStat label="Collected" value={<Money value={m.collectedRevenue} />} tone="ok" />
              <SummaryStat label="Pending" value={<Money value={m.pendingRevenue} />} tone="watch" />
              <SummaryStat label="Overdue" value={<Money value={m.overdueRevenue} />} tone="critical" />
              <SummaryStat label="Recurring share" value={fmtPct(m.recurringRevenuePct)} />
              <SummaryStat label="Top client share" value={fmtPct(m.topClientShare)} />
              <SummaryStat label="Top service share" value={fmtPct(m.topServiceShare)} />
              <SummaryStat label="Entries" value={String(data.revenue.length)} />
            </div>
          )}
          <ModuleCard
            title="Revenue Tracker"
            subtitle={
              audience === "admin"
                ? "Revenue data supports the Business Control Report, Revenue Leak Detection System, and Financial Visibility Diagnostic."
                : "Revenue entries help RGS OS identify what came in, what is still outstanding, and where revenue patterns may need attention."
            }
            formOpen={revOpen}
            setFormOpen={setRevOpen}
            form={<RevenueQuickForm customerId={cid} onSaved={() => { setRevOpen(false); onChange(); }} />}
            table={
              <RevenueTable
                rows={data.revenue}
                canDelete={!isSample && !!customerId}
                onDelete={async (id) => {
                  if (!confirm("Delete this revenue entry? This cannot be undone.")) return;
                  const { error } = await supabase.from("revenue_entries").delete().eq("id", id);
                  if (error) {
                    toast.error(error.message || "Could not delete entry");
                    return;
                  }
                  toast.success("Revenue entry removed");
                  onChange();
                }}
                emptyLabel="No revenue has been recorded for this period yet. Add revenue entries to begin building your Business Control Report."
              />
            }
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <ModuleCard
            title="Expense Tracker"
            subtitle="What went out — fixed vs. variable, by category and vendor."
            formOpen={expOpen}
            setFormOpen={setExpOpen}
            form={<ExpenseQuickForm customerId={cid} onSaved={() => { setExpOpen(false); onChange(); }} />}
            table={<ExpenseTable rows={data.expenses} />}
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="payroll">
          <ModuleCard
            title="Payroll & Labor Tracker"
            subtitle="What the team and owner were paid — and how labor splits across employee, contractor, owner draw."
            formOpen={payOpen}
            setFormOpen={setPayOpen}
            form={<PayrollQuickForm customerId={cid} onSaved={() => { setPayOpen(false); onChange(); }} />}
            table={<PayrollTable rows={data.payroll} />}
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="invoices">
          <ModuleCard
            title="Invoices & Receivables"
            subtitle="What's been invoiced, what's been collected, what's overdue."
            formOpen={invOpen}
            setFormOpen={setInvOpen}
            form={<InvoiceQuickForm customerId={cid} onSaved={() => { setInvOpen(false); onChange(); }} />}
            table={<InvoiceTable rows={data.invoices} />}
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="cash">
          <ModuleCard
            title="Cash Flow"
            subtitle="Actual and expected cash movement, runway estimate, and obligations."
            formOpen={cashOpen}
            setFormOpen={setCashOpen}
            form={<CashFlowQuickForm customerId={cid} onSaved={() => { setCashOpen(false); onChange(); }} />}
            table={
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <CashFlowPanel m={m} />
              </div>
            }
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="report">
          <BusinessControlReport data={data} audience={audience} adminNotes={adminNotes} isSample={isSample} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "watch" | "critical" }) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "watch"
      ? "text-amber-300"
      : tone === "critical"
      ? "text-rose-300"
      : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-light tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}