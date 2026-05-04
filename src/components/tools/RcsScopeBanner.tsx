import { Gauge } from "lucide-react";

/**
 * Reusable scope-boundary banner for RGS Control System™ lane tools.
 * Makes the included/excluded boundary explicit for the client and
 * prevents scope-creep misreads (no unlimited support, no operator role,
 * no legal/tax/accounting/HR/compliance advice). Pure presentation —
 * no data, no secrets, no AI calls.
 */
export function RcsScopeBanner({
  included,
  excluded,
}: {
  included?: string;
  excluded?: string;
}) {
  return (
    <section
      data-testid="rcs-scope-banner"
      className="rounded-xl border border-border bg-card/60 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <Gauge className="h-3.5 w-3.5 text-primary" /> RGS Control System™ scope
      </div>
      <p className="mt-2 text-xs sm:text-sm text-foreground/90 leading-relaxed">
        <span className="text-foreground">Included: </span>
        {included ??
          "ongoing visibility, priority and risk tracking, owner decision support, score and stability trends, monthly review cadence, and bounded advisory interpretation so the owner stays connected to the system."}
      </p>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground">Outside this scope: </span>
        {excluded ??
          "RGS operating the business, unlimited support or implementation, emergency response, guaranteed outcomes, and any legal, tax, accounting, HR, or compliance review (RGS does not provide that guidance). Connected systems such as QuickBooks, Xero, Stripe, Square, HubSpot, and Salesforce remain the system of record."}
      </p>
    </section>
  );
}

export default RcsScopeBanner;