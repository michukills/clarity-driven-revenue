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
import { upsertCustomerMetrics } from "@/lib/customerMetrics/service";
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
  mapQuickBooksSummaryToMetrics,
  type QuickBooksPeriodSummary,
  type QbSnapshotResult,
} from "@/lib/customerMetrics/quickbooksSnapshot";
import { supabase } from "@/integrations/supabase/client";
import { logPortalAudit } from "@/lib/portalAudit";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

type CustomerLike = {
  id: string;
  industry?: string | null;
  account_kind?: string | null;
  email?: string | null;
  full_name?: string | null;
  business_name?: string | null;
};

const TEMPLATE_FOR_INDUSTRY: Record<IndustryCategory, MetricsTemplateId> = {
  trade_field_service: "trades",
  restaurant: "restaurant",
  retail: "retail",
  mmj_cannabis: "cannabis",
  // Fallbacks
  professional_services: "shared",
  ecommerce: "retail",
  health_wellness: "shared",
  other: "shared",
} as Record<IndustryCategory, MetricsTemplateId>;

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

  if (!isClientFlow) return null;

  const onFile = async (file: File) => {
    setParseError(null);
    setPreview(null);
    setFileName(file.name);
    if (file.size > 1 * 1024 * 1024) {
      setParseError("Metrics CSV must be under 1 MB.");
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseMetricsCsv(text);
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
        source: "csv_upload",
        confidence,
        ...payload,
      } as never);
      const fieldCount = preview.fields.filter((f) => f.parsedValue !== null || clearBlanks).length;
      void logPortalAudit("data_import_completed", customer.id, {
        source: "metrics_csv",
        import_type: "client_business_metrics",
        industry,
        field_count: fieldCount,
        ignored_column_count: preview.ignoredColumns.length,
        invalid_column_count: preview.invalid.length,
        confidence,
      });
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
            CSV / Spreadsheet upload
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
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
      </CardContent>
    </Card>
  );
}

export default AdminMetricsImporterPanel;