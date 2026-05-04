import { ShieldCheck } from "lucide-react";

/**
 * Reusable scope-boundary banner for Admin/System surfaces.
 *
 * Communicates internally — to RGS owner/admin operators — what an admin
 * surface is for and what is intentionally outside scope. Pure presentation:
 * no data fetching, no AI calls, no secrets. Never rendered on client-facing
 * portal surfaces.
 *
 * RGS is the architect, not the operator. Admin surfaces drive review,
 * approval, and follow-up — not running the client's business, not
 * open-ended implementation, not emergency response, not legal/tax/
 * accounting/HR/regulated advice, and not a guarantee of a specific result.
 */
export function AdminScopeBanner({
  surface,
  purpose,
  outside,
}: {
  surface: string;
  purpose?: string;
  outside?: string;
}) {
  return (
    <section
      data-testid="admin-scope-banner"
      className="rounded-xl border border-border bg-card/60 p-4 sm:p-5"
    >
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Admin scope — {surface}
      </div>
      <p className="mt-2 text-xs sm:text-sm text-foreground/90 leading-relaxed">
        <span className="text-foreground">Purpose: </span>
        {purpose ??
          "give the RGS operator a clear next action — what to review, approve, publish, follow up on, or reject — without bypassing client visibility rules."}
      </p>
      <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground">Outside this scope: </span>
        {outside ??
          "running the client's business for them, an open-ended implementation engagement, emergency response, and any promise of a specific result. Professional review may still be required for legal, tax, accounting, HR, or regulated matters. Admin-only notes stay admin-only until explicitly approved client-visible."}
      </p>
    </section>
  );
}

export default AdminScopeBanner;