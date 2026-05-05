/**
 * P72 — Admin panel for the Cost of Friction Calculator™.
 *
 * Lets admins create, edit, save, approve, archive, and link customer
 * friction estimates. Admin-only fields (notes, approval flags) never
 * surface in client view.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  COST_OF_FRICTION_NAME,
  COST_OF_FRICTION_TONE_REMINDER,
  DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  findCostOfFrictionForbiddenPhrase,
  type CostOfFrictionAssumptions,
  type CostOfFrictionInputs,
} from "@/config/costOfFriction";
import {
  adminListCostOfFrictionRuns,
  deleteCostOfFrictionRun,
  upsertCostOfFrictionRun,
  type CostOfFrictionRunRow,
  type CostOfFrictionStatus,
} from "@/lib/costOfFriction/costOfFriction";
import CostOfFrictionCalculator from "@/components/costOfFriction/CostOfFrictionCalculator";

interface Props {
  customerId: string;
}

export default function CostOfFrictionPanel({ customerId }: Props) {
  const [rows, setRows] = useState<CostOfFrictionRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runName, setRunName] = useState("Cost of Friction estimate");
  const [status, setStatus] = useState<CostOfFrictionStatus>("draft");
  const [inputs, setInputs] = useState<CostOfFrictionInputs>({});
  const [assumptions, setAssumptions] = useState<CostOfFrictionAssumptions>(
    DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
  );
  const [adminNotes, setAdminNotes] = useState("");
  const [clientSafeSummary, setClientSafeSummary] = useState("");
  const [approved, setApproved] = useState(false);
  const [clientVisible, setClientVisible] = useState(false);
  const [includeInReport, setIncludeInReport] = useState(false);
  const [linkedRepairMapItemId, setLinkedRepairMapItemId] = useState("");
  const [linkedWornToothSignalId, setLinkedWornToothSignalId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListCostOfFrictionRuns(customerId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const reset = () => {
    setEditingId(null);
    setRunName("Cost of Friction estimate");
    setStatus("draft");
    setInputs({});
    setAssumptions(DEFAULT_COST_OF_FRICTION_ASSUMPTIONS);
    setAdminNotes("");
    setClientSafeSummary("");
    setApproved(false);
    setClientVisible(false);
    setIncludeInReport(false);
    setLinkedRepairMapItemId("");
    setLinkedWornToothSignalId("");
  };

  const startEdit = (r: CostOfFrictionRunRow) => {
    setEditingId(r.id);
    setRunName(r.run_name);
    setStatus(r.status);
    setInputs((r.input_payload as CostOfFrictionInputs) ?? {});
    setAssumptions(
      (r.assumptions_payload as CostOfFrictionAssumptions) ??
        DEFAULT_COST_OF_FRICTION_ASSUMPTIONS,
    );
    setAdminNotes(r.admin_notes ?? "");
    setClientSafeSummary(r.client_safe_summary ?? "");
    setApproved(r.approved_for_client);
    setClientVisible(r.client_visible);
    setIncludeInReport(r.include_in_report);
    setLinkedRepairMapItemId(r.linked_repair_map_item_id ?? "");
    setLinkedWornToothSignalId(r.linked_worn_tooth_signal_id ?? "");
  };

  const onInputChange = (lineKey: string, fieldKey: string, value: number | undefined) => {
    setInputs((prev) => ({
      ...prev,
      [lineKey]: { ...(prev[lineKey] ?? {}), [fieldKey]: value },
    }));
  };

  const save = async () => {
    const bad = findCostOfFrictionForbiddenPhrase(clientSafeSummary);
    if (bad) {
      toast.error(`Forbidden client-facing phrase: "${bad}"`);
      return;
    }
    try {
      const saved = await upsertCostOfFrictionRun({
        id: editingId ?? undefined,
        customerId,
        runName,
        status,
        inputs,
        assumptions,
        adminNotes,
        clientSafeSummary: clientSafeSummary || null,
        approvedForClient: approved,
        clientVisible,
        includeInReport,
        linkedRepairMapItemId: linkedRepairMapItemId || null,
        linkedWornToothSignalId: linkedWornToothSignalId || null,
        createdByRole: "admin",
      });
      toast.success("Saved");
      setEditingId(saved.id);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this run?")) return;
    try {
      await deleteCostOfFrictionRun(id);
      if (editingId === id) reset();
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <header className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          {COST_OF_FRICTION_NAME} (admin)
        </h3>
        <Badge variant="outline" className="ml-2">Admin only</Badge>
      </header>
      <p className="text-[11px] text-muted-foreground">
        {COST_OF_FRICTION_TONE_REMINDER}
      </p>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={reset}>
          <Plus className="h-3 w-3" /> New run
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No runs yet.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`flex items-center justify-between gap-2 rounded-md border ${editingId === r.id ? "border-primary/50 bg-primary/10" : "border-border/60"} px-3 py-2`}
            >
              <button onClick={() => startEdit(r)} className="text-left flex-1">
                <div className="text-sm text-foreground">{r.run_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.status} · monthly ${Math.round(r.monthly_total).toLocaleString()} ·{" "}
                  {r.approved_for_client ? "approved" : "not approved"}
                </div>
              </button>
              <button
                onClick={() => remove(r.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <label className="text-[11px] text-muted-foreground">
          Run name
          <Input
            value={runName}
            onChange={(e) => setRunName(e.target.value)}
            className="mt-1 h-9 bg-muted/40"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CostOfFrictionStatus)}
          className="bg-background border border-border rounded-md px-2 h-9 text-sm"
        >
          {(["draft","admin_review","approved","client_visible","archived"] as const).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g," ")}</option>
          ))}
        </select>
      </div>

      <CostOfFrictionCalculator
        inputs={inputs}
        assumptions={assumptions}
        onInputChange={onInputChange}
        onAssumptionsChange={setAssumptions}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-[11px] text-muted-foreground">
          Client-safe summary (shown in client view if approved)
          <Textarea
            value={clientSafeSummary}
            onChange={(e) => setClientSafeSummary(e.target.value)}
            placeholder="Plain-English summary of where friction may be costing the business."
            className="mt-1 bg-muted/40"
          />
        </label>
        <label className="text-[11px] text-muted-foreground">
          Admin-only notes (never shown to client)
          <Textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            className="mt-1 bg-muted/40"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          value={linkedRepairMapItemId}
          onChange={(e) => setLinkedRepairMapItemId(e.target.value)}
          placeholder="Linked Repair Map item ID (optional)"
          className="h-9 bg-muted/40"
        />
        <Input
          value={linkedWornToothSignalId}
          onChange={(e) => setLinkedWornToothSignalId(e.target.value)}
          placeholder="Linked Worn Tooth Signal ID (optional)"
          className="h-9 bg-muted/40"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
          Approved for client
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} />
          Client-visible
        </label>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={includeInReport} onChange={(e) => setIncludeInReport(e.target.checked)} />
          Include in report
        </label>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={save}>Save run</Button>
        {editingId && (
          <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
        )}
      </div>
    </section>
  );
}