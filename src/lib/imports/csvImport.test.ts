import { describe, it, expect } from "vitest";
import {
  parseCsv,
  CsvParseError,
  suggestMappings,
  validateRows,
  batchHash,
  getTarget,
} from "./csvImport";
import { buildTemplateCsv } from "./templates";

describe("parseCsv", () => {
  it("parses headers and rows, strips BOM", () => {
    const text = "\uFEFFdate,amount\n2025-01-01,100\n2025-01-02,200\n";
    const out = parseCsv(text);
    expect(out.headers).toEqual(["date", "amount"]);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual({ date: "2025-01-01", amount: "100" });
  });

  it("handles quoted commas and escaped quotes", () => {
    const text = `name,note\n"Doe, Jane","She said ""hi"""\n`;
    const out = parseCsv(text);
    expect(out.rows[0]).toEqual({ name: "Doe, Jane", note: 'She said "hi"' });
  });

  it("throws on empty file", () => {
    expect(() => parseCsv("")).toThrow(CsvParseError);
    expect(() => parseCsv("   \n  ")).toThrow(CsvParseError);
  });

  it("throws on duplicate headers", () => {
    expect(() => parseCsv("amount,Amount\n1,2\n")).toThrow(CsvParseError);
  });

  it("throws on binary-ish content", () => {
    const bin = "\u0000\u0000\u0000\u0000\u0000binarydata";
    expect(() => parseCsv(bin)).toThrow(CsvParseError);
  });
});

describe("suggestMappings", () => {
  const target = getTarget("revenue_entries");

  it("matches exact field keys (high)", () => {
    const m = suggestMappings(["entry_date", "amount"], target);
    expect(m[0]).toMatchObject({ fieldKey: "entry_date", confidence: "high" });
    expect(m[1]).toMatchObject({ fieldKey: "amount", confidence: "high" });
  });

  it("matches aliases", () => {
    const m = suggestMappings(["Date", "Revenue"], target);
    expect(m[0].fieldKey).toBe("entry_date");
    expect(m[1].fieldKey).toBe("amount");
  });

  it("returns null for unknown columns", () => {
    const m = suggestMappings(["something_random"], target);
    expect(m[0].fieldKey).toBeNull();
  });
});

describe("validateRows", () => {
  const target = getTarget("revenue_entries");

  it("auto-coerces and assigns dispositions", () => {
    const headers = ["entry_date", "amount"];
    const mappings = suggestMappings(headers, target);
    const out = validateRows({
      raw: [
        { entry_date: "2025-01-01", amount: "$1,200" },
        { entry_date: "bad-date", amount: "x" },
      ],
      mappings,
      target,
    });
    expect(out.rows[0].values.amount).toBe(1200);
    expect(out.rows[1].disposition).toBe("skipped");
    expect(out.rows[1].skipReason).toBe("validation");
  });

  it("flags duplicates by dedupe keys", () => {
    const headers = ["entry_date", "amount", "client_or_job"];
    const mappings = suggestMappings(headers, target);
    const out = validateRows({
      raw: [
        { entry_date: "2025-01-01", amount: "100", client_or_job: "ACME" },
        { entry_date: "2025-01-01", amount: "100", client_or_job: "ACME" },
      ],
      mappings,
      target,
    });
    expect(out.rows[1].disposition).toBe("skipped");
    expect(out.rows[1].skipReason).toBe("duplicate");
  });

  it("skips every row when required field unmapped", () => {
    const headers = ["amount"]; // entry_date not present
    const mappings = suggestMappings(headers, target);
    const out = validateRows({
      raw: [{ amount: "100" }],
      mappings,
      target,
    });
    expect(out.unmappedRequiredFields).toContain("entry_date");
    expect(out.rows[0].disposition).toBe("skipped");
    expect(out.rows[0].skipReason).toBe("missing_required");
  });
});

describe("batchHash", () => {
  it("is deterministic and target-scoped", async () => {
    const a = await batchHash("a.csv", "x,y\n1,2", "revenue_entries");
    const b = await batchHash("a.csv", "x,y\n1,2", "revenue_entries");
    const c = await batchHash("a.csv", "x,y\n1,2", "expense_entries");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("templates", () => {
  it("produces parseable CSVs for every target", () => {
    const ids = [
      "revenue_entries",
      "expense_entries",
      "invoice_entries",
      "financial_obligations",
      "cash_position_snapshots",
      "client_pipeline_deals",
    ] as const;
    for (const id of ids) {
      const csv = buildTemplateCsv(id);
      const parsed = parseCsv(csv);
      expect(parsed.headers.length).toBeGreaterThan(0);
      expect(parsed.rows.length).toBe(1);
      // Templates should auto-map every column with high confidence
      const mappings = suggestMappings(parsed.headers, getTarget(id));
      const unknown = mappings.filter((m) => m.fieldKey === null);
      expect(unknown).toEqual([]);
    }
  });
});