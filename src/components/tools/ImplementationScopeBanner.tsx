import { ShieldCheck } from "lucide-react";

/**
 * Reusable scope-boundary banner for Implementation lane tools.
 * Makes the included/excluded boundary explicit for the client and
 * prevents implied "unlimited support" or "RGS becomes the operator"
 * misreads. Pure presentation — no data or secrets.
 */
export function ImplementationScopeBanner({
  included,
  excluded,
}: {
  included?: string;
  excluded?: string;
}) {
  return (
    <section
      data-testid="implementation-scope-banner"
      className="rounded-xl border border-border bg-card/60 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Implementation scope
      </div>
      <p className="mt-2 text-xs sm:text-sm text-foreground/90 leading-relaxed">
        <span className="text-foreground">Included: </span>
        {included ??
          "installing the agreed repair plan, organizing the supporting documentation, and clarifying who owns the next step."}
      </p>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground">Outside this scope: </span>
        {excluded ??
          "indefinite support, ongoing operations, emergency response, and any legal, tax, accounting, HR, or compliance review (RGS does not provide that guidance). Ongoing visibility after implementation is offered separately through the RGS Control System™ subscription."}
      </p>
    </section>
  );
}