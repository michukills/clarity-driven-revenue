/**
 * P86 — Admin Labor Burden Calculator panel (Trades / Home Services).
 * Deterministic via computeLaborBurden. Manual exports only — no live syncs.
 * Operational-readiness language only — no labor/wage/payroll/OSHA claims.
 */
import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  LABOR_BURDEN_CLIENT_SAFE_EXPLANATION,
  LABOR_BURDEN_EVIDENCE_SOURCES,
  LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD,
  findLaborBurdenForbiddenPhrase,
} from "@/config/laborBurden";
import {
  adminCreateLaborBurdenCalculation,
  adminListLaborBurdenCalculations,
  adminApproveLaborBurdenForClient,
  type AdminLaborBurdenRow,
} from "@/lib/laborBurden";

export interface LaborBurdenCalculatorPanelProps {
  customerId: string;
  industryKey?: string | null;
}

export function LaborBurdenCalculatorPanel({
  customerId,
  industryKey,
}: LaborBurdenCalculatorPanelProps) {
  const [rows, setRows] = useState<AdminLaborBurdenRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState("");
  const [billable, setBillable] = useState("");
  const [hasEvidence, setHasEvidence] = useState(false);
  const [payrollLabel, setPayrollLabel] = useState("");
  const [fieldOpsLabel, setFieldOpsLabel] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [clientSafe, setClientSafe] = useState("");

  const reload = async () => {
    try { setRows(await adminListLaborBurdenCalculations(customerId)); }
    catch (e: any) { toast.error(e.message ?? "Failed to load"); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const handleSave = async () => {
    for (const t of [adminNote, clientSafe, payrollLabel, fieldOpsLabel]) {
      const f = findLaborBurdenForbiddenPhrase(t);
      if (f) { toast.error(`Forbidden phrase: "${f}"`); return; }
    }
    const p = Number(paid);
    const b = Number(billable);
    if (!Number.isFinite(p) || !Number.isFinite(b)) {
      toast.error("Enter numeric hours"); return;
    }
    setBusy(true);
    try {
      await adminCreateLaborBurdenCalculation({
        customer_id: customerId,
        industry_key: industryKey ?? "trades",
        total_field_payroll_hours: p,
        total_billable_hours: b,
        has_payroll_evidence: hasEvidence,
        payroll_evidence_label: payrollLabel.trim() || null,
        field_ops_evidence_label: fieldOpsLabel.trim() || null,
        admin_notes: adminNote.trim() || null,
        client_safe_explanation: clientSafe.trim() || null,
      });
      setPaid(""); setBillable(""); setPayrollLabel(""); setFieldOpsLabel("");
      setAdminNote(""); setClientSafe(""); setHasEvidence(false);
      toast.success("Labor burden recorded");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const approve = async (id: string) => {
    try { await adminApproveLaborBurdenForClient(id); toast.success("Approved for client"); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        <h3 className="font-serif text-lg">Labor Burden Calculator</h3>
      </div>
      <p className="text-xs text-muted-foreground">{LABOR_BURDEN_CLIENT_SAFE_EXPLANATION}</p>
      <p className="text-[11px] text-muted-foreground italic">
        All evidence sources are manual export / upload only — RGS does not maintain live syncs.
        High-risk threshold: gap &gt; {LABOR_BURDEN_GAP_HIGH_RISK_PCT_THRESHOLD}%.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Total Field Payroll Hours" value={paid} onChange={(e) => setPaid(e.target.value)} />
        <Input placeholder="Total Billable Hours" value={billable} onChange={(e) => setBillable(e.target.value)} />
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <Checkbox checked={hasEvidence} onCheckedChange={(v) => setHasEvidence(!!v)} />
          I have payroll + field-ops manual export evidence
        </label>
        <Input placeholder="Payroll evidence label (manual export)" value={payrollLabel} onChange={(e) => setPayrollLabel(e.target.value)} />
        <Input placeholder="Field-ops evidence label (manual export)" value={fieldOpsLabel} onChange={(e) => setFieldOpsLabel(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Admin-only note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Client-safe explanation (only shown after approval)" value={clientSafe} onChange={(e) => setClientSafe(e.target.value)} />
      </div>
      <div className="text-[11px] text-muted-foreground">
        Allowed evidence sources: {LABOR_BURDEN_EVIDENCE_SOURCES.map((s) => s.label).join(" · ")}
      </div>
      <Button size="sm" onClick={handleSave} disabled={busy}>Save labor burden</Button>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-xs text-muted-foreground">No labor burden calculations yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{r.status}</Badge>
              <span>gap: {r.paid_to_billable_gap_pct == null ? "—" : `${Number(r.paid_to_billable_gap_pct).toFixed(1)}%`}</span>
              <span>impact: −{r.scoring_impact_points} pts ({r.scoring_impact_gear})</span>
              {r.approved_for_client ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">client-visible</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Approve for client</Button>
              )}
            </div>
            {r.client_safe_explanation && <p className="mt-1 text-muted-foreground">{r.client_safe_explanation}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default LaborBurdenCalculatorPanel;