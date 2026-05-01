/**
 * P20.11 — Admin metrics importer panel.
 *
 * Two paths:
 *   1. CSV / spreadsheet import — admin uploads a one-row metrics CSV
 *      using a downloadable template. Preview confirms parsed values
 *      and ignored / invalid columns before save.
 *   2. QuickBooks snapshot import — pulls the latest
 *      `quickbooks_period_summaries` row for this customer and maps
 *      ONLY the safely-supported QB fields into metrics. Tokens never
 *      touch the browser; the summary is read directly from the
 *      already-persisted table.
 *
 * Admin-only by RLS; this component additionally refuses to mount on
 * internal-admin operating accounts.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, FileSpreadsheet, Upload, AlertTriangle, CheckCircle2, RefreshCw, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";
import {
  getLatestCustomerMetrics,
  upsertCustomerMetrics,
} from "@/lib/customerMetrics/service";
import {
  buildPreview,
  parseMetricsCsv,
  previewToPayload,
  downloadMetricsTemplate,
  metricsTemplateFileName,
  templateLabel,
  type MetricsImportPreview,
  type MetricsTemplateId,
} from "@/lib/customerMetrics/csvImport";
import {
  isMetricsSpreadsheetFilename,
  parseMetricsWorkbook,
} from "@/lib/customerMetrics/xlsxImport";
import {
  mapQuickBooksSummaryToMetrics,
  type QuickBooksPeriodSummary,
  type QbSnapshotResult,
} from "@/lib/customerMetrics/quickbooksSnapshot";
import {
  mapSquareSummaryToMetrics,
  type SquarePeriodSummary,
  type SquareSnapshotResult,
} from "@/lib/customerMetrics/squareSnapshot";
import {
  mapStripeSummaryToMetrics,
  type StripePeriodSummary,
  type StripeSnapshotResult,
} from "@/lib/customerMetrics/stripeSnapshot";
import {
  mapDutchieSummaryToMetrics,
  type DutchiePeriodSummary,
  type DutchieSnapshotResult,
} from "@/lib/customerMetrics/dutchieSnapshot";
import { supabase } from "@/integrations/supabase/client";
import { logPortalAudit } from "@/lib/portalAudit";
import type { IndustryCategory } from "@/lib/priorityEngine/types";
import { ProviderSummaryIngestPanel } from "./ProviderSummaryIngestPanel";
import type { IngestProvider } from "@/lib/customerMetrics/providerSummaryIngest";
import { ConnectorReadinessHistoryPanel } from "./ConnectorReadinessHistoryPanel";
import type { CustomerMetricsSource } from "@/lib/customerMetrics/types";

type CustomerLike = {
  id: string;
  industry?: string | null;
  account_kind?: string | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;
};

const TEMPLATE_FOR_INDUSTRY: Partial<Record<IndustryCategory, MetricsTemplateId>> = {
  trade_field_service: "trades",
  restaurant: "restaurant",
  retail: "retail",
  mmj_cannabis: "cannabis",
};

const ALL_TEMPLATES: MetricsTemplateId[] = ["shared", "trades", "restaurant", "retail", "cannabis"];

export interface AdminMetricsImporterPanelProps {
  customer: CustomerLike;
  industry: IndustryCategory;
  onImported?: () => void;
}

export function AdminMetricsImporterPanel({
  customer,
  industry,
  onImported,
}: AdminMetricsImporterPanelProps) {
  const { toast } = useToast();
  const isClientFlow = isCustomerFlowAccount(customer);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<MetricsImportPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<"Estimated" | "Confirmed">("Estimated");
  const [clearBlanks, setClearBlanks] = useState(false);
  const [saving, setSaving] = useState(false);

  const [qbSummary, setQbSummary] = useState<QuickBooksPeriodSummary | null>(null);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
  const [qbSaving, setQbSaving] = useState(false);

  const [sqSummary, setSqSummary] = useState<(SquarePeriodSummary & { period_start: string; period_end: string }) | null>(null);
  const [sqLoading, setSqLoading] = useState(false);
  const [sqError, setSqError] = useState<string | null>(null);
  const [sqSaving, setSqSaving] = useState(false);

  const [stSummary, setStSummary] = useState<(StripePeriodSummary & { period_start: string; period_end: string }) | null>(null);
  const [stLoading, setStLoading] = useState(false);
  const [stError, setStError] = useState<string | null>(null);
  const [stSaving, setStSaving] = useState(false);

  const [duSummary, setDuSummary] = useState<
    (DutchiePeriodSummary & { period_start: string; period_end: string; synced_at?: string | null }) | null
  >(null);
  const [duLoading, setDuLoading] = useState(false);
  const [duError, setDuError] = useState<string | null>(null);
  const [duSaving, setDuSaving] = useState(false);

  // Per-provider refresh keys, bumped after a successful normalized
  // ingest so the matching snapshot section re-fetches.
  const [sqRefreshKey, setSqRefreshKey] = useState(0);
  const [stRefreshKey, setStRefreshKey] = useState(0);
  const [duRefreshKey, setDuRefreshKey] = useState(0);

  // Latest metrics source — used by the readiness panel to mark
  // "Imported into metrics" without re-querying audit history.
  const [currentMetricsSource, setCurrentMetricsSource] =
    useState<CustomerMetricsSource | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    if (!isClientFlow) return;
    let cancelled = false;
    void getLatestCustomerMetrics(customer.id)
      .then((row) => {
        if (!cancelled) setCurrentMetricsSource(row?.source ?? null);
      })
      .catch(() => {
        if (!cancelled) setCurrentMetricsSource(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    customer.id,
    isClientFlow,
    sqRefreshKey,
    stRefreshKey,
    duRefreshKey,
    historyRefreshKey,
  ]);

  const recommendedTemplate = useMemo(
    () => TEMPLATE_FOR_INDUSTRY[industry] ?? "shared",
    [industry],
  );

  // Load latest QuickBooks period summary, if any.
  useEffect(() => {
    if (!isClientFlow) return;
    let cancelled = false;
    setQbLoading(true);
    setQbError(null);
    void (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("quickbooks_period_summaries")
          .select("revenue_total, expense_total, open_invoices_total, open_invoices_count, ar_total, ap_total, period_start, period_end")
          .eq("customer_id", customer.id)
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setQbError(error.message);
          setQbSummary(null);
        } else {
          setQbSummary((data as QuickBooksPeriodSummary | null) ?? null);
        }
      } catch (e) {
        if (!cancelled) setQbError((e as Error).message);
      } finally {
        if (!cancelled) setQbLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow]);

  // Latest Square period summary
  useEffect(() => {
    if (!isClientFlow) return;
    let cancelled = false;
    setSqLoading(true);
    setSqError(null);
    void (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("square_period_summaries")
          .select("gross_sales, net_sales, discounts_total, refunds_total, tips_total, tax_total, transaction_count, day_count, has_recurring_period_reporting, period_start, period_end")
          .eq("customer_id", customer.id)
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setSqError(error.message);
          setSqSummary(null);
        } else {
          setSqSummary((data as any) ?? null);
        }
      } catch (e) {
        if (!cancelled) setSqError((e as Error).message);
      } finally {
        if (!cancelled) setSqLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow, sqRefreshKey]);

  // Latest Stripe period summary
  useEffect(() => {
    if (!isClientFlow) return;
    let cancelled = false;
    setStLoading(true);
    setStError(null);
    void (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("stripe_period_summaries")
          .select("gross_volume, net_volume, fees_total, refunds_total, disputes_total, successful_payment_count, failed_payment_count, period_start, period_end")
          .eq("customer_id", customer.id)
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setStError(error.message);
          setStSummary(null);
        } else {
          setStSummary((data as any) ?? null);
        }
      } catch (e) {
        if (!cancelled) setStError((e as Error).message);
      } finally {
        if (!cancelled) setStLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow, stRefreshKey]);

  // Latest Dutchie period summary (cannabis/MMJ retail/POS only)
  useEffect(() => {
    if (!isClientFlow) return;
    let cancelled = false;
    setDuLoading(true);
    setDuError(null);
    void (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("dutchie_period_summaries")
          .select(
            "gross_sales, net_sales, discounts_total, promotions_total, transaction_count, day_count, average_ticket, product_sales_total, category_sales_total, inventory_value, dead_stock_value, stockout_count, inventory_turnover, shrinkage_pct, payment_reconciliation_gap, has_recurring_period_reporting, product_margin_visible, category_margin_visible, period_start, period_end, synced_at",
          )
          .eq("customer_id", customer.id)
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setDuError(error.message);
          setDuSummary(null);
        } else {
          setDuSummary((data as any) ?? null);
        }
      } catch (e) {
        if (!cancelled) setDuError((e as Error).message);
      } finally {
        if (!cancelled) setDuLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer.id, isClientFlow, duRefreshKey]);

  if (!isClientFlow) return null;

  const onFile = async (file: File) => {
    setParseError(null);
    setPreview(null);
    setFileName(file.name);
    if (file.size > 2 * 1024 * 1024) {
      setParseError("Metrics file must be under 2 MB.");
      return;
    }
    try {
      const isXlsx = isMetricsSpreadsheetFilename(file.name);
      const parsed = isXlsx
        ? parseMetricsWorkbook(await file.arrayBuffer())
        : parseMetricsCsv(await file.text());
      setPreview(buildPreview(parsed));
    } catch (e) {
      setParseError((e as Error).message);
    }
  };

  const onSaveCsv = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const payload = previewToPayload(preview, { clearBlanks });
      await upsertCustomerMetrics(customer.id, {
        industry,
        source: fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")
          ? "file_upload"
          : "csv_upload",
        confidence,
        ...payload,
      } as never);
      const fieldCount = preview.fields.filter((f) => f.parsedValue !== null || clearBlanks).length;
      void logPortalAudit("data_import_completed", customer.id, {
        source:
          fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls")
            ? "metrics_xlsx"
            : "metrics_csv",
        import_type: "client_business_metrics",
        industry,
        field_count: fieldCount,
        ignored_column_count: preview.ignoredColumns.length,
        invalid_column_count: preview.invalid.length,
        confidence,
      });
      setHistoryRefreshKey((k) => k + 1);
      toast({
        title: "Metrics imported",
        description: `${fieldCount} fields saved · ${preview.ignoredColumns.length} ignored`,
      });
      // Reset and notify
      setPreview(null);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      onImported?.();
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const qbResult: QbSnapshotResult = useMemo(
    () => mapQuickBooksSummaryToMetrics(qbSummary, industry),
    [qbSummary, industry],
  );

  const sqResult: SquareSnapshotResult = useMemo(
    () => mapSquareSummaryToMetrics(sqSummary, industry),
    [sqSummary, industry],
  );
  const stResult: StripeSnapshotResult = useMemo(
    () => mapStripeSummaryToMetrics(stSummary),
    [stSummary],
  );

  const duResult: DutchieSnapshotResult = useMemo(
    () => mapDutchieSummaryToMetrics(duSummary, industry),
    [duSummary, industry],
  );

  const onSaveQb = async () => {
    setQbSaving(true);
    try {
      const populated = Object.entries(qbResult.payload).filter(
        ([, v]) => v !== null && v !== undefined,
      );
      if (populated.length === 0) {
        toast({
          title: "Nothing to import from QuickBooks",
          description: "QuickBooks summary did not include enough data for this industry.",
          variant: "destructive",
        });
        return;
      }
      await upsertCustomerMetrics(customer.id, {
        industry,
        source: qbResult.source,
        confidence: qbResult.confidence,
        ...qbResult.payload,
      } as never);
      void logPortalAudit("data_import_completed", customer.id, {
        source: "metrics_quickbooks",
        import_type: "client_business_metrics",
        industry,
        field_count: populated.length,
        confidence: qbResult.confidence,
      });
      setHistoryRefreshKey((k) => k + 1);
      toast({
        title: "QuickBooks snapshot imported",
        description: `${populated.length} fields populated`,
      });
      onImported?.();
    } catch (e: any) {
      toast({
        title: "QuickBooks import failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setQbSaving(false);
    }
  };

  const onSaveDutchie = async () => {
    setDuSaving(true);
    try {
      if (industry !== "mmj_cannabis") {
        toast({
          title: "Dutchie import not allowed",
          description: "Dutchie metrics may only be imported for cannabis/MMJ customers.",
          variant: "destructive",
        });
        return;
      }
      if (!duSummary || duResult.readiness === "no_summary" || duResult.readiness === "industry_mismatch") {
        toast({
          title: "Nothing to import from Dutchie",
          description: "No safely-mappable Dutchie summary on file.",
          variant: "destructive",
        });
        return;
      }
      const populated = Object.entries(duResult.payload).filter(
        ([k, v]) => v !== null && v !== undefined && k !== "primary_data_source",
      );
      if (populated.length === 0) {
        toast({
          title: "Nothing to import from Dutchie",
          description: "Dutchie summary did not include enough safely-mappable data.",
          variant: "destructive",
        });
        return;
      }
      const allPopulated = Object.entries(duResult.payload).filter(
        ([, v]) => v !== null && v !== undefined,
      );
      await upsertCustomerMetrics(customer.id, {
        industry,
        source: duResult.source,
        confidence: duResult.confidence,
        ...duResult.payload,
      } as never);
      void logPortalAudit("data_import_completed", customer.id, {
        source: "metrics_dutchie",
        import_type: "client_business_metrics",
        industry,
        field_count: allPopulated.length,
        confidence: duResult.confidence,
        readiness: duResult.readiness,
      });
      setHistoryRefreshKey((k) => k + 1);
      toast({
        title: "Dutchie snapshot imported",
        description: `${allPopulated.length} fields populated`,
      });
      onImported?.();
    } catch (e: any) {
      toast({
        title: "Dutchie import failed",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDuSaving(false);
    }
  };

  const onSaveProvider = async (
    provider: "square" | "stripe",
    result: SquareSnapshotResult | StripeSnapshotResult,
    setSaving: (b: boolean) => void,
  ) => {
    setSaving(true);
    try {
      const allPopulated = Object.entries(result.payload).filter(
        ([, v]) => v !== null && v !== undefined,
      );
      const substantive = allPopulated.filter(
        ([k]) => k !== "primary_data_source",
      );
      if (substantive.length === 0) {
        toast({
          title: `Nothing to import from ${provider === "square" ? "Square" : "Stripe"}`,
          description: "Summary did not include enough safely-mappable data.",
          variant: "destructive",
        });
        return;
      }
      await upsertCustomerMetrics(customer.id, {
        industry,
        source: result.source,
        confidence: result.confidence,
        ...result.payload,
      } as never);
      void logPortalAudit("data_import_completed", customer.id, {
        source: provider === "square" ? "metrics_square" : "metrics_stripe",
        import_type: "client_business_metrics",
        industry,
        field_count: allPopulated.length,
        confidence: result.confidence,
        readiness: result.readiness,
      });
      setHistoryRefreshKey((k) => k + 1);
      toast({
        title: `${provider === "square" ? "Square" : "Stripe"} snapshot imported`,
        description: `${allPopulated.length} fields populated`,
      });
      onImported?.();
    } catch (e: any) {
      toast({
        title: `${provider === "square" ? "Square" : "Stripe"} import failed`,
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="admin-metrics-importer">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Import structured metrics
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Populate <code>client_business_metrics</code> from a CSV template
          or from this customer's latest QuickBooks period summary. Admin
          only. Blank cells stay null. Nothing is inferred from unrelated data.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Templates ─────────────────────────────────────────── */}
        <section>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Templates
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TEMPLATES.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={t === recommendedTemplate ? "default" : "outline"}
                onClick={() => downloadMetricsTemplate(t)}
                data-testid={`metrics-template-${t}`}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {templateLabel(t)}
                {t === recommendedTemplate && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">For this customer</Badge>
                )}
              </Button>
            ))}
          </div>
          <div className="text-[10px] font-mono text-muted-foreground mt-1">
            {metricsTemplateFileName(recommendedTemplate)}
          </div>
        </section>

        {/* ── CSV upload ────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            CSV or XLSX upload
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="text-xs"
              data-testid="metrics-csv-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            {fileName && (
              <span className="text-xs text-muted-foreground">{fileName}</span>
            )}
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn't read this file</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <div className="space-y-3 border rounded-md p-3 bg-card/40">
              <div className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span>
                  Preview · {preview.fields.length} mapped ·{" "}
                  <span className="text-muted-foreground">
                    {preview.ignoredColumns.length} ignored ·{" "}
                    {preview.invalid.length} invalid ·{" "}
                    {preview.blankFields.length} blank
                  </span>
                </span>
              </div>

              {preview.fields.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium mb-1">Will save:</div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                    {preview.fields.map((f) => (
                      <li key={String(f.fieldKey)} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">{f.label}</span>
                        <span className="font-mono">
                          {f.parsedValue === null ? <em className="text-muted-foreground">blank</em> : String(f.parsedValue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.ignoredColumns.length > 0 && (
                <div className="text-xs">
                  <div className="font-medium mb-1">Ignored columns (unknown):</div>
                  <div className="flex flex-wrap gap-1">
                    {preview.ignoredColumns.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {preview.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Invalid values were not saved</AlertTitle>
                  <AlertDescription>
                    <ul className="text-xs list-disc pl-4">
                      {preview.invalid.map((v) => (
                        <li key={v.column}>
                          <code>{v.column}</code> = "{v.rawValue}" — {v.reason}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1">
                  Confidence:
                  <select
                    className="h-7 rounded border border-input bg-background px-1 text-xs"
                    value={confidence}
                    onChange={(e) => setConfidence(e.target.value as "Estimated" | "Confirmed")}
                  >
                    <option value="Estimated">Estimated</option>
                    <option value="Confirmed">Confirmed</option>
                  </select>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={clearBlanks}
                    onChange={(e) => setClearBlanks(e.target.checked)}
                  />
                  Clear blank fields (overwrite existing values with null)
                </label>
                <div className="flex-1" />
                <Button size="sm" onClick={onSaveCsv} disabled={saving || preview.fields.length === 0}>
                  {saving ? "Saving…" : "Save imported metrics"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ── QuickBooks snapshot ───────────────────────────────── */}
        <section className="space-y-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-2">
            <Database className="h-3.5 w-3.5" /> QuickBooks snapshot
          </div>

          {qbLoading ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 animate-spin" /> Checking QuickBooks readiness…
            </div>
          ) : qbError ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Couldn't read QuickBooks summary</AlertTitle>
              <AlertDescription>{qbError}</AlertDescription>
            </Alert>
          ) : !qbSummary ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No QuickBooks summary on file</AlertTitle>
              <AlertDescription className="text-xs">
                Run a QuickBooks sync for this customer first. The importer
                will then map only the safely-supported fields. Tokens are
                never read from the browser.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border rounded-md p-3 bg-card/40 space-y-2">
              <div className="text-xs flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Period {qbSummary.period_start} → {qbSummary.period_end} ·
                Confidence: <Badge variant="secondary" className="text-[10px]">{qbResult.confidence}</Badge>
              </div>
              {Object.keys(qbResult.payload).length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  Nothing safely derivable from QuickBooks for this industry yet.
                </div>
              ) : (
                <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                  {Object.entries(qbResult.payload)
                    .filter(([, v]) => v !== null && v !== undefined)
                    .map(([k, v]) => (
                      <li key={k} className="flex justify-between gap-2">
                        <span className="text-muted-foreground truncate">{k}</span>
                        <span className="font-mono">{String(v)}</span>
                      </li>
                    ))}
                </ul>
              )}
              <details className="text-[11px] text-muted-foreground">
                <summary className="cursor-pointer">Fields intentionally not derived from QuickBooks</summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {qbResult.notDerived.map((k) => (
                    <Badge key={String(k)} variant="outline" className="text-[10px]">{String(k)}</Badge>
                  ))}
                </div>
              </details>
              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSaveQb}
                  disabled={qbSaving || Object.keys(qbResult.payload).length === 0}
                  data-testid="qb-snapshot-import"
                >
                  {qbSaving ? "Importing…" : "Import QuickBooks snapshot"}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* ── Square snapshot ───────────────────────────────────── */}
        <ProviderSnapshotSection
          provider="square"
          loading={sqLoading}
          error={sqError}
          summary={sqSummary}
          result={sqResult}
          saving={sqSaving}
          onImport={() => onSaveProvider("square", sqResult, setSqSaving)}
        />

        {/* ── Stripe snapshot ───────────────────────────────────── */}
        <ProviderSnapshotSection
          provider="stripe"
          loading={stLoading}
          error={stError}
          summary={stSummary}
          result={stResult}
          saving={stSaving}
          onImport={() => onSaveProvider("stripe", stResult, setStSaving)}
          derivedIndicators={
            "derivedIndicators" in stResult ? stResult.derivedIndicators : undefined
          }
        />

        {/* ── Dutchie snapshot (cannabis/MMJ retail/POS only) ──── */}
        <DutchieSnapshotSection
          loading={duLoading}
          error={duError}
          summary={duSummary}
          result={duResult}
          saving={duSaving}
          industry={industry}
          onImport={onSaveDutchie}
        />

        {/* ── Provider Summary Ingest (admin paste/upload) ──────── */}
        <ProviderSummaryIngestPanel
          customerId={customer.id}
          isCannabis={industry === "mmj_cannabis"}
          onIngested={(provider: IngestProvider) => {
            if (provider === "square") setSqRefreshKey((k) => k + 1);
            else if (provider === "stripe") setStRefreshKey((k) => k + 1);
            else if (provider === "dutchie") setDuRefreshKey((k) => k + 1);
            setHistoryRefreshKey((k) => k + 1);
          }}
        />

        {/* ── Connector Readiness & Import History ──────────────── */}
        <ConnectorReadinessHistoryPanel
          customerId={customer.id}
          refreshKey={historyRefreshKey}
          inputs={{
            industry,
            currentMetricsSource,
            quickbooks: {
              summary: qbSummary
                ? {
                    period_start: qbSummary.period_start,
                    period_end: qbSummary.period_end,
                    synced_at: (qbSummary as { synced_at?: string | null }).synced_at ?? null,
                  }
                : null,
              error: qbError,
              // Live OAuth status is not tracked here; readiness panel
              // will surface "summary available" / "no summary" honestly.
              liveConnected: false,
            },
            square: {
              summary: sqSummary
                ? {
                    period_start: sqSummary.period_start,
                    period_end: sqSummary.period_end,
                    synced_at: (sqSummary as { synced_at?: string | null }).synced_at ?? null,
                  }
                : null,
              error: sqError,
            },
            stripe: {
              summary: stSummary
                ? {
                    period_start: stSummary.period_start,
                    period_end: stSummary.period_end,
                    synced_at: (stSummary as { synced_at?: string | null }).synced_at ?? null,
                  }
                : null,
              error: stError,
            },
            dutchie: {
              summary: duSummary
                ? {
                    period_start: duSummary.period_start,
                    period_end: duSummary.period_end,
                    synced_at: duSummary.synced_at ?? null,
                  }
                : null,
              error: duError,
            },
          }}
        />
      </CardContent>
    </Card>
  );
}

export default AdminMetricsImporterPanel;

// ── Reusable section for Square/Stripe ─────────────────────────────
interface ProviderSnapshotSectionProps {
  provider: "square" | "stripe";
  loading: boolean;
  error: string | null;
  summary: { period_start: string; period_end: string } | null;
  result: SquareSnapshotResult | StripeSnapshotResult;
  saving: boolean;
  onImport: () => void;
  derivedIndicators?: { payment_failure_rate_pct: number | null; refund_rate_pct: number | null };
}

function ProviderSnapshotSection({
  provider,
  loading,
  error,
  summary,
  result,
  saving,
  onImport,
  derivedIndicators,
}: ProviderSnapshotSectionProps) {
  const label = provider === "square" ? "Square" : "Stripe";
  const populated = Object.entries(result.payload).filter(
    ([, v]) => v !== null && v !== undefined,
  );
  const hasDerived =
    derivedIndicators &&
    (derivedIndicators.payment_failure_rate_pct !== null ||
      derivedIndicators.refund_rate_pct !== null);

  return (
    <section className="space-y-3" data-testid={`${provider}-snapshot-section`}>
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-2">
        <Database className="h-3.5 w-3.5" /> {label} snapshot
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" /> Checking {label} readiness…
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't read {label} summary</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !summary ? (
        <Alert data-testid={`${provider}-no-summary`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No {label} summary on file</AlertTitle>
          <AlertDescription className="text-xs">
            Run a {label} sync (or ingest a normalized period summary) for
            this customer first. Tokens and credentials are never read from
            the browser. The connector is currently scaffolded server-side.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-md p-3 bg-card/40 space-y-2">
          <div className="text-xs flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Period {summary.period_start} → {summary.period_end} ·
            Readiness:{" "}
            <Badge variant="secondary" className="text-[10px]">{result.readiness}</Badge>
            · Confidence:{" "}
            <Badge variant="secondary" className="text-[10px]">{result.confidence}</Badge>
          </div>

          {populated.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nothing safely derivable from {label} for this industry yet.
            </div>
          ) : (
            <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
              {populated.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{k}</span>
                  <span className="font-mono">{String(v)}</span>
                </li>
              ))}
            </ul>
          )}

          {hasDerived && (
            <div
              className="text-[11px] border-t border-border/50 pt-2 mt-2"
              data-testid="stripe-derived-indicators"
            >
              <div className="font-medium text-muted-foreground mb-1">
                Derived indicators (admin-only · not yet stored)
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                {derivedIndicators?.payment_failure_rate_pct !== null && (
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">payment_failure_rate_pct</span>
                    <span className="font-mono">{derivedIndicators?.payment_failure_rate_pct}</span>
                  </li>
                )}
                {derivedIndicators?.refund_rate_pct !== null && (
                  <li className="flex justify-between gap-2">
                    <span className="text-muted-foreground">refund_rate_pct</span>
                    <span className="font-mono">{derivedIndicators?.refund_rate_pct}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">
              Fields intentionally not derived from {label}
            </summary>
            <div className="mt-1 flex flex-wrap gap-1">
              {result.notDerived.map((k) => (
                <Badge key={String(k)} variant="outline" className="text-[10px]">
                  {String(k)}
                </Badge>
              ))}
            </div>
          </details>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onImport}
              disabled={saving || populated.length === 0}
              data-testid={`${provider}-snapshot-import`}
            >
              {saving ? "Importing…" : `Import ${label} snapshot`}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Dutchie section (cannabis/MMJ retail/POS only) ────────────────
interface DutchieSnapshotSectionProps {
  loading: boolean;
  error: string | null;
  summary:
    | (DutchiePeriodSummary & { period_start: string; period_end: string; synced_at?: string | null })
    | null;
  result: DutchieSnapshotResult;
  saving: boolean;
  industry: IndustryCategory;
  onImport: () => void;
}

function DutchieSnapshotSection({
  loading,
  error,
  summary,
  result,
  saving,
  industry,
  onImport,
}: DutchieSnapshotSectionProps) {
  const isCannabis = industry === "mmj_cannabis";
  const populated = Object.entries(result.payload).filter(
    ([, v]) => v !== null && v !== undefined,
  );
  const substantive = populated.filter(([k]) => k !== "primary_data_source");
  const importDisabled =
    saving ||
    !isCannabis ||
    !summary ||
    result.readiness === "no_summary" ||
    result.readiness === "industry_mismatch" ||
    substantive.length === 0;

  return (
    <section className="space-y-3" data-testid="dutchie-snapshot-section">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-2">
        <Database className="h-3.5 w-3.5" /> Dutchie snapshot
        <span className="ml-1 text-[10px] normal-case tracking-normal text-muted-foreground/70">
          (cannabis / regulated retail · POS / inventory)
        </span>
      </div>

      {!isCannabis ? (
        <Alert data-testid="dutchie-industry-mismatch">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Not applicable for this customer</AlertTitle>
          <AlertDescription className="text-xs">
            Dutchie is a cannabis / MMJ retail and POS connector. This
            customer is not in the cannabis industry, so Dutchie metrics
            cannot be imported here.
          </AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <RefreshCw className="h-3 w-3 animate-spin" /> Checking Dutchie readiness…
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Couldn't read Dutchie summary</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !summary ? (
        <Alert data-testid="dutchie-no-summary">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Dutchie summary on file</AlertTitle>
          <AlertDescription className="text-xs">
            Run a Dutchie sync (or ingest a normalized period summary) for
            this customer first. Dutchie API credentials and tokens are
            never read from the browser. Live ingestion requires a
            server-side Dutchie connector with credentials.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-md p-3 bg-card/40 space-y-2">
          <div className="text-xs flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Period {summary.period_start} → {summary.period_end} ·
            Readiness:{" "}
            <Badge variant="secondary" className="text-[10px]">{result.readiness}</Badge>
            · Confidence:{" "}
            <Badge variant="secondary" className="text-[10px]">{result.confidence}</Badge>
            {summary.synced_at && (
              <span className="text-muted-foreground">
                · synced {new Date(summary.synced_at).toLocaleString()}
              </span>
            )}
          </div>

          {substantive.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              Nothing safely derivable from Dutchie for this period yet.
            </div>
          ) : (
            <ul className="text-xs grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
              {populated.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span className="text-muted-foreground truncate">{k}</span>
                  <span className="font-mono">{String(v)}</span>
                </li>
              ))}
            </ul>
          )}

          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer">
              Fields intentionally not derived from Dutchie
            </summary>
            <div className="mt-1 flex flex-wrap gap-1">
              {result.notDerived.map((k) => (
                <Badge key={String(k)} variant="outline" className="text-[10px]">
                  {String(k)}
                </Badge>
              ))}
            </div>
          </details>

          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onImport}
              disabled={importDisabled}
              data-testid="dutchie-snapshot-import"
            >
              {saving ? "Importing…" : "Import Dutchie snapshot"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}