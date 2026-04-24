import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/portal";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Circle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV } from "@/lib/exports";
import { GearChip, GearSelect } from "@/components/gears/GearChip";
import { TARGET_GEARS, gearMeta } from "@/lib/gears/targetGear";

type Task = { id: string; title: string; description: string | null; status: string; due_date: string | null; customer_id: string; target_gear: number | null };
type Filter = "all" | "open" | "due_today" | "overdue" | "done";
type GearFilter = "all" | "ungeared" | "1" | "2" | "3" | "4" | "5";

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customers, setCustomers] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<Filter>("open");
  const [gearFilter, setGearFilter] = useState<GearFilter>(() => {
    const g = searchParams.get("gear");
    if (g === "ungeared") return "ungeared";
    if (g && ["1", "2", "3", "4", "5"].includes(g)) return g as GearFilter;
    return "all";
  });
  const [search, setSearch] = useState("");

  // Keep the URL in sync so deep-links share state.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (gearFilter === "all") next.delete("gear");
    else next.set("gear", gearFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gearFilter]);

  const load = async () => {
    const [t, c] = await Promise.all([
      supabase.from("customer_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("customers").select("id, full_name, business_name"),
    ]);
    if (t.data) setTasks(t.data as any);
    if (c.data) {
      const map: Record<string, any> = {};
      (c.data as any[]).forEach((x) => (map[x.id] = x));
      setCustomers(map);
    }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (t: Task) => {
    const status = t.status === "done" ? "open" : "done";
    await supabase.from("customer_tasks").update({ status, completed_at: status === "done" ? new Date().toISOString() : null }).eq("id", t.id);
    load();
  };

  const setGear = async (t: Task, gear: number | null) => {
    await supabase.from("customer_tasks").update({ target_gear: gear }).eq("id", t.id);
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, target_gear: gear } : x)));
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (gearFilter !== "all") {
        if (gearFilter === "ungeared" && t.target_gear) return false;
        if (gearFilter !== "ungeared" && t.target_gear !== Number(gearFilter)) return false;
      }
      if (filter === "open") return t.status !== "done";
      if (filter === "done") return t.status === "done";
      if (filter === "due_today") return t.due_date && new Date(t.due_date).toDateString() === today.toDateString();
      if (filter === "overdue") return t.due_date && new Date(t.due_date) < today && t.status !== "done";
      return true;
    });
  }, [tasks, filter, search, gearFilter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "due_today", label: "Due Today" },
    { key: "overdue", label: "Overdue" },
    { key: "done", label: "Completed" },
    { key: "all", label: "All" },
  ];

  return (
    <PortalShell variant="admin">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tasks</div>
          <h1 className="mt-2 text-3xl text-foreground">All Tasks</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Tasks created from any client profile show up here. Use this view to manage delivery work across all engagements.
          </p>
        </div>
        <Button
          variant="outline"
          className="border-border"
          onClick={() =>
            downloadCSV(
              `tasks-${new Date().toISOString().slice(0, 10)}`,
              filtered.map((t) => ({
                title: t.title,
                status: t.status,
                due_date: t.due_date,
                client: customers[t.customer_id]?.business_name || customers[t.customer_id]?.full_name || "",
                description: t.description,
              })),
            )
          }
        >
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className="pl-9 bg-muted/40 border-border" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
              filter === f.key ? "bg-primary/15 text-primary border-primary/40" : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-6">
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mr-2">Target Gear</span>
        {([
          { k: "all", label: "All gears" },
          { k: "ungeared", label: "Ungeared" },
          ...TARGET_GEARS.map((g) => ({ k: String(g.gear), label: g.short })),
        ] as { k: GearFilter; label: string }[]).map((f) => (
          <button
            key={f.k}
            onClick={() => setGearFilter(f.k)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
              gearFilter === f.k
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">No tasks match these filters.</div>
        )}
        {filtered.map((t) => {
          const c = customers[t.customer_id];
          const overdue = t.due_date && new Date(t.due_date) < today && t.status !== "done";
          return (
            <div key={t.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
              <button onClick={() => toggle(t)} className="text-primary mt-1 flex-shrink-0">
                {t.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <GearChip gear={t.target_gear} />
                  <div className={`text-sm truncate ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                </div>
                {c && <Link to={`/admin/customers/${c.id}`} className="text-[11px] text-muted-foreground hover:text-foreground">{c.business_name || c.full_name}</Link>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <GearSelect value={t.target_gear} onChange={(g) => setGear(t, g)} className="hidden md:block" />
                {t.due_date && (
                  <span className={`text-[11px] whitespace-nowrap ${overdue ? "text-amber-400" : "text-muted-foreground"}`}>
                    {overdue ? "Overdue · " : ""}{formatDate(t.due_date)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">{filtered.length} of {tasks.length} tasks</div>
    </PortalShell>
  );
}
