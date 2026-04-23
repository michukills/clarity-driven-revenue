/**
 * P12.3 — CSV / Spreadsheet Import Layer.
 *
 * Provides the practical bridge between manual data entry and full
 * connector maturity: a structured CSV import path that respects the
 * P12.2 planning architecture (truth roles, verification policy,
 * default-deny for unknown fields).
 *
 * Responsibilities:
 *   - Parse uploaded CSV (xlsx left as architectural extension point)
 *   - Offer typed import targets (revenue, expense, invoice, obligation,
 *     cash position, pipeline deal)
 *   - Suggest column → field mapping by header heuristics
 *   - Default-deny unknown columns
 *   - Validate rows, classify into auto-trust / client-verify /
 *     admin-review / skip per planning policy
 *   - Tag every staged row with provenance (source = csv, batch id,
 *     confidence, verification, import target, timestamp)
 *   - Prevent silent re-import of the same batch (batch id derived from
 *     file hash) and detect intra-file duplicates
 *   - Commit auto-trust rows directly into local trusted tables; stage
 *     client/admin-review rows into integration_external_records so the
 *     existing reconciliation surfaces handle them.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  FIELD_MAPPINGS,
  type VerificationPolicy,
  type MappingConfidence,
  type TruthRole,
} from "@/lib/integrations/planning";

/* ──────────────────────────────────────────────────────────── */
/* Target registry                                              */
/* ──────────────────────────────────────────────────────────── */

export type ImportTargetId =
  | "revenue_entries"
  | "expense_entries"
  | "invoice_entries"
  | "financial_obligations"
  | "cash_position_snapshots"
  | "client_pipeline_deals";

export type FieldKind = "string" | "number" | "date" | "enum";

export interface ImportFieldSpec {
  key: string;
  label: string;
  required: boolean;
  kind: FieldKind;
  enumValues?: string[];
  /** Header tokens we'll accept as auto-mappings (lowercased). */
  aliases: string[];
  /** Default if column is unmapped/blank. */
  defaultValue?: string | number;
  /** Per-field truth role override (otherwise inherited from target). */
  truthRole?: TruthRole;
}

export interface ImportTargetSpec {
  id: ImportTargetId;
  label: string;
  description: string;
  /** Where rows ultimately live. */
  table: ImportTargetId;
  /** Default verification policy for this target. */
  defaultVerification: VerificationPolicy;
  /** Default truth role. */
  defaultTruthRole: TruthRole;
  /** Fields that compose a row. */
  fields: ImportFieldSpec[];
  /** Subset of field keys that, combined, identify a logical row for dedupe. */
  dedupeKeys: string[];
  /** Whether clients are allowed to import directly (vs admin-only). */
  clientAllowed: boolean;
  /** record_kind used when staging into integration_external_records. */
  externalRecordKind:
    | "revenue"
    | "expense"
    | "invoice"
    | "obligation"
    | "cash_position"
    | "other";
}

export const IMPORT_TARGETS: ImportTargetSpec[] = [
  {
    id: "revenue_entries",
    label: "Revenue entries",
    description:
      "Historical or recent revenue lines. Activates monthly/weekly revenue truth.",
    table: "revenue_entries",
    defaultVerification: "client_verify",
    defaultTruthRole: "source_of_truth",
    clientAllowed: true,
    externalRecordKind: "revenue",
    dedupeKeys: ["entry_date", "amount", "client_or_job"],
    fields: [
      {
        key: "entry_date",
        label: "Date",
        required: true,
        kind: "date",
        aliases: ["date", "entry_date", "invoice date", "month", "period"],
      },
      {
        key: "amount",
        label: "Amount",
        required: true,
        kind: "number",
        aliases: ["amount", "revenue", "total", "amt", "value"],
      },
      {
        key: "service_category",
        label: "Service / Category",
        required: false,
        kind: "string",
        aliases: ["service", "category", "service_category", "type"],
        truthRole: "imported_supporting",
      },
      {
        key: "client_or_job",
        label: "Client / Job",
        required: false,
        kind: "string",
        aliases: ["client", "customer", "job", "account", "client_or_job"],
      },
      {
        key: "revenue_type",
        label: "Revenue type",
        required: false,
        kind: "enum",
        enumValues: ["one_time", "recurring"],
        aliases: ["revenue_type", "type"],
        defaultValue: "one_time",
      },
      {
        key: "status",
        label: "Status",
        required: false,
        kind: "enum",
        enumValues: ["collected", "pending", "refunded"],
        aliases: ["status"],
        defaultValue: "collected",
      },
    ],
  },
  {
    id: "expense_entries",
    label: "Expense entries",
    description: "Vendor / category expenses. Category mapping needs review.",
    table: "expense_entries",
    defaultVerification: "admin_review",
    defaultTruthRole: "source_of_truth",
    clientAllowed: true,
    externalRecordKind: "expense",
    dedupeKeys: ["entry_date", "amount", "vendor"],
    fields: [
      {
        key: "entry_date",
        label: "Date",
        required: true,
        kind: "date",
        aliases: ["date", "entry_date", "expense date"],
      },
      {
        key: "amount",
        label: "Amount",
        required: true,
        kind: "number",
        aliases: ["amount", "total", "cost", "value"],
      },
      {
        key: "vendor",
        label: "Vendor",
        required: false,
        kind: "string",
        aliases: ["vendor", "payee", "supplier", "merchant"],
      },
      {
        key: "expense_type",
        label: "Expense type",
        required: false,
        kind: "enum",
        enumValues: ["fixed", "variable"],
        aliases: ["expense_type", "type"],
        defaultValue: "variable",
      },
      {
        key: "payment_status",
        label: "Payment status",
        required: false,
        kind: "enum",
        enumValues: ["paid", "pending", "overdue"],
        aliases: ["payment_status", "status"],
        defaultValue: "paid",
      },
    ],
  },
  {
    id: "invoice_entries",
    label: "Invoices / AR",
    description: "Sent and outstanding invoices. Totals can auto-trust.",
    table: "invoice_entries",
    defaultVerification: "auto_trust",
    defaultTruthRole: "source_of_truth",
    clientAllowed: true,
    externalRecordKind: "invoice",
    dedupeKeys: ["invoice_number", "amount"],
    fields: [
      {
        key: "invoice_number",
        label: "Invoice #",
        required: false,
        kind: "string",
        aliases: ["invoice_number", "invoice", "number", "ref", "id"],
      },
      {
        key: "invoice_date",
        label: "Invoice date",
        required: false,
        kind: "date",
        aliases: ["invoice_date", "date", "issued"],
      },
      {
        key: "due_date",
        label: "Due date",
        required: false,
        kind: "date",
        aliases: ["due_date", "due", "payable"],
      },
      {
        key: "amount",
        label: "Amount",
        required: true,
        kind: "number",
        aliases: ["amount", "total", "balance"],
      },
      {
        key: "amount_collected",
        label: "Collected",
        required: false,
        kind: "number",
        aliases: ["amount_collected", "paid", "collected"],
        defaultValue: 0,
      },
      {
        key: "client_or_job",
        label: "Client",
        required: false,
        kind: "string",
        aliases: ["client", "customer", "client_or_job"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        kind: "enum",
        enumValues: ["sent", "paid", "overdue", "void"],
        aliases: ["status"],
        defaultValue: "sent",
      },
    ],
  },
  {
    id: "financial_obligations",
    label: "Obligations / bills",
    description: "Upcoming payments — taxes, loans, recurring fixed costs.",
    table: "financial_obligations",
    defaultVerification: "admin_review",
    defaultTruthRole: "source_of_truth",
    clientAllowed: false,
    externalRecordKind: "obligation",
    dedupeKeys: ["label", "due_date", "amount_due"],
    fields: [
      {
        key: "label",
        label: "Label",
        required: true,
        kind: "string",
        aliases: ["label", "name", "description"],
      },
      {
        key: "obligation_type",
        label: "Type",
        required: false,
        kind: "enum",
        enumValues: ["tax", "loan", "rent", "payroll", "subscription", "other"],
        aliases: ["type", "obligation_type", "category"],
        defaultValue: "other",
      },
      {
        key: "amount_due",
        label: "Amount due",
        required: true,
        kind: "number",
        aliases: ["amount", "amount_due", "balance", "total"],
      },
      {
        key: "due_date",
        label: "Due date",
        required: true,
        kind: "date",
        aliases: ["due_date", "due", "date"],
      },
      {
        key: "vendor_or_payee",
        label: "Payee",
        required: false,
        kind: "string",
        aliases: ["vendor", "payee", "vendor_or_payee", "to"],
      },
      {
        key: "priority",
        label: "Priority",
        required: false,
        kind: "enum",
        enumValues: ["low", "medium", "high"],
        aliases: ["priority"],
        defaultValue: "medium",
      },
    ],
  },
  {
    id: "cash_position_snapshots",
    label: "Cash position snapshots",
    description: "Point-in-time cash on hand. Admin-controlled truth.",
    table: "cash_position_snapshots",
    defaultVerification: "admin_review",
    defaultTruthRole: "source_of_truth",
    clientAllowed: false,
    externalRecordKind: "cash_position",
    dedupeKeys: ["snapshot_date"],
    fields: [
      {
        key: "snapshot_date",
        label: "Date",
        required: true,
        kind: "date",
        aliases: ["date", "snapshot_date", "as_of"],
      },
      {
        key: "cash_on_hand",
        label: "Cash on hand",
        required: true,
        kind: "number",
        aliases: ["cash", "cash_on_hand", "balance", "amount"],
      },
      {
        key: "available_cash",
        label: "Available cash",
        required: false,
        kind: "number",
        aliases: ["available", "available_cash"],
      },
      {
        key: "restricted_cash",
        label: "Restricted cash",
        required: false,
        kind: "number",
        aliases: ["restricted", "restricted_cash"],
      },
    ],
  },
  {
    id: "client_pipeline_deals",
    label: "Pipeline deals",
    description: "Open and recent sales opportunities.",
    table: "client_pipeline_deals",
    defaultVerification: "client_verify",
    defaultTruthRole: "imported_supporting",
    clientAllowed: true,
    externalRecordKind: "other",
    dedupeKeys: ["title", "company_or_contact", "estimated_value"],
    fields: [
      {
        key: "title",
        label: "Title",
        required: true,
        kind: "string",
        aliases: ["title", "deal", "name", "opportunity"],
      },
      {
        key: "company_or_contact",
        label: "Company / contact",
        required: false,
        kind: "string",
        aliases: ["company", "contact", "account", "company_or_contact"],
      },
      {
        key: "estimated_value",
        label: "Estimated value",
        required: true,
        kind: "number",
        aliases: ["amount", "value", "estimated_value", "total"],
      },
      {
        key: "probability_percent",
        label: "Probability %",
        required: false,
        kind: "number",
        aliases: ["probability", "probability_percent", "confidence"],
        defaultValue: 50,
      },
      {
        key: "expected_close_date",
        label: "Expected close",
        required: false,
        kind: "date",
        aliases: ["close_date", "expected_close", "expected_close_date"],
      },
      {
        key: "source_channel",
        label: "Source channel",
        required: false,
        kind: "string",
        aliases: ["source", "channel", "source_channel"],
      },
      {
        key: "status",
        label: "Status",
        required: false,
        kind: "enum",
        enumValues: ["open", "won", "lost"],
        aliases: ["status"],
        defaultValue: "open",
      },
    ],
  },
];

export function getTarget(id: ImportTargetId): ImportTargetSpec {
  const t = IMPORT_TARGETS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown import target: ${id}`);
  return t;
}

/* ──────────────────────────────────────────────────────────── */
/* CSV parsing                                                  */
/* ──────────────────────────────────────────────────────────── */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  rawLineCount: number;
}

export class CsvParseError extends Error {
  code: "empty" | "no_headers" | "duplicate_headers" | "ragged" | "binary";
  constructor(code: CsvParseError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "CsvParseError";
  }
}

/** Minimal RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes, CRLF.
 *  Throws CsvParseError on conditions the user needs to fix (empty / binary /
 *  duplicate header columns / no header row). */
export function parseCsv(text: string): ParsedCsv {
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.trim() === "") {
    throw new CsvParseError("empty", "The file is empty.");
  }
  // Cheap binary sniff: lots of NULs is not a CSV
  let nulls = 0;
  for (let i = 0; i < Math.min(text.length, 2000); i++) if (text.charCodeAt(i) === 0) nulls++;
  if (nulls > 4) {
    throw new CsvParseError(
      "binary",
      "This doesn't look like a text CSV. Export your spreadsheet as CSV and try again.",
    );
  }
  const out: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        out.push(row);
        row = [];
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    out.push(row);
  }
  // Drop fully-empty trailing rows
  const cleaned = out.filter((r) => r.some((c) => c.trim() !== ""));
  if (cleaned.length === 0) {
    throw new CsvParseError("no_headers", "No header row detected.");
  }
  const headers = cleaned[0].map((h) => h.trim());
  if (headers.every((h) => h === "")) {
    throw new CsvParseError("no_headers", "Header row is blank.");
  }
  const seenHeaders = new Set<string>();
  for (const h of headers) {
    const k = h.toLowerCase();
    if (k && seenHeaders.has(k)) {
      throw new CsvParseError(
        "duplicate_headers",
        `Duplicate column header "${h}". Rename so every column is unique.`,
      );
    }
    seenHeaders.add(k);
  }
  const rows = cleaned.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
  return { headers, rows, rawLineCount: cleaned.length };
}

/* ──────────────────────────────────────────────────────────── */
/* Header → field auto-mapping                                  */
/* ──────────────────────────────────────────────────────────── */

export interface ColumnMapping {
  /** Header text from CSV. */
  column: string;
  /** Field key it maps to, or null = ignored / unknown. */
  fieldKey: string | null;
  confidence: MappingConfidence;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function suggestMappings(
  headers: string[],
  target: ImportTargetSpec,
): ColumnMapping[] {
  return headers.map((h): ColumnMapping => {
    const n = norm(h);
    // exact key match
    const exact = target.fields.find((f) => norm(f.key) === n);
    if (exact) return { column: h, fieldKey: exact.key, confidence: "high" };
    // alias match
    const alias = target.fields.find((f) =>
      f.aliases.some((a) => norm(a) === n),
    );
    if (alias) return { column: h, fieldKey: alias.key, confidence: "high" };
    // partial alias contains
    const partial = target.fields.find((f) =>
      f.aliases.some((a) => n.includes(norm(a)) || norm(a).includes(n)),
    );
    if (partial)
      return { column: h, fieldKey: partial.key, confidence: "medium" };
    return { column: h, fieldKey: null, confidence: "low" };
  });
}

/* ──────────────────────────────────────────────────────────── */
/* Value coercion + row validation                              */
/* ──────────────────────────────────────────────────────────── */

export function coerceValue(
  raw: string,
  field: ImportFieldSpec,
): { ok: true; value: string | number | null } | { ok: false; error: string } {
  const v = (raw ?? "").trim();
  if (v === "") {
    if (field.required) return { ok: false, error: `${field.label} required` };
    if (field.defaultValue !== undefined) return { ok: true, value: field.defaultValue };
    return { ok: true, value: null };
  }
  switch (field.kind) {
    case "number": {
      const cleaned = v.replace(/[$,]/g, "").replace(/\((.+)\)/, "-$1");
      const n = Number(cleaned);
      if (!isFinite(n)) return { ok: false, error: `${field.label} not numeric` };
      return { ok: true, value: n };
    }
    case "date": {
      const t = Date.parse(v);
      if (isNaN(t)) return { ok: false, error: `${field.label} bad date` };
      return { ok: true, value: new Date(t).toISOString().slice(0, 10) };
    }
    case "enum": {
      const lower = v.toLowerCase();
      const match = field.enumValues?.find((e) => e.toLowerCase() === lower);
      if (!match) {
        if (field.defaultValue !== undefined) return { ok: true, value: field.defaultValue };
        return { ok: false, error: `${field.label} unknown value "${v}"` };
      }
      return { ok: true, value: match };
    }
    case "string":
    default:
      return { ok: true, value: v };
  }
}

export type RowDisposition =
  | "auto_trust"
  | "client_verify"
  | "admin_review"
  | "skipped";

export interface StagedRow {
  index: number;
  values: Record<string, string | number | null>;
  errors: string[];
  warnings: string[];
  disposition: RowDisposition;
  duplicateOfIndex?: number;
  /** Stable, human-readable reason if this row was skipped. */
  skipReason?: "validation" | "duplicate" | "missing_required";
}

export interface ValidationOutcome {
  rows: StagedRow[];
  unknownColumns: string[];
  unmappedRequiredFields: string[];
  counts: Record<RowDisposition, number>;
}

export function validateRows(args: {
  raw: Record<string, string>[];
  mappings: ColumnMapping[];
  target: ImportTargetSpec;
}): ValidationOutcome {
  const { raw, mappings, target } = args;
  const fieldByKey = new Map(target.fields.map((f) => [f.key, f]));
  const mappedFieldKeys = new Set(
    mappings.filter((m) => m.fieldKey).map((m) => m.fieldKey as string),
  );
  const unknownColumns = mappings.filter((m) => !m.fieldKey).map((m) => m.column);
  const unmappedRequiredFields = target.fields
    .filter((f) => f.required && !mappedFieldKeys.has(f.key))
    .map((f) => f.key);

  const seen = new Map<string, number>();
  const rows: StagedRow[] = raw.map((rawRow, index): StagedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const values: Record<string, string | number | null> = {};

    // First populate defaults for required-but-unmapped → as errors at file level
    for (const f of target.fields) {
      if (f.defaultValue !== undefined) values[f.key] = f.defaultValue;
    }

    for (const m of mappings) {
      if (!m.fieldKey) continue;
      const f = fieldByKey.get(m.fieldKey);
      if (!f) continue;
      const r = coerceValue(rawRow[m.column] ?? "", f);
      if (r.ok === false) {
        errors.push(r.error);
      } else {
        values[f.key] = r.value;
      }
      if (m.confidence === "medium")
        warnings.push(`Column "${m.column}" → ${f.label} (medium confidence)`);
    }

    // required-but-unmapped → row-level error
    for (const fk of unmappedRequiredFields) {
      const f = fieldByKey.get(fk);
      if (f) errors.push(`Missing required field: ${f.label}`);
    }

    // dedupe key
    const dedupeKey = target.dedupeKeys
      .map((k) => String(values[k] ?? ""))
      .join("|");
    let duplicateOfIndex: number | undefined;
    if (dedupeKey && dedupeKey.replace(/\|/g, "") !== "") {
      if (seen.has(dedupeKey)) {
        duplicateOfIndex = seen.get(dedupeKey);
        warnings.push(`Duplicate of row ${(duplicateOfIndex ?? 0) + 1}`);
      } else {
        seen.set(dedupeKey, index);
      }
    }

    let disposition: RowDisposition;
    if (errors.length > 0 || duplicateOfIndex !== undefined) {
      disposition = "skipped";
    } else {
      // Disposition follows target policy, downgraded if any medium-confidence mapping
      const hasMedium = warnings.some((w) => w.includes("medium confidence"));
      const base = target.defaultVerification;
      if (base === "auto_trust") {
        disposition = hasMedium ? "client_verify" : "auto_trust";
      } else if (base === "client_verify") {
        disposition = "client_verify";
      } else if (base === "admin_review") {
        disposition = "admin_review";
      } else {
        disposition = "admin_review";
      }
    }
    return { index, values, errors, warnings, disposition, duplicateOfIndex };
  });

  const counts: Record<RowDisposition, number> = {
    auto_trust: 0,
    client_verify: 0,
    admin_review: 0,
    skipped: 0,
  };
  for (const r of rows) counts[r.disposition]++;

  return { rows, unknownColumns, unmappedRequiredFields, counts };
}

/* ──────────────────────────────────────────────────────────── */
/* Batch identity (for re-import safety)                        */
/* ──────────────────────────────────────────────────────────── */

/** Stable hash of file content + filename + target — used as batch_ref. */
export async function batchHash(
  fileName: string,
  content: string,
  targetId: ImportTargetId,
): Promise<string> {
  const enc = new TextEncoder().encode(`${targetId}|${fileName}|${content}`);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hex.slice(0, 16);
  }
  // Fallback (non-crypto)
  let h = 0;
  for (let i = 0; i < enc.length; i++) h = (h * 31 + enc[i]) | 0;
  return `f${(h >>> 0).toString(16)}`;
}

/* ──────────────────────────────────────────────────────────── */
/* Commit                                                       */
/* ──────────────────────────────────────────────────────────── */

export interface CommitResult {
  trustedInserted: number;
  stagedForReview: number;
  skipped: number;
  duplicatesSkipped: number;
  batchRef: string;
  errors: string[];
}

/**
 * Commit a validated import:
 *   - auto_trust rows → write directly into trusted local table
 *   - client_verify / admin_review → write into integration_external_records
 *     with reconcile_status = 'pending', preserving provenance, so existing
 *     reconciliation surfaces handle the verification step.
 *   - skipped rows are not written.
 *
 * Re-imports of the same batchRef are detected against
 * integration_external_records.notes (which embeds the batchRef) and skipped
 * silently with a count back.
 */
export async function commitImport(args: {
  customerId: string;
  target: ImportTargetSpec;
  outcome: ValidationOutcome;
  fileName: string;
  batchRef: string;
  /** When true, force every row through staging regardless of disposition. */
  forceReview?: boolean;
}): Promise<CommitResult> {
  const {
    customerId,
    target,
    outcome,
    fileName,
    batchRef,
    forceReview = false,
  } = args;

  const errors: string[] = [];

  // Re-import guard: any prior staged record with this batchRef in notes?
  const { count: priorCount } = await supabase
    .from("integration_external_records")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .like("notes", `%batch:${batchRef}%`);

  if ((priorCount ?? 0) > 0) {
    return {
      trustedInserted: 0,
      stagedForReview: 0,
      skipped: outcome.rows.length,
      duplicatesSkipped: outcome.rows.length,
      batchRef,
      errors: [
        `This file (batch ${batchRef}) was already imported — ${priorCount} prior rows found. No new data written.`,
      ],
    };
  }

  const provenanceNote = (idx: number) =>
    `csv_import|batch:${batchRef}|file:${fileName}|row:${idx + 1}`;
  const sourceLabel = "csv_import";

  let trustedInserted = 0;
  let stagedForReview = 0;
  let skipped = 0;
  const duplicatesSkipped = outcome.rows.filter(
    (r) => r.duplicateOfIndex !== undefined,
  ).length;

  // Bucket rows
  const trustedRows: StagedRow[] = [];
  const reviewRows: StagedRow[] = [];
  for (const r of outcome.rows) {
    if (r.disposition === "skipped") {
      skipped++;
      continue;
    }
    if (!forceReview && r.disposition === "auto_trust") {
      trustedRows.push(r);
    } else {
      reviewRows.push(r);
    }
  }

  // ── Write trusted rows directly to the destination table ──
  if (trustedRows.length > 0) {
    const payload = trustedRows.map((r) => buildTrustedInsert(target, customerId, r, batchRef));
    const { error } = await supabase.from(target.table).insert(payload as never);
    if (error) {
      errors.push(`Trusted insert failed: ${error.message}. Rolling those rows into review.`);
      reviewRows.push(...trustedRows);
    } else {
      trustedInserted = trustedRows.length;
    }
  }

  // ── Stage review rows ──
  if (reviewRows.length > 0) {
    const stagedPayload = reviewRows.map((r) => ({
      customer_id: customerId,
      // No real integration row exists for CSV imports; we use a sentinel.
      integration_id: CSV_VIRTUAL_INTEGRATION_ID,
      sync_run_id: null,
      provider: "csv" as never, // schema accepts text via 'as never' cast (provider is text-typed in db payload)
      record_kind: target.externalRecordKind,
      external_id: `${batchRef}-${r.index}`,
      external_updated_at: new Date().toISOString(),
      payload: { ...r.values, __target: target.id, __disposition: r.disposition },
      reconcile_status: "pending",
      linked_local_table: null,
      linked_local_id: null,
      notes: provenanceNote(r.index),
    }));
    const { error } = await supabase
      .from("integration_external_records")
      .insert(stagedPayload as never);
    if (error) {
      errors.push(`Staging insert failed: ${error.message}`);
    } else {
      stagedForReview = reviewRows.length;
    }
  }

  // best-effort note in customer_notes for visibility
  void sourceLabel;
  return {
    trustedInserted,
    stagedForReview,
    skipped,
    duplicatesSkipped,
    batchRef,
    errors,
  };
}

/**
 * Sentinel UUID used as integration_id for CSV-staged rows. The
 * integration_external_records.integration_id column is non-null in the
 * schema; we use a stable, recognizable nil-ish UUID to mark CSV origin.
 * Existing reconciliation surfaces filter by integration_id, so admin
 * review surfaces dedicated to CSV imports query by this id.
 */
export const CSV_VIRTUAL_INTEGRATION_ID =
  "00000000-0000-0000-0000-0000000c5000";

function buildTrustedInsert(
  target: ImportTargetSpec,
  customerId: string,
  r: StagedRow,
  batchRef: string,
): Record<string, unknown> {
  const v = r.values;
  const noteSuffix = ` [csv:${batchRef}#${r.index + 1}]`;
  switch (target.id) {
    case "revenue_entries":
      return {
        customer_id: customerId,
        entry_date: v.entry_date,
        amount: v.amount,
        service_category: v.service_category ?? null,
        client_or_job: v.client_or_job ?? null,
        revenue_type: v.revenue_type ?? "one_time",
        status: v.status ?? "collected",
        notes: `Imported from CSV${noteSuffix}`,
      };
    case "expense_entries":
      return {
        customer_id: customerId,
        entry_date: v.entry_date,
        amount: v.amount,
        vendor: v.vendor ?? null,
        expense_type: v.expense_type ?? "variable",
        payment_status: v.payment_status ?? "paid",
        notes: `Imported from CSV${noteSuffix}`,
      };
    case "invoice_entries":
      return {
        customer_id: customerId,
        invoice_number: v.invoice_number ?? null,
        invoice_date: v.invoice_date ?? null,
        due_date: v.due_date ?? null,
        amount: v.amount,
        amount_collected: v.amount_collected ?? 0,
        client_or_job: v.client_or_job ?? null,
        status: v.status ?? "sent",
        notes: `Imported from CSV${noteSuffix}`,
      };
    case "financial_obligations":
      return {
        customer_id: customerId,
        label: v.label,
        obligation_type: v.obligation_type ?? "other",
        amount_due: v.amount_due,
        due_date: v.due_date,
        vendor_or_payee: v.vendor_or_payee ?? null,
        priority: v.priority ?? "medium",
        status: "open",
        source: "csv_import",
        source_ref: batchRef,
        notes: `Imported from CSV${noteSuffix}`,
      };
    case "cash_position_snapshots":
      return {
        customer_id: customerId,
        snapshot_date: v.snapshot_date,
        cash_on_hand: v.cash_on_hand,
        available_cash: v.available_cash ?? null,
        restricted_cash: v.restricted_cash ?? null,
        source: "csv_import",
        source_ref: batchRef,
        notes: `Imported from CSV${noteSuffix}`,
      };
    case "client_pipeline_deals":
      return {
        customer_id: customerId,
        title: v.title,
        company_or_contact: v.company_or_contact ?? null,
        estimated_value: v.estimated_value,
        probability_percent: v.probability_percent ?? 50,
        expected_close_date: v.expected_close_date ?? null,
        source: "csv_import",
        source_ref: batchRef,
        source_channel: v.source_channel ?? null,
        status: v.status ?? "open",
        notes: `Imported from CSV${noteSuffix}`,
      };
  }
}

/* ──────────────────────────────────────────────────────────── */
/* Cross-link to planning (informational)                       */
/* ──────────────────────────────────────────────────────────── */

/** Find planned connector mappings whose destination matches a target. */
export function plannedMappingsForTarget(target: ImportTargetSpec) {
  return FIELD_MAPPINGS.filter((m) => m.destinationEntity === target.id);
}

/* ──────────────────────────────────────────────────────────── */
/* Re-import / batch listing                                    */
/* ──────────────────────────────────────────────────────────── */

export async function listCsvBatches(customerId: string, limit = 50) {
  const { data, error } = await supabase
    .from("integration_external_records")
    .select("id, external_id, payload, reconcile_status, notes, created_at, record_kind")
    .eq("customer_id", customerId)
    .eq("integration_id", CSV_VIRTUAL_INTEGRATION_ID)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
