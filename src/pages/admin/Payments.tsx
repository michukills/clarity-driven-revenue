import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type OrderRow = {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  amount_cents: number | null;
  subtotal_cents: number | null;
  tax_cents: number | null;
  total_cents: number | null;
  currency: string;
  environment: string;
  stripe_session_id: string | null;
  payment_lane: string | null;
  billing_type: string | null;
  email: string;
  customer_id: string | null;
  intake_id: string | null;
  offer_slug: string | null;
  offer_name: string | null;
  offer_type: string | null;
  customer_business_name: string | null;
  customer_full_name: string | null;
  intake_business_name: string | null;
  intake_full_name: string | null;
  intake_status: string | null;
  fit_status: string | null;
  next_action: string;
};

type SubRow = {
  id: string;
  customer_id: string;
  status: string;
  amount_cents: number;
  currency: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  stripe_subscription_id: string | null;
};

type Notif = {
  id: string;
  kind: string;
  message: string;
  next_action: string | null;
  priority: string;
  read_at: string | null;
  completed_at: string | null;
  created_at: string;
  business_name: string | null;
  email: string | null;
  amount_cents: number | null;
  currency: string | null;
  payment_lane: string | null;
  customer_id: string | null;
  order_id: string | null;
  email_status: string | null;
  email_sent_at: string | null;
  email_error: string | null;
  email_attempts: number | null;
};

const money = (c: number | null | undefined, cur = "usd") =>
  typeof c === "number" ? `${cur.toUpperCase() === "USD" ? "$" : ""}${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";

export default function AdminPayments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [tab, setTab] = useState<"all" | "needs_action" | "subscriptions">("needs_action");

  async function refresh() {
    setLoading(true);
    const [oRes, sRes, nRes] = await Promise.all([
      supabase.from("v_admin_payment_orders" as any).select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("payment_subscriptions").select("id, customer_id, status, amount_cents, currency, current_period_end, cancel_at_period_end, environment, stripe_subscription_id").order("updated_at", { ascending: false }).limit(200),
      supabase.from("admin_notifications").select("id, kind, message, next_action, priority, read_at, completed_at, created_at, business_name, email, amount_cents, currency, payment_lane, customer_id, order_id, email_status, email_sent_at, email_error, email_attempts").is("completed_at", null).order("created_at", { ascending: false }).limit(100),
    ]);
    if (oRes.error) toast({ title: "Failed to load orders", description: oRes.error.message, variant: "destructive" });
    setOrders((oRes.data ?? []) as unknown as OrderRow[]);
    setSubs((sRes.data ?? []) as SubRow[]);
    setNotifs((nRes.data ?? []) as Notif[]);
    setLoading(false);
  }

  useEffect(() => { void refresh(); }, []);

  const filtered = useMemo(() => {
    if (tab === "needs_action") {
      return orders.filter(o =>
        o.status === "pending" ||
        (o.status === "paid" && (o.intake_status === "paid_pending_access" || (o.payment_lane === "existing_client" && o.offer_type === "implementation"))) ||
        o.status === "failed",
      );
    }
    return orders;
  }, [orders, tab]);

  async function dismissNotif(id: string) {
    const { error } = await supabase.from("admin_notifications").update({ completed_at: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Failed", description: error.message, variant: "destructive" });
    else setNotifs(n => n.filter(x => x.id !== id));
  }

  async function retryEmail(id: string) {
    const { error } = await supabase.rpc("admin_notification_retry_email", { _notification_id: id });
    if (error) toast({ title: "Could not flag for retry", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Marked for retry", description: "Email will be resent manually for now (no scheduler). Track status in this view." });
      void refresh();
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Payments & Client Activity</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
            Every paid intake, existing-client payment, and Revenue Control System subscription event in
            one operational view. Payments never auto-unlock tools — admin assignment still controls
            portal access.
          </p>
        </header>

        {notifs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">
              Action queue ({notifs.length})
            </h2>
            <div className="space-y-2">
              {notifs.map(n => (
                <div key={n.id} className="flex flex-wrap items-start justify-between gap-3 bg-card border border-border rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${n.priority === "high" ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-muted text-muted-foreground border-border"}`}>{n.kind.replace(/_/g, " ")}</span>
                      {n.business_name && <span className="text-sm font-medium">{n.business_name}</span>}
                      {n.email && <span className="text-xs text-muted-foreground">{n.email}</span>}
                      {n.amount_cents != null && <span className="text-xs text-muted-foreground">{money(n.amount_cents, n.currency ?? "usd")}</span>}
                    </div>
                    <p className="text-sm mt-1">{n.message}</p>
                    {n.next_action && <p className="text-xs text-primary mt-1">→ {n.next_action}</p>}
                    <EmailStatusLine n={n} />
                  </div>
                  <div className="flex gap-2 items-center">
                    {n.customer_id && (
                      <Link to={`/admin/customers/${n.customer_id}`} className="text-xs underline text-muted-foreground hover:text-foreground">Open client</Link>
                    )}
                    {(n.email_status === "failed" || n.email_status === "skipped_missing_config") && (
                      <button onClick={() => retryEmail(n.id)} className="text-xs px-3 py-1 rounded-md border border-amber-500/40 text-amber-300 hover:bg-amber-500/10">Flag email retry</button>
                    )}
                    <button onClick={() => dismissNotif(n.id)} className="text-xs px-3 py-1 rounded-md border border-border hover:bg-muted">Mark done</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-2 mb-6">
          {([{ k: "needs_action", l: "Needs action" }, { k: "all", l: "All payments" }, { k: "subscriptions", l: "Subscriptions" }] as const).map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-2 rounded-md text-sm border transition-colors ${tab === t.k ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>{t.l}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center py-16 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
        ) : tab === "subscriptions" ? (
          <SubsTable subs={subs} />
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">No payments match this view.</div>
        ) : (
          <div className="overflow-x-auto bg-card border border-border rounded-2xl">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3">Client / intake</th>
                  <th className="text-left px-4 py-3">Offer</th>
                  <th className="text-left px-4 py-3">Lane</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Next action</th>
                  <th className="text-left px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer_business_name ?? o.intake_business_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_full_name ?? o.intake_full_name} · {o.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.offer_name ?? o.offer_slug ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{o.offer_type} · {o.billing_type ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">{o.payment_lane?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {money(o.total_cents ?? o.amount_cents, o.currency)}
                      {o.tax_cents != null && o.tax_cents > 0 && <div className="text-[10px] text-muted-foreground">incl tax {money(o.tax_cents, o.currency)}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-primary">{o.next_action}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {o.paid_at ? `Paid ${format(new Date(o.paid_at), "PP")}` : format(new Date(o.created_at), "PP")}
                      {o.customer_id && <div><Link className="underline" to={`/admin/customers/${o.customer_id}`}>Open client</Link></div>}
                      {!o.customer_id && o.intake_id && <div><Link className="underline" to="/admin/diagnostic-orders">Review intake</Link></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    failed: "bg-red-500/15 text-red-300 border-red-500/30",
    canceled: "bg-muted text-muted-foreground border-border",
    refunded: "bg-red-500/10 text-red-300 border-red-500/30",
  };
  return <span className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-full border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>{status}</span>;
}

function SubsTable({ subs }: { subs: SubRow[] }) {
  if (!subs.length) return <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">No subscriptions yet.</div>;
  return (
    <div className="overflow-x-auto bg-card border border-border rounded-2xl">
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
          <tr><th className="text-left px-4 py-3">Customer</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Monthly</th><th className="text-left px-4 py-3">Period end</th><th className="text-left px-4 py-3">Env</th></tr>
        </thead>
        <tbody>
          {subs.map(s => (
            <tr key={s.id} className="border-b border-border/50">
              <td className="px-4 py-3"><Link className="underline" to={`/admin/customers/${s.customer_id}`}>Open client</Link></td>
              <td className="px-4 py-3"><StatusPill status={s.status} />{s.cancel_at_period_end && <div className="text-[10px] text-amber-400 mt-1">cancel at period end</div>}</td>
              <td className="px-4 py-3 text-right">{money(s.amount_cents, s.currency)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">{s.current_period_end ? format(new Date(s.current_period_end), "PP") : "—"}</td>
              <td className="px-4 py-3 text-xs">{s.environment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
