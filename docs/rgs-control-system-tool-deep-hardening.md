# RGS Control System™ Tool Deep Hardening

This pass audits and hardens every RGS Control System™ (RCS) lane surface
for premium UX, scope clarity, data completeness, guided independence, and
report/source readiness. It does not rebuild the report framework, the
`tool-reports` storage bucket, the `report_drafts` table, or the
`tool_report_artifacts` table — those remain the single source of truth.

## Surfaces audited

| Surface | File | Status | Client-facing? | Changed in this pass |
|---|---|---|---|---|
| RGS Control System™ umbrella | `src/pages/portal/tools/RgsControlSystem.tsx` | launch-ready | Yes (RCS lane, ClientToolGuard) | + RcsScopeBanner |
| Priority Action Tracker (client) | `src/pages/portal/tools/PriorityActionTracker.tsx` | launch-ready | Yes (read approved + assigned) | + RcsScopeBanner |
| Owner Decision Dashboard (client) | `src/pages/portal/tools/OwnerDecisionDashboard.tsx` | launch-ready | Yes (approved decisions) | + RcsScopeBanner |
| Monthly System Review (client) | `src/pages/portal/tools/MonthlySystemReview.tsx` | launch-ready | Yes (read approved entries) | + RcsScopeBanner |
| Scorecard History / Stability Trend | `src/pages/portal/tools/ScorecardHistory.tsx` | launch-ready | Yes (approved snapshots) | + RcsScopeBanner |
| Advisory Notes / Clarification Log | `src/pages/portal/tools/AdvisoryNotes.tsx` | launch-ready | Yes (approved notes) | + RcsScopeBanner |
| Financial Visibility | `src/pages/portal/tools/FinancialVisibility.tsx` | launch-ready | Yes (approved sources) | + RcsScopeBanner |
| Revenue & Risk Monitor (client) | `src/pages/portal/tools/RevenueRiskMonitor.tsx` | launch-ready | Yes (client tool shell) | unchanged — already premium shell |
| Tool Library / Resource Center | `src/pages/portal/tools/ToolLibrary.tsx` | launch-ready | Yes | unchanged — surface already client-safe |
| Revenue Control Center™ (BCC) | `src/pages/portal/BusinessControlCenter.tsx` + `src/pages/portal/ClientRevenueTrackerPage.tsx` | launch-ready | Yes | unchanged — already integrated under RCS umbrella |
| Customer Detail RCS status/actions | `src/pages/admin/CustomerDetail.tsx` | launch-ready (admin) | No | unchanged |
| Admin RCS review queue | `src/pages/admin/RgsReviewQueue.tsx` + per-tool admin pages | launch-ready (admin) | No | unchanged |
| Saved Benchmarks | `src/pages/admin/SavedBenchmarks.tsx` | launch-ready (admin) | No | unchanged |

Surfaces left unchanged were already proven launch-ready in prior accepted
passes (Diagnostic Tool Deep Hardening, Implementation Tool Deep Hardening,
Tool-Specific Report Generator + PDF Storage, Admin Tool Directory). They
are revalidated by the contract test in this pass.

## Client-facing access classification (guided independence)

| Tool | Classification |
|---|---|
| RGS Control System™ umbrella | Client-facing inside RCS subscription |
| Priority Action Tracker | Admin + client-facing (client reads approved/assigned items) |
| Owner Decision Dashboard | Admin + client-facing (approved decisions) |
| Monthly System Review | Client-facing after admin approval/unlock (`client_visible`) |
| Scorecard History / Stability Trend | Client-facing after admin approval/unlock |
| Advisory Notes / Clarification Log | Client-facing after admin approval/unlock |
| Financial Visibility | Admin + client-facing (status/health, never secrets) |
| Revenue & Risk Monitor | Admin + client-facing |
| Tool Library / Resource Center | Client-facing inside RCS subscription |
| Saved Benchmarks | Admin-only (read-through into Scorecard History) |

No tool was promoted to "client can self-approve" in this pass — admin review
remains required wherever it already was. Client-created records continue to
default to safe statuses (`draft`, `submitted_for_review`,
`needs_admin_review`, `client_visible=false`).

## What changed

- Added `src/components/tools/RcsScopeBanner.tsx`: a reusable, presentation-
  only scope banner that mirrors the Implementation lane banner. It states
  what the RCS lane includes and what is outside scope (no operator role,
  no unlimited support, no legal/tax/accounting/HR/compliance advice).
- Wired the banner into the RCS umbrella and the launch-relevant client
  tools listed above so every premium surface carries the same boundary
  language without duplicating the prose.
- Added `src/lib/__tests__/rgsControlSystemToolDeepHardening.test.ts` to lock
  the wiring, banned-language, ClientToolGuard, admin-route gating, report
  framework presence, and admin-note non-leakage in place.

## Performance

- No new queries. The banner is a pure component — zero data fetching,
  zero AI calls, zero secrets — so it does not affect render or network
  cost on any client tool page.
- Existing client-safe RPCs (`get_client_priority_action_items`,
  `get_client_owner_decision_dashboard_items`,
  `get_client_monthly_system_review_entries`,
  `get_client_scorecard_history_entries`,
  `get_client_advisory_entries`,
  `get_client_financial_visibility_sources`) remain the single read path
  per tool — no duplicate fetches were added.

## Data completeness

No schema changes. Every RCS client tool already exposes the fields required
for ongoing visibility (priority, owner, due/review, status, what changed,
client-visible summary, source label) through its client-safe RPC. Admin-only
columns (`internal_notes`, `admin_notes`) remain server-side and are not
selected by these client RPCs.

## Report / source readiness

The accepted Tool-Specific Report Generator + PDF Storage framework already
covers the RCS lane. This pass does not add new tables, buckets, or report
types. All RCS tools that were classified reportable in
`docs/rgs-tool-specific-report-generator.md` retain that classification.

## Tool-specific report / PDF readiness

| Tool | Reportability |
|---|---|
| Priority Action Tracker | Reportable — client-ready standalone report |
| Owner Decision Dashboard | Reportable — client-ready standalone report |
| Monthly System Review | Reportable — client-ready standalone report |
| Scorecard History | Reportable — client-ready standalone report |
| Advisory Notes | Reportable — admin-internal only |
| Financial Visibility | Reportable later — depends on connected source coverage |
| RGS Control System™ umbrella | Not reportable — composite view, individual tools cover the underlying outputs |

## Security / access verification

- Every RCS client route remains wrapped in `ProtectedRoute` +
  `ClientToolGuard` with the correct `toolKey`.
- Every RCS admin route remains `ProtectedRoute requireRole="admin"`.
- The contract test verifies these gates and the absence of
  `internal_notes` / `.admin_notes` reads on every changed client surface.
- No frontend secrets, no AI gateway URLs, no payment internals (`stripe_*`,
  `rcc_subscription_status`, `rcc_paid_through`) appear in the umbrella.
- Subscription / payment gating continues to flow through `useRccAccess` /
  `RccGate` for the underlying RCS tools — unchanged in this pass.

## Deferred

- Charts on Scorecard History (no chart dependency yet).
- Auto-generated stored PDF for the RGS Control System™ umbrella view (the
  underlying tools already cover their own PDFs).
- Cross-tool automation that would auto-create Owner Decision Dashboard
  entries when scores decline.

## Required launch RCS tools remaining framework-only

None. Every launch-relevant RCS surface listed above is launch-ready. Items
listed under "Deferred" are explicitly not required for launch.