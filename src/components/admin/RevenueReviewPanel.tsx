/* P11.10 — Revenue Review Diagnostic admin panel.
 *
 * Lets RGS create a review (12/24/36 month windows), enter or import
 * monthly revenue, see analysis (trend, volatility, recent vs prior, YoY,
 * seasonality, inflection), and emit aggregate signals into the bus.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  analyzeReview, createReview, deletePoint, deleteReview,
  importRevenueFromIntegrations, listPoints, listReviews,
  saveAnalysisToDiagnostic, setPointVerified, upsertPoint,
  type RevenueReviewAnalysis, type RevenueReviewDiagnostic, type RevenueReviewPoint,
} from "@/lib/diagnostics/revenueReview";
import { emitRevenueReviewSignals } from "@/lib/diagnostics/revenueReviewSignalEmitter";
import { Plus, Trash2, Sparkles, Download, CheckCircle2, AlertCircle } from "lucide-react";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
}
function pct(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  const s = n > 0 ? "+" : "";
  return `${s}${Math.round(n * 100)}%`;
}
function fmtMonth(s: string) { return s.slice(0, 7); }

function Tile({ label, value, hint, tone }: {
  label: string; value: React.ReactNode; hint?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const t = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300"
    : tone === "bad" ? "text-rose-400" : "text-foreground";
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-light ${t}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function RevenueReviewPanel({ customerId }: { customerId: string }) {
  const [reviews, setReviews] = useState<RevenueReviewDiagnostic[]>([]);
  const [active, setActive] = useState<RevenueReviewDiagnostic | null>(null);
  const [points, setPoints] = useState<RevenueReviewPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function refreshReviews(selectId?: string) {
    setLoading(true);
    try {
      const list = await listReviews(customerId);
      setReviews(list);
      const pick = list.find((r) => r.id === selectId) ?? list[0] ?? null;
      setActive(pick);
      if (pick) {
        const pts = await listPoints(pick.id);
        setPoints(pts);
      } else {
        setPoints([]);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load reviews");
    } finally { setLoading(false); }
  }

  useEffect(() => { refreshReviews(); /* eslint-disable-next-line */ }, [customerId]);

  const analysis: RevenueReviewAnalysis | null = useMemo(
    () => (active ? analyzeReview(points) : null), [active, points],
  );

  async function startReview(months: number) {
    setWorking(true);
    try {
      const r = await createReview(customerId, months);
      // seed empty months so admin can type into them
      const start = new Date(r.period_start!);
      for (let i = 0; i < months; i++) {
        const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
        await upsertPoint({
          customer_id: customerId, diagnostic_id: r.id,
          month_date: d.toISOString().slice(0, 10),
          revenue_amount: 0, source: "manual", confidence: "medium", is_verified: true,
        });
      }
      toast.success("Review created");
      await refreshReviews(r.id);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setWorking(false); }
  }

  async function importFromIntegrations() {
    if (!active) return;
    setWorking(true);
    try {
      const { imported, pending } = await importRevenueFromIntegrations(active);
      toast.success(`Imported: ${imported} verified, ${pending} pending`);
      await refreshReviews(active.id);
    } catch (e: any) { toast.error(e?.message ?? "Import failed"); }
    finally { setWorking(false); }
  }

  async function saveAnalysis(finalize: boolean) {
    if (!active || !analysis) return;
    setWorking(true);
    try {
      const updated = await saveAnalysisToDiagnostic(active, analysis, finalize);
      toast.success(finalize ? "Review completed" : "Analysis saved");
      await refreshReviews(updated.id);
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setWorking(false); }
  }

  async function emitSignals() {
    if (!active) return;
    setWorking(true);
    try {
      const { emitted } = await emitRevenueReviewSignals({ diagnostic: active });
      toast.success(emitted > 0 ? `${emitted} signal(s) recorded` : "No new signals");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setWorking(false); }
  }

  const trendTone: "good" | "warn" | "bad" | undefined = analysis
    ? analysis.trend_direction === "growing" ? "good"
      : analysis.trend_direction === "declining" ? "bad"
      : analysis.trend_direction === "volatile" ? "warn" : undefined
    : undefined;

  if (loading) return <div className="text-sm text-muted-foreground">Loading revenue reviews…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg text-foreground">Revenue Review</h2>
          <p className="text-xs text-muted-foreground">12–36 month revenue analysis with trend, volatility, and ranked priority actions.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[12, 24, 36].map((m) => (
            <Button key={m} size="sm" variant="outline" onClick={() => startReview(m)} disabled={working} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New {m}-mo review
            </Button>
          ))}
        </div>
      </div>

      {/* Review picker */}
      {reviews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {reviews.map((r) => (
            <button
              key={r.id}
              onClick={async () => {
                setActive(r);
                setPoints(await listPoints(r.id));
              }}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                active?.id === r.id ? "border-primary text-foreground bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {fmtMonth(r.period_start ?? r.created_at)} → {fmtMonth(r.period_end ?? r.created_at)} · {r.status}
            </button>
          ))}
        </div>
      )}

      {!active ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-sm text-foreground">No revenue review yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Create a 12, 24, or 36 month review to begin analysis.</p>
        </div>
      ) : (
        <>
          {/* Headlines */}
          {analysis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Tile label="Verified months" value={analysis.verified_months} hint={`${analysis.pending_months} pending`} />
              <Tile label="Total revenue" value={money(analysis.total_revenue)} hint={`avg ${money(analysis.average_monthly)}/mo`} />
              <Tile label="Trend" value={analysis.trend_direction.replace(/_/g, " ")} tone={trendTone}
                hint={analysis.recent_vs_prior_change_pct != null ? `recent vs prior 3mo ${pct(analysis.recent_vs_prior_change_pct)}` : undefined} />
              <Tile label="YoY"
                value={pct(analysis.yoy_change_pct)}
                tone={analysis.yoy_change_pct == null ? undefined : analysis.yoy_change_pct >= 0 ? "good" : "bad"}
                hint={analysis.volatility_coefficient != null ? `volatility ${analysis.volatility_coefficient.toFixed(2)}` : undefined}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={importFromIntegrations} disabled={working} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Import from connected accounts
            </Button>
            <Button size="sm" variant="outline" onClick={() => saveAnalysis(false)} disabled={working}>
              Save analysis
            </Button>
            <Button size="sm" onClick={() => saveAnalysis(true)} disabled={working}>
              Mark complete
            </Button>
            <Button size="sm" variant="outline" onClick={emitSignals} disabled={working} className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Emit signals
            </Button>
            <Button size="sm" variant="ghost" className="text-rose-400" onClick={async () => {
              if (!confirm("Delete this review?")) return;
              await deleteReview(active.id);
              await refreshReviews();
            }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Monthly points */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <h3 className="text-sm uppercase tracking-wider text-muted-foreground">Monthly revenue history</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {points.map((p) => (
                  <PointRow key={p.id} row={p} onChanged={() => refreshReviews(active.id)} />
                ))}
              </TableBody>
            </Table>
          </section>

          {/* Findings */}
          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <FindingsCard title="What's going right" tone="good" items={analysis.strengths} icon={<CheckCircle2 className="h-3.5 w-3.5" />} empty="No clear strengths yet." />
              <FindingsCard title="What's going wrong" tone="bad" items={analysis.risks} icon={<AlertCircle className="h-3.5 w-3.5" />} empty="No material risks detected." />
              <PrioritiesCard actions={analysis.priority_actions} />
            </div>
          )}

          {analysis && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h3 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Summary</h3>
              <p className="text-sm text-foreground">{analysis.summary}</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function PointRow({ row, onChanged }: { row: RevenueReviewPoint; onChanged: () => void }) {
  async function patch(p: Partial<RevenueReviewPoint>) {
    try {
      await upsertPoint({
        customer_id: row.customer_id, diagnostic_id: row.diagnostic_id,
        month_date: row.month_date, ...row, ...p,
      });
      onChanged();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }
  const isImported = row.source.startsWith("imported");
  return (
    <TableRow>
      <TableCell className="text-xs text-foreground">{fmtMonth(row.month_date)}</TableCell>
      <TableCell>
        <Input
          type="number" defaultValue={row.revenue_amount}
          onBlur={(e) => patch({ revenue_amount: Number(e.target.value) || 0 })}
          className="h-8 text-xs w-32"
        />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-[10px] uppercase">{row.source.replace(/_/g, " ")}</Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{row.confidence}</TableCell>
      <TableCell>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={row.is_verified} onChange={async (e) => {
            await setPointVerified(row.id, e.target.checked); onChanged();
          }} />
          {row.is_verified ? "Verified" : (isImported ? "Pending" : "Manual")}
        </label>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={async () => {
          await deletePoint(row.id); onChanged();
        }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}

function FindingsCard({ title, tone, items, icon, empty }: {
  title: string; tone: "good" | "bad"; items: { label: string; detail: string; metric?: string }[];
  icon: React.ReactNode; empty: string;
}) {
  const color = tone === "good" ? "text-emerald-400" : "text-rose-400";
  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <h3 className={`text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${color}`}>
        {icon} {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="text-xs">
              <div className="text-foreground font-medium">{it.label}</div>
              <div className="text-muted-foreground mt-0.5">{it.detail}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PrioritiesCard({ actions }: { actions: { rank: "highest" | "medium" | "lower"; label: string; rationale: string }[] }) {
  const order = { highest: 0, medium: 1, lower: 2 } as const;
  const sorted = [...actions].sort((a, b) => order[a.rank] - order[b.rank]);
  const tone = (r: string) => r === "highest" ? "border-rose-500/40 text-rose-400"
    : r === "medium" ? "border-amber-500/40 text-amber-300" : "border-border text-muted-foreground";
  return (
    <section className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-xs uppercase tracking-wider mb-3 text-foreground">Priority actions</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground">No prioritized actions yet.</p>
      ) : (
        <ol className="space-y-3">
          {sorted.map((a, i) => (
            <li key={i} className="text-xs">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${tone(a.rank)}`}>{a.rank}</span>
                <span className="text-foreground font-medium">{a.label}</span>
              </div>
              <div className="text-muted-foreground">{a.rationale}</div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}