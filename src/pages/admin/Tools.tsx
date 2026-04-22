import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORIES,
  INTERNAL_CATEGORIES,
  CUSTOMER_CATEGORIES,
  categoryLabel,
  INTERNAL_TOOL_PLACEHOLDERS,
  TOOL_AUDIENCES,
  toolAudienceShort,
  formatRelativeTime,
  usageStatus,
  type ToolAudience,
  type UsageStatus,
  TOOL_CATEGORIES,
  toolCategoryShort,
  type ToolCategory,
} from "@/lib/portal";
import { VISIBILITY_OPTIONS, visibilityMeta, type Visibility } from "@/lib/visibility";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Image as ImageIcon, AlertTriangle, Users, Clock, Activity, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { classifyToolUrl, classifyTool, launchToolTarget } from "@/lib/toolLaunch";

const TYPE_OPTIONS = [
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "worksheet", label: "Worksheet" },
  { key: "pdf", label: "PDF" },
  { key: "image", label: "Image" },
  { key: "link", label: "Link" },
];

const CORE_TOOL_ROUTES: Record<string, string> = {
  rgs_stability_scorecard: "/admin/tools/stability-scorecard",
  revenue_leak_finder: "/admin/tools/revenue-leak-finder",
  buyer_persona_tool: "/admin/tools/persona-builder",
  customer_journey_mapper: "/admin/tools/journey-mapper",
  process_breakdown_tool: "/admin/tools/process-breakdown",
};

type FilterKey = "all" | "internal" | "diagnostic_client" | "addon_client" | "assigned" | "unassigned" | "screenshot" | "downloadable";

type ToolWithAudience = Tool & { tool_audience?: ToolAudience | null };
type UsageInfo = { lastUsed: string | null; lastUsedBy: string | null };

export default function Tools() {
  const navigate = useNavigate();
  const [tools, setTools] = useState<ToolWithAudience[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  // Usage map keyed by both resource id and built-in tool_key
  const [usage, setUsage] = useState<Record<string, UsageInfo>>({});
  const [assignments, setAssignments] = useState<
    { id: string; resource_id: string; customer_id: string; visibility_override: Visibility | null; internal_notes: string | null }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ToolWithAudience | null>(null);
  const [assignFor, setAssignFor] = useState<ToolWithAudience | null>(null);
  const [confirmVisibility, setConfirmVisibility] = useState<null | { from: Visibility; to: Visibility }>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [uploading, setUploading] = useState(false);

  const emptyForm = {
    title: "",
    description: "",
    category: "diagnostic_templates",
    resource_type: "spreadsheet",
    visibility: "internal" as Visibility,
    tool_audience: "internal" as ToolAudience,
    tool_category: "diagnostic" as ToolCategory,
    url: "",
    screenshot_url: "",
    downloadable: true,
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [r, c, a, runs] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, full_name, business_name").order("full_name"),
      supabase.from("resource_assignments").select("id, resource_id, customer_id, visibility_override, internal_notes"),
      supabase
        .from("tool_runs")
        .select("tool_key, customer_id, updated_at")
        .order("updated_at", { ascending: false }),
    ]);
    if (r.data) setTools(r.data as any);
    if (c.data) setCustomers(c.data);
    if (a.data) setAssignments(a.data as any);

    // Build usage map keyed by tool_key (matches built-in core tools and custom resources via tool_key column if set)
    if (runs.data && c.data) {
      const cmap = new Map((c.data as any[]).map((x) => [x.id, x.full_name as string]));
      const map: Record<string, UsageInfo> = {};
      for (const row of runs.data as any[]) {
        if (!row.tool_key) continue;
        if (!map[row.tool_key]) {
          map[row.tool_key] = {
            lastUsed: row.updated_at,
            lastUsedBy: row.customer_id ? cmap.get(row.customer_id) ?? null : null,
          };
        }
      }
      setUsage(map);
    }
  };
  useEffect(() => { load(); }, []);

  const assignedCount = (id: string) => assignments.filter((a) => a.resource_id === id).length;
  const assignedCustomerIds = (id: string) => new Set(assignments.filter((a) => a.resource_id === id).map((a) => a.customer_id));

  const openNew = (audience: ToolAudience) => {
    setEditing(null);
    const visibility: Visibility = audience === "internal" ? "internal" : "customer";
    setForm({
      ...emptyForm,
      visibility,
      tool_audience: audience,
      tool_category: audience === "addon_client" ? "addon" : "diagnostic",
      category: audience === "internal" ? "diagnostic_templates" : "client_revenue_worksheets",
    });
    setOpen(true);
  };
  const openEdit = (t: ToolWithAudience) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      category: t.category,
      resource_type: t.resource_type,
      visibility: t.visibility as Visibility,
      tool_audience: (t.tool_audience as ToolAudience) || (t.visibility === "internal" ? "internal" : "addon_client"),
      tool_category: ((t as any).tool_category as ToolCategory) || "diagnostic",
      url: t.url || "",
      screenshot_url: t.screenshot_url || "",
      downloadable: t.downloadable,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    // Confirm if making a previously-internal tool client-visible
    if (editing && editing.visibility === "internal" && form.visibility !== "internal" && !confirmVisibility) {
      setConfirmVisibility({ from: "internal", to: form.visibility });
      return;
    }
    if (editing) {
      const { error } = await supabase.from("resources").update(form as any).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Tool updated");
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("resources").insert([{ ...form, created_by: u.user?.id } as any]);
      if (error) return toast.error(error.message);
      toast.success("Tool created");
    }
    setOpen(false); setEditing(null); setForm(emptyForm); setConfirmVisibility(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tool?")) return;
    await supabase.from("resources").delete().eq("id", id);
    load();
  };

  const uploadFile = async (file: File, kind: "file" | "screenshot") => {
    setUploading(true);
    try {
      const path = `${kind}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("resources").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      const url = data.publicUrl;
      if (kind === "file") setForm((f) => ({ ...f, url }));
      else setForm((f) => ({ ...f, screenshot_url: url }));
      toast.success("Uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  };

  const toggleAssignment = async (toolId: string, customerId: string, defaultVisibility?: Visibility) => {
    const existing = assignments.find((a) => a.resource_id === toolId && a.customer_id === customerId);
    if (existing) {
      await supabase.from("resource_assignments").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("resource_assignments").insert([{
        resource_id: toolId,
        customer_id: customerId,
        visibility_override: defaultVisibility ?? null,
      }]);
      if (error) return toast.error(error.message);
    }
    const { data: a } = await supabase.from("resource_assignments").select("id, resource_id, customer_id, visibility_override, internal_notes");
    if (a) setAssignments(a as any);
  };

  const updateAssignmentVisibility = async (assignmentId: string, v: Visibility | null) => {
    await supabase.from("resource_assignments").update({ visibility_override: v }).eq("id", assignmentId);
    const { data: a } = await supabase.from("resource_assignments").select("id, resource_id, customer_id, visibility_override, internal_notes");
    if (a) setAssignments(a as any);
  };

  // Resolve audience for any tool, including legacy rows missing the column.
  const audienceOf = (t: ToolWithAudience): ToolAudience => {
    if (t.tool_audience) return t.tool_audience as ToolAudience;
    return t.visibility === "internal" ? "internal" : "addon_client";
  };

  // Map built-in core tools (which live in INTERNAL_TOOL_PLACEHOLDERS, not the resources table)
  // into pseudo-cards so admins can see usage + assignment intent in one place.
  const coreToolPseudoCards: ToolWithAudience[] = useMemo(
    () =>
      INTERNAL_TOOL_PLACEHOLDERS.map((p) => ({
        id: `core:${p.key}`,
        title: p.title,
        description: p.description,
        category: "core_internal",
        resource_type: "link",
        visibility: "internal" as any,
        tool_audience: "internal" as ToolAudience,
        url: CORE_TOOL_ROUTES[p.key] || null,
        file_path: null,
        screenshot_url: null,
        downloadable: false,
      })),
    [],
  );

  const matchesFilters = (t: ToolWithAudience) => {
    const q = search.toLowerCase().trim();
    if (q && !(t.title.toLowerCase().includes(q) || categoryLabel(t.category).toLowerCase().includes(q) || (t.resource_type || "").toLowerCase().includes(q))) return false;
    if (filter === "internal") return audienceOf(t) === "internal";
    if (filter === "diagnostic_client") return audienceOf(t) === "diagnostic_client";
    if (filter === "addon_client") return audienceOf(t) === "addon_client";
    if (filter === "assigned") return assignedCount(t.id) > 0;
    if (filter === "unassigned") return audienceOf(t) !== "internal" && assignedCount(t.id) === 0;
    if (filter === "screenshot") return !!t.screenshot_url;
    if (filter === "downloadable") return !!t.downloadable && !!t.url;
    return true;
  };

  // Lookup last-used by built-in tool_key (for core tools) or resource id (custom tools — only meaningful if a tool_runs.tool_key happens to equal the id).
  const lastUsedFor = (t: ToolWithAudience): UsageInfo => {
    const coreKey = t.id.startsWith("core:") ? t.id.slice(5) : null;
    if (coreKey && usage[coreKey]) return usage[coreKey];
    if (usage[t.id]) return usage[t.id];
    return { lastUsed: null, lastUsedBy: null };
  };

  const allTools: ToolWithAudience[] = useMemo(() => {
    // Replace built-in cards with the live row if admin already created one with the same title
    const liveTitles = new Set(tools.map((t) => t.title));
    const cores = coreToolPseudoCards.filter((c) => !liveTitles.has(c.title));
    return [...cores, ...tools];
  }, [tools, coreToolPseudoCards]);

  const internalTools = useMemo(() => allTools.filter((t) => audienceOf(t) === "internal" && matchesFilters(t)), [allTools, search, filter, assignments]);
  const diagnosticTools = useMemo(() => allTools.filter((t) => audienceOf(t) === "diagnostic_client" && matchesFilters(t)), [allTools, search, filter, assignments]);
  const addonTools = useMemo(() => allTools.filter((t) => audienceOf(t) === "addon_client" && matchesFilters(t)), [allTools, search, filter, assignments]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All Tools" },
    { key: "internal", label: "Internal" },
    { key: "diagnostic_client", label: "Client · Diagnostic" },
    { key: "addon_client", label: "Client · Add-On" },
    { key: "assigned", label: "Assigned" },
    { key: "unassigned", label: "Unassigned" },
    { key: "screenshot", label: "Has Screenshot" },
    { key: "downloadable", label: "Downloadable" },
  ];

  const STATUS_STYLE: Record<UsageStatus, { label: string; cls: string; dot: string }> = {
    active: { label: "Active", cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", dot: "bg-emerald-400" },
    idle: { label: "Idle", cls: "text-amber-400 border-amber-500/30 bg-amber-500/10", dot: "bg-amber-400" },
    stale: { label: "Stale", cls: "text-muted-foreground border-border bg-muted/40", dot: "bg-muted-foreground" },
    unused: { label: "Unused", cls: "text-muted-foreground border-border bg-muted/30", dot: "bg-muted-foreground/60" },
  };

  const AUDIENCE_BADGE: Record<ToolAudience, string> = {
    internal: "bg-muted/60 text-muted-foreground border-muted-foreground/30",
    diagnostic_client: "bg-secondary/15 text-secondary border-secondary/40",
    addon_client: "bg-primary/15 text-primary border-primary/40",
  };

  const renderToolRow = (t: ToolWithAudience) => {
    const isCore = t.id.startsWith("core:");
    const usageInfo = lastUsedFor(t);
    const aCount = isCore ? 0 : assignedCount(t.id);
    const status = usageStatus(aCount, usageInfo.lastUsed);
    const aud = audienceOf(t);
    const route = isCore ? CORE_TOOL_ROUTES[t.id.slice(5)] : null;
    const launch = isCore
      ? classifyToolUrl(route)
      : classifyTool({ title: t.title, url: t.url }, "admin");
    const isClickable = launch.kind !== "none";

    const handleOpenTool = () => {
      if (!isClickable) return;
      launchToolTarget(launch, navigate);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isClickable) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpenTool();
      }
    };

    const stopCardEvent = (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    return (
      <div
        key={t.id}
        className={`bg-card border rounded-xl p-5 flex flex-col gap-3 transition-colors ${
          status === "unused" ? "border-border opacity-90" : "border-border"
        } ${isClickable ? "cursor-pointer hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" : "hover:border-primary/40"}`}
        onClick={isClickable ? handleOpenTool : undefined}
        onKeyDown={handleKeyDown}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        aria-label={isClickable ? `Open ${t.title}` : undefined}
      >
        {/* Top row: badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${AUDIENCE_BADGE[aud]}`}>
              {toolAudienceShort(aud)}
            </span>
            {!isCore && (t as any).tool_category && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/60 text-muted-foreground border-muted-foreground/30">
                {toolCategoryShort((t as any).tool_category)}
              </span>
            )}
            {isCore && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30">
                CORE
              </span>
            )}
            <VisibilityBadge visibility={t.visibility} size="sm" />
          </div>
          {!isCore && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={(e) => { stopCardEvent(e); openEdit(t); }} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={(e) => { stopCardEvent(e); remove(t.id); }} className="text-muted-foreground hover:text-destructive" aria-label="Delete">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Title + description */}
        <div>
          <div className="text-sm font-medium text-foreground">{t.title}</div>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 min-h-[32px]">{t.description || "—"}</p>
        </div>

        {/* Usage strip */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground border-t border-border pt-3 mt-auto">
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3" />
            <span>
              {aud === "internal"
                ? "Internal"
                : `Assigned to ${aCount} client${aCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title={usageInfo.lastUsedBy ? `Last used by: ${usageInfo.lastUsedBy}` : undefined}>
            <Clock className="h-3 w-3" />
            <span>{usageInfo.lastUsed ? `Last used ${formatRelativeTime(usageInfo.lastUsed)}` : "Never used"}</span>
          </div>
          <span
            className={`ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${STATUS_STYLE[status].cls}`}
            title={
              status === "active"
                ? "Used recently"
                : status === "idle"
                ? "Assigned but not used recently"
                : status === "stale"
                ? "Assigned but never used"
                : "Not assigned to any client"
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLE[status].dot}`} />
            {STATUS_STYLE[status].label}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {!isClickable && (
            <span className="text-xs text-muted-foreground italic">
              This tool is not connected yet.
            </span>
          )}
          {!isCore && aud !== "internal" && (
            <button onClick={(e) => { stopCardEvent(e); setAssignFor(t); }} className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Users className="h-3 w-3" /> Assign
            </button>
          )}
        </div>

        {usageInfo.lastUsedBy && (
          <div className="text-[10px] text-muted-foreground/80">
            Last used by: <span className="text-foreground/70">{usageInfo.lastUsedBy}</span>
          </div>
        )}
      </div>
    );
  };

  const renderAudienceSection = (
    audience: ToolAudience,
    title: string,
    description: string,
    items: ToolWithAudience[],
  ) => (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl text-foreground">{title}</h2>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${AUDIENCE_BADGE[audience]}`}>
              {toolAudienceShort(audience)}
            </span>
            <span className="text-[11px] text-muted-foreground">· {items.length} tool{items.length === 1 ? "" : "s"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-2xl">{description}</p>
        </div>
        <Button onClick={() => openNew(audience)} className="bg-primary hover:bg-secondary">
          <Plus className="h-4 w-4" /> New tool
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {audience === "internal"
              ? "No internal RGS tools match the current filters."
              : audience === "diagnostic_client"
              ? "No diagnostic-client tools yet. Create one for your diagnostic-only customers."
              : "No add-on client tools yet. Create one for your implementation customers."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map(renderToolRow)}
        </div>
      )}
    </section>
  );

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Library</div>
        <h1 className="mt-2 text-3xl text-foreground">Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          The RGS operational tool library. Internal tools power delivery; customer tools can be assigned to clients and appear in their portal.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-10">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, or type"
            className="pl-9 bg-muted/40 border-border"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                filter === f.key
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-16">
        {renderAudienceSection(
          "internal",
          "Internal RGS Tools",
          "Admin only. Used for delivery, templates, calculators, and internal worksheets. Never visible to clients.",
          internalTools,
        )}
        {renderAudienceSection(
          "diagnostic_client",
          "Client Tools — Diagnostic",
          "Available to diagnostic-only clients. Simpler, guided, limited scope. Must be assigned manually.",
          diagnosticTools,
        )}
        {renderAudienceSection(
          "addon_client",
          "Client Tools — Add-On Only",
          "Available only to clients who purchased implementation or add-ons. Full depth. Must be assigned manually.",
          addonTools,
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Tool" : "New Tool"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Audience</label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TOOL_AUDIENCES.map((opt) => {
                  const active = form.tool_audience === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tool_audience: opt.value,
                          // Keep visibility consistent with audience for sane defaults
                          visibility: opt.value === "internal" ? "internal" : (form.visibility === "internal" ? "customer" : form.visibility),
                          category: opt.value === "internal"
                            ? (INTERNAL_CATEGORIES.find((c) => c.key === form.category)?.key ?? "diagnostic_templates")
                            : (CUSTOMER_CATEGORIES.find((c) => c.key === form.category)?.key ?? "client_revenue_worksheets"),
                        })
                      }
                      className={`text-left rounded-md border p-2.5 transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${AUDIENCE_BADGE[opt.value]}`}>
                        {opt.short}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Visibility</label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => {
                  const active = form.visibility === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, visibility: opt.value })}
                      className={`text-left rounded-md border p-2.5 transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <VisibilityBadge visibility={opt.value} size="sm" showOverrideHint={false} />
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Effective default: <VisibilityBadge visibility={form.visibility} size="sm" showOverrideHint={false} className="ml-1" />
              </p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Assignment Category
              </label>
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TOOL_CATEGORIES.map((opt) => {
                  const active = form.tool_category === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, tool_category: opt.value })}
                      className={`text-left rounded-md border p-2.5 transition-colors ${
                        active ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-muted/60 text-muted-foreground border-muted-foreground/30">
                        {opt.short}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Diagnostic & Implementation tools auto-assign on stage change. Add-On tools are <b>never</b> auto-assigned.
              </p>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</label>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                {TYPE_OPTIONS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>

            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
              {(form.visibility === "internal" ? INTERNAL_CATEGORIES : CUSTOMER_CATEGORIES).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>

            <div>
              <Input placeholder="URL (link or hosted file)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <Plus className="h-3 w-3" /> Upload file
                <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "file")} />
              </label>
            </div>

            <div>
              <Input placeholder="Screenshot URL (optional)" value={form.screenshot_url} onChange={(e) => setForm({ ...form, screenshot_url: e.target.value })} />
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                <ImageIcon className="h-3 w-3" /> Upload screenshot
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "screenshot")} />
              </label>
              {form.screenshot_url && <img src={form.screenshot_url} alt="preview" className="mt-2 rounded-md border border-border max-h-32" />}
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.downloadable} onChange={(e) => setForm({ ...form, downloadable: e.target.checked })} />
              Downloadable
            </label>

            <Button onClick={save} disabled={uploading} className="w-full bg-primary hover:bg-secondary">
              {editing ? "Save changes" : "Create tool"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assignFor} onOpenChange={(v) => !v && setAssignFor(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Assign “{assignFor?.title}”
              {assignFor && <VisibilityBadge visibility={assignFor.visibility} size="sm" />}
            </DialogTitle>
          </DialogHeader>
          {assignFor?.visibility === "internal" && (
            <div className="flex gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <div>
                This tool is currently <b>Internal Only</b> and will not appear in the client portal.
                Change its visibility (or set a per-client override below) to share it.
              </div>
            </div>
          )}
          <div className="space-y-1 mt-2 max-h-[420px] overflow-y-auto">
            {customers.length === 0 && <div className="text-sm text-muted-foreground">No customers yet.</div>}
            {assignFor && customers.map((c) => {
              const existing = assignments.find((a) => a.resource_id === assignFor.id && a.customer_id === c.id);
              const checked = !!existing;
              const eff = (existing?.visibility_override || assignFor.visibility) as Visibility;
              return (
                <div key={c.id} className="px-3 py-2.5 rounded-md hover:bg-muted/30 border border-transparent hover:border-border">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{c.full_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{c.business_name || "—"}</div>
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => toggleAssignment(assignFor.id, c.id)} />
                  </div>
                  {checked && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Visibility:</span>
                      {VISIBILITY_OPTIONS.map((opt) => {
                        const isCurrent = eff === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => updateAssignmentVisibility(existing!.id, opt.value === assignFor.visibility ? null : opt.value)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              isCurrent ? "border-primary text-foreground bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {opt.short}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Visibility-change confirmation */}
      <Dialog open={!!confirmVisibility} onOpenChange={(v) => !v && setConfirmVisibility(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Make this tool client-visible?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            You're changing this tool from <b>{visibilityMeta(confirmVisibility?.from).label}</b> to <b>{visibilityMeta(confirmVisibility?.to).label}</b>.
            Any client this tool is assigned to will be able to {confirmVisibility?.to === "client_editable" ? "view and edit" : "view"} it from their portal.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setConfirmVisibility(null)} className="border-border">Cancel</Button>
            <Button
              onClick={async () => {
                // Bypass guard and re-run save
                const guard = confirmVisibility;
                setConfirmVisibility(null);
                if (!guard) return;
                // Force-save by clearing the editing-internal pre-check
                const e = editing;
                if (!e) return;
                const { error } = await supabase.from("resources").update(form as any).eq("id", e.id);
                if (error) return toast.error(error.message);
                toast.success("Tool updated and shared with assigned clients");
                setOpen(false); setEditing(null); setForm(emptyForm); load();
              }}
              className="bg-primary hover:bg-secondary"
            >
              Yes, make it visible
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
