/**
 * P100 — Admin route for gig customer management.
 */
import { GigCustomerManager } from "@/components/admin/gig/GigCustomerManager";

export default function GigCustomersPage() {
  return (
    <div className="container max-w-5xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Gig Customers</h1>
        <p className="text-sm text-muted-foreground">
          Standalone deliverable customers. Gig packages do not include full Diagnostic, Implementation, or RGS Control System access. Convert to a full RGS client through the explicit admin action below when scope expands.
        </p>
      </header>
      <GigCustomerManager />
    </div>
  );
}
