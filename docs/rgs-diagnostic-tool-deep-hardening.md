# Diagnostic Tool Deep Hardening

## Diagnostic tools audited
- **Owner Diagnostic Interview** — `src/pages/portal/tools/OwnerDiagnosticInterview.tsx`
  + `src/lib/diagnostics/ownerInterview.ts`
- **Diagnostic Tool Sequence Manager** — surfaced through
  `mark_owner_interview_complete` RPC + `DiagnosticSequenceAdminPanel` (no
  scoring or sequencing logic changed in this pass).
- **0–1000 Business Stability Scorecard** — `src/pages/admin/tools/StabilityScorecard.tsx`
  (deterministic logic unchanged).
- **Admin Diagnostic Review** — `src/pages/admin/DiagnosticInterviewDetail.tsx`,
  `src/pages/admin/DiagnosticInterviews.tsx`, `src/pages/admin/DiagnosticOrders.tsx`
  (admin-only routes confirmed under `requireRole="admin"`).
- **Saved Benchmarks**, **Report Drafts**, **Scorecard Leads**, **Diagnostic
  Workspace** — confirmed admin-only routing and report/source linkage; no
  schema or RLS changes.

## Issues found
- The Owner Diagnostic Interview captured the required scoring fields (those
  enforced by `mark_owner_interview_complete`) but was missing optional
  evidence-rich fields needed for high-quality reports and repair maps:
  customer/buyer profile, lead handling, fulfillment, repeat/retention,
  current tools, industry-specific risks, and where the owner first noticed
  things slipping.
- The interview UI used a custom local header instead of the shared premium
  tool header / guidance panel introduced in P67.

## Data completeness improvements
Added seven optional sections to `OWNER_INTERVIEW_SECTIONS` (all `required: false`,
so unlock semantics enforced by the RPC are unchanged):
- `buyer_profile` — primary buyer / customer
- `repeat_purchase` — repeat / retention pattern
- `lead_handling` — who handles new leads and how fast
- `fulfillment_process` — service delivery after payment
- `current_tools` — accounting/CRM/scheduling tools already in use
- `industry_risks` — industry-specific risks
- `owner_first_slipped` — where the owner thinks the business first started slipping

These flow into existing `diagnostic_intake_answers` rows via `saveIntakeAnswer`
— no new tables, no migration, no RLS change.

## Performance
- Owner Interview already loads answers in a single query and uses a `Map`
  for O(1) lookups; no duplicate queries introduced.
- The seven new optional sections reuse the existing per-section save handler
  (no batch payload changes, no extra round-trips on load).
- Loading/empty/saved states already exist; surfaced through the new
  `PremiumToolHeader` `currentStatus` / `nextAction` slots so admins and
  clients see exactly where they are without scanning the full form.

## Premium UX changes
`OwnerDiagnosticInterview.tsx` now uses:
- `PremiumToolHeader` with the **Diagnostic** lane badge, dynamic status, and
  next-action callout.
- `ToolGuidancePanel` documenting purpose, what to prepare, what a strong
  submission looks like, what happens after submission, who reviews it, and
  what is **out of scope** (no implementation, no ongoing advisory, no
  legal/tax/accounting/compliance guidance).

## Report / source readiness
- The added optional fields strengthen evidence available to:
  - Main RGS Diagnostic Report
  - Fiverr Basic / Standard / Premium tiers
  - Priority Repair Map
  - RGS Stability Snapshot
  - Tool-specific reports (Owner Interview is registered as a report source via
    the existing `report_drafts` evidence_snapshot pipeline).
- Saved benchmarks remain unchanged; new fields land in the same intake table
  and are available to existing benchmark builders without code changes.

## Security / access notes
- No RLS changes. No migration. No new tables.
- `mark_owner_interview_complete` RPC required-key array is untouched (test
  enforces the client-side required set still matches the RPC array exactly).
- ClientToolGuard wrapping for `owner_diagnostic_interview` is preserved and
  asserted by test.
- All admin diagnostic routes verified to retain `requireRole="admin"`.
- No frontend secrets, no AI auto-publishing, no admin-note leakage.
- No fake proof, guarantees, unlimited support, or healthcare/HIPAA logic.

## Deferred
- A premium header pass on `DiagnosticInterviewDetail.tsx` (admin review) and
  the Stability Scorecard runner — the surfaces already meet the safety bar
  but could benefit from the same `PremiumToolHeader` treatment in a follow-up.
- A dedicated diagnostic-evidence completeness summary on the admin Diagnostic
  Workspace (would surface % of optional fields filled).
- Per-section autosave (current per-section explicit save is intentional for
  predictability).

## Testing
- New: `src/lib/__tests__/diagnosticToolDeepHardening.test.ts` (7 tests):
  ClientToolGuard, admin-only routing, evidence theme coverage, RPC contract
  parity, progress helper sanity, premium header/guidance presence, language
  safety.
- Full suite: **5,146 tests passed across 128 files.**