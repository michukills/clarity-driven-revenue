# Legacy Admin Table Cardification + Dark-Mode Contrast Pass

## Audit findings
Surveyed admin tables in `src/pages/admin/`. Highest-impact legacy tables relying solely on horizontal scroll:
- `Reports.tsx` (reports list — frequently used, wide row set)
- `PendingAccounts.tsx` (signups + linked accounts — daily-use surface)
- Other tables (`ReportDrafts`, `Customers` (already has board/table modes), `ClientHealthAdmin`, `WalkthroughVideosAdmin`, `ToolLibraryAdmin`, `Tasks`) remain horizontal-scroll wrapped — deferred for next pass to avoid risky broad rewrites.

Dark-mode contrast issues observed:
- `text-muted-foreground` used for primary report values (period, type, health, next step) made critical data look secondary.
- Generic "Open" / "View" buttons did not specify the action.
- Empty state read like "No reports yet" without any guidance.

## Improvements made
**`src/pages/admin/Reports.tsx`**
- Added a mobile (`md:hidden`) card list for the published-reports table; cards include client name, type, period, health, status pill, next step, and action buttons (Open report / Publish / Archive / Delete).
- Wrapped existing desktop table in `hidden md:block overflow-x-auto`.
- Replaced `text-muted-foreground` on primary cells with `text-foreground/80` for stronger dark-mode contrast.
- Improved empty-state copy: "No reports match these filters. Adjust filters above, or generate a new draft for a client."
- Loading copy uses `text-foreground/80` instead of muted.

**`src/pages/admin/PendingAccounts.tsx`**
- Added mobile card fallback for the **pending signups** table — title (email), name, created date, suggested-match status, and grouped action buttons (Link to existing / Create new / Deny).
- Added mobile card fallback for the **linked accounts** table — client name, email, stage, activation status, and "Open client record" action.
- Renamed "Open" link to "Open client record" for both desktop and mobile.

## Routes touched
- `/admin/reports`
- `/admin/pending-accounts`

## Files changed
- `src/pages/admin/Reports.tsx`
- `src/pages/admin/PendingAccounts.tsx`
- `src/lib/__tests__/legacyAdminTableCardificationDarkMode.test.ts` (new)
- `docs/rgs-legacy-admin-table-cardification-dark-mode.md` (new)
- `docs/rgs-os-feature-hardening-audit.md` (appended)

## Security / access notes
- No changes to RLS, RPCs, ProtectedRoute guards, or admin/client separation.
- No `internal_notes`, `admin_notes`, `admin_summary`, or AI draft body exposed to client surfaces (these are admin-only pages).
- No frontend secrets introduced. No business logic altered.

## Deferred
- Card-mode for `ReportDrafts`, `ClientHealthAdmin`, `WalkthroughVideosAdmin`, `ToolLibraryAdmin`, `IndustryBrainAdmin`, `AdvisoryNotesAdmin`, `MonthlySystemReviewAdmin`, `ScorecardHistoryAdmin`, `Tasks` (currently `overflow-x-auto`).
- Broader badge/button contrast token sweep (`text-emerald-400` → `text-emerald-300` etc.) deferred — only touched in the new mobile card surfaces.

## Testing
- Added contract test `legacyAdminTableCardificationDarkMode.test.ts` enforcing mobile card / desktop table split, foreground contrast, action-oriented labels, and banned-language guard.
