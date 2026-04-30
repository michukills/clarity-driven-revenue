/**
 * P20.12 — Structured customer metrics XLSX importer.
 *
 * Thin adapter on top of the SheetJS (`xlsx`) library that converts the
 * first usable worksheet into the same `ParsedMetricsCsv` shape produced
 * by `parseMetricsCsv`. Downstream `buildPreview` / `previewToPayload`
 * are reused unchanged so CSV and XLSX share the same:
 *
 *   - field mapping
 *   - alias resolution
 *   - blank-stays-null behavior
 *   - clearBlanks behavior
 *   - ignored-column reporting
 *   - invalid-value rejection
 *
 * No service-role keys, no tokens, no network calls.
 */

import * as XLSX from "xlsx";
import type { ParsedMetricsCsv } from "./csvImport";
import { buildParsedFromRows } from "./csvImport";

const SUPPORTED_EXTS = [".xlsx", ".xls"] as const;

export function isMetricsSpreadsheetFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTS.some((ext) => lower.endsWith(ext));
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

/**
 * Parse a workbook (raw bytes) and produce a `ParsedMetricsCsv`-shaped
 * record that the existing `buildPreview` understands.
 *
 * Behavior:
 *   - Picks the first non-empty visible sheet (else first non-empty).
 *   - First row = headers, second row = data.
 *   - Blank cells in the data row are preserved as empty strings
 *     (not "0", not "false") so blanks stay null downstream.
 *   - Unknown headers remain in the parsed shape and are surfaced as
 *     `ignoredColumns` by `buildPreview`.
 */
export function parseMetricsWorkbook(bytes: ArrayBuffer): ParsedMetricsCsv {
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("The spreadsheet is empty.");
  }
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch (e) {
    throw new Error(
      `Could not read this spreadsheet — it may be corrupt or password-protected (${(e as Error).message}).`,
    );
  }
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("Workbook contains no worksheets.");
  }

  // Score sheets: prefer visible, non-empty sheets with at least header+data.
  type Candidate = {
    name: string;
    hidden: boolean;
    rows: unknown[][];
  };
  const candidates: Candidate[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = ws
      ? (XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          blankrows: false,
          defval: "",
          raw: true,
        }) as unknown[][])
      : [];
    const hidden =
      (wb.Workbook?.Sheets?.find((s) => s.name === name)?.Hidden ?? 0) > 0;
    return { name, hidden, rows };
  });

  const usable =
    candidates.find((c) => !c.hidden && c.rows.length >= 2) ??
    candidates.find((c) => c.rows.length >= 2) ??
    candidates.find((c) => !c.hidden && c.rows.length >= 1) ??
    candidates.find((c) => c.rows.length >= 1) ??
    null;

  if (!usable) {
    throw new Error("Workbook is empty.");
  }

  const headerRow = (usable.rows[0] ?? []).map((c) => cellToString(c));
  const dataRows = usable.rows.slice(1);
  if (headerRow.length === 0 || headerRow.every((h) => h === "")) {
    throw new Error("Header row is blank.");
  }
  if (dataRows.length === 0) {
    throw new Error("No data row found below the header.");
  }
  const firstDataRow = (dataRows[0] ?? []).map((c) => cellToString(c));
  return buildParsedFromRows(headerRow, firstDataRow, dataRows.length);
}