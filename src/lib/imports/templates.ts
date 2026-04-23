/**
 * P12.3.H — CSV templates.
 *
 * Generates a downloadable starter CSV per import target so users can
 * fill in the right columns instead of guessing. Headers correspond to
 * each target's primary field labels (using the canonical key as header
 * for an unambiguous round-trip with `suggestMappings`).
 *
 * Sample rows are intentionally tiny and obviously fake — they exist
 * to clarify shape, not seed data.
 */

import { IMPORT_TARGETS, type ImportTargetId, type ImportTargetSpec } from "./csvImport";

function csvEscape(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function exampleValue(spec: ImportTargetSpec, fieldKey: string): string {
  const f = spec.fields.find((x) => x.key === fieldKey);
  if (!f) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (f.kind === "date") return today;
  if (f.kind === "number") return "0";
  if (f.kind === "enum") return f.defaultValue?.toString() ?? f.enumValues?.[0] ?? "";
  // strings — use a hint
  switch (fieldKey) {
    case "vendor":
      return "Example Vendor";
    case "client_or_job":
    case "company_or_contact":
      return "Example Client";
    case "title":
      return "Example deal";
    case "label":
      return "Quarterly tax payment";
    case "invoice_number":
      return "INV-1001";
    case "service_category":
      return "service";
    default:
      return "";
  }
}

export function buildTemplateCsv(targetId: ImportTargetId): string {
  const target = IMPORT_TARGETS.find((t) => t.id === targetId);
  if (!target) throw new Error(`Unknown target: ${targetId}`);
  const headers = target.fields.map((f) => f.key);
  const sample = target.fields.map((f) => exampleValue(target, f.key));
  return [headers.map(csvEscape).join(","), sample.map(csvEscape).join(",")].join("\n") + "\n";
}

export function templateFileName(targetId: ImportTargetId): string {
  return `rgs_${targetId}_template.csv`;
}

export function downloadTemplate(targetId: ImportTargetId): void {
  const csv = buildTemplateCsv(targetId);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = templateFileName(targetId);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}