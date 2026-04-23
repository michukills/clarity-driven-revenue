import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeAutoStabilityScore,
  persistAutoStabilityScore,
  loadStabilityScoreHistory,
  type AutoScoreResult,
} from "@/lib/scoring/autoStabilityRescore";
import { emitStabilityRescoreSignals } from "@/lib/diagnostics/stabilityRescoreSignalEmitter";
import { Activity, RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "sonner";

interface Props { customerId: string }

export function AutoStabilityRescorePanel({ customerId }: Props) {
  const { user } = useAuth();
  const [preview, setPreview] = useState<AutoScoreResult | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const refreshHistory = async () => {
    try {
      const rows = await loadStabilityScoreHistory(customerId);
      setHistory(rows);
    } catch (e: any) { /* ignore */ }
  };

  useEffect(() => { refreshHistory(); /* eslint-disable-next-line */ }, [customerId]);

  const recompute = async () => {
    setLoading(true);
    try {
      const r = await computeAutoStabilityScore(customerId);
      setPreview(r);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to recompute");
    } finally { setLoading(false); }
  };

  const commit = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await persistAutoStabilityScore(preview, user?.id ?? null);
      if (!res.written) {
        toast.message(`Not saved: ${res.reason}`);
      } else {
        const emitted = await emitStabilityRescoreSignals(preview);
        toast.success(`Score recorded${emitted ? ` · ${emitted} signal${emitted > 1 ? "s" : ""} emitted` : ""}`);
      }
      await refreshHistory();
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  };

  const DeltaIcon = ({ d }: { d: number | null }) => {
    if (d == null || d === 0) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return d > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Auto Stability Re-Score</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={recompute} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Recompute
          </Button>
          <Button size="sm" onClick={commit} disabled={!preview || saving}>
            Save & emit signals
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Synthesizes cash, obligations, pipeline, profitability, operations, owner dependence, and recent insight signals into an explainable 0–1000 score.
        </p>

        {preview && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-semibold">{preview.score_total}<span className="text-base text-muted-foreground">/1000</span></div>
                <div className="text-xs text-muted-foreground">
                  Prior {preview.prior_score ?? "—"} · Delta {preview.delta_from_prior ?? "—"}
                </div>
              </div>
              <DeltaIcon d={preview.delta_from_prior} />
            </div>
            <p className="text-sm">{preview.summary}</p>

            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {preview.pillars.map((p) => (
                <div key={p.pillar} className="rounded border p-2 text-xs bg-background">
                  <div className="flex justify-between font-medium">
                    <span>{p.label}</span>
                    <span>{p.score}/200</span>
                  </div>
                  {p.contributors.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      {p.contributors.map((c, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{c.label}</span>
                          <span className={c.delta > 0 ? "text-emerald-600" : "text-destructive"}>
                            {c.delta > 0 ? "+" : ""}{c.delta}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-sm font-medium mb-2">Recent score history</div>
          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground">No auto re-score history yet.</div>
          ) : (
            <div className="space-y-1">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs border-b py-1">
                  <span className="text-muted-foreground">{new Date(h.recorded_at).toLocaleString()}</span>
                  <span className="font-medium">{h.score_total}/1000</span>
                  <Badge variant="outline" className="text-[10px]">{h.score_source}</Badge>
                  <span className={Number(h.delta_from_prior) > 0 ? "text-emerald-600" : Number(h.delta_from_prior) < 0 ? "text-destructive" : "text-muted-foreground"}>
                    {h.delta_from_prior != null ? (Number(h.delta_from_prior) > 0 ? "+" : "") + h.delta_from_prior : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
