import { useMemo, useState } from "react";
import { computeMetrics, computeHealth } from "@/lib/bcc/engine";
import type { BccDataset } from "@/lib/bcc/types";
import { HealthScoreCard } from "./HealthScoreCard";
import { ProfitDashboard } from "./ProfitDashboard";
import { CashFlowPanel } from "./CashFlowPanel";
import { RevenueTable, ExpenseTable, PayrollTable, InvoiceTable } from "./EntryTables";
import { RevenueQuickForm, ExpenseQuickForm, PayrollQuickForm, InvoiceQuickForm, CashFlowQuickForm } from "./QuickEntryForms";
import { BusinessControlReport } from "./BusinessControlReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

type Props = {
  data: BccDataset;
  customerId: string | null;
  isSample: boolean;
  audience: "client" | "admin";
  onChange: () => void;
  adminNotes?: string | null;
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

export function BusinessControlCenterView({ data, customerId, isSample, audience, onChange, adminNotes }: Props) {
  const m = useMemo(() => computeMetrics(data), [data]);
  const h = useMemo(() => computeHealth(m, data), [m, data]);

  const [revOpen, setRevOpen] = useState(false);
  const [expOpen, setExpOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [cashOpen, setCashOpen] = useState(false);

  const cid = customerId || "";

  return (
    <div className="space-y-6">
      {isSample && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
          You are viewing sample data. Add a revenue, expense, payroll, invoice, or cash flow entry to start using your real numbers.
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-5">
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
        </TabsContent>

        <TabsContent value="revenue">
          <ModuleCard
            title="Revenue Tracker"
            subtitle="What came in this period — by service, client, and source."
            formOpen={revOpen}
            setFormOpen={setRevOpen}
            form={<RevenueQuickForm customerId={cid} onSaved={() => { setRevOpen(false); onChange(); }} />}
            table={<RevenueTable rows={data.revenue} />}
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