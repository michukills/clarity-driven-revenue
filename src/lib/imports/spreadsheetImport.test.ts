/**
 * P12.3.X — Spreadsheet import parser tests.
 *
 * Verifies:
 *  - workbook parsing (xlsx)
 *  - single-sheet vs multi-sheet detection
 *  - empty-sheet handling
 *  - sheet extraction produces the same shape as parseCsv (so the
 *    existing mapping/validation pipeline works unchanged)
 *  - duplicate header guard
 *  - numeric / date / blank cell coercion to strings
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  parseWorkbook,
  extractSheet,
  isSpreadsheetFilename,
} from "./spreadsheetImport";
import {
  CsvParseError,
  suggestMappings,
  validateRows,
  getTarget,
} from "./csvImport";

function buildWorkbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return out as ArrayBuffer;
}

describe("isSpreadsheetFilename", () => {
  it("recognises .xlsx and .xls", () => {
    expect(isSpreadsheetFilename("data.xlsx")).toBe(true);
    expect(isSpreadsheetFilename("DATA.XLS")).toBe(true);
    expect(isSpreadsheetFilename("notes.csv")).toBe(false);
    expect(isSpreadsheetFilename("readme.txt")).toBe(false);
  });
});

describe("parseWorkbook", () => {
  it("parses a single-sheet workbook and picks it as default", () => {
    const buf = buildWorkbook({
      Sheet1: [
        ["date", "amount"],
        ["2024-01-15", 1000],
      ],
    });
    const wb = parseWorkbook(buf);
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe("Sheet1");
    expect(wb.sheets[0].empty).toBe(false);
    expect(wb.sheets[0].rowCount).toBe(1);
    expect(wb.defaultSheet).toBe("Sheet1");
  });

  it("lists multiple sheets and flags empty ones", () => {
    const buf = buildWorkbook({
      Empty: [],
      Revenue: [
        ["date", "amount"],
        ["2024-02-01", 500],
        ["2024-02-15", 750],
      ],
      Notes: [["just text here"]],
    });
    const wb = parseWorkbook(buf);
    expect(wb.sheets.map((s) => s.name)).toEqual(["Empty", "Revenue", "Notes"]);
    expect(wb.sheets.find((s) => s.name === "Empty")?.empty).toBe(true);
    expect(wb.sheets.find((s) => s.name === "Revenue")?.rowCount).toBe(2);
    // Default = first non-empty visible
    expect(wb.defaultSheet).toBe("Revenue");
  });

  it("throws for empty bytes", () => {
    expect(() => parseWorkbook(new ArrayBuffer(0))).toThrowError(CsvParseError);
  });
});

describe("extractSheet", () => {
  it("produces the CSV { headers, rows } shape", () => {
    const buf = buildWorkbook({
      Sheet1: [
        ["Date", "Amount", "Vendor"],
        ["2024-03-01", 250.5, "Acme"],
        ["2024-03-02", 100, "Globex"],
      ],
    });
    const wb = parseWorkbook(buf);
    const parsed = extractSheet(wb, "Sheet1");
    expect(parsed.headers).toEqual(["Date", "Amount", "Vendor"]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].Vendor).toBe("Acme");
    expect(parsed.rows[0].Amount).toBe("250.5");
  });

  it("rejects sheets with duplicate headers", () => {
    const buf = buildWorkbook({
      Sheet1: [
        ["amount", "amount"],
        [1, 2],
      ],
    });
    const wb = parseWorkbook(buf);
    expect(() => extractSheet(wb, "Sheet1")).toThrowError(CsvParseError);
  });

  it("rejects empty sheets", () => {
    const buf = buildWorkbook({ Empty: [], Other: [["a"], [1]] });
    const wb = parseWorkbook(buf);
    expect(() => extractSheet(wb, "Empty")).toThrowError(CsvParseError);
  });

  it("flows through the existing mapping/validation pipeline", () => {
    const buf = buildWorkbook({
      Revenue: [
        ["date", "amount", "client"],
        ["2024-04-01", 1500, "Acme Co"],
        ["2024-04-15", 2000, "Globex"],
      ],
    });
    const wb = parseWorkbook(buf);
    const parsed = extractSheet(wb, "Revenue");
    const target = getTarget("revenue_entries");
    const mappings = suggestMappings(parsed.headers, target);
    // headers map cleanly via aliases
    expect(mappings.find((m) => m.column === "date")?.fieldKey).toBe("entry_date");
    expect(mappings.find((m) => m.column === "amount")?.fieldKey).toBe("amount");
    const outcome = validateRows({ raw: parsed.rows, mappings, target });
    expect(outcome.rows).toHaveLength(2);
    expect(outcome.rows.every((r) => r.disposition !== "skipped")).toBe(true);
    // Date coerced through the standard pipeline
    expect(outcome.rows[0].values.entry_date).toBe("2024-04-01");
    expect(outcome.rows[0].values.amount).toBe(1500);
  });

  it("treats blank cells as empty strings (not 'undefined')", () => {
    const buf = buildWorkbook({
      Sheet1: [
        ["a", "b", "c"],
        ["x", "", "z"],
      ],
    });
    const wb = parseWorkbook(buf);
    const parsed = extractSheet(wb, "Sheet1");
    expect(parsed.rows[0]).toEqual({ a: "x", b: "", c: "z" });
  });

  it("flags blank-header, duplicate-header, and headers-only sheets without throwing at parse time", () => {
    const buf = buildWorkbook({
      BlankHeader: [["", "", ""], ["x", "y", "z"]],
      Dupes: [["amount", "amount"], [1, 2]],
      HeadersOnly: [["date", "amount"]],
      Good: [["date", "amount"], ["2024-01-01", 100]],
    });
    const wb = parseWorkbook(buf);
    const blank = wb.sheets.find((s) => s.name === "BlankHeader")!;
    const dupes = wb.sheets.find((s) => s.name === "Dupes")!;
    const headersOnly = wb.sheets.find((s) => s.name === "HeadersOnly")!;
    const good = wb.sheets.find((s) => s.name === "Good")!;
    expect(blank.headersBlank).toBe(true);
    expect(dupes.duplicateHeader?.toLowerCase()).toBe("amount");
    expect(headersOnly.headersOnly).toBe(true);
    expect(good.headersBlank).toBe(false);
    expect(good.duplicateHeader).toBeNull();
    expect(good.headersOnly).toBe(false);
    // Default-sheet preference: pick the only fully-usable one.
    expect(wb.defaultSheet).toBe("Good");
  });

  it("captures header row + up to 3 preview rows for usable sheets", () => {
    const buf = buildWorkbook({
      Sheet1: [
        ["date", "amount", "vendor"],
        ["2024-01-01", 100, "Acme"],
        ["2024-01-02", 200, "Globex"],
        ["2024-01-03", 300, "Initech"],
        ["2024-01-04", 400, "Umbrella"],
      ],
    });
    const wb = parseWorkbook(buf);
    const s = wb.sheets[0];
    expect(s.headers).toEqual(["date", "amount", "vendor"]);
    expect(s.previewRows).toHaveLength(3);
    expect(s.previewRows[0]).toEqual(["2024-01-01", "100", "Acme"]);
    expect(s.rowCount).toBe(4);
  });
});
