/**
 * P93B — Reusable classification UI surfaces.
 *
 * Pure presentation. Consumes `classifyAccount()` from P93A and renders the
 * 6 facets the admin must always be able to see at a glance:
 *   1. Account Type
 *   2. Data Mode
 *   3. Payment Mode
 *   4. Delivery Stage
 *   5. Portal Access
 *   6. Scope Boundary
 *
 * Also exposes a "Needs Review" banner used when the classifier returns a
 * conflict.
 */
import { AlertTriangle, ShieldCheck, Beaker, FileText, Briefcase, Clock, Lock } from "lucide-react";
import {
  classifyAccount,
  ACCOUNT_KIND_DISPLAY_LABEL,
  DATA_MODE_LABEL,
  PAYMENT_MODE_LABEL,
  PORTAL_ACCESS_LABEL,
  SCOPE_BOUNDARY_LABEL,
  type AccountInput,
  type AccountKind,
  type AccountClassification,
} from "@/lib/accounts/accountClassification";

const KIND_TONE: Record<AccountKind, string> = {
  real_client: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  demo_test: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  prospect_draft: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  gig_work: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/40",
  pending_request: "bg-muted/60 text-foreground border-border",
  needs_review: "bg-destructive/15 text-destructive border-destructive/40",
};

const KIND_ICON: Record<AccountKind, any> = {
  real_client: ShieldCheck,
  demo_test: Beaker,
  prospect_draft: FileText,
  gig_work: Briefcase,
  pending_request: Clock,
  needs_review: AlertTriangle,
};

const STAGE_LABEL: Record<string, string> = {
  not_started: "Not Started",
  diagnostic: "Diagnostic",
  implementation: "Implementation",
  control_system: "RGS Control System",
  standalone: "Standalone",
  gig_deliverable: "Gig Deliverable",
  complete: "Complete",
  unknown: "Unknown / Needs Review",
};

export function AccountTypeBadge({
  classification,
  size = "sm",
}: {
  classification: AccountClassification;
  size?: "xs" | "sm";
}) {
  const Icon = KIND_ICON[classification.accountKind];
  const tone = KIND_TONE[classification.accountKind];
  const sz =
    size === "xs"
      ? "text-[9px] px-1.5 py-0.5 [&_svg]:h-2.5 [&_svg]:w-2.5"
      : "text-[10px] px-2 py-0.5 [&_svg]:h-3 [&_svg]:w-3";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border uppercase tracking-wider whitespace-nowrap ${tone} ${sz}`}
      title={classification.helperText}
    >
      <Icon /> {classification.displayLabel}
    </span>
  );
}

function Facet({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground mt-0.5">{value}</div>
    </div>
  );
}

/**
 * Compact 6-facet panel — used in account/customer detail header and the
 * Create Account review summary.
 */
export function AccountClassificationPanel({
  input,
  className,
}: {
  input: AccountInput;
  className?: string;
}) {
  const c = classifyAccount(input);
  return (
    <div className={className}>
      {c.accountKind === "needs_review" && <NeedsReviewBanner classification={c} />}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <AccountTypeBadge classification={c} />
        <span className="text-[11px] text-muted-foreground">{c.helperText}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Facet label="Account Type" value={ACCOUNT_KIND_DISPLAY_LABEL[c.accountKind]} />
        <Facet label="Data Mode" value={DATA_MODE_LABEL[c.dataMode]} />
        <Facet label="Payment Mode" value={PAYMENT_MODE_LABEL[c.paymentMode]} />
        <Facet label="Delivery Stage" value={STAGE_LABEL[c.deliveryStage] ?? c.deliveryStage} />
        <Facet label="Portal Access" value={PORTAL_ACCESS_LABEL[c.portalAccessState]} />
        <Facet label="Scope Boundary" value={SCOPE_BOUNDARY_LABEL[c.scopeBoundary]} />
      </div>
    </div>
  );
}

export function NeedsReviewBanner({
  classification,
}: {
  classification: AccountClassification;
}) {
  if (classification.accountKind !== "needs_review") return null;
  return (
    <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <div className="text-destructive font-medium">Needs Review · Risk: Blocked</div>
          <p className="text-xs text-foreground/80 mt-1">
            Resolve account type/status conflict before sending invites, assigning tools, using
            payment flows, or publishing client-visible outputs.
          </p>
          {classification.conflictReasons.length > 0 && (
            <ul className="text-[11px] text-muted-foreground mt-2 list-disc pl-4 space-y-0.5">
              {classification.conflictReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shorthand: classify and render only the type pill — for table rows / cards
 * where space is tight. Locked / Gig limited / Demo states still read clearly.
 */
export function AccountTypePillFromInput({ input }: { input: AccountInput }) {
  const c = classifyAccount(input);
  return <AccountTypeBadge classification={c} size="xs" />;
}

/**
 * For tight rows: 3 inline chips after the type pill — Data, Payment, Scope.
 */
export function AccountFacetChips({ input }: { input: AccountInput }) {
  const c = classifyAccount(input);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border"
        title="Data Mode"
      >
        <Lock className="h-2.5 w-2.5 inline-block mr-0.5" />
        {DATA_MODE_LABEL[c.dataMode]}
      </span>
      <span
        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border"
        title="Payment Mode"
      >
        {PAYMENT_MODE_LABEL[c.paymentMode]}
      </span>
      <span
        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-muted/40 text-muted-foreground border-border"
        title="Scope Boundary"
      >
        {SCOPE_BOUNDARY_LABEL[c.scopeBoundary]}
      </span>
    </div>
  );
}

export default AccountClassificationPanel;