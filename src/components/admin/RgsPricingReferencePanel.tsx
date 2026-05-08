import { Badge } from "@/components/ui/badge";
import {
  EXACT_CHECKOUT_FLOWS,
  FOUNDING_CLIENT_PRICING,
  OFFER_BOUNDARY_COPY,
  RGS_APPROVED_POSITIONING_SENTENCE,
  RGS_PRICING_TIERS,
  SAFE_REPLACEMENT_COST_POSITIONING,
  STANDALONE_DELIVERABLE_PRICING,
  type PricingVisibility,
} from "@/config/rgsPricingTiers";
import { CircleDollarSign, ShieldCheck } from "lucide-react";

const visibilityLabel: Record<PricingVisibility, string> = {
  public_facing: "public-facing guidance",
  internal_only: "internal only",
  founding_client_only: "founding-client only",
  inactive: "inactive",
};

export function RgsPricingReferencePanel() {
  return (
    <section
      className="bg-card border border-border rounded-2xl p-5 mb-8 space-y-5"
      data-testid="rgs-pricing-reference-panel"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <CircleDollarSign className="h-4 w-4 text-primary" />
            P91 pricing reference
          </div>
          <h2 className="text-lg font-medium text-foreground mt-1">
            RGS Complexity-Based Pricing
          </h2>
          <p className="text-xs text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            Read-only guidance. The live offer table and Stripe edge functions
            remain the source of truth for exact checkout/payment-link prices.
            Use this panel to keep scope, pricing language, and founding-client
            exceptions consistent before creating offers or payment links.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Admin reference
        </Badge>
      </header>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-foreground/90">
        {RGS_APPROVED_POSITIONING_SENTENCE}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {RGS_PRICING_TIERS.map((tier) => (
          <article key={tier.tier_key} className="rounded-xl border border-border/60 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-sm font-medium text-foreground">{tier.tier_name}</h3>
              <Badge variant="secondary" className="text-[10px]">
                {visibilityLabel[tier.visibility]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {tier.best_for}
            </p>
            <div className="space-y-2 text-xs">
              <PricingLine label="Diagnostic" value={tier.pricing.diagnostic.display} />
              <PricingLine label="Implementation" value={tier.pricing.implementation.display} />
              <PricingLine label="RGS Control System" value={tier.pricing.rgs_control_system.display} />
            </div>
            <div className="mt-3 border-t border-border/50 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                What affects price
              </p>
              <ul className="space-y-1 text-[11px] text-muted-foreground">
                {tier.price_factors.slice(0, 4).map((factor) => (
                  <li key={factor}>- {factor}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="text-sm font-medium text-foreground">
            {FOUNDING_CLIENT_PRICING.label}
          </h3>
          <Badge variant="outline" className="text-[10px]">
            {visibilityLabel[FOUNDING_CLIENT_PRICING.visibility]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
          {FOUNDING_CLIENT_PRICING.eligible_for}
        </p>
        <div className="grid gap-2 md:grid-cols-3 text-xs">
          <PricingLine label="Diagnostic" value={FOUNDING_CLIENT_PRICING.diagnostic.display} />
          <PricingLine label="Implementation" value={FOUNDING_CLIENT_PRICING.implementation.display} />
          <PricingLine label="Control System" value={FOUNDING_CLIENT_PRICING.rgs_control_system.display} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Requirements: {FOUNDING_CLIENT_PRICING.client_requirements.join("; ")}.
        </p>
        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
          Exclusions: {FOUNDING_CLIENT_PRICING.exclusions.join("; ")}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Exact Checkout / Payment Link Honesty
          </h3>
          <div className="space-y-3">
            {EXACT_CHECKOUT_FLOWS.map((flow) => (
              <div key={flow.offer_slug} className="rounded-lg border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{flow.label}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {flow.exact_price_display}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {flow.checkout_status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {flow.honesty_note}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border/60 p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">
            Offer Boundaries
          </h3>
          <div className="space-y-3">
            {Object.values(OFFER_BOUNDARY_COPY).map((offer) => (
              <div key={offer.lane} className="rounded-lg border border-border/50 p-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {offer.lane.replace(/_/g, " ")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {offer.public_summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border/60 p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">
          Standalone Deliverable Price Ranges
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {STANDALONE_DELIVERABLE_PRICING.map((item) => (
            <div key={item.key} className="rounded-lg border border-border/50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-foreground">{item.title}</span>
                <Badge variant="outline" className="text-[10px]">
                  {item.price.display}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {item.scope_boundary}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-lg border border-dashed border-border p-3 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p>
          {SAFE_REPLACEMENT_COST_POSITIONING} Pricing ranges are scope guidance,
          not promises. Final pricing depends on complexity, evidence depth,
          implementation scope, HITL review level, reporting depth, and
          monitoring needs.
        </p>
      </div>
    </section>
  );
}

function PricingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-xs text-foreground mt-0.5">{value}</div>
    </div>
  );
}

export default RgsPricingReferencePanel;
