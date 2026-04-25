/* P11.10 — Client-side Revenue Review sync + verification surface.
 *
 * Lives at /portal/tools/revenue-review. Client can:
 *   - see whether a financial integration is connected (managed by RGS)
 *   - review the latest imported monthly revenue history
 *   - approve / un-approve imported months before they become trusted truth
 *
 * Heavy admin analysis stays admin-side. This page is intentionally light.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import { toast } from "sonner";
import { ArrowLeft, Plug, CheckCircle2, AlertCircle } from "lucide-react";
import { BRANDS } from "@/config/brands";
import {
  listReviews, listPoints, setPointVerified,
  type RevenueReviewDiagnostic, type RevenueReviewPoint,
} from "@/lib/diagnostics/revenueReview";

function money(n: number) { return `$${Math.round(n).toLocaleString()}`; }
function fmtMonth(s: string) { return s.slice(0, 7); }

export default function RevenueReviewSync() {
  const { customerId: portalCustomerId } = usePortalCustomerId();
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [integrationConnected, setIntegrationConnected] = useState(false);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [review, setReview] = useState<RevenueReviewDiagnostic | null>(null);
  const [points, setPoints] = useState<RevenueReviewPoint[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!portalCustomerId) {
      setCustomerId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const c = { id: portalCustomerId };
      setCustomerId(portalCustomerId);

      const { data: integ } = await supabase
        .from("customer_integrations")
        .select("provider, account_label, status")
        .eq("customer_id", c.id)
        .eq("status", "active")
        .maybeSingle();
      if (integ) {
        setIntegrationConnected(true);
        setProviderLabel(integ.account_label || integ.provider);
      }

      const list = await listReviews(c.id);
      const latest = list[0] ?? null;
      setReview(latest);
      if (latest) setPoints(await listPoints(latest.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [portalCustomerId]);

  async function verify(p: RevenueReviewPoint, verified: boolean) {
    try {
      await setPointVerified(p.id, verified);
      setPoints((prev) => prev.map((x) => x.id === p.id ? { ...x, is_verified: verified } : x));
      toast.success(verified ? "Approved" : "Marked pending");
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  async function approveAllImported() {
    const pending = points.filter((p) => !p.is_verified && p.source.startsWith("imported"));
    if (pending.length === 0) return;
    try {
      for (const p of pending) await setPointVerified(p.id, true);
      setPoints((prev) => prev.map((x) =>
        !x.is_verified && x.source.startsWith("imported") ? { ...x, is_verified: true } : x,
      ));
      toast.success(`Approved ${pending.length} imported month(s)`);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  }

  const importedPending = points.filter((p) => !p.is_verified && p.source.startsWith("imported"));
  const importedVerified = points.filter((p) => p.is_verified && p.source.startsWith("imported"));

  return (
    <PortalShell variant="customer">
      <button onClick={() => navigate("/portal/tools")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mb-4">
        <ArrowLeft className="h-3 w-3" /> Back to My Tools
      </button>

      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Diagnostic Sync</div>
        <h1 className="mt-2 text-3xl text-foreground">Revenue Review — Sync &amp; Verify</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Connect your accounting account so RGS can pull your revenue history automatically. Then approve any imported months before they become part of your active diagnostic truth.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Sync Connected Accounts */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Plug className="h-4 w-4" /> Sync Connected Accounts
            </h2>
            {integrationConnected ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <div className="text-sm text-foreground">{providerLabel} connected</div>
                  <div className="text-xs text-muted-foreground">
                    Your RGS team can now pull verified revenue history into your review.
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-300" />
                  <div>
                    <div className="text-sm text-foreground">No financial account connected</div>
                    <div className="text-xs text-muted-foreground">
                      Ask your RGS team to connect {BRANDS.quickbooks} (or another supported source) to enable automatic revenue history sync.
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Until then, RGS can still build your review from manual or CSV-imported data.
                </p>
              </div>
            )}
          </section>

          {/* Review status */}
          <section className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Latest Revenue Review</h2>
                {review ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {review.analysis_window_months}-month window · {review.status}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">No review created yet.</p>
                )}
              </div>
              {importedPending.length > 0 && (
                <Button size="sm" onClick={approveAllImported}>
                  Approve all {importedPending.length} pending month(s)
                </Button>
              )}
            </div>

            {review && (
              <div className="grid grid-cols-3 gap-3 text-xs">
                <Stat label="Verified" value={importedVerified.length + points.filter((p) => p.is_verified && !p.source.startsWith("imported")).length} tone="good" />
                <Stat label="Pending" value={importedPending.length} tone={importedPending.length > 0 ? "warn" : undefined} />
                <Stat label="Total months" value={points.length} />
              </div>
            )}
          </section>

          {/* Imported month verification list */}
          {points.length > 0 && (
            <section className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Verify Imported Months</h2>
              {importedPending.length === 0 && importedVerified.length === 0 ? (
                <p className="text-xs text-muted-foreground">No imported months yet — your review is built from manual entries.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {[...importedPending, ...importedVerified].map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-foreground">{fmtMonth(p.month_date)} · {money(p.revenue_amount)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          From {p.source.replace(/_/g, " ")} · confidence {p.confidence}
                        </div>
                      </div>
                      {p.is_verified ? (
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                          Approved
                        </Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => verify(p, true)}>
                          Approve
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground mt-4">
                Approval marks an imported month as trusted operating truth. Anything unapproved is excluded from your active diagnostic analysis.
              </p>
            </section>
          )}
        </div>
      )}
    </PortalShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : "text-foreground";
  return (
    <div className="bg-muted/20 border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg ${color} mt-1`}>{value}</div>
    </div>
  );
}