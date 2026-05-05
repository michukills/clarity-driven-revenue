import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListRoadmaps, adminCreateRoadmap, adminUpdateRoadmap,
  adminListRoadmapItems, adminCreateRoadmapItem, adminUpdateRoadmapItem,
  adminArchiveRoadmapItem,
  type AdminRoadmap, type AdminRoadmapItem, PHASE_LABELS, GEAR_LABELS,
} from "@/lib/implementationRoadmap";
import {
  seedRoadmapFromPriorityActions,
  reorderRoadmapItems,
  previewSeedRoadmapFromPriorityActions,
  type SeedRoadmapPreviewItem,
} from "@/lib/implementationSeed";
import { IndustryBrainContextPanel } from "@/components/admin/IndustryBrainContextPanel";
import { IndustryEmphasisPanel } from "@/components/admin/IndustryEmphasisPanel";
import { RepairMapEvidencePanel } from "@/components/admin/RepairMapEvidencePanel";
import { supabase } from "@/integrations/supabase/client";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

export default function ImplementationRoadmapAdmin() {
  const { customerId = "" } = useParams();
  const [roadmaps, setRoadmaps] = useState<AdminRoadmap[]>([]);
  const [active, setActive] = useState<AdminRoadmap | null>(null);
  const [items, setItems] = useState<AdminRoadmapItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [seedPreview, setSeedPreview] = useState<SeedRoadmapPreviewItem[] | null>(null);
  const [seedBusy, setSeedBusy] = useState(false);
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
    const r = await adminListRoadmaps(customerId);
    setRoadmaps(r);
    if (!active && r[0]) setActive(r[0]);
  };
  useEffect(() => { reload().catch((e) => toast.error(e.message)); }, [customerId]);
  useEffect(() => {
    if (!active) { setItems([]); return; }
    adminListRoadmapItems(active.id).then(setItems).catch((e) => toast.error(e.message));
  }, [active?.id]);

  const createRoadmap = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateRoadmap(customerId, newTitle.trim());
    setNewTitle(""); setActive(r); await reload();
    toast.success("Roadmap created (draft)");
  };
  const toggleVisible = async (r: AdminRoadmap) => {
    await adminUpdateRoadmap(r.id, { client_visible: !r.client_visible });
    await reload();
  };
  const addItem = async () => {
    if (!active || !newItemTitle.trim()) return;
    await adminCreateRoadmapItem(active.id, customerId, { title: newItemTitle.trim() });
    setNewItemTitle("");
    setItems(await adminListRoadmapItems(active.id));
  };
  const updateItem = async (id: string, patch: Partial<AdminRoadmapItem>) => {
    await adminUpdateRoadmapItem(id, patch);
    if (active) setItems(await adminListRoadmapItems(active.id));
  };

  const previewSeed = async () => {
    if (!active) return;
    try { setSeedPreview(await previewSeedRoadmapFromPriorityActions(customerId, active.id)); }
    catch (e: any) { toast.error(e.message); }
  };
  const runSeed = async () => {
    if (!active) return;
    setSeedBusy(true);
    try {
      const r = await seedRoadmapFromPriorityActions(customerId, active.id);
      toast.success(`Seeded ${r.created} item(s); skipped ${r.skipped_duplicates} duplicate(s).`);
      setSeedPreview(null);
      setItems(await adminListRoadmapItems(active.id));
    } catch (e: any) { toast.error(e.message); }
    finally { setSeedBusy(false); }
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
    try { await reorderRoadmapItems(next.map((it) => it.id)); }
    catch (e: any) { toast.error(e.message); }
    if (active) setItems(await adminListRoadmapItems(active.id));
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Implementation Roadmap (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build a bounded implementation plan from diagnostic findings. Internal notes never leave this view.
          </p>
        </header>
        <IndustryBrainContextPanel
          industry={customerIndustry}
          surface="implementation"
        />
        <IndustryEmphasisPanel
          industry={customerIndustry}
          surface="implementation"
        />

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New roadmap title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Button onClick={createRoadmap}>Create</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {roadmaps.map((r) => (
              <button key={r.id}
                onClick={() => setActive(r)}
                className={`text-xs px-3 py-1.5 rounded-md border ${active?.id === r.id ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                {r.title} <span className="opacity-60">· {r.status}</span>
              </button>
            ))}
          </div>
        </section>

        {active ? (
          <section className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-foreground">{active.title}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{active.status}</Badge>
                  <Button variant="outline" size="sm" onClick={() => toggleVisible(active)}>
                    {active.client_visible ? "Hide from client" : "Make client-visible"}
                  </Button>
                </div>
              </div>
              <Textarea
                placeholder="Roadmap summary (client-facing)"
                defaultValue={active.summary ?? ""}
                onBlur={(e) => adminUpdateRoadmap(active.id, { summary: e.target.value }).then(reload)}
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="New roadmap item title" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} />
                <Button onClick={addItem}>Add item</Button>
                <Button variant="outline" onClick={previewSeed}>Preview seed from Priority Actions</Button>
                <Button variant="outline" disabled={seedBusy} onClick={runSeed}>
                  {seedBusy ? "Seeding…" : "Seed from Priority Actions"}
                </Button>
              </div>
              {seedPreview ? (
                <div className="border border-border rounded-md p-3 text-xs space-y-1">
                  <div className="text-muted-foreground">Seed preview ({seedPreview.length} candidate(s); duplicates skipped):</div>
                  {seedPreview.map((p) => (
                    <div key={p.source_id} className={p.duplicate ? "opacity-50" : ""}>
                      • {p.title} <span className="text-muted-foreground">[{p.priority}]</span>
                      {p.duplicate ? <span className="ml-1 text-muted-foreground">(duplicate)</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No items yet.</p>
              ) : items.map((it, idx) => (
                <div key={it.id} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>#{idx + 1}</span>
                    <Button size="sm" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>↑</Button>
                    <Button size="sm" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>↓</Button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Input value={it.title}
                      onChange={(e) => setItems(items.map(x => x.id === it.id ? { ...x, title: e.target.value } : x))}
                      onBlur={(e) => updateItem(it.id, { title: e.target.value })} />
                    <select value={it.phase}
                      onChange={(e) => updateItem(it.id, { phase: e.target.value as any })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9">
                      {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <select value={it.priority}
                      onChange={(e) => updateItem(it.id, { priority: e.target.value as any })}
                      className="bg-background border border-border rounded-md px-2 text-sm h-9">
                      {["low","medium","high","critical"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <select value={it.gear ?? ""}
                    onChange={(e) => updateItem(it.id, { gear: (e.target.value || null) as any })}
                    className="bg-background border border-border rounded-md px-2 text-sm h-9">
                    <option value="">— gear —</option>
                    {Object.entries(GEAR_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <Textarea placeholder="Client-facing summary"
                    defaultValue={it.client_summary ?? ""}
                    onBlur={(e) => updateItem(it.id, { client_summary: e.target.value })} />
                  <Textarea placeholder="Internal notes (never shown to client)"
                    defaultValue={it.internal_notes ?? ""}
                    onBlur={(e) => updateItem(it.id, { internal_notes: e.target.value })} />
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground flex items-center gap-2">
                      <input type="checkbox" checked={it.client_visible}
                        onChange={(e) => updateItem(it.id, { client_visible: e.target.checked })} />
                      Client-visible
                    </label>
                    <Button size="sm" variant="outline"
                      onClick={() => adminArchiveRoadmapItem(it.id).then(() => updateItem(it.id, {}))}>
                      Archive
                    </Button>
                  </div>
                  <RepairMapEvidencePanel
                    customerId={customerId}
                    repairMapItemId={it.id}
                    itemClientVisible={it.client_visible}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PortalShell>
  );
}