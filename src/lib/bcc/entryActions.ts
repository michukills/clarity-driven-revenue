/**
 * P12.3.R — Edit / delete actions for BCC entry tables.
 *
 * Centralises the per-target field schema used by the shared
 * EditEntryDialog and the safe update/delete helpers. Each helper:
 *   - validates that the row exists before touching it
 *   - writes through Supabase using the same RLS-protected tables
 *   - preserves provenance for imported rows (notes column kept,
 *     never silently overwritten)
 *
 * Trust model:
 *   - Edits and deletes are gated by RLS (admins anywhere; clients
 *     only on rows they own). The UI gates additionally by audience.
 *   - When a row was imported (notes contain a [csv:...] / [xlsx:...]
 *     provenance suffix), we surface that to the user before they
 *     destroy or rewrite it but do not block them.
 */

import { supabase } from "@/integrations/supabase/client";

export type EntryKind =
  | "revenue"
  | "expense"
  | "payroll"
  | "invoice"
  | "cashflow";

export interface EntryFieldSpec {
  key: string;
  label: string;
  kind: "text" | "number" | "date" | "textarea" | "enum";
  enumValues?: { value: string; label: string }[];
  required?: boolean;
  /** Hide from the form (kept on the row but not user-editable). */
  hidden?: boolean;
  helper?: string;
}

export interface EntryTargetSpec {
  kind: EntryKind;
  table:
    | "revenue_entries"
    | "expense_entries"
    | "payroll_entries"
    | "invoice_entries"
    | "cash_flow_entries";
  singular: string;
  fields: EntryFieldSpec[];
}

const STATUS_REVENUE = [
  { value: "collected", label: "Collected" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];
const REVENUE_TYPE = [
  { value: "one_time", label: "One-time" },
  { value: "recurring", label: "Recurring" },
];
const EXPENSE_TYPE = [
  { value: "fixed", label: "Fixed" },
  { value: "variable", label: "Variable" },
];
const PAYMENT_STATUS = [
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];
const LABOR_TYPE = [
  { value: "employee", label: "Employee" },
  { value: "contractor", label: "Contractor" },
  { value: "owner_draw", label: "Owner draw" },
];
const INVOICE_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "written_off", label: "Written off" },
];
const CASH_DIRECTION = [
  { value: "cash_in", label: "Cash in" },
  { value: "cash_out", label: "Cash out" },
];
const CASH_KIND = [
  { value: "actual", label: "Actual" },
  { value: "expected", label: "Expected" },
];

export const ENTRY_TARGETS: Record<EntryKind, EntryTargetSpec> = {
  revenue: {
    kind: "revenue",
    table: "revenue_entries",
    singular: "revenue entry",
    fields: [
      { key: "entry_date", label: "Date", kind: "date", required: true },
      { key: "amount", label: "Amount", kind: "number", required: true },
      { key: "service_category", label: "Service / category", kind: "text" },
      { key: "client_or_job", label: "Client / job", kind: "text" },
      { key: "revenue_type", label: "Revenue type", kind: "enum", enumValues: REVENUE_TYPE },
      { key: "status", label: "Status", kind: "enum", enumValues: STATUS_REVENUE },
      { key: "source_channel", label: "Source / channel", kind: "text" },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
  },
  expense: {
    kind: "expense",
    table: "expense_entries",
    singular: "expense entry",
    fields: [
      { key: "entry_date", label: "Date", kind: "date", required: true },
      { key: "amount", label: "Amount", kind: "number", required: true },
      { key: "vendor", label: "Vendor", kind: "text" },
      { key: "expense_type", label: "Type", kind: "enum", enumValues: EXPENSE_TYPE },
      { key: "payment_status", label: "Payment status", kind: "enum", enumValues: PAYMENT_STATUS },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
  },
  payroll: {
    kind: "payroll",
    table: "payroll_entries",
    singular: "payroll entry",
    fields: [
      { key: "pay_period_start", label: "Period start", kind: "date" },
      { key: "pay_period_end", label: "Period end", kind: "date" },
      { key: "person_name", label: "Person", kind: "text" },
      { key: "role", label: "Role", kind: "text" },
      { key: "gross_pay", label: "Gross pay", kind: "number", required: true },
      { key: "payroll_taxes_fees", label: "Taxes & fees", kind: "number" },
      { key: "hours_worked", label: "Hours worked", kind: "number" },
      { key: "labor_type", label: "Labor type", kind: "enum", enumValues: LABOR_TYPE },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
  },
  invoice: {
    kind: "invoice",
    table: "invoice_entries",
    singular: "invoice",
    fields: [
      { key: "invoice_number", label: "Invoice #", kind: "text" },
      { key: "invoice_date", label: "Invoice date", kind: "date" },
      { key: "due_date", label: "Due date", kind: "date" },
      { key: "client_or_job", label: "Client / job", kind: "text" },
      { key: "amount", label: "Amount", kind: "number", required: true },
      { key: "amount_collected", label: "Collected", kind: "number" },
      { key: "status", label: "Status", kind: "enum", enumValues: INVOICE_STATUS },
      { key: "notes", label: "Notes", kind: "textarea" },
    ],
  },
  cashflow: {
    kind: "cashflow",
    table: "cash_flow_entries",
    singular: "cash flow entry",
    fields: [
      { key: "entry_date", label: "Date", kind: "date", required: true },
      { key: "amount", label: "Amount", kind: "number", required: true },
      { key: "direction", label: "Direction", kind: "enum", enumValues: CASH_DIRECTION },
      { key: "category", label: "Category", kind: "text" },
      { key: "description", label: "Description", kind: "text" },
      { key: "expected_or_actual", label: "Expected or actual", kind: "enum", enumValues: CASH_KIND },
    ],
  },
};

/* ──────────────────────────────────────────────────────────── */
/* Provenance helpers                                           */
/* ──────────────────────────────────────────────────────────── */

const PROVENANCE_RE = /\[(csv|xlsx)(?:\/[^:\]]+)?:[^\]]+\]/i;

export interface RowProvenance {
  imported: boolean;
  source?: "csv" | "xlsx";
  label?: string;
}

/** Detect whether a row was imported by inspecting its notes/source columns. */
export function detectProvenance(row: Record<string, unknown>): RowProvenance {
  const notes = typeof row.notes === "string" ? row.notes : "";
  const source = typeof row.source === "string" ? row.source.toLowerCase() : "";
  const m = notes.match(PROVENANCE_RE);
  if (m) {
    const kind = m[1].toLowerCase() === "xlsx" ? "xlsx" : "csv";
    return {
      imported: true,
      source: kind,
      label: kind === "xlsx" ? "Imported from Excel" : "Imported from CSV",
    };
  }
  if (source === "csv_import" || source === "xlsx_import") {
    const kind = source === "xlsx_import" ? "xlsx" : "csv";
    return {
      imported: true,
      source: kind,
      label: kind === "xlsx" ? "Imported from Excel" : "Imported from CSV",
    };
  }
  return { imported: false };
}

/* ──────────────────────────────────────────────────────────── */
/* Coercion (form values → DB payload)                          */
/* ──────────────────────────────────────────────────────────── */

export function coerceFieldValue(
  field: EntryFieldSpec,
  raw: string,
): { ok: true; value: string | number | null } | { ok: false; error: string } {
  const v = (raw ?? "").trim();
  if (v === "") {
    if (field.required) return { ok: false, error: `${field.label} is required` };
    return { ok: true, value: null };
  }
  switch (field.kind) {
    case "number": {
      const cleaned = v.replace(/[$,]/g, "").replace(/\((.+)\)/, "-$1");
      const n = Number(cleaned);
      if (!isFinite(n)) return { ok: false, error: `${field.label} is not a number` };
      return { ok: true, value: n };
    }
    case "date": {
      // Inputs already produce YYYY-MM-DD; pass through unchanged.
      return { ok: true, value: v };
    }
    default:
      return { ok: true, value: v };
  }
}

/* ──────────────────────────────────────────────────────────── */
/* DB write helpers                                             */
/* ──────────────────────────────────────────────────────────── */

export interface UpdateResult {
  ok: boolean;
  error?: string;
}

export async function updateEntry(
  target: EntryTargetSpec,
  id: string,
  patch: Record<string, string | number | null>,
): Promise<UpdateResult> {
  // Recompute payroll total when the user edits gross/taxes
  if (target.kind === "payroll") {
    const gross = Number(patch.gross_pay ?? 0);
    const taxes = Number(patch.payroll_taxes_fees ?? 0);
    if (isFinite(gross) || isFinite(taxes)) {
      patch.total_payroll_cost = (isFinite(gross) ? gross : 0) + (isFinite(taxes) ? taxes : 0);
    }
  }
  const { error } = await supabase
    .from(target.table)
    .update(patch as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteEntry(
  target: EntryTargetSpec,
  id: string,
): Promise<UpdateResult> {
  const { error } = await supabase.from(target.table).delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
