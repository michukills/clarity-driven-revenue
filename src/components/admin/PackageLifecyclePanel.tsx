/**
 * P12.4.B — Admin Package & Lifecycle editor.
 *
 * Renders inside CustomerDetail (Overview tab). Lets an admin:
 *   - mark which packages the customer purchased
 *   - set the operational lifecycle state
 *   - see the expected access derived from packages
 *
 * Writes directly to the customers row. Uses optimistic local state.
 */

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PACKAGES,
  LIFECYCLE_STATES,
  deriveExpectedAccess,
  type LifecycleState,
  type PackageKey,
} from "@/lib/customers/packages";
import { Package, Workflow, ShieldCheck, Info } from "lucide-react";

type Customer = Record<string, any> & { id: string };

export function PackageLifecyclePanel({
  customer,
  onUpdated,
}: {
  customer: Customer;
  onUpdated: () => void;
}) {
  const [c, setC] = useState<Customer>(customer);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const update = async (patch: Partial<Customer>) => {
    const next = { ...c, ...patch };
    setC(next);
    const key = Object.keys(patch)[0];
    setSavingKey(key);
    const { error } = await supabase
      .from("customers")
      .update(patch as any)
      .eq("id", c.id);
    setSavingKey(null);
    if (error) {
      toast.error("Update failed");
      setC(c); // revert
    } else {
      onUpdated();
    }
  };

  const togglePackage = (k: PackageKey) =>
    update({ [k]: !c[k] } as Partial<Customer>);

  const setLifecycle = (v: LifecycleState) =>
    update({ lifecycle_state: v, lifecycle_updated_at: new Date().toISOString() } as Partial<Customer>);

  const expectedAccess = deriveExpectedAccess(c);

  return (
    <section className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-start gap-2 mb-4">
        <Package className="h-4 w-4 text-primary mt-0.5" />
        <div>
          <h2 className="text-sm text-foreground font-medium">
            Packages & Lifecycle
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            What this customer bought, where they are in the workflow, and
            what tools that implies. Editable.
          </p>
        </div>
      </div>

      {/* Packages */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Purchased packages
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {PACKAGES.map((p) => {
            const on = !!c[p.key];
            const saving = savingKey === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => togglePackage(p.key)}
                className={`flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                  on
                    ? "bg-primary/10 border-primary/40"
                    : "bg-muted/30 border-border hover:border-primary/30"
                }`}
              >
                <div
                  className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ${
                    on
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {on ? "✓" : ""}
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-foreground">
                    {p.label}
                    {saving && (
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        saving…
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {p.hint}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lifecycle */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <Workflow className="h-3 w-3" /> Lifecycle state
          <span className="text-muted-foreground/60 normal-case tracking-normal">
            (separate from sales stage)
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {LIFECYCLE_STATES.map((s) => {
            const active = c.lifecycle_state === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setLifecycle(s.key)}
                className={`p-2 rounded-md border text-left transition-colors ${
                  active
                    ? "bg-secondary/15 border-secondary/40"
                    : "bg-muted/30 border-border hover:border-primary/30"
                }`}
                title={s.hint}
              >
                <div className="text-xs text-foreground">{s.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {s.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expected access */}
      <div className="mb-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="h-3 w-3" /> Expected access (from packages)
        </div>
        {expectedAccess.length === 0 ? (
          <div className="p-3 rounded-md border border-dashed border-border text-[11px] text-muted-foreground">
            No packages selected yet. Tool exposure is governed by direct
            assignment only.
          </div>
        ) : (
          <ul className="space-y-1">
            {expectedAccess.map((line) => (
              <li
                key={line}
                className="text-xs text-foreground flex items-center gap-2"
              >
                <span className="h-1 w-1 rounded-full bg-primary" /> {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 p-3 rounded-md border border-dashed border-border bg-muted/20">
        <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Revenue Tracker stays a <strong>separately assignable</strong> tool
          inside the RGS Control System lane. Toggling its package here records
          what was bought; actual tool assignment still happens via Tool
          Distribution / Add-On Monitoring.
        </p>
      </div>
    </section>
  );
}
