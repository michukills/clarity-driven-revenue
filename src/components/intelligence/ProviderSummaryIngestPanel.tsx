/**
 * P20.16 — Provider Summary Ingest (admin only).
 *
 * Admins paste or upload a NORMALIZED period summary for Square,
 * Stripe, or Dutchie. We validate the payload locally (no tokens, no
 * raw transactions, whitelisted fields only), then call the matching
 * server-side ingest edge function (`square-sync` / `stripe-sync` /
 * `dutchie-sync`) with `action: "ingest_summary"`.
 *
 * This does NOT require live OAuth/API credentials — it is an explicit
 * normalized-summary path. Admins must still click "Import" on the
 * matching snapshot section to write into client_business_metrics.
 *
 * No client/public surface. No frontend secrets. Audit logging is
 * count-only.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, ShieldAlert, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logPortalAudit } from "@/lib/portalAudit";
import {
  ingestEdgeFunctionName,
  listProviderFields,
  parseAndValidate,
  type IngestProvider,
  type IngestValidationResult,
} from "@/lib/customerMetrics/providerSummaryIngest";

export interface ProviderSummaryIngestPanelProps {
  customerId: string;
  /** Cannabis/MMJ industry — controls whether Dutchie is selectable. */
  isCannabis: boolean;
  /** Called after a successful ingest so the parent can refresh snapshots. */
  onIngested?: (provider: IngestProvider) => void;
}

export function ProviderSummaryIngestPanel({
  customerId,
  isCannabis,
  onIngested,
}: ProviderSummaryIngestPanelProps) {
  const { toast } = useToast();
  const [provider, setProvider] = useState<IngestProvider>("square");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<IngestValidationResult | null>(null);

  const validation = useMemo(() => {
    if (!text.trim()) return null;
    return parseAndValidate(provider, customerId, text);
  }, [provider, customerId, text]);

  const supportedFields = useMemo(() => listProviderFields(provider), [provider]);

  const onFile = async (f: File) => {
    if (f.size > 64 * 1024) {
      toast({
        title: "File too large",
        description: "Normalized summary files must be under 64 KB.",
        variant: "destructive",
      });
      return;
    }
    setText(await f.text());
  };

  const handleProviderChange = (next: IngestProvider) => {
    setProvider(next);
    setLastResult(null);
  };

  const submit = async () => {
    if (!validation || !validation.ok) return;
    if (provider === "dutchie" && !isCannabis) {
      toast({
        title: "Dutchie ingest blocked",
        description: "Dutchie is for cannabis/MMJ customers only.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const fnName = ingestEdgeFunctionName(provider);
      const { data, error } = await supabase.functions.invoke(fnName, {
        body: {
          action: "ingest_summary",
          customer_id: customerId,
          summary: validation.summary,
        },
      });
      if (error) throw error;
      const ok = (data as { ok?: boolean })?.ok === true;
      if (!ok) {
        throw new Error(
          (data as { message?: string })?.message ?? "Ingest function reported failure",
        );
      }
      // Count-only audit. No raw payload, no tokens, no IDs.
      void logPortalAudit("data_import_started", customerId, {
        event: "provider_summary_ingested",
        provider,
        period_start: validation.summary.period_start,
        period_end: validation.summary.period_end,
        field_count: validation.fieldCount,
        ignored_field_count: validation.ignored.length,
        invalid_field_count: validation.invalid.length,
        source: "normalized_admin_ingest",
        live_api: false,
      });
      toast({
        title: `${labelFor(provider)} summary ingested`,
        description: `${validation.fieldCount} field(s) saved. Open the snapshot section to import into metrics.`,
      });
      setLastResult(validation);
      setText("");
      onIngested?.(provider);
    } catch (e) {
      toast({
        title: "Ingest failed",
        description: (e as Error).message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card data-testid="provider-summary-ingest">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Provider summary ingest
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Admin-only. Paste or upload a normalized period summary for
          Square, Stripe, or Dutchie (cannabis/MMJ retail). This is
          NOT live OAuth sync — it is a safe normalized-summary path.
          Tokens, raw transactions, and card data are rejected.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Provider
          </span>
          {(["square", "stripe", "dutchie"] as IngestProvider[]).map((p) => {
            const disabled = p === "dutchie" && !isCannabis;
            return (
              <Button
                key={p}
                size="sm"
                variant={provider === p ? "default" : "outline"}
                onClick={() => handleProviderChange(p)}
                disabled={disabled}
                data-testid={`ingest-provider-${p}`}
              >
                {labelFor(p)}
                {disabled && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    cannabis/MMJ only
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        <div className="text-[11px] text-muted-foreground">
          Required: <code>period_start</code>, <code>period_end</code> (YYYY-MM-DD).
          Allowed numeric/boolean fields:{" "}
          {supportedFields.map((f) => (
            <Badge key={f.field} variant="outline" className="text-[10px] mr-1">
              {f.field}
            </Badge>
          ))}
        </div>

        <div className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`{\n  "period_start": "2026-04-01",\n  "period_end": "2026-04-30",\n  "gross_sales": 100000\n}`}
            rows={8}
            className="font-mono text-xs"
            data-testid="ingest-json-input"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json,application/json"
              className="text-xs"
              data-testid="ingest-file-input"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              Or upload normalized JSON (max 64 KB).
            </span>
          </div>
        </div>

        {validation && validation.errors.length > 0 && (
          <Alert variant="destructive" data-testid="ingest-errors">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Payload rejected</AlertTitle>
            <AlertDescription>
              <ul className="text-xs list-disc pl-4">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation && validation.errors.length === 0 && (
          <div className="border rounded-md p-3 bg-card/40 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              {validation.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span>
                Preview · {validation.fieldCount} mapped ·{" "}
                <span className="text-muted-foreground">
                  {validation.ignored.length} ignored · {validation.invalid.length} invalid
                </span>
              </span>
            </div>

            {validation.fieldCount > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0.5">
                {Object.entries(validation.summary)
                  .filter(([k]) => k !== "period_start" && k !== "period_end")
                  .filter(([, v]) => v !== null)
                  .map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-mono">{String(v)}</span>
                    </li>
                  ))}
              </ul>
            )}

            {validation.ignored.length > 0 && (
              <div>
                <div className="font-medium">Ignored (unsupported) fields:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {validation.ignored.map((k) => (
                    <Badge key={k} variant="outline" className="text-[10px]">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {validation.invalid.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Invalid values</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {validation.invalid.map((v) => (
                      <li key={v.field}>
                        <code>{v.field}</code> — {v.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.warnings.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                {validation.warnings.join(" · ")}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting || !validation || !validation.ok || validation.fieldCount === 0}
            data-testid="ingest-submit"
          >
            {submitting ? "Ingesting…" : `Ingest ${labelFor(provider)} summary`}
          </Button>
        </div>

        {lastResult && (
          <div className="text-[10px] text-muted-foreground">
            Last ingest: {lastResult.fieldCount} field(s) · period{" "}
            {String(lastResult.summary.period_start)} →{" "}
            {String(lastResult.summary.period_end)}. Open the matching
            snapshot section above to preview and import into metrics.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function labelFor(p: IngestProvider): string {
  return p === "square" ? "Square" : p === "stripe" ? "Stripe" : "Dutchie";
}

export default ProviderSummaryIngestPanel;