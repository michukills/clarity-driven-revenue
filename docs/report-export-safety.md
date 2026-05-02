# Report & Export Safety (P34)

This document defines the trust boundary between admin-only report content
and client-facing report views, exports, and downloads.

## Surfaces inventoried

Client-facing:
- `src/pages/portal/Reports.tsx` — list of published reports for the
  authenticated client.
- `src/pages/portal/ReportView.tsx` — published report detail.
- `src/pages/portal/CustomerDashboard.tsx` — pulls the latest published
  report for the dashboard summary.
- `src/components/bcc/ReportRenderer.tsx` — shared renderer; only renders
  internal notes when `showInternal=true` (admin viewers only).

Admin-only:
- `src/pages/admin/Reports.tsx`, `ReportEditor.tsx`, `ReportDrafts.tsx`,
  `ReportDraftDetail.tsx` — draft, edit, publish, preview, and PDF export.

Edge functions:
- `supabase/functions/report-ai-assist` — admin-only AI assistance for
  drafts. Output stays admin-only until an admin marks sections client-safe
  and publishes.

Storage:
- No dedicated report-artifact bucket. Client uploads use `client-uploads`
  with signed URLs scoped to the owning customer. Reports are rendered from
  `business_control_reports.report_data` JSON, not from storage objects.

Email:
- No "send report by email" flow. Admin notifications (`notify-admin-event`,
  `_shared/admin-email.ts`) never include report bodies, internal notes,
  invite tokens, or provider secrets.

## Client-safe field allowlist

The single source of truth is `src/lib/reports/clientSafeReportFields.ts`,
exporting `CLIENT_SAFE_REPORT_COLUMNS` and `CLIENT_SAFE_REPORT_SELECT`.

All client-facing queries against `business_control_reports` MUST use
`CLIENT_SAFE_REPORT_SELECT`. The allowlist intentionally excludes
`internal_notes` and any future admin-only column.

## Published-only + ownership

Database protection (RLS, migration `20260422164939…`):
- Admins: full access via `is_admin(auth.uid())`.
- Clients: `SELECT` only when `status = 'published'` AND
  `user_owns_customer(auth.uid(), customer_id)`.

Application protection: every client report query also adds
`.eq("status", "published")` defense-in-depth, and report detail uses
`.eq("id", id)` so a wrong-id guess returns `null` without leaking metadata.

## Export / PDF rules

- No client-facing PDF/export exists today. The download button is
  intentionally not exposed in the portal.
- The admin PDF (`ReportDraftDetail.tsx → downloadPdf`) filters sections by
  `s.client_safe === true` and gates the Stability Snapshot through
  `appendStabilitySnapshotIfClientReady` (requires `client_ready` snapshot
  AND an `approved` parent draft).
- Admin export filenames are derived from the report title only (no IDs,
  emails, or internal notes leak into the filename).
- A standard service-boundary disclaimer is appended to every exported PDF.

## Storage / signed URL rules

- Buckets used by the portal are private.
- Signed URLs are generated only after RLS-checked queries return a row the
  caller owns. File paths are scoped under the owning customer.
- Archived/deleted reports are not served because they fail the
  `status = 'published'` filter.

## Admin publish checklist

1. Draft is created from deterministic data; AI assist (if used) writes only
   to admin-only fields and is labeled "admin-only" in the UI.
2. Admin marks each section `client_safe` (or leaves it admin-only).
3. Admin reviews preview with `previewClient` mode (matches what the client
   will see; `internal_notes` is hidden in this mode).
4. Admin sets status to `published`. Until that flip, RLS prevents any
   client read.
5. Status changes are reflected in `customer_timeline` via existing audit
   triggers.

## Things that must never appear in client reports/exports

- `internal_notes` or any admin-only column on `business_control_reports`.
- Sections where `client_safe === false`.
- AI draft text that has not been reviewed and marked client-safe.
- Stability Snapshots that are not `client_ready` on an `approved` draft.
- `admin_notifications` rows or any admin queue data.
- Service-role keys, Stripe secrets, OAuth/provider tokens, Resend keys,
  webhook secrets, raw invite tokens, encrypted token ciphertext.
- Other customers' data — RLS + ownership filters guarantee isolation.
- Unpublished/draft/archived reports.

## Adding a new report field safely

1. Add the column via migration. Decide whether it is client-safe or
   admin-only.
2. If client-safe, add it to `CLIENT_SAFE_REPORT_COLUMNS` in
   `src/lib/reports/clientSafeReportFields.ts`.
3. If admin-only, do NOT add it to the allowlist. The P34 contract test
   will then prevent it from leaking into client surfaces.
4. Update `ReportRenderer` only if the field should be rendered to clients;
   admin-only fields render only inside admin pages.

## Adding a new export/download safely

1. Reuse `CLIENT_SAFE_REPORT_SELECT` for the data fetch.
2. Filter sections by `s.client_safe === true`.
3. Gate the Stability Snapshot via `appendStabilitySnapshotIfClientReady`.
4. Generate filenames from public-safe title fields only.
5. Append the standard service-boundary disclaimer.
6. If the export runs server-side, perform the published+ownership check in
   the edge function before returning bytes; never return a draft.

## Tests

- `src/lib/__tests__/reportExportSafetyContract.test.ts` — enforces the
  allowlist, no `select("*")`, published+ownership, no admin secrets in
  client surfaces, ReportRenderer admin-gating, and admin PDF gating.
- Plus existing P28–P33 contract tests continue to pass.