import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Activity, Sparkles, Lock, FilePlus2, Inbox, ShieldAlert } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useClientRevenueTrackerData } from "@/lib/bcc/useClientRevenueTrackerData";
import { computeMetrics, computeHealth, detectIssues, detectDataGaps, recommendNextStep } from "@/lib/bcc/engine";
import { buildInsightContext } from "@/lib/bcc/intelligence";
import { buildLongHorizonAnalysis } from "@/lib/bcc/longTrend";
import { LongTermTrends } from "@/components/bcc/LongTermTrends";
import { Money, fmtPct } from "@/components/bcc/Money";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AssignToolsDialog } from "@/components/admin/AssignToolsDialog";
import {
  loadActiveReviewForCustomer,
  STATUS_LABEL,
  type RgsReviewRequest,
} from "@/lib/admin/rgsReviewQueue";

const NOTE_PREFIX = "[BCC]";

export default function AdminClientBusinessControl() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [assignToolsOpen, setAssignToolsOpen] = useState(false);
  const [activeReview, setActiveReview] = useState<RgsReviewRequest | null>(null);
  const { data, loading, reload } = useClientRevenueTrackerData(id ?? null);

  const m = useMemo(() => computeMetrics(data), [data]);
  const health = useMemo(() => computeHealth(m, data), [m, data]);
  const issues = useMemo(() => detectIssues(m, data, data.goals), [m, data]);
  const gaps = useMemo(() => detectDataGaps(data), [data]);
  const nextStep = useMemo(() => recommendNextStep(issues, health), [issues, health]);
  // P7.1 — long-horizon trend analysis for admin RCC review surface.
  const longTrend = useMemo(() => {
    const ctx = buildInsightContext(m, data);
    return buildLongHorizonAnalysis(ctx.weeks, ctx.quality.confidence);
  }, [m, data]);

  const loadAll = async () => {
    if (!id) return;
    const [cust, notesRes, review] = await Promise.all([
      supabase.from("customers").select("id, full_name, business_name, email, user_id, stage").eq("id", id).maybeSingle(),
      supabase.from("customer_notes").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      loadActiveReviewForCustomer(id),
    ]);
    if (cust.data) setCustomer(cust.data);
    if (notesRes.data) setNotes(notesRes.data.filter((n: any) => (n.content || "").startsWith(NOTE_PREFIX)));
    setActiveReview(review);
  };

  useEffect(() => { void loadAll(); }, [id]);

  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("customer_notes").insert([{
      customer_id: id,
      author_id: u.user?.id,
      content: `${NOTE_PREFIX} ${newNote.trim()}`,
    }]);
    setBusy(false);
    if (error) { toast.error("Could not add note."); return; }
    setNewNote("");
    toast.success("Internal note added.");
    loadAll();
  };

  const totalRows =
    data.revenue.length + data.expenses.length + data.payroll.length +
    data.invoices.length + data.cashflow.length + data.goals.length;
  const reportReady = totalRows > 0;

  return (
    <PortalShell variant="admin">
      <Link to={`/admin/customers/${id}`} className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to customer
      </Link>

      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client · Business Control</div>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl text-foreground">{customer?.business_name || customer?.full_name || "Client"}</h1>
          {customer && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/admin/reports?customer=${customer.id}`)}
                className="border-border"
                title="Open Reports & Reviews™ (pre-filtered to this client) to generate a Monthly or Quarterly report"
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Generate Report
              </Button>
              <Button size="sm" onClick={() => setAssignToolsOpen(true)} className="bg-primary hover:bg-secondary">
                <Sparkles className="h-3.5 w-3.5" /> Manage Client Tools
              </Button>
            </div>
          )}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Review this client's Revenue Control Center™ submissions. Internal notes are not visible to the client.
        </p>
        {customer && !customer.user_id && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground flex items-start gap-2">
            <Lock className="h-3.5 w-3.5 text-amber-400 mt-0.5" />
            <div>
              <span className="font-medium">No client account linked.</span> This customer has no signed-in user account, so they cannot enter weekly data yet. Once they sign up with email <span className="text-foreground/80">{customer.email}</span>, their account will auto-link.
            </div>
          </div>
        )}
        {activeReview && (
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-start gap-2">
            {activeReview.priority === "urgent" ? (
              <ShieldAlert className="h-3.5 w-3.5 text-destructive mt-0.5" />
            ) : (
              <Inbox className="h-3.5 w-3.5 text-primary/70 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <span className="font-medium">RGS review {STATUS_LABEL[activeReview.status].toLowerCase()}.</span>{" "}
              <span className="text-muted-foreground">
                Requested {new Date(activeReview.requested_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}.
              </span>
            </div>
            <Link to="/admin/rgs-review-queue" className="text-primary hover:text-secondary whitespace-nowrap">
              Open queue →
            </Link>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Summary */}
            <section className="rounded-xl border border-border bg-card p-6">
              <SectionHead icon={<Activity className="h-4 w-4" />} title="Summary" />
              {totalRows === 0 ? (
                <div className="text-sm text-muted-foreground py-3">
                  No weekly business data has been entered yet by this client.
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Stat label="Revenue collected" value={<Money value={m.collectedRevenue} />} />
                  <Stat label="Pending revenue" value={<Money value={m.pendingRevenue} />} />
                  <Stat label="Overdue revenue" value={<Money value={m.overdueRevenue} />} />
                  <Stat label="Total expenses" value={<Money value={m.totalExpenses} />} />
                  <Stat label="Payroll / labor" value={<Money value={m.payrollCost + m.laborCost} />} hint={fmtPct(m.laborPctRevenue) + " of revenue"} />
                  <Stat label="Net cash" value={<Money value={m.netCash} signed />} />
                  <Stat label="Receivables overdue" value={<Money value={m.receivablesOverdue} />} />
                  <Stat label="Health" value={`${health.condition} (${health.overall}/100)`} />
                </div>
              )}
            </section>

            {/* Insights */}
            <section className="rounded-xl border border-border bg-card p-6">
              <SectionHead icon={<Sparkles className="h-4 w-4" />} title="Business Control Insights" />
              {totalRows === 0 ? (
                <div className="text-sm text-muted-foreground">Insights will appear once the client logs at least one weekly entry.</div>
              ) : (
                <div className="space-y-2 text-sm text-foreground/90">
                  <div><span className="text-muted-foreground">Issues detected:</span> {issues.length === 0 ? "None" : issues.length}</div>
                  {issues.slice(0, 5).map((i) => (
                    <div key={i.key} className="text-xs text-muted-foreground">• {i.title} — <span className="text-foreground/70">{i.meaning}</span></div>
                  ))}
                  <div className="pt-3 border-t border-border/60 mt-3">
                    <span className="text-muted-foreground">Data gaps:</span> {gaps.length === 0 ? "None" : gaps.join(" · ")}
                  </div>
                  <div>
                    <span className="text-muted-foreground">RGS recommended next step:</span> <span className="text-foreground font-medium">{nextStep}</span>
                  </div>
                </div>
              )}
            </section>

            {/* P7.1 — Long-Term Trends */}
            <LongTermTrends analysis={longTrend} />

            {/* Recent entries */}
            <section className="rounded-xl border border-border bg-card p-6">
              <SectionHead icon={<FileText className="h-4 w-4" />} title="Recent submissions" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <CountTile label="Revenue rows" value={data.revenue.length} />
                <CountTile label="Expense rows" value={data.expenses.length} />
                <CountTile label="Payroll rows" value={data.payroll.length} />
                <CountTile label="Invoice rows" value={data.invoices.length} />
                <CountTile label="Cash flow rows" value={data.cashflow.length} />
                <CountTile label="Goals" value={data.goals.length} />
              </div>
              <p className="mt-4 text-[11px] text-muted-foreground">
                To see and edit individual rows, ask the client to open their Revenue Control Center™, or use the database directly. (Read-only here in P1.)
              </p>
            </section>
          </div>

          {/* Side: report status + internal notes */}
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-6">
              <SectionHead icon={<FileText className="h-4 w-4" />} title="Report status" />
              <div className="text-sm text-foreground">
                {reportReady ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    Report ready to publish/share
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60" />
                    Waiting on client data
                  </span>
                )}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Publish/share workflow ships in a later phase. Today, "ready" means at least one weekly entry exists.
              </p>
            </section>

            <section className="rounded-xl border border-border bg-card p-6">
              <SectionHead icon={<Sparkles className="h-4 w-4" />} title="Internal admin notes" />
              <p className="text-[11px] text-muted-foreground mb-3">
                Visible to admins only. Not shown to the client.
              </p>
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="e.g. Client mentioned cash pressure — follow up next week."
                className="w-full rounded-md bg-background border border-input text-sm p-2 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                onClick={addNote}
                disabled={busy || !newNote.trim()}
                className="mt-2 h-9 px-3 rounded-md bg-primary/90 text-primary-foreground text-xs font-medium hover:bg-primary disabled:opacity-50"
              >
                Add note
              </button>
              <div className="mt-4 space-y-2">
                {notes.length === 0 && (
                  <div className="text-xs text-muted-foreground">No internal notes yet.</div>
                )}
                {notes.map((n) => (
                  <div key={n.id} className="rounded-md border border-border bg-muted/20 p-2.5">
                    <div className="text-sm text-foreground whitespace-pre-wrap">
                      {(n.content || "").replace(NOTE_PREFIX, "").trim()}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {customer && (
        <AssignToolsDialog
          open={assignToolsOpen}
          onOpenChange={setAssignToolsOpen}
          customer={{ id: customer.id, full_name: customer.full_name, business_name: customer.business_name }}
        />
      )}
    </PortalShell>
  );
}

function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-2 pb-3 border-b border-border/60">
      <span className="text-primary">{icon}</span>
      <h3 className="text-base text-foreground font-medium tracking-tight">{title}</h3>
    </div>
  );
}
function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-lg font-light tabular-nums text-foreground truncate">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}
function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-light tabular-nums text-foreground">{value}</div>
    </div>
  );
}
