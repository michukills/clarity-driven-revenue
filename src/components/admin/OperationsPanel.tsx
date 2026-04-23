/* P11.9 — Operations module admin panel.
 *
 * Surfaces SOP inventory, bottleneck taxonomy, capacity, and owner
 * dependence for a single customer. Admin-first; clients only inherit
 * read access via RLS.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  buildOperationsRollup,
  upsertSop,
  deleteSop,
  upsertBottleneck,
  deleteBottleneck,
  upsertCapacitySnapshot,
  deleteCapacitySnapshot,
  upsertOwnerDependence,
  deleteOwnerDependence,
  type OperationsRollup,
  type OperationalSop,
  type OperationalBottleneck,
  type OperationalCapacitySnapshot,
  type OwnerDependenceItem,
  type SopStatus,
  type SopDocumentedLevel,
  type BottleneckType,
  type BottleneckSeverity,
  type BottleneckFrequency,
  type BottleneckStatus,
  type DelegationStatus,
  type ReplacementReady,
  type RiskLevel,
} from "@/lib/operations/operations";
import { emitOperationsSignals } from "@/lib/diagnostics/operationsSignalEmitter";
import { Trash2, Plus, Sparkles } from "lucide-react";

const SOP_STATUS: SopStatus[] = ["not_started", "draft", "documented", "active", "needs_review"];
const SOP_DOC: SopDocumentedLevel[] = ["none", "partial", "usable", "fully_systemized"];
const BN_TYPES: BottleneckType[] = [
  "handoff_failure", "follow_up_gap", "capacity_limit", "approval_delay",
  "owner_dependency", "tooling_gap", "process_unclear", "reporting_gap",
  "scheduling_breakdown", "other",
];
const BN_SEV: BottleneckSeverity[] = ["low", "medium", "high"];
const BN_FREQ: BottleneckFrequency[] = ["one_time", "occasional", "recurring", "constant"];
const BN_STATUS: BottleneckStatus[] = ["open", "monitoring", "resolved", "archived"];
const DELEG: DelegationStatus[] = ["owner_only", "training", "partially_delegated", "delegated"];
const REPLACE: ReplacementReady[] = ["no", "partial", "yes"];
const RISK: RiskLevel[] = ["low", "medium", "high"];

function pretty(s: string) {
  return s.replace(/_/g, " ");
}
function pct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}
function loadTone(r: number | null): string {
  if (r == null) return "text-muted-foreground";
  if (r > 1) return "text-rose-400";
  if (r > 0.85) return "text-amber-300";
  return "text-emerald-400";
}

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-light text-foreground">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function SelectCell<T extends string>({ value, options, onChange }: {
  value: T; options: readonly T[]; onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="bg-muted/30 border border-border rounded px-2 py-1 text-xs text-foreground"
    >
      {options.map((o) => <option key={o} value={o}>{pretty(o)}</option>)}
    </select>
  );
}

export function OperationsPanel({ customerId }: { customerId: string }) {
  const [rollup, setRollup] = useState<OperationsRollup | null>(null);
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const r = await buildOperationsRollup(customerId);
      setRollup(r);
    } catch (e) {
      toast.error("Failed to load operations");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [customerId]);

  async function emitSignals() {
    setEmitting(true);
    try {
      const { emitted } = await emitOperationsSignals({ customerId });
      toast.success(emitted > 0 ? `${emitted} operations signal(s) recorded` : "No new signals to emit");
    } catch {
      toast.error("Failed to emit signals");
    } finally {
      setEmitting(false);
    }
  }

  if (loading || !rollup) {
    return <div className="text-sm text-muted-foreground">Loading operations…</div>;
  }

  const r = rollup;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg text-foreground">Operations</h2>
          <p className="text-xs text-muted-foreground">SOP inventory, bottlenecks, capacity, and owner dependence.</p>
        </div>
        <Button size="sm" variant="outline" onClick={emitSignals} disabled={emitting} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Emit signals
        </Button>
      </div>

      {/* Headlines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Undocumented SOPs" value={r.undocumented_sops} hint={`${r.needs_review_sops} need review`} />
        <Tile label="Open high-severity" value={r.open_high_severity} hint={`${r.recurring_or_constant_open} recurring`} />
        <Tile label="Owner-only blockers" value={r.owner_only_open} hint={`${r.high_risk_owner_items} high-risk dependence`} />
        <Tile
          label="Delivery load"
          value={<span className={loadTone(r.derived.delivery_load_ratio)}>{pct(r.derived.delivery_load_ratio)}</span>}
          hint={r.derived.over_capacity ? "Over capacity" : "Within capacity"}
        />
      </div>

      {/* SOPs */}
      <Section
        title="SOP inventory"
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
            try {
              await upsertSop({ customer_id: customerId, title: "New SOP" });
              await refresh();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}>
            <Plus className="h-3.5 w-3.5" /> Add SOP
          </Button>
        }
      >
        {r.sops.length === 0 ? (
          <p className="text-xs text-muted-foreground">No SOPs recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Owner role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documented</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.sops.map((s) => (
                <SopRow key={s.id} row={s} onChanged={refresh} />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Bottlenecks */}
      <Section
        title="Bottleneck tracker"
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
            try {
              const today = new Date().toISOString().slice(0, 10);
              await upsertBottleneck({
                customer_id: customerId, title: "New bottleneck",
                first_observed_at: today, last_observed_at: today,
              });
              await refresh();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}>
            <Plus className="h-3.5 w-3.5" /> Add bottleneck
          </Button>
        }
      >
        {r.bottlenecks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bottlenecks recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Owner only</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.bottlenecks.map((b) => (
                <BottleneckRow key={b.id} row={b} onChanged={refresh} />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Capacity */}
      <Section
        title="Capacity"
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
            try {
              await upsertCapacitySnapshot({
                customer_id: customerId,
                snapshot_date: new Date().toISOString().slice(0, 10),
              });
              await refresh();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}>
            <Plus className="h-3.5 w-3.5" /> Add snapshot
          </Button>
        }
      >
        {r.capacity_latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <Tile label="Owner load" value={<span className={loadTone(r.derived.owner_load_ratio)}>{pct(r.derived.owner_load_ratio)}</span>} hint={`${r.capacity_latest.owner_hours_per_week ?? "—"} hrs/wk`} />
            <Tile label="Delivery" value={<span className={loadTone(r.derived.delivery_load_ratio)}>{pct(r.derived.delivery_load_ratio)}</span>} />
            <Tile label="Admin" value={<span className={loadTone(r.derived.admin_load_ratio)}>{pct(r.derived.admin_load_ratio)}</span>} />
            <Tile label="Sales" value={<span className={loadTone(r.derived.sales_load_ratio)}>{pct(r.derived.sales_load_ratio)}</span>} />
          </div>
        )}
        {r.capacity_history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No capacity snapshots yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Owner hrs/wk</TableHead>
                <TableHead>Delivery (avail/comm)</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.capacity_history.map((s) => (
                <CapacityRow key={s.id} row={s} onChanged={refresh} />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>

      {/* Owner dependence */}
      <Section
        title="Owner dependence map"
        action={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
            try {
              await upsertOwnerDependence({
                customer_id: customerId, task_name: "New owner-only task",
              });
              await refresh();
            } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}>
            <Plus className="h-3.5 w-3.5" /> Add task
          </Button>
        }
      >
        {r.owner_items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No owner-only tasks recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Delegation</TableHead>
                <TableHead>Replacement</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.owner_items.map((i) => (
                <OwnerRow key={i.id} row={i} onChanged={refresh} />
              ))}
            </TableBody>
          </Table>
        )}
      </Section>
    </div>
  );
}

/* ---------- Row editors ---------- */

function SopRow({ row, onChanged }: { row: OperationalSop; onChanged: () => void }) {
  async function patch(p: Partial<OperationalSop>) {
    try { await upsertSop({ ...row, ...p }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <TableRow>
      <TableCell><Input defaultValue={row.title} onBlur={(e) => patch({ title: e.target.value })} className="h-8 text-xs" /></TableCell>
      <TableCell><Input defaultValue={row.category ?? ""} onBlur={(e) => patch({ category: e.target.value || null })} className="h-8 text-xs" /></TableCell>
      <TableCell><Input defaultValue={row.owner_role ?? ""} onBlur={(e) => patch({ owner_role: e.target.value || null })} className="h-8 text-xs" /></TableCell>
      <TableCell><SelectCell value={row.status} options={SOP_STATUS} onChange={(v) => patch({ status: v })} /></TableCell>
      <TableCell><SelectCell value={row.documented_level} options={SOP_DOC} onChange={(v) => patch({ documented_level: v })} /></TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={async () => {
          try { await deleteSop(row.id); onChanged(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}

function BottleneckRow({ row, onChanged }: { row: OperationalBottleneck; onChanged: () => void }) {
  async function patch(p: Partial<OperationalBottleneck>) {
    try { await upsertBottleneck({ ...row, ...p }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <TableRow>
      <TableCell><Input defaultValue={row.title} onBlur={(e) => patch({ title: e.target.value })} className="h-8 text-xs" /></TableCell>
      <TableCell><SelectCell value={row.bottleneck_type} options={BN_TYPES} onChange={(v) => patch({ bottleneck_type: v })} /></TableCell>
      <TableCell><SelectCell value={row.severity} options={BN_SEV} onChange={(v) => patch({ severity: v })} /></TableCell>
      <TableCell><SelectCell value={row.frequency} options={BN_FREQ} onChange={(v) => patch({ frequency: v })} /></TableCell>
      <TableCell>
        <input type="checkbox" checked={row.owner_only} onChange={(e) => patch({ owner_only: e.target.checked })} />
      </TableCell>
      <TableCell><SelectCell value={row.status} options={BN_STATUS} onChange={(v) => patch({ status: v })} /></TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={async () => {
          try { await deleteBottleneck(row.id); onChanged(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}

function NumCell({ value, onChange }: { value: number | null; onChange: (n: number | null) => void }) {
  return (
    <Input
      type="number"
      defaultValue={value ?? ""}
      onBlur={(e) => {
        const v = e.target.value === "" ? null : Number(e.target.value);
        onChange(Number.isFinite(v as number) ? (v as number) : null);
      }}
      className="h-8 text-xs w-20"
    />
  );
}

function CapacityRow({ row, onChanged }: { row: OperationalCapacitySnapshot; onChanged: () => void }) {
  async function patch(p: Partial<OperationalCapacitySnapshot>) {
    try { await upsertCapacitySnapshot({ ...row, ...p }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <TableRow>
      <TableCell>
        <Input type="date" defaultValue={row.snapshot_date} onBlur={(e) => patch({ snapshot_date: e.target.value })} className="h-8 text-xs w-36" />
      </TableCell>
      <TableCell><NumCell value={row.team_size} onChange={(v) => patch({ team_size: v })} /></TableCell>
      <TableCell><NumCell value={row.owner_hours_per_week} onChange={(v) => patch({ owner_hours_per_week: v })} /></TableCell>
      <TableCell className="flex items-center gap-1">
        <NumCell value={row.delivery_hours_available} onChange={(v) => patch({ delivery_hours_available: v })} />
        <span className="text-muted-foreground">/</span>
        <NumCell value={row.delivery_hours_committed} onChange={(v) => patch({ delivery_hours_committed: v })} />
      </TableCell>
      <TableCell className="flex items-center gap-1">
        <NumCell value={row.admin_hours_available} onChange={(v) => patch({ admin_hours_available: v })} />
        <span className="text-muted-foreground">/</span>
        <NumCell value={row.admin_hours_committed} onChange={(v) => patch({ admin_hours_committed: v })} />
      </TableCell>
      <TableCell className="flex items-center gap-1">
        <NumCell value={row.sales_hours_available} onChange={(v) => patch({ sales_hours_available: v })} />
        <span className="text-muted-foreground">/</span>
        <NumCell value={row.sales_hours_committed} onChange={(v) => patch({ sales_hours_committed: v })} />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={async () => {
          try { await deleteCapacitySnapshot(row.id); onChanged(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}

function OwnerRow({ row, onChanged }: { row: OwnerDependenceItem; onChanged: () => void }) {
  async function patch(p: Partial<OwnerDependenceItem>) {
    try { await upsertOwnerDependence({ ...row, ...p }); onChanged(); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  return (
    <TableRow>
      <TableCell><Input defaultValue={row.task_name} onBlur={(e) => patch({ task_name: e.target.value })} className="h-8 text-xs" /></TableCell>
      <TableCell><Input defaultValue={row.function_area ?? ""} onBlur={(e) => patch({ function_area: e.target.value || null })} className="h-8 text-xs" /></TableCell>
      <TableCell><SelectCell value={row.delegation_status} options={DELEG} onChange={(v) => patch({ delegation_status: v })} /></TableCell>
      <TableCell><SelectCell value={row.replacement_ready} options={REPLACE} onChange={(v) => patch({ replacement_ready: v })} /></TableCell>
      <TableCell><SelectCell value={row.risk_level} options={RISK} onChange={(v) => patch({ risk_level: v })} /></TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={async () => {
          try { await deleteOwnerDependence(row.id); onChanged(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}