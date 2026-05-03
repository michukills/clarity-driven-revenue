import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListDecisionRights, adminCreateDecisionRights, adminUpdateDecisionRights,
  adminArchiveDecisionRights,
  type AdminDecisionRightsEntry, DECISION_RIGHTS_STATUS_LABELS, type DecisionRightsStatus,
} from "@/lib/decisionRights";

const STATUSES: DecisionRightsStatus[] = [
  "draft","ready_for_review","client_visible","active","needs_update","archived",
];

export default function DecisionRightsAccountabilityAdmin() {
  const { customerId = "" } = useParams();
  const [entries, setEntries] = useState<AdminDecisionRightsEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListDecisionRights(customerId);
      setEntries(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(() => entries.find(e => e.id === activeId) ?? null, [entries, activeId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateDecisionRights(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Entry created (draft)");
  };

  const patch = async (p: Partial<AdminDecisionRightsEntry>) => {
    if (!active) return;
    setEntries(entries.map(e => e.id === active.id ? { ...e, ...p } : e));
    try {
      await adminUpdateDecisionRights(active.id, p);
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleVisible = async () => {
    if (!active) return;
    await patch({ client_visible: !active.client_visible });
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this entry? It will be hidden from clients.")) return;
    await adminArchiveDecisionRights(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Decision Rights / Accountability (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define who owns each decision, who acts, who approves, who is consulted, and who is informed.
            Internal notes and drafts never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New entry title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {entries.map((e) => (
                <button key={e.id}
                  onClick={() => setActiveId(e.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === e.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  {e.title} <span className="opacity-60">· {e.status}</span>
                  {e.client_visible ? <span className="ml-1 text-primary">·visible</span> : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {active ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{DECISION_RIGHTS_STATUS_LABELS[active.status]}</Badge>
                <Badge variant="secondary">v{active.version}</Badge>
                {active.client_visible
                  ? <Badge>Client-visible</Badge>
                  : <Badge variant="outline">Admin-only</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <select value={active.status}
                  onChange={(e) => patch({ status: e.target.value as DecisionRightsStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9">
                  {STATUSES.map(s => <option key={s} value={s}>{DECISION_RIGHTS_STATUS_LABELS[s]}</option>)}
                </select>
                <Button variant="outline" size="sm" onClick={toggleVisible}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input defaultValue={active.title} placeholder="Title"
                onBlur={(e) => patch({ title: e.target.value })} />
              <Input defaultValue={active.business_area ?? ""} placeholder="Business area / category"
                onBlur={(e) => patch({ business_area: e.target.value })} />
              <Input defaultValue={active.industry_context ?? ""} placeholder="Industry context (optional)"
                onBlur={(e) => patch({ industry_context: e.target.value })} />
              <Input defaultValue={active.decision_cadence ?? ""} placeholder="Decision cadence / frequency"
                onBlur={(e) => patch({ decision_cadence: e.target.value })} />
            </div>

            <Textarea defaultValue={active.decision_or_responsibility ?? ""}
              placeholder="Decision or responsibility being clarified"
              onBlur={(e) => patch({ decision_or_responsibility: e.target.value })} />
            <Textarea defaultValue={active.current_gap ?? ""}
              placeholder="Current problem / accountability gap"
              onBlur={(e) => patch({ current_gap: e.target.value })} />
            <Textarea defaultValue={active.client_summary ?? ""}
              placeholder="Client summary (client-facing)"
              onBlur={(e) => patch({ client_summary: e.target.value })} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input defaultValue={active.decision_owner ?? ""} placeholder="Decision owner"
                onBlur={(e) => patch({ decision_owner: e.target.value })} />
              <Input defaultValue={active.action_owner ?? ""} placeholder="Action owner"
                onBlur={(e) => patch({ action_owner: e.target.value })} />
              <Input defaultValue={active.approver ?? ""} placeholder="Approver"
                onBlur={(e) => patch({ approver: e.target.value })} />
              <Input defaultValue={active.consulted ?? ""} placeholder="Consulted"
                onBlur={(e) => patch({ consulted: e.target.value })} />
              <Input defaultValue={active.informed ?? ""} placeholder="Informed"
                onBlur={(e) => patch({ informed: e.target.value })} />
              <Input defaultValue={active.handoff_trigger ?? ""} placeholder="Handoff trigger"
                onBlur={(e) => patch({ handoff_trigger: e.target.value })} />
            </div>

            <Textarea defaultValue={active.escalation_path ?? ""} placeholder="Escalation path"
              onBlur={(e) => patch({ escalation_path: e.target.value })} />
            <Textarea defaultValue={active.evidence_source_notes ?? ""} placeholder="Evidence / source notes"
              onBlur={(e) => patch({ evidence_source_notes: e.target.value })} />
            <Textarea defaultValue={active.internal_notes ?? ""}
              placeholder="Internal admin notes (never shown to client)"
              onBlur={(e) => patch({ internal_notes: e.target.value })} />
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}
