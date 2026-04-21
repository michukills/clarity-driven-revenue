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
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/exports";
import { Download } from "lucide-react";

const IMPL_KEYS = new Set(IMPLEMENTATION_STAGES.map((s) => s.key));
type FilterKey = "all" | "leads" | "diagnostic" | "implementation" | "waiting_client" | "waiting_rgs" | "active" | "closed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "leads", label: "Leads" },
  { key: "diagnostic", label: "Diagnostic" },
  { key: "implementation", label: "Implementation" },
  { key: "waiting_client", label: "Waiting on Client" },
  { key: "waiting_rgs", label: "Waiting on RGS" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

export default function Customers() {
  const [rows, setRows] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<{ customer_id: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
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
      if (q && !(r.full_name?.toLowerCase().includes(q) || r.business_name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))) return false;
      if (filter === "leads") return ["lead", "discovery_scheduled", "discovery_completed"].includes(r.stage);
      if (filter === "diagnostic") return ["diagnostic_paid", "diagnostic_in_progress", "diagnostic_delivered", "diagnostic_complete"].includes(r.stage);
      if (filter === "implementation") return IMPL_KEYS.has(r.stage);
      if (filter === "waiting_client") return r.stage === "waiting_on_client" || r.implementation_status === "waiting_client";
      if (filter === "waiting_rgs") return ["lead", "proposal_sent", "diagnostic_in_progress", "implementation_added", "implementation_onboarding"].includes(r.stage);
      if (filter === "active") return r.status === "active" && !["closed", "implementation_complete"].includes(r.stage);
      if (filter === "closed") return ["closed", "implementation_complete"].includes(r.stage);
      return true;
    });
  }, [rows, search, filter]);

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

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, business, or email" className="pl-9 bg-muted/40 border-border" />
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

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-5 py-3 font-normal">Client</th>
                <th className="text-left px-5 py-3 font-normal">Business</th>
                <th className="text-left px-5 py-3 font-normal">Service</th>
                <th className="text-left px-5 py-3 font-normal">Stage</th>
                <th className="text-left px-5 py-3 font-normal">Implementation</th>
                <th className="text-left px-5 py-3 font-normal">Payment</th>
                <th className="text-center px-5 py-3 font-normal">Tools</th>
                <th className="text-left px-5 py-3 font-normal">Next Action</th>
                <th className="text-left px-5 py-3 font-normal">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No clients match these filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/admin/customers/${r.id}`)}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="text-foreground">{r.full_name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{r.business_name || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{r.service_type || "—"}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary whitespace-nowrap">
                      {stageLabel(r.stage)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">
                    {labelOf(IMPLEMENTATION_STATUS, r.implementation_status)}
                  </td>
                  <td className="px-5 py-4 text-xs">
                    <span className={r.payment_status === "unpaid" ? "text-amber-400" : "text-secondary"}>
                      {labelOf(PAYMENT_STATUS, r.payment_status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center text-muted-foreground">{toolCount(r.id)}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs max-w-[220px] truncate">{r.next_action || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.last_activity_at || r.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">{filtered.length} of {rows.length} clients</div>
    </PortalShell>
  );
}
