import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PortalShell } from "@/components/portal/PortalShell";
import { DomainShell, DomainSection } from "@/components/domains/DomainShell";
import { ScoreBenchmarkScale } from "@/components/scoring/ScoreBenchmarkScale";
import { StopStartScaleDisplay } from "@/components/recommendations/StopStartScaleDisplay";
import { ToolEmptyState, ToolLoadingState } from "@/components/tools/ToolGuidancePanel";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCustomerId } from "@/hooks/usePortalCustomerId";
import {
  loadCustomerStabilityScore,
  type StabilityScoreRow,
} from "@/lib/scoring/stabilityScore";
import {
  listClientApprovedRecommendations,
  type RecommendationRow,
} from "@/lib/recommendations/recommendations";

export default function PortalScorecard() {
  const { customerId } = usePortalCustomerId();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<StabilityScoreRow | null>(null);
  const [recs, setRecs] = useState<RecommendationRow[]>([]);

  useEffect(() => {
    if (!customerId) {
      setLoading(false);
      setScore(null);
      setRecs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          loadCustomerStabilityScore(customerId),
          listClientApprovedRecommendations(customerId),
        ]);
        if (cancelled) return;
        setScore(s);
        setRecs(r);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <PortalShell variant="customer">
      <DomainShell
        eyebrow="Stability Score"
        title="Business Stability Index™"
        description="A 0–1000 view of where your business stands across five pillars: revenue leaks, conversion, operations, financial visibility, and owner dependency."
      >
        <DomainSection title="How this score is built">
          <div className="rounded-lg border border-border bg-card/40 p-4">
            <ol className="space-y-2 text-sm text-foreground/85 leading-relaxed">
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">01</span>
                <strong className="text-foreground">Public scorecard</strong> — owner-reported starting signal (preliminary estimate).
              </li>
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">02</span>
                <strong className="text-foreground">Diagnostic interview</strong> — structured evidence map with system dependencies and a validation checklist.
              </li>
              <li>
                <span className="font-display text-primary/80 tabular-nums mr-2">03</span>
                <strong className="text-foreground">Reports &amp; review</strong> — evidence-over-time operating view that improves as data, check-ins, and RGS review accumulate during your active engagement. <em className="text-muted-foreground">This is what you see below.</em>
              </li>
            </ol>
          </div>
        </DomainSection>

        <DomainSection title="Your RGS Stability Score">
          {loading ? (
            <ToolLoadingState label="Loading your current Stability Score…" />
          ) : !score ? (
            <ToolEmptyState
              title="No reviewed Stability Score yet"
              body="Your first Stability Score appears here after RGS reviews your diagnostic evidence and publishes a reviewed snapshot. The deterministic scorecard you took publicly is your starting signal — not your operating score."
              responsibility="rgs"
            />
          ) : (
            <div className="space-y-4">
              <ScoreBenchmarkScale score={score.score ?? null} />
              {score?.client_note && score.client_note.trim() && (
                <div className="rounded-lg border border-border bg-card/60 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    A note from RGS
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {score.client_note}
                  </p>
                </div>
              )}
            </div>
          )}
        </DomainSection>

        {recs.length > 0 && (
          <DomainSection title="What to stop, start, and scale next" subtitle="Suggested strategic direction based on your diagnostic">
            <StopStartScaleDisplay
              items={recs}
              title=""
              eyebrow=""
            />
          </DomainSection>
        )}

        <DomainSection title="Take or Retake the Public Scorecard">
          <Link
            to="/scorecard"
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-primary/15 text-primary text-sm hover:bg-primary/25 transition-colors"
          >
            Open Scorecard →
          </Link>
        </DomainSection>
      </DomainShell>
    </PortalShell>
  );
}