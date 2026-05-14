import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";
import { toast } from "sonner";
import {
  adminListClientHealthRecords, adminCreateClientHealthRecord,
  adminUpdateClientHealthRecord, adminArchiveClientHealthRecord,
  HEALTH_STATUSES, RENEWAL_RISKS, ENGAGEMENT_STATUSES,
  ADMIN_ACTION_TYPES, RECORD_STATUSES, RELATED_SOURCE_TYPES,
  HEALTH_LABEL, RENEWAL_LABEL, ENGAGEMENT_LABEL,
  ACTION_LABEL, STATUS_LABEL, SOURCE_LABEL,
  type AdminClientHealthRecord,
} from "@/lib/clientHealth";

export default function ClientHealthAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminClientHealthRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListClientHealthRecords(customerId);
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(() => items.find(i => i.id === activeId) ?? null, [items, activeId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateClientHealthRecord(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Health record created");
  };

  const patch = async (p: Partial<AdminClientHealthRecord>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateClientHealthRecord(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this health record?")) return;
    await adminArchiveClientHealthRecord(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Client Health / Renewal Risk (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage internal health and renewal-risk notes for this client. This is an
            admin visibility layer, not a client-facing score. Internal notes stay admin-only and
            are never shown to the client. This view does not guarantee renewal, retention, or
            client outcomes, and it does not change payment or access gates. Professional review
            is recommended where compliance, legal, tax, or accounting questions exist.
          </p>
        </header>

        <div className="flex gap-2">
          <Input
            placeholder="New health record title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          <Button onClick={create}>Add</Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <WorkflowEmptyState
            title="No client health records for this client yet."
            body="Use the form above to record an admin-observed health snapshot. Health records are admin-only until an admin marks them client-visible — they are observations, not verified financial or compliance proof."
            testId="client-health-admin-empty"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <aside className="space-y-2">
              {items.map(i => (
                <button
                  key={i.id}
                  onClick={() => setActiveId(i.id)}
                  className={`w-full text-left p-3 rounded border ${
                    activeId === i.id ? "border-primary bg-primary/10" : "border-border"
                  }`}
                >
                  <div className="text-sm text-foreground">{i.title}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline">{HEALTH_LABEL(i.health_status)}</Badge>
                    <Badge variant="outline">{RENEWAL_LABEL(i.renewal_risk_level)}</Badge>
                    {i.attention_needed && <Badge>Attention</Badge>}
                  </div>
                </button>
              ))}
            </aside>

            {active && (
              <section className="md:col-span-2 space-y-4 border border-border rounded p-4">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input value={active.title} onChange={e => patch({ title: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Health">
                    <Select value={active.health_status} onChange={v => patch({ health_status: v as any })}
                      options={HEALTH_STATUSES.map(s => [s, HEALTH_LABEL(s)] as const) } />
                  </Field>
                  <Field label="Renewal risk">
                    <Select value={active.renewal_risk_level} onChange={v => patch({ renewal_risk_level: v as any })}
                      options={RENEWAL_RISKS.map(s => [s, RENEWAL_LABEL(s)] as const)} />
                  </Field>
                  <Field label="Engagement">
                    <Select value={active.engagement_status} onChange={v => patch({ engagement_status: v as any })}
                      options={ENGAGEMENT_STATUSES.map(s => [s, ENGAGEMENT_LABEL(s)] as const)} />
                  </Field>
                  <Field label="Recommended admin action">
                    <Select value={active.admin_action_type} onChange={v => patch({ admin_action_type: v as any })}
                      options={ADMIN_ACTION_TYPES.map(s => [s, ACTION_LABEL(s)] as const)} />
                  </Field>
                  <Field label="Record status">
                    <Select value={active.status} onChange={v => patch({ status: v as any })}
                      options={RECORD_STATUSES.map(s => [s, STATUS_LABEL(s)] as const)} />
                  </Field>
                  <Field label="Related source">
                    <Select
                      value={active.related_source_type ?? ""}
                      onChange={v => patch({ related_source_type: (v || null) as any })}
                      options={[["", "—"], ...RELATED_SOURCE_TYPES.map(s => [s, SOURCE_LABEL(s)] as [string, string])]}
                    />
                  </Field>
                  <Field label="Next review">
                    <Input type="date" value={active.next_review_date ?? ""}
                      onChange={e => patch({ next_review_date: e.target.value || null })} />
                  </Field>
                  <Field label="Renewal date">
                    <Input type="date" value={active.renewal_date ?? ""}
                      onChange={e => patch({ renewal_date: e.target.value || null })} />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Switch checked={active.attention_needed}
                      onCheckedChange={v => patch({ attention_needed: !!v })} />
                    Attention needed
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <Switch checked={active.professional_review_recommended}
                      onCheckedChange={v => patch({ professional_review_recommended: !!v })} />
                    Professional review recommended
                  </label>
                </div>

                <Field label="Health summary (admin)">
                  <Textarea rows={3} value={active.health_summary ?? ""}
                    onChange={e => patch({ health_summary: e.target.value })} />
                </Field>
                <Field label="Renewal risk summary (admin)">
                  <Textarea rows={3} value={active.renewal_risk_summary ?? ""}
                    onChange={e => patch({ renewal_risk_summary: e.target.value })} />
                </Field>
                <Field label="Recommended admin action (admin)">
                  <Textarea rows={2} value={active.recommended_admin_action ?? ""}
                    onChange={e => patch({ recommended_admin_action: e.target.value })} />
                </Field>

                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Admin-only fields below. <code>internal_notes</code> and <code>admin_notes</code>
                    are never shown to the client.
                  </p>
                  <Field label="internal_notes (admin-only)">
                    <Textarea rows={3} value={active.internal_notes ?? ""}
                      onChange={e => patch({ internal_notes: e.target.value })} />
                  </Field>
                  <Field label="admin_notes (admin-only)">
                    <Textarea rows={3} value={active.admin_notes ?? ""}
                      onChange={e => patch({ admin_notes: e.target.value })} />
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={archive}>Archive</Button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <select
      className="w-full h-9 px-2 rounded border border-border bg-background text-foreground text-sm"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
