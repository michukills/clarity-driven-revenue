/**
 * P93E-E2H — Shared Eligible Customer Selector (source-of-truth helper).
 *
 * One place that decides which customer rows belong in admin selectors,
 * and how each row is labeled. Built on top of the existing P93A
 * classifier (`classifyAccount`) and the legacy `getCustomerAccountKind`
 * helper so all admin selectors agree on:
 *
 *   - what counts as "active" vs archived/disabled
 *   - what counts as a stale seeded demo record
 *   - which records are eligible for which run mode
 *   - the safe display label / badges admins should see
 *
 * This helper is intentionally read-only. It never mutates DB rows and
 * never widens visibility — callers can opt *in* to seeing demo or
 * archived records, but the default surface is the trustworthy "active,
 * eligible, non-seeded" set.
 *
 * Run modes
 * ---------
 *   - `admin_internal`     — Admin-only run; no customer required.
 *   - `standalone_gig`     — Lightweight standalone/gig customer.
 *   - `full_client`        — A real, full client account.
 *   - `any_eligible`       — Either standalone/gig or full client (default).
 *
 * The helper does not invent DB columns. Standalone/gig classification
 * relies on the same caller-side markers P93A already uses
 * (`is_gig`, `service_type` containing "standalone deliverable", etc.).
 */

import { supabase } from "@/integrations/supabase/client";
import {
  classifyAccount,
  type AccountClassification,
  type AccountInput,
  type AccountKind,
} from "@/lib/accounts/accountClassification";
import {
  getCustomerAccountKind,
  type CustomerAccountKind,
} from "@/lib/customers/accountKind";
import { lifecycleLabel } from "@/lib/customers/packages";

export type EligibleRunMode =
  | "admin_internal"
  | "standalone_gig"
  | "full_client"
  | "any_eligible";

/** Hard-coded synthetic / seed markers that should not show up in normal
 * live admin selectors. Real demo accounts created through the app stay
 * visible (when `includeDemo` is true) but historical training rows are
 * hidden by default. */
const STALE_SEED_EMAIL_SUFFIXES = [
  "@demo.rgs.local",
  "@showcase.rgs.local",
  "@rgs-test.local",
  "@test.rgs.local",
] as const;

const STALE_SEED_NAME_MARKERS = [
  "synthetic demo",
  "synthetic training",
  "training record",
  "showcase",
  "demo seed",
  "(showcase)",
] as const;

export interface EligibleCustomerOption {
  id: string;
  /** Most-trustworthy display label for a one-line picker. */
  primaryLabel: string;
  /** Optional contact line (`Owner Name · email`). */
  secondaryLabel: string;
  /** Resolved account kind from the legacy helper. */
  accountKind: CustomerAccountKind;
  /** Resolved P93A classification (gig, real_client, demo_test, etc.). */
  classification: AccountClassification;
  /** Lifecycle label suitable for admin display. */
  lifecycleLabel: string;
  /** True if this row is archived / soft-disabled. Hidden by default. */
  isArchived: boolean;
  /** True if this row matches the stale-seed pattern. Hidden by default. */
  isStaleSeed: boolean;
  /** Eligibility for each run mode. */
  eligible: {
    standaloneGig: boolean;
    fullClient: boolean;
  };
  /** Short badge strings (account kind, lifecycle, archived, demo). */
  badges: string[];
  /** Underlying raw row for advanced consumers. */
  raw: Record<string, any>;
}

export interface EligibleCustomerQuery {
  runMode?: EligibleRunMode;
  includeArchived?: boolean;
  includeDemo?: boolean;
  includeInternalAdmin?: boolean;
  /** Plain text filter applied to name / business / email. */
  search?: string;
  /** Hard cap on results returned. Defaults to 200. */
  limit?: number;
}

/** Pure classifier — used by tests and by the data fetcher below. */
export function classifyCustomerForSelector(
  raw: Record<string, any>,
): EligibleCustomerOption {
  const email = String(raw.email || "").toLowerCase();
  const fullName = String(raw.full_name || "").toLowerCase();
  const businessName = String(raw.business_name || "").toLowerCase();
  const haystack = `${email} ${fullName} ${businessName}`;

  const accountKind = getCustomerAccountKind(raw);
  const classification = classifyAccount(raw as AccountInput);

  const isArchived = Boolean(raw.archived_at);
  const isStaleSeed =
    STALE_SEED_EMAIL_SUFFIXES.some((s) => email.endsWith(s)) ||
    STALE_SEED_NAME_MARKERS.some((m) => haystack.includes(m));

  const lifecycle = lifecycleLabel(raw.lifecycle_state);
  const primary =
    raw.business_name?.trim() ||
    raw.full_name?.trim() ||
    raw.email?.trim() ||
    raw.id;
  const secondaryParts: string[] = [];
  if (raw.full_name && raw.business_name) secondaryParts.push(String(raw.full_name));
  if (raw.email) secondaryParts.push(String(raw.email));

  const badges: string[] = [classification.displayLabel, lifecycle];
  if (isArchived) badges.push("Archived");
  if (isStaleSeed) badges.push("Seeded sample");
  if (raw.is_demo_account && !isStaleSeed) badges.push("Demo Active");

  // Eligibility per run mode. We trust the deterministic classifier:
  //   - real_client → full_client eligible (when not archived)
  //   - gig_work / demo_test / prospect_draft → standalone_gig eligible
  //   - needs_review / pending_request → not eligible anywhere
  // Eligibility ignores archived state — archived rows are admin-opt-in
  // via `includeArchived` and are filtered separately. We still block
  // unresolved (`needs_review`) and pre-portal (`pending_request`) rows
  // from acting as a customer in any tool run.
  const isBlocked =
    classification.accountKind === "needs_review" ||
    classification.accountKind === "pending_request";

  const fullClientKinds: AccountKind[] = ["real_client"];
  const standaloneGigKinds: AccountKind[] = [
    "real_client",
    "gig_work",
    "demo_test",
    "prospect_draft",
  ];

  const eligible = {
    fullClient: !isBlocked && fullClientKinds.includes(classification.accountKind),
    standaloneGig:
      !isBlocked && standaloneGigKinds.includes(classification.accountKind),
  };

  return {
    id: String(raw.id),
    primaryLabel: String(primary || "(unnamed)"),
    secondaryLabel: secondaryParts.join(" · "),
    accountKind,
    classification,
    lifecycleLabel: lifecycle,
    isArchived,
    isStaleSeed,
    eligible,
    badges,
    raw,
  };
}

/** Apply visibility rules. Pure — also exported for tests. */
export function applyEligibilityFilters(
  rows: Record<string, any>[],
  q: EligibleCustomerQuery = {},
): EligibleCustomerOption[] {
  const runMode = q.runMode ?? "any_eligible";
  const includeArchived = !!q.includeArchived;
  const includeDemo = !!q.includeDemo;
  const includeInternalAdmin = !!q.includeInternalAdmin;
  const search = (q.search ?? "").trim().toLowerCase();

  const opts = rows.map(classifyCustomerForSelector);

  return opts.filter((o) => {
    if (!includeArchived && o.isArchived) return false;
    // Stale seeded sample data never appears in normal selectors.
    if (o.isStaleSeed) return false;
    if (!includeInternalAdmin && o.accountKind === "internal_admin") return false;
    if (!includeDemo && (o.accountKind === "demo" || o.accountKind === "test")) {
      // P93E-E2H: a real, newly approved demo account (is_demo_account=true,
      // not seeded, not archived) is allowed only when callers opt in via
      // `includeDemo`. Default selectors hide them so demo data cannot
      // pollute live client workflows.
      return false;
    }
    if (runMode === "full_client" && !o.eligible.fullClient) return false;
    if (runMode === "standalone_gig" && !o.eligible.standaloneGig) return false;
    if (
      runMode === "any_eligible" &&
      !o.eligible.fullClient &&
      !o.eligible.standaloneGig
    ) {
      return false;
    }
    if (search) {
      const hit =
        o.primaryLabel.toLowerCase().includes(search) ||
        o.secondaryLabel.toLowerCase().includes(search) ||
        String(o.raw.email || "").toLowerCase().includes(search) ||
        String(o.raw.business_name || "").toLowerCase().includes(search) ||
        String(o.raw.full_name || "").toLowerCase().includes(search);
      if (!hit) return false;
    }
    return true;
  });
}

/** Empty-state copy for selectors that resolved to zero eligible rows. */
export function eligibleSelectorEmptyState(runMode: EligibleRunMode): string {
  if (runMode === "full_client") {
    return "No eligible full client found. Create a full client from the Clients page or pick a different run mode.";
  }
  if (runMode === "standalone_gig") {
    return "No eligible standalone customer found. Create a standalone customer/project or select a different run mode.";
  }
  return "No eligible customer found. Create a standalone customer/project or select a different run mode.";
}

/** Live data fetch + filter. Returns an empty array on error rather than
 * throwing, so admin UIs can render the empty state safely. */
export async function listEligibleCustomers(
  q: EligibleCustomerQuery = {},
): Promise<EligibleCustomerOption[]> {
  const limit = q.limit ?? 200;
  // Always fetch with archived filter applied at the DB layer when we are
  // not explicitly asking for archived rows — keeps the payload small and
  // protects us if a row is somehow missing the JS-side flag.
  let query = supabase
    .from("customers")
    .select(
      "id, full_name, business_name, email, account_kind, is_demo_account, " +
        "is_demo, is_gig, gig_status, service_type, client_type, status, " +
        "lifecycle_state, archived_at, last_activity_at",
    )
    .order("last_activity_at", { ascending: false })
    .limit(limit);
  if (!q.includeArchived) query = query.is("archived_at", null);
  const { data, error } = await query;
  if (error || !data) return [];
  return applyEligibilityFilters(data as Record<string, any>[], q);
}
