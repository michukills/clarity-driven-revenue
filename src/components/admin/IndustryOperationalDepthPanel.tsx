/**
 * P86C — Admin RGS Industry Operational Depth™ panel.
 *
 * Admin selects a deterministic metric for the customer's industry and
 * records a manual review row. No AI scoring. No AI verification.
 * Every third-party evidence source is treated as MANUAL EXPORT / UPLOAD
 * — RGS does not maintain live syncs for any depth-relevant connector.
 */
import { useEffect, useMemo, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  DEPTH_ADMIN_INTERPRETATION,
  DEPTH_CLIENT_SAFE_EXPLANATION,
  DEPTH_EVIDENCE_EXAMPLES,
  findDepthForbiddenPhrase,
  isDepthIndustryKey,
  resolveDepthIndustryKey,
  type DepthEvidenceSourceType,
  type DepthGearKey,
} from "@/config/industryOperationalDepth";
import { getQuickStartTemplate, type QuickStartTemplateKey } from "@/config/stabilityQuickStartTemplates";
import {
  approveDepthForClient,
  createDepthReview,
  getAllDepthMetricsForIndustry,
  getDepthMetricAdminAnnotation,
  listAdminDepthReviews,
  unapproveDepth,
  type AdminDepthRow,
  type DepthSeverity,
  type DepthStatus,
} from "@/lib/industryOperationalDepth";

export interface IndustryOperationalDepthPanelProps {
  customerId: string;
  industryKey: string | null | undefined;
}

const STATUS_OPTIONS: DepthStatus[] = [
  "current",
  "needs_review",
  "high_risk",
  "severe_risk",
  "source_conflict_possible",
];
const SEVERITY_OPTIONS: DepthSeverity[] = ["none", "info", "high", "severe"];

export function IndustryOperationalDepthPanel({
  customerId,
  industryKey,
}: IndustryOperationalDepthPanelProps) {
  const resolved = resolveDepthIndustryKey(industryKey);
  const applicable = isDepthIndustryKey(industryKey);
  const metrics = useMemo(
    () => (resolved ? getAllDepthMetricsForIndustry(resolved) : []),
    [resolved],
  );

  const [rows, setRows] = useState<AdminDepthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [metricKey, setMetricKey] = useState<string>(metrics[0]?.metric_key ?? "");
  const [triggerValue, setTriggerValue] = useState("");
  const [status, setStatus] = useState<DepthStatus>("needs_review");
  const [severity, setSeverity] = useState<DepthSeverity>("info");
  const [needsReinspection, setNeedsReinspection] = useState(false);
  const [sourceType, setSourceType] = useState<string>("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [clientExpl, setClientExpl] = useState("");

  useEffect(() => {
    if (metrics.length > 0 && !metrics.find((m) => m.metric_key === metricKey)) {
      setMetricKey(metrics[0].metric_key);
    }
  }, [metrics, metricKey]);

  const reload = async () => {
    if (!applicable) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listAdminDepthReviews(customerId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, applicable]);

  if (!applicable) {
    return (
      <section
        className="bg-card border border-border rounded-xl p-5"
        data-testid="industry-operational-depth-panel"
        data-applicable="false"
      >
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            RGS Industry Operational Depth™
          </h3>
          <Badge variant="outline" className="text-[10px]">Not applicable</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This panel applies only to General Small Business, Restaurant /
          Food Service, Retail, Professional Services, and E-commerce /
          Online Retail. Cannabis (P85.5) and Trades / Home Services
          (P85.6) have their own dedicated panels.
        </p>
      </section>
    );
  }

  const def = metrics.find((m) => m.metric_key === metricKey);
  const annotation = def ? getDepthMetricAdminAnnotation(def.metric_key) : null;
  const quickStartLabel = (key: string) => {
    try {
      return getQuickStartTemplate(key as QuickStartTemplateKey).title;
    } catch {
      return key.replace(/_/g, " ");
    }
  };

  const submit = async () => {
    if (!def) return;
    if (clientExpl && findDepthForbiddenPhrase(clientExpl)) {
      toast.error(
        "Client-safe explanation contains forbidden compliance / legal language.",
      );
      return;
    }
    setBusy(true);
    try {
      await createDepthReview({
        customer_id: customerId,
        industry_key: resolved as string,
        metric_key: def.metric_key,
        metric_label: def.label,
        gear_key: def.gears[0] as DepthGearKey,
        trigger_value: triggerValue === "" ? null : Number(triggerValue),
        threshold_value: def.threshold_value,
        status,
        severity,
        needs_reinspection: needsReinspection,
        evidence_source_type: (sourceType || null) as DepthEvidenceSourceType | null,
        evidence_label: evidenceLabel || null,
        admin_notes: adminNote || null,
        client_safe_explanation: clientExpl || null,
      });
      toast.success(`${def.label} review recorded.`);
      setTriggerValue("");
      setNeedsReinspection(false);
      setSourceType("");
      setEvidenceLabel("");
      setAdminNote("");
      setClientExpl("");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not record review.");
    } finally {
      setBusy(false);
    }
  };

  const approve = async (id: string, expl: string | null) => {
    if (expl && findDepthForbiddenPhrase(expl)) {
      toast.error("Client-safe explanation contains forbidden language.");
      return;
    }
    setBusy(true);
    try {
      await approveDepthForClient(id);
      toast.success("Approved for client visibility.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not approve.");
    } finally {
      setBusy(false);
    }
  };

  const unapprove = async (id: string) => {
    setBusy(true);
    try {
      await unapproveDepth(id);
      toast.success("Removed from client visibility.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-5"
      data-testid="industry-operational-depth-panel"
      data-applicable="true"
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-foreground">
            RGS Industry Operational Depth™
          </h3>
          <Badge variant="outline" className="text-[10px]">Admin</Badge>
          <Badge variant="outline" className="text-[10px]">{resolved}</Badge>
          <Badge variant="outline" className="text-[10px]">
            {metrics.length} deterministic metrics
          </Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </header>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {DEPTH_ADMIN_INTERPRETATION} Evidence below is treated as{" "}
        <strong>manual export / upload</strong>.
      </p>

      <div className="space-y-4 border border-border/60 rounded-lg p-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Metric
          </label>
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {metrics.map((m) => (
                <SelectItem key={m.metric_key} value={m.metric_key}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {def && (
          <div className="text-[11px] text-muted-foreground space-y-1">
            <div><strong>Trigger rule:</strong> {def.trigger_rule}</div>
            <div>
              <strong>Threshold:</strong>{" "}
              {def.threshold_value !== null
                ? `${def.threshold_value} ${def.threshold_unit ?? ""}`
                : "n/a (boolean / qualitative)"}
            </div>
            <div><strong>Gears:</strong> {def.gears.join(" / ")}</div>
            <div>
              <strong>Evidence examples:</strong> {def.evidence_examples.join(", ")}
            </div>
            <div>
              <strong>Repair Map:</strong> {def.repair_map_recommendation}
            </div>
            <div>
              <strong>Quick-Start templates:</strong>{" "}
              {def.recommended_quick_start_templates.map(quickStartLabel).join(", ")}
            </div>
            {annotation && (
              <div className="mt-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-2 space-y-1">
                <div><strong>Admin-only note:</strong> {annotation.admin_only_note}</div>
                <div><strong>Repair trigger:</strong> {annotation.repair_trigger.replace(/_/g, " ")}</div>
                <div>
                  <strong>Source-of-truth conflict capable:</strong>{" "}
                  {annotation.source_of_truth_conflict_capable ? "Yes — review in Source-of-Truth Conflict Flags™ if evidence conflicts." : "No"}
                </div>
                <div>
                  <strong>Repair-map behavior:</strong>{" "}
                  additive admin annotation only; this does not auto-create repair-map items.
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Trigger value (optional)
            </label>
            <Input
              type="number"
              value={triggerValue}
              onChange={(e) => setTriggerValue(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Status
            </label>
            <Select value={status} onValueChange={(v) => setStatus(v as DepthStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Severity
            </label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as DepthSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={needsReinspection}
            onChange={(e) => setNeedsReinspection(e.target.checked)}
          />
          Needs re-inspection
        </label>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Evidence source (manual export / upload)
            </label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger>
                <SelectValue placeholder="Select evidence source" />
              </SelectTrigger>
              <SelectContent>
                {DEPTH_EVIDENCE_EXAMPLES.map((e) => (
                  <SelectItem key={e.source_type} value={e.source_type}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Evidence label (file name, reference, etc.)"
              value={evidenceLabel}
              onChange={(e) => setEvidenceLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Admin-only note (never shown to client)
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              placeholder="Internal context, follow-ups, evidence quality observations…"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Client-safe explanation (operational-readiness only)
            </label>
            <Textarea
              value={clientExpl}
              onChange={(e) => setClientExpl(e.target.value)}
              rows={2}
              placeholder={DEPTH_CLIENT_SAFE_EXPLANATION}
            />
            {clientExpl && findDepthForbiddenPhrase(clientExpl) && (
              <p className="text-[11px] text-destructive">
                Forbidden compliance / legal language detected — please rephrase
                using operational-readiness wording only.
              </p>
            )}
          </div>
        </div>

        <Button onClick={submit} disabled={busy || !def} size="sm">
          Record review
        </Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Recent reviews
        </h4>
        {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No RGS Industry Operational Depth™ reviews recorded yet.
          </div>
        )}
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-border/60 bg-background/40 p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{r.metric_label}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
                {r.needs_reinspection && (
                  <Badge variant="outline" className="text-[10px]">
                    Needs Re-Inspection
                  </Badge>
                )}
                {r.approved_for_client ? (
                  <Badge variant="outline" className="text-[10px]">Client visible</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">Admin only</Badge>
                )}
                {r.trigger_value !== null && (
                  <span className="text-[11px] text-muted-foreground">
                    value: {Number(r.trigger_value).toFixed(2)}
                    {r.threshold_value !== null ? ` / ${r.threshold_value}` : ""}
                  </span>
                )}
              </div>
              {r.evidence_label && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Evidence: {r.evidence_label}
                  {r.evidence_source_type ? ` (${r.evidence_source_type})` : ""}
                  {" "}— manual export / upload
                </p>
              )}
              {r.admin_notes && (
                <p className="mt-1 text-[11px] text-muted-foreground italic">
                  Admin note: {r.admin_notes}
                </p>
              )}
              {r.client_safe_explanation && (
                <p className="mt-1 text-[11px] text-foreground">
                  Client-safe: {r.client_safe_explanation}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                {!r.approved_for_client ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => approve(r.id, r.client_safe_explanation)}
                  >
                    Approve for client
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => unapprove(r.id)}
                  >
                    Remove client visibility
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default IndustryOperationalDepthPanel;
