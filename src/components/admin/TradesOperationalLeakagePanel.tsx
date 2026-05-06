/**
 * P85.6 — Admin Trades / Home Services Operational Leakage™ panel.
 *
 * Admin enters labor hours, callbacks, truck inventory accountability,
 * and dispatch continuity inputs. Deterministic helpers compute status
 * locally before persisting. No live Jobber / ServiceTitan / Housecall
 * Pro / payroll connector is implied — every evidence source is treated
 * as manual export / upload.
 *
 * Renders only for trades / home-services industry keys.
 */
import { useEffect, useMemo, useState } from "react";
import { Wrench, RefreshCw } from "lucide-react";
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
  TRADES_ALLOWED_EVIDENCE_EXAMPLES,
  TRADES_OPERATIONAL_ADMIN_INTERPRETATION,
  TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION,
  TRADES_OPERATIONAL_LEAKAGE_METRICS,
  findTradesOperationalForbiddenPhrase,
  getTradesMetricDefinition,
  isTradesIndustryKey,
  type TradesEvidenceSourceType,
  type TradesGearKey,
  type TradesMetricKey,
} from "@/config/tradesOperationalLeakage";
import {
  approveTradesLeakageForClient,
  createTradesLeakageReview,
  detectFirstTimeFixDrag,
  detectShadowDispatcherRisk,
  detectShadowLaborLeak,
  detectTruckInventoryAccountability,
  listAdminTradesLeakageReviews,
  unapproveTradesLeakage,
  type AdminTradesLeakageRow,
} from "@/lib/tradesOperationalLeakage";

export interface TradesOperationalLeakagePanelProps {
  customerId: string;
  industryKey: string | null | undefined;
}

export function TradesOperationalLeakagePanel({
  customerId,
  industryKey,
}: TradesOperationalLeakagePanelProps) {
  const isTrades = isTradesIndustryKey(industryKey);
  const [rows, setRows] = useState<AdminTradesLeakageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [metricKey, setMetricKey] = useState<TradesMetricKey>("shadow_labor_leak");

  // Shadow Labor inputs
  const [paidHours, setPaidHours] = useState<string>("");
  const [billableHours, setBillableHours] = useState<string>("");

  // FTF inputs
  const [completedJobs, setCompletedJobs] = useState<string>("");
  const [callbackJobs, setCallbackJobs] = useState<string>("");

  // Truck inventory
  const [hasTruck, setHasTruck] = useState(false);
  const [hasScan, setHasScan] = useState(false);
  const [hasLog, setHasLog] = useState(false);
  const [hasTie, setHasTie] = useState(false);

  // Dispatcher
  const [hasDispatcher, setHasDispatcher] = useState(false);
  const [hasPlaybook, setHasPlaybook] = useState(false);
  const [canCover48, setCanCover48] = useState(false);
  const [spof, setSpof] = useState(false);

  // Evidence + notes
  const [sourceType, setSourceType] = useState<string>("");
  const [evidenceLabel, setEvidenceLabel] = useState<string>("");
  const [adminNote, setAdminNote] = useState<string>("");
  const [clientExpl, setClientExpl] = useState<string>("");

  const reload = async () => {
    if (!isTrades) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await listAdminTradesLeakageReviews(customerId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, isTrades]);

  const preview = useMemo(() => {
    if (metricKey === "shadow_labor_leak") {
      return detectShadowLaborLeak({
        paidHours: Number(paidHours),
        billableHours: Number(billableHours),
        industryKey: industryKey ?? null,
      });
    }
    if (metricKey === "first_time_fix_drag") {
      return detectFirstTimeFixDrag({
        completedJobs: Number(completedJobs),
        callbackJobs: Number(callbackJobs),
        industryKey: industryKey ?? null,
      });
    }
    if (metricKey === "truck_inventory_accountability_loop") {
      return detectTruckInventoryAccountability({
        hasTruckInventory: hasTruck,
        hasMobileScanning: hasScan,
        hasLoggedPartsMovement: hasLog,
        hasJobCostingTieOut: hasTie,
        industryKey: industryKey ?? null,
      });
    }
    return detectShadowDispatcherRisk({
      hasDispatcher,
      hasDispatchPriorityPlaybook: hasPlaybook,
      canCoverDispatchFor48Hours: canCover48,
      dispatcherSinglePointOfFailure: spof,
      industryKey: industryKey ?? null,
    });
  }, [
    metricKey,
    paidHours,
    billableHours,
    completedJobs,
    callbackJobs,
    hasTruck,
    hasScan,
    hasLog,
    hasTie,
    hasDispatcher,
    hasPlaybook,
    canCover48,
    spof,
    industryKey,
  ]);

  if (!isTrades) {
    return (
      <section
        className="bg-card border border-border rounded-xl p-5"
        data-testid="trades-operational-leakage-panel"
        data-applicable="false"
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Trades / Home Services Operational Leakage™
          </h3>
          <Badge variant="outline" className="text-[10px]">
            Not applicable
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This panel applies only to Trades / Home Services businesses
          (HVAC, plumbing, electrical, roofing, landscaping, cleaning,
          pest control, restoration, appliance repair, and field-service
          contractors).
        </p>
      </section>
    );
  }

  const submit = async () => {
    if (clientExpl && findTradesOperationalForbiddenPhrase(clientExpl)) {
      toast.error(
        "Client-safe explanation contains forbidden compliance / legal / blame language.",
      );
      return;
    }
    const def = getTradesMetricDefinition(metricKey);
    setBusy(true);
    try {
      await createTradesLeakageReview({
        customer_id: customerId,
        industry_key: industryKey as string,
        metric_key: metricKey,
        metric_label: def.label,
        gear_key: preview.gears[0] as TradesGearKey,
        trigger_value: preview.trigger_value,
        threshold_value: preview.threshold_value,
        status: preview.status,
        severity: preview.severity,
        needs_reinspection: preview.needs_reinspection,
        scoring_impact_type: preview.scoring_impact_type,
        scoring_impact_value: preview.scoring_impact_value,
        evidence_source_type: (sourceType || null) as TradesEvidenceSourceType | null,
        evidence_label: evidenceLabel || null,
        admin_notes: adminNote || null,
        client_safe_explanation: clientExpl || null,
      });
      toast.success(`${def.label} review recorded.`);
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
    if (expl && findTradesOperationalForbiddenPhrase(expl)) {
      toast.error("Client-safe explanation contains forbidden language.");
      return;
    }
    setBusy(true);
    try {
      await approveTradesLeakageForClient(id, expl ?? undefined);
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
      await unapproveTradesLeakage(id);
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
      data-testid="trades-operational-leakage-panel"
      data-applicable="true"
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-foreground">
            Trades / Home Services Operational Leakage™
          </h3>
          <Badge variant="outline" className="text-[10px]">Admin</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </header>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {TRADES_OPERATIONAL_ADMIN_INTERPRETATION} Evidence below is treated as{" "}
        <strong>manual export / upload</strong> — RGS does not currently
        maintain live Jobber, ServiceTitan, Housecall Pro, ADP, Gusto,
        Paycom, or QuickBooks Time integrations.
      </p>

      <div className="space-y-4 border border-border/60 rounded-lg p-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Metric
          </label>
          <Select value={metricKey} onValueChange={(v) => setMetricKey(v as TradesMetricKey)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRADES_OPERATIONAL_LEAKAGE_METRICS.map((m) => (
                <SelectItem key={m.metric_key} value={m.metric_key}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {metricKey === "shadow_labor_leak" && (
          <div className="grid md:grid-cols-2 gap-3">
            <LabeledInput label="Paid hours (period)" value={paidHours} onChange={setPaidHours} type="number" />
            <LabeledInput label="Billable hours (period)" value={billableHours} onChange={setBillableHours} type="number" />
          </div>
        )}

        {metricKey === "first_time_fix_drag" && (
          <div className="grid md:grid-cols-2 gap-3">
            <LabeledInput label="Completed jobs (period)" value={completedJobs} onChange={setCompletedJobs} type="number" />
            <LabeledInput label="Callback jobs (period)" value={callbackJobs} onChange={setCallbackJobs} type="number" />
          </div>
        )}

        {metricKey === "truck_inventory_accountability_loop" && (
          <div className="grid md:grid-cols-2 gap-2">
            <CheckboxRow label="Business has truck inventory" checked={hasTruck} onChange={setHasTruck} />
            <CheckboxRow label="Mobile inventory scanning in use" checked={hasScan} onChange={setHasScan} />
            <CheckboxRow label="Logged parts movement (manual or system)" checked={hasLog} onChange={setHasLog} />
            <CheckboxRow label="Job costing tie-out for parts" checked={hasTie} onChange={setHasTie} />
          </div>
        )}

        {metricKey === "shadow_dispatcher_risk" && (
          <div className="grid md:grid-cols-2 gap-2">
            <CheckboxRow label="Business has a dispatcher" checked={hasDispatcher} onChange={setHasDispatcher} />
            <CheckboxRow label="Written Dispatch Priority Playbook™ exists" checked={hasPlaybook} onChange={setHasPlaybook} />
            <CheckboxRow label="Someone else can cover dispatch for 48 hours" checked={canCover48} onChange={setCanCover48} />
            <CheckboxRow label="Dispatcher is a single point of failure" checked={spof} onChange={setSpof} />
          </div>
        )}

        <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-2">
          <span>Preview:</span>
          <Badge variant="outline" className="text-[10px]">{preview.status}</Badge>
          <Badge variant="outline" className="text-[10px]">severity: {preview.severity}</Badge>
          {preview.trigger_value !== null && (
            <span>value: {preview.trigger_value.toFixed(2)}{preview.threshold_value !== null ? `% (threshold ${preview.threshold_value}%)` : ""}</span>
          )}
          {preview.needs_reinspection && (
            <Badge variant="outline" className="text-[10px]">Needs Re-Inspection</Badge>
          )}
          <span>gear: {preview.gears.join(" / ")}</span>
          {preview.scoring_impact_type !== "none" && (
            <Badge variant="outline" className="text-[10px]">
              scoring: {preview.scoring_impact_type}
              {preview.scoring_impact_value !== null ? ` (-${preview.scoring_impact_value})` : ""}
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Evidence source (manual export / upload)
            </label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue placeholder="Select evidence source" /></SelectTrigger>
              <SelectContent>
                {TRADES_ALLOWED_EVIDENCE_EXAMPLES.map((e) => (
                  <SelectItem key={e.source_type} value={e.source_type}>{e.label}</SelectItem>
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
              placeholder={TRADES_OPERATIONAL_CLIENT_SAFE_EXPLANATION}
            />
            {clientExpl &&
              findTradesOperationalForbiddenPhrase(clientExpl) && (
                <p className="text-[11px] text-destructive">
                  Forbidden compliance / legal / blame language detected — please rephrase using operational-readiness wording.
                </p>
              )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={busy}>Record review</Button>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
          Recent reviews
        </h4>
        {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No Trades / Home Services Operational Leakage™ reviews recorded yet.
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
                  <Badge variant="outline" className="text-[10px]">Needs Re-Inspection</Badge>
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
                  {r.evidence_source_type ? ` (${r.evidence_source_type})` : ""} — manual export / upload
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

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export default TradesOperationalLeakagePanel;
