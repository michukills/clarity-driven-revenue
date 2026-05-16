# P101 — Tool Report Artifact Parity + Gig/RGS Report Modes

## Context

A reusable tool-report framework already exists and is heavily tested:

- `src/lib/reports/toolReports.ts` — catalog, draft generator, PDF builder, private `tool-reports` bucket, signed URL helper, `tool_report_artifacts` table with admin approval + `client_visible` gating, archive support.
- `src/components/admin/StoredToolReportsPanel.tsx` — admin UI for generate / preview / approve / client-visible toggle / signed download, wired inside `ReportDraftDetail.tsx`.
- `src/lib/standaloneToolRunner.ts` — delegates to `generateToolSpecificDraft` for standalone tools.
- Gig scope: `useGigCustomerScope`, `buildGigReportScopeMetadata`, `checkGigToolAccess`, `GIG_TOOL_REGISTRY`, `FULL_CLIENT_ONLY_TOOLS`.

P101 should **extend** this — not duplicate it. The framework already covers: tenant RLS, private storage, signed URL, draft → approved → client-visible, version, archive, audit-friendly metadata, no fake PDFs, no public bucket. The gaps are: explicit `report_mode` ∈ {gig_report, full_rgs_report}, gig-tier section scoping, per-tool section structure definitions, mode selector UI, and gig/RGS regression tests.

## Scope (in)

1. **Schema**: add `report_mode`, `gig_tier`, `allowed_sections`, `excluded_sections` columns to `tool_report_artifacts` (nullable, default-safe). RLS already tenant-bound; add policy clause so a gig customer can never read a `full_rgs_report` artifact, even if mistakenly marked client-visible.
2. **Report mode resolver** (`src/lib/reports/toolReportMode.ts`): pure function `resolveReportMode({ customer, toolKey, requestedMode })` returning `{ mode, gigTier, allowedSections, excludedSections, denialReason? }`. Reuses `buildGigReportScopeMetadata` + `FULL_CLIENT_ONLY_TOOLS`. Enforces: gig customers → `gig_report` only; full RGS sections always excluded for gig; Basic/Standard/Premium each map to a known section keyset.
3. **Per-tool section catalog** (`src/lib/reports/toolReportSectionCatalog.ts`): for the 7 priority tools (SOP, Workflow Map, Decision Rights, ICP, SWOT, Campaign Brief, Campaign Video Plan), define `{ basic[], standard[], premium[], full_rgs[] }` section keys + labels + claim-safety notes. Pure data; no AI rewrite.
4. **Generator wrapper**: extend `generateToolSpecificDraft` to accept `reportMode` + `gigTier` and persist them onto the artifact when `storeToolReportPdf` runs. Filter input sections by `allowedSections` before storage. Preserve every existing behavior.
5. **Admin UI**: add a small `ReportModeSelector` block inside `StoredToolReportsPanel` (Gig Report / RGS Report toggle + tier badge + scope preview + denial copy). No new pages, no brand pass.
6. **Tests** (new files only; do not edit P76/P70 tests):
    - `p101ToolReportModeContract.test.ts` — mode resolver, gig denial, Basic/Standard/Premium section diffs, full-RGS exclusion for gig customers, full-client retains RGS report.
    - `p101ToolReportSectionCatalog.test.ts` — each priority tool has all four section sets, Basic ⊂ Standard ⊂ Premium, full_rgs disjoint from gig tiers where required.
    - `p101ToolReportArtifactRls.test.ts` — schema contract (columns present), regression that `/scorecard` redirect + `/diagnostic/scorecard` guard + P98/P99/P100/P100A tests are untouched.
    - Copy-safety scan over section labels/notes (no guaranteed/compliance/valuation/medical phrases).
7. **Audit**: add two audit action keys to existing audit module: `tool_report_mode_resolved`, `tool_report_mode_denied`. No new edge function.

## Scope (out, by request)

- New report engine / new PDF library / brand pass / Confidence Kernel rewrite.
- New report-download edge function (existing signed URL is sufficient; storage RLS already enforces).
- Public funnel, Scorecard routes, gig portal redesign, Remotion worker.
- Wiring AI brains deeply (deferred to P103).
- Goals/KPI report (no dedicated tool exists today — skip per "don't invent tools").

## Files

New:
- `src/lib/reports/toolReportMode.ts`
- `src/lib/reports/toolReportSectionCatalog.ts`
- `src/components/admin/ReportModeSelector.tsx`
- `src/lib/__tests__/p101ToolReportModeContract.test.ts`
- `src/lib/__tests__/p101ToolReportSectionCatalog.test.ts`
- `src/lib/__tests__/p101ToolReportArtifactRls.test.ts`
- migration: add columns + RLS clause on `tool_report_artifacts`

Edited:
- `src/lib/reports/toolReports.ts` — accept `reportMode` / `gigTier` / allowed-section filter on `storeToolReportPdf`
- `src/components/admin/StoredToolReportsPanel.tsx` — mount `ReportModeSelector`, pass selection through
- `src/lib/campaignControl/campaignAudit.ts` — add two action keys (mirroring P98/P99/P100 pattern)

## Honest limitations

- PDF rendering reuses the existing `buildRunPdfBlob` pipeline; this pass does not re-style PDFs.
- Section text bodies still come from the calling tool — this pass enforces *which* sections are allowed, not their AI content.
- `report_mode` enforcement is at write-time + RLS-time; existing artifacts are backfilled to `gig_report` for gig customers and `full_rgs_report` for non-gig in the migration.

## Verification

- Vitest: all new + existing tests green.
- `tsc --noEmit` clean.
- Manual QA confirmation of mode selector, denial copy, tier scope preview in admin Report Draft Detail.