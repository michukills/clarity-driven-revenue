/**
 * P12.3.X — Native XLSX (and .xls) spreadsheet support.
 *
 * This is intentionally thin: it converts a workbook into the same
 * `{ headers, rows, rawLineCount }` shape produced by `parseCsv`, so
 * the existing mapping → validation → review → commit pipeline is
 * reused without modification.
 *
 * Only the file-reading layer differs. Worksheet identity is captured
 * for provenance; the rest of the system treats spreadsheet imports
 * exactly like CSV imports.
 */

import * as XLSX from "xlsx";
import type { ParsedCsv } from "./csvImport";
import { CsvParseError } from "./csvImport";

export interface WorkbookSheetInfo {
  name: string;
  rowCount: number;
  /** True when the sheet has no usable cells (after blank trimming). */
  empty: boolean;
  hidden: boolean;
  /** True when row 1 exists but every cell is blank. */
  headersBlank: boolean;
  /** True when row 1 contains duplicate (case-insensitive) header names. */
  duplicateHeader: string | null;
  /** True when row 1 has headers but no data rows below. */
  headersOnly: boolean;
  /** Header strings as detected (empty array if unreadable). */
  headers: string[];
  /** Up to 3 preview rows aligned to `headers`. Strings only. */
  previewRows: string[][];
}

export interface ParsedWorkbook {
  sheets: WorkbookSheetInfo[];
  /** Sheet name we'll default-select (first non-empty visible sheet). */
  defaultSheet: string | null;
  /** Underlying workbook for sheet extraction (kept opaque). */
  _wb: XLSX.WorkBook;
}

const SUPPORTED_EXTENSIONS = [".xlsx", ".xls"] as const;
export type SupportedSpreadsheetExt = (typeof SUPPORTED_EXTENSIONS)[number];

export function isSpreadsheetFilename(name: string): boolean {
  const lower = name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Parse a workbook from raw bytes. Throws CsvParseError for user-fixable issues. */
export function parseWorkbook(bytes: ArrayBuffer): ParsedWorkbook {
  if (!bytes || bytes.byteLength === 0) {
    throw new CsvParseError("empty", "The spreadsheet is empty.");
  }
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch (e) {
    throw new CsvParseError(
      "binary",
      `Could not read this spreadsheet — it may be corrupt or password-protected (${(e as Error).message}).`,
    );
  }
  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new CsvParseError("no_headers", "Workbook contains no worksheets.");
  }

  const sheets: WorkbookSheetInfo[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const aoa = sheetToRows(ws);
    const visState =
      (wb.Workbook?.Sheets?.find((s) => s.name === name)?.Hidden ?? 0) > 0;
    const empty = aoa.length === 0;
    const headerRow = empty ? [] : aoa[0].map((h) => cellToString(h));
    const headersBlank = !empty && headerRow.every((h) => h === "");
    let duplicateHeader: string | null = null;
    if (!empty && !headersBlank) {
      const seen = new Set<string>();
      for (const h of headerRow) {
        const k = h.toLowerCase();
        if (k && seen.has(k)) {
          duplicateHeader = h;
          break;
        }
        if (k) seen.add(k);
      }
    }
    const dataRows = empty ? [] : aoa.slice(1);
    const previewRows = dataRows.slice(0, 3).map((r) =>
      headerRow.map((_, idx) => cellToString(r[idx])),
    );
    return {
      name,
      rowCount: dataRows.length,
      empty,
      hidden: visState,
      headersBlank,
      duplicateHeader,
      headersOnly: !empty && !headersBlank && dataRows.length === 0,
      headers: headerRow,
      previewRows,
    };
  });

  // Prefer a sheet that is fully usable (has headers + data).
  const isUsable = (s: WorkbookSheetInfo) =>
    !s.empty && !s.headersBlank && !s.duplicateHeader && !s.headersOnly;
  const defaultSheet =
    sheets.find((s) => isUsable(s) && !s.hidden)?.name ??
    sheets.find((s) => isUsable(s))?.name ??
    sheets.find((s) => !s.empty && !s.hidden)?.name ??
    sheets.find((s) => !s.empty)?.name ??
    null;

  return { sheets, defaultSheet, _wb: wb };
}

/** Extract a specific sheet into the CSV-equivalent { headers, rows } shape. */
export function extractSheet(
  workbook: ParsedWorkbook,
  sheetName: string,
): ParsedCsv {
  const ws = workbook._wb.Sheets[sheetName];
  if (!ws) {
    throw new CsvParseError("no_headers", `Sheet "${sheetName}" not found.`);
  }
  const aoa = sheetToRows(ws);
  if (aoa.length === 0) {
    throw new CsvParseError("no_headers", `Sheet "${sheetName}" is empty.`);
  }

  const headers = aoa[0].map((h) => String(h ?? "").trim());
  if (headers.every((h) => h === "")) {
    throw new CsvParseError(
      "no_headers",
      `Sheet "${sheetName}" has a blank header row.`,
    );
  }

  const seen = new Set<string>();
  for (const h of headers) {
    const k = h.toLowerCase();
    if (k && seen.has(k)) {
      throw new CsvParseError(
        "duplicate_headers",
        `Duplicate column header "${h}" in sheet "${sheetName}". Rename so every column is unique.`,
      );
    }
    seen.add(k);
  }

  const rows = aoa.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cellToString(r[idx]);
    });
    return obj;
  });

  return { headers, rows, rawLineCount: aoa.length };
}

/* ── helpers ── */

function sheetToRows(ws: XLSX.WorkSheet | undefined): unknown[][] {
  if (!ws) return [];
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });
  // Drop fully-empty trailing rows (defensive — blankrows:false usually handles this)
  return aoa.filter((r) =>
    Array.isArray(r) && r.some((c) => cellToString(c) !== ""),
  );
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    // Render as ISO date (YYYY-MM-DD) — coerceValue handles the rest
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    // Avoid scientific notation for plain numbers; trim trailing zeros
    return Number.isInteger(value) ? String(value) : String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}
