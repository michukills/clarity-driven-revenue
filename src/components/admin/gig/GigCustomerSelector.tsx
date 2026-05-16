/**
 * P100 — Reusable gig-aware customer selector.
 *
 * Wraps the existing `listEligibleCustomers` helper, exposes gig tier and
 * account-type badges, shows specific empty-state copy, and lets the caller
 * gate by a specific gig tool key via `requireGigToolKey`. Archived rows are
 * hidden by default; demo/test rows require explicit opt-in.
 */

import { useEffect, useMemo, useState } from "react";
import { listEligibleCustomers, type EligibleCustomerOption } from "@/lib/admin/eligibleCustomerSelector";
import { checkGigToolAccess, GIG_TIER_LABEL, type GigTier } from "@/lib/gig/gigTier";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GigAccountBadge, GigTierBadge } from "./GigTierBadge";

interface Props {
  value?: string | null;
  onChange: (customerId: string | null, option?: EligibleCustomerOption) => void;
  /** If set, rows are flagged ineligible when the resolved tier cannot run this tool. */
  requireGigToolKey?: string;
  includeDemo?: boolean;
  includeArchived?: boolean;
  className?: string;
}

export function GigCustomerSelector({
  value,
  onChange,
  requireGigToolKey,
  includeDemo = false,
  includeArchived = false,
  className,
}: Props) {
  const [rows, setRows] = useState<EligibleCustomerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listEligibleCustomers({
      runMode: "standalone_gig",
      includeDemo,
      includeArchived,
      limit: 200,
    })
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeDemo, includeArchived]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.primaryLabel.toLowerCase().includes(s) ||
        r.secondaryLabel.toLowerCase().includes(s),
    );
  }, [rows, search]);

  if (loading) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Loading eligible customers…</p>;
  }

  if (filtered.length === 0) {
    return (
      <div className={cn("rounded-md border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground", className)}>
        <p>No eligible customers found for this tool.</p>
        <p className="mt-1">Create a gig customer to run this standalone deliverable.</p>
        {!includeArchived && <p className="mt-1 text-xs">Archived customers are hidden by default.</p>}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Input
        placeholder="Search by name, business, or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <ul className="max-h-80 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {filtered.map((opt) => {
          const isGig = Boolean(opt.raw.is_gig);
          const gigTier = (opt.raw.gig_tier ?? null) as GigTier | null;
          const gigStatus = (opt.raw.gig_status ?? null) as "active" | "archived" | "converted" | null;
          const access = requireGigToolKey
            ? checkGigToolAccess(requireGigToolKey, { isGig, gigTier, gigStatus })
            : { allowed: true, reason: "", excludedFullRgsSections: [] };
          const selected = opt.id === value;
          return (
            <li key={opt.id}>
              <button
                type="button"
                disabled={!access.allowed}
                onClick={() => onChange(opt.id, opt)}
                className={cn(
                  "flex w-full flex-col gap-1 px-3 py-2 text-left text-sm transition-colors",
                  selected ? "bg-accent/15" : "hover:bg-muted/30",
                  !access.allowed && "cursor-not-allowed opacity-60",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{opt.primaryLabel}</span>
                  {isGig && <GigAccountBadge />}
                  {isGig && <GigTierBadge tier={gigTier} />}
                  {opt.isArchived && <Badge variant="outline">Archived</Badge>}
                  <Badge variant="outline" className="text-xs">{opt.classification.displayLabel}</Badge>
                </div>
                {opt.secondaryLabel && (
                  <span className="text-xs text-muted-foreground">{opt.secondaryLabel}</span>
                )}
                {requireGigToolKey && !access.allowed && (
                  <span className="text-xs text-destructive">{access.reason}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
          Clear selection
        </Button>
      )}
      <p className="text-xs text-muted-foreground">
        Tiers: {Object.values(GIG_TIER_LABEL).join(" · ")}. Standalone deliverables do not include full Diagnostic, Implementation, or RGS Control System access.
      </p>
    </div>
  );
}
