# Admin/System Tool Deep Hardening

RGS is the architect, not the operator. This pass hardens the admin/system
surfaces so the RGS owner/admin always knows what to review, approve,
publish, follow up on, or reject — without weakening report, AI, storage,
role, or tenant gates.

## Audit findings
- All admin pages live behind `ProtectedRoute requireRole="admin"` in
  `src/App.tsx` (verified by `adminSystemToolDeepHardening.test.ts`).
- AI assist (report drafting, SOP assist) remains edge/server-side only,
  defaults to admin-only review, and never auto-publishes.
- `report_drafts`, `tool_report_artifacts`, `StoredToolReportsPanel`, and
  the private `tool-reports` bucket are preserved (signed-URL access,
  approve+client_safe gate before publishing).
- RGS Tool Directory is admin-only and not exposed in the customer nav.
- Industry Brain admin already scopes cannabis/MMJ/MMC explicitly to
  cannabis dispensary / medical / recreational business operations and
  carries a no-legal-advice disclaimer; left unchanged in this pass per
  the explicit "not the Industry Brain Deep Expansion" rule.
- Customer Detail, Tasks, Templates, ToolCatalog, ToolMatrix, ToolLibrary
  admin: route protection and admin-only data scope confirmed; copy
  already aligned with RGS voice — left unchanged this pass.

## Surfaces audited
| Surface | Status | Action |
| --- | --- | --- |
| Admin Command Center (`AdminDashboard`) | launch-ready | unchanged (CommandGuidancePanel + AdminToolDirectory already hardened in P66A) |
| Admin Tool Directory (`/admin/tool-directory`) | launch-ready | unchanged (verified admin-only, not in customer nav) |
| Customers / Clients | launch-ready | unchanged |
| Customer Detail | launch-ready | unchanged |
| Pending Accounts | hardened | AdminScopeBanner added |
| Diagnostic Orders | launch-ready | unchanged (Diagnostic Tool Deep Hardening pass owns scope) |
| Report Drafts | hardened | AdminScopeBanner added; AI safety language preserved |
| Stored Tool Reports panel | launch-ready | unchanged (storage + approve gate test covered here) |
| AI-assisted report drafting | launch-ready | unchanged (deterministic-first; admin-only) |
| SOP AI assist | launch-ready | unchanged (edge function only) |
| Client Health / Renewal Risk | hardened | AdminScopeBanner added |
| Industry Brain admin | launch-ready | unchanged (deep expansion deferred to next pass) |
| Tool Library admin | launch-ready | unchanged |
| Walkthrough Videos admin | hardened | AdminScopeBanner added; framework-only honesty preserved |
| Advisory / Monthly / Scorecard / Decision Rights / Workflow / SWOT admin | launch-ready | unchanged |
| Financial Visibility admin | hardened | AdminScopeBanner added; no-token-in-browser asserted |
| Tasks admin | launch-ready | unchanged |
| System Readiness | hardened | AdminScopeBanner added |
| Saved Benchmarks admin | hardened | AdminScopeBanner added |
| Payments / invite / access admin | launch-ready | unchanged (managed via existing flows) |

## Files changed
- `src/components/admin/AdminScopeBanner.tsx` (new — shared scope banner)
- `src/pages/admin/PendingAccounts.tsx`
- `src/pages/admin/ReportDrafts.tsx`
- `src/pages/admin/ClientHealthOverview.tsx`
- `src/pages/admin/FinancialVisibilityAdmin.tsx`
- `src/pages/admin/SystemReadiness.tsx`
- `src/pages/admin/SavedBenchmarks.tsx`
- `src/pages/admin/WalkthroughVideosAdmin.tsx`
- `src/lib/__tests__/adminSystemToolDeepHardening.test.ts` (new)

## Banner copy contract
The shared `AdminScopeBanner` is pure presentation: no Supabase, no fetch,
no AI calls, no secrets. It clarifies for the operator:
- **Purpose:** what to review, approve, publish, follow up on, or reject.
- **Outside scope:** running the client's business, open-ended
  implementation, emergency response, promised outcomes, and
  legal/tax/accounting/HR/regulated advice. Admin-only notes stay
  admin-only until explicitly approved client-visible.

## Safety verification (covered by tests)
- All audited admin routes are `ProtectedRoute requireRole="admin"`.
- `tool_report_artifacts` flow keeps the approve + `client_safe` gate.
- `FinancialVisibilityAdmin` does not surface `access_token`,
  `refresh_token`, `client_secret`, or `service_role` in browser code.
- Banned scope-creep wording (unlimited support, guaranteed outcomes,
  done-for-you, HIPAA, etc.) is rejected on every changed admin surface.
- Admin pages do not import client-portal `ClientToolGuard`.
- `RGS Tool Directory` not present in `customerNavBase`.

## Client-facing access follow-ups (deferred)
- SOP / Training Bible client-facing surface — admin tool exists; the
  client mirror remains a future pass.
- Workflow / Process Mapping client-facing surface — same.
- Decision Rights / Accountability client-facing surface — same.
- Client-side progress updates for Priority Action Tracker and Owner
  Decision Dashboard — same.

## Deferred items
- Industry Brain Deep Expansion (own pass).
- Walkthrough Videos: real recordings (framework-only by design until
  recordings exist).
- System Readiness "live balance" semantics — intentionally not exposed.

## Launch-ready vs framework-only
No required launch admin/system surface remains framework-only.
Walkthrough Videos and Industry Brain Deep Expansion are explicitly
future-scoped and not launch-blocking.

## Test result
- New: `src/lib/__tests__/adminSystemToolDeepHardening.test.ts` — **21/21 passed.**
- Full suite: **5359/5359 tests passed across 136 files.**