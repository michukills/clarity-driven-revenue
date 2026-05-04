import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { AdminScopeBanner } from "@/components/admin/AdminScopeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListFinancialVisibility, adminCreateFinancialVisibility,
  adminUpdateFinancialVisibility, adminArchiveFinancialVisibility,
  FV_PROVIDERS, FV_SOURCE_TYPES, FV_STATUSES, FV_HEALTHS,
  FV_LANES, FV_PHASES, FV_INDUSTRIES, FV_RELATED_SOURCE_TYPES,
  FV_PROVIDER_LABEL, FV_SOURCE_TYPE_LABEL, FV_STATUS_LABEL, FV_HEALTH_LABEL,
  FV_LANE_LABEL, FV_PHASE_LABEL, FV_INDUSTRY_LABEL, FV_RELATED_SOURCE_LABEL,
  type AdminFinancialVisibilitySource,
  type FvProvider, type FvSourceType, type FvStatus, type FvHealth,
  type FvServiceLane, type FvJourneyPhase, type FvIndustryBehavior,
  type FvRelatedSourceType,
} from "@/lib/financialVisibility";

export default function FinancialVisibilityAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminFinancialVisibilitySource[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListFinancialVisibility(customerId);
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
    if (!newName.trim()) return;
    const r = await adminCreateFinancialVisibility(customerId, { display_name: newName.trim() });
    setNewName(""); setActiveId(r.id);
    await reload();
    toast.success("Visibility source created");
  };

  const patch = async (p: Partial<AdminFinancialVisibilitySource>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateFinancialVisibility(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this source? It will be hidden from the client.")) return;
    await adminArchiveFinancialVisibility(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Financial Visibility (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage connector and source visibility records for this client. This is a
            visibility layer, not accounting review. Publishing a record does not bypass lane,
            payment, invite, tenant, or client visibility rules. Tokens and secrets must never be
            shown in the browser. Internal notes stay admin-only and are never shown to the
            client. Legal, accounting, tax, compliance, payroll, and HR matters should be handled
            by qualified professionals where required.
          </p>
        </header>

        <AdminScopeBanner
          surface="Financial Visibility"
          purpose="catalog and review the client's connected financial sources so the operator can confirm coverage, status, and what is safe to surface."
          outside="storing or displaying tokens and secrets in the browser, performing accounting or tax work, and providing legal, tax, accounting, HR, or regulated advice."
        />

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="New source display name (e.g. QuickBooks Online — main file)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visibility sources yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(i => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    className={`w-full text-left py-2 px-1 flex items-center gap-2 ${activeId === i.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1 truncate">{i.display_name}</span>
                    <Badge variant="outline">{FV_PROVIDER_LABEL[i.provider]}</Badge>
                    <Badge variant="outline">{FV_STATUS_LABEL[i.status]}</Badge>
                    <Badge variant="outline">{FV_HEALTH_LABEL[i.health]}</Badge>
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
              <h2 className="text-lg text-foreground font-serif">{active.display_name}</h2>
              <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Tokens, refresh tokens, API keys, OAuth secrets, and other connector credentials
              are never displayed here. They live only in backend storage.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Display name">
                <Input value={active.display_name} onChange={e => patch({ display_name: e.target.value })} />
              </Field>
              <Field label="Provider">
                <Select value={active.provider} options={FV_PROVIDERS} labelMap={FV_PROVIDER_LABEL}
                  onChange={v => patch({ provider: v as FvProvider })} />
              </Field>
              <Field label="Source type">
                <Select value={active.source_type} options={FV_SOURCE_TYPES} labelMap={FV_SOURCE_TYPE_LABEL}
                  onChange={v => patch({ source_type: v as FvSourceType })} />
              </Field>
              <Field label="Connection status">
                <Select value={active.status} options={FV_STATUSES} labelMap={FV_STATUS_LABEL}
                  onChange={v => patch({ status: v as FvStatus })} />
              </Field>
              <Field label="Connection health">
                <Select value={active.health} options={FV_HEALTHS} labelMap={FV_HEALTH_LABEL}
                  onChange={v => patch({ health: v as FvHealth })} />
              </Field>
              <Field label="Service lane">
                <Select value={active.service_lane} options={FV_LANES} labelMap={FV_LANE_LABEL}
                  onChange={v => patch({ service_lane: v as FvServiceLane })} />
              </Field>
              <Field label="Customer journey phase">
                <Select value={active.customer_journey_phase} options={FV_PHASES} labelMap={FV_PHASE_LABEL}
                  onChange={v => patch({ customer_journey_phase: v as FvJourneyPhase })} />
              </Field>
              <Field label="Industry behavior">
                <Select value={active.industry_behavior} options={FV_INDUSTRIES} labelMap={FV_INDUSTRY_LABEL}
                  onChange={v => patch({ industry_behavior: v as FvIndustryBehavior })} />
              </Field>
              <Field label="Related source type (optional)">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.related_source_type ?? ""}
                  onChange={e => patch({ related_source_type: (e.target.value || null) as FvRelatedSourceType | null })}
                >
                  <option value="">— none —</option>
                  {FV_RELATED_SOURCE_TYPES.map(s => <option key={s} value={s}>{FV_RELATED_SOURCE_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Related tool key (optional)">
                <Input value={active.related_tool_key ?? ""}
                  onChange={e => patch({ related_tool_key: e.target.value || null })}
                  placeholder="e.g. revenue_risk_monitor" />
              </Field>
              <Field label="Last synced (optional)">
                <Input type="datetime-local"
                  value={active.last_sync_at ? toLocalInput(active.last_sync_at) : ""}
                  onChange={e => patch({ last_sync_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
              <Field label="Last checked (optional)">
                <Input type="datetime-local"
                  value={active.last_checked_at ? toLocalInput(active.last_checked_at) : ""}
                  onChange={e => patch({ last_checked_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </Field>
              <Field label="Display order">
                <Input type="number" value={active.display_order}
                  onChange={e => patch({ display_order: Number(e.target.value) || 100 })} />
              </Field>
            </div>

            <Field label="Client-visible summary">
              <Textarea rows={3} value={active.client_visible_summary ?? ""}
                onChange={e => patch({ client_visible_summary: e.target.value })} />
            </Field>
            <Field label="Visibility limitations / completeness notes (client-visible)">
              <Textarea rows={3} value={active.visibility_limitations ?? ""}
                onChange={e => patch({ visibility_limitations: e.target.value })}
                placeholder="e.g. Cash sales not captured by this source; reconcile with cash log." />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Revenue visibility (client-visible)">
                <Textarea rows={2} value={active.revenue_summary ?? ""}
                  onChange={e => patch({ revenue_summary: e.target.value })} />
              </Field>
              <Field label="Expense visibility (client-visible)">
                <Textarea rows={2} value={active.expense_summary ?? ""}
                  onChange={e => patch({ expense_summary: e.target.value })} />
              </Field>
              <Field label="Cash visibility (client-visible)">
                <Textarea rows={2} value={active.cash_visibility_summary ?? ""}
                  onChange={e => patch({ cash_visibility_summary: e.target.value })} />
              </Field>
              <Field label="Margin visibility (client-visible)">
                <Textarea rows={2} value={active.margin_visibility_summary ?? ""}
                  onChange={e => patch({ margin_visibility_summary: e.target.value })} />
              </Field>
              <Field label="Invoice / payment visibility (client-visible)">
                <Textarea rows={2} value={active.invoice_payment_summary ?? ""}
                  onChange={e => patch({ invoice_payment_summary: e.target.value })} />
              </Field>
              <Field label="Data quality summary (client-visible)">
                <Textarea rows={2} value={active.data_quality_summary ?? ""}
                  onChange={e => patch({ data_quality_summary: e.target.value })} />
              </Field>
            </div>

            <Field label="Internal notes (admin-only — never shown to the client)">
              <Textarea rows={3} value={active.internal_notes ?? ""}
                onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>
            <Field label="Admin notes (admin-only — never shown to the client)">
              <Textarea rows={3} value={active.admin_notes ?? ""}
                onChange={e => patch({ admin_notes: e.target.value })} />
            </Field>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.client_visible}
                  onChange={e => patch({ client_visible: e.target.checked })}
                />
                Client-visible (also requires non-archived)
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={active.pinned}
                  onChange={e => patch({ pinned: e.target.checked })}
                />
                Pinned
              </label>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
