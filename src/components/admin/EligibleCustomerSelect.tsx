/**
 * P93E-E2H — Reusable workflow customer picker.
 *
 * Wraps `listEligibleCustomers` so every workflow-driving admin selector
 * (Reports, Report Drafts, Diagnostic Interview link, Standalone Tool
 * Runner) shares the same archive / seeded-demo / demo-toggle / label
 * rules. Components opt into demo visibility via the `Include active
 * demo accounts` checkbox; seeded sample rows are always hidden.
 */

import { useEffect, useMemo, useState } from "react";
import {
  listEligibleCustomers,
  eligibleSelectorEmptyState,
  type EligibleCustomerOption,
  type EligibleRunMode,
} from "@/lib/admin/eligibleCustomerSelector";

export interface EligibleCustomerSelectProps {
  value: string;
  onChange: (id: string) => void;
  runMode?: EligibleRunMode;
  /** Allow showing the "Include active demo accounts" toggle. */
  allowDemoToggle?: boolean;
  /** Initial state of the demo toggle. */
  demoDefault?: boolean;
  /** Optional placeholder for the empty value option. */
  placeholder?: string;
  /** Optional className for the <select>. */
  selectClassName?: string;
  /** data-testid prefix for the select + toggle. */
  testIdPrefix?: string;
  /** Disable the select entirely. */
  disabled?: boolean;
}

export function EligibleCustomerSelect({
  value,
  onChange,
  runMode = "any_eligible",
  allowDemoToggle = true,
  demoDefault = false,
  placeholder = "— Select customer —",
  selectClassName = "mt-1 w-full bg-muted/40 border border-border rounded-md px-3 py-2 text-sm text-foreground h-10",
  testIdPrefix,
  disabled,
}: EligibleCustomerSelectProps) {
  const [options, setOptions] = useState<EligibleCustomerOption[]>([]);
  const [includeDemo, setIncludeDemo] = useState(demoDefault);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const rows = await listEligibleCustomers({ runMode, includeDemo, limit: 500 });
      if (cancelled) return;
      setOptions(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [runMode, includeDemo]);

  const selectTestId = testIdPrefix ? `${testIdPrefix}-select` : undefined;
  const toggleTestId = testIdPrefix ? `${testIdPrefix}-include-demo` : undefined;

  const empty = useMemo(() => eligibleSelectorEmptyState(runMode), [runMode]);

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClassName}
        disabled={disabled}
        data-testid={selectTestId}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.primaryLabel}
            {o.badges.length ? `  ·  ${o.badges.join(" · ")}` : ""}
          </option>
        ))}
      </select>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        {allowDemoToggle ? (
          <label className="inline-flex items-center gap-1">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setIncludeDemo(e.target.checked)}
              data-testid={toggleTestId}
            />
            Include active demo accounts
          </label>
        ) : (
          <span />
        )}
        <span>
          {loading
            ? "Loading customers…"
            : options.length === 0
              ? empty
              : `${options.length} eligible`}
        </span>
      </div>
    </div>
  );
}
