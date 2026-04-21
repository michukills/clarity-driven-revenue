import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { ToolCard, type Tool } from "@/components/portal/ToolCard";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, INTERNAL_CATEGORIES, CUSTOMER_CATEGORIES, categoryLabel, INTERNAL_TOOL_PLACEHOLDERS } from "@/lib/portal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

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

type FilterKey = "all" | "internal" | "customer" | "assigned" | "unassigned" | "screenshot" | "downloadable";

export default function Tools() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ resource_id: string; customer_id: string; id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tool | null>(null);
  const [assignFor, setAssignFor] = useState<Tool | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [uploading, setUploading] = useState(false);

  const emptyForm = {
    title: "",
    description: "",
    category: "diagnostic_templates",
    resource_type: "spreadsheet",
    visibility: "internal" as "internal" | "customer",
    url: "",
    screenshot_url: "",
    downloadable: true,
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [r, c, a] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, full_name, business_name").order("full_name"),
      supabase.from("resource_assignments").select("id, resource_id, customer_id"),
    ]);
    if (r.data) setTools(r.data as any);
    if (c.data) setCustomers(c.data);
    if (a.data) setAssignments(a.data as any);
  };
  useEffect(() => { load(); }, []);

  const assignedCount = (id: string) => assignments.filter((a) => a.resource_id === id).length;
  const assignedCustomerIds = (id: string) => new Set(assignments.filter((a) => a.resource_id === id).map((a) => a.customer_id));

  const openNew = (visibility: "internal" | "customer") => {
    setEditing(null);
    setForm({
      ...emptyForm,
      visibility,
      category: visibility === "internal" ? "diagnostic_templates" : "client_revenue_worksheets",
    });
    setOpen(true);
  };
  const openEdit = (t: Tool) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      category: t.category,
      resource_type: t.resource_type,
      visibility: t.visibility,
      url: t.url || "",
      screenshot_url: t.screenshot_url || "",
      downloadable: t.downloadable,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title) { toast.error("Title required"); return; }
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
    setOpen(false); setEditing(null); setForm(emptyForm); load();
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

  const toggleAssignment = async (toolId: string, customerId: string) => {
    const existing = assignments.find((a) => a.resource_id === toolId && a.customer_id === customerId);
    if (existing) {
      await supabase.from("resource_assignments").delete().eq("id", existing.id);
    } else {
      const { error } = await supabase.from("resource_assignments").insert([{ resource_id: toolId, customer_id: customerId }]);
      if (error) return toast.error(error.message);
    }
    const { data: a } = await supabase.from("resource_assignments").select("id, resource_id, customer_id");
    if (a) setAssignments(a as any);
  };

  const matchesFilters = (t: Tool) => {
    const q = search.toLowerCase().trim();
    if (q && !(t.title.toLowerCase().includes(q) || categoryLabel(t.category).toLowerCase().includes(q) || t.resource_type.toLowerCase().includes(q))) return false;
    if (filter === "internal") return t.visibility === "internal";
    if (filter === "customer") return t.visibility === "customer";
    if (filter === "assigned") return assignedCount(t.id) > 0;
    if (filter === "unassigned") return t.visibility === "customer" && assignedCount(t.id) === 0;
    if (filter === "screenshot") return !!t.screenshot_url;
    if (filter === "downloadable") return !!t.downloadable && !!t.url;
    return true;
  };

  const internalTools = useMemo(() => tools.filter((t) => t.visibility === "internal" && matchesFilters(t)), [tools, search, filter, assignments]);
  const customerTools = useMemo(() => tools.filter((t) => t.visibility === "customer" && matchesFilters(t)), [tools, search, filter, assignments]);

  const renderSection = (
    title: string,
    description: string,
    cats: typeof CATEGORIES,
    items: Tool[],
    visibility: "internal" | "customer",
  ) => (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <Button onClick={() => openNew(visibility)} className="bg-primary hover:bg-secondary">
          <Plus className="h-4 w-4" /> New {visibility === "internal" ? "Internal" : "Customer"} Tool
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {visibility === "internal"
              ? "Add your first internal tool to start building your RGS library."
              : "No customer tools yet. Create one to start assigning to clients."}
          </p>
        </div>
      ) : (
        cats.map((cat) => {
          const inCat = items.filter((t) => t.category === cat.key);
          if (inCat.length === 0) return null;
          return (
            <div key={cat.key}>
              <h3 className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">{cat.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {inCat.map((t) => (
                  <ToolCard
                    key={t.id}
                    tool={t}
                    assignedCount={assignedCount(t.id)}
                    onEdit={() => openEdit(t)}
                    onDelete={() => remove(t.id)}
                    onAssign={() => setAssignFor(t)}
                    showAdminActions
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All Tools" },
    { key: "internal", label: "Internal" },
    { key: "customer", label: "Customer" },
    { key: "assigned", label: "Assigned" },
    { key: "unassigned", label: "Unassigned" },
    { key: "screenshot", label: "Has Screenshot" },
    { key: "downloadable", label: "Downloadable" },
  ];

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Library</div>
        <h1 className="mt-2 text-3xl text-foreground">Tools</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          The RGS operational tool library. Internal tools power delivery; customer tools can be assigned to clients and appear in their portal.
        </p>
      </div>

      {/* Built-in internal RGS tool placeholders */}
      <section className="mb-12">
        <div className="flex items-end justify-between gap-4 border-b border-border pb-4 mb-4">
          <div>
            <h2 className="text-xl text-foreground">Core RGS Tools</h2>
            <p className="text-xs text-muted-foreground mt-1">Built-in internal tools used across every engagement. Wire them to live URLs from the editor below.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {INTERNAL_TOOL_PLACEHOLDERS.map((p) => {
            const live = tools.find((t) => t.title === p.title);
            const route = CORE_TOOL_ROUTES[p.key];
            return (
              <div key={p.key} className="bg-card border border-border rounded-xl p-5 flex flex-col">
                <div className="text-xs uppercase tracking-wider text-primary mb-2">Internal · Core</div>
                <div className="text-sm text-foreground font-medium">{p.title}</div>
                <p className="text-xs text-muted-foreground mt-2 flex-1">{p.description}</p>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  {route ? (
                    <Link to={route} className="text-xs text-primary hover:text-secondary">Open tool →</Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  )}
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/15 text-secondary">Live</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
        {renderSection(
          "Internal RGS Tools",
          "Used for internal delivery, templates, calculators, and worksheets. Never visible to customers.",
          INTERNAL_CATEGORIES as any,
          internalTools,
          "internal",
        )}
        {renderSection(
          "Customer Tools",
          "Tools that can be assigned to individual customers and appear in their portal.",
          CUSTOMER_CATEGORIES as any,
          customerTools,
          "customer",
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Tool" : "New Tool"}</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div className="grid grid-cols-2 gap-3">
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })} className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
                <option value="internal">Internal Only</option>
                <option value="customer">Customer Assignable</option>
              </select>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground">
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
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader><DialogTitle>Assign “{assignFor?.title}”</DialogTitle></DialogHeader>
          <div className="space-y-1 mt-2 max-h-80 overflow-y-auto">
            {customers.length === 0 && <div className="text-sm text-muted-foreground">No customers yet.</div>}
            {assignFor && customers.map((c) => {
              const set = assignedCustomerIds(assignFor.id);
              const checked = set.has(c.id);
              return (
                <label key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-md hover:bg-muted/30 cursor-pointer">
                  <div className="min-w-0">
                    <div className="text-sm text-foreground truncate">{c.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.business_name || "—"}</div>
                  </div>
                  <input type="checkbox" checked={checked} onChange={() => toggleAssignment(assignFor.id, c.id)} />
                </label>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
