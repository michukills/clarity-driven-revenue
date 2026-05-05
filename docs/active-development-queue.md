# RGS Active Development Queue

Last updated: 2026-04-29

This queue keeps security, launch readiness, industry correctness, and conversion work in one place. Do not remove queued work unless it has been verified live or intentionally cancelled.

## Active Now

### P37 - Natural-Language Scorecard Hardening

Status: in progress

Scope:
- Keep the customer experience as typed natural-language answers, not numeric self-ratings.
- Score answers with the deterministic RGS rubric so every score can be reproduced and audited.
- Look for concrete evidence: cadence, ownership, systems, numbers, tools, review rhythm, and breakpoints.
- Keep Gemini/Lovable AI out of the public scoring path. AI may assist admin interpretation/report drafting after submission.

Verification:
- Public scorecard asks for written operating reality, not 1-10 rankings.
- Scorecard rubric version identifies natural-language evidence scoring.
- Detailed evidence-rich typed answers score higher than vague numeric self-ratings.
- Weak/contradictory typed answers do not inflate confidence.

### P18.1 - Gemini / Lovable AI Launch Readiness

Status: patched; needs deploy/live smoke test

Scope:
- Confirm where AI is enabled for scorecard, diagnostic, report drafting, and admin helper flows.
- Keep public scorecard and diagnostic scoring deterministic.
- Make clear that AI assists interpretation/report drafting; AI does not directly assign final 0-1000 scores.
- Keep AI calls admin-triggered and backend-only.
- Show admin AI readiness, active model, usage signal, credit/balance issue signal, and setup/top-up path.
- Allow model changes through `RGS_AI_MODEL` instead of hardcoding one model in every function.

Verification:
- `ai-readiness-status` is JWT-protected and admin-only.
- Admin dashboard shows whether `LOVABLE_API_KEY` is configured.
- Admin dashboard shows current model and whether default/override is active.
- Admin dashboard shows recent AI run count, last error, and credit-exhausted signal.
- Report AI assist writes to `ai_run_logs`.
- No public route calls AI directly.
- Admin dashboard explicitly identifies deterministic scoring as the source of truth.

Manual setup:
- Add `LOVABLE_API_KEY` in Supabase Edge Function secrets.
- Optional: set `RGS_AI_MODEL` to a supported Lovable AI Gateway model.
- Keep Lovable Cloud & AI balance funded.
- Run one admin report-assist smoke test before selling a Fiverr diagnostic.

## Next Security / Hardening

### P14 - Supabase Security Advisor Closure

Status: blocked pending production Supabase project confirmation

Scope:
- Re-run Lovable and Supabase security scanners after migrations are applied.
- Confirm QuickBooks tables have RLS enabled.
- Confirm QuickBooks token columns are not exposed in public tables.
- Confirm `business_health_snapshots` clients cannot read/write admin-only fields.
- Confirm unsafe `SECURITY DEFINER` execute grants are revoked.

Verification:
- Supabase Security Advisor returns 0 critical errors for:
  - `quickbooks_connections`
  - `quickbooks_webhook_events`
  - `quickbooks_sync_jobs`
  - `business_health_snapshots`
  - public/authenticated `SECURITY DEFINER` execute permissions
- Anonymous users cannot execute sensitive functions.
- Authenticated non-admin users cannot execute admin/security functions.

Current blocker:
- The published site bundle points to Supabase project `ryetluoijeklyyyxdgqh`, but the visible Supabase Advisor screenshot is for project `gvxzkucgxkjdketjgbvw`. Do not apply production SQL until the intended production Supabase project is confirmed.

### P32.2 - Industry Assignment And Intake Closure

Status: partially implemented; needs final verification

Scope:
- Scorecard intake must capture enough data to route industry review.
- Customer profile must provide direct admin industry assignment, confirmation, review notes, and needs-review state.
- Possible industry mismatch must surface with a direct fix path.
- Industry-specific tools must remain restricted until industry and snapshot are admin-verified.

Verification:
- New scorecard intake fields save to `scorecard_runs`.
- Lead/customer creation or update carries industry-intake data into customer review fields.
- Admin can confirm, change, or mark industry needs review.
- Changing a verified industry resets snapshot verification.
- Industry-specific tools stay gated until confirmation and snapshot verification.

### P33 - Account Classification And Admin Preview

Status: pushed; needs live verification

Scope:
- Revenue & Growth Systems internal account must always be `internal_admin`.
- Internal admin account must not appear in client pipeline flow.
- Demo/showcase/test accounts must be clearly labeled.
- Admin should have admin view by default and an intentional client-view preview switch.

Verification:
- RGS internal account is excluded from pipeline cards.
- Demo/test accounts display `Demo` or `Test` labels.
- Admin can intentionally enter client preview without losing admin access.

## Industry Tool Coverage

### P34 - Industry-Specific Tools And Metrics Audit

Status: patched; needs live verification

Scope:
- Provide an admin view that clearly lists tools by industry and package.
- Verify each industry has appropriate independent variables and metrics.
- Separate diagnostic-only, implementation, full bundle, and Revenue Control System availability.
- Highlight gaps where an industry has insufficient tools or tracked metrics.

Verification:
- Admin can view tools grouped by industry.
- Admin can view metrics tracked per industry.
- Each active industry has a minimum viable metric set.
- Package rules are visible and auditable.
- Client-visible tool access matches industry + package + admin grants.
- `/admin/tool-matrix` shows Diagnostic, Implementation, and Revenue Control coverage per industry and highlights missing tool gaps.

## Launch / Conversion

### P17 - Site Conversion And Positioning Update

Status: queued after security and AI readiness

Scope:
- Update homepage hero:
  - Headline: "Your Business Isn't Broken. Your Systems Are."
  - Supporting copy: "RGS identifies revenue leaks, process breakdowns, and stability issues - then builds the repair roadmap."
  - CTA: "See How Stable Your Business Really Is (0-1000)"
- Make the 0-1000 Business Scorecard the primary conversion path.
- Clarify offer structure:
  - Diagnostic - $3,000 - Find what's broken
  - Implementation - $10,000 - Fix the system
  - Revenue Control System(TM) - $1,000/month - Keep it from breaking again
- Position Revenue Control System(TM) as post-implementation only.
- Add/refine "How RGS Works" five-step section.
- Add trust/security statement.
- Validate footer links and CTAs.

Do not change:
- Core brand
- Colors
- Pricing amounts
- Backend/database/security logic

Verification:
- CTA appears in hero, mid-page, footer, and sticky CTA.
- Sticky CTA is suppressed on scorecard/results pages.
- Sticky CTA is also hidden whenever a primary on-page Scorecard CTA is visible, so visitors never see two competing Scorecard CTAs at once.
- `$1,000/month` appears only in post-implementation context.
- Avoid forbidden language: support, help desk, maintenance plan, unlimited, done-for-you, guaranteed growth.
- Footer includes Privacy Policy, End User License Agreement, contact email, Scorecard CTA, and social links.

## Fiverr Launch Smoke Test

### P35 - Paid Diagnostic Readiness Drill

Status: queued

Scope:
- Simulate a Fiverr buyer journey from scorecard submission through admin report prep.
- Confirm deterministic scorecard works without AI cost.
- Confirm admin can generate or open report draft.
- Confirm AI assist can run when `LOVABLE_API_KEY` and balance are configured.
- Confirm AI output remains admin-only until reviewed.

Verification:
- Submit test scorecard.
- Confirm lead/admin record exists.
- Confirm industry intake requires review and does not auto-confirm.
- Create or locate report draft.
- Run report AI assist.
- Confirm `ai_run_logs` has model, status, tokens if returned, and no secret values.
- Confirm client cannot see AI draft internals.

### P36 - Optional AI-Guided Diagnostic Interviewer

Status: queued for later, after security and launch smoke test

Scope:
- Add a conversational AI interviewer for diagnostic Q&A only if launch operations need it.
- AI may ask adaptive follow-up questions, but final scoring should still be produced by the deterministic rubric.
- Persist every AI question, client answer, and model metadata for audit.
- Keep cost controls, rate limits, and admin review.

Verification:
- AI interviewer cannot expose internal scoring formulas.
- Final score can be reproduced from stored answers without model access.
- Admin can review and override before anything client-facing is published.
- Credit/balance errors fall back to the existing deterministic intake.

## Ongoing Hardening Follow-ups

- Rotate/revoke any exposed GitHub token after this work session.
- Refresh Supabase Security Advisor after every pushed migration.
- Refresh Lovable Security Scan after every publish.
- Confirm all Edge Functions that are admin-only have `verify_jwt = true` and call `requireAdmin`.
- Confirm no service-role key appears in frontend code.
- Confirm no OAuth token values are selected, displayed, logged, or returned to browser payloads.
- Confirm all `target="_blank"` links have `rel="noopener noreferrer"`.
- Confirm public forms have duplicate-submit and rate-limit protection.
- Confirm AI errors fail closed into deterministic/manual workflows.
