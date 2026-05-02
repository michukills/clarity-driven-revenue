import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Order = {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  amount_cents: number | null;
  total_cents: number | null;
  tax_cents: number | null;
  subtotal_cents: number | null;
  currency: string;
  environment: string;
  stripe_session_id: string | null;
  payment_lane: string | null;
  billing_type: string | null;
  offer_slug: string | null;
  offer_name: string | null;
  offer_type: string | null;
  next_action: string;
};

type Sub = {
  id: string;
  status: string;
  amount_cents: number;
  currency: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
  stripe_subscription_id: string | null;
};

const money = (c: number | null | undefined, cur = "usd") =>
  typeof c === "number" ? `${cur.toUpperCase() === "USD" ? "$" : ""}${(c / 100).toLocaleString()}` : "—";

export function CustomerPaymentHistory({ customerId }: { customerId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [oRes, sRes] = await Promise.all([
        supabase.from("v_admin_payment_orders" as any).select("*").eq("customer_id", customerId).order("created_at", { ascending: false }),
        supabase.from("payment_subscriptions").select("id, status, amount_cents, currency, current_period_end, cancel_at_period_end, environment, stripe_subscription_id").eq("customer_id", customerId).order("updated_at", { ascending: false }),
      ]);
      if (!cancelled) {
        setOrders(((oRes.data ?? []) as unknown) as Order[]);
        setSubs((sRes.data ?? []) as Sub[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  if (loading) return <div className="flex items-center text-muted-foreground text-xs"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading payment history…</div>;
  if (!orders.length && !subs.length) return <p className="text-xs text-muted-foreground">No payments or subscriptions on file yet.</p>;

  return (
    <div className="space-y-6">
      {orders.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Payments</h4>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left px-3 py-2">Offer</th>
                  <th className="text-left px-3 py-2">Lane</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Stripe</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="px-3 py-2">
                      <div>{o.offer_name ?? o.offer_slug ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{o.offer_type} · {o.billing_type ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{o.payment_lane?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {money(o.total_cents ?? o.amount_cents, o.currency)}
                      {o.tax_cents != null && o.tax_cents > 0 && <div className="text-[10px] text-muted-foreground">tax {money(o.tax_cents, o.currency)}</div>}
                    </td>
                    <td className="px-3 py-2 text-xs">{o.status}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{o.paid_at ? `Paid ${format(new Date(o.paid_at), "PP")}` : format(new Date(o.created_at), "PP")}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{o.stripe_session_id ?? "—"} · {o.environment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {subs.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Subscriptions</h4>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Monthly</th><th className="text-left px-3 py-2">Period end</th><th className="text-left px-3 py-2">Stripe</th></tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="px-3 py-2 text-xs">{s.status}{s.cancel_at_period_end && <span className="text-[10px] text-amber-400 ml-2">cancels at period end</span>}</td>
                    <td className="px-3 py-2 text-right">{money(s.amount_cents, s.currency)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{s.current_period_end ? format(new Date(s.current_period_end), "PP") : "—"}</td>
                    <td className="px-3 py-2 text-[10px] text-muted-foreground">{s.stripe_subscription_id ?? "—"} · {s.environment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
