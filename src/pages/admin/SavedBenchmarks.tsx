import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History, Search, ExternalLink, Trash2 } from "lucide-react";
import { INTERNAL_TOOL_PLACEHOLDERS } from "@/lib/portal";
import { toast } from "sonner";

const TOOL_ROUTES: Record<string, string> = {
  rgs_stability_scorecard: "/admin/tools/stability-scorecard",
  revenue_leak_finder: "/admin/tools/revenue-leak-finder",
  buyer_persona_tool: "/admin/tools/persona-builder",
  customer_journey_mapper: "/admin/tools/journey-mapper",
  process_breakdown_tool: "/admin/tools/process-breakdown",
};

const TOOL_LABELS: Record<string, string> = Object.fromEntries(
  INTERNAL_TOOL_PLACEHOLDERS.map((p) => [p.key, p.title]),
);

interface Run {
  id: string;
  tool_key: string;
  customer_id: string | null;
  title: string;
  data: any;
  summary: any;
  internal_notes: string | null;
  client_notes: string | null;
  updated_at: string;
  created_at: string;
}
interface Customer {
  id: string;
  full_name: string;
  business_name: string | null;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" },
  )}`;
};

const summarize = (s: any): string | null => {
  if (!s || typeof s !== "object") return null;
  // Common fields across tools
  const candidates = [
    s.score,
    s.overallScore,
    s.totalScore,
    s.healthScore,
    s.severity,
    s.headline,
    s.summary,
  ].filter((v) => v !== undefined && v !== null && v !== "");
  if (candidates.length === 0) return null;
  const first = candidates[0];
  if (typeof first === "number") return `Score: ${Math.round(first * 100) / 100}`;
  if (typeof first === "string") return first.length > 80 ? first.slice(0, 77) + "…" : first;
  return null;
};

export default function SavedBenchmarks() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [toolFilter, setToolFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      supabase.from("tool_runs").select("*").order("updated_at", { ascending: false }),
      supabase.from("customers").select("id, full_name, business_name").order("full_name"),
    ]);
    if (r.data) setRuns(r.data as any);
    if (c.data) setCustomers(c.data as any);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const customerMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const toolKeys = useMemo(() => {
    const set = new Set<string>();
    runs.forEach((r) => r.tool_key && set.add(r.tool_key));
    return Array.from(set).sort();
  }, [runs]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return runs.filter((r) => {
      if (customerFilter !== "all") {
        if (customerFilter === "__none__" ? r.customer_id !== null : r.customer_id !== customerFilter) return false;
      }
      if (toolFilter !== "all" && r.tool_key !== toolFilter) return false;
      if (q) {
        const cust = r.customer_id ? customerMap.get(r.customer_id) : null;
        const hay = [
          r.title,
          r.tool_key,
          TOOL_LABELS[r.tool_key],
          cust?.full_name,
          cust?.business_name,
          r.internal_notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [runs, search, customerFilter, toolFilter, customerMap]);

  const openRun = (r: Run) => {
    const route = TOOL_ROUTES[r.tool_key];
    if (!route) {
      toast.error("This benchmark's tool is no longer available.");
      return;
    }
    navigate(`${route}?run=${r.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this saved benchmark? This cannot be undone.")) return;
    const { error } = await supabase.from("tool_runs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Benchmark deleted");
    load();
  };

  return (
    <PortalShell variant="admin">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">RGS OS · Internal</div>
          <h1 className="mt-1 text-3xl text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" /> Saved Benchmarks™
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Every benchmark you save from an internal tool is automatically named by client + timestamp and listed here.
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-2 max-w-2xl leading-relaxed">
            Admin-only. Benchmarks are scoped per client through tool_runs RLS — one client can never see another's saved benchmark. Internal notes never leak to the client view.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Search</label>
          <div className="relative mt-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, client, tool…"
              className="pl-9 bg-muted/40 border-border"
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Customer</label>
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
          >
            <option value="all">All customers</option>
            <option value="__none__">— No client linked —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
                {c.business_name ? ` · ${c.business_name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Tool</label>
          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value)}
            className="mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10"
          >
            <option value="all">All tools</option>
            {toolKeys.map((k) => (
              <option key={k} value={k}>
                {TOOL_LABELS[k] || k}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted-foreground pb-2">
          {filtered.length} of {runs.length} benchmarks
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading benchmarks…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No saved benchmarks match these filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Benchmark</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Tool</th>
                <th className="text-left px-4 py-3">Date / Time</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cust = r.customer_id ? customerMap.get(r.customer_id) : null;
                const result = summarize(r.summary);
                const hasNotes = !!(r.internal_notes && r.internal_notes.trim());
                const route = TOOL_ROUTES[r.tool_key];
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openRun(r)}
                        className="text-left text-foreground hover:text-primary"
                        disabled={!route}
                      >
                        {r.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cust ? (
                        <span>
                          {cust.business_name || cust.full_name}
                          {cust.business_name && (
                            <span className="block text-[11px] opacity-70">{cust.full_name}</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TOOL_LABELS[r.tool_key] || r.tool_key}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(r.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {result || <span className="opacity-60">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {hasNotes ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400">
                          Has notes
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openRun(r)}
                        disabled={!route}
                        className="border-border h-8"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </Button>
                      <button
                        onClick={() => remove(r.id)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PortalShell>
  );
}
