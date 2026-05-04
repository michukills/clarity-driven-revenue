import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminListAllClientHealthRecords,
  HEALTH_LABEL, RENEWAL_LABEL, ENGAGEMENT_LABEL, ACTION_LABEL,
  type AdminClientHealthRecord,
} from "@/lib/clientHealth";

export default function ClientHealthOverview() {
  const [items, setItems] = useState<AdminClientHealthRecord[]>([]);
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [risk, setRisk] = useState<string>("");
  const [health, setHealth] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const r = await adminListAllClientHealthRecords();
        setItems(r);
        const ids = Array.from(new Set(r.map(i => i.customer_id)));
        if (ids.length) {
          const { data } = await supabase
            .from("customers").select("id, full_name").in("id", ids);
          const map: Record<string, string> = {};
          for (const c of (data ?? []) as any[]) map[c.id] = c.full_name ?? c.id;
          setCustomers(map);
        }
      } catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = useMemo(() => items.filter(i => {
    if (risk && i.renewal_risk_level !== risk) return false;
    if (health && i.health_status !== health) return false;
    if (filter) {
      const t = filter.toLowerCase();
      const name = (customers[i.customer_id] ?? "").toLowerCase();
      if (!i.title.toLowerCase().includes(t) && !name.includes(t)) return false;
    }
    return true;
  }), [items, filter, risk, health, customers]);

  const grouped = useMemo(() => {
    const g: Record<string, AdminClientHealthRecord[]> = {
      attention: [], at_risk: [], watch: [], healthy: [], other: [],
    };
    for (const i of filtered) {
      if (i.attention_needed) g.attention.push(i);
      else if (i.health_status === "at_risk") g.at_risk.push(i);
      else if (i.health_status === "watch" || i.health_status === "needs_attention") g.watch.push(i);
      else if (i.health_status === "healthy" || i.health_status === "stable") g.healthy.push(i);
      else g.other.push(i);
    }
    return g;
  }, [filtered]);

  return (
    <PortalShell variant="admin">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Client Health / Renewal Risk</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            This is an internal admin view for spotting clients who may need review, follow-up,
            clarification, or renewal attention. It does not guarantee renewal, retention, or
            client outcomes, and it does not change payment or access gates. Internal notes stay
            admin-only and are never shown to the client.
          </p>
        </header>

        <div className="flex flex-wrap gap-3">
          <Input
            className="max-w-xs"
            placeholder="Filter by client or title"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
          <select className="h-9 px-2 rounded border border-border bg-background text-foreground text-sm"
            value={health} onChange={e => setHealth(e.target.value)}>
            <option value="">All health</option>
            {["healthy","stable","watch","needs_attention","at_risk","unknown"].map(s =>
              <option key={s} value={s}>{HEALTH_LABEL(s as any)}</option>)}
          </select>
          <select className="h-9 px-2 rounded border border-border bg-background text-foreground text-sm"
            value={risk} onChange={e => setRisk(e.target.value)}>
            <option value="">All renewal risk</option>
            {["low","moderate","high","critical","unknown"].map(s =>
              <option key={s} value={s}>{RENEWAL_LABEL(s as any)}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground border border-border rounded p-6">
            No client health records yet. Open a customer and add one from the Client Health admin page.
          </div>
        ) : (
          <div className="space-y-6">
            <Group title="Attention needed" rows={grouped.attention} customers={customers} />
            <Group title="At risk" rows={grouped.at_risk} customers={customers} />
            <Group title="Watch / needs attention" rows={grouped.watch} customers={customers} />
            <Group title="Healthy / stable" rows={grouped.healthy} customers={customers} />
            <Group title="Other" rows={grouped.other} customers={customers} />
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function Group({
  title, rows, customers,
}: { title: string; rows: AdminClientHealthRecord[]; customers: Record<string, string> }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="text-lg text-foreground font-serif mb-2">{title} <span className="text-muted-foreground text-sm">({rows.length})</span></h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(r => (
          <Link key={r.id} to={`/admin/customers/${r.customer_id}/client-health`}
            className="block border border-border rounded p-3 hover:bg-muted/30 transition">
            <div className="text-sm text-foreground">{customers[r.customer_id] ?? r.customer_id}</div>
            <div className="text-xs text-muted-foreground">{r.title}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline">Health: {HEALTH_LABEL(r.health_status)}</Badge>
              <Badge variant="outline">Renewal: {RENEWAL_LABEL(r.renewal_risk_level)}</Badge>
              <Badge variant="outline">{ENGAGEMENT_LABEL(r.engagement_status)}</Badge>
              {r.admin_action_type !== "none" && <Badge>{ACTION_LABEL(r.admin_action_type)}</Badge>}
              {r.next_review_date && <Badge variant="outline">Next review: {r.next_review_date}</Badge>}
              {r.renewal_date && <Badge variant="outline">Renewal: {r.renewal_date}</Badge>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
