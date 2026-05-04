import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  adminListMonthlySystemReviewEntries, adminCreateMonthlySystemReviewEntry,
  adminUpdateMonthlySystemReviewEntry, adminArchiveMonthlySystemReviewEntry,
  MSR_REVIEW_STATUSES, MSR_OVERALL_SIGNALS,
  MSR_STATUS_LABEL, MSR_SIGNAL_LABEL,
  type AdminMonthlySystemReviewEntry, type MsrReviewStatus, type MsrOverallSignal,
} from "@/lib/monthlySystemReview";

export default function MonthlySystemReviewAdmin() {
  const { customerId = "" } = useParams();
  const [items, setItems] = useState<AdminMonthlySystemReviewEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const r = await adminListMonthlySystemReviewEntries(customerId);
      setItems(r);
      if (!activeId && r[0]) setActiveId(r[0].id);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [customerId]);

  const active = useMemo(
    () => items.find(i => i.id === activeId) ?? null,
    [items, activeId],
  );

  const create = async () => {
    if (!newTitle.trim()) return;
    const r = await adminCreateMonthlySystemReviewEntry(customerId, {
      title: newTitle.trim(),
    });
    setNewTitle(""); setActiveId(r.id);
    await reload();
    toast.success("Monthly review created");
  };

  const patch = async (p: Partial<AdminMonthlySystemReviewEntry>) => {
    if (!active) return;
    setItems(items.map(i => i.id === active.id ? { ...i, ...p } : i));
    try { await adminUpdateMonthlySystemReviewEntry(active.id, p); }
    catch (e: any) { toast.error(e.message); }
  };

  const archive = async () => {
    if (!active) return;
    if (!confirm("Archive this monthly review? It will be hidden from clients.")) return;
    await adminArchiveMonthlySystemReviewEntry(active.id);
    setActiveId(null);
    await reload();
  };

  const markReviewed = async () => {
    if (!active) return;
    await patch({ admin_review_required: false });
    toast.success("Marked as reviewed");
  };

  return (
    <PortalShell variant="admin">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl text-foreground font-serif">Monthly System Review (Admin)</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Use this tool to prepare a structured monthly review for an active RGS Control System™
            client. Set status to “Shared with client” and turn on Client-visible to release the
            review to the client portal. This is a bounded review and visibility tool. It does not
            replace owner judgment and does not substitute for accounting, legal, tax, compliance,
            payroll, or HR review. It is not a forecast, valuation, or promise of any specific
            outcome. Internal notes never leave this view.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New monthly review title (e.g. March 2026 Monthly System Review)"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
            <Button onClick={create}>Create review</Button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No monthly reviews yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(i => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    className={`w-full text-left py-2 px-1 flex items-center gap-2 ${activeId === i.id ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    <span className="flex-1 truncate">{i.title}</span>
                    <Badge variant="outline">{MSR_STATUS_LABEL[i.status]}</Badge>
                    {i.archived_at && <Badge variant="outline">Archived</Badge>}
                    {i.client_visible && <Badge variant="secondary">Client-visible</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {active && (
          <section className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg text-foreground font-serif">{active.title}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={markReviewed}>Mark reviewed</Button>
                <Button variant="outline" size="sm" onClick={archive}>Archive</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Title">
                <Input value={active.title} onChange={e => patch({ title: e.target.value })} />
              </Field>
              <Field label="Review period label">
                <Input value={active.review_period_label ?? ""} onChange={e => patch({ review_period_label: e.target.value })} placeholder="e.g. March 2026" />
              </Field>
              <Field label="Review period start">
                <Input type="date" value={active.review_period_start ?? ""} onChange={e => patch({ review_period_start: e.target.value || null })} />
              </Field>
              <Field label="Review period end">
                <Input type="date" value={active.review_period_end ?? ""} onChange={e => patch({ review_period_end: e.target.value || null })} />
              </Field>
              <Field label="Status">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.status}
                  onChange={e => patch({ status: e.target.value as MsrReviewStatus })}
                >
                  {MSR_REVIEW_STATUSES.map(s => <option key={s} value={s}>{MSR_STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Overall signal">
                <select
                  className="w-full bg-background border border-border rounded-md px-2 py-2 text-sm"
                  value={active.overall_signal}
                  onChange={e => patch({ overall_signal: e.target.value as MsrOverallSignal })}
                >
                  {MSR_OVERALL_SIGNALS.map(s => <option key={s} value={s}>{MSR_SIGNAL_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Next review date">
                <Input type="date" value={active.next_review_date ?? ""} onChange={e => patch({ next_review_date: e.target.value || null })} />
              </Field>
            </div>

            <Field label="What changed this month (client-safe)">
              <Textarea rows={3} value={active.what_changed_summary ?? ""} onChange={e => patch({ what_changed_summary: e.target.value })} />
            </Field>
            <Field label="Signals worth reviewing (client-safe)">
              <Textarea rows={3} value={active.signals_summary ?? ""} onChange={e => patch({ signals_summary: e.target.value })} />
            </Field>
            <Field label="Score and trend movement (client-safe)">
              <Textarea rows={3} value={active.score_trend_summary ?? ""} onChange={e => patch({ score_trend_summary: e.target.value })} />
            </Field>
            <Field label="Active priority actions (client-safe)">
              <Textarea rows={3} value={active.priority_actions_summary ?? ""} onChange={e => patch({ priority_actions_summary: e.target.value })} />
            </Field>
            <Field label="Owner decisions to review (client-safe)">
              <Textarea rows={3} value={active.owner_decisions_summary ?? ""} onChange={e => patch({ owner_decisions_summary: e.target.value })} />
            </Field>
            <Field label="What RGS reviewed (client-safe)">
              <Textarea rows={3} value={active.rgs_reviewed_summary ?? ""} onChange={e => patch({ rgs_reviewed_summary: e.target.value })} />
            </Field>
            <Field label="What to review next month (client-safe)">
              <Textarea rows={3} value={active.next_review_summary ?? ""} onChange={e => patch({ next_review_summary: e.target.value })} />
            </Field>

            <Field label="Client-visible overall summary (shown to client)">
              <Textarea rows={3} value={active.client_visible_summary ?? ""} onChange={e => patch({ client_visible_summary: e.target.value })} />
            </Field>
            <Field label="Admin summary (admin-only)">
              <Textarea rows={3} value={active.admin_summary ?? ""} onChange={e => patch({ admin_summary: e.target.value })} />
            </Field>
            <Field label="Internal notes (never shown to client)">
              <Textarea rows={3} value={active.internal_notes ?? ""} onChange={e => patch({ internal_notes: e.target.value })} />
            </Field>

            <div className="flex items-center gap-2">
              <input
                id="msr_client_visible"
                type="checkbox"
                checked={active.client_visible}
                onChange={e => patch({ client_visible: e.target.checked })}
              />
              <label htmlFor="msr_client_visible" className="text-sm text-foreground">
                Client-visible (also requires status “Shared with client”)
              </label>
            </div>
          </section>
        )}
      </div>
    </PortalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
