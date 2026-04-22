import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface Props {
  customerId: string;
  onSaved: () => void;
}

const inputCls = "h-9 text-sm";
const labelCls = "text-[11px] uppercase tracking-wider text-muted-foreground";

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}
function SaveBar({ onSave, busy }: { onSave: () => void; busy: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onSave}
        disabled={busy}
        className="h-9 px-4 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save entry"}
      </button>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function RevenueQuickForm({ customerId, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    entry_date: today(), amount: "", service_category: "", client_or_job: "",
    revenue_type: "one_time", status: "collected", source_channel: "", notes: "",
  });
  const save = async () => {
    if (!f.amount) return toast({ title: "Amount required" });
    setBusy(true);
    const { error } = await supabase.from("revenue_entries").insert({
      customer_id: customerId,
      entry_date: f.entry_date,
      amount: Number(f.amount),
      service_category: f.service_category || null,
      client_or_job: f.client_or_job || null,
      revenue_type: f.revenue_type,
      status: f.status,
      source_channel: f.source_channel || null,
      notes: f.notes || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Revenue entry saved" });
    setF({ ...f, amount: "", client_or_job: "", notes: "" });
    onSaved();
  };
  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="Date"><Input className={inputCls} type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></Field>
        <Field label="Amount"><Input className={inputCls} type="number" inputMode="decimal" placeholder="0.00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Service / category"><Input className={inputCls} value={f.service_category} onChange={(e) => setF({ ...f, service_category: e.target.value })} /></Field>
        <Field label="Client / job"><Input className={inputCls} value={f.client_or_job} onChange={(e) => setF({ ...f, client_or_job: e.target.value })} /></Field>
        <Field label="Revenue type">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.revenue_type} onChange={(e) => setF({ ...f, revenue_type: e.target.value })}>
            <option value="one_time">One-time</option>
            <option value="recurring">Recurring</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="collected">Collected</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </Field>
        <Field label="Source / channel"><Input className={inputCls} value={f.source_channel} onChange={(e) => setF({ ...f, source_channel: e.target.value })} /></Field>
      </FieldRow>
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <SaveBar onSave={save} busy={busy} />
    </div>
  );
}

export function ExpenseQuickForm({ customerId, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ entry_date: today(), amount: "", category_name: "", vendor: "", expense_type: "variable", payment_status: "paid", notes: "" });
  const save = async () => {
    if (!f.amount) return toast({ title: "Amount required" });
    setBusy(true);
    const { error } = await supabase.from("expense_entries").insert({
      customer_id: customerId,
      entry_date: f.entry_date,
      amount: Number(f.amount),
      vendor: f.vendor || null,
      expense_type: f.expense_type,
      payment_status: f.payment_status,
      notes: f.category_name ? `[${f.category_name}] ${f.notes || ""}`.trim() : f.notes || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Expense saved" });
    setF({ ...f, amount: "", vendor: "", notes: "" });
    onSaved();
  };
  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="Date"><Input className={inputCls} type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></Field>
        <Field label="Amount"><Input className={inputCls} type="number" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Category"><Input className={inputCls} placeholder="Software, Rent, Marketing…" value={f.category_name} onChange={(e) => setF({ ...f, category_name: e.target.value })} /></Field>
        <Field label="Vendor"><Input className={inputCls} value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} /></Field>
        <Field label="Type">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.expense_type} onChange={(e) => setF({ ...f, expense_type: e.target.value })}>
            <option value="fixed">Fixed</option>
            <option value="variable">Variable</option>
          </select>
        </Field>
        <Field label="Payment status">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.payment_status} onChange={(e) => setF({ ...f, payment_status: e.target.value })}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </Field>
      </FieldRow>
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <SaveBar onSave={save} busy={busy} />
    </div>
  );
}

export function PayrollQuickForm({ customerId, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    pay_period_start: today(), pay_period_end: today(), person_name: "", role: "",
    gross_pay: "", payroll_taxes_fees: "", hours_worked: "", labor_type: "employee", notes: "",
  });
  const save = async () => {
    if (!f.gross_pay) return toast({ title: "Gross pay required" });
    setBusy(true);
    const gross = Number(f.gross_pay);
    const taxes = Number(f.payroll_taxes_fees || 0);
    const { error } = await supabase.from("payroll_entries").insert({
      customer_id: customerId,
      pay_period_start: f.pay_period_start,
      pay_period_end: f.pay_period_end,
      person_name: f.person_name || null,
      role: f.role || null,
      gross_pay: gross,
      payroll_taxes_fees: taxes,
      total_payroll_cost: gross + taxes,
      hours_worked: f.hours_worked ? Number(f.hours_worked) : null,
      labor_type: f.labor_type,
      notes: f.notes || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Payroll entry saved" });
    setF({ ...f, gross_pay: "", payroll_taxes_fees: "", hours_worked: "", notes: "" });
    onSaved();
  };
  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="Period start"><Input className={inputCls} type="date" value={f.pay_period_start} onChange={(e) => setF({ ...f, pay_period_start: e.target.value })} /></Field>
        <Field label="Period end"><Input className={inputCls} type="date" value={f.pay_period_end} onChange={(e) => setF({ ...f, pay_period_end: e.target.value })} /></Field>
        <Field label="Person"><Input className={inputCls} value={f.person_name} onChange={(e) => setF({ ...f, person_name: e.target.value })} /></Field>
        <Field label="Role"><Input className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} /></Field>
        <Field label="Gross pay"><Input className={inputCls} type="number" value={f.gross_pay} onChange={(e) => setF({ ...f, gross_pay: e.target.value })} /></Field>
        <Field label="Taxes & fees"><Input className={inputCls} type="number" value={f.payroll_taxes_fees} onChange={(e) => setF({ ...f, payroll_taxes_fees: e.target.value })} /></Field>
        <Field label="Hours worked"><Input className={inputCls} type="number" value={f.hours_worked} onChange={(e) => setF({ ...f, hours_worked: e.target.value })} /></Field>
        <Field label="Labor type">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.labor_type} onChange={(e) => setF({ ...f, labor_type: e.target.value })}>
            <option value="employee">Employee</option>
            <option value="contractor">Contractor</option>
            <option value="owner_draw">Owner draw</option>
          </select>
        </Field>
      </FieldRow>
      <Field label="Notes"><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      <SaveBar onSave={save} busy={busy} />
    </div>
  );
}

export function InvoiceQuickForm({ customerId, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    invoice_number: "", invoice_date: today(), due_date: today(), client_or_job: "",
    amount: "", amount_collected: "", status: "sent", notes: "",
  });
  const save = async () => {
    if (!f.amount) return toast({ title: "Amount required" });
    setBusy(true);
    const { error } = await supabase.from("invoice_entries").insert({
      customer_id: customerId,
      invoice_number: f.invoice_number || null,
      invoice_date: f.invoice_date || null,
      due_date: f.due_date || null,
      client_or_job: f.client_or_job || null,
      amount: Number(f.amount),
      amount_collected: Number(f.amount_collected || 0),
      status: f.status,
      notes: f.notes || null,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Invoice saved" });
    setF({ ...f, invoice_number: "", amount: "", amount_collected: "", notes: "" });
    onSaved();
  };
  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="Invoice #"><Input className={inputCls} value={f.invoice_number} onChange={(e) => setF({ ...f, invoice_number: e.target.value })} /></Field>
        <Field label="Invoice date"><Input className={inputCls} type="date" value={f.invoice_date} onChange={(e) => setF({ ...f, invoice_date: e.target.value })} /></Field>
        <Field label="Due date"><Input className={inputCls} type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
        <Field label="Client / job"><Input className={inputCls} value={f.client_or_job} onChange={(e) => setF({ ...f, client_or_job: e.target.value })} /></Field>
        <Field label="Amount"><Input className={inputCls} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Collected"><Input className={inputCls} type="number" value={f.amount_collected} onChange={(e) => setF({ ...f, amount_collected: e.target.value })} /></Field>
        <Field label="Status">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="written_off">Written off</option>
          </select>
        </Field>
      </FieldRow>
      <SaveBar onSave={save} busy={busy} />
    </div>
  );
}

export function CashFlowQuickForm({ customerId, onSaved }: Props) {
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ entry_date: today(), amount: "", direction: "cash_in", category: "", description: "", expected_or_actual: "actual" });
  const save = async () => {
    if (!f.amount) return toast({ title: "Amount required" });
    setBusy(true);
    const { error } = await supabase.from("cash_flow_entries").insert({
      customer_id: customerId,
      entry_date: f.entry_date,
      amount: Number(f.amount),
      direction: f.direction,
      category: f.category || null,
      description: f.description || null,
      expected_or_actual: f.expected_or_actual,
    });
    setBusy(false);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Cash flow entry saved" });
    setF({ ...f, amount: "", category: "", description: "" });
    onSaved();
  };
  return (
    <div className="space-y-3">
      <FieldRow>
        <Field label="Date"><Input className={inputCls} type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} /></Field>
        <Field label="Amount"><Input className={inputCls} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Direction">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
            <option value="cash_in">Cash in</option>
            <option value="cash_out">Cash out</option>
          </select>
        </Field>
        <Field label="Category"><Input className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} /></Field>
        <Field label="Description"><Input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Expected or actual">
          <select className={`w-full bg-background border border-input rounded-md ${inputCls} px-3`} value={f.expected_or_actual} onChange={(e) => setF({ ...f, expected_or_actual: e.target.value })}>
            <option value="actual">Actual</option>
            <option value="expected">Expected</option>
          </select>
        </Field>
      </FieldRow>
      <SaveBar onSave={save} busy={busy} />
    </div>
  );
}