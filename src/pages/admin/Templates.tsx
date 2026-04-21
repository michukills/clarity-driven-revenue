import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, INTERNAL_CATEGORIES, CUSTOMER_CATEGORIES, TOOL_TYPES, categoryLabel, toolTypeLabel, formatDate } from "@/lib/portal";
import { VISIBILITY_OPTIONS, type Visibility } from "@/lib/visibility";
import { VisibilityBadge } from "@/components/VisibilityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  resource_type: string;
  url: string | null;
  visibility: Visibility | string;
  downloadable: boolean;
  created_at: string;
  updated_at: string;
};

const empty = {
  title: "",
  description: "",
  category: "client_specific",
  resource_type: "link",
  url: "",
  visibility: "customer" as Visibility,
  downloadable: true,
};

export default function Templates() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | Visibility>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    const { data } = await supabase.from("resources").select("*").order("updated_at", { ascending: false });
    setResources((data as any) || []);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (r: Resource) => {
    setEditing(r);
    setForm({
      title: r.title, description: r.description || "", category: r.category,
      resource_type: r.resource_type, url: r.url || "", visibility: r.visibility as Visibility,
      downloadable: r.downloadable,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    // Respect explicit form visibility (allows client_editable even on customer category)
    const payload = { ...form, visibility: form.visibility };
    try {
      if (editing) {
        const { error } = await supabase.from("resources").update(payload as any).eq("id", editing.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase.from("resources").insert([{ ...payload, created_by: user?.id }] as any);
        if (error) throw error;
        toast.success("Template created");
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  };

  const remove = async (r: Resource) => {
    if (!confirm(`Delete "${r.title}"?`)) return;
    const { error } = await supabase.from("resources").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const filtered = resources.filter((r) => {
    if (filter !== "all") {
      if (filter === "internal" && r.visibility !== "internal") return false;
      if (filter === "customer" && !(r.visibility === "customer" || r.visibility === "client_editable")) return false;
    }
    if (search && !`${r.title} ${r.description}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <PortalShell variant="admin">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Templates</div>
          <h1 className="mt-2 text-3xl text-foreground">Template Library</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Reusable assets for diagnostics, onboarding, and client work. Internal templates stay private to RGS;
            customer templates can be assigned to a client from their profile.
          </p>
        </div>
        <Button onClick={openNew} className="bg-primary hover:bg-secondary">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" className="max-w-xs bg-muted/40 border-border" />
        {(["all", "internal", "customer"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 h-9 text-xs rounded-md border ${filter === f ? "bg-primary/15 border-primary/50 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f === "all" ? "All" : f === "internal" ? "Internal" : "Client"}
          </button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} item{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <FileText className="h-7 w-7 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No templates match. Try a different filter, or add a new one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <FileText className="h-4 w-4 text-primary mt-0.5" />
                <VisibilityBadge visibility={r.visibility} size="sm" />
              </div>
              <div className="text-sm text-foreground mt-3 truncate">{r.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{categoryLabel(r.category)} · {toolTypeLabel(r.resource_type)}</div>
              {r.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.description}</p>}
              <div className="text-[10px] text-muted-foreground mt-3">Updated {formatDate(r.updated_at)}</div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3 w-3" /> Open
                  </a>
                )}
                <button onClick={() => openEdit(r)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground ml-auto">
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
                <button onClick={() => remove(r)} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 bg-muted/40 border-border" />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 bg-muted/40 border-border resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => {
                    const cat = CATEGORIES.find((c) => c.key === e.target.value);
                    setForm({ ...form, category: e.target.value, visibility: (cat?.visibility as any) || form.visibility });
                  }}
                  className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 h-10 text-sm text-foreground"
                >
                  <optgroup label="Internal">
                    {INTERNAL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                  <optgroup label="Client">
                    {CUSTOMER_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Type</label>
                <select
                  value={form.resource_type}
                  onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
                  className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 h-10 text-sm text-foreground"
                >
                  {TOOL_TYPES.filter((t) => !["sheet", "file"].includes(t.key)).map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Visibility</label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: opt.value })}
                    className={`text-left rounded-md border p-2 transition-colors ${
                      form.visibility === opt.value ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <VisibilityBadge visibility={opt.value} size="sm" showOverrideHint={false} />
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL (optional)</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" className="mt-1 bg-muted/40 border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-border">Cancel</Button>
            <Button onClick={save} className="bg-primary hover:bg-secondary">{editing ? "Save changes" : "Create template"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
