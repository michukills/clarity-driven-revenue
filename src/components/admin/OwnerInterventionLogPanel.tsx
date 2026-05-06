/**
 * P86 — Owner Intervention Log admin panel.
 * Tracks owner overrides; threshold (4/30d) or repeated pattern triggers
 * Owner Independence risk via deterministic library logic.
 */
import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  OWNER_INTERVENTION_TYPES,
  OWNER_INTERVENTION_PATTERN_THRESHOLD_30D,
  findOwnerInterventionForbiddenPhrase,
  type OwnerInterventionType,
  type OwnerInterventionSeverity,
} from "@/config/ownerInterventionLog";
import {
  adminCreateOwnerIntervention,
  adminListOwnerInterventions,
  adminApproveOwnerInterventionForClient,
  type AdminOwnerInterventionRow,
} from "@/lib/ownerInterventionLog";

const SEVERITIES: OwnerInterventionSeverity[] = ["low", "medium", "high"];

export function OwnerInterventionLogPanel({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<AdminOwnerInterventionRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<OwnerInterventionType>("owner_jumped_into_dispatch");
  const [date, setDate] = useState("");
  const [severity, setSeverity] = useState<OwnerInterventionSeverity>("medium");
  const [repeated, setRepeated] = useState(false);
  const [workflow, setWorkflow] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [clientSafe, setClientSafe] = useState("");

  const reload = async () => {
    try { setRows(await adminListOwnerInterventions(customerId)); }
    catch (e: any) { toast.error(e.message ?? "Failed to load"); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const handleSave = async () => {
    for (const t of [adminNote, clientSafe, workflow]) {
      const f = findOwnerInterventionForbiddenPhrase(t);
      if (f) { toast.error(`Forbidden phrase: "${f}"`); return; }
    }
    if (!date) { toast.error("Pick a date"); return; }
    setBusy(true);
    try {
      await adminCreateOwnerIntervention({
        customer_id: customerId,
        intervention_type: type,
        intervention_date: new Date(date).toISOString(),
        severity,
        repeated_pattern_flag: repeated,
        related_workflow: workflow.trim() || null,
        admin_notes: adminNote.trim() || null,
        client_safe_summary: clientSafe.trim() || null,
      });
      setDate(""); setWorkflow(""); setAdminNote(""); setClientSafe(""); setRepeated(false);
      toast.success("Owner intervention logged");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  const approve = async (id: string) => {
    try { await adminApproveOwnerInterventionForClient(id); toast.success("Approved"); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <UserCog className="h-4 w-4" />
        <h3 className="font-serif text-lg">Owner Intervention Log</h3>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Threshold: {OWNER_INTERVENTION_PATTERN_THRESHOLD_30D}+ in 30 days OR repeated-pattern flag triggers Owner Independence risk.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={type} onValueChange={(v) => setType(v as OwnerInterventionType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {OWNER_INTERVENTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select value={severity} onValueChange={(v) => setSeverity(v as OwnerInterventionSeverity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={repeated} onCheckedChange={(v) => setRepeated(!!v)} />
          Repeated pattern (forces risk flag)
        </label>
        <Input className="sm:col-span-2" placeholder="Related workflow" value={workflow} onChange={(e) => setWorkflow(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Admin-only note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Client-safe summary (only after approval)" value={clientSafe} onChange={(e) => setClientSafe(e.target.value)} />
      </div>
      <Button size="sm" onClick={handleSave} disabled={busy}>Log intervention</Button>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No owner interventions logged yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{r.intervention_type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline">{r.severity}</Badge>
              <span>{new Date(r.intervention_date).toLocaleString()}</span>
              {r.triggers_owner_independence_risk && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  Owner Independence risk
                </Badge>
              )}
              {r.approved_for_client ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">client-visible</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => approve(r.id)}>Approve for client</Button>
              )}
            </div>
            {r.client_safe_summary && <p className="mt-1 text-muted-foreground">{r.client_safe_summary}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OwnerInterventionLogPanel;