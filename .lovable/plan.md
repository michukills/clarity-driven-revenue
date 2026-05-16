# P98 — Remotion Video Engine Phase 1 (Campaign Control)

Honest, approval-gated video workflow inside the existing Campaign Control system. No fake render, no fake posting, no duplicate engines.

## Scope (in)

1. New durable data model for video projects, scene plans, render jobs, reviews — RLS-protected, tenant-bound.
2. Status machine extension (separate module) for the video lifecycle: `not_started → outline_draft → scene_plan_ready → render_queued → render_in_progress → render_draft_ready | render_failed | render_setup_required → needs_revision → approved → ready_for_manual_export → manual_publish_ready → archived`.
3. Eligibility gate: only campaign assets at `approval_status = 'approved'` can start a video project.
4. AI-assisted outline + Remotion-ready scene plan via existing `campaignAiBrain` patterns (no new brain) + AI Confidence Kernel — every output carries `confidence_level`, `confidence_reason`, `missing_inputs[]`, `risk_warnings[]`.
5. Honest render: Phase 1 ships **render_setup_required** as the default state (no Remotion runner is wired in the sandbox/edge today). Schema + UI + audit are ready; flipping to real render is a single switch when the runner is provisioned. No fake files, no fake thumbnails, no fake download buttons.
6. Admin UI: new "Campaign Video" panel inside `src/pages/admin/CampaignControl.tsx` for the selected approved asset — outline view, scene plan view, status, review actions, approval, manual-publish-ready toggle.
7. Portal UI: read-only mirror inside `src/pages/portal/tools/CampaignControl.tsx` showing approved video assets + their manual-publish-ready state. No admin notes, no raw prompts, no internal metadata.
8. Audit logging via existing `logCampaignAuditEvent` (extend `CampaignAuditAction` union with video actions).
9. Tests: status machine, eligibility, copy/no-fake guards, AI confidence shape, audit hooks, portal scope boundary, public funnel non-regression.

## Scope (out — explicitly not in P98)

Auto/fake posting, scheduling, analytics, paid ads, real platform integrations, learning loop, performance engine, report generator framework, duplicate Campaign Control engine, duplicate AI brain, public funnel changes, scorecard route changes.

## Data model (new tables, RLS-protected, tenant-bound)

- `campaign_video_projects` — one per (campaign_asset_id, attempt). Stores outline JSON, scene plan JSON, current `video_status`, `approval_status` (`draft|needs_review|approved|rejected|archived`), `manual_publish_status` (`not_ready|ready_for_manual_export|manual_publish_ready|archived`), AI confidence fields, missing_inputs, risk_warnings, created_by, reviewed_by, approved_by, timestamps.
- `campaign_video_render_jobs` — render attempts per project. `status` in (`queued|in_progress|draft_ready|failed|setup_required`), `output_storage_path` (nullable), `error_message`, timestamps.
- `campaign_video_reviews` — append-only review/decision log per project: actor, action (`request_revision|approve|reject|archive|mark_ready_for_export|mark_manual_publish_ready`), prior/new statuses, notes.
- Storage bucket `campaign-video-assets` (private). No public reads. Signed URLs only — but Phase 1 does not write files yet; bucket + policies prepared.

All tables: workspace-scoped (`customer_id` + `workspace_scope`) consistent with existing campaign tables. RLS: admin-all, customer can SELECT their own where `workspace_scope='customer'`. No inserts/updates from client.

## Status machine (new module)

`src/lib/campaignControl/campaignVideoStatusMachine.ts` — pure functions. Deny codes for: `asset_not_approved`, `outline_required`, `scene_plan_required`, `render_not_ready`, `not_approved_cannot_publish_ready`, `terminal_archived`, `invalid_transition`. AI cannot drive `approve` — `approve` requires an actor user id.

## AI generation

`src/lib/campaignControl/campaignVideoBrain.ts` — wraps existing `campaignAiBrain` to produce two structured outputs:
- `generateVideoOutline(context) → { title, objective, audience, hook, scenes_summary, cta, risk_notes, missing_inputs, confidence_level, confidence_reason }`
- `generateRemotionScenePlan(outline, context) → { format, aspect_ratio, duration_seconds_range, scenes: [{ on_screen_text, voiceover, visual_direction, motion, transition_in, assets_needed }], cta_scene, captions, accessibility, brand_style, claim_safety_notes, confidence_level, confidence_reason, missing_inputs[], risk_warnings[], human_review_checklist[] }`

No new edge function this pass — generation runs through the existing `generate-campaign-assets` pattern, extended with two new `mode` values: `video_outline` and `video_scene_plan`. (If extending that function risks regressions, add a sibling `generate-campaign-video` function — decided during implementation after reading the existing function.)

## Audit actions added

`video_project_created`, `video_outline_generated`, `video_scene_plan_generated`, `video_render_requested`, `video_render_succeeded`, `video_render_failed`, `video_render_setup_required`, `video_revision_requested`, `video_approved`, `video_rejected`, `video_archived`, `video_marked_ready_for_export`, `video_manual_publish_ready_marked`, `video_exported`.

## UI surface

- Admin `CampaignControl.tsx`: add a collapsible "Campaign Video" section per asset row (only visible/enabled when asset is `approved`). Shows status badge, outline preview, scene plan preview, "Generate outline / Generate scene plan / Request render / Request revision / Approve / Mark ready for manual export / Mark manual publish-ready / Archive" actions wired through the new status machine + audit.
- Portal `CampaignControl.tsx`: read-only "Approved Campaign Videos" card listing approved video assets and their manual-publish-ready state with the copy: "Ready for manual upload. RGS does not post to any platform in this phase."
- Disabled-state copy when ineligible: "Video drafting is available after this campaign asset is approved." Never "Something went wrong."

## Tests

- `campaignVideoStatusMachine.test.ts` — full transition matrix incl. deny codes.
- `campaignVideoEligibility.test.ts` — only approved assets can start.
- `campaignVideoNoFakePosting.test.ts` — UI source-text scan: no "Published / Scheduled / Posted / Live / Auto-posted / Performance tracked / Guaranteed / Viral / 10x" copy in admin or portal video panels.
- `campaignVideoAiContract.test.ts` — outline + scene-plan outputs include `confidence_level`, `confidence_reason`, `missing_inputs`, `risk_warnings`; AI cannot mark `approved`.
- `campaignVideoPortalScope.test.ts` — portal video panel does not import admin-only helpers and does not render admin notes / raw prompts.
- `campaignVideoAuditWiring.test.ts` — admin action handlers call `logCampaignAuditEvent` with the right action.
- `publicFunnelNonRegression.test.ts` — existing tests must stay green (no new file needed; just verify).

## Files

New:
- `supabase/migrations/<ts>_campaign_video_engine_phase1.sql`
- `src/lib/campaignControl/campaignVideoStatusMachine.ts`
- `src/lib/campaignControl/campaignVideoBrain.ts`
- `src/lib/campaignControl/campaignVideoData.ts` (DB read/write helpers)
- `src/components/campaignControl/CampaignVideoPanel.tsx` (admin)
- `src/components/campaignControl/CampaignVideoPortalCard.tsx` (portal, read-only)
- 6 test files above

Edited:
- `src/lib/campaignControl/campaignAudit.ts` — extend `CampaignAuditAction` union.
- `src/pages/admin/CampaignControl.tsx` — mount `CampaignVideoPanel` per approved asset.
- `src/pages/portal/tools/CampaignControl.tsx` — mount `CampaignVideoPortalCard`.
- `src/integrations/supabase/types.ts` — append new table types (Lovable regenerates after migration).

## Honest limitations called out in UI + final report

- No Remotion runner is wired in this phase → default render state is `render_setup_required`. UI says: "Rendering setup required. Outline + scene plan are ready for human review."
- No platform publishing, scheduling, analytics, or paid ads.
- Manual publish-ready ≠ posted/live/scheduled.

## Risk prevented

No fake renders, no fake downloads, no duplicate engine, no duplicate brain, no public funnel regression, no admin-note leakage, no cross-tenant access, no claim-safety drift.

## Risk remaining

Real Remotion render execution (sandbox/edge function) is not provisioned in Phase 1 — schema + workflow are ready for it. Storage bucket exists but is unused until the render runner lands.

---

# (Prior) P97 — Campaign Control Phase 1: Gap-Closure Plan

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
