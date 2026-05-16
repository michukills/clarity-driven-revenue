# P97 — Campaign Control Phase 1: Gap-Closure Plan

A large Campaign Control system already exists in the repo and meets most of the Phase 1 spec. This plan closes the real gaps **without rewriting working code** and without expanding scope into Remotion, social publishing, or platform APIs.

## What already exists (preserve, do not duplicate)

- **Schema** (`supabase/migrations/20260514120000_campaign_control_core.sql`, 1015 lines):
  `campaign_profiles`, `campaign_briefs`, `campaign_assets`, `campaign_connection_proofs`, `campaign_learning` — all with RLS, workspace scoping (`customer` vs `rgs_internal`), and check constraints on status / approval / publishing / safety fields.
- **Lib** (`src/lib/campaignControl/*.ts`): typed engine, AI brain contract (allowed/forbidden actions, output schema, v1 version pin), deterministic safety checker, signal/SWOT consumers, data access layer.
- **UI**: `src/pages/admin/CampaignControl.tsx` (686 LOC) and `src/pages/portal/tools/CampaignControl.tsx` (293 LOC), routed and guarded by `ClientToolGuard`.
- **Edge function**: `generate-campaign-assets` (357 LOC) — drives AI brief / asset generation.
- **Tests**: `campaignAiBrain`, `campaignBrainContract`, `campaignControlEngine`, `campaignControlSecurityContract`, `campaignSafety`.

## Real gaps vs. the P97 spec

| # | Gap | Action |
|---|---|---|
| 1 | No `archived` approval state on assets; brief lacks `archived` too | Migration: extend `campaign_assets_approval_chk` to include `archived`; extend `campaign_briefs_status_chk` similarly. |
| 2 | No explicit `ready_to_publish` / `manually_posted` approval gating helper — fields exist (`publishing_status`) but rules aren't centralized | Add `transitionCampaignAssetStatus` / `transitionCampaignBriefStatus` pure functions in engine that enforce the spec's transition matrix; wire them from admin UI mutations. |
| 3 | No deterministic transition tests | New `campaignStatusTransitions.test.ts`: blocked-claim assets cannot reach `approved`; only `approved` → `ready_to_publish` (manual readiness); only `approved` or `ready_to_publish` → `manually_posted`; `rejected`/`archived` cannot publish; AI-generated never auto-approves. |
| 4 | No audit log for campaign actions | Migration: `campaign_audit_events` table (tenant + customer + brief/asset id + action + actor + payload + timestamp), RLS admin-all. Write helper `logCampaignAuditEvent` invoked from brief/asset mutation paths. |
| 5 | "No fake posting" guard not test-pinned | Add UI source-text test asserting admin/portal Campaign Control pages never render "Published to Facebook/LinkedIn/Instagram/X", "Scheduled to …", "Auto-posted", and that the only allowed posting copy is the honest set (`Ready for manual publishing`, `Scheduling integration not connected yet`, etc.). |
| 6 | Portal page must not unlock anything beyond scoped deliverables | Add contract test verifying portal Campaign Control imports do not reference Diagnostic/Implementation/Control System unlock helpers. |

## Out of scope (explicitly NOT in this pass)

- Remotion, video rendering
- Real social/platform API posting or scheduling
- New AI brain (reuse `campaignAiBrain` + Confidence Kernel)
- Public funnel changes
- Scorecard architecture changes
- Duplicate tables / parallel engines

## Migrations (minimal)

1. `ALTER TABLE campaign_assets` — drop+recreate approval check including `archived`.
2. `ALTER TABLE campaign_briefs` — status check already covers most values; add `archived` if missing.
3. `CREATE TABLE campaign_audit_events` with RLS admin-all and indexes on `(customer_id, created_at desc)` and `(campaign_brief_id)`.

## Files to add / edit

- `supabase/migrations/<ts>_campaign_control_p97_gaps.sql` (new)
- `src/lib/campaignControl/campaignStatusMachine.ts` (new — pure functions)
- `src/lib/campaignControl/campaignAudit.ts` (new — insert helper)
- `src/lib/campaignControl/campaignControlData.ts` (wire audit + transitions)
- `src/pages/admin/CampaignControl.tsx` (use transition helpers; add Archive + Mark ready-to-publish + Mark manually-posted controls if missing; honest posting copy)
- `src/lib/__tests__/campaignStatusTransitions.test.ts` (new)
- `src/lib/__tests__/campaignControlNoFakePosting.test.ts` (new)
- `src/lib/__tests__/campaignPortalScopeBoundary.test.ts` (new)

## Validation

- `tsc` typecheck
- All existing `campaign*.test.ts` suites still green
- New transition + no-fake-posting + portal-scope tests green
- Migration applied cleanly; RLS verified

## Risk prevented

- No duplicate tables, no second AI brain, no scope creep into Remotion/social APIs, no scorecard funnel regressions, no fake posting language slipping in.

## Risk remaining (after pass)

- Real platform connectors still absent (intentional — Phase 1 boundary).
- Audit dashboards UI not built yet; events are written + queryable, surfaced minimally.
- Video outlines remain text only until Remotion phase.
