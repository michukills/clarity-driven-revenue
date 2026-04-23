/* P11.2 — Cash Position + Obligations admin panel.
 *
 * Admin-only operational surface for the Customer Detail → Stability tab.
 * Two halves:
 *   1. Cash Position — latest snapshot + new snapshot form.
 *   2. Obligations Register — add/edit/delete obligations with derived
 *      runway / cash pressure summary metrics.
 *
 * Emits cash position signals after material changes.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCcw, Wallet, AlertTriangle } from "lucide-react";
import {
  createObligation,
  deleteObligation,
  latestCashSnapshot,
  listObligations,
  OBLIGATION_TYPE_LABEL,
  summarizeCashPressure,
  updateObligation,
  upsertCashSnapshot,
  type CashPositionSnapshot,
  type FinancialObligation,
  type ObligationPriority,
  type ObligationStatus,
  type ObligationType,
} from "@/lib/bcc/cashPosition";
import { emitCashPositionSignals } from "@/lib/diagnostics/cashPositionSignalEmitter";

interface Props {
  customerId: string;
}

const TYPE_OPTIONS: ObligationType[] = [
  "vendor_payable",
  "payroll",
  "tax",
  "debt",
  "rent",
  "insurance",
  "software",
  "owner_draw",
  "other",
];
const STATUS_OPTIONS: ObligationStatus[] = [
  "open",
  "paid",
  "overdue",
  "deferred",
  "canceled",
];
const PRIORITY_OPTIONS: ObligationPriority[] = ["high", "medium", "low"];

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${Math.round(n).toLocaleString()}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusClass(status: ObligationStatus, dueDate: string) {
  if (status === "paid")
    return "border-emerald-500/30 text-emerald-300 bg-emerald-500/5";
  if (status === "canceled" || status === "deferred")
    return "border-border text-muted-foreground bg-muted/10";
  const overdue =
    status === "overdue" ||
    new Date(dueDate).getTime() < new Date(todayIso()).getTime();
  if (overdue) return "border-rose-500/40 text-rose-300 bg-rose-500/5";
  return "border-amber-500/30 text-amber-300 bg-amber-500/5";
}

function priorityClass(p: ObligationPriority) {
  return p === "high"
    ? "border-rose-500/30 text-rose-300"
    : p === "medium"
      ? "border-amber-500/30 text-amber-300"
      : "border-border text-muted-foreground";
}

function dueBadge(dueDate: string, status: ObligationStatus) {
  if (status === "paid" || status === "canceled") return null;
  const today = new Date(todayIso()).getTime();
  const diff = Math.floor(
    (new Date(dueDate).getTime() - today) / (24 * 60 * 60 * 1000),
  );
  if (diff < 0) return <span className="text-rose-300">Overdue {Math.abs(diff)}d</span>;
  if (diff === 0) return <span className="text-amber-300">Due today</span>;
  if (diff <= 7) return <span className="text-amber-300">In {diff}d</span>;
  if (diff <= 30) return <span className="text-muted-foreground">In {diff}d</span>;
  return <span className="text-muted-foreground/70">In {diff}d</span>;
}

export function CashPositionObligationsPanel({ customerId }: Props) {
  const [loading, setLoading] = useState(false);
  const [snap, setSnap] = useState<CashPositionSnapshot | null>(null);
  const [obs, setObs] = useState<FinancialObligation[]>([]);

  // Cash snapshot draft
  const [snapDate, setSnapDate] = useState(todayIso());
  const [cash, setCash] = useState<string>("");
  const [available, setAvailable] = useState<string>("");
  const [restricted, setRestricted] = useState<string>("");
  const [snapNotes, setSnapNotes] = useState("");
  const [snapSaving, setSnapSaving] = useState(false);

  // New obligation form
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({
    obligation_type: "vendor_payable" as ObligationType,
    label: "",
    vendor_or_payee: "",
    amount_due: "",
    due_date: todayIso(),
    status: "open" as ObligationStatus,
    priority: "medium" as ObligationPriority,
    recurring: false,
    recurrence_label: "",
    notes: "",
  });
  const [adding, setAdding] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        latestCashSnapshot(customerId),
        listObligations(customerId),
      ]);
      setSnap(s);
      setObs(o);
      if (s) {
        setCash(String(s.cash_on_hand ?? ""));
        setAvailable(s.available_cash !== null ? String(s.available_cash) : "");
        setRestricted(
          s.restricted_cash !== null ? String(s.restricted_cash) : "",
        );
      }
    } catch (e) {
      toast.error((e as Error).message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const summary = useMemo(
    () => summarizeCashPressure({ snapshot: snap, obligations: obs }),
    [snap, obs],
  );

  async function handleSaveSnapshot() {
    const cashNum = Number(cash);
    if (Number.isNaN(cashNum)) {
      toast.error("Cash on hand must be a number");
      return;
    }
    setSnapSaving(true);
    try {
      await upsertCashSnapshot({
        customer_id: customerId,
        snapshot_date: snapDate,
        cash_on_hand: cashNum,
        available_cash: available === "" ? null : Number(available),
        restricted_cash: restricted === "" ? null : Number(restricted),
        notes: snapNotes || null,
      });
      toast.success("Cash snapshot saved");
      setSnapNotes("");
      await reload();
      void emitCashPositionSignals({ customerId });
    } catch (e) {
      toast.error((e as Error).message || "Save failed");
    } finally {
      setSnapSaving(false);
    }
  }

  async function handleAddObligation() {
    if (!draft.label || !draft.due_date) {
      toast.error("Label and due date are required");
      return;
    }
    const amt = Number(draft.amount_due);
    if (Number.isNaN(amt)) {
      toast.error("Amount must be a number");
      return;
    }
    setAdding(true);
    try {
      await createObligation({
        customer_id: customerId,
        obligation_type: draft.obligation_type,
        label: draft.label,
        vendor_or_payee: draft.vendor_or_payee || null,
        amount_due: amt,
        due_date: draft.due_date,
        status: draft.status,
        priority: draft.priority,
        recurring: draft.recurring,
        recurrence_label: draft.recurrence_label || null,
        notes: draft.notes || null,
      });
      toast.success("Obligation added");
      setShowAdd(false);
      setDraft({
        obligation_type: "vendor_payable",
        label: "",
        vendor_or_payee: "",
        amount_due: "",
        due_date: todayIso(),
        status: "open",
        priority: "medium",
        recurring: false,
        recurrence_label: "",
        notes: "",
      });
      await reload();
      void emitCashPositionSignals({ customerId });
    } catch (e) {
      toast.error((e as Error).message || "Add failed");
    } finally {
      setAdding(false);
    }
  }

  async function handleStatusChange(id: string, status: ObligationStatus) {
    try {
      await updateObligation(id, { status });
      await reload();
      void emitCashPositionSignals({ customerId });
    } catch (e) {
      toast.error((e as Error).message || "Update failed");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this obligation?")) return;
    try {
      await deleteObligation(id);
      await reload();
    } catch (e) {
      toast.error((e as Error).message || "Delete failed");
    }
  }

  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm text-foreground font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" /> Cash Position & Obligations
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Structured source of truth for cash on hand and upcoming obligations.
            Drives cash-pressure signals to the Insight Engine. Admin only.
          </p>
        </div>
        <button
          onClick={reload}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCcw className="h-3 w-3" /> Refresh
        </button>
      </header>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Cash on hand" value={money(summary.cashOnHand)} />
        <Stat
          label="Overdue"
          value={`${money(summary.overdueTotal)}${summary.overdueCount ? ` · ${summary.overdueCount}` : ""}`}
          tone={summary.overdueCount > 0 ? "critical" : undefined}
        />
        <Stat
          label="Due in 7 days"
          value={`${money(summary.dueIn7Total)}${summary.dueIn7Count ? ` · ${summary.dueIn7Count}` : ""}`}
          tone={summary.dueIn7Count > 0 ? "watch" : undefined}
        />
        <Stat
          label="Due in 30 days"
          value={`${money(summary.dueIn30Total)}${summary.dueIn30Count ? ` · ${summary.dueIn30Count}` : ""}`}
        />
        <Stat
          label="Runway (months)"
          value={
            summary.runwayMonths !== null
              ? summary.runwayMonths.toFixed(1)
              : "—"
          }
        />
      </div>
      {summary.runwayMonths === null && (
        <p className="text-[11px] text-muted-foreground -mt-2">
          Runway estimate unavailable — more cash position / outflow data needed.
        </p>
      )}

      {/* Cash Position */}
      <div className="rounded-lg border border-border bg-muted/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
            Cash Position Snapshot
          </h4>
          {snap && (
            <span className="text-[11px] text-muted-foreground">
              Last recorded {snap.snapshot_date}
              {snap.source ? ` · ${snap.source}` : ""}
              {snap.source_ref ? ` · ${snap.source_ref}` : ""}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Field label="Date">
            <input
              type="date"
              value={snapDate}
              onChange={(e) => setSnapDate(e.target.value)}
              className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
            />
          </Field>
          <Field label="Cash on hand">
            <input
              value={cash}
              onChange={(e) => setCash(e.target.value)}
              placeholder="0"
              className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
            />
          </Field>
          <Field label="Available">
            <input
              value={available}
              onChange={(e) => setAvailable(e.target.value)}
              placeholder="optional"
              className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
            />
          </Field>
          <Field label="Restricted">
            <input
              value={restricted}
              onChange={(e) => setRestricted(e.target.value)}
              placeholder="optional"
              className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
            />
          </Field>
          <Field label="Notes">
            <input
              value={snapNotes}
              onChange={(e) => setSnapNotes(e.target.value)}
              placeholder="optional"
              className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
            />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSaveSnapshot}
            disabled={snapSaving}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary/15 border border-primary/40 text-xs text-foreground hover:bg-primary/20 disabled:opacity-50"
          >
            {snapSaving ? "Saving…" : "Save snapshot"}
          </button>
        </div>
      </div>

      {/* Obligations */}
      <div className="rounded-lg border border-border bg-muted/10 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground">
              Obligations Register
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Vendors, payroll, tax, debt, rent, insurance, software, owner draw.
            </p>
          </div>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <Plus className="h-3 w-3" /> {showAdd ? "Close" : "Add obligation"}
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-2 rounded-md border border-border bg-background/40 p-3">
            <Field label="Type">
              <select
                value={draft.obligation_type}
                onChange={(e) =>
                  setDraft({ ...draft, obligation_type: e.target.value as ObligationType })
                }
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{OBLIGATION_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>
            <Field label="Label">
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="e.g. Q2 estimated tax"
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              />
            </Field>
            <Field label="Vendor / payee">
              <input
                value={draft.vendor_or_payee}
                onChange={(e) => setDraft({ ...draft, vendor_or_payee: e.target.value })}
                placeholder="optional"
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              />
            </Field>
            <Field label="Amount">
              <input
                value={draft.amount_due}
                onChange={(e) => setDraft({ ...draft, amount_due: e.target.value })}
                placeholder="0"
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={draft.due_date}
                onChange={(e) => setDraft({ ...draft, due_date: e.target.value })}
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              />
            </Field>
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as ObligationStatus })
                }
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={draft.priority}
                onChange={(e) =>
                  setDraft({ ...draft, priority: e.target.value as ObligationPriority })
                }
                className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Recurring">
              <div className="flex items-center gap-2 h-8">
                <input
                  type="checkbox"
                  checked={draft.recurring}
                  onChange={(e) => setDraft({ ...draft, recurring: e.target.checked })}
                />
                <input
                  value={draft.recurrence_label}
                  onChange={(e) =>
                    setDraft({ ...draft, recurrence_label: e.target.value })
                  }
                  placeholder="e.g. monthly"
                  className="w-full bg-background border border-border rounded px-2 h-8 text-xs"
                  disabled={!draft.recurring}
                />
              </div>
            </Field>
            <div className="md:col-span-4 flex justify-end">
              <button
                onClick={handleAddObligation}
                disabled={adding}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary/15 border border-primary/40 text-xs text-foreground hover:bg-primary/20 disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Loading…</div>
        ) : obs.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border rounded-md">
            No obligations recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2 pr-2">Due</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Label</th>
                  <th className="py-2 pr-2">Vendor</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Priority</th>
                  <th className="py-2 pr-2"></th>
                </tr>
              </thead>
              <tbody>
                {obs.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-border/40 hover:bg-muted/10"
                  >
                    <td className="py-2 pr-2 text-muted-foreground tabular-nums">
                      <div>{o.due_date}</div>
                      <div className="text-[10px]">{dueBadge(o.due_date, o.status)}</div>
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {OBLIGATION_TYPE_LABEL[o.obligation_type]}
                      {o.recurring && (
                        <span className="ml-1 text-[10px] text-muted-foreground/70">
                          ({o.recurrence_label || "recurring"})
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-foreground">{o.label}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {o.vendor_or_payee || "—"}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                      {money(o.amount_due)}
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={o.status}
                        onChange={(e) =>
                          handleStatusChange(o.id, e.target.value as ObligationStatus)
                        }
                        className={`bg-transparent border rounded px-1.5 py-0.5 text-[11px] ${statusClass(
                          o.status,
                          o.due_date,
                        )}`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s} className="bg-background text-foreground">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={`inline-block border rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${priorityClass(o.priority)}`}
                      >
                        {o.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-right">
                      <button
                        onClick={() => handleDelete(o.id)}
                        className="text-muted-foreground hover:text-rose-300"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {summary.overdueCount > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {summary.overdueCount} overdue obligation
            {summary.overdueCount === 1 ? "" : "s"} totaling{" "}
            {money(summary.overdueTotal)}. Resolve or defer to clear the cash-pressure signal.
          </span>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "watch" | "critical";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "watch"
        ? "text-amber-300"
        : tone === "critical"
          ? "text-rose-300"
          : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-base font-light tabular-nums ${toneCls}`}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}