# P95 Campaign Control Deployment Verification

Status labels:
- Code-complete means repo tests passed.
- Deployment verification pending means Lovable/Supabase production has not been proven.
- Live-proven means the deployed Lovable app and production Supabase state were directly verified.

## 1. Lovable Deployment Checks

- Confirm Lovable is serving the commit that contains `src/pages/admin/CampaignControl.tsx`, `src/pages/portal/tools/CampaignControl.tsx`, and `src/pages/admin/RgsMarketingControl.tsx`.
- Confirm production bundle includes the portal route `/portal/tools/campaign-control`.
- Confirm production bundle includes admin routes:
  - `/admin/campaign-control`
  - `/admin/customers/:customerId/campaign-control`
  - `/admin/rgs-marketing-control`
- Do not mark live-proven from local build output alone.

## 2. Supabase Migration Checks

Apply and verify:

- `supabase/migrations/20260514120000_campaign_control_core.sql`

Verify production tables exist:

- `campaign_profiles`
- `campaign_briefs`
- `campaign_assets`
- `campaign_connection_proofs`
- `campaign_events`
- `campaign_performance`
- `campaign_learning_summaries`

Verify RPCs exist:

- `get_client_campaign_control(uuid)`
- `upsert_client_campaign_profile_inputs(uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb)`
- `campaign_assert_connection_proof(uuid, text, uuid, text)`

## 3. RLS Policy Checks

- Confirm all campaign tables have RLS enabled.
- Confirm admin can manage customer campaign records.
- Confirm clients cannot directly read admin-only rows.
- Confirm client route reads through `get_client_campaign_control`.
- Confirm client input writes go through `upsert_client_campaign_profile_inputs`.
- Confirm RGS internal workspace rows use `workspace_scope = 'rgs_internal'`, `customer_id is null`, and are not returned by client RPCs.

## 4. Route And Navigation Checks

- Admin can open `/admin/campaign-control`.
- Admin can open `/admin/customers/<customer_id>/campaign-control`.
- Admin can open `/admin/rgs-marketing-control`.
- Client with active RGS Control System / Revenue Control Center access can open `/portal/tools/campaign-control`.
- Client without access is blocked by `ClientToolGuard`.

## 5. Admin Campaign Control Smoke Test

Use a demo/test customer.

- Select customer.
- Save campaign profile.
- Confirm scope mode can be full RGS client, standalone/gig, or demo/test.
- Confirm recommendation appears.
- Confirm brief can be created.
- Confirm asset generation calls `generate-campaign-assets`.
- Confirm missing AI config falls back honestly to rules-based drafts and does not fake AI.
- Confirm generated assets are draft/needs review, not approved.
- Run safety review.
- Approve an asset only after review.
- Mark manual posting status only through manual posting controls.

## 6. Client Campaign Control Smoke Test

- Open as client with the Control Center lane active.
- Confirm only approved/client-visible briefs and assets appear.
- Confirm admin-only rationale and admin notes do not appear.
- Submit campaign inputs.
- Confirm inputs are stored for RGS review.
- Confirm client cannot generate AI assets, approve admin drafts, or mark posted via integration.

## 7. SWOT Signal Smoke Test

- Create/approve SWOT Strategic Matrix.
- Confirm `swot_signals` rows exist for campaign, persona, repair, and implementation signal types where applicable.
- Confirm Campaign Control recommendation references approved campaign/persona SWOT signals.
- Confirm Repair Priority Matrix shows read-only approved SWOT signals.
- Confirm Implementation Roadmap admin shows read-only approved SWOT signals.
- Confirm draft/unapproved SWOT signals do not appear.

## 8. Manual Posting Workflow Smoke Test

- Confirm default publishing status is manual-only unless connection proof exists.
- Copy approved asset content.
- Mark asset ready for manual post.
- Mark manually posted only after manual action.
- Record posted URL if available.
- Confirm no auto-posting is implied.

## 9. Analytics / GA4 Honesty Check

- Confirm no GA4 data source can be recorded unless verified connection proof exists.
- Confirm manual performance entry works without GA4.
- Confirm UI says manual tracking when connection proof is absent.
- Confirm no live sync claim appears without proof.

## 10. Frontend Secret Check

- Search production bundle and source for:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `LOVABLE_API_KEY`
  - `RESEND_API_KEY`
  - `OPENAI_API_KEY`
  - `ANTHROPIC_API_KEY`
  - `GEMINI_API_KEY`
- Secret names may appear in admin readiness instructions, but real secret values must never appear.

## 11. Legal / Safety Language Check

- Confirm Campaign Control copy does not promise revenue, profit, growth, leads, ROI, valuation, legal, tax, accounting, compliance, fiduciary, or certification outcomes.
- Confirm cannabis/MMJ language stays operational/documentation visibility only.
- Confirm generated assets are safety-checked before approval.

## 12. Client/Admin Leakage Check

- Confirm client RPC output excludes:
  - `admin_notes`
  - `admin_only_rationale`
  - `admin_only_notes`
  - internal connection proof notes
- Confirm client can only see own customer records.
- Confirm demo users cannot see real client records.

## 13. Demo Isolation Check

- Use a demo customer.
- Create profile, brief, draft assets, and manual performance.
- Confirm demo/test labeling remains visible in admin context.
- Confirm no real customer data is mixed into demo Campaign Control output.

## Live-Proven Acceptance

Mark P95 live-proven only after:

- Lovable frontend commit is verified.
- Supabase migration is applied and inspected.
- Edge Function `generate-campaign-assets` is deployed.
- Admin route smoke test passes.
- Client route smoke test passes.
- RLS/client leakage checks pass.
- Manual publishing and analytics honesty checks pass.

