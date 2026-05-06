/**
 * P86 — External Risk Diagnostic Triggers admin panel.
 * Manual admin entry only — no live external monitoring is wired.
 */
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  EXTERNAL_RISK_TRIGGER_TYPES,
  EXTERNAL_RISK_MODE_LABEL,
  findExternalRiskForbiddenPhrase,
  type ExternalRiskTriggerType,
  type ExternalRiskSeverity,
} from "@/config/externalRiskTriggers";
import {
  adminCreateExternalRiskTrigger,
  adminListExternalRiskTriggers,
  adminResolveExternalRisk,
  adminDismissExternalRisk,
  adminApproveExternalRiskForClient,
  type AdminExternalRiskRow,
} from "@/lib/externalRiskTriggers";

const SEVS: ExternalRiskSeverity[] = ["low", "medium", "high", "severe", "critical"];

export function ExternalRiskTriggersPanel({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<AdminExternalRiskRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<ExternalRiskTriggerType>("vendor_disruption");
  const [gear, setGear] = useState("");
  const [note, setNote] = useState("");
  const [url, setUrl] = useState("");
  const [severity, setSeverity] = useState<ExternalRiskSeverity>("medium");
  const [adminNote, setAdminNote] = useState("");
  const [clientSafe, setClientSafe] = useState("");

  const reload = async () => {
    try { setRows(await adminListExternalRiskTriggers(customerId)); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const handleSave = async () => {
    for (const t of [adminNote, clientSafe, note]) {
      const f = findExternalRiskForbiddenPhrase(t);
      if (f) { toast.error(`Forbidden phrase: "${f}"`); return; }
    }
    if (!gear.trim()) { toast.error("Affected gear required"); return; }
    if (!note.trim() || note.trim().length < 4) { toast.error("Source note required"); return; }
    setBusy(true);
    try {
      await adminCreateExternalRiskTrigger({
        customer_id: customerId,
        trigger_type: type,
        affected_gear: gear.trim(),
        source_note: note.trim(),
        source_url: url.trim() || null,
        severity,
        admin_notes: adminNote.trim() || null,
        client_safe_summary: clientSafe.trim() || null,
      });
      setGear(""); setNote(""); setUrl(""); setAdminNote(""); setClientSafe("");
      toast.success("External risk trigger recorded");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="font-serif text-lg">External Risk Diagnostic Triggers</h3>
      </div>
      <p className="text-[11px] text-muted-foreground italic">
        {EXTERNAL_RISK_MODE_LABEL} — no live external monitoring is wired.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={type} onValueChange={(v) => setType(v as ExternalRiskTriggerType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {EXTERNAL_RISK_TRIGGER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Affected gear (required)" value={gear} onChange={(e) => setGear(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Source note (required, min 4 chars)" value={note} onChange={(e) => setNote(e.target.value)} />
        <Input placeholder="Optional source URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Select value={severity} onValueChange={(v) => setSeverity(v as ExternalRiskSeverity)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SEVS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Textarea className="sm:col-span-2" placeholder="Admin-only note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <Textarea className="sm:col-span-2" placeholder="Client-safe summary (only after approval)" value={clientSafe} onChange={(e) => setClientSafe(e.target.value)} />
      </div>
      <Button size="sm" onClick={handleSave} disabled={busy}>Save trigger</Button>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No external risk triggers yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{r.trigger_type.replace(/_/g, " ")}</Badge>
              <Badge variant="outline">{r.severity}</Badge>
              <Badge variant="outline">{r.status}</Badge>
              <span>gear: {r.affected_gear}</span>
              {r.marks_needs_reinspection && <Badge variant="outline">needs reinspection</Badge>}
            </div>
            <div className="mt-1 text-muted-foreground">{r.source_note}</div>
            <div className="mt-2 flex gap-2 flex-wrap">
              {r.status !== "resolved" && <Button size="sm" variant="outline" onClick={async () => { await adminResolveExternalRisk(r.id); reload(); }}>Resolve</Button>}
              {r.status !== "dismissed" && <Button size="sm" variant="outline" onClick={async () => { await adminDismissExternalRisk(r.id); reload(); }}>Dismiss</Button>}
              {!r.approved_for_client && <Button size="sm" variant="outline" onClick={async () => { await adminApproveExternalRiskForClient(r.id); reload(); }}>Approve for client</Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExternalRiskTriggersPanel;