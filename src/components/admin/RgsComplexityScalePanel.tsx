/**
 * P85.4 — Admin RGS Complexity Scale™ panel.
 * Detect/confirm/override complexity tier with note. No AI.
 */
import { useEffect, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  COMPLEXITY_TIER_LIST,
  RGS_COMPLEXITY_TIERS,
  type ComplexityTierKey,
  applyComplexityAdjustedScoring,
} from "@/config/rgsComplexityScale";
import {
  loadAdminComplexityAssessment,
  upsertDetectedComplexityAssessment,
  adminConfirmComplexityTier,
  adminOverrideComplexityTier,
  type AdminComplexityAssessmentRow,
} from "@/lib/rgsComplexityScale";

export function RgsComplexityScalePanel({ customerId }: { customerId: string }) {
  const [row, setRow] = useState<AdminComplexityAssessmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<string>("");
  const [headcount, setHeadcount] = useState<string>("");
  const [overrideTier, setOverrideTier] = useState<ComplexityTierKey | "">("");
  const [overrideNote, setOverrideNote] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await loadAdminComplexityAssessment(customerId);
      setRow(r);
      if (r) {
        setRevenue(r.input_annual_revenue?.toString() ?? "");
        setHeadcount(r.input_headcount?.toString() ?? "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    /* eslint-disable-next-line */
  }, [customerId]);

  const detect = async () => {
    setBusy(true);
    try {
      const r = await upsertDetectedComplexityAssessment({
        customer_id: customerId,
        annualRevenue: revenue ? Number(revenue) : null,
        headcount: headcount ? Number(headcount) : null,
      });
      setRow(r);
      toast.success("Complexity tier detected.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not detect tier.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!row) return;
    setBusy(true);
    try {
      await adminConfirmComplexityTier(row.id, row.selected_tier);
      toast.success("Complexity tier confirmed.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not confirm.");
    } finally {
      setBusy(false);
    }
  };

  const override = async () => {
    if (!row || !overrideTier) {
      toast.error("Pick a tier to override to.");
      return;
    }
    if (!overrideNote.trim()) {
      toast.error("Override note required.");
      return;
    }
    setBusy(true);
    try {
      await adminOverrideComplexityTier(row.id, overrideTier, overrideNote.trim());
      setOverrideTier("");
      setOverrideNote("");
      toast.success("Complexity tier overridden.");
      reload();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not override.");
    } finally {
      setBusy(false);
    }
  };

  const def = row ? RGS_COMPLEXITY_TIERS[row.selected_tier] : null;
  // Preview adjustment with all controls unsatisfied (for admin orientation only).
  const preview = row
    ? applyComplexityAdjustedScoring({
        tier: row.selected_tier,
        controls: [],
      })
    : null;

  return (
    <section
      className="bg-card border border-border rounded-xl p-5 space-y-4"
      data-testid="rgs-complexity-scale-panel"
    >
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">RGS Complexity Scale™</h3>
          <Badge variant="outline" className="text-[10px]">Admin only</Badge>
          <Badge variant="secondary" className="text-[10px]">P85.4</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <p className="text-[11px] text-muted-foreground">
        Adjusts which operating controls are expected at the current size and structure of the
        business. Deterministic detection. No AI scoring. Higher-tier signal wins when revenue
        and headcount disagree. Missing both inputs defaults to Tier 2 Growth with needs
        confirmation.
      </p>

      <div className="grid sm:grid-cols-3 gap-2">
        <Input
          type="number"
          inputMode="decimal"
          placeholder="Annual revenue (USD)"
          value={revenue}
          onChange={(e) => setRevenue(e.target.value)}
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Headcount"
          value={headcount}
          onChange={(e) => setHeadcount(e.target.value)}
        />
        <Button onClick={detect} disabled={busy}>Detect tier</Button>
      </div>

      {row && def && (
        <div className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{def.tier_label}</Badge>
            <Badge variant="outline" className="text-[10px]">
              detected: {RGS_COMPLEXITY_TIERS[row.detected_tier].scorecard_label}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {row.confirmation_status.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              basis: {row.detection_basis ?? "—"}
            </Badge>
          </div>
          <p className="text-xs text-foreground/90">{def.client_safe_description}</p>
          <p className="text-[11px] text-muted-foreground">
            <span className="text-amber-300">Admin interpretation:</span> {def.admin_interpretation}
          </p>
          {preview && (
            <p className="text-[11px] text-muted-foreground">
              Adjustment summary: {preview.adjustment_summary}
            </p>
          )}
          {row.override_note && (
            <p className="text-[11px] text-muted-foreground">
              <span className="text-amber-300">Override note (not shown to client):</span>{" "}
              {row.override_note}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={confirm} disabled={busy}>
              Confirm selected tier
            </Button>
          </div>

          <div className="rounded border border-border/60 p-2 mt-2 space-y-2">
            <div className="text-xs font-medium text-foreground">Override tier (note required)</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={overrideTier} onValueChange={(v) => setOverrideTier(v as ComplexityTierKey)}>
                <SelectTrigger className="sm:w-72"><SelectValue placeholder="Override to tier" /></SelectTrigger>
                <SelectContent>
                  {COMPLEXITY_TIER_LIST.map((t) => (
                    <SelectItem key={t.tier_key} value={t.tier_key}>{t.tier_label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Override note (required, not shown to client)"
                className="min-h-[60px]"
              />
              <Button onClick={override} disabled={busy || !overrideTier || !overrideNote.trim()}>
                Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default RgsComplexityScalePanel;