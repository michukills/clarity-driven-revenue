// P7.2.5 — Compact admin dashboard panel showing recent client account activity:
// auto-linked customers + pending signups that still need a manual link.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, UserCheck, UserPlus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminAccountLinks } from "@/lib/adminAccountLinks";

type LinkedRecent = {
  id: string;
  full_name: string;
  business_name: string | null;
  created_at: string;
  auto: boolean;
};

type PendingSignup = {
  user_id: string;
  email: string;
  created_at: string;
};

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminNewAccountsPanel() {
  const [recent, setRecent] = useState<LinkedRecent[]>([]);
  const [pending, setPending] = useState<PendingSignup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Recently linked: any customer_timeline entry of these event types in last 14 days.
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const [tlRes, signupsRes] = await Promise.all([
        supabase
          .from("customer_timeline")
          .select("customer_id, event_type, created_at")
          .in("event_type", ["client_account_auto_linked", "account_linked"])
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20),
        adminAccountLinks.listUnlinkedSignups().then(
          (data) => ({ data: data.slice(0, 5) }),
          () => ({ data: [] as PendingSignup[] }),
        ),
      ]);

      const tl = (tlRes.data as any[]) || [];
      const customerIds = Array.from(new Set(tl.map((r) => r.customer_id)));
      let customers: any[] = [];
      if (customerIds.length) {
        const { data } = await supabase
          .from("customers")
          .select("id, full_name, business_name")
          .in("id", customerIds);
        customers = data || [];
      }
      const cMap = new Map(customers.map((c) => [c.id, c]));

      // Dedupe: most recent event per customer wins.
      const seen = new Set<string>();
      const dedup: LinkedRecent[] = [];
      for (const r of tl) {
        if (seen.has(r.customer_id)) continue;
        seen.add(r.customer_id);
        const c = cMap.get(r.customer_id);
        if (!c) continue;
        dedup.push({
          id: r.customer_id,
          full_name: c.full_name,
          business_name: c.business_name,
          created_at: r.created_at,
          auto: r.event_type === "client_account_auto_linked",
        });
        if (dedup.length >= 5) break;
      }

      if (!cancelled) {
        setRecent(dedup);
        setPending(signupsRes.data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = recent.length + pending.length;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary/70" />
          <h3 className="text-sm font-medium text-foreground">New Client Accounts</h3>
          <span className="text-[11px] text-muted-foreground">
            {recent.length} linked · {pending.length} pending
          </span>
        </div>
        <Link
          to="/admin/pending-accounts"
          className="inline-flex items-center gap-1 text-xs text-primary hover:text-secondary"
        >
          Open onboarding <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="text-xs text-muted-foreground">Loading…</div>
      ) : total === 0 ? (
        <div className="text-xs text-muted-foreground">No new account activity.</div>
      ) : (
        <ul className="space-y-1.5">
          {recent.map((r) => (
            <li
              key={`l-${r.id}`}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-2.5"
            >
              <UserCheck className="h-3.5 w-3.5 text-[hsl(140_50%_65%)] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Link
                    to={`/admin/customers/${r.id}`}
                    className="text-xs text-foreground font-medium truncate hover:text-primary"
                  >
                    {r.business_name || r.full_name}
                  </Link>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.auto ? "Auto-linked" : "Linked"} · {fmt(r.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {r.auto
                    ? "Account auto-linked to this customer record."
                    : "Account linked to this customer record."}
                </p>
              </div>
            </li>
          ))}
          {pending.map((p) => (
            <li
              key={`p-${p.user_id}`}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/10 p-2.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-foreground font-medium truncate">{p.email}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Needs manual link · {fmt(p.created_at)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  New signup waiting to be linked or denied.
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
