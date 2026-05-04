import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListToolLibraryResources, adminCreateToolLibraryResource,
  adminUpdateToolLibraryResource, adminArchiveToolLibraryResource,
  TLR_STATUSES, TLR_RESOURCE_TYPES, TLR_SERVICE_LANES, TLR_JOURNEY_PHASES,
  TLR_INDUSTRY_BEHAVIORS, TLR_RELATED_GEARS,
  TLR_STATUS_LABEL, TLR_RESOURCE_TYPE_LABEL, TLR_LANE_LABEL, TLR_PHASE_LABEL,
  TLR_INDUSTRY_LABEL, TLR_GEAR_LABEL,
  type AdminToolLibraryResource,
  type TlrStatus, type TlrResourceType, type TlrServiceLane,
  type TlrJourneyPhase, type TlrIndustryBehavior, type TlrRelatedGear,
} from "@/lib/toolLibraryResources";

export default function ToolLibraryAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminToolLibraryResource[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [scopeGlobal, setScopeGlobal] = useState(true);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListToolLibraryResources(customerId);
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(
    () => items.find(i => i.id === activeId) ?? null,
    [items, activeId],
  );

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateToolLibraryResource(scopeGlobal ? null : customerId, {
      title: newTitle.trim(),
    });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Resource created");
  };

  const patch = async (p: Partial<AdminToolLibraryResource>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateToolLibraryResource(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this resource? It will be hidden from clients.")) return;
    await adminArchiveToolLibraryResource(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Tool Library / Resource Center (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage approved resources for the client portal. Stage-based access
            remains the default. Publishing a resource does not bypass lane, payment,
            invite, tenant, or client visibility rules. Internal notes stay admin-only.
            Resources are support materials and do not substitute for accounting,
            legal, tax, compliance, payroll, or HR review.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="New resource title"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={scopeGlobal}
                onChange={e => setScopeGlobal(e.target.checked)}
              />
              Global (visible to all eligible clients)
            </label>
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No resources yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(i => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    className={`w-full text-left py-2 px-1 flex items-center gap-2 ${activeId === i.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1 truncate">{i.title}</span>
                    <Badge variant="outline">{TLR_RESOURCE_TYPE_LABEL[i.resource_type]}</Badge>
                    <Badge variant="outline">{TLR_STATUS_LABEL[i.status]}</Badge>
                    {i.customer_id === null && <Badge variant="secondary">Global</Badge>}
                    {i.archived_at && <Badge variant="outline">Archived</Badge>}
                    {i.client_visible && <Badge variant="secondary">Client-visible</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {active && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg text-foreground font-serif">{active.title}</h2>
              <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={active.title} onChange={e => patch({ title: e.target.value })} />
              </Field>
              <Field label="Slug (optional)">
                <Input value={active.slug ?? ""} onChange={e => patch({ slug: e.target.value || null })} />
              </Field>
              <Field label="Resource type">
                <Select value={active.resource_type} options={TLR_RESOURCE_TYPES} labelMap={TLR_RESOURCE_TYPE_LABEL}
                  onChange={v => patch({ resource_type: v as TlrResourceType })} />
              </Field>
              <Field label="Status">
                <Select value={active.status} options={TLR_STATUSES} labelMap={TLR_STATUS_LABEL}
                  onChange={v => patch({ status: v as TlrStatus })} />
              </Field>
              <Field label="Service lane">
                <Select value={active.service_lane} options={TLR_SERVICE_LANES} labelMap={TLR_LANE_LABEL}
                  onChange={v => patch({ service_lane: v as TlrServiceLane })} />
              </Field>
              <Field label="Customer journey phase">
                <Select value={active.customer_journey_phase} options={TLR_JOURNEY_PHASES} labelMap={TLR_PHASE_LABEL}
                  onChange={v => patch({ customer_journey_phase: v as TlrJourneyPhase })} />
              </Field>
              <Field label="Industry behavior">
                <Select value={active.industry_behavior} options={TLR_INDUSTRY_BEHAVIORS} labelMap={TLR_INDUSTRY_LABEL}
                  onChange={v => patch({ industry_behavior: v as TlrIndustryBehavior })} />
              </Field>
              <Field label="Related gear (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_gear ?? ""}
                  onChange={e => patch({ related_gear: (e.target.value || null) as TlrRelatedGear | null })}
                >
                  <option value="">— none —</option>
                  {TLR_RELATED_GEARS.map(g => <option key={g} value={g}>{TLR_GEAR_LABEL[g]}</option>)}
                </select>
              </Field>
              <Field label="Related tool key (optional)">
                <Input value={active.related_tool_key ?? ""}
                  onChange={e => patch({ related_tool_key: e.target.value || null })}
                  placeholder="e.g. revenue_risk_monitor" />
              </Field>
              <Field label="Display order">
                <Input type="number" value={active.display_order}
                  onChange={e => patch({ display_order: Number(e.target.value) || 100 })} />
              </Field>
              <Field label="External URL (optional)">
                <Input value={active.external_url ?? ""}
                  onChange={e => patch({ external_url: e.target.value || null })} />
              </Field>
              <Field label="CTA label (optional)">
                <Input value={active.cta_label ?? ""}
                  onChange={e => patch({ cta_label: e.target.value || null })} />
              </Field>
            </div>

            <Field label="Summary (client-safe)">
              <Textarea rows={2} value={active.summary ?? ""}
                onChange={e => patch({ summary: e.target.value })} />
            </Field>
            <Field label="Body / content (client-safe)">
              <Textarea rows={6} value={active.body ?? ""}
                onChange={e => patch({ body: e.target.value })} />
            </Field>
            <Field label="Internal notes (admin-only — never shown to client)">
              <Textarea rows={3} value={active.internal_notes ?? ""}
                onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.client_visible}
                  onChange={e => patch({ client_visible: e.target.checked })}
                />
                Client-visible (also requires status “Published”)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.requires_active_client}
                  onChange={e => patch({ requires_active_client: e.target.checked })}
                />
                Requires active client
              </label>
              <span className="text-xs text-muted-foreground">
                Scope: {active.customer_id ? "Customer-specific" : "Global"}
              </span>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Select<T extends string>({
  value, options, labelMap, onChange,
}: {
  value: T;
  options: T[];
  labelMap: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value as T)}
    >
      {options.map(o => <option key={o} value={o}>{labelMap[o]}</option>)}
    </select>
  );
}
