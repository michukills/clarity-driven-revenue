import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, ShieldAlert, Trash2, ChevronDown, ChevronRight, ArrowLeft, CheckCircle2, Archive, FileDown, Eye, EyeOff } from "lucide-react";
import {
  adminListAnalyses, adminCreateAnalysis, adminUpdateAnalysis, adminArchiveAnalysis,
  adminListItems, adminCreateItem, adminUpdateItem, adminDeleteItem,
  previewSignalsForAnalysis, adminApproveAnalysis,
  CATEGORY_LABEL, CATEGORY_BLURB, CONFIDENCE_LABEL, GEAR_LABEL, SIGNAL_LABEL,
  ANALYSIS_MODE_LABEL, ANALYSIS_STATUS_LABEL,
  SCOPE_DISCLAIMER, STANDALONE_SCOPE_NOTE,
} from "@/lib/swot/swotMatrixData";
import {
  buildSwotReportModelFromAdminInputs,
  buildSwotReportPdfDoc,
  exportDisabledReason,
  isAnalysisExportable,
  assertNoAdminLeakage,
} from "@/lib/swot/swotReportBuilder";
import { generateRunPdf } from "@/lib/exports";
import { SwotStrategicMatrixReport } from "@/components/swot/SwotStrategicMatrixReport";
import type {
  SwotAnalysis, SwotAnalysisMode, SwotCategory, SwotEvidenceConfidence,
  SwotItem, SwotItemSourceType, SwotLinkedGear, SwotSignalDraft,
} from "@/lib/swot/types";

const CATEGORIES: SwotCategory[] = ["strength", "weakness", "opportunity", "threat"];
const CONFIDENCES: SwotEvidenceConfidence[] = [
  "verified", "partially_supported", "owner_claim_only", "assumption", "missing_evidence",
];
const SOURCE_TYPES: SwotItemSourceType[] = [
  "scorecard", "diagnostic", "owner_interview", "evidence_upload",
  "admin_observation", "industry_brain", "implementation", "control_system",
  "manual", "demo",
];
const GEARS: SwotLinkedGear[] = [
  "demand_generation", "revenue_conversion", "operational_efficiency",
  "financial_visibility", "owner_independence", "multiple",
];
const MODES: SwotAnalysisMode[] = [
  "full_rgs_client", "diagnostic_support", "implementation_support",
  "control_system_support", "standalone_gig", "demo",
];

export default function SwotStrategicMatrixAdmin() {
  const { customerId = "" } = useParams();
  const [analyses, setAnalyses] = useState<SwotAnalysis[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<SwotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline new-analysis form state
  const [showCreate, setShowCreate] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMode, setNewMode] = useState<SwotAnalysisMode>("full_rgs_client");
  const [newIndustry, setNewIndustry] = useState("");
  const [newStage, setNewStage] = useState("");

  const active = useMemo(
    () => analyses.find(a => a.id === activeId) ?? null,
    [analyses, activeId],
  );

  useEffect(() => {
    if (!customerId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const a = await adminListAnalyses(customerId);
        if (!alive) return;
        setAnalyses(a);
        setActiveId(a[0]?.id ?? null);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load SWOT analyses");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  useEffect(() => {
    if (!activeId) { setItems([]); return; }
    let alive = true;
    (async () => {
      try {
        const r = await adminListItems(activeId);
        if (alive) setItems(r);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load SWOT items");
      }
    })();
    return () => { alive = false; };
  }, [activeId]);

  const reloadItems = async () => {
    if (!activeId) return;
    setItems(await adminListItems(activeId));
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const a = await adminCreateAnalysis({
        customer_id: customerId,
        title: newTitle.trim(),
        analysis_mode: newMode,
        industry: newIndustry.trim() || null,
        business_stage: newStage.trim() || null,
        client_visible: false,
      });
      setAnalyses([a, ...analyses]);
      setActiveId(a.id);
      setShowCreate(false);
      setNewTitle(""); setNewIndustry(""); setNewStage("");
      toast.success("SWOT analysis created");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create");
    } finally { setSaving(false); }
  };

  const patchAnalysis = async (patch: Partial<SwotAnalysis>) => {
    if (!active) return;
    setAnalyses(analyses.map(a => a.id === active.id ? { ...a, ...patch } : a));
    try {
      await adminUpdateAnalysis(active.id, patch as Parameters<typeof adminUpdateAnalysis>[1]);
    } catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this SWOT analysis? Client view will be removed.")) return;
    await adminArchiveAnalysis(active.id);
    const a = await adminListAnalyses(customerId);
    setAnalyses(a);
    setActiveId(a.find(x => x.status !== "archived")?.id ?? a[0]?.id ?? null);
    toast.success("Analysis archived");
  };

  const approve = async () => {
    if (!active) return;
    if (!active.client_visible) {
      const ok = confirm("This analysis is not marked client-visible. Approve anyway? Clients will not see it until you toggle client-visible.");
      if (!ok) return;
    }
    setSaving(true);
    try {
      const { analysis } = await adminApproveAnalysis(active, items);
      setAnalyses(analyses.map(a => a.id === analysis.id ? analysis : a));
      toast.success("Approved. Signals persisted.");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const grouped = useMemo(() => {
    const g: Record<SwotCategory, SwotItem[]> = { strength: [], weakness: [], opportunity: [], threat: [] };
    for (const i of items) g[i.category].push(i);
    return g;
  }, [items]);

  const signalDrafts: SwotSignalDraft[] = useMemo(
    () => active ? previewSignalsForAnalysis(active.customer_id, active.id, items) : [],
    [active, items],
  );

  const clientVisibleItems = useMemo(
    () => items.filter(i => i.client_visible),
    [items],
  );

  const reportModel = useMemo(() => {
    if (!active || !isAnalysisExportable(active)) return null;
    if (clientVisibleItems.length === 0) return null;
    try {
      return buildSwotReportModelFromAdminInputs({
        analysis: active,
        items, // builder filters down to client_visible internally
      });
    } catch {
      return null;
    }
  }, [active, items, clientVisibleItems.length]);

  const exportBlocked = active
    ? exportDisabledReason(active, clientVisibleItems.length)
    : "Select an analysis first.";

  const downloadPdf = () => {
    if (!active || !reportModel) return;
    const doc = buildSwotReportPdfDoc(reportModel);
    // Defense-in-depth: confirm no admin-only note text leaked.
    assertNoAdminLeakage(doc, items);
    const safeName = active.title.replace(/[^a-z0-9-_ ]/gi, "_").trim() || "swot-strategic-matrix";
    generateRunPdf(`${safeName}.pdf`, doc);
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to={`/admin/customers/${customerId}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to customer
          </Link>
          <span>·</span>
          <Link to={`/admin/customers/${customerId}/swot-analysis`} className="hover:text-foreground">
            P61 SWOT Analysis Tool (legacy view)
          </Link>
        </div>
        <header className="space-y-2">
          <h1 className="text-2xl text-foreground font-serif">SWOT Strategic Matrix (Admin)</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Author a customer-scoped Strategic Matrix connected to the RGS 5 Gears engine.
            Items separate internal vs external conditions and feed downstream signals to
            the Repair Map, Implementation, Control System, and future Campaign planning —
            without touching those modules' internals.
          </p>
          <p className="text-xs text-muted-foreground max-w-3xl border border-border/60 bg-muted/20 rounded-md px-3 py-2">
            {SCOPE_DISCLAIMER}
          </p>
        </header>

        {/* Analyses list + create */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg text-foreground font-serif">Analyses</h2>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(s => !s)}>
              <Plus className="h-4 w-4 mr-1" /> New analysis
            </Button>
          </div>
          {showCreate && (
            <div className="rounded-md border border-border p-3 space-y-2 bg-muted/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Field label="Title">
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Q2 Strategic Matrix" />
                </Field>
                <Field label="Analysis mode">
                  <Select value={newMode} options={MODES} labels={ANALYSIS_MODE_LABEL}
                    onChange={v => setNewMode(v as SwotAnalysisMode)} />
                </Field>
                <Field label="Industry (optional)">
                  <Input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} />
                </Field>
                <Field label="Business stage (optional)">
                  <Input value={newStage} onChange={e => setNewStage(e.target.value)} placeholder="e.g. 0-1k MRR" />
                </Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={saving}>Create draft</Button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No SWOT analysis has been created for this customer yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {analyses.map(a => (
                <li key={a.id}>
                  <button type="button" onClick={() => setActiveId(a.id)}
                    className={`w-full text-left py-2 flex items-center gap-2 ${activeId === a.id ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="flex-1 truncate">{a.title}</span>
                    <Badge variant="outline" className="text-[10px]">{ANALYSIS_MODE_LABEL[a.analysis_mode]}</Badge>
                    <Badge variant={a.status === "approved" ? "default" : "outline"} className="text-[10px]">
                      {ANALYSIS_STATUS_LABEL[a.status]}
                    </Badge>
                    {a.client_visible && a.status === "approved" && !a.archived_at && (
                      <Badge variant="secondary" className="text-[10px]">Client-visible</Badge>
                    )}
                    {a.archived_at && <Badge variant="outline" className="text-[10px]">Archived</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {active && (
          <>
            {/* Header */}
            <section className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <h2 className="text-lg text-foreground font-serif truncate">{active.title}</h2>
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                    <span>Status: <strong className="text-foreground">{ANALYSIS_STATUS_LABEL[active.status]}</strong></span>
                    <span>· Mode: {ANALYSIS_MODE_LABEL[active.analysis_mode]}</span>
                    {active.industry && <span>· Industry: {active.industry}</span>}
                    {active.business_stage && <span>· Stage: {active.business_stage}</span>}
                    <span>· Updated {new Date(active.updated_at).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowReport(s => !s)}>
                    {showReport ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                    {showReport ? "Hide report preview" : "Preview report"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadPdf} disabled={!!exportBlocked}>
                    <FileDown className="h-4 w-4 mr-1" /> Download PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => patchAnalysis({ status: "ready_for_review" })}
                    disabled={active.status === "approved" || active.status === "ready_for_review"}>
                    Mark ready for review
                  </Button>
                  <Button size="sm" onClick={approve} disabled={saving || items.length === 0}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {active.status === "approved" ? "Re-approve + persist signals" : "Approve + persist signals"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={archive}>
                    <Archive className="h-4 w-4 mr-1" /> Archive
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Field label="Title">
                  <Input value={active.title} onChange={e => patchAnalysis({ title: e.target.value })} />
                </Field>
                <Field label="Industry">
                  <Input value={active.industry ?? ""} onChange={e => patchAnalysis({ industry: e.target.value })} />
                </Field>
                <Field label="Business stage">
                  <Input value={active.business_stage ?? ""} onChange={e => patchAnalysis({ business_stage: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={active.client_visible}
                  onChange={e => patchAnalysis({ client_visible: e.target.checked })} />
                Client-visible (only takes effect when status = approved)
              </label>
              <p className="text-[11px] text-muted-foreground">
                Client-safe summaries are visible only after approval and only when this analysis and the item are
                both marked client-visible. Admin-only notes never appear in client views.
              </p>
              {active.analysis_mode === "standalone_gig" && (
                <p className="text-xs text-foreground border-l-2 border-amber-500/60 pl-3 py-1 bg-amber-500/5">
                  {STANDALONE_SCOPE_NOTE}
                </p>
              )}
            </section>

            {exportBlocked && (
              <p className="text-xs text-muted-foreground border border-border/60 bg-muted/20 rounded-md px-3 py-2">
                <ShieldAlert className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-amber-600" />
                {exportBlocked}
              </p>
            )}

            {showReport && reportModel && (
              <section className="rounded-xl border border-border bg-background p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">
                  Report preview (client-safe payload — admin-only notes excluded)
                </div>
                <SwotStrategicMatrixReport model={reportModel} />
              </section>
            )}

            {/* Four-quadrant matrix */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {CATEGORIES.map(cat => (
                <Quadrant key={cat} category={cat}
                  items={grouped[cat]} analysisId={active.id} customerId={active.customer_id}
                  onChange={reloadItems} />
              ))}
            </section>

            {/* Signal preview */}
            <SignalPreview drafts={signalDrafts} />
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Quadrant({
  category, items, analysisId, customerId, onChange,
}: {
  category: SwotCategory; items: SwotItem[]; analysisId: string; customerId: string;
  onChange: () => Promise<void> | void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const add = async () => {
    if (!title.trim()) return;
    try {
      await adminCreateItem({ id: analysisId, customer_id: customerId }, {
        category, title: title.trim(),
      });
      setTitle(""); setAdding(false);
      await onChange();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base text-foreground font-serif">{CATEGORY_LABEL[category]}</h3>
          <p className="text-[11px] text-muted-foreground">{CATEGORY_BLURB[category]}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setAdding(s => !s)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {adding && (
        <div className="flex gap-2">
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={`New ${category}`} />
          <Button size="sm" onClick={add}>Add</Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No {CATEGORY_LABEL[category].toLowerCase()} added yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(it => (
            <ItemCard key={it.id} item={it} analysisId={analysisId}
              expanded={openId === it.id}
              onToggle={() => setOpenId(openId === it.id ? null : it.id)}
              onChange={onChange} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemCard({
  item, analysisId, expanded, onToggle, onChange,
}: {
  item: SwotItem; analysisId: string; expanded: boolean;
  onToggle: () => void; onChange: () => Promise<void> | void;
}) {
  const patch = async (p: Partial<SwotItem>) => {
    try { await adminUpdateItem(item.id, analysisId, p); await onChange(); }
    catch (e: any) { toast.error(e.message); }
  };
  const del = async () => {
    if (!confirm("Delete this item?")) return;
    try { await adminDeleteItem(item.id, analysisId); await onChange(); }
    catch (e: any) { toast.error(e.message); }
  };
  const missingEvidence = item.evidence_confidence === "missing_evidence" || item.evidence_confidence === "assumption";
  return (
    <li className="rounded-md border border-border bg-background p-2.5 space-y-2 min-w-0">
      <button type="button" onClick={onToggle} className="w-full flex items-start gap-2 text-left">
        {expanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground break-words">{item.title}</div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px]">{GEAR_LABEL[item.linked_gear]}</Badge>
            <Badge variant="outline" className="text-[10px]">{CONFIDENCE_LABEL[item.evidence_confidence]}</Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{item.severity_or_leverage}</Badge>
            {item.client_visible && <Badge variant="secondary" className="text-[10px]">Client-visible</Badge>}
            {item.repair_map_relevance && <Badge variant="outline" className="text-[10px]">Repair</Badge>}
            {item.implementation_relevance && <Badge variant="outline" className="text-[10px]">Implementation</Badge>}
            {item.campaign_relevance && <Badge variant="outline" className="text-[10px]">Campaign input</Badge>}
            {item.control_system_monitoring_relevance && <Badge variant="outline" className="text-[10px]">Control watch</Badge>}
            {item.reengagement_trigger_relevance && <Badge variant="outline" className="text-[10px]">Re-engage</Badge>}
            {missingEvidence && (
              <Badge variant="outline" className="text-[10px] border-amber-500/60 text-amber-600">
                <ShieldAlert className="h-3 w-3 mr-1" /> Evidence needed
              </Badge>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="space-y-2 pt-2 border-t border-border">
          <Field label="Title">
            <Input value={item.title} onChange={e => patch({ title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={item.description ?? ""} onChange={e => patch({ description: e.target.value })} />
          </Field>
          <Field label="Evidence summary">
            <Textarea rows={2} value={item.evidence_summary ?? ""} onChange={e => patch({ evidence_summary: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Field label="Evidence confidence">
              <Select value={item.evidence_confidence} options={CONFIDENCES}
                labels={CONFIDENCE_LABEL}
                onChange={v => patch({ evidence_confidence: v as SwotEvidenceConfidence })} />
            </Field>
            <Field label="Source type">
              <Select value={item.source_type} options={SOURCE_TYPES}
                labels={Object.fromEntries(SOURCE_TYPES.map(s => [s, s.replace(/_/g, " ")])) as Record<string, string>}
                onChange={v => patch({ source_type: v as SwotItemSourceType })} />
            </Field>
            <Field label="Linked RGS Gear">
              <Select value={item.linked_gear} options={GEARS} labels={GEAR_LABEL}
                onChange={v => patch({ linked_gear: v as SwotLinkedGear })} />
            </Field>
            <Field label="Severity / leverage">
              <Select value={item.severity_or_leverage} options={["low","moderate","high","critical"]}
                labels={{ low: "Low", moderate: "Moderate", high: "High", critical: "Critical" }}
                onChange={v => patch({ severity_or_leverage: v as SwotItem["severity_or_leverage"] })} />
            </Field>
          </div>

          <Field label="Client-safe summary (shown to client only after approval + client-visible)">
            <Textarea rows={2} value={item.client_safe_summary ?? ""}
              onChange={e => patch({ client_safe_summary: e.target.value })} />
          </Field>
          <Field label="Recommended action (client-safe)">
            <Textarea rows={2} value={item.recommended_action ?? ""}
              onChange={e => patch({ recommended_action: e.target.value })} />
          </Field>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 space-y-1">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-medium">
              <ShieldAlert className="h-3.5 w-3.5" /> Admin-only — never shown to client
            </div>
            <Textarea rows={2} value={item.admin_only_notes ?? ""}
              onChange={e => patch({ admin_only_notes: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <Toggle label="Repair Map" v={item.repair_map_relevance} onChange={v => patch({ repair_map_relevance: v })} />
            <Toggle label="Implementation" v={item.implementation_relevance} onChange={v => patch({ implementation_relevance: v })} />
            <Toggle label="Campaign input" v={item.campaign_relevance} onChange={v => patch({ campaign_relevance: v })} />
            <Toggle label="Control watch" v={item.control_system_monitoring_relevance} onChange={v => patch({ control_system_monitoring_relevance: v })} />
            <Toggle label="Re-engagement trigger" v={item.reengagement_trigger_relevance} onChange={v => patch({ reengagement_trigger_relevance: v })} />
            <Toggle label="Client-visible" v={item.client_visible} onChange={v => patch({ client_visible: v })} />
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={del}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

function SignalPreview({ drafts }: { drafts: SwotSignalDraft[] }) {
  if (drafts.length === 0) {
    return (
      <section className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-base text-foreground font-serif">Generated Signal Preview</h3>
        <p className="text-sm text-muted-foreground mt-1">
          No downstream signals will be generated until items are added.
        </p>
      </section>
    );
  }
  // Group by signal_type
  const groups = new Map<string, SwotSignalDraft[]>();
  for (const d of drafts) {
    if (!groups.has(d.signal_type)) groups.set(d.signal_type, []);
    groups.get(d.signal_type)!.push(d);
  }
  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-base text-foreground font-serif">Generated Signal Preview</h3>
        <p className="text-xs text-muted-foreground">
          These signals help RGS identify what may belong in the Repair Map, Implementation plan,
          Control System monitoring, or future campaign planning. Persisted on approval.
        </p>
      </div>
      <ul className="space-y-2">
        {[...groups.entries()].map(([type, list]) => (
          <li key={type} className="rounded-md border border-border p-3 bg-background">
            <div className="flex items-center justify-between">
              <div className="text-sm text-foreground font-medium">{SIGNAL_LABEL[type as keyof typeof SIGNAL_LABEL] ?? type}</div>
              <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {list.slice(0, 5).map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Badge variant={s.client_safe ? "secondary" : "outline"} className="text-[10px] shrink-0">
                    {s.client_safe ? "client-safe" : "admin-only"}
                  </Badge>
                  {s.gear && <Badge variant="outline" className="text-[10px] shrink-0">{GEAR_LABEL[s.gear]}</Badge>}
                  <span className="break-words">{s.summary}</span>
                </li>
              ))}
              {list.length > 5 && (
                <li className="italic">+ {list.length - 5} more on approval</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Select<T extends string>({
  value, options, labels, onChange,
}: {
  value: T; options: readonly T[] | T[]; labels: Record<string, string>;
  onChange: (v: T) => void;
}) {
  return (
    <select className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
      value={value} onChange={e => onChange(e.target.value as T)}>
      {options.map(o => <option key={o} value={o}>{labels[o] ?? o}</option>)}
    </select>
  );
}

function Toggle({ label, v, onChange }: { label: string; v: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground min-w-0">
      <input type="checkbox" checked={v} onChange={e => onChange(e.target.checked)} />
      <span className="truncate">{label}</span>
    </label>
  );
}