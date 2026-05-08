/**
 * P12.4.B — Customer package entitlement + lifecycle state model.
 *
 * Explicit, editable representation of:
 *   - what the customer purchased (packages)
 *   - where they are in the operational workflow (lifecycle_state)
 *
 * These are intentionally separate from sales `stage` and from per-stream
 * payment fields, so admins can answer "what did they buy?" and "where are
 * they?" independently.
 */

export type PackageKey =
  | "package_diagnostic"
  | "package_implementation"
  | "package_revenue_tracker"
  | "package_ongoing_support"
  | "package_addons"
  | "package_full_bundle";

export type LifecycleState =
  | "lead"
  | "diagnostic"
  | "implementation"
  | "completed"
  | "ongoing_support"
  | "re_engagement"
  | "inactive";

export const PACKAGES: { key: PackageKey; label: string; hint: string }[] = [
  { key: "package_diagnostic", label: "Diagnostic", hint: "Paid diagnostic engagement" },
  { key: "package_implementation", label: "Implementation", hint: "Rollout / systemization engagement" },
  { key: "package_revenue_tracker", label: "Revenue Tracker", hint: "Separately assignable RCC tool" },
  { key: "package_ongoing_support", label: "RGS Control System", hint: "Ongoing visibility and bounded review lane" },
  { key: "package_addons", label: "Add-ons", hint: "Specific add-on tools or services" },
  { key: "package_full_bundle", label: "Full Bundle", hint: "Bought the full product line" },
];

export const LIFECYCLE_STATES: { key: LifecycleState; label: string; hint: string }[] = [
  { key: "lead", label: "Lead", hint: "Pre-engagement" },
  { key: "diagnostic", label: "In Diagnostic", hint: "Diagnostic in progress" },
  { key: "implementation", label: "In Implementation", hint: "Active rollout" },
  { key: "completed", label: "Completed", hint: "Implementation finished, no active retained lane" },
  { key: "ongoing_support", label: "RGS Control System", hint: "Retained for ongoing visibility" },
  { key: "re_engagement", label: "Re-engagement", hint: "Add-ons / re-engagement only" },
  { key: "inactive", label: "Inactive", hint: "Not currently engaged" },
];

export function lifecycleLabel(s: string | null | undefined): string {
  if (!s) return "Lead";
  return LIFECYCLE_STATES.find((x) => x.key === s)?.label ?? s;
}

/** Tools/areas the customer should plausibly have access to, derived from packages. */
export function deriveExpectedAccess(c: Record<string, any>): string[] {
  const out: string[] = [];
  if (c.package_diagnostic) out.push("Diagnostic Workspace inputs & report");
  if (c.package_implementation) out.push("Implementation tools & checklist");
  if (c.package_revenue_tracker) out.push("Revenue Tracker (RCC)");
  if (c.package_ongoing_support) out.push("RGS Control System tools (Reports & Reviews, Monitoring)");
  if (c.package_addons) out.push("Assigned add-on tools");
  if (c.package_full_bundle) out.push("Full product line");
  return out;
}
