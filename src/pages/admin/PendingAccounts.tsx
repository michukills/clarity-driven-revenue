import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Link2, ArrowRight, CheckCircle2, Mail, Clock, X, Undo2, AlertTriangle, MailX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminAccountLinks } from "@/lib/adminAccountLinks";
import { isCustomerFlowAccount } from "@/lib/customers/accountKind";
import { AdminScopeBanner } from "@/components/admin/AdminScopeBanner";
import { SignupRequestsPanel } from "@/components/admin/SignupRequestsPanel";
import { WorkflowEmptyState } from "@/components/admin/WorkflowEmptyState";

type PendingSignup = {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};

type CustomerRow = {
  id: string;
  full_name: string;
  email: string;
  business_name: string | null;
  user_id: string | null;
  stage: string;
  portal_unlocked: boolean;
  last_activity_at: string;
  account_kind?: string | null;
  status?: string | null;
  is_demo_account?: boolean | null;
};

type PendingSignupAction =
  | { kind: "create_new"; signup: PendingSignup }
  | { kind: "link_existing"; signup: PendingSignup; customer: CustomerRow }
  | { kind: "deny"; signup: PendingSignup };

/** Convert raw stage enum values like `implementation_active` into "Implementation Active". */
function humanizeStage(stage: string | null | undefined): string {
  if (!stage) return "—";
  return stage
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PendingAccounts() {
  const [signups, setSignups] = useState<PendingSignup[]>([]);
  const [linked, setLinked] = useState<CustomerRow[]>([]);
  const [unlinkedCustomers, setUnlinkedCustomers] = useState<CustomerRow[]>([]);
  const [denied, setDenied] = useState<{ user_id: string; email: string; denied_at: string; reason: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [pickerFor, setPickerFor] = useState<PendingSignup | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingSignupAction | null>(null);
  const [actionNote, setActionNote] = useState("");

  const load = async () => {
    setLoading(true);
    // Repair obvious links first so users never need to manually link a clean email match.
    try { await adminAccountLinks.repairCustomerLinks(); } catch { /* non-fatal */ }
    const [signupsRes, customersRes, deniedRes] = await Promise.all([
      adminAccountLinks.listUnlinkedSignups().then(
        (data) => ({ data, error: null as any }),
        (error) => ({ data: [] as PendingSignup[], error }),
      ),
      supabase
        .from("customers")
        .select(
          "id, full_name, email, business_name, user_id, stage, portal_unlocked, last_activity_at, account_kind, status, is_demo_account",
        )
        .order("last_activity_at", { ascending: false }),
      (supabase as any).from("denied_signups").select("user_id, email, denied_at, reason").order("denied_at", { ascending: false }),
    ]);
    if (signupsRes.error) toast.error("Could not load pending signups: " + signupsRes.error.message);
    setSignups((signupsRes.data as PendingSignup[]) || []);
    // Internal RGS/admin accounts are not part of the client signup/link flow.
    const all = ((customersRes.data as CustomerRow[]) || []).filter(isCustomerFlowAccount);
    setLinked(all.filter((c) => !!c.user_id));
    setUnlinkedCustomers(all.filter((c) => !c.user_id));
    setDenied((deniedRes?.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const actionLabel = (action: PendingSignupAction) => {
    if (action.kind === "create_new") return "Create New Customer";
    if (action.kind === "link_existing") return "Link to Existing Customer";
    return "Deny Signup";
  };

  const pendingActionHeadline = (action: PendingSignupAction) => {
    if (action.kind === "create_new") {
      return `You are about to create a customer for ${action.signup.email}`;
    }
    if (action.kind === "link_existing") {
      return `You are about to link ${action.signup.email} to ${action.customer.email}`;
    }
    return `You are about to deny ${action.signup.email}`;
  };

  const openPendingAction = (action: PendingSignupAction) => {
    setRowErrors((prev) => ({ ...prev, [action.signup.user_id]: "" }));
    setActionNote("");
    setPendingAction(action);
  };

  const createFromSignup = async (s: PendingSignup) => {
    const key = `${s.user_id}:create_new`;
    setBusyAction(key);
    setRowErrors((prev) => ({ ...prev, [s.user_id]: "" }));
    const result = await adminAccountLinks.createCustomerFromSignup(s.user_id).then(
      (data) => ({ data, error: null as any }),
      (error) => ({ data: null, error }),
    );
    setBusyAction(null);
    const { data, error } = result;
    if (error) {
      setRowErrors((prev) => ({ ...prev, [s.user_id]: error.message }));
      toast.error(error.message);
      return;
    }
    toast.success(`Customer record created for ${s.email}`);
    setPendingAction(null);
    await load();
    return data;
  };

  const linkSignupTo = async (s: PendingSignup, customerId: string) => {
    const key = `${s.user_id}:link_existing:${customerId}`;
    setBusyAction(key);
    setRowErrors((prev) => ({ ...prev, [s.user_id]: "" }));
    const { error } = await adminAccountLinks.linkSignupToCustomer(s.user_id, customerId).then(
      () => ({ error: null as any }),
      (error) => ({ error }),
    );
    setBusyAction(null);
    if (error) {
      setRowErrors((prev) => ({ ...prev, [s.user_id]: error.message }));
      toast.error(error.message);
      return;
    }
    toast.success(`Account ${s.email} linked to customer`);
    setPickerFor(null);
    setPickerSearch("");
    setPendingAction(null);
    await load();
  };

  const denySignup = async (s: PendingSignup) => {
    const key = `${s.user_id}:deny`;
    const reason = actionNote.trim() || null;
    setBusyAction(key);
    setRowErrors((prev) => ({ ...prev, [s.user_id]: "" }));
    const { error } = await adminAccountLinks.denySignup(s.user_id, reason).then(
      () => ({ error: null as any }),
      (error) => ({ error }),
    );
    setBusyAction(null);
    if (error) {
      setRowErrors((prev) => ({ ...prev, [s.user_id]: error.message }));
      toast.error(error.message);
      return;
    }
    toast.success(`Signup denied for ${s.email}`);
    setPendingAction(null);
    setActionNote("");
    await load();
  };

  const runPendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.kind === "create_new") {
      await createFromSignup(pendingAction.signup);
    } else if (pendingAction.kind === "link_existing") {
      await linkSignupTo(pendingAction.signup, pendingAction.customer.id);
    } else {
      await denySignup(pendingAction.signup);
    }
  };

  const undenySignup = async (user_id: string) => {
    const { error } = await adminAccountLinks.undenySignup(user_id).then(
      () => ({ error: null as any }),
      (error) => ({ error }),
    );
    if (error) { toast.error(error.message); return; }
    toast.success("Signup restored to pending");
    await load();
  };

  const matchByEmail = (s: PendingSignup) =>
    unlinkedCustomers.find((c) => (c.email || "").toLowerCase() === s.email.toLowerCase());

  // Count *all* customer email matches (not just unlinked) to flag ambiguous cases.
  const matchReason = (
    s: PendingSignup,
  ): { kind: "match" | "ambiguous" | "already_linked" | "none"; match?: CustomerRow } => {
    const all = [...unlinkedCustomers, ...linked];
    const matches = all.filter((c) => (c.email || "").toLowerCase() === s.email.toLowerCase());
    if (matches.length === 0) return { kind: "none" };
    if (matches.length > 1) return { kind: "ambiguous" };
    const m = matches[0];
    if (m.user_id && m.user_id !== s.user_id) return { kind: "already_linked", match: m };
    if (m.user_id) return { kind: "match", match: m };
    return { kind: "match", match: m };
  };

  const filteredCustomerOptions = unlinkedCustomers.filter((c) => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.business_name || "").toLowerCase().includes(q)
    );
  });

  return (
    <PortalShell variant="admin">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Onboarding</div>
        <h1 className="mt-1 text-3xl text-foreground">New Accounts</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Review new signups before they receive portal access. New accounts wait here until an admin links them to a customer record, sets the account type, or denies the signup.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <MailX className="h-3.5 w-3.5" />
          Welcome email is handled by Zapier when a <code className="px-1 py-0.5 rounded bg-muted/40 text-foreground/80">client_account_linked</code> or <code className="px-1 py-0.5 rounded bg-muted/40 text-foreground/80">client_account_auto_linked</code> timeline event is written. No email is sent directly from this app.
        </div>
      </div>

      <div className="mb-8">
        <AdminScopeBanner
          surface="Pending Accounts"
          purpose="link new signups to a customer record so the right tools, payment state, and stage become visible. Welcome email is handled by Zapier on link events."
          outside="creating accounts on behalf of a client, bypassing payment or invite gates, or modifying another tenant's data."
        />
      </div>

      <div className="mb-10">
        <SignupRequestsPanel />
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-12">
          {/* Pending signups */}
          <section>
            <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">New Signups</div>
                <h2 className="text-base text-foreground mt-1">Awaiting customer link ({signups.length})</h2>
              </div>
            </div>

            {signups.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-foreground">No pending signups.</p>
                <p className="text-xs text-muted-foreground mt-1">Every signed-up user is linked to a customer record.</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl">
                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-border">
                  {signups.map((s) => {
                    const reason = matchReason(s);
                    const match = reason.match;
                    const busy = !!busyAction && busyAction.startsWith(`${s.user_id}:`);
                    return (
                      <li key={s.user_id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm text-foreground flex items-center gap-2 truncate">
                              <Mail className="h-3.5 w-3.5 text-foreground/70 shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </div>
                            {s.full_name && (
                              <div className="text-[11px] text-foreground/70 mt-0.5 truncate">{s.full_name}</div>
                            )}
                          </div>
                          <div className="text-[11px] text-foreground/70 whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-[11px] text-foreground/80">
                          {reason.kind === "match" && match ? (
                            <button
                              onClick={() => openPendingAction({ kind: "link_existing", signup: s, customer: match })}
                              disabled={busy}
                              className="text-primary hover:underline"
                            >
                              Match: {match.business_name || match.full_name} (email)
                            </button>
                          ) : reason.kind === "ambiguous" ? (
                            <span className="inline-flex items-center gap-1 text-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5" /> Multiple customers — manual review
                            </span>
                          ) : reason.kind === "already_linked" ? (
                            <span className="text-foreground/70">Matched customer already linked</span>
                          ) : (
                            <span className="text-foreground/60">No matching customer email</span>
                          )}
                        </div>
                        {rowErrors[s.user_id] && (
                          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
                            {rowErrors[s.user_id]}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <div className="w-full rounded-lg border border-border bg-muted/10 p-2">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                              Actions for {s.email}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled={busy || unlinkedCustomers.length === 0}
                                onClick={() => { setPickerFor(s); setPickerSearch(""); }}
                                className="border-border h-8">
                                <Link2 className="h-3.5 w-3.5" /> Link to existing
                              </Button>
                              <Button size="sm" disabled={busy} onClick={() => openPendingAction({ kind: "create_new", signup: s })} className="bg-primary hover:bg-secondary h-8">
                                {busyAction === `${s.user_id}:create_new` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                                Create new
                              </Button>
                              <Button size="sm" variant="outline" disabled={busy} onClick={() => openPendingAction({ kind: "deny", signup: s })}
                                className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8">
                                {busyAction === `${s.user_id}:deny` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                Deny
                              </Button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-3 font-normal">Signup</th>
                      <th className="text-left px-5 py-3 font-normal">Created</th>
                      <th className="text-left px-5 py-3 font-normal">Last sign-in</th>
                      <th className="text-left px-5 py-3 font-normal">Suggested match</th>
                      <th className="text-right px-5 py-3 font-normal">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {signups.map((s) => {
                      const reason = matchReason(s);
                      const match = reason.match;
                      const busy = !!busyAction && busyAction.startsWith(`${s.user_id}:`);
                      return (
                        <tr key={s.user_id} className="hover:bg-muted/20">
                          <td className="px-5 py-4">
                            <div className="text-foreground flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              {s.email}
                            </div>
                            {s.full_name && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">{s.full_name}</div>
                            )}
                            {rowErrors[s.user_id] && (
                              <div className="mt-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-300">
                                {rowErrors[s.user_id]}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                            {s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {reason.kind === "match" && match ? (
                              <button
                                onClick={() => openPendingAction({ kind: "link_existing", signup: s, customer: match })}
                                disabled={busy}
                                className="text-xs text-primary hover:underline disabled:opacity-50"
                              >
                                {match.business_name || match.full_name} (email match) →
                              </button>
                            ) : reason.kind === "ambiguous" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Multiple customers — needs manual review
                              </span>
                            ) : reason.kind === "already_linked" ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Matched customer already linked
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No matching customer email</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {/* P4.5: visually group approve actions vs the destructive deny action */}
                            <div className="inline-flex flex-col items-end gap-2 rounded-lg border border-border bg-muted/10 p-2">
                              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                                Actions for {s.email}
                              </div>
                              <div className="inline-flex items-center gap-3">
                              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/20 p-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy || unlinkedCustomers.length === 0}
                                  onClick={() => {
                                    setPickerFor(s);
                                    setPickerSearch("");
                                  }}
                                  className="border-border h-8"
                                  title="Attach this signup to an existing customer record"
                                >
                                  <Link2 className="h-3.5 w-3.5" /> Link to existing
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => openPendingAction({ kind: "create_new", signup: s })}
                                  className="bg-primary hover:bg-secondary h-8"
                                  title="Create a brand-new customer record for this signup"
                                >
                                  {busyAction === `${s.user_id}:create_new` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                                  Create new
                                </Button>
                              </div>
                              <div className="h-6 w-px bg-border/60" />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => openPendingAction({ kind: "deny", signup: s })}
                                className="border-destructive/40 text-destructive hover:bg-destructive/10 h-8"
                                title="Deny this signup — they will not appear here again"
                              >
                                {busyAction === `${s.user_id}:deny` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                                Deny
                              </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>

          {/* Linked accounts */}
          <section>
            <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-primary">Linked & Active</div>
                <h2 className="text-base text-foreground mt-1">Linked client accounts ({linked.length})</h2>
              </div>
            </div>
            {linked.length === 0 ? (
              <WorkflowEmptyState
                title="No linked client accounts yet."
                body="Linked accounts appear here once a pending signup is connected to a customer record (or auto-linked by matching email). If you expected to see clients here, check the pending signups section above for accounts still awaiting approval, denial, or manual linking."
                primary={{ label: "Open Customers", to: "/admin/customers", testId: "pending-no-linked-cta" }}
                testId="pending-no-linked"
              />
            ) : (
              <div className="bg-card border border-border rounded-xl">
                {/* Mobile cards */}
                <ul className="md:hidden divide-y divide-border">
                  {linked.map((c) => (
                    <li key={c.id} className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground truncate">{c.business_name || c.full_name}</div>
                        <div className="text-[11px] text-foreground/70 truncate">{c.email}</div>
                        <div className="text-[11px] text-foreground/70 mt-1">
                          {humanizeStage(c.stage)} ·{" "}
                          {c.portal_unlocked ? (
                            <span className="text-emerald-300">Active</span>
                          ) : (
                            <span className="text-amber-300">Pending activation</span>
                          )}
                        </div>
                      </div>
                      <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                        Open client record <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-5 py-3 font-normal">Client</th>
                      <th className="text-left px-5 py-3 font-normal">Stage</th>
                      <th className="text-left px-5 py-3 font-normal">Workspace</th>
                      <th className="text-left px-5 py-3 font-normal">Last activity</th>
                      <th className="text-right px-5 py-3 font-normal">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {linked.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/20">
                        <td className="px-5 py-4">
                          <div className="text-foreground">{c.business_name || c.full_name}</div>
                          <div className="text-[11px] text-muted-foreground">{c.email}</div>
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{humanizeStage(c.stage)}</td>
                        <td className="px-5 py-4 text-xs">
                          {c.portal_unlocked ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400">
                              <Clock className="h-3.5 w-3.5" /> Pending activation
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(c.last_activity_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/admin/customers/${c.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            Open client record <ArrowRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {!loading && denied.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between border-b border-border pb-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-destructive">Denied</div>
              <h2 className="text-base text-foreground mt-1">Denied signups ({denied.length})</h2>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/30 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-normal">Email</th>
                  <th className="text-left px-5 py-3 font-normal">Denied at</th>
                  <th className="text-left px-5 py-3 font-normal">Reason</th>
                  <th className="text-right px-5 py-3 font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {denied.map((d) => (
                  <tr key={d.user_id} className="hover:bg-muted/20">
                    <td className="px-5 py-4 text-foreground">{d.email}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{new Date(d.denied_at).toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{d.reason || "—"}</td>
                    <td className="px-5 py-4 text-right">
                      <Button size="sm" variant="outline" className="border-border" onClick={() => undenySignup(d.user_id)}>
                        <Undo2 className="h-3.5 w-3.5" /> Move back to pending
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Link picker dialog */}
      <Dialog open={!!pickerFor} onOpenChange={(o) => !o && setPickerFor(null)}>
        <DialogContent className="bg-card border-border max-w-xl">
          <DialogHeader>
            <DialogTitle>Link {pickerFor?.email} to an existing customer</DialogTitle>
          </DialogHeader>
          <Input
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            placeholder="Search by name, business, or email…"
            className="bg-muted/40 border-border"
          />
          <div className="max-h-[360px] overflow-y-auto mt-2 space-y-1">
            {filteredCustomerOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No unlinked customer records match. Create a new customer instead.
              </p>
            ) : (
              filteredCustomerOptions.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickerFor && openPendingAction({ kind: "link_existing", signup: pickerFor, customer: c })}
                  disabled={!!busyAction && !!pickerFor && busyAction.startsWith(`${pickerFor.user_id}:`)}
                  className="w-full text-left p-3 rounded-md border border-border hover:border-primary/40 hover:bg-muted/30 disabled:opacity-50"
                >
                  <div className="text-sm text-foreground">{c.business_name || c.full_name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.email} · {c.stage}</div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="bg-card border-border max-w-xl">
          {pendingAction && (
            <>
              <DialogHeader>
                <DialogTitle>{pendingActionHeadline(pendingAction)}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Pending signup</div>
                  <div className="mt-1 font-medium text-foreground">{pendingAction.signup.email}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pendingAction.signup.full_name || "No display name provided"} · submitted{" "}
                    {new Date(pendingAction.signup.created_at).toLocaleDateString()}
                  </div>
                </div>

                {pendingAction.kind === "link_existing" ? (
                  <div className="rounded-lg border border-border bg-muted/10 p-3">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Existing customer selected</div>
                    <div className="mt-1 font-medium text-foreground">
                      {pendingAction.customer.business_name || pendingAction.customer.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pendingAction.customer.email} · {humanizeStage(pendingAction.customer.stage)}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      This exact signup will be linked to this exact customer record. No other pending account will be changed.
                    </p>
                  </div>
                ) : pendingAction.kind === "create_new" ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    A new customer record will be created for {pendingAction.signup.email}. If no valid industry is present on the signup request, the customer will be marked needs_industry_review=true instead of blocking creation.
                  </div>
                ) : (
                  <label className="block text-xs text-muted-foreground">
                    Denial note for this exact signup
                    <textarea
                      value={actionNote}
                      onChange={(e) => setActionNote(e.target.value)}
                      className="mt-1 min-h-20 w-full rounded-md border border-border bg-muted/30 p-2 text-sm text-foreground outline-none focus:border-primary"
                      placeholder="Optional denial reason..."
                    />
                  </label>
                )}

                <div className="rounded-lg border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Action boundary</div>
                  The action is row-bound to {pendingAction.signup.email}. Loading and errors stay attached to this row.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" className="border-border" onClick={() => setPendingAction(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={runPendingAction}
                    disabled={!!busyAction && busyAction.startsWith(`${pendingAction.signup.user_id}:`)}
                    className="bg-primary hover:bg-secondary"
                  >
                    {!!busyAction && busyAction.startsWith(`${pendingAction.signup.user_id}:`) && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Confirm for {pendingAction.signup.email}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
