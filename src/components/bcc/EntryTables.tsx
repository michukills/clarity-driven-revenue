import type { BccDataset } from "@/lib/bcc/types";
import { Money } from "./Money";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowActions } from "./RowActions";

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
  canEdit,
  onDelete,
  onEdit,
  emptyLabel,
}: {
  rows: BccDataset["revenue"];
  canEdit?: boolean;
  onDelete?: (id: string) => void;
  onEdit?: (row: BccDataset["revenue"][number]) => void;
  emptyLabel?: string;
}) {
  if (!rows.length) return <Empty label={emptyLabel || "No revenue entries yet."} />;
  const showActions = canEdit && (onEdit || onDelete);
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
          {showActions && <TableHead className="w-20 text-right">Actions</TableHead>}
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
            {showActions && (
              <TableCell className="text-right">
                <RowActions
                  rowLabel="revenue entry"
                  row={r as unknown as Record<string, unknown>}
                  onEdit={onEdit ? () => onEdit(r) : undefined}
                  onDelete={onDelete ? () => onDelete(r.id) : undefined}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ExpenseTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: BccDataset["expenses"];
  canEdit?: boolean;
  onEdit?: (row: BccDataset["expenses"][number]) => void;
  onDelete?: (id: string) => void;
}) {
  if (!rows.length) return <Empty label="No expense entries yet." />;
  const showActions = canEdit && (onEdit || onDelete);
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
          {showActions && <TableHead className="w-20 text-right">Actions</TableHead>}
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
            {showActions && (
              <TableCell className="text-right">
                <RowActions
                  rowLabel="expense entry"
                  row={e as unknown as Record<string, unknown>}
                  onEdit={onEdit ? () => onEdit(e) : undefined}
                  onDelete={onDelete ? () => onDelete(e.id) : undefined}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function PayrollTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: BccDataset["payroll"];
  canEdit?: boolean;
  onEdit?: (row: BccDataset["payroll"][number]) => void;
  onDelete?: (id: string) => void;
}) {
  if (!rows.length) return <Empty label="No payroll entries yet." />;
  const showActions = canEdit && (onEdit || onDelete);
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
          {showActions && <TableHead className="w-20 text-right">Actions</TableHead>}
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
            {showActions && (
              <TableCell className="text-right">
                <RowActions
                  rowLabel="payroll entry"
                  row={p as unknown as Record<string, unknown>}
                  onEdit={onEdit ? () => onEdit(p) : undefined}
                  onDelete={onDelete ? () => onDelete(p.id) : undefined}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InvoiceTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: BccDataset["invoices"];
  canEdit?: boolean;
  onEdit?: (row: BccDataset["invoices"][number]) => void;
  onDelete?: (id: string) => void;
}) {
  if (!rows.length) return <Empty label="No invoices yet." />;
  const showActions = canEdit && (onEdit || onDelete);
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
          {showActions && <TableHead className="w-20 text-right">Actions</TableHead>}
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
            {showActions && (
              <TableCell className="text-right">
                <RowActions
                  rowLabel="invoice"
                  row={i as unknown as Record<string, unknown>}
                  onEdit={onEdit ? () => onEdit(i) : undefined}
                  onDelete={onDelete ? () => onDelete(i.id) : undefined}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CashFlowTable({
  rows,
  canEdit,
  onEdit,
  onDelete,
}: {
  rows: BccDataset["cashflow"];
  canEdit?: boolean;
  onEdit?: (row: BccDataset["cashflow"][number]) => void;
  onDelete?: (id: string) => void;
}) {
  if (!rows.length) return <Empty label="No cash flow entries yet." />;
  const showActions = canEdit && (onEdit || onDelete);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Direction</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          {showActions && <TableHead className="w-20 text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="text-xs text-muted-foreground">{c.entry_date}</TableCell>
            <TableCell className="text-xs capitalize">{c.direction.replace("_", " ")}</TableCell>
            <TableCell className="text-sm">{c.category || "—"}</TableCell>
            <TableCell className="text-sm">{c.description || "—"}</TableCell>
            <TableCell className="text-xs capitalize">{c.expected_or_actual}</TableCell>
            <TableCell className="text-right tabular-nums"><Money value={c.amount} /></TableCell>
            {showActions && (
              <TableCell className="text-right">
                <RowActions
                  rowLabel="cash flow entry"
                  row={c as unknown as Record<string, unknown>}
                  onEdit={onEdit ? () => onEdit(c) : undefined}
                  onDelete={onDelete ? () => onDelete(c.id) : undefined}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-xs text-muted-foreground py-6 text-center">{label}</div>;
}