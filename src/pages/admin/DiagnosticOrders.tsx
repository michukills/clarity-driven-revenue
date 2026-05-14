import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, Copy, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";

type IntakeRow = {
  id: string;
  full_name: string;
  email: string;
  business_name: string;
  monthly_revenue: string | null;
  fit_status: string;
  fit_reason: string | null;
  intake_status: string;
  customer_id: string | null;
  primary_goal: string | null;
  created_at: string;
};

type OrderRow = {
  id: string;
  intake_id: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  paid_at: string | null;
  environment: string;
};

type Tab = "paid_pending" | "in_progress" | "all";

export default function DiagnosticOrders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("paid_pending");
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busyIntakeId, setBusyIntakeId] = useState<string | null>(null);
  const [lastInvite, setLastInvite] = useState<{ intakeId: string; url: string; emailStatus: string } | null>(null);

  async function refresh() {
    setLoading(true);
    const [intakesRes, ordersRes] = await Promise.all([
      supabase
        .from("diagnostic_intakes")
        .select("id, full_name, email, business_name, monthly_revenue, fit_status, fit_reason, intake_status, customer_id, primary_goal, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("diagnostic_orders")
        .select("id, intake_id, status, amount_cents, currency, paid_at, environment")
        .order("created_at", { ascending: false })
        .limit(400),
    ]);
    if (intakesRes.error) toast({ title: "Failed to load intakes", description: intakesRes.error.message, variant: "destructive" });
    if (ordersRes.error) toast({ title: "Failed to load orders", description: ordersRes.error.message, variant: "destructive" });
    setIntakes((intakesRes.data ?? []) as IntakeRow[]);
    setOrders((ordersRes.data ?? []) as OrderRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const ordersByIntake = useMemo(() => {
    const map = new Map<string, OrderRow[]>();
    for (const o of orders) {
      if (!o.intake_id) continue;
      const arr = map.get(o.intake_id) ?? [];
      arr.push(o);
      map.set(o.intake_id, arr);
    }
    return map;
  }, [orders]);

  const filtered = useMemo(() => {
    if (tab === "all") return intakes;
    if (tab === "paid_pending") {
      return intakes.filter((i) => i.intake_status === "paid_pending_access");
    }
    return intakes.filter((i) =>
      ["submitted", "fit_review", "fit_passed", "checkout_started", "invite_sent"].includes(i.intake_status),
    );
  }, [intakes, tab]);

  async function mintInvite(intakeId: string) {
    setBusyIntakeId(intakeId);
    setLastInvite(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-mint-portal-invite", {
        body: {
          intakeId,
          appBaseUrl: window.location.origin,
          expiresInHours: 168,
        },
      });
      if (error || !data?.inviteUrl) {
        throw new Error(error?.message || data?.error || "Failed to mint invite");
      }
      setLastInvite({ intakeId, url: data.inviteUrl as string, emailStatus: data.emailStatus ?? "skipped" });
      toast({
        title: "Invite ready",
        description:
          data.emailStatus === "sent"
            ? "Email sent and link copied to dashboard."
            : "Email infra not configured — copy the link and send it manually.",
      });
      await refresh();
    } catch (e: any) {
      toast({ title: "Invite failed", description: e?.message ?? "Try again.", variant: "destructive" });
    } finally {
      setBusyIntakeId(null);
    }
  }

  function copy(url: string) {
    void navigator.clipboard.writeText(url);
    toast({ title: "Invite link copied" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Diagnostic Orders & Intakes</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Review paid Diagnostic intakes, mint secure portal invites, and track lifecycle from
            submission through portal access. Public account creation is disabled — invites are the
            only way for clients to enter the portal.
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-3 max-w-3xl leading-relaxed">
            Admin-only. Payment, fit, and access gates are not changed here — this view only surfaces what
            needs admin action next. Invites are single-use and expire automatically.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          {([
            { key: "paid_pending", label: "Paid — Pending Invite" },
            { key: "in_progress", label: "In Progress" },
            { key: "all", label: "All" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm border transition-colors ${
                tab === t.key
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading diagnostic intakes and orders…
          </div>
        ) : filtered.length === 0 ? (
          <WorkflowEmptyState
            title="No diagnostic intakes match this view yet."
            body="Paid diagnostic intakes appear here automatically once a Stripe order completes and the intake form is submitted. Adjust the filter above to see other statuses, or open Customers to start an admin-led intake."
            primary={{ label: "Open Customers", to: "/admin/customers", testId: "diag-orders-empty-cta" }}
            testId="diag-orders-empty"
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((i) => {
              const intakeOrders = ordersByIntake.get(i.id) ?? [];
              const paidOrder = intakeOrders.find((o) => o.status === "paid");
              const canMint = i.intake_status === "paid_pending_access" && !!paidOrder;
              const inviteSent = i.intake_status === "invite_sent";
              const accepted = i.intake_status === "invite_accepted";
              const isLast = lastInvite?.intakeId === i.id;
              return (
                <div key={i.id} className="bg-card border border-border rounded-2xl p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-medium text-foreground truncate">
                          {i.business_name}
                        </h2>
                        <StatusBadge status={i.intake_status} />
                        <FitBadge fit={i.fit_status} />
                        {paidOrder && (
                          <span className="text-[11px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Paid ${(paidOrder.amount_cents / 100).toLocaleString()} · {paidOrder.environment}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {i.full_name} · {i.email} · {i.monthly_revenue ?? "—"}
                      </div>
                      {i.primary_goal && (
                        <p className="text-sm text-foreground/80 mt-3 max-w-3xl">
                          <span className="text-muted-foreground">Goal: </span>
                          {i.primary_goal}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground/70 mt-3">
                        Submitted {format(new Date(i.created_at), "PP p")}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {canMint && (
                        <Button
                          onClick={() => mintInvite(i.id)}
                          disabled={busyIntakeId === i.id}
                          className="bg-primary text-primary-foreground hover:bg-secondary"
                        >
                          {busyIntakeId === i.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Mail className="w-4 h-4 mr-2" />
                          )}
                          Approve & Send Invite
                        </Button>
                      )}
                      {(inviteSent || accepted) && (
                        <Button
                          onClick={() => mintInvite(i.id)}
                          disabled={busyIntakeId === i.id}
                          variant="outline"
                        >
                          {busyIntakeId === i.id ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Mail className="w-4 h-4 mr-2" />
                          )}
                          Re-issue Invite
                        </Button>
                      )}
                      {accepted && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> Portal account claimed
                        </span>
                      )}
                      {i.customer_id && (
                        <Link
                          to={`/admin/customers/${i.customer_id}`}
                          className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                          Open customer record
                        </Link>
                      )}
                    </div>
                  </div>

                  {isLast && lastInvite && (
                    <div className="mt-5 p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="text-xs uppercase tracking-wider text-primary mb-2">
                        One-time invite link (single-use, expires in 7 days)
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="flex-1 min-w-0 text-xs break-all px-3 py-2 rounded-md bg-background/60 border border-border">
                          {lastInvite.url}
                        </code>
                        <Button size="sm" variant="outline" onClick={() => copy(lastInvite.url)}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy
                        </Button>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
                        {lastInvite.emailStatus === "sent" ? (
                          <>
                            <Mail className="w-3 h-3 text-emerald-400" /> Email sent to {i.email}.
                          </>
                        ) : lastInvite.emailStatus === "failed" ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-500" /> Email send failed.
                            Send the link manually.
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-500" /> Email infrastructure
                            not configured. Copy the link and send manually.
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {i.fit_reason && (
                    <p className="text-xs text-muted-foreground/80 mt-4 italic">
                      Fit note: {i.fit_reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: "bg-muted text-muted-foreground border-border",
    fit_review: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    fit_passed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    fit_declined: "bg-red-500/15 text-red-300 border-red-500/30",
    checkout_started: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    paid_pending_access: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    invite_sent: "bg-primary/15 text-primary border-primary/30",
    invite_accepted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    abandoned: "bg-muted text-muted-foreground border-border",
    refunded: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-full border ${map[status] ?? map.submitted}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function FitBadge({ fit }: { fit: string }) {
  if (fit === "auto_qualified") return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">qualified</span>;
  if (fit === "needs_review") return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">review</span>;
  if (fit === "auto_declined") return <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">declined</span>;
  return null;
}