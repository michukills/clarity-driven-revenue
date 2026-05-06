/**
 * P85.4 — Client-facing RGS Complexity Scale™ card.
 * Shows the selected tier and client-safe explanation only.
 * Never shows override note or admin interpretation.
 */
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  RGS_COMPLEXITY_TIERS,
  RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE,
  RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO,
  findComplexityForbiddenPhrase,
} from "@/config/rgsComplexityScale";
import {
  getClientComplexityAssessment,
  type ClientComplexityAssessmentRow,
} from "@/lib/rgsComplexityScale";

export function RgsComplexityScaleCard({ customerId }: { customerId: string }) {
  const [row, setRow] = useState<ClientComplexityAssessmentRow | null | undefined>(undefined);

  useEffect(() => {
    if (!customerId) return;
    getClientComplexityAssessment(customerId).then(setRow).catch(() => setRow(null));
  }, [customerId]);

  if (row === undefined) return null;
  if (!row) return null;

  const def = RGS_COMPLEXITY_TIERS[row.selected_tier];
  const explanation = def.client_safe_description;
  if (findComplexityForbiddenPhrase(explanation)) return null;

  return (
    <section
      className="rounded-xl border border-border bg-card/60 p-5"
      data-testid="rgs-complexity-scale-card"
    >
      <header className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">RGS Complexity Scale™</h3>
        <Badge variant="outline" className="text-[10px]">{def.scorecard_label}</Badge>
        {row.confirmation_status === "client_needs_confirmation" && (
          <Badge variant="outline" className="text-[10px]">Estimated — needs confirmation</Badge>
        )}
      </header>
      <p className="text-xs text-foreground/90 leading-relaxed">{RGS_COMPLEXITY_SCALE_CLIENT_SAFE_INTRO}</p>
      <p className="mt-2 text-xs text-foreground/90 leading-relaxed">{explanation}</p>
      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{def.ready_to_scale_language}</p>
      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        {RGS_COMPLEXITY_SCALE_REPORT_SAFE_LANGUAGE}
      </p>
    </section>
  );
}

export default RgsComplexityScaleCard;