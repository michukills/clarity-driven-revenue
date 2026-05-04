import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListRrmItems, adminCreateRrmItem, adminUpdateRrmItem, adminArchiveRrmItem,
  RRM_CATEGORIES, RRM_SEVERITIES, RRM_STATUSES, RRM_TRENDS, RRM_SOURCE_TYPES,
  RRM_SEVERITY_LABEL, RRM_STATUS_LABEL, RRM_TREND_LABEL, RRM_CATEGORY_LABEL,
  type AdminRrmItem, type RrmSeverity, type RrmStatus, type RrmTrend,
  type RrmSignalCategory, type RrmSourceType,
} from "@/lib/revenueRiskMonitor";
import { IndustryBrainContextPanel } from "@/components/admin/IndustryBrainContextPanel";
import { supabase } from "@/integrations/supabase/client";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export default function RevenueRiskMonitorAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminRrmItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [customerIndustry, setCustomerIndustry] = useState<IndustryCategory | null>(null);

  useEffect(() => {
    if (!customerId) { setCustomerIndustry(null); return; }
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("industry")
        .eq("id", customerId)
        .maybeSingle();
      setCustomerIndustry(((data as any)?.industry as IndustryCategory | null) ?? null);
    })();
  }, [customerId]);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListRrmItems(customerId);
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(() => items.find(i => i.id === activeId) ?? null, [items, activeId]);

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateRrmItem(customerId, { title: newTitle.trim() });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Monitor item created");
  };

  const patch = async (p: Partial<AdminRrmItem>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateRrmItem(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this monitor item? It will be hidden from clients.")) return;
    await adminArchiveRrmItem(active.id);
    setActiveId(null);
    await reload();
  };

  const markReviewed = async () => {
    if (!active) return;
    await patch({ reviewed_by_admin_at: new Date().toISOString(), admin_review_required: false });
    toast.success("Marked as reviewed");
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Revenue & Risk Monitor (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Use this monitor to keep important revenue and risk signals visible.
            This is a review tool — not a guarantee, alert system, accounting
            system, legal/compliance review, or replacement for owner
            decision-making. Internal notes never leave this view.
          </p>
        </header>

        <IndustryBrainContextPanel
          industry={customerIndustry}
          surface="rgs_control_system"
        />

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New monitor item title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monitor items yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map(i => (
                <button key={i.id}
                  onClick={() => setActiveId(i.id)}
                  className={`text-xs px-3 py-1.5 rounded-md border ${activeId === i.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  {i.title}
                  <span className="opacity-60"> · {RRM_SEVERITY_LABEL[i.severity]}</span>
                  {i.client_visible ? <span className="ml-1 text-primary">·visible</span> : null}
                </button>
              ))}
            </div>
          )}
        </section>

        {active ? (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{RRM_STATUS_LABEL[active.status]}</Badge>
                <Badge variant="secondary">{RRM_SEVERITY_LABEL[active.severity]}</Badge>
                <Badge variant="outline">{RRM_TREND_LABEL[active.trend]}</Badge>
                {active.client_visible ? <Badge>Client-visible</Badge> : <Badge variant="outline">Admin-only</Badge>}
                {active.admin_review_required ? <Badge variant="destructive">Needs admin review</Badge> : null}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={markReviewed}>Mark reviewed</Button>
                <Button variant="outline" size="sm"
                  onClick={() => patch({ client_visible: !active.client_visible })}>
                  {active.client_visible ? "Hide from client" : "Make client-visible"}
                </Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <Input defaultValue={active.title} onBlur={e => patch({ title: e.target.value })} placeholder="Title" />
            <Textarea defaultValue={active.description ?? ""}
              onBlur={e => patch({ description: e.target.value })}
              placeholder="Description (admin-side detail)" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Category">
                <select value={active.signal_category}
                  onChange={e => patch({ signal_category: e.target.value as RrmSignalCategory })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {RRM_CATEGORIES.map(c => <option key={c} value={c}>{RRM_CATEGORY_LABEL[c]}</option>)}
                </select>
              </Field>
              <Field label="Severity">
                <select value={active.severity}
                  onChange={e => patch({ severity: e.target.value as RrmSeverity })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {RRM_SEVERITIES.map(s => <option key={s} value={s}>{RRM_SEVERITY_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={active.status}
                  onChange={e => patch({ status: e.target.value as RrmStatus })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {RRM_STATUSES.map(s => <option key={s} value={s}>{RRM_STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Trend">
                <select value={active.trend}
                  onChange={e => patch({ trend: e.target.value as RrmTrend })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {RRM_TRENDS.map(t => <option key={t} value={t}>{RRM_TREND_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="Source type">
                <select value={active.source_type}
                  onChange={e => patch({ source_type: e.target.value as RrmSourceType })}
                  className="bg-background border border-border rounded-md px-2 text-sm h-9 w-full">
                  {RRM_SOURCE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}
                </select>
              </Field>
              <Field label="Source label">
                <Input defaultValue={active.source_label ?? ""}
                  onBlur={e => patch({ source_label: e.target.value })}
                  placeholder="e.g. October QuickBooks summary" />
              </Field>
              <Field label="Related metric name">
                <Input defaultValue={active.related_metric_name ?? ""}
                  onBlur={e => patch({ related_metric_name: e.target.value })} />
              </Field>
              <Field label="Related metric value">
                <Input defaultValue={active.related_metric_value ?? ""}
                  onBlur={e => patch({ related_metric_value: e.target.value })} />
              </Field>
              <Field label="Industry context (optional)">
                <Input defaultValue={active.industry ?? ""}
                  onBlur={e => patch({ industry: e.target.value })} />
              </Field>
            </div>

            <Textarea defaultValue={active.owner_review_recommendation ?? ""}
              onBlur={e => patch({ owner_review_recommendation: e.target.value })}
              placeholder="Owner review recommendation (what should the owner review next?)" />
            <Textarea defaultValue={active.client_notes ?? ""}
              onBlur={e => patch({ client_notes: e.target.value })}
              placeholder="Client-facing notes (only shown when client-visible)" />
            <Textarea defaultValue={active.internal_notes ?? ""}
              onBlur={e => patch({ internal_notes: e.target.value })}
              placeholder="Internal admin notes (never shown to client)" />
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}