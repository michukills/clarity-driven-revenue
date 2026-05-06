/**
 * P85.3 — Admin Forward Stability Flags™ panel.
 * Admin can review, approve for client visibility, or resolve/dismiss.
 */
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FORWARD_STABILITY_FLAGS,
  findForwardFlagForbiddenPhrase,
} from "@/config/forwardStabilityFlags";
import {
  listAdminForwardStabilityFlags,
  createForwardStabilityFlag,
  approveForwardFlagForClient,
  resolveForwardFlag,
  type AdminForwardStabilityFlagRow,
} from "@/lib/forwardStabilityFlags";

export function ForwardStabilityFlagsPanel({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<AdminForwardStabilityFlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState<string>("");
  const [newNote, setNewNote] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    try {
      setRows(await listAdminForwardStabilityFlags(customerId));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const open = useMemo(
    () => rows.filter((r) => r.status === "admin_review" || r.status === "active" || r.status === "client_visible"),
    [rows],
  );
  const closed = useMemo(
    () => rows.filter((r) => r.status === "resolved" || r.status === "dismissed"),
    [rows],
  );

  const createManual = async () => {
    if (!newKey) {
      toast.error("Pick a flag type.");
      return;
    }
    if (!newNote.trim()) {
      toast.error("Manual external-risk trigger requires an admin note / source description.");
      return;
    }
    try {
      await createForwardStabilityFlag({
        customer_id: customerId,
        flag_key: newKey,
        trigger_type: "manual_admin",
        admin_notes: newNote.trim(),
      });
      setNewKey(""); setNewNote("");
      toast.success("Forward Stability Flag created. Pending admin review.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create flag.");
    }
  };

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const explanation = (notes[id] ?? "").trim() || undefined;
      if (explanation && findForwardFlagForbiddenPhrase(explanation)) {
        toast.error("Client-safe explanation contains forbidden language.");
        setBusyId(null);
        return;
      }
      await approveForwardFlagForClient(id, explanation);
      toast.success("Approved for client visibility.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not approve.");
    } finally {
      setBusyId(null);
    }
  };

  const close = async (id: string, action: "resolved" | "dismissed") => {
    const note = (notes[id] ?? "").trim();
    if (!note) {
      toast.error("Resolution/dismissal note required.");
      return;
    }
    setBusyId(id);
    try {
      await resolveForwardFlag(id, note, action);
      toast.success(action === "resolved" ? "Resolved." : "Dismissed.");
      setNotes((n) => ({ ...n, [id]: "" }));
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-4"
      data-testid="forward-stability-flags-panel"
    >
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-foreground">Forward Stability Flags™</h3>
          <Badge variant="outline" className="text-[10px]">Admin only</Badge>
          <Badge variant="secondary" className="text-[10px]">P85.3</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <p className="text-[11px] text-muted-foreground">
        Forward-looking risks flagged for admin review. Operational review only — not legal,
        tax, accounting, compliance, valuation, lending, or investment claims. External-risk
        triggers below are admin-entered (manual). RGS does not claim live external-risk monitoring.
      </p>

      {/* Manual / external-risk trigger entry */}
      <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
        <div className="text-xs font-medium text-foreground">Add manual / external-risk trigger</div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={newKey} onValueChange={setNewKey}>
            <SelectTrigger className="sm:w-72"><SelectValue placeholder="Flag type" /></SelectTrigger>
            <SelectContent>
              {FORWARD_STABILITY_FLAGS.map((f) => (
                <SelectItem key={f.flag_key} value={f.flag_key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Admin note / source description (required)"
            className="min-h-[60px]"
          />
          <Button onClick={createManual} disabled={!newKey || !newNote.trim()}>
            Add
          </Button>
        </div>
      </div>

      {open.length === 0 && (
        <div className="text-xs text-muted-foreground">No open Forward Stability Flags.</div>
      )}

      <ul className="space-y-3">
        {open.map((r) => (
          <li key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">{r.flag_label}</span>
              <Badge variant="outline" className="text-[10px]">{r.severity}</Badge>
              <Badge variant="outline" className="text-[10px]">{r.gear_key.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px]">{r.trigger_type.replace(/_/g, " ")}</Badge>
              {r.needs_reinspection && (
                <Badge variant="outline" className="text-[10px]">Needs Re-Inspection</Badge>
              )}
              <Badge variant="outline" className="text-[10px]">{r.status.replace(/_/g, " ")}</Badge>
            </div>
            {r.trigger_value !== null && (
              <div className="text-[11px] text-muted-foreground">
                Trigger value: {r.trigger_value}
                {r.threshold_value !== null ? ` / threshold ${r.threshold_value}` : ""}
              </div>
            )}
            {r.client_safe_explanation && (
              <p className="text-xs text-foreground/90">{r.client_safe_explanation}</p>
            )}
            {r.admin_notes && (
              <p className="text-[11px] text-muted-foreground">
                <span className="text-amber-300">Admin note (not shown to client):</span> {r.admin_notes}
              </p>
            )}
            <Textarea
              value={notes[r.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
              placeholder={
                r.status === "client_visible"
                  ? "Resolution / dismissal note (required to close)"
                  : "Optional: client-safe explanation override; required note to resolve/dismiss"
              }
              className="min-h-[60px]"
            />
            <div className="flex flex-wrap gap-2">
              {r.status !== "client_visible" && (
                <Button size="sm" onClick={() => approve(r.id)} disabled={busyId === r.id}>
                  Approve for client
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => close(r.id, "resolved")} disabled={busyId === r.id}>
                Resolve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => close(r.id, "dismissed")} disabled={busyId === r.id}>
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {closed.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Closed ({closed.length})</summary>
          <ul className="mt-2 space-y-1">
            {closed.map((r) => (
              <li key={r.id}>
                <span className="text-foreground">{r.flag_label}</span> — {r.status}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default ForwardStabilityFlagsPanel;
