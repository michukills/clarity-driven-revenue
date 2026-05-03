// P41 — Admin override panel for personalized diagnostic tool sequence.
import { useEffect, useState } from "react";
import { Loader2, ArrowUp, ArrowDown, Save, RotateCcw, Unlock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadToolSequence, setSequenceOverride, type DiagnosticToolSequenceRow } from "@/lib/diagnostics/toolSequence";
import { toast } from "sonner";

export function DiagnosticSequenceAdminPanel({ customerId }: { customerId: string }) {
  const [row, setRow] = useState<DiagnosticToolSequenceRow | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [forceUnlocked, setForceUnlocked] = useState(false);
  const [toolNames, setToolNames] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    const [seq, cust, cat] = await Promise.all([
      loadToolSequence(customerId).catch(() => null),
      supabase.from("customers").select("owner_interview_completed_at, diagnostic_tools_force_unlocked").eq("id", customerId).maybeSingle(),
      supabase.from("tool_catalog").select("tool_key, name").eq("tool_type", "diagnostic"),
    ]);
    setRow(seq);
    setOrder(seq?.admin_override_keys && seq.admin_override_keys.length > 0 ? seq.admin_override_keys : (seq?.ranked_tool_keys ?? []));
    setCompletedAt((cust.data as any)?.owner_interview_completed_at ?? null);
    setForceUnlocked(!!(cust.data as any)?.diagnostic_tools_force_unlocked);
    const m: Record<string, string> = {};
    (cat.data ?? []).forEach((t: any) => { m[t.tool_key] = t.name; });
    setToolNames(m);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [customerId]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await setSequenceOverride(customerId, order);
      toast.success("Diagnostic order updated");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onResetToAuto = async () => {
    setSaving(true);
    try {
      await setSequenceOverride(customerId, []);
      toast.success("Reverted to auto-generated order");
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Reset failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleForceUnlock = async () => {
    const next = !forceUnlocked;
    const { error } = await supabase
      .from("customers")
      .update({ diagnostic_tools_force_unlocked: next })
      .eq("id", customerId);
    if (error) { toast.error(error.message); return; }
    setForceUnlocked(next);
    toast.success(next ? "Diagnostic tools force-unlocked" : "Force-unlock removed");
  };

  if (loading) {
    return <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading sequence…</div>;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Diagnostic sequence</div>
          <h3 className="text-base text-foreground mt-1">Owner interview & recommended order</h3>
        </div>
        <Button size="sm" variant="outline" onClick={toggleForceUnlock}>
          {forceUnlocked ? <><Lock className="h-3 w-3 mr-1" /> Re-lock diagnostic tools</> : <><Unlock className="h-3 w-3 mr-1" /> Force-unlock diagnostic tools</>}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Owner Diagnostic Interview: {completedAt ? <span className="text-foreground">completed {new Date(completedAt).toLocaleDateString()}</span> : <span className="text-muted-foreground">not completed yet</span>}.
        {" "}Force-unlock bypasses the gate without modifying the interview record.
      </p>
      {!row && order.length === 0 ? (
        <p className="text-xs text-muted-foreground">No sequence yet. The recommended order is generated when the client completes the Owner Diagnostic Interview.</p>
      ) : (
        <>
          <ol className="space-y-2 mb-4">
            {order.map((k, i) => (
              <li key={k} className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2">
                <span className="text-[11px] text-muted-foreground w-6">#{i + 1}</span>
                <span className="flex-1 text-sm text-foreground">{toolNames[k] ?? k}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Button size="sm" onClick={onSave} disabled={saving}><Save className="h-3 w-3 mr-1" /> Save order</Button>
            {row?.admin_override_keys && row.admin_override_keys.length > 0 && (
              <Button size="sm" variant="outline" onClick={onResetToAuto} disabled={saving}><RotateCcw className="h-3 w-3 mr-1" /> Reset to auto</Button>
            )}
          </div>
          {row?.admin_override_at && (
            <p className="text-[11px] text-muted-foreground mt-2">Last admin override: {new Date(row.admin_override_at).toLocaleString()}.</p>
          )}
        </>
      )}
    </div>
  );
}

export default DiagnosticSequenceAdminPanel;