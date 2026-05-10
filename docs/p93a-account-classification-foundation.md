# P93A — Account Classification Foundation

Centralized, deterministic account classification used by the rest of the OS.
Lives in `src/lib/accounts/accountClassification.ts`. This pass is logic-only;
UI consumption lands in P93B.

## Account kinds supported

| Kind | Display label |
|------|---------------|
| `real_client` | Real Client |
| `demo_test` | Demo / Test Account |
| `prospect_draft` | Prospect / Draft |
| `gig_work` | Gig Work Account |
| `pending_request` | Pending Request |
| `needs_review` | Needs Review |

## Source-of-truth precedence

1. Explicit conflicts → `needs_review` (blocks risky actions).
2. Pending / denied signup_request_status → `pending_request` / `needs_review`.
3. Demo, test, or internal-admin signals (via `getCustomerAccountKind`) → `demo_test`.
4. Gig signals (`is_gig`, `gig_status`, `account_kind`/`client_type`/`service_type` containing
   `gig|fiverr|standalone deliverable`) → `gig_work`.
5. Prospect/draft (`account_kind`/`client_type`/`status`/`account_status` = `prospect`|`draft`) → `prospect_draft`.
6. Default → `real_client`.

## Conflict detection

- `is_demo` true with `account_kind = client`
- `is_demo` true with a real payment (`has_real_payment` or `diagnostic_paid`)
- Gig + Control System active without `upgraded_to_control_system`
- Gig + Implementation active without `upgraded_to_implementation`
- Gig + `diagnostic_paid` without `upgraded_to_diagnostic`
- Pending/denied signup with `portal_access_status = active`
- `suspended` with active portal access

Any conflict returns `accountKind: "needs_review"`, `riskLevel: "blocked"`, and
`allowedActions` all `false`.

## Allowed actions (summary)

- **Real client:** can invite/assign tools/create reports/use payment/standalone tools/publish; Diagnostic/Implementation/Control System gated by stage or explicit upgrade flags.
- **Demo/Test:** only `canUseDemoData` + `canAssignTools` for demo data. Never real payment; never real Diagnostic/Implementation/Control System.
- **Gig Work:** `canRunStandaloneTools`, `canCreateGigDeliverable`, `canCreateReport`, `canPublishClientVisibleOutputs`. Diagnostic/Implementation/Control System only with explicit `upgraded_to_*` flag.
- **Prospect/Draft:** only `canCreateReport` (admin draft).
- **Pending / Needs Review:** all risky actions `false`.

## Known limitations

- DB has no dedicated `is_gig` column today. Gig classification relies on
  caller-supplied `is_gig` / `gig_status` or `service_type`/`client_type`
  markers. A migration is intentionally deferred to P93B/P93D when the
  creation UI is redesigned.
- `upgraded_to_*` scope flags are caller-supplied; DB columns may be added
  later. Until then, gig accounts default to no Diagnostic/Implementation/Control
  System access.
- This pass does not modify any UI — admin tables/cards still display whatever
  they did before. P93B replaces those displays with the safe labels exported
  here.

## What P93B should consume

- `classifyAccount(input)` → single resolver for all admin/customer surfaces.
- `ACCOUNT_KIND_DISPLAY_LABEL`, `DATA_MODE_LABEL`, `PAYMENT_MODE_LABEL`,
  `PORTAL_ACCESS_LABEL`, `SCOPE_BOUNDARY_LABEL` for safe, human-readable strings.
- `allowedActions.*` for action visibility / button enablement.
- `conflictReasons` + `helperText` for the "Needs Review" admin panel.

## What was intentionally not changed in P93A

- No DB schema changes.
- No UI changes.
- No changes to ClientToolGuard, RLS policies, role gating, payment flows,
  signup-request workflow, or invite/access controls.
- No changes to P83C–P92A behavior.