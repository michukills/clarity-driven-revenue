import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListTrackerEntries, adminCreateTrackerEntry, adminUpdateTrackerEntry,
  adminArchiveTrackerEntry,
  type AdminToolTrainingTrackerEntry,
  ACCESS_SOURCE_ADMIN_LABEL, TRAINING_STATUS_LABEL, HANDOFF_STATUS_LABEL,
  ENTRY_STATUS_LABEL,
  type ToolTrainingAccessSource, type ToolTrainingAccessStatus,
  type ToolTrainingTrainingStatus, type ToolTrainingHandoffStatus,
  type ToolTrainingEntryStatus,
} from "@/lib/toolTrainingTracker";
import { getEffectiveToolsForCustomer, type EffectiveTool } from "@/lib/toolCatalog";
import { bulkCreateTrackerFromEffectiveTools, previewBulkTrackerFromEffectiveTools, type BulkTrackerPreviewItem } from "@/lib/implementationSeed";

const ACCESS_SOURCES: ToolTrainingAccessSource[] =
  ["stage_default","manual_grant","manual_revoke","admin_only","locked"];
const ACCESS_STATUSES: ToolTrainingAccessStatus[] =
  ["available","locked","revoked","hidden","admin_only"];
const TRAINING_STATUSES: ToolTrainingTrainingStatus[] =
  ["not_required","not_started","scheduled","in_progress","completed","needs_refresh","blocked"];
const HANDOFF_STATUSES: ToolTrainingHandoffStatus[] =
  ["not_started","in_progress","handed_off","needs_follow_up","not_applicable"];
const ENTRY_STATUSES: ToolTrainingEntryStatus[] =
  ["draft","ready_for_review","client_visible","active","needs_update","archived"];

export default function ToolAssignmentTrainingTrackerAdmin() {
  const { customerId = "" } = useParams();
  const [entries, setEntries] = useState<AdminToolTrainingTrackerEntry[]>([]);
  const [effective, setEffective] = useState<EffectiveTool[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pickToolKey, setPickToolKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [bulkPreview, setBulkPreview] = useState<BulkTrackerPreviewItem[] | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const [r, eff] = await Promise.all([
        adminListTrackerEntries(customerId),
        getEffectiveToolsForCustomer(customerId).catch(() => [] as EffectiveTool[]),
      ]);
      setEntries(r);
      setEffective(eff);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(
    () => entries.find((e) => e.id === activeId) ?? null,
    [entries, activeId],
  );

  const create = async () => {
    const key = pickToolKey.trim();
    if (!key) return;
    const eff = effective.find((e) => e.tool_key === key);
    const r = await adminCreateTrackerEntry(customerId, {
      tool_key: key,
      tool_name_snapshot: eff?.name ?? null,
      service_lane: (eff as any)?.service_lane ?? null,
      customer_journey_phase: (eff as any)?.customer_journey_phase ?? null,
      access_source: eff?.override_state === "granted" ? "manual_grant"
        : eff?.override_state === "revoked" ? "manual_revoke"
        : eff?.effective_enabled ? "stage_default" : "locked",
      access_status: eff?.effective_enabled ? "available" : "locked",
    });
    setPickToolKey("");
    setActiveId(r.id);
    await reload();
    toast.success("Tracker entry created (draft)");
  };

  const previewBulk = async () => {
    try { setBulkPreview(await previewBulkTrackerFromEffectiveTools(customerId)); }
    catch (e: any) { toast.error(e.message); }
  };
  const runBulk = async () => {
    setBulkBusy(true);
    try {
      const r = await bulkCreateTrackerFromEffectiveTools(customerId);
      toast.success(`Created ${r.created} tracker entr(ies); skipped ${r.skipped_duplicates} duplicate(s).`);
      setBulkPreview(null);
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBulkBusy(false); }
  };

  const patch = async (p: Partial<AdminToolTrainingTrackerEntry>) => {
    if (!active) return;
    setEntries(entries.map((e) => (e.id === active.id ? { ...e, ...p } : e)));
    try {
      await adminUpdateTrackerEntry(active.id, p);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleVisible = async () => {
    if (!active) return;
    await patch({ client_visible: !active.client_visible });
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this tracker entry? It will be hidden from clients.")) return;
    await adminArchiveTrackerEntry(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">
            Tool Assignment + Training Tracker (Admin)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Document which implementation tools are part of the client's stage-default access,
            track training status, who was trained, and handoff. Actual tool access is still
            governed by stage-based rules and the existing access panels — this tracker
            documents and explains it. Internal notes and drafts never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            Add tracker entry from this client's effective tools
          </div>
          <div className="flex gap-2">
            <select
              value={pickToolKey}
              onChange={(e) => setPickToolKey(e.target.value)}
              className="bg-background border border-border rounded-md px-2 text-sm h-9 flex-1"
            >
              <option value="">— pick a tool —</option>
              {effective.map((e) => (
                <option key={e.tool_id} value={e.tool_key}>
                  {e.name} {e.effective_enabled ? "" : "(locked)"} · {e.override_state}
                </option>
              ))}
            </select>
            <Button onClick={create} disabled={!pickToolKey}>Create entry</Button>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={previewBulk}>Preview bulk from assigned tools</Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={runBulk}>
              {bulkBusy ? "Creating…" : "Bulk-create from assigned tools"}
            </Button>
          </div>
          {bulkPreview ? (
            <div className="border border-border rounded-md p-3 text-xs space-y-1">
              <div className="text-muted-foreground">Bulk preview ({bulkPreview.length} candidate(s); duplicates skipped):</div>
              {bulkPreview.map((p) => (
                <div key={p.tool_key} className={p.duplicate ? "opacity-50" : ""}>
                  • {p.tool_name} {p.effective_enabled ? "" : "(locked)"}
                  {p.duplicate ? <span className="ml-1 text-muted-foreground">(duplicate)</span> : null}
                </div>
              ))}
            </div>
          ) : null}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracker entries yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-2">
              {entries.map((e) => (
                <button key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === e.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  {e.tool_name_snapshot || e.tool_key}
                  <span className="opacity-60"> · {e.training_status}</span>
                  {e.client_visible ? <span className="ml-1 text-primary">·visible</span> : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {active ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{ENTRY_STATUS_LABEL[active.status]}</Badge>
                <Badge variant="secondary">{ACCESS_SOURCE_ADMIN_LABEL[active.access_source]}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <select value={active.status}
                  onChange={(e) => patch({ status: e.target.value as ToolTrainingEntryStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9">
                  {ENTRY_STATUSES.map((s) => (
                    <option key={s} value={s}>{ENTRY_STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={toggleVisible}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input defaultValue={active.tool_name_snapshot ?? ""}
                placeholder="Tool name (snapshot)"
                onBlur={(e) => patch({ tool_name_snapshot: e.target.value })} />
              <Input defaultValue={active.tool_key}
                placeholder="tool_key" disabled />
              <select value={active.access_source}
                onChange={(e) => patch({ access_source: e.target.value as ToolTrainingAccessSource })}
                className="bg-background border border-border rounded-md px-2 text-sm h-9">
                {ACCESS_SOURCES.map((s) => (
                  <option key={s} value={s}>{ACCESS_SOURCE_ADMIN_LABEL[s]}</option>
                ))}
              </select>
              <select value={active.access_status}
                onChange={(e) => patch({ access_status: e.target.value as ToolTrainingAccessStatus })}
                className="bg-background border border-border rounded-md px-2 text-sm h-9">
                {ACCESS_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox"
                  defaultChecked={active.training_required}
                  onChange={(e) => patch({ training_required: e.target.checked })} />
                Training required
              </label>
              <select value={active.training_status}
                onChange={(e) => patch({ training_status: e.target.value as ToolTrainingTrainingStatus })}
                className="bg-background border border-border rounded-md px-2 text-sm h-9">
                {TRAINING_STATUSES.map((s) => (
                  <option key={s} value={s}>Training: {TRAINING_STATUS_LABEL[s]}</option>
                ))}
              </select>
              <select value={active.handoff_status}
                onChange={(e) => patch({ handoff_status: e.target.value as ToolTrainingHandoffStatus })}
                className="bg-background border border-border rounded-md px-2 text-sm h-9">
                {HANDOFF_STATUSES.map((s) => (
                  <option key={s} value={s}>Handoff: {HANDOFF_STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input defaultValue={active.trained_people ?? ""} placeholder="Trained people"
                onBlur={(e) => patch({ trained_people: e.target.value })} />
              <Input defaultValue={active.trained_roles ?? ""} placeholder="Trained roles"
                onBlur={(e) => patch({ trained_roles: e.target.value })} />
              <Input defaultValue={active.training_method ?? ""} placeholder="Training method"
                onBlur={(e) => patch({ training_method: e.target.value })} />
              <Input type="date" defaultValue={active.training_date ?? ""} placeholder="Training date"
                onBlur={(e) => patch({ training_date: e.target.value || null })} />
            </div>

            <Textarea defaultValue={active.next_training_step ?? ""}
              placeholder="Next training step"
              onBlur={(e) => patch({ next_training_step: e.target.value })} />
            <Textarea defaultValue={active.client_expectation ?? ""}
              placeholder="Client expectation (what the client/team should do with this tool)"
              onBlur={(e) => patch({ client_expectation: e.target.value })} />
            <Textarea defaultValue={active.rgs_support_scope ?? ""}
              placeholder="RGS support scope (what RGS will and will not do here)"
              onBlur={(e) => patch({ rgs_support_scope: e.target.value })} />
            <Textarea defaultValue={active.handoff_notes ?? ""}
              placeholder="Handoff notes (admin-only)"
              onBlur={(e) => patch({ handoff_notes: e.target.value })} />
            <Textarea defaultValue={active.client_summary ?? ""}
              placeholder="Client summary (client-facing)"
              onBlur={(e) => patch({ client_summary: e.target.value })} />
            <Textarea defaultValue={active.internal_notes ?? ""}
              placeholder="Internal admin notes (never shown to client)"
              onBlur={(e) => patch({ internal_notes: e.target.value })} />
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}