/**
 * P20.11 — Structured customer metrics CSV importer.
 *
 * Lightweight, columnar CSV parser tailored for `client_business_metrics`.
 * The general-purpose CSV wizard (`src/lib/imports/csvImport.ts`) is
 * row-per-record (revenue lines, invoice lines, etc.). Metrics are
 * column-per-field, one row per customer — different shape entirely.
 *
 * Behavior:
 *   - Accepts a header row + 1+ data rows. Only the FIRST data row is used.
 *   - Maps each header to a known metric field via exact key OR alias.
 *   - Unknown headers are reported as `ignored`, never silently saved.
 *   - Money: "$12,500", "12,500", "12500" → 12500 (number).
 *   - Percent: "35", "35%", " 35 % " → 35 (number, 0..100 scale).
 *   - Boolean: yes/no, true/false, y/n, 1/0 → boolean.
 *   - Counts/numbers: stripped of commas, parsed as number.
 *   - Blank cells stay null. Never coerced to 0 or false.
 *   - Invalid values are reported as warnings, NOT silently saved.
 *
 * No AI. No external calls. Pure functions, fully testable.
 */

import type { CustomerBusinessMetrics } from "./types";

export type MetricFieldKind = "money" | "pct" | "count" | "number" | "bool";

export interface MetricFieldSpec {
  /** canonical column key — matches the DB column name 1:1. */
  key: keyof CustomerBusinessMetrics;
  kind: MetricFieldKind;
  /** which industry templates include this field. "shared" = all. */
  group: "shared" | "trades" | "restaurant" | "retail" | "cannabis";
  /** friendly aliases accepted in CSV headers (lowercase, normalized). */
  aliases?: string[];
  /** human label for the preview UI. */
  label: string;
}

/**
 * Field catalog. Order is the order rendered in templates.
 */
export const METRIC_FIELDS: MetricFieldSpec[] = [
  // ── Shared ────────────────────────────────────────────────────────
  { key: "has_weekly_review",        kind: "bool",  group: "shared", label: "Has weekly review", aliases: ["weekly_review"] },
  { key: "has_assigned_owners",      kind: "bool",  group: "shared", label: "Has assigned owners", aliases: ["assigned_owners"] },
  { key: "owner_is_bottleneck",      kind: "bool",  group: "shared", label: "Owner is bottleneck", aliases: ["owner_bottleneck"] },
  { key: "uses_manual_spreadsheet",  kind: "bool",  group: "shared", label: "Uses manual spreadsheet", aliases: ["manual_spreadsheet"] },
  { key: "profit_visible",           kind: "bool",  group: "shared", label: "Profit visible" },
  { key: "source_attribution_visible", kind: "bool", group: "shared", label: "Source attribution visible", aliases: ["source_attribution"] },
  { key: "review_cadence",           kind: "number", group: "shared", label: "Review cadence (days)" },

  // ── Trades / Services ─────────────────────────────────────────────
  { key: "estimates_sent",              kind: "count", group: "trades", label: "Estimates sent" },
  { key: "estimates_unsent",            kind: "count", group: "trades", label: "Estimates unsent" },
  { key: "follow_up_backlog",           kind: "count", group: "trades", label: "Follow-up backlog" },
  { key: "jobs_completed",              kind: "count", group: "trades", label: "Jobs completed", aliases: ["jobs_done"] },
  { key: "jobs_completed_not_invoiced", kind: "count", group: "trades", label: "Jobs completed, not invoiced", aliases: ["jobs_not_invoiced"] },
  { key: "gross_margin_pct",            kind: "pct",   group: "trades", label: "Gross margin %", aliases: ["gross_margin"] },
  { key: "has_job_costing",             kind: "bool",  group: "trades", label: "Has job costing", aliases: ["job_costing"] },
  { key: "service_line_visibility",     kind: "bool",  group: "trades", label: "Service-line visibility" },
  { key: "unpaid_invoice_amount",       kind: "money", group: "trades", label: "Unpaid invoices ($)", aliases: ["unpaid_invoices"] },

  // ── Restaurants ───────────────────────────────────────────────────
  { key: "daily_sales",                  kind: "money", group: "restaurant", label: "Daily sales ($)" },
  { key: "food_cost_pct",                kind: "pct",   group: "restaurant", label: "Food cost %", aliases: ["food_cost"] },
  { key: "labor_cost_pct",               kind: "pct",   group: "restaurant", label: "Labor cost %", aliases: ["labor_cost"] },
  { key: "gross_margin_pct_restaurant",  kind: "pct",   group: "restaurant", label: "Gross margin %" },
  { key: "tracks_waste",                 kind: "bool",  group: "restaurant", label: "Tracks waste" },
  { key: "has_daily_reporting",          kind: "bool",  group: "restaurant", label: "Has daily reporting" },
  { key: "menu_margin_visible",          kind: "bool",  group: "restaurant", label: "Menu margin visible", aliases: ["menu_margin"] },
  { key: "vendor_cost_change_pct",       kind: "pct",   group: "restaurant", label: "Vendor cost change %", aliases: ["vendor_cost_change"] },
  { key: "average_ticket",               kind: "money", group: "restaurant", label: "Average ticket ($)", aliases: ["avg_ticket"] },

  // ── Retail ────────────────────────────────────────────────────────
  { key: "inventory_value",            kind: "money", group: "retail", label: "Inventory value ($)" },
  { key: "dead_stock_value",           kind: "money", group: "retail", label: "Dead stock value ($)", aliases: ["dead_stock"] },
  { key: "inventory_turnover",         kind: "number", group: "retail", label: "Inventory turnover (x)" },
  { key: "stockout_count",             kind: "count", group: "retail", label: "Stockout count", aliases: ["stockouts"] },
  { key: "return_rate_pct",            kind: "pct",   group: "retail", label: "Return rate %", aliases: ["returns"] },
  { key: "has_category_margin",        kind: "bool",  group: "retail", label: "Has category margin", aliases: ["category_margin"] },
  { key: "high_sales_low_margin_count", kind: "count", group: "retail", label: "High sales / low margin SKU count", aliases: ["high_sales_low_margin"] },
  { key: "average_order_value",        kind: "money", group: "retail", label: "Average order value ($)", aliases: ["aov"] },

  // ── Cannabis / MMC (regulated retail / dispensary — NOT healthcare) ──
  { key: "cannabis_inventory_value",                 kind: "money", group: "cannabis", label: "Inventory value ($)" },
  { key: "cannabis_dead_stock_value",                kind: "money", group: "cannabis", label: "Dead stock value ($)", aliases: ["cannabis_dead_stock"] },
  { key: "cannabis_inventory_turnover",              kind: "number", group: "cannabis", label: "Inventory turnover (x)" },
  { key: "cannabis_stockout_count",                  kind: "count", group: "cannabis", label: "Stockout count", aliases: ["cannabis_stockouts"] },
  { key: "cannabis_shrinkage_pct",                   kind: "pct",   group: "cannabis", label: "Shrinkage %" },
  { key: "cannabis_gross_margin_pct",                kind: "pct",   group: "cannabis", label: "Gross margin %" },
  { key: "cannabis_product_margin_visible",          kind: "bool",  group: "cannabis", label: "Product margin visible" },
  { key: "cannabis_category_margin_visible",         kind: "bool",  group: "cannabis", label: "Category margin visible" },
  { key: "cannabis_discount_impact_pct",             kind: "pct",   group: "cannabis", label: "Discount impact %", aliases: ["cannabis_discount_impact"] },
  { key: "cannabis_promotion_impact_pct",            kind: "pct",   group: "cannabis", label: "Promotion impact %", aliases: ["cannabis_promotion_impact"] },
  { key: "cannabis_vendor_cost_increase_pct",        kind: "pct",   group: "cannabis", label: "Vendor cost increase %", aliases: ["cannabis_vendor_cost_increase"] },
  { key: "cannabis_payment_reconciliation_gap",      kind: "bool",  group: "cannabis", label: "Payment reconciliation gap", aliases: ["cannabis_payment_recon_gap"] },
  { key: "cannabis_has_daily_or_weekly_reporting",   kind: "bool",  group: "cannabis", label: "Has daily/weekly reporting" },
  { key: "cannabis_uses_manual_pos_workaround",      kind: "bool",  group: "cannabis", label: "Uses manual POS workaround", aliases: ["cannabis_manual_pos"] },
  { key: "cannabis_high_sales_low_margin_count",     kind: "count", group: "cannabis", label: "High sales / low margin SKU count", aliases: ["cannabis_high_sales_low_margin"] },
];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/** Build header → field-key lookup. Exact key wins; aliases secondary. */
function buildHeaderIndex(): Map<string, MetricFieldSpec> {
  const idx = new Map<string, MetricFieldSpec>();
  for (const f of METRIC_FIELDS) {
    idx.set(String(f.key), f);
  }
  for (const f of METRIC_FIELDS) {
    for (const a of f.aliases ?? []) {
      const norm = normalizeHeader(a);
      if (!idx.has(norm)) idx.set(norm, f);
    }
  }
  return idx;
}

const HEADER_INDEX = buildHeaderIndex();

// ── Value parsers ────────────────────────────────────────────────────

export function parseMoney(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const cleaned = s.replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePercent(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const cleaned = s.replace(/[%\s,]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseCount(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const cleaned = s.replace(/[,\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function parseAnyNumber(raw: string): number | null {
  const s = raw.trim();
  if (s === "") return null;
  const cleaned = s.replace(/[,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const TRUE_TOKENS = new Set(["true", "yes", "y", "1", "t"]);
const FALSE_TOKENS = new Set(["false", "no", "n", "0", "f"]);

export function parseBool(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (s === "") return null;
  if (TRUE_TOKENS.has(s)) return true;
  if (FALSE_TOKENS.has(s)) return false;
  return null;
}

// ── CSV parser (minimal, RFC-ish, no deps) ────────────────────────────

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}

export interface ParsedMetricsCsv {
  headers: string[];
  row: Record<string, string>; // first data row only
  extraRowCount: number;       // rows beyond the first (informational)
}

export function parseMetricsCsv(text: string): ParsedMetricsCsv {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    throw new Error("CSV is empty.");
  }
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  if (headers.length === 0 || headers.every((h) => h === "")) {
    throw new Error("Header row is blank.");
  }
  const dataLines = lines.slice(1).filter((l) => l.trim() !== "");
  if (dataLines.length === 0) {
    throw new Error("No data row found below the header.");
  }
  const cols = splitCsvLine(dataLines[0]);
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h] = (cols[i] ?? "").trim();
  });
  return { headers, row, extraRowCount: dataLines.length - 1 };
}

/**
 * P20.12 — Build a `ParsedMetricsCsv`-shaped object from already-extracted
 * headers + first-data-row cells. Used by the XLSX importer so CSV and
 * XLSX share `buildPreview` downstream without duplicating logic.
 */
export function buildParsedFromRows(
  headers: string[],
  firstRow: string[],
  totalDataRows: number,
): ParsedMetricsCsv {
  if (headers.length === 0 || headers.every((h) => h.trim() === "")) {
    throw new Error("Header row is blank.");
  }
  if (totalDataRows <= 0) {
    throw new Error("No data row found below the header.");
  }
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h] = (firstRow[i] ?? "").toString().trim();
  });
  return {
    headers: headers.map((h) => h.trim()),
    row,
    extraRowCount: Math.max(0, totalDataRows - 1),
  };
}

// ── Mapping + preview ─────────────────────────────────────────────────

export interface MetricsImportField {
  fieldKey: keyof CustomerBusinessMetrics;
  label: string;
  kind: MetricFieldKind;
  rawValue: string;
  parsedValue: number | boolean | null;
}

export interface MetricsImportPreview {
  /** Resolved fields ready to save (parsed value can still be null = blank). */
  fields: MetricsImportField[];
  /** Headers that did not match any known field or alias. Always reported, never saved. */
  ignoredColumns: string[];
  /** Headers that matched a known field but the value couldn't be parsed. */
  invalid: { column: string; fieldKey: keyof CustomerBusinessMetrics; rawValue: string; reason: string }[];
  /** Headers whose parsed value is blank (null). Kept null on save. */
  blankFields: (keyof CustomerBusinessMetrics)[];
}

function parseValue(spec: MetricFieldSpec, raw: string): { value: number | boolean | null; ok: boolean } {
  if (raw.trim() === "") return { value: null, ok: true };
  switch (spec.kind) {
    case "money": {
      const v = parseMoney(raw);
      return { value: v, ok: v !== null };
    }
    case "pct": {
      const v = parsePercent(raw);
      return { value: v, ok: v !== null };
    }
    case "count": {
      const v = parseCount(raw);
      return { value: v, ok: v !== null };
    }
    case "number": {
      const v = parseAnyNumber(raw);
      return { value: v, ok: v !== null };
    }
    case "bool": {
      const v = parseBool(raw);
      return { value: v, ok: v !== null };
    }
  }
}

export function buildPreview(parsed: ParsedMetricsCsv): MetricsImportPreview {
  const fields: MetricsImportField[] = [];
  const ignored: string[] = [];
  const invalid: MetricsImportPreview["invalid"] = [];
  const blanks: (keyof CustomerBusinessMetrics)[] = [];
  const seen = new Set<string>();

  for (const header of parsed.headers) {
    const norm = normalizeHeader(header);
    const spec = HEADER_INDEX.get(norm);
    if (!spec) {
      ignored.push(header);
      continue;
    }
    if (seen.has(spec.key as string)) {
      // Duplicate column for same field — first wins, second ignored.
      ignored.push(header);
      continue;
    }
    seen.add(spec.key as string);
    const raw = parsed.row[header] ?? "";
    const { value, ok } = parseValue(spec, raw);
    if (!ok) {
      invalid.push({
        column: header,
        fieldKey: spec.key,
        rawValue: raw,
        reason: `Could not parse as ${spec.kind}.`,
      });
      continue;
    }
    if (value === null) blanks.push(spec.key);
    fields.push({
      fieldKey: spec.key,
      label: spec.label,
      kind: spec.kind,
      rawValue: raw,
      parsedValue: value,
    });
  }

  return { fields, ignoredColumns: ignored, invalid, blankFields: blanks };
}

/**
 * Convert the preview into an upsert payload.
 *
 * @param preview Preview produced by `buildPreview`.
 * @param opts.clearBlanks When true, blank cells overwrite existing values
 *   with null. When false (default), blank cells are dropped from the
 *   payload so existing values are preserved.
 */
export function previewToPayload(
  preview: MetricsImportPreview,
  opts: { clearBlanks?: boolean } = {},
): Record<string, number | boolean | null> {
  const out: Record<string, number | boolean | null> = {};
  for (const f of preview.fields) {
    if (f.parsedValue === null && !opts.clearBlanks) continue;
    out[f.fieldKey as string] = f.parsedValue;
  }
  return out;
}

// ── Templates ────────────────────────────────────────────────────────

export type MetricsTemplateId =
  | "shared"
  | "trades"
  | "restaurant"
  | "retail"
  | "cannabis";

const TEMPLATE_LABEL: Record<MetricsTemplateId, string> = {
  shared: "Shared / general",
  trades: "Trades & field services",
  restaurant: "Restaurants",
  retail: "Retail",
  cannabis: "Cannabis / MMC (regulated retail)",
};

export function templateLabel(id: MetricsTemplateId): string {
  return TEMPLATE_LABEL[id];
}

function csvEscape(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function exampleValue(spec: MetricFieldSpec): string {
  switch (spec.kind) {
    case "bool": return "no";
    case "pct": return "";
    case "money": return "";
    case "count": return "";
    case "number": return "";
  }
}

/**
 * Build a CSV template for a given industry. Always includes shared
 * fields plus the industry-specific ones.
 */
export function buildMetricsTemplateCsv(id: MetricsTemplateId): string {
  const groups: MetricFieldSpec["group"][] =
    id === "shared" ? ["shared"] : ["shared", id];
  const fields = METRIC_FIELDS.filter((f) => groups.includes(f.group));
  const headers = fields.map((f) => String(f.key));
  const sample = fields.map((f) => exampleValue(f));
  return (
    [headers.map(csvEscape).join(","), sample.map(csvEscape).join(",")].join("\n") +
    "\n"
  );
}

export function metricsTemplateFileName(id: MetricsTemplateId): string {
  return `rgs_metrics_${id}_template.csv`;
}

/**
 * Cannabis/MMC compliance guard. Asserted by tests to ensure no
 * healthcare wording leaks into the cannabis template.
 */
export const CANNABIS_BLOCKED_TERMS = [
  "patient", "claim", "reimbursement", "appointment", "provider",
  "diagnosis", "insurance", "clinical", "healthcare",
] as const;

export function downloadMetricsTemplate(id: MetricsTemplateId): void {
  const csv = buildMetricsTemplateCsv(id);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = metricsTemplateFileName(id);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}