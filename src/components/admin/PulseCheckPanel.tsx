/**
 * P86 — RGS Pulse Check (Friday 15) admin panel.
 * Admin-tracked weekly ritual — no calendar/email automation is wired.
 */
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  RGS_PULSE_CHECK_CHECKLIST,
  RGS_PULSE_CHECK_AUTOMATION_WIRED,
  RGS_PULSE_CHECK_MODE_LABEL,
  nextPulseCheckAt,
} from "@/config/rgsPulseCheck";
import {
  adminCreatePulseCheckRun,
  adminListPulseCheckRuns,
  adminCompletePulseCheckRun,
  type PulseCheckRunRow,
} from "@/lib/rgsPulseCheck";

export function PulseCheckPanel() {
  const [rows, setRows] = useState<PulseCheckRunRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeChecklist, setActiveChecklist] = useState<PulseCheckRunRow["checklist_json"]>([]);
  const [activeNotes, setActiveNotes] = useState("");

  const reload = async () => {
    try { setRows(await adminListPulseCheckRuns()); }
    catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { reload(); }, []);

  const next = nextPulseCheckAt();

  const schedule = async () => {
    setBusy(true);
    try {
      await adminCreatePulseCheckRun(next);
      toast.success("Pulse Check scheduled");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const startRun = (r: PulseCheckRunRow) => {
    setActiveId(r.id);
    setActiveChecklist(
      Array.isArray(r.checklist_json) && r.checklist_json.length > 0
        ? r.checklist_json
        : RGS_PULSE_CHECK_CHECKLIST.map((c) => ({ key: c.key, checked: false, note: "" })),
    );
    setActiveNotes(r.admin_notes ?? "");
  };

  const completeRun = async () => {
    if (!activeId) return;
    setBusy(true);
    try {
      await adminCompletePulseCheckRun(activeId, activeChecklist, activeNotes);
      toast.success("Pulse Check completed");
      setActiveId(null); setActiveChecklist([]); setActiveNotes("");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4" />
        <h3 className="font-serif text-lg">RGS Pulse Check (Friday 15)</h3>
      </div>
      <p className="text-[11px] text-muted-foreground italic">
        {RGS_PULSE_CHECK_MODE_LABEL}
        {!RGS_PULSE_CHECK_AUTOMATION_WIRED && " — no calendar automation is wired."}
      </p>
      <div className="text-xs">Next Pulse Check: <strong>{next.toLocaleString()}</strong></div>
      <Button size="sm" onClick={schedule} disabled={busy}>Schedule next run</Button>

      {activeId && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-background/40 p-3 text-xs">
          <div className="font-medium">Active checklist</div>
          {RGS_PULSE_CHECK_CHECKLIST.map((c) => {
            const item = activeChecklist.find((x) => x.key === c.key) ?? { key: c.key, checked: false, note: "" };
            return (
              <label key={c.key} className="flex items-start gap-2">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(v) => setActiveChecklist((prev) => {
                    const others = prev.filter((x) => x.key !== c.key);
                    return [...others, { ...item, checked: !!v }];
                  })}
                />
                <div>
                  <div className="text-foreground">{c.label}</div>
                  <div className="text-muted-foreground">{c.description}</div>
                </div>
              </label>
            );
          })}
          <Textarea value={activeNotes} onChange={(e) => setActiveNotes(e.target.value)} placeholder="Admin notes" />
          <div className="flex gap-2">
            <Button size="sm" onClick={completeRun} disabled={busy}>Mark completed</Button>
            <Button size="sm" variant="outline" onClick={() => setActiveId(null)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-xs text-muted-foreground">No Pulse Check runs yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{r.status}</Badge>
            <span>scheduled: {new Date(r.scheduled_for).toLocaleString()}</span>
            {r.completed_at && <span>completed: {new Date(r.completed_at).toLocaleString()}</span>}
            {r.status !== "completed" && (
              <Button size="sm" variant="outline" onClick={() => startRun(r)}>Run checklist</Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PulseCheckPanel;