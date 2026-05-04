# RGS Framework vs Launch-Ready Audit — Rerun (post Pre-Launch Industry Expansion)

Date: 2026-05-04. Scope: rerun after the accepted Pre-Launch Industry
Intelligence Expansion. Patches two flagged follow-ups:

1. **Admin Industry Classification Workflow** — `IndustryAssignmentField`
   was already wired to `customers.industry` with confirm / override /
   needs-review / verification notes / change-confirm guard. This pass
   adds: classifier suggestion (inferred industry, confidence, rationale,
   needs-review flag), explicit source-of-truth label
   (`admin-confirmed | user-selected (intake) | rule-inferred | unset`),
   "Use suggestion" action gated by `shouldApplyClassification` so an
   admin-confirmed industry is **never silently overwritten**. Suggestion
   is admin-only; clients never see classifier rationale.
2. **Industry-adjusted interpretation consumption** — `getIndustryEmphasis`
   was previously only exported. New `IndustryEmphasisPanel` (admin-only,
   labelled "Score unchanged") is now mounted on:
   - Admin Diagnostic Review (`DiagnosticInterviewDetail`)
   - Diagnostic Report Builder (`ReportDraftDetail`, `report_builder` + `repair_map`)
   - Implementation Roadmap (`ImplementationRoadmapAdmin`)
   - RGS Control System (`RgsControlSystemAdmin`)
   - Revenue & Risk Monitor (`RevenueRiskMonitorAdmin`)

   Base deterministic 0–1000 Stability Score is **unchanged** — the
   emphasis layer only surfaces priority gears, priority signals,
   repair-map impact, monitoring emphasis, and (cannabis-only) safety
   notes. Cannabis emphasis is dispensary / regulated retail operations
   only; healthcare / HIPAA / patient / clinical / insurance / medical
   billing terminology is asserted absent by test.

## Files changed

- `src/components/admin/IndustryEmphasisPanel.tsx` (new)
- `src/components/admin/IndustryAssignmentField.tsx` (classifier suggestion + source-of-truth)
- `src/pages/admin/DiagnosticInterviewDetail.tsx`
- `src/pages/admin/ReportDraftDetail.tsx`
- `src/pages/admin/ImplementationRoadmapAdmin.tsx`
- `src/pages/admin/RgsControlSystemAdmin.tsx`
- `src/pages/admin/RevenueRiskMonitorAdmin.tsx`
- `src/lib/__tests__/industryEmphasisConsumption.test.ts` (new)

## Classification (delta only)

| Area | Previous | After this pass |
|------|----------|-----------------|
| Admin industry classification workflow | mostly ready (no inferred suggestion in UI) | launch-ready |
| Industry-adjusted interpretation consumption | framework-only (exported, not consumed) | launch-ready |

All other classifications from
`docs/rgs-framework-vs-launch-ready-audit.md` remain valid.

## Confirmations

- Base deterministic 0–1000 Stability Score is unchanged.
- Admin-confirmed industry cannot be silently overwritten.
- Classifier never produces a healthcare vertical; "medical" alone routes
  to General + needs admin review.
- Cannabis / MMJ / MMC remains dispensary / regulated retail operations
  only — no HIPAA / patient / clinical / insurance / medical-billing
  drift.
- `IndustryEmphasisPanel` is admin-only; the client portal shell does
  not import it (asserted by test).
- Role / access / RLS / tenant isolation, `ProtectedRoute requireRole=admin`,
  ClientToolGuard, payment / invite / access gates, `report_drafts`,
  `tool_report_artifacts`, `StoredToolReportsPanel`, private tool-reports
  bucket, and signed URL behavior are all preserved.
- No frontend secrets introduced.
- No admin-only notes exposed to clients.