import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  stageLabel,
  formatDate,
  categoryLabel,
  DIAGNOSTIC_STATUS,
  IMPLEMENTATION_STATUS,
  PAYMENT_STATUS,
  labelOf,
  isImplementationStage,
  TOOL_CATEGORIES,
  toolCategoryShort,
  assignmentSourceLabel,
  type ToolCategory,
  type AssignmentSource,
} from "@/lib/portal";
import { isClientVisible } from "@/lib/visibility";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import { BRANDS } from "@/config/brands";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Download,
  Image as ImageIcon,
  Plus,
  CheckCircle2,
  Circle,
  Copy,
  Upload as UploadIcon,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Archive,
  ArchiveRestore,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { logPortalAudit } from "@/lib/portalAudit";
import { classifyToolUrl, classifyTool, launchToolTarget } from "@/lib/toolLaunch";
import { AssignUserDialog } from "@/components/admin/AssignUserDialog";
import { AssignToolsDialog } from "@/components/admin/AssignToolsDialog";
import { CustomerToolMatrixPanel } from "@/components/admin/CustomerToolMatrixPanel";
import { CustomerToolUsagePanel } from "@/components/admin/CustomerToolUsagePanel";
import { useAuth } from "@/contexts/AuthContext";
import { CustomerConsistencyBanner } from "@/components/admin/consistency/CustomerConsistencyBanner";
import { seedAutoBasicAssignments } from "@/lib/admin/autoBasicAssign";
import { CustomerLeakIntelligencePanel } from "@/components/intelligence/CustomerLeakIntelligencePanel";
import { AdminCustomerMetricsPanel } from "@/components/intelligence/AdminCustomerMetricsPanel";
import { AdminMetricContextPanel } from "@/components/intelligence/AdminMetricContextPanel";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";
import type { IndustryCategory } from "@/lib/priorityEngine/types";

const KNOWN_INDUSTRIES_FOR_METRICS: ReadonlyArray<IndustryCategory> = [
  "trade_field_service",
  "retail",
  "restaurant",
  "mmj_cannabis",
  "general_service",
  "other",
];
function resolveIndustryForCustomer(value: string | null | undefined): IndustryCategory {
  const v = (value ?? "").trim() as IndustryCategory;
  return KNOWN_INDUSTRIES_FOR_METRICS.includes(v) ? v : "general_service";
}
import {
  DX_STEPS,
  buildDxStatus,
  dxProgress,
  isDxItem,
  seedDiagnosticChecklist,
  type DxStepStatus,
} from "@/lib/diagnostics/checklist";
import {
  INTAKE_SECTIONS,
  buildIntakeProgress,
  loadIntakeAnswers,
  type IntakeAnswerRow,
} from "@/lib/diagnostics/intake";
import {
  buildDiagnosticDraftSnapshot,
  computeDiagnosticReadiness,
  createDiagnosticDraft,
  createHandoffTasks,
  findExistingDiagnosticDraft,
  HANDOFF_TASK_TITLES,
  isHandoffTaskTitle,
} from "@/lib/diagnostics/draft";
import { DiagnosticCompletionWorkflow } from "@/components/diagnostics/DiagnosticCompletionWorkflow";
import { isRccResource } from "@/lib/access/rccResource";
import {
  computeRccEntitlement,
  reasonLabel as rccReasonLabel,
} from "@/lib/access/rccEntitlement";
import { EngagementBillingSection } from "@/components/admin/EngagementBillingSection";
import { CustomerImpactSection } from "@/components/impact/CustomerImpactSection";
import { emptyDraft as emptyImpactDraft, type ImpactDraft } from "@/lib/impact/ledger";
import { AdminStabilityScorePanel } from "@/components/admin/AdminStabilityScorePanel";
import { AutoStabilityRescorePanel } from "@/components/admin/AutoStabilityRescorePanel";
import { AdminRecommendationsPanel } from "@/components/admin/AdminRecommendationsPanel";
import { SuggestedGuidancePanel } from "@/components/admin/SuggestedGuidancePanel";
import { LearningControlsCard } from "@/components/admin/LearningControlsCard";
import { InsightSignalsPanel } from "@/components/admin/InsightSignalsPanel";
import { CashPositionObligationsPanel } from "@/components/admin/CashPositionObligationsPanel";
import { MonthlyClosePanel } from "@/components/admin/MonthlyClosePanel";
import { CadenceCompliancePanel } from "@/components/admin/CadenceCompliancePanel";
import { AcquisitionControlCenterPanel } from "@/components/admin/AcquisitionControlCenterPanel";
import { ClientSalesPipelinePanel } from "@/components/admin/ClientSalesPipelinePanel";
import { ProfitabilityPanel } from "@/components/admin/ProfitabilityPanel";
import { IntegrationsPanel } from "@/components/admin/IntegrationsPanel";
import { OperationsPanel } from "@/components/admin/OperationsPanel";
import { RevenueReviewPanel } from "@/components/admin/RevenueReviewPanel";
import { DiagnosticRunsHistoryPanel } from "@/components/admin/DiagnosticRunsHistoryPanel";
import { PackageLifecyclePanel } from "@/components/admin/PackageLifecyclePanel";
import { IndustryAssignmentField } from "@/components/admin/IndustryAssignmentField";
import { OperationalProfilePanel } from "@/components/admin/OperationalProfilePanel";
import { OutcomeReviewPanel } from "@/components/admin/OutcomeReviewPanel";
import { OperationalProfileCompletenessBadge } from "@/components/admin/OperationalProfileCompletenessBadge";
import { ToolAccessPanel } from "@/components/admin/ToolAccessPanel";
import { IndustryProfileTemplatePanel } from "@/components/admin/IndustryProfileTemplatePanel";
import { ClientBusinessSnapshotPanel } from "@/components/admin/ClientBusinessSnapshotPanel";
import { ClientSnapshotSummaryBar } from "@/components/admin/ClientSnapshotSummaryBar";
import { detectIndustryMismatch } from "@/lib/industryIntake";
import { adminAccountLinks } from "@/lib/adminAccountLinks";

// Stages at which the diagnostic checklist is relevant.
const DX_STAGES = new Set([
  "diagnostic_paid",
  "diagnostic_in_progress",
  "diagnostic_delivered",
  "decision_pending",
  "diagnostic_complete",
  "follow_up_nurture",
]);

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { setPreviewCustomer } = useAuth();
  const [c, setC] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [allResources, setAllResources] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [toolRuns, setToolRuns] = useState<any[]>([]);
  const [snapshotSummary, setSnapshotSummary] = useState<any>(null);
  const [intakeAnswers, setIntakeAnswers] = useState<IntakeAnswerRow[]>([]);
  const [newNote, setNewNote] = useState("");
  const [selectedResource, setSelectedResource] = useState("");
  const [newTask, setNewTask] = useState({ title: "", due_date: "" });
  const [newChecklist, setNewChecklist] = useState("");
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [confirmAddon, setConfirmAddon] = useState(false);
  const [assignUserOpen, setAssignUserOpen] = useState(false);
  const [assignToolsOpen, setAssignToolsOpen] = useState(false);

  const load = async () => {
    if (!id) return;
    const [cust, notesRes, assignRes, resRes, taskRes, chkRes, tlRes, upRes, runsRes, snapRes] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase.from("customer_notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("resource_assignments").select("id, assigned_at, assignment_source, visibility_override, resources(*)").eq("customer_id", id),
      supabase.from("resources").select("*").order("title"),
      supabase.from("customer_tasks").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("checklist_items").select("*").eq("customer_id", id).order("position"),
      supabase.from("customer_timeline").select("*").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
      supabase.from("customer_uploads").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase.from("tool_runs").select("id, tool_key, title, created_at, updated_at").eq("customer_id", id).order("created_at", { ascending: false }),
      supabase
        .from("client_business_snapshots")
        .select("what_business_does, products_services, revenue_model, operating_model, snapshot_status, industry_verified")
        .eq("customer_id", id)
        .maybeSingle(),
    ]);
    if (cust.data) setC(cust.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (assignRes.data) setAssigned(assignRes.data);
    if (resRes.data) setAllResources(resRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    if (chkRes.data) setChecklist(chkRes.data);
    if (tlRes.data) setTimeline(tlRes.data);
    if (upRes.data) setUploads(upRes.data);
    if (runsRes.data) setToolRuns(runsRes.data);
    setSnapshotSummary(snapRes.data ?? null);

    // Idempotently seed the diagnostic checklist when the customer is in
    // (or past) diagnostic_paid. Safe to call repeatedly — only inserts
    // missing [DX] rows.
    if (cust.data && DX_STAGES.has(cust.data.stage)) {
      try {
        const inserted = await seedDiagnosticChecklist(id);
        if (inserted > 0) {
          const { data: chk2 } = await supabase
            .from("checklist_items").select("*").eq("customer_id", id).order("position");
          if (chk2) setChecklist(chk2);
        }
      } catch (_e) { /* non-fatal */ }

      try {
        const ans = await loadIntakeAnswers(id);
        setIntakeAnswers(ans);
      } catch (_e) { /* non-fatal */ }
    }

    // P7.4.2 — Idempotently seed auto-basic client resources (e.g., Onboarding
    // Worksheet) for implementation-track customers. No-op for diagnostic-only
    // stages, never touches RCC/visibility overrides.
    if (cust.data) {
      try {
        const res = await seedAutoBasicAssignments(id, cust.data.stage);
        if (res.inserted > 0) {
          const { data: assign2 } = await supabase
            .from("resource_assignments")
            .select("id, assigned_at, assignment_source, visibility_override, resources(*)")
            .eq("customer_id", id);
          if (assign2) setAssigned(assign2);
        }
      } catch (_e) { /* non-fatal */ }
    }
  };

  useEffect(() => { load(); }, [id]);

  // P31.1 — Deep-link support: when the URL hash targets the outcome-review
  // section, scroll it into view once the customer record (and the panel) are
  // mounted. ScrollToTop runs on route change; this effect runs after data
  // loads and overrides it for the specific anchor.
  useEffect(() => {
    if (!c) return;
    const hash = location.hash?.replace(/^#/, "");
    if (!hash) return;
    // rAF gives the conditionally-mounted panel a tick to attach.
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [c, location.hash]);

  // P9.0 — Tab-aware URL (?tab=impact) and review-queue handoff prefill
  const tabParam = searchParams.get("tab") || "overview";
  const initialImpactDraft = useMemo<ImpactDraft | null>(() => {
    if (!id) return null;
    const stashKey = "rgs.impact.prefill";
    try {
      const raw = sessionStorage.getItem(stashKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.customer_id === id) {
        return { ...emptyImpactDraft(id), ...parsed };
      }
    } catch {
      // ignore
    }
    return null;
  }, [id, tabParam]);

  const consumeImpactDraft = () => {
    try {
      sessionStorage.removeItem("rgs.impact.prefill");
    } catch {
      // ignore
    }
  };

  const updateField = async (field: string, value: any) => {
    setC({ ...c, [field]: value });
    const { error } = await supabase.from("customers").update({ [field]: value } as any).eq("id", id);
    if (error) toast.error("Update failed");
    else {
      // P19 audit — log only the field name(s), never before/after values.
      void logPortalAudit("client_record_updated", id, {
        fields_changed: [field],
      });
    }
  };

  const addNote = async () => {
    // TODO(P19 audit): wire admin_note_edited once an in-place note edit UI
    // is added. Currently notes can only be created.
    if (!newNote.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase
      .from("customer_notes")
      .insert([{ customer_id: id, content: newNote, author_id: u.user?.id }])
      .select("id")
      .maybeSingle();
    if (error) toast.error("Note failed");
    else {
      // P19 audit — never log note content.
      void logPortalAudit("admin_note_created", id, {
        note_id: (inserted as any)?.id ?? null,
        visibility: "admin_only",
      });
      setNewNote(""); load();
    }
  };

  const assignResource = async () => {
    if (!selectedResource) return;
    const { error } = await supabase
      .from("resource_assignments")
      .insert([{ customer_id: id, resource_id: selectedResource, assignment_source: "manual" } as any]);
    if (error) toast.error(error.message);
    else { toast.success("Resource assigned"); setSelectedResource(""); load(); }
  };

  const unassign = async (aid: string) => {
    await supabase.from("resource_assignments").delete().eq("id", aid);
    load();
  };

  const confirmAssignAddons = async () => {
    if (selectedAddons.size === 0) return;
    const rows = Array.from(selectedAddons).map((rid) => ({
      customer_id: id,
      resource_id: rid,
      assignment_source: "addon" as const,
    }));
    const { error } = await supabase.from("resource_assignments").insert(rows as any);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${rows.length} add-on tool${rows.length === 1 ? "" : "s"} assigned`);
    setSelectedAddons(new Set());
    setAddonDialogOpen(false);
    setConfirmAddon(false);
    load();
  };

  const duplicateTemplate = async (resourceId: string) => {
    const original = allResources.find((r) => r.id === resourceId);
    if (!original) return;
    const { data: u } = await supabase.auth.getUser();
    const copy = {
      title: `${original.title} — ${c.business_name || c.full_name}`,
      description: original.description,
      category: "client_specific",
      resource_type: original.resource_type,
      visibility: "customer",
      url: original.url,
      screenshot_url: original.screenshot_url,
      downloadable: original.downloadable,
      created_by: u.user?.id,
    };
    const { data, error } = await supabase.from("resources").insert([copy as any]).select("id").single();
    if (error || !data) return toast.error(error?.message || "Failed");
    await supabase.from("resource_assignments").insert([{ customer_id: id, resource_id: data.id }]);
    toast.success("Template duplicated and assigned");
    load();
  };

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_tasks").insert([{
      customer_id: id, title: newTask.title, due_date: newTask.due_date || null, created_by: u.user?.id,
    }]);
    if (error) return toast.error(error.message);
    setNewTask({ title: "", due_date: "" });
    load();
  };
  const toggleTask = async (t: any) => {
    const status = t.status === "done" ? "open" : "done";
    await supabase.from("customer_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    load();
  };
  const removeTask = async (tid: string) => {
    await supabase.from("customer_tasks").delete().eq("id", tid);
    load();
  };

  const addChecklistItem = async () => {
    if (!newChecklist.trim()) return;
    const pos = checklist.length;
    await supabase.from("checklist_items").insert([{ customer_id: id, title: newChecklist, position: pos }]);
    setNewChecklist("");
    load();
  };
  const toggleChecklist = async (item: any) => {
    await supabase.from("checklist_items").update({
      completed: !item.completed,
      completed_at: !item.completed ? new Date().toISOString() : null,
    }).eq("id", item.id);
    load();
  };
  const removeChecklist = async (cid: string) => {
    await supabase.from("checklist_items").delete().eq("id", cid);
    load();
  };

  const adminUpload = async (file: File) => {
    const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("client-uploads").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("client-uploads").getPublicUrl(path);
    await supabase.from("customer_uploads").insert([{
      customer_id: id, file_name: file.name, file_path: path, file_url: data.publicUrl, size_bytes: file.size,
    }]);
    toast.success("Uploaded");
    load();
  };

  if (!c)
    return (
      <PortalShell variant="admin">
        <div className="text-muted-foreground">Loading…</div>
      </PortalShell>
    );

  const customerVisibleResources = allResources.filter((r) => isClientVisible(r.visibility));
  const internalResources = allResources.filter((r) => !isClientVisible(r.visibility));
  const industryMismatch = detectIndustryMismatch({
    industry: (c as any).industry ?? null,
    what_business_does: snapshotSummary?.what_business_does ?? null,
    products_services: snapshotSummary?.products_services ?? null,
    revenue_model: snapshotSummary?.revenue_model ?? null,
    operating_model: snapshotSummary?.operating_model ?? null,
  });

  return (
    <PortalShell variant="admin">
      <Link to="/admin/customers" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> All customers
      </Link>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{c.business_name || "Client"}</div>
          <h1 className="mt-1 text-3xl text-foreground">{c.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="primary">{stageLabel(c.stage)}</Badge>
            <Badge tone="muted">DX: {labelOf(DIAGNOSTIC_STATUS, c.diagnostic_status)}</Badge>
            <Badge tone="muted">IM: {labelOf(IMPLEMENTATION_STATUS, c.implementation_status)}</Badge>
            <Badge tone={c.payment_status === "unpaid" ? "warn" : "ok"}>
              {labelOf(PAYMENT_STATUS, c.payment_status)}
            </Badge>
            {c.portal_unlocked && <Badge tone="ok">Portal Unlocked</Badge>}
            {c.archived_at && <Badge tone="warn">Archived</Badge>}
            {c.is_demo_account && <Badge tone="warn">Demo</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={c.stage}
            onChange={(e) => updateField("stage", e.target.value)}
            className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => setAssignToolsOpen(true)}
            className="bg-primary hover:bg-secondary"
          >
            <Sparkles className="h-3.5 w-3.5" /> Assign Tools
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            title="Open the client portal in preview mode using this client's record"
            onClick={() => {
              setPreviewCustomer(c.id);
              navigate("/portal");
            }}
          >
            <Eye className="h-3.5 w-3.5" /> Preview this client
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            title="Open Report Drafts with this client preselected — generates a deterministic, free-safe draft. No paid AI."
            onClick={() =>
              navigate(`/admin/report-drafts?customer=${c.id}&type=diagnostic`)
            }
          >
            <FileText className="h-3.5 w-3.5" /> Generate Draft Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-border"
            onClick={async () => {
              const archived_at = c.archived_at ? null : new Date().toISOString();
              const { error } = await supabase.from("customers").update({ archived_at } as any).eq("id", id);
              if (error) toast.error(error.message);
              else { toast.success(archived_at ? "Client archived" : "Client restored"); load(); }
            }}
            title={c.archived_at ? "Restore client" : "Archive client (hides from active lists)"}
          >
            {c.archived_at ? (<><ArchiveRestore className="h-3.5 w-3.5" /> Restore</>) : (<><Archive className="h-3.5 w-3.5" /> Archive</>)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={async () => {
              const first = window.confirm(`Permanently delete ${c.full_name}? This will also delete all related notes, tasks, tool assignments, and uploads. This cannot be undone.`);
              if (!first) return;
              const second = window.prompt(`Type the client's email to confirm permanent delete:\n${c.email}`);
              if (second?.trim().toLowerCase() !== (c.email || "").toLowerCase()) {
                toast.error("Confirmation did not match. Delete cancelled.");
                return;
              }
              // Manual cascade for tables without FK cascade
              await Promise.all([
                supabase.from("resource_assignments").delete().eq("customer_id", id),
                supabase.from("customer_notes").delete().eq("customer_id", id),
                supabase.from("customer_tasks").delete().eq("customer_id", id),
                supabase.from("checklist_items").delete().eq("customer_id", id),
                supabase.from("customer_timeline").delete().eq("customer_id", id),
                supabase.from("customer_uploads").delete().eq("customer_id", id),
              ]);
              const { error } = await supabase.from("customers").delete().eq("id", id);
              if (error) toast.error(error.message);
              else { toast.success("Client deleted"); navigate("/admin/customers"); }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <CustomerConsistencyBanner
          customer={{
            id: c.id,
            full_name: c.full_name,
            business_name: c.business_name,
            stage: c.stage,
            lifecycle_state: (c as any).lifecycle_state,
            is_demo_account: (c as any).is_demo_account,
            contributes_to_global_learning: (c as any).contributes_to_global_learning,
            portal_unlocked: c.portal_unlocked,
            package_diagnostic: (c as any).package_diagnostic,
            package_implementation: (c as any).package_implementation,
            package_full_bundle: (c as any).package_full_bundle,
            package_revenue_tracker: (c as any).package_revenue_tracker,
            rcc_subscription_status: (c as any).rcc_subscription_status,
            industry: (c as any).industry,
            industry_confirmed_by_admin: (c as any).industry_confirmed_by_admin,
            needs_industry_review: (c as any).needs_industry_review,
            hasIndustryMismatch: industryMismatch.mismatch,
            snapshot_status: snapshotSummary?.snapshot_status ?? null,
            snapshot_industry_verified: !!snapshotSummary?.industry_verified,
            toolsAssigned: assigned.length,
            hasRccResource: assigned.some((a: any) => isRccResource(a.resources)),
          }}
          onChanged={() => load()}
          onAssignTools={() => setAssignToolsOpen(true)}
        />
      </div>

      {/* P32.1 — Persistent admin-only client business snapshot summary,
          visible across all customer detail tabs. */}
      <div className="mb-4">
        <ClientSnapshotSummaryBar customerId={c.id} />
      </div>

      {/* P32.2 — Prominent industry assignment & verification panel,
          visible across all tabs. Anchors `#industry-assignment` for fix
          links from cross-OS warnings. */}
      <div className="mb-6 rounded-md border border-border bg-card/40 p-4 scroll-mt-24" id="industry-assignment">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Industry assignment</h3>
            <p className="text-[11px] text-muted-foreground">
              Admin-confirmed industry gates industry-specific tools, learning, and templates. Intake selections are never treated as confirmed.
            </p>
          </div>
        </div>
        <IndustryAssignmentField customerId={c.id} onChanged={load} />
      </div>

      <Tabs
        value={tabParam}
        onValueChange={(v) => setSearchParams((sp) => {
          const next = new URLSearchParams(sp);
          next.set("tab", v);
          return next;
        })}
        className="w-full"
      >
        {/* P13.H — 17-tab strip overflowed the page horizontally on narrower
            desktops. Wrap the trigger list in its own scroller so the page
            itself never gains a horizontal scrollbar. */}
        <div className="mb-6 -mx-1 overflow-x-auto">
          <TabsList className="bg-card border border-border rounded-lg p-1 mx-1 inline-flex w-max max-w-none h-auto flex-nowrap">
            {["overview","diagnostic","revenue-review","stability","acquisition","pipeline","profitability","operations","integrations","timeline","impact","notes","tasks","tools","files","access","billing"].map((k) => (
              <TabsTrigger key={k} value={k} className="capitalize text-xs whitespace-nowrap data-[state=active]:bg-primary/15 data-[state=active]:text-foreground">
                {k}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-6">
          <div id="package-lifecycle" className="scroll-mt-24">
            <PackageLifecyclePanel customer={c} onUpdated={load} />
          </div>
          {/* P32 — Admin-only Client Business Snapshot & Industry Verification */}
          <div id="business-snapshot" className="scroll-mt-24">
            <ClientBusinessSnapshotPanel customerId={c.id} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Section title="Contact & Business" className="lg:col-span-3">
              <FieldRow label="Name" value={
                <input defaultValue={c.full_name || ""} onBlur={(e) => updateField("full_name", e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Email" value={
                <input defaultValue={c.email || ""} onBlur={(e) => updateField("email", e.target.value)}
                  type="email" className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Phone" value={
                <input defaultValue={c.phone || ""} onBlur={(e) => updateField("phone", e.target.value)}
                  placeholder="—" className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Business" value={
                <input defaultValue={c.business_name || ""} onBlur={(e) => updateField("business_name", e.target.value)}
                  placeholder="—" className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Service" value={
                <input defaultValue={c.service_type || ""} onBlur={(e) => updateField("service_type", e.target.value)}
                  className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
              <FieldRow label="Industry" value={
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("industry-assignment");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="text-left text-sm text-primary hover:text-secondary"
                >
                  {(c as any).industry || "Assign industry"} · open verifier
                </button>
              } />
              <FieldRow label="Description" value={
                <textarea defaultValue={c.business_description || ""} onBlur={(e) => updateField("business_description", e.target.value)}
                  rows={3} className="w-full bg-transparent text-sm text-foreground focus:outline-none resize-none" />
              } />
              <FieldRow label="Next Action" value={
                <input defaultValue={c.next_action || ""} onBlur={(e) => updateField("next_action", e.target.value)}
                  placeholder="e.g. Send onboarding email" className="bg-transparent text-sm text-foreground focus:outline-none w-full" />
              } />
            </Section>

            <div className="lg:col-span-2">
              <div className="mb-2">
                <OperationalProfileCompletenessBadge customerId={c.id} />
              </div>
              <OperationalProfilePanel customerId={c.id} />
              {/* P31.1 — Stable anchor target for /admin/outcomes deep-link. */}
              <div className="mt-4 scroll-mt-24" id="outcome-review">
                <OutcomeReviewPanel customerId={c.id} />
              </div>
            </div>

            <Section title="Status" className="lg:col-span-2">
              <div className="space-y-4">
                <StackedSelect
                  label="Diagnostic"
                  value={c.diagnostic_status}
                  options={DIAGNOSTIC_STATUS}
                  onChange={(v) => updateField("diagnostic_status", v)}
                />
                <StackedSelect
                  label="Implementation"
                  value={c.implementation_status}
                  options={IMPLEMENTATION_STATUS}
                  onChange={(v) => updateField("implementation_status", v)}
                />
                <StackedSelect
                  label="Payment"
                  value={c.payment_status}
                  options={PAYMENT_STATUS}
                  onChange={(v) => updateField("payment_status", v)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <StackedRow label="Track">
                    <span className="text-sm text-foreground capitalize">
                      {c.track || "shared"}
                    </span>
                  </StackedRow>
                  <StackedRow label="Last activity">
                    <span className="text-sm text-foreground">
                      {formatDate(c.last_activity_at || c.updated_at)}
                    </span>
                  </StackedRow>
                </div>

                <StackedRow label="Linked account">
                  {c.user_id ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Linked
                      </span>
                      <code
                        className="text-[10px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded truncate max-w-[140px]"
                        title={c.user_id}
                      >
                        {c.user_id.slice(0, 8)}…
                      </code>
                      <div className="ml-auto flex items-center gap-3">
                        <button
                          onClick={() => setAssignUserOpen(true)}
                          className="text-[11px] text-primary hover:underline whitespace-nowrap"
                        >
                          Change
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("Unlink this user from the customer record? They will keep their auth account but lose portal access via this customer.")) return;
                            const { error } = await adminAccountLinks.setCustomerUserLink(id!, null).then(
                              () => ({ error: null as any }),
                              (error) => ({ error }),
                            );
                            if (error) toast.error(error.message);
                            else { toast.success("User unlinked"); load(); }
                          }}
                          className="text-[11px] text-destructive hover:underline whitespace-nowrap"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-amber-400 text-xs whitespace-nowrap">
                        <AlertTriangle className="h-3.5 w-3.5" /> No signed-in user
                      </span>
                      <button
                        onClick={() => setAssignUserOpen(true)}
                        className="ml-auto inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 whitespace-nowrap"
                      >
                        Assign user
                      </button>
                    </div>
                  )}
                </StackedRow>

                <StackedRow label="Workspace">
                  <button
                    onClick={() => updateField("portal_unlocked", !c.portal_unlocked)}
                    className={`inline-flex w-full items-center justify-center text-xs whitespace-nowrap px-3 py-1.5 rounded-md border transition-colors ${
                      c.portal_unlocked
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                        : "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25"
                    }`}
                  >
                    {c.portal_unlocked
                      ? "Active (click to deactivate)"
                      : "Inactive (click to activate)"}
                  </button>
                </StackedRow>

                <Link
                  to={`/admin/clients/${c.id}/business-control`}
                  className="mt-2 flex w-full items-center justify-center gap-2 px-3 py-2 rounded-md border border-primary/40 text-xs text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Open Business Control review →
                </Link>
              </div>
            </Section>
          </div>
        </TabsContent>

        {/* DIAGNOSTIC */}
        <TabsContent value="diagnostic" className="space-y-6">
          <DiagnosticPanel
            customer={c}
            checklist={checklist}
            toolRuns={toolRuns}
            assigned={assigned}
            uploads={uploads}
            intakeAnswers={intakeAnswers}
            reload={load}
            latestReportId={timeline.find((t) => t.event_type === "report_published")?.detail || null}
          />
          {/* P11.8 — Diagnostic sub-tools versioned history + signal emission */}
          <DiagnosticRunsHistoryPanel customerId={id!} />
          {/* P20.6 — Mount the existing intelligence pipeline with this
              customer's industry + estimates so admins can promote ranked
              issues into draft/admin-review client tasks. */}
          {isCustomerFlowAccount(c) && (
            <AdminCustomerMetricsPanel
              customer={c}
              industry={resolveIndustryForCustomer(c.industry)}
              onSaved={load}
            />
          )}
          <CustomerLeakIntelligencePanel customer={c} />
        </TabsContent>

        {/* NOTES */}
        <TabsContent value="notes">
          <Section title="Internal Notes">
            <div className="space-y-3 mb-4">
              {notes.length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
              {notes.map((n) => (
                <div key={n.id} className="bg-muted/30 border border-border rounded-md p-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap">{n.content}</div>
                  <div className="text-[10px] text-muted-foreground mt-2">{formatDate(n.created_at)}</div>
                </div>
              ))}
            </div>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" rows={3} className="bg-muted/40 border-border" />
            <Button onClick={addNote} size="sm" className="mt-2 bg-primary hover:bg-secondary">Add note</Button>
          </Section>
        </TabsContent>

        {/* FILES */}
        <TabsContent value="files">
          <Section title="Client Uploads">
            <p className="text-xs text-muted-foreground mb-4">
              Files uploaded by the client appear here. You can also upload files on their behalf.
            </p>
            <label className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-4">
              <UploadIcon className="h-3.5 w-3.5" /> Upload file for client
              <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && adminUpload(e.target.files[0])} />
            </label>
            <div className="space-y-2">
              {uploads.length === 0 && <div className="text-xs text-muted-foreground">No uploads yet.</div>}
              {uploads.map((u) => (
                <a key={u.id} href={u.file_url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40">
                  <FileText className="h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">{u.file_name}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(u.created_at)}</div>
                  </div>
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* TOOLS */}
        <TabsContent value="tools" className="space-y-6">
          <CustomerToolMatrixPanel customerId={id!} stage={c?.stage} />
          <CustomerToolUsagePanel customerId={id!} />
          <Section title="Assigned Tools">
            <div className="flex items-center justify-between mb-4 -mt-2">
              <p className="text-[11px] text-muted-foreground">
                Diagnostic & Implementation tools auto-assign by stage. Add-On tools must be assigned manually below.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setAssignToolsOpen(true)}
                  className="bg-primary hover:bg-secondary"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Assign Tools
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setSelectedAddons(new Set()); setAddonDialogOpen(true); }}
                  className="border-border"
                >
                  Add-On bulk
                </Button>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {assigned.length === 0 && (
                <div className="text-xs text-muted-foreground">No tools assigned yet.</div>
              )}
              {assigned.map((a) => {
                const launch = classifyTool(
                  { title: a.resources?.title, url: a.resources?.url },
                  "admin",
                );
                const isClickable = launch.kind !== "none";

                return (
                <div
                  key={a.id}
                  className={`bg-muted/30 border border-border rounded-md p-3 ${isClickable ? "cursor-pointer hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" : ""}`}
                  onClick={isClickable ? () => launchToolTarget(launch, navigate) : undefined}
                  onKeyDown={(e) => {
                    if (!isClickable) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      launchToolTarget(launch, navigate);
                    }
                  }}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={isClickable ? `Open ${a.resources?.title || "resource"}` : undefined}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 text-primary mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-sm text-foreground truncate">{a.resources?.title}</div>
                        <VisibilityBadge
                          visibility={a.resources?.visibility}
                          override={a.visibility_override}
                          size="sm"
                        />
                        {a.resources?.tool_category && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/60 text-muted-foreground border-muted-foreground/30">
                            {toolCategoryShort(a.resources.tool_category)}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            a.assignment_source === "addon"
                              ? "bg-primary/15 text-primary border-primary/40"
                              : a.assignment_source === "stage"
                              ? "bg-secondary/15 text-secondary border-secondary/40"
                              : "bg-muted/40 text-muted-foreground border-border"
                          }`}
                          title="Assignment source"
                        >
                          {assignmentSourceLabel(a.assignment_source)}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        {categoryLabel(a.resources?.category)} · {a.resources?.resource_type}
                      </div>
                    </div>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); unassign(a.id); }} className="text-muted-foreground hover:text-destructive" aria-label="Unassign">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pl-7">
                    {!isClickable && (
                      <span className="text-[11px] text-muted-foreground italic">Not connected</span>
                    )}
                    {a.resources?.url && a.resources?.downloadable && (
                      <a href={a.resources.url} download onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <Download className="h-3 w-3" /> Download
                      </a>
                    )}
                    {a.resources?.screenshot_url && (
                      <a href={a.resources.screenshot_url} download onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                        <ImageIcon className="h-3 w-3" /> Screenshot
                      </a>
                    )}
                  </div>
                </div>
              )})}
            </div>
            <div className="flex gap-2">
              <select value={selectedResource} onChange={(e) => setSelectedResource(e.target.value)}
                className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="">Select a customer-visible tool…</option>
                {customerVisibleResources.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              <Button onClick={assignResource} size="sm" className="bg-primary hover:bg-secondary">Assign</Button>
            </div>
          </Section>

          <Section title="Duplicate Template into Client Version">
            <p className="text-xs text-muted-foreground mb-3">
              Pick any internal or customer template — a client-specific copy will be created and auto-assigned.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {internalResources.concat(customerVisibleResources).slice(0, 12).map((r) => (
                <button key={r.id} onClick={() => duplicateTemplate(r.id)}
                  className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40 text-left">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground">{categoryLabel(r.category)}</div>
                  </div>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-6">
          <Section title="Tasks">
            <div className="space-y-2 mb-4">
              {tasks.length === 0 && <div className="text-xs text-muted-foreground">No tasks yet.</div>}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border">
                  <button onClick={() => toggleTask(t)} className="mt-0.5 text-primary">
                    {t.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                    {t.due_date && <div className="text-[10px] text-muted-foreground">Due {formatDate(t.due_date)}</div>}
                  </div>
                  <button onClick={() => removeTask(t.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-muted/40 border-border" />
              <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="bg-muted/40 border-border w-44" />
              <Button onClick={addTask} size="sm" className="bg-primary hover:bg-secondary">
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </Section>

          {isImplementationStage(c.stage) && (
            <Section title="Implementation Checklist">
              <div className="space-y-2 mb-4">
                {checklist.filter((i) => !isDxItem(i.title)).length === 0 && <div className="text-xs text-muted-foreground">No checklist items.</div>}
                {checklist.filter((i) => !isDxItem(i.title)).map((it) => (
                  <div key={it.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border">
                    <button onClick={() => toggleChecklist(it)} className="mt-0.5 text-primary">
                      {it.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div className={`flex-1 text-sm ${it.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{it.title}</div>
                    <button onClick={() => removeChecklist(it.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="New checklist item" value={newChecklist} onChange={(e) => setNewChecklist(e.target.value)} className="bg-muted/40 border-border" />
                <Button onClick={addChecklistItem} size="sm" className="bg-primary hover:bg-secondary">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </Section>
          )}
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <Section title="Activity Timeline">
            <div className="space-y-3">
              {timeline.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
              {timeline.map((t) => (
                <div key={t.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                  <div className="w-1 bg-primary/40 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground">{t.title}</div>
                    {t.detail && <div className="text-xs text-muted-foreground mt-0.5">{t.detail}</div>}
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                      {t.event_type.replace(/_/g, " ")} · {formatDate(t.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        {/* IMPACT — P9.0 RGS Impact Ledger™ */}
        <TabsContent value="impact" className="space-y-6">
          <CustomerImpactSection
            customerId={id!}
            initialDraft={initialImpactDraft}
            onConsumedInitialDraft={consumeImpactDraft}
          />
        </TabsContent>

        {/* STABILITY — P10.0 Score Benchmark + STOP/START/SCALE */}
        <TabsContent value="stability" className="space-y-6">
          <AdminStabilityScorePanel customerId={id!} />
          <AutoStabilityRescorePanel customerId={id!} />
          <LearningControlsCard customerId={id!} />
          <CadenceCompliancePanel customerId={id!} />
          <MonthlyClosePanel customerId={id!} />
          <CashPositionObligationsPanel customerId={id!} />
          <SuggestedGuidancePanel customerId={id!} />
          <InsightSignalsPanel customerId={id!} />
          <AdminRecommendationsPanel customerId={id!} />
        </TabsContent>

        {/* ACQUISITION — P11.4 Acquisition Control Center */}
        <TabsContent value="acquisition" className="space-y-6">
          <AcquisitionControlCenterPanel customerId={id!} />
        </TabsContent>

        {/* PIPELINE — P11.5 Client Sales Pipeline */}
        <TabsContent value="pipeline" className="space-y-6">
          <ClientSalesPipelinePanel customerId={id!} />
        </TabsContent>

        {/* PROFITABILITY — P11.6 Offer + Client Profitability */}
        <TabsContent value="profitability" className="space-y-6">
          <ProfitabilityPanel customerId={id!} />
        </TabsContent>

        {/* INTEGRATIONS — P11.7 Integrations Layer (QuickBooks first) */}
        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsPanel customerId={id!} />
        </TabsContent>

        {/* OPERATIONS — P11.9 Operations Module */}
        <TabsContent value="operations" className="space-y-6">
          <OperationsPanel customerId={id!} />
        </TabsContent>

        {/* REVENUE REVIEW — P11.10 Revenue Review Diagnostic */}
        <TabsContent value="revenue-review" className="space-y-6">
          <RevenueReviewPanel customerId={id!} />
        </TabsContent>

        {/* ACCESS */}
        <TabsContent value="access" className="space-y-6">
          <Section title="Portal Access">
            <FieldRow label="Portal" value={
              <div className="flex items-center gap-3">
                <span className={c.portal_unlocked ? "text-secondary" : "text-muted-foreground"}>
                  {c.portal_unlocked ? "Unlocked" : "Locked"}
                </span>
                <button
                  onClick={() => updateField("portal_unlocked", !c.portal_unlocked)}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted/40 border border-border hover:border-primary/40"
                >
                  {c.portal_unlocked ? "Lock portal" : "Unlock portal"}
                </button>
              </div>
            } />
            <FieldRow label="Login email" value={c.email} />
            <FieldRow label="Linked user" value={c.user_id ? <code className="text-[11px]">{c.user_id}</code> : <span className="text-muted-foreground">Not yet linked</span>} />
            <FieldRow label="Track" value={c.track || "shared"} />
            <FieldRow label="Status" value={c.status || "active"} />
          </Section>
          <div className="text-[11px] text-muted-foreground">
            Tip: clients are linked automatically the first time they sign up with their email.
            Portal access is unlocked when the client moves to <strong>Implementation Added</strong>.
          </div>
          <ToolAccessPanel
            customerId={id!}
            customerIndustry={(c as any).industry ?? null}
            customerLifecycle={(c as any).lifecycle_state ?? null}
          />
          <IndustryProfileTemplatePanel
            customerIndustry={(c as any).industry ?? null}
            industryConfirmed={!!(c as any).industry_confirmed_by_admin}
          />
        </TabsContent>

        {/* BILLING */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BillingCard label="Service" value={c.service_type || "—"} />
            <BillingCard
              label="Overall payment status (legacy)"
              value={labelOf(PAYMENT_STATUS, c.payment_status)}
              tone={c.payment_status === "unpaid" ? "warn" : "ok"}
            />
            <BillingCard label="Track" value={c.track === "implementation" ? "Implementation" : c.track === "diagnostic_only" ? "Diagnostic Only" : "Shared"} />
            <BillingCard label="Monthly revenue" value={c.monthly_revenue || "—"} />
            <BillingCard label="Started" value={c.implementation_started_at ? formatDate(c.implementation_started_at) : "—"} />
            <BillingCard label="Created" value={formatDate(c.created_at)} />
          </div>
          <p className="text-[11px] text-muted-foreground -mt-3">
            Use the breakdown below for Diagnostic, Implementation, Add-ons, and RCC subscription tracking.
          </p>
          <EngagementBillingSection customer={c} onUpdated={load} />
          <RccBillingSection
            customer={c}
            rccAssigned={assigned.some((a: any) => isRccResource(a.resources))}
            onUpdated={load}
          />
          <Section title="Invoices">
            <p className="text-xs text-muted-foreground">
              Invoice history will appear here once a payment provider is connected. For now, update the
              payment status from the Overview tab to reflect what was collected.
            </p>
          </Section>
        </TabsContent>
      </Tabs>

      {/* Add-On assignment dialog */}
      <Dialog open={addonDialogOpen} onOpenChange={(v) => { setAddonDialogOpen(v); if (!v) setConfirmAddon(false); }}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Assign Add-On Tools
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            Add-On tools are <b>only</b> assigned intentionally — never by stage. Pick one or more to assign to{" "}
            <span className="text-foreground">{c.business_name || c.full_name}</span>.
          </p>

          {(() => {
            const assignedIds = new Set(assigned.map((a: any) => a.resources?.id));
            const addonResources = allResources.filter(
              (r: any) => r.tool_category === "addon" && !assignedIds.has(r.id),
            );
            if (addonResources.length === 0) {
              return (
                <div className="bg-muted/30 border border-border rounded-md p-4 text-xs text-muted-foreground">
                  No add-on tools available. Create one in <Link to="/admin/tools" className="text-primary">Tools</Link> with category <b>Add-On</b>.
                </div>
              );
            }
            return (
              <div className="space-y-1.5 max-h-[340px] overflow-y-auto">
                {addonResources.map((r: any) => {
                  const checked = selectedAddons.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(selectedAddons);
                          if (e.target.checked) next.add(r.id); else next.delete(r.id);
                          setSelectedAddons(next);
                        }}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-foreground truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2">{r.description || "—"}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            );
          })()}

          {selectedAddons.size > 0 && !confirmAddon && (
            <Button
              onClick={() => setConfirmAddon(true)}
              className="w-full bg-primary hover:bg-secondary"
            >
              Preview {selectedAddons.size} tool{selectedAddons.size === 1 ? "" : "s"} →
            </Button>
          )}

          {confirmAddon && (
            <div className="space-y-3 border border-amber-500/30 bg-amber-500/10 rounded-md p-3">
              <div className="flex items-start gap-2 text-xs text-amber-400">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  About to assign <b>{selectedAddons.size}</b> add-on tool{selectedAddons.size === 1 ? "" : "s"} to{" "}
                  <b>{c.business_name || c.full_name}</b>. This will appear in their portal immediately.
                </div>
              </div>
              <ul className="text-xs text-foreground space-y-1 pl-5 list-disc">
                {Array.from(selectedAddons).map((rid) => {
                  const r = allResources.find((x: any) => x.id === rid);
                  return r ? <li key={rid}>{r.title}</li> : null;
                })}
              </ul>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmAddon(false)} className="flex-1">
                  Back
                </Button>
                <Button size="sm" onClick={confirmAssignAddons} className="flex-1 bg-primary hover:bg-secondary">
                  Confirm assignment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AssignUserDialog
        open={assignUserOpen}
        onOpenChange={setAssignUserOpen}
        customer={{ id: c.id, full_name: c.full_name, email: c.email, business_name: c.business_name, user_id: c.user_id }}
        onLinked={load}
      />

      <AssignToolsDialog
        open={assignToolsOpen}
        onOpenChange={setAssignToolsOpen}
        customer={{ id: c.id, full_name: c.full_name, business_name: c.business_name }}
        onChanged={load}
      />
    </PortalShell>
  );
}

const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <div className={`bg-card border border-border rounded-xl p-6 ${className || ""}`}>
    <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-4">{title}</h3>
    {children}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start gap-4 py-2 border-b border-border last:border-0">
    <div className="w-28 text-xs text-muted-foreground uppercase tracking-wider pt-1">{label}</div>
    <div className="flex-1 text-sm text-foreground">{value}</div>
  </div>
);

const StatusSelect = ({ label, value, options, onChange }: { label: string; value: any; options: readonly { key: string; label: string }[]; onChange: (v: string) => void }) => (
  <FieldRow label={label} value={
    <select value={value || options[0].key} onChange={(e) => onChange(e.target.value)}
      className="bg-muted/40 border border-border rounded-md px-2 py-1 text-sm text-foreground w-full">
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
  } />
);

const StackedRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
      {label}
    </div>
    <div className="text-sm text-foreground">{children}</div>
  </div>
);

const StackedSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: any;
  options: readonly { key: string; label: string }[];
  onChange: (v: string) => void;
}) => (
  <StackedRow label={label}>
    <select
      value={value || options[0].key}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label}
        </option>
      ))}
    </select>
  </StackedRow>
);

const Badge = ({ tone, children }: { tone: "primary" | "muted" | "ok" | "warn"; children: React.ReactNode }) => {
  const cls =
    tone === "primary" ? "bg-primary/15 text-primary border-primary/40"
    : tone === "ok" ? "bg-secondary/15 text-secondary border-secondary/40"
    : tone === "warn" ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
    : "bg-muted/40 text-muted-foreground border-border";
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${cls}`}>{children}</span>;
};

const BillingCard = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "ok" | "warn" }) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className={`mt-2 text-base ${tone === "warn" ? "text-amber-400" : tone === "ok" ? "text-secondary" : "text-foreground"}`}>{value}</div>
  </div>
);

// ---------- Diagnostic Delivery Panel ----------
function DiagnosticPanel({
  customer,
  checklist,
  toolRuns,
  assigned,
  uploads,
  intakeAnswers,
  reload,
  latestReportId,
}: {
  customer: any;
  checklist: any[];
  toolRuns: any[];
  assigned: any[];
  uploads: any[];
  intakeAnswers: IntakeAnswerRow[];
  reload: () => void;
  latestReportId: string | null;
}) {
  const navigate = useNavigate();
  const statuses: DxStepStatus[] = buildDxStatus(checklist as any, toolRuns as any);
  const inDiagnostic = DX_STAGES.has(customer.stage);
  const intakeProgress = buildIntakeProgress(intakeAnswers);
  const intakeComplete = intakeProgress.status === "complete";

  // Layer intake-driven completion onto the `intake` checklist step
  // (display only — never mutates the underlying checklist row).
  const adjustedStatuses: DxStepStatus[] = statuses.map((s) => {
    if (s.step.slug !== "intake") return s;
    if (s.row?.completed) return s; // manual wins
    if (!intakeComplete) return s;
    return {
      ...s,
      effectiveComplete: true,
      detectedFromRun: false,
    };
  });
  const progress = dxProgress(adjustedStatuses);

  const assignedEngineKeys = new Set(
    assigned
      .map((a) => (a.resources?.title ? a.resources.title.toLowerCase().trim() : ""))
      .filter(Boolean),
  );
  // Cheap engine-assignment check: by canonical title containment.
  const engineAssigned = (engine?: string) => {
    if (!engine) return false;
    const titles: Record<string, string[]> = {
      rgs_stability_scorecard: ["business stability index", "stability scorecard"],
      revenue_leak_finder: ["revenue leak detection", "revenue leak finder"],
      buyer_persona_tool: ["buyer intelligence engine", "buyer persona"],
      customer_journey_mapper: ["customer journey mapping", "customer journey mapper"],
      process_breakdown_tool: ["process clarity engine", "process breakdown"],
    };
    const aliases = titles[engine] || [];
    for (const t of assignedEngineKeys) {
      if (aliases.some((a) => t.includes(a))) return true;
    }
    return false;
  };

  const toggleManual = async (status: DxStepStatus) => {
    if (!status.row) return;
    await supabase
      .from("checklist_items")
      .update({
        completed: !status.row.completed,
        completed_at: !status.row.completed ? new Date().toISOString() : null,
      })
      .eq("id", status.row.id);
    reload();
  };

  const reseed = async () => {
    try {
      const n = await seedDiagnosticChecklist(customer.id);
      toast.success(n === 0 ? "Checklist already seeded" : `Added ${n} diagnostic step${n === 1 ? "" : "s"}`);
      reload();
    } catch (e: any) {
      toast.error(e?.message || "Seed failed");
    }
  };

  return (
    <>
      <Section title="Diagnostic Delivery">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Badge tone="primary">{stageLabel(customer.stage)}</Badge>
            <div className="text-xs text-muted-foreground">
              {progress.done} of {progress.total} steps complete
            </div>
          </div>
          {!inDiagnostic && (
            <Button size="sm" variant="outline" onClick={reseed} className="border-border">
              Seed checklist anyway
            </Button>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden mb-4">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        {!inDiagnostic && statuses.every((s) => !s.row) && (
          <div className="text-xs text-muted-foreground italic">
            No diagnostic checklist yet. Move client to Diagnostic Paid (or click above) to seed.
          </div>
        )}

        <div className="space-y-2">
          {adjustedStatuses.map((s) => {
            const assignedTool = engineAssigned(s.step.engine);
            const detectedFromIntake =
              s.step.slug === "intake" &&
              !s.row?.completed &&
              intakeComplete;
            return (
              <div
                key={s.step.slug}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/30 border border-border"
              >
                <button
                  onClick={() => toggleManual(s)}
                  disabled={!s.row}
                  className="mt-0.5 text-primary disabled:opacity-30"
                  aria-label={s.row?.completed ? "Mark incomplete" : "Mark complete"}
                >
                  {s.effectiveComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${s.effectiveComplete ? "text-foreground" : "text-foreground"}`}>
                    {s.step.label}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider">
                    {s.step.engine && (
                      <span
                        className={`px-1.5 py-0.5 rounded border ${
                          assignedTool
                            ? "bg-secondary/15 text-secondary border-secondary/40"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/40"
                        }`}
                      >
                        {assignedTool ? "Assigned" : "Not assigned"}
                      </span>
                    )}
                    {s.hasRun && s.lastRunAt && (
                      <span className="text-muted-foreground normal-case tracking-normal">
                        Latest run · {formatDate(s.lastRunAt)}
                      </span>
                    )}
                    {s.detectedFromRun && (
                      <span className="px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30 normal-case tracking-normal">
                        Detected complete from tool run
                      </span>
                    )}
                    {detectedFromIntake && (
                      <span className="px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30 normal-case tracking-normal">
                        Detected complete from intake answers
                      </span>
                    )}
                    {!s.row && (
                      <span className="text-muted-foreground italic normal-case tracking-normal">
                        Not seeded yet
                      </span>
                    )}
                  </div>
                </div>
                {s.step.href && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(s.step.href!)}
                    className="border-border"
                  >
                    Open
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Diagnostic Intake">
        <DiagnosticIntakeSummary
          customerId={customer.id}
          intakeAnswers={intakeAnswers}
          uploads={uploads}
        />
      </Section>

      <Section title="Reports & Reviews™">
        <ReportLink customerId={customer.id} fallbackId={latestReportId} />
      </Section>

      <Section title="Diagnostic Draft & Implementation Handoff">
        <DiagnosticDraftPanel
          customer={customer}
          intakeAnswers={intakeAnswers}
          toolRuns={toolRuns}
          checklist={checklist}
          uploadsCount={uploads.length}
          reload={reload}
        />
      </Section>

      <Section title="Diagnostic Completion Workflow">
        <DiagnosticCompletionWorkflow
          customerId={customer.id}
          intakeAnswers={intakeAnswers}
          toolRuns={toolRuns as any}
          checklist={checklist as any}
          reload={reload}
        />
      </Section>
    </>
  );
}

function ReportLink({ customerId, fallbackId }: { customerId: string; fallbackId: string | null }) {
  const [rep, setRep] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_control_reports")
        .select("id, report_type, status, updated_at, period_start, period_end")
        .eq("customer_id", customerId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setRep(data);
      setLoading(false);
    })();
  }, [customerId, fallbackId]);
  if (loading) return <div className="text-xs text-muted-foreground">Loading…</div>;
  if (!rep)
    return (
      <div className="text-xs text-muted-foreground">
        No Reports & Reviews™ entry yet for this client.
      </div>
    );
  return (
    <Link
      to={`/admin/reports/${rep.id}`}
      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 border border-border hover:border-primary/40"
    >
      <div>
        <div className="text-sm text-foreground">
          {rep.report_type} · {rep.status}
        </div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
          Updated {formatDate(rep.updated_at)}
        </div>
      </div>
      <ArrowLeft className="h-3.5 w-3.5 rotate-180 text-muted-foreground" />
    </Link>
  );
}

// ---------- Diagnostic Intake Summary (admin view) ----------
function DiagnosticIntakeSummary({
  customerId,
  intakeAnswers,
  uploads,
}: {
  customerId: string;
  intakeAnswers: IntakeAnswerRow[];
  uploads: any[];
}) {
  const progress = buildIntakeProgress(intakeAnswers);
  const bySection = new Map(intakeAnswers.map((a) => [a.section_key, a]));

  const tone =
    progress.status === "complete"
      ? "bg-secondary/15 text-secondary border-secondary/40"
      : progress.status === "partial"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
        : "bg-muted/40 text-muted-foreground border-border";

  const label =
    progress.status === "complete"
      ? "Intake complete"
      : progress.status === "partial"
        ? "Intake partial"
        : "Intake missing";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider ${tone}`}>
            {label}
          </span>
          <div className="text-xs text-muted-foreground">
            {progress.requiredFilled}/{progress.requiredTotal} required · {progress.filled}/{progress.total} answered
          </div>
        </div>
        <a
          href={`mailto:?subject=Diagnostic%20intake%20reminder&body=Please%20complete%20your%20RGS%20Diagnostic%20intake%20here%3A%20${encodeURIComponent("/portal/diagnostics")}`}
          className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
        >
          Request missing intake
        </a>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden mb-4">
        <div className="h-full bg-primary" style={{ width: `${progress.pct}%` }} />
      </div>

      {progress.status === "missing" && (
        <div className="text-xs text-muted-foreground italic mb-4">
          Client has not started the intake yet.
        </div>
      )}

      <div className="space-y-2">
        {INTAKE_SECTIONS.map((section) => {
          const a = bySection.get(section.key);
          const filled = !!a?.answer && a.answer.trim().length > 0;
          const preview = (a?.answer || "").trim().slice(0, 200);
          return (
            <div
              key={section.key}
              className="p-3 rounded-md bg-muted/30 border border-border"
            >
              <div className="flex items-start gap-3">
                {filled ? (
                  <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground">
                    {section.label}
                    {section.required && (
                      <span className="text-[10px] text-muted-foreground ml-2 uppercase tracking-wider">
                        Required
                      </span>
                    )}
                  </div>
                  {filled ? (
                    <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                      {preview}
                      {(a?.answer || "").length > 200 ? "…" : ""}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground italic mt-1">
                      No answer yet · feeds {section.feeds}
                    </div>
                  )}
                  {a?.updated_at && (
                    <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mt-1">
                      Updated {formatDate(a.updated_at)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/60">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
          Uploaded files ({uploads.length})
        </div>
        {uploads.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">No files uploaded yet.</div>
        ) : (
          <div className="space-y-1">
            {uploads.slice(0, 5).map((u) => (
              <div key={u.id} className="text-xs text-muted-foreground">
                • {u.file_name}
                <span className="text-muted-foreground/60"> · {formatDate(u.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---------- Diagnostic Draft & Implementation Handoff (admin only) ----------
function DiagnosticDraftPanel({
  customer,
  intakeAnswers,
  toolRuns,
  checklist,
  uploadsCount,
  reload,
}: {
  customer: any;
  intakeAnswers: IntakeAnswerRow[];
  toolRuns: any[];
  checklist: any[];
  uploadsCount: number;
  reload: () => void;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [existingDraft, setExistingDraft] = useState<{ id: string; updated_at: string } | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "regen" | "handoff">(null);
  const [handoffCounts, setHandoffCounts] = useState<{ existing: number; total: number }>({
    existing: 0,
    total: HANDOFF_TASK_TITLES.length,
  });

  const readiness = computeDiagnosticReadiness({ intakeAnswers, toolRuns, checklist });

  useEffect(() => {
    (async () => {
      const d = await findExistingDiagnosticDraft(customer.id);
      setExistingDraft(d ? { id: d.id, updated_at: d.updated_at } : null);
    })();
    // Pull tasks for handoff status
    supabase
      .from("customer_tasks")
      .select("id, title")
      .eq("customer_id", customer.id)
      .then(({ data }) => {
        const titles = (data || []).map((t: any) => t.title as string);
        const existing = HANDOFF_TASK_TITLES.filter((t) =>
          titles.includes(`[HANDOFF] ${t}`),
        ).length;
        setHandoffCounts({ existing, total: HANDOFF_TASK_TITLES.length });
      });
  }, [customer.id, checklist]);

  const generate = async (regenerate: boolean) => {
    setBusy(regenerate ? "regen" : "draft");
    try {
      const snapshot = buildDiagnosticDraftSnapshot({
        customer: { id: customer.id, full_name: customer.full_name, business_name: customer.business_name },
        intakeAnswers,
        toolRuns: toolRuns as any,
        checklist: checklist as any,
        uploadsCount,
      });
      const { id, created } = await createDiagnosticDraft({
        customerId: customer.id,
        snapshot,
        createdBy: user?.id ?? null,
        regenerate,
      });
      toast.success(
        created ? "Diagnostic draft created" : regenerate ? "Diagnostic draft regenerated" : "Existing draft reused",
      );
      setExistingDraft({ id, updated_at: new Date().toISOString() });
      reload();
      // Offer to jump straight to the editor for a brand-new draft
      if (created) navigate(`/admin/reports/${id}`);
    } catch (e: any) {
      toast.error(e?.message || "Could not create diagnostic draft");
    } finally {
      setBusy(null);
    }
  };

  const runHandoff = async () => {
    setBusy("handoff");
    try {
      const { created, skipped } = await createHandoffTasks({
        customerId: customer.id,
        createdBy: user?.id ?? null,
      });
      if (created === 0) toast.info(`All ${skipped} handoff tasks already exist.`);
      else toast.success(`Created ${created} handoff task${created === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped)` : ""}.`);
      reload();
      const { data } = await supabase
        .from("customer_tasks")
        .select("id, title")
        .eq("customer_id", customer.id);
      const titles = (data || []).map((t: any) => t.title as string);
      const existing = HANDOFF_TASK_TITLES.filter((t) =>
        titles.includes(`[HANDOFF] ${t}`),
      ).length;
      setHandoffCounts({ existing, total: HANDOFF_TASK_TITLES.length });
    } catch (e: any) {
      toast.error(e?.message || "Could not create handoff tasks");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Readiness</div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
          <span
            className={`px-1.5 py-0.5 rounded border ${
              readiness.intakeComplete
                ? "bg-secondary/15 text-secondary border-secondary/40"
                : "bg-amber-500/10 text-amber-400 border-amber-500/40"
            }`}
          >
            {readiness.intakeComplete ? "Intake complete" : "Intake incomplete"}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded border ${
              readiness.enginesComplete
                ? "bg-secondary/15 text-secondary border-secondary/40"
                : "bg-amber-500/10 text-amber-400 border-amber-500/40"
            }`}
          >
            {readiness.enginesComplete ? "All 5 engines run" : "Engines remaining"}
          </span>
          {readiness.ready && (
            <span className="px-1.5 py-0.5 rounded border bg-primary/10 text-primary border-primary/30">
              Ready for RGS review
            </span>
          )}
          {readiness.reviewDone && (
            <span className="px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border">
              Review already marked complete
            </span>
          )}
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Diagnostic Draft</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Auto-assembled from intake, Diagnostic Engines™, checklist, and uploads. Stored as a draft in Reports & Reviews™ — RGS owns final interpretation and publishing.
            </div>
            {existingDraft && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Existing draft updated {formatDate(existingDraft.updated_at)}.
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!existingDraft && (
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => generate(false)}
                className="bg-primary hover:bg-secondary"
              >
                <Sparkles className="h-4 w-4" />
                {busy === "draft" ? "Creating…" : "Create Diagnostic Draft"}
              </Button>
            )}
            {existingDraft && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  onClick={() => navigate(`/admin/reports/${existingDraft.id}`)}
                >
                  Open draft
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-border"
                  disabled={busy !== null}
                  onClick={() => generate(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  {busy === "regen" ? "Regenerating…" : "Regenerate Draft"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-sm text-foreground">Implementation Handoff Tasks</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Creates the standard handoff task set on this client. Idempotent — clicking twice does not duplicate tasks.
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {handoffCounts.existing}/{handoffCounts.total} handoff tasks already on file.
            </div>
          </div>
          <Button
            size="sm"
            disabled={busy !== null}
            onClick={runHandoff}
            className="bg-primary hover:bg-secondary"
          >
            <Plus className="h-4 w-4" />
            {busy === "handoff" ? "Working…" : "Create implementation handoff tasks"}
          </Button>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {HANDOFF_TASK_TITLES.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- RCC Billing Section (P7.2.3) ----------
const RCC_SUB_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "Not purchased" },
  { value: "active", label: "Active" },
  { value: "comped", label: "Comped" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
];

function rccSubLabel(status: string | null | undefined): string {
  return RCC_SUB_OPTIONS.find((o) => o.value === (status || "none"))?.label || "Not purchased";
}

function rccInterpretation(args: {
  status: string;
  paidThrough: string | null;
  rccAssigned: boolean;
}): { label: string; tone: "ok" | "warn" | "muted" } {
  const today = new Date().toISOString().slice(0, 10);
  const expired = !!args.paidThrough && args.paidThrough < today;
  if (args.status === "comped") return { label: "Comped", tone: "ok" };
  if (args.status === "active") {
    if (expired) return { label: "Paid-through expired", tone: "warn" };
    if (!args.rccAssigned) return { label: "Active — resource not assigned", tone: "warn" };
    return { label: "Active", tone: "ok" };
  }
  if (args.status === "past_due") return { label: "Past due", tone: "warn" };
  if (args.status === "cancelled") return { label: "Cancelled", tone: "warn" };
  return { label: "Not purchased", tone: "muted" };
}

function RccBillingSection({
  customer,
  rccAssigned,
  onUpdated,
}: {
  customer: any;
  rccAssigned: boolean;
  onUpdated: () => void;
}) {
  const [status, setStatus] = useState<string>(customer.rcc_subscription_status || "none");
  const [paidThrough, setPaidThrough] = useState<string>(customer.rcc_paid_through || "");
  const [implEndedAt, setImplEndedAt] = useState<string>(customer.implementation_ended_at || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(customer.rcc_subscription_status || "none");
    setPaidThrough(customer.rcc_paid_through || "");
    setImplEndedAt(customer.implementation_ended_at || "");
  }, [
    customer.id,
    customer.rcc_subscription_status,
    customer.rcc_paid_through,
    customer.implementation_ended_at,
  ]);

  const interpretation = rccInterpretation({
    status: customer.rcc_subscription_status || "none",
    paidThrough: customer.rcc_paid_through || null,
    rccAssigned,
  });

  // P7.2.4 — full entitlement view (saved values, not the dirty form values).
  const entitlement = computeRccEntitlement({
    isAdmin: false,
    hasRccResource: rccAssigned,
    stage: customer.stage ?? null,
    implementationEndedAt: customer.implementation_ended_at ?? null,
    rccSubscriptionStatus: customer.rcc_subscription_status ?? null,
    rccPaidThrough: customer.rcc_paid_through ?? null,
  });

  const dirty =
    status !== (customer.rcc_subscription_status || "none") ||
    (paidThrough || "") !== (customer.rcc_paid_through || "") ||
    (implEndedAt || "") !== (customer.implementation_ended_at || "");

  const save = async () => {
    setSaving(true);
    const prevStatus = customer.rcc_subscription_status || "none";
    const prevPaid = customer.rcc_paid_through || null;
    const prevImplEnd = customer.implementation_ended_at || null;
    const nextPaid = paidThrough ? paidThrough : null;
    const nextImplEnd = implEndedAt ? implEndedAt : null;
    const { error } = await supabase
      .from("customers")
      .update({
        rcc_subscription_status: status,
        rcc_paid_through: nextPaid,
        implementation_ended_at: nextImplEnd,
      } as any)
      .eq("id", customer.id);
    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }
    // Timeline log — client-safe wording, no payment details.
    const changedStatus = status !== prevStatus;
    const changedPaid = (nextPaid || "") !== (prevPaid || "");
    const changedImplEnd = (nextImplEnd || "") !== (prevImplEnd || "");
    if (changedStatus || changedPaid) {
      const detailParts: string[] = [];
      if (changedStatus) {
        detailParts.push(
          `Revenue Control Center™ subscription status updated to ${rccSubLabel(status)}.`,
        );
      }
      if (changedPaid) {
        detailParts.push(
          nextPaid
            ? `Paid-through date updated to ${nextPaid}.`
            : "Paid-through date cleared.",
        );
      }
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("customer_timeline").insert([{
        customer_id: customer.id,
        event_type: "rcc_subscription_status_updated",
        title: "RCC subscription updated",
        detail: detailParts.join(" "),
        actor_id: u.user?.id,
      }]);
    }
    if (changedImplEnd) {
      const { data: u } = await supabase.auth.getUser();
      await supabase.from("customer_timeline").insert([{
        customer_id: customer.id,
        event_type: "rcc_grace_period_updated",
        title: "RCC grace period updated",
        detail: "Revenue Control Center™ implementation grace period updated.",
        actor_id: u.user?.id,
      }]);
    }
    toast.success("RCC billing updated");
    setSaving(false);
    onUpdated();
  };

  const toneClass =
    interpretation.tone === "ok"
      ? "text-secondary"
      : interpretation.tone === "warn"
        ? "text-amber-400"
        : "text-muted-foreground";

  const today = new Date().toISOString().slice(0, 10);
  const graceState: { label: string; tone: "ok" | "warn" | "muted" } =
    !entitlement.graceEndsAt
      ? { label: "Not applicable", tone: "muted" }
      : entitlement.includedByGrace
        ? { label: `Active — ends ${entitlement.graceEndsAt}`, tone: "ok" }
        : (entitlement.graceEndsAt < today
            ? { label: `Expired (${entitlement.graceEndsAt})`, tone: "warn" }
            : { label: `Ends ${entitlement.graceEndsAt}`, tone: "muted" });
  const accessTone = entitlement.hasAccess ? "text-secondary" : "text-amber-400";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Revenue Control Center™ billing
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Manual tracking. RCC access is granted to admins; clients require the RCC resource AND active implementation, the 30-day post-implementation grace, or an active/comped subscription.
          </div>
        </div>
        <div className={`text-sm ${toneClass}`}>
          Current state: <span className="font-medium">{interpretation.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Subscription status</div>
          <div className="mt-1 text-sm text-foreground">
            {rccSubLabel(customer.rcc_subscription_status)}
          </div>
        </div>
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Paid through</div>
          <div className="mt-1 text-sm text-foreground">{customer.rcc_paid_through || "—"}</div>
        </div>
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">RCC resource assigned</div>
          <div className={`mt-1 text-sm ${rccAssigned ? "text-secondary" : "text-amber-400"}`}>
            {rccAssigned ? "Yes" : "No"}
          </div>
        </div>
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Implementation included</div>
          <div className={`mt-1 text-sm ${entitlement.includedByImplementation ? "text-secondary" : "text-muted-foreground"}`}>
            {entitlement.includedByImplementation ? "Yes — currently in implementation" : "No"}
          </div>
        </div>
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Grace period</div>
          <div className={`mt-1 text-sm ${graceState.tone === "ok" ? "text-secondary" : graceState.tone === "warn" ? "text-amber-400" : "text-muted-foreground"}`}>
            {graceState.label}
          </div>
        </div>
        <div className="bg-muted/20 border border-border rounded-md p-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Effective RCC access</div>
          <div className={`mt-1 text-sm ${accessTone}`}>
            {entitlement.hasAccess ? "Allowed" : "Locked"} · <span className="text-muted-foreground">{rccReasonLabel(entitlement.reason)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="block">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Update status
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
          >
            {RCC_SUB_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Paid through (date)
          </div>
          <Input
            type="date"
            value={paidThrough}
            onChange={(e) => setPaidThrough(e.target.value)}
          />
        </label>
        <label className="block">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
            Implementation ended (grace start)
          </div>
          <Input
            type="date"
            value={implEndedAt}
            onChange={(e) => setImplEndedAt(e.target.value)}
          />
        </label>
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-primary hover:bg-secondary disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save RCC billing"}
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        No card or bank information is stored. {BRANDS.stripe} and invoices are not enabled. Implementation end date is set automatically when stage moves to Implementation Complete; you can override it here. Grace period is always {`30 days`} after that date.
      </p>
    </div>
  );
}
