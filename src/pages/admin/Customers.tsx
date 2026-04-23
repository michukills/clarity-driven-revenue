import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import {
  stageLabel,
  formatDate,
  STAGES,
  IMPLEMENTATION_STAGES,
  PAYMENT_STATUS,
  IMPLEMENTATION_STATUS,
  labelOf,
} from "@/lib/portal";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Search, Pencil, Archive, ArchiveRestore, Package as PackageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exports";
import { Download } from "lucide-react";
import { LIFECYCLE_STATES, lifecycleLabel, type LifecycleState } from "@/lib/customers/packages";

const IMPL_KEYS = new Set(IMPLEMENTATION_STAGES.map((s) => s.key));
type LifecycleFilter = "all" | LifecycleState;

const LIFECYCLE_FILTERS: { key: LifecycleFilter; label: string }[] = [
  { key: "all", label: "All" },
  ...LIFECYCLE_STATES.map((s) => ({ key: s.key as LifecycleFilter, label: s.label })),
];

const PACKAGE_CHIPS: { key: string; short: string; tone: string }[] = [
  { key: "package_full_bundle", short: "Bundle", tone: "bg-primary/15 text-primary border-primary/30" },
  { key: "package_diagnostic", short: "Diag", tone: "bg-secondary/15 text-secondary border-secondary/30" },
  { key: "package_implementation", short: "Impl", tone: "bg-secondary/15 text-secondary border-secondary/30" },
  { key: "package_revenue_tracker", short: "RT", tone: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { key: "package_ongoing_support", short: "Support", tone: "bg-muted/60 text-foreground border-border" },
  { key: "package_addons", short: "Add-ons", tone: "bg-muted/60 text-foreground border-border" },
];

function lifecycleTone(s: string | null | undefined): string {
  switch (s) {
    case "diagnostic": return "bg-primary/15 text-primary border-primary/30";
    case "implementation": return "bg-secondary/15 text-secondary border-secondary/30";
    case "ongoing_support": return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    case "completed": return "bg-muted/60 text-foreground border-border";
    case "re_engagement": return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "inactive": return "bg-muted/40 text-muted-foreground border-border";
    default: return "bg-muted/40 text-muted-foreground border-border";
  }
}
const ARCHIVE_FILTERS = [
  { key: "active" as const, label: "Active" },
  { key: "archived" as const, label: "Archived" },
];

export default function Customers() {
  const [rows, setRows] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ customer_id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LifecycleFilter>("all");
  const [archiveView, setArchiveView] = useState<"active" | "archived">("active");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    business_name: "",
    service_type: "",
    stage: "lead",
    business_description: "",
  });

  const load = async () => {
    // Best-effort auto-link customers whose email matches exactly one auth user.
    await (supabase.rpc as any)("repair_customer_links").then((res: any) => {
      const row = Array.isArray(res?.data) ? res.data[0] : null;
      if (row?.linked_count > 0) toast.success(`Auto-linked ${row.linked_count} client${row.linked_count === 1 ? "" : "s"} by email match`);
    }).catch(() => {});
    const [c, a] = await Promise.all([
      supabase.from("customers").select("*").order("last_activity_at", { ascending: false }),
      supabase.from("resource_assignments").select("customer_id"),
    ]);
    if (c.data) setRows(c.data);
    if (a.data) setAssignments(a.data as any);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.full_name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    const { error } = await supabase.from("customers").insert([form as any]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Client added");
      setOpen(false);
      setForm({
        full_name: "",
        email: "",
        business_name: "",
        service_type: "",
        stage: "lead",
        business_description: "",
      });
      load();
    }
  };

  const toolCount = (id: string) => assignments.filter((a) => a.customer_id === id).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      const isArchived = !!r.archived_at;
      if (archiveView === "active" && isArchived) return false;
      if (archiveView === "archived" && !isArchived) return false;
      if (q && !(r.full_name?.toLowerCase().includes(q) || r.business_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))) return false;
      if (filter !== "all") return (r.lifecycle_state || "lead") === filter;
      return true;
    });
  }, [rows, search, filter, archiveView]);

  const toggleArchive = async (e: React.MouseEvent, r: any) => {
    e.stopPropagation();
    const archived_at = r.archived_at ? null : new Date().toISOString();
    const { error } = await supabase.from("customers").update({ archived_at } as any).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(archived_at ? "Client archived" : "Client restored"); load(); }
  };

  return (
    <PortalShell variant="admin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Clients</div>
          <h1 className="mt-2 text-3xl text-foreground">All Clients</h1>
        </div>
        <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-border"
          onClick={() =>
            downloadCSV(
              `clients-${new Date().toISOString().slice(0, 10)}`,
              filtered.map((r) => ({
                full_name: r.full_name,
                email: r.email,
                business_name: r.business_name,
                service_type: r.service_type,
                stage: stageLabel(r.stage),
                track: r.track,
                implementation_status: labelOf(IMPLEMENTATION_STATUS, r.implementation_status),
                payment_status: labelOf(PAYMENT_STATUS, r.payment_status),
                tools_assigned: toolCount(r.id),
                next_action: r.next_action,
                last_activity_at: r.last_activity_at,
                created_at: r.created_at,
              })),
            )
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-secondary">
              <Plus className="h-4 w-4" /> New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>New Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <Input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="Business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              <Input placeholder="Service type (e.g. Diagnostic, Implementation)" value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} />
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Textarea placeholder="Business description" value={form.business_description} onChange={(e) => setForm({ ...form, business_description: e.target.value })} />
              <Button onClick={create} className="w-full bg-primary hover:bg-secondary">Create Client</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Lifecycle summary */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4">
        {[{ key: "all", label: "All" }, ...LIFECYCLE_STATES.map(s => ({ key: s.key, label: s.label }))].map((s) => {
          const count = s.key === "all"
            ? rows.filter(r => !r.archived_at).length
            : rows.filter(r => !r.archived_at && (r.lifecycle_state || "lead") === s.key).length;
          const active = filter === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key as LifecycleFilter)}
              className={`text-left p-2.5 rounded-lg border transition-colors ${
                active
                  ? "bg-primary/10 border-primary/40"
                  : "bg-card border-border hover:border-primary/30"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">{s.label}</div>
              <div className="text-lg text-foreground mt-0.5">{count}</div>
            </button>
          );
        })}
      </div>

      {/* Search + archive */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, business, or email" className="pl-9 bg-muted/40 border-border" />
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {ARCHIVE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setArchiveView(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                archiveView === f.key
                  ? "bg-secondary/15 text-secondary border-secondary/40"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-normal">Client</th>
                <th className="text-left px-5 py-3 font-normal">Lifecycle</th>
                <th className="text-left px-5 py-3 font-normal">Packages</th>
                <th className="text-center px-5 py-3 font-normal">Tools</th>
                <th className="text-left px-5 py-3 font-normal">Next Action</th>
                <th className="text-left px-5 py-3 font-normal">Activity</th>
                <th className="text-right px-5 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No clients match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const lc = r.lifecycle_state || "lead";
                const isFullBundle = !!r.package_full_bundle;
                const activeChips = PACKAGE_CHIPS.filter((p) => !!r[p.key]);
                return (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/customers/${r.id}`)}
                  className="cursor-pointer hover:bg-muted/30 transition-colors align-top"
                >
                  <td className="px-5 py-4 max-w-[260px]">
                    <div className="text-foreground flex items-center gap-2 truncate">
                      <span className="truncate">{r.full_name}</span>
                      {isFullBundle && (
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 flex-shrink-0">
                          <Sparkles className="h-2.5 w-2.5" /> Bundle
                        </span>
                      )}
                      {r.archived_at && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border flex-shrink-0">Archived</span>}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.business_name || r.email}</div>
                    <div className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{stageLabel(r.stage)}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${lifecycleTone(lc)}`}>
                      {lifecycleLabel(lc)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {activeChips.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground/60">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {activeChips.map((p) => (
                          <span key={p.key} className={`text-[10px] px-1.5 py-0.5 rounded border ${p.tone}`}>
                            {p.short}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{toolCount(r.id)}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs max-w-[240px] truncate">{r.next_action || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground text-[11px] whitespace-nowrap">{formatDate(r.last_activity_at || r.updated_at)}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/admin/customers/${r.id}`)}
                        title="Edit packages, lifecycle and details"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-primary hover:bg-primary/10"
                      >
                        <PackageIcon className="h-3.5 w-3.5" /> Manage
                      </button>
                      <button
                        onClick={(e) => toggleArchive(e, r)}
                        title={r.archived_at ? "Restore" : "Archive"}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      >
                        {r.archived_at ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">{filtered.length} of {rows.length} clients</div>
    </PortalShell>
  );
}
