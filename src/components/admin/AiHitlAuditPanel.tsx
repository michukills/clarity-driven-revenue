/**
 * P86 — AI HITL Verification Audit panel.
 * AI assists admin review only. AI never verifies, scores, certifies, or marks
 * evidence verified alone. If AI was used, may_mark_verified requires
 * raw_document_cross_checked=true AND exact confirmation phrase.
 */
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  HITL_AI_TASK_TYPES,
  HITL_CONFIRMATION_TEXT,
  type HitlAiTaskType,
} from "@/config/aiHitlAudit";
import {
  adminCreateHitlAudit,
  adminListHitlAudits,
  type AdminHitlAuditRow,
} from "@/lib/aiHitlAudit";

export function AiHitlAuditPanel({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<AdminHitlAuditRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState<HitlAiTaskType>("summarize");
  const [aiUsed, setAiUsed] = useState(true);
  const [crossCheck, setCrossCheck] = useState(false);
  const [phrase, setPhrase] = useState("");

  const reload = async () => {
    try { setRows(await adminListHitlAudits(customerId)); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const handleSave = async () => {
    if (!user?.id) { toast.error("Sign in required"); return; }
    setBusy(true);
    try {
      const { gate } = await adminCreateHitlAudit({
        customer_id: customerId,
        ai_task_type: task,
        ai_assistance_used: aiUsed,
        raw_document_cross_checked: crossCheck,
        confirmation_text: phrase || null,
        admin_id: user.id,
      });
      toast.success(gate.may_mark_verified ? "Audit recorded — may mark verified" : `Audit recorded — verification blocked (${gate.reason})`);
      setPhrase("");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4" />
        <h3 className="font-serif text-lg">AI HITL Verification Audit Trail</h3>
      </div>
      <p className="text-[11px] text-muted-foreground">
        AI assists review only. AI never verifies, scores, certifies, or creates official findings alone.
        If AI was used, marking evidence verified requires cross-checking the raw source AND entering the exact confirmation phrase.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={task} onValueChange={(v) => setTask(v as HitlAiTaskType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{HITL_AI_TASK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={aiUsed} onCheckedChange={(v) => setAiUsed(!!v)} />
          AI assistance was used
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={crossCheck} onCheckedChange={(v) => setCrossCheck(!!v)} />
          Raw source was cross-checked
        </label>
        <Input
          className="sm:col-span-2"
          placeholder={`Type exactly: ${HITL_CONFIRMATION_TEXT}`}
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
        />
      </div>
      <Button size="sm" onClick={handleSave} disabled={busy}>Record HITL audit</Button>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No HITL audits yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{r.ai_task_type}</Badge>
            <span>ai_used: {String(r.ai_assistance_used)}</span>
            <span>cross_checked: {String(r.raw_document_cross_checked)}</span>
            <Badge variant="outline" className={r.may_mark_verified ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}>
              may_mark_verified: {String(r.may_mark_verified)}
            </Badge>
            <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AiHitlAuditPanel;