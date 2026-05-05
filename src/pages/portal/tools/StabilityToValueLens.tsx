/**
 * P73 — Client portal page for the Stability-to-Value Lens™.
 *
 * Lets the client run the deterministic lens themselves (saves as a
 * client-draft requiring admin review) and shows any approved/
 * client-visible runs from their account team. Never shows admin
 * notes; never shows valuation/appraisal/lending/investment language.
 */
import { useEffect, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import StabilityToValueLens from "@/components/stabilityToValueLens/StabilityToValueLens";
import {
  STABILITY_TO_VALUE_LENS_NAME,
  STV_CLIENT_DISCLAIMER,
  STV_PLAIN_ENGLISH_DISCLAIMER,
  STRUCTURE_RATING_LABELS,
  type StvAnswer,
  type StvAnswers,
} from "@/config/stabilityToValueLens";
import {
  getClientStabilityToValueLensRuns,
  upsertStabilityToValueLensRun,
  type ClientStabilityToValueLensRunRow,
} from "@/lib/stabilityToValueLens/stabilityToValueLens";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save } from "lucide-react";

export default function StabilityToValueLensPage() {
  const { customerId } = usePortalCustomerId();
  const [answers, setAnswers] = useState<StvAnswers>({});
  const [approvedRuns, setApprovedRuns] = useState<ClientStabilityToValueLensRunRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    getClientStabilityToValueLensRuns(customerId)
      .then(setApprovedRuns)
      .catch(() => setApprovedRuns([]));
  }, [customerId]);

  const onAnswerChange = (factorKey: string, value: StvAnswer) =>
    setAnswers((prev) => ({ ...prev, [factorKey]: value }));

  const save = async () => {
    if (!customerId) return;
    setSaving(true);
    try {
      await upsertStabilityToValueLensRun({
        customerId,
        runName: `${STABILITY_TO_VALUE_LENS_NAME} (client draft)`,
        status: "draft",
        answers,
        createdByRole: "client",
      });
      toast.success("Saved for review by your account team");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalShell variant="customer">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Client Tool</div>
        <h1 className="mt-1 text-3xl text-foreground">{STABILITY_TO_VALUE_LENS_NAME}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{STV_CLIENT_DISCLAIMER}</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{STV_PLAIN_ENGLISH_DISCLAIMER}</p>
      </div>

      {approvedRuns.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card/60 p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Approved lens results from your account team
          </h2>
          <ul className="space-y-2">
            {approvedRuns.map((r) => (
              <li key={r.id} className="rounded-md border border-border/60 bg-background/40 p-3">
                <div className="text-sm text-foreground">{r.run_name}</div>
                <div className="text-[11px] text-muted-foreground">
                  Lens score: {r.total_score}/100 · {STRUCTURE_RATING_LABELS[r.structure_rating]} ·
                  Perceived operational risk: {r.perceived_operational_risk_level}
                </div>
                {r.client_safe_summary && (
                  <p className="mt-1 text-xs text-muted-foreground">{r.client_safe_summary}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <StabilityToValueLens answers={answers} onAnswerChange={onAnswerChange} />

      <div className="mt-4">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> Save for review
        </Button>
      </div>
    </PortalShell>
  );
}