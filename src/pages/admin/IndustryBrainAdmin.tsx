import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListIndustryBrain, adminCreateIndustryBrain,
  adminUpdateIndustryBrain, adminArchiveIndustryBrain,
  INDUSTRY_KEYS, INDUSTRY_LABEL,
  TEMPLATE_TYPES, TEMPLATE_TYPE_LABEL,
  GEARS, GEAR_LABEL,
  STATUSES,
  type IndustryBrainEntry,
  type IndustryKey, type IndustryBrainTemplateType,
  type IndustryBrainGear, type IndustryBrainStatus,
} from "@/lib/industryBrain";

export default function IndustryBrainAdmin() {
  const [items, setItems] = useState<IndustryBrainEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newIndustry, setNewIndustry] = useState<IndustryKey>("trades_services");
  const [filterIndustry, setFilterIndustry] = useState<IndustryKey | "all">("all");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await adminListIndustryBrain();
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(
    () => filterIndustry === "all" ? items : items.filter(i => i.industry_key === filterIndustry),
    [items, filterIndustry],
  );

  const active = useMemo(
    () => items.find(i => i.id === activeId) ?? null,
    [items, activeId],
  );

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateIndustryBrain({
      industry_key: newIndustry,
      industry_label: INDUSTRY_LABEL[newIndustry],
      title: newTitle.trim(),
    });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Industry brain entry created");
  };

  const patch = async (p: Partial<IndustryBrainEntry>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateIndustryBrain(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this entry? It will be hidden from active use.")) return;
    await adminArchiveIndustryBrain(active.id);
    setActiveId(null);
    await reload();
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl text-foreground font-serif">Industry Brain Enhancements (Admin)</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Manage industry-aware examples, templates, and notes that support tool outputs across
            the diagnostic, implementation, and RGS Control System lanes. Industry brain entries
            do not duplicate tools per industry. They feed shared tools with industry-aware
            context.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl">
            Cannabis / MMJ / MMC entries here mean cannabis, dispensary, medical marijuana, and
            recreational marijuana business operations — not healthcare, patient-care, insurance,
            or claims logic. Compliance-sensitive notes are warning and visibility support only.
            They are not legal advice and not a compliance guarantee. State-specific rules may
            apply. Review with qualified counsel or compliance support where required. Internal
            notes and admin notes are admin-only and never shown to the client. Client-visible
            content must be explicitly approved before being surfaced.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="bg-background border border-border rounded-md px-2 py-2 text-sm"
              value={newIndustry}
              onChange={e => setNewIndustry(e.target.value as IndustryKey)}
            >
              {INDUSTRY_KEYS.map(k => (
                <option key={k} value={k}>{INDUSTRY_LABEL[k]}</option>
              ))}
            </select>
            <Input
              placeholder="New entry title (e.g. Job-level margin visibility)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="flex-1 min-w-[260px]"
            />
            <Button onClick={create}>Create</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Filter:</span>
            <select
              className="bg-background border border-border rounded-md px-2 py-1 text-sm"
              value={filterIndustry}
              onChange={e => setFilterIndustry(e.target.value as IndustryKey | "all")}
            >
              <option value="all">All industries</option>
              {INDUSTRY_KEYS.map(k => (
                <option key={k} value={k}>{INDUSTRY_LABEL[k]}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No industry brain entries yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map(i => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    className={`w-full text-left py-2 px-1 flex items-center gap-2 ${activeId === i.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1 truncate">{i.title}</span>
                    <Badge variant="outline">{INDUSTRY_LABEL[i.industry_key]}</Badge>
                    <Badge variant="outline">{TEMPLATE_TYPE_LABEL[i.template_type]}</Badge>
                    <Badge variant="outline">{GEAR_LABEL[i.gear]}</Badge>
                    <Badge variant="outline">{i.status}</Badge>
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
              <Field label="Industry">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.industry_key}
                  onChange={e => {
                    const k = e.target.value as IndustryKey;
                    patch({ industry_key: k, industry_label: INDUSTRY_LABEL[k] });
                  }}
                >
                  {INDUSTRY_KEYS.map(k => (
                    <option key={k} value={k}>{INDUSTRY_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Template type">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.template_type}
                  onChange={e => patch({ template_type: e.target.value as IndustryBrainTemplateType })}
                >
                  {TEMPLATE_TYPES.map(t => (
                    <option key={t} value={t}>{TEMPLATE_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Gear">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.gear}
                  onChange={e => patch({ gear: e.target.value as IndustryBrainGear })}
                >
                  {GEARS.map(g => (
                    <option key={g} value={g}>{GEAR_LABEL[g]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.status}
                  onChange={e => patch({ status: e.target.value as IndustryBrainStatus })}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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
              <Field label="Version">
                <Input type="number" value={active.version}
                  onChange={e => patch({ version: Number(e.target.value) || 1 })} />
              </Field>
            </div>

            <Field label="Summary (short)">
              <Textarea rows={2} value={active.summary ?? ""}
                onChange={e => patch({ summary: e.target.value })} />
            </Field>
            <Field label="Content (admin-managed; only surfaced to clients if explicitly approved)">
              <Textarea rows={4} value={active.content ?? ""}
                onChange={e => patch({ content: e.target.value })} />
            </Field>
            <Field label="Caution / scope note (used as warning support, not legal or compliance guarantee)">
              <Textarea rows={2} value={active.caution_note ?? ""}
                onChange={e => patch({ caution_note: e.target.value })}
                placeholder="e.g. State-specific rules may apply. Review with qualified counsel or compliance support where required." />
            </Field>

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
                Client-visible (requires explicit admin approval; default off)
              </label>
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