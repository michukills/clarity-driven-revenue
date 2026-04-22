import type { BccDataset } from "@/lib/bcc/types";
import { Money } from "./Money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";

function StatusPill({ kind, value }: { kind: "rev" | "inv" | "pay"; value: string }) {
  const map: Record<string, string> = {
    collected: "bg-emerald-500/15 text-emerald-300",
    paid: "bg-emerald-500/15 text-emerald-300",
    pending: "bg-amber-500/15 text-amber-300",
    sent: "bg-sky-500/15 text-sky-300",
    partially_paid: "bg-amber-500/15 text-amber-300",
    overdue: "bg-rose-500/15 text-rose-300",
    written_off: "bg-muted/40 text-muted-foreground",
    draft: "bg-muted/40 text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[value] || "bg-muted/40 text-muted-foreground"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function RevenueTable({
  rows,
  canDelete,
  onDelete,
  emptyLabel,
}: {
  rows: BccDataset["revenue"];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  emptyLabel?: string;
}) {
  if (!rows.length) return <Empty label={emptyLabel || "No revenue entries yet."} />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Client / Job</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {canDelete && <TableHead className="w-10"></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="text-xs text-muted-foreground">{r.entry_date}</TableCell>
            <TableCell className="text-sm">{r.service_category || "—"}</TableCell>
            <TableCell className="text-sm">{r.client_or_job || "—"}</TableCell>
            <TableCell className="text-xs">{r.revenue_type === "recurring" ? "Recurring" : "One-time"}</TableCell>
            <TableCell><StatusPill kind="rev" value={r.status} /></TableCell>
            <TableCell className="text-right tabular-nums"><Money value={r.amount} /></TableCell>
            {canDelete && (
              <TableCell className="text-right">
                <button
                  type="button"
                  onClick={() => onDelete?.(r.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Delete revenue entry"
                  title="Delete entry"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ExpenseTable({ rows }: { rows: BccDataset["expenses"] }) {
  if (!rows.length) return <Empty label="No expense entries yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-xs text-muted-foreground">{e.entry_date}</TableCell>
            <TableCell className="text-sm">{e.category_name || "—"}</TableCell>
            <TableCell className="text-sm">{e.vendor || "—"}</TableCell>
            <TableCell className="text-xs capitalize">{e.expense_type}</TableCell>
            <TableCell><StatusPill kind="pay" value={e.payment_status} /></TableCell>
            <TableCell className="text-right tabular-nums"><Money value={e.amount} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PayrollTable({ rows }: { rows: BccDataset["payroll"] }) {
  if (!rows.length) return <Empty label="No payroll entries yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pay period</TableHead>
          <TableHead>Person</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Total cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-xs text-muted-foreground">{p.pay_period_start} → {p.pay_period_end}</TableCell>
            <TableCell className="text-sm">{p.person_name || "—"}</TableCell>
            <TableCell className="text-sm">{p.role || "—"}</TableCell>
            <TableCell className="text-xs capitalize">{p.labor_type.replace("_", " ")}</TableCell>
            <TableCell className="text-right tabular-nums">{p.hours_worked ?? "—"}</TableCell>
            <TableCell className="text-right tabular-nums"><Money value={p.total_payroll_cost || p.gross_pay + p.payroll_taxes_fees} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InvoiceTable({ rows }: { rows: BccDataset["invoices"] }) {
  if (!rows.length) return <Empty label="No invoices yet." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client / Job</TableHead>
          <TableHead>Due</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Outstanding</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.id}>
            <TableCell className="text-xs">{i.invoice_number || "—"}</TableCell>
            <TableCell className="text-sm">{i.client_or_job || "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{i.due_date || "—"}</TableCell>
            <TableCell><StatusPill kind="inv" value={i.status} /></TableCell>
            <TableCell className="text-right tabular-nums"><Money value={Math.max(0, i.amount - i.amount_collected)} /></TableCell>
            <TableCell className="text-right tabular-nums"><Money value={i.amount} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground py-6 text-center">{label}</div>;
}