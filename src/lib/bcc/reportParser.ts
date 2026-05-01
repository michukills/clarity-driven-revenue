import type { ReportSection, ReportSnapshot } from "./reportTypes";
import { REPORT_SCHEMA_VERSION } from "./reportTypes";

/* P4.2 — Safe parsing & fallback rendering for stored report snapshots.
   Historical reports may not have a schemaVersion. Some may be malformed.
   This parser never throws; it always returns a usable shape. */

export type ParseStatus = "ok" | "legacy" | "partial" | "malformed";

export interface ParsedReport {
  status: ParseStatus;
  /** A best-effort snapshot. May contain placeholder values when partial/malformed. */
  snapshot: ReportSnapshot;
  /** Optional human-readable note to render alongside the report. */
  notice?: string;
  /** True if the parser had to fabricate the shell because the input was unusable. */
  fellBack?: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNum = (v: unknown): v is number => typeof v === "number" && !Number.isNaN(v);

function safeSection(raw: unknown): ReportSection | null {
  if (!isObj(raw)) return null;
  const title = isStr(raw.title) ? raw.title : null;
  const body = isStr(raw.body) ? raw.body : "";
  if (!title) return null;
  const bullets = Array.isArray(raw.bullets)
    ? raw.bullets.filter(isStr)
    : undefined;
  const sev = raw.severity;
  const severity =
    sev === "ok" || sev === "watch" || sev === "warn" || sev === "critical"
      ? sev
      : undefined;
  return { title, body, bullets, severity };
}

function emptySnapshot(): ReportSnapshot {
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: "monthly",
    periodStart: "",
    periodEnd: "",
    generatedAt: new Date(0).toISOString(),
    customerLabel: "—",
    healthScore: null,
    condition: "Unknown",
    confidence: "low",
    confidenceNote: "",
    recommendedNextStep: "Continue Monitoring",
    recommendationReason: "",
    sections: [],
    meta: { weeksCovered: 0, advancedWeeks: 0, totalRevenue: 0, totalExpenses: 0, netCash: 0 },
  };
}

export function parseReportSnapshot(raw: unknown): ParsedReport {
  if (!isObj(raw)) {
    return {
      status: "malformed",
      snapshot: emptySnapshot(),
      notice:
        "This report could not be fully loaded. Contact RGS if you need this report restored.",
      fellBack: true,
    };
  }

  const version = isNum(raw.schemaVersion) ? raw.schemaVersion : 0;

  // Pull each field defensively
  const reportType =
    raw.reportType === "quarterly" ? "quarterly" : raw.reportType === "monthly" ? "monthly" : null;
  const periodStart = isStr(raw.periodStart) ? raw.periodStart : null;
  const periodEnd = isStr(raw.periodEnd) ? raw.periodEnd : null;
  const generatedAt = isStr(raw.generatedAt) ? raw.generatedAt : null;
  const customerLabel = isStr(raw.customerLabel) ? raw.customerLabel : null;
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : null;

  // Anything truly required to render meaningfully
  const coreMissing =
    !reportType || !periodStart || !periodEnd || !customerLabel || !sectionsRaw;

  if (coreMissing) {
    return {
      status: "malformed",
      snapshot: emptySnapshot(),
      notice:
        "This report could not be fully loaded. Contact RGS if you need this report restored.",
      fellBack: true,
    };
  }

  const sections = sectionsRaw
    .map(safeSection)
    .filter((s): s is ReportSection => s !== null);

  const metaRaw = isObj(raw.meta) ? raw.meta : {};
  const meta = {
    weeksCovered: isNum(metaRaw.weeksCovered) ? metaRaw.weeksCovered : 0,
    advancedWeeks: isNum(metaRaw.advancedWeeks) ? metaRaw.advancedWeeks : 0,
    totalRevenue: isNum(metaRaw.totalRevenue) ? metaRaw.totalRevenue : 0,
    totalExpenses: isNum(metaRaw.totalExpenses) ? metaRaw.totalExpenses : 0,
    netCash: isNum(metaRaw.netCash) ? metaRaw.netCash : 0,
  };

  const trendTable = Array.isArray(raw.trendTable)
    ? (raw.trendTable
        .map((row: any) => {
          if (!isObj(row) || !isStr(row.label) || !Array.isArray(row.values)) return null;
          const values = row.values
            .map((v: any) =>
              isObj(v) && isStr(v.label) && isNum(v.value)
                ? { label: v.label, value: v.value, signed: !!v.signed }
                : null,
            )
            .filter(Boolean) as { label: string; value: number; signed?: boolean }[];
          return { label: row.label, values };
        })
        .filter(Boolean) as ReportSnapshot["trendTable"])
    : undefined;

  const confidenceVal =
    raw.confidence === "high" || raw.confidence === "medium" || raw.confidence === "low"
      ? raw.confidence
      : "low";

  const snapshot: ReportSnapshot = {
    schemaVersion: version || REPORT_SCHEMA_VERSION,
    reportType,
    periodStart,
    periodEnd,
    generatedAt: generatedAt || new Date(0).toISOString(),
    customerLabel,
    healthScore: isNum(raw.healthScore) ? raw.healthScore : null,
    condition: isStr(raw.condition) ? raw.condition : "Unknown",
    confidence: confidenceVal,
    confidenceNote: isStr(raw.confidenceNote) ? raw.confidenceNote : "",
    recommendedNextStep: (isStr(raw.recommendedNextStep)
      ? raw.recommendedNextStep
      : "Continue Monitoring") as ReportSnapshot["recommendedNextStep"],
    recommendationReason: isStr(raw.recommendationReason) ? raw.recommendationReason : "",
    sections,
    trendTable,
    meta,
  };

  // P20.20 — pass through the optional approved RGS Stability Snapshot™.
  // Stored verbatim; downstream renderers re-check `isSnapshotClientReady`
  // before display, so an unapproved/partial value here is still gated.
  if (isObj((raw as any).rgs_stability_snapshot)) {
    (snapshot as any).rgs_stability_snapshot = (raw as any).rgs_stability_snapshot;
  }

  // Decide status & notice
  const expectedSectionsPresent = sections.length > 0;
  if (version === 0) {
    return {
      status: expectedSectionsPresent ? "legacy" : "partial",
      snapshot,
      notice:
        "This saved report uses an older format. Some sections may be unavailable.",
    };
  }

  if (!expectedSectionsPresent) {
    return {
      status: "partial",
      snapshot,
      notice:
        "This saved report uses an older format. Some sections may be unavailable.",
    };
  }

  if (version > REPORT_SCHEMA_VERSION) {
    // Future version — render what we can.
    return {
      status: "partial",
      snapshot,
      notice:
        "This report was generated by a newer version. Some sections may not display correctly.",
    };
  }

  return { status: "ok", snapshot };
}