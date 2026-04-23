/* P11.3 — Admin Monthly Close panel.
 *
 * Shows current month + prior month status, allows open → ready → closed →
 * reopened transitions, and triggers canonical BCC signal emission on close.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarCheck, Lock, Unlock, RefreshCw, CheckCircle2 } from "lucide-react";
import {
  closeMonthAndEmitSignals,
  getOrCreateMonthlyClose,
  listMonthlyCloses,
  monthBounds,
  priorMonthBounds,
  setMonthlyCloseStatus,
  MONTHLY_CLOSE_STATUS_LABEL,
  type MonthlyCloseRow,
  type MonthlyCloseStatus,
} from "@/lib/bcc/monthlyClose";

const STATUS_TONE: Record<MonthlyCloseStatus, string> = {
  open: "bg-muted text-muted-foreground border-border",
  ready: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  closed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  reopened: "bg-orange-500/10 text-orange-600 border-orange-500/30",
};

export function MonthlyClosePanel({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<MonthlyCloseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingNotesFor, setEditingNotesFor] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const curr = monthBounds(today);
  const prev = priorMonthBounds(curr.start);

  const load = async () => {
    setLoading(true);
    try {
      // Ensure rows exist for the current and prior month so admins
      // always see them in the panel even before any explicit action.
      await getOrCreateMonthlyClose(customerId, curr.start, curr.end);
      await getOrCreateMonthlyClose(customerId, prev.start, prev.end);
      const list = await listMonthlyCloses(customerId, 12);
      setRows(list);
    } catch (e) {
      console.warn("[MonthlyClosePanel] load failed", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const setStatus = async (row: MonthlyCloseRow, status: MonthlyCloseStatus) => {
    setBusy(true);
    try {
      if (status === "closed") {
        const res = await closeMonthAndEmitSignals(
          row.customer_id,
          row.period_start,
          row.period_end,
          row.notes,
        );
        toast.success(
          res.emitted > 0
            ? `Month closed — ${res.emitted} signal${res.emitted === 1 ? "" : "s"} emitted`
            : "Month closed (no new signals)",
        );
      } else {
        await setMonthlyCloseStatus(row.id, status);
        toast.success(`Marked ${MONTHLY_CLOSE_STATUS_LABEL[status]}`);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async (row: MonthlyCloseRow) => {
    setBusy(true);
    try {
      await setMonthlyCloseStatus(row.id, row.status, notesDraft);
      toast.success("Notes saved");
      setEditingNotesFor(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Monthly Close</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Mark a financial period as reviewed and trusted. Closing emits canonical
            BCC signals into the learning layer.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground py-4">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4">No close history yet.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isCurrent =
              row.period_start === curr.start && row.period_end === curr.end;
            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {row.period_start} → {row.period_end}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {row.closed_at
                        ? `Last closed ${new Date(row.closed_at).toLocaleString()}`
                        : "Never closed"}
                      {row.last_signals_emitted_at && (
                        <span>
                          {" · "}Signals emitted {new Date(
                            row.last_signals_emitted_at,
                          ).toLocaleDateString()}{" "}
                          ({row.signals_emitted_count})
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_TONE[row.status]}`}
                  >
                    {MONTHLY_CLOSE_STATUS_LABEL[row.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {row.status !== "ready" && row.status !== "closed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => setStatus(row, "ready")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark Ready
                    </Button>
                  )}
                  {row.status !== "closed" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => setStatus(row, "closed")}
                      className="bg-primary hover:bg-secondary"
                    >
                      <Lock className="h-3.5 w-3.5" /> Close month
                    </Button>
                  )}
                  {row.status === "closed" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setStatus(row, "reopened")}
                      >
                        <Unlock className="h-3.5 w-3.5" /> Reopen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setStatus(row, "closed")}
                        title="Re-emit signals (deduped)"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Re-emit signals
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingNotesFor(row.id);
                      setNotesDraft(row.notes ?? "");
                    }}
                  >
                    {row.notes ? "Edit note" : "Add note"}
                  </Button>
                </div>

                {editingNotesFor === row.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Internal close note (admin only)…"
                      className="text-sm"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={busy} onClick={() => saveNotes(row)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNotesFor(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  row.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {row.notes}
                    </p>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
