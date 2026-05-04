# P65 — Diagnostic + Implementation Report Generator Tiering

The RGS report generator now distinguishes between five report tiers so that
the Full RGS Diagnostic, the three Fiverr diagnostic offers, and the
Implementation Report each carry the right depth, sections, exclusions, and
scope language without bleeding into each other.

## Audit summary

- **Reused, not duplicated.** The existing `report_drafts` table and admin
  report builder (`/admin/report-drafts`, `ReportDraftDetail.tsx`) already
  implemented draft → review → approve workflow, RLS-admin-only access, AI
  assist via the `report-ai-assist` edge function, jsPDF export, and
  client-safe section gating. P65 extends this rather than create a parallel
  `rgs_generated_reports` system.
- **Stability snapshot reused.** P20.18–P20.20 already produces the RGS
  Stability Snapshot inside `draft_sections`, with the client-facing label
  hard-coded as "RGS Stability Snapshot". P65 does not weaken or rename it.
- **PDF export reused.** `ReportDraftDetail.downloadPdf` already filters by
  `s.client_safe === true`, gates the snapshot through
  `appendStabilitySnapshotIfClientReady`, and appends the standard
  service-boundary disclaimer. P65 layers a tier-specific scope boundary +
  professional review disclaimer on top.
- **AI assist reused.** `supabase/functions/report-ai-assist` is admin-only,
  server-side, and reads `report_type` as a string — no edge function changes
  needed. AI drafts remain admin-reviewed and never auto-publish.
- **No new storage bucket.** Generated PDFs are downloaded locally from the
  admin surface. Bucket-based PDF archival is intentionally deferred.

## Allowed report types

The `report_drafts.report_type` CHECK constraint accepts:

| key | label | public offer name |
|---|---|---|
| `full_rgs_diagnostic` | Full RGS Diagnostic Report | Full RGS Diagnostic |
| `fiverr_basic_diagnostic` | Fiverr Basic Diagnostic | Business Revenue Leak Snapshot |
| `fiverr_standard_diagnostic` | Fiverr Standard Diagnostic | Business Revenue & Operations Diagnostic |
| `fiverr_premium_diagnostic` | Fiverr Premium Diagnostic | Business Stability Diagnostic & Revenue Repair Map |
| `implementation_report` | Implementation Report / Roadmap | Implementation Report / Roadmap |
| `diagnostic`, `scorecard`, `rcc_summary`, `implementation_update` | legacy types preserved for back-compat | — |

The single source of truth for tier metadata (sections, depth, exclusions,
scope boundary, disclaimer, includes-flagship-scorecard, etc.) lives in
`src/lib/reports/reportTypeTemplates.ts`.

## Tier rules

- **Full RGS Diagnostic** — flagship. Includes the full 0–1000 Business
  Stability Scorecard, full five-gear analysis, RGS Stability Snapshot,
  Priority Repair Map, implementation readiness notes, and clarification
  window terms. Approximately 20–40+ pages.
- **Fiverr Basic — Business Revenue Leak Snapshot** — bounded snapshot.
  Excludes the full scorecard, full five-gear scoring, implementation, SOPs,
  software/dashboard build, and ongoing advisory. Approximately 3–5 pages.
- **Fiverr Standard — Business Revenue & Operations Diagnostic** — moderate
  diagnostic. Includes Priority Repair Map Lite and 30-day actions. Excludes
  the full 0–1000 scorecard and the full implementation roadmap.
- **Fiverr Premium — Business Stability Diagnostic & Revenue Repair Map** —
  premium Fiverr diagnostic. Includes RGS Stability Snapshot, Priority
  Repair Map, and 30 / 60 / 90 day roadmap. Critically: it does **not**
  equal the Full RGS Diagnostic unless the admin explicitly selects
  `full_rgs_diagnostic`.
- **Implementation Report / Roadmap** — project-based system installation
  planning. Excludes indefinite/unlimited support, RGS operating the
  business, and any legal/tax/compliance advice.

## Routes

- `/admin/report-drafts` (existing) — list and create drafts.
- `/admin/report-drafts/:id` (existing) — edit, AI assist, approve, export.
- `/admin/customers/:customerId/reports` (P65, new) — convenience alias that
  redirects to the builder with the customer preselected. Both routes use
  `ProtectedRoute requireRole="admin"`.

## Access rules

- Admins manage all drafts via the existing `is_admin(auth.uid())` policy on
  `report_drafts`.
- Clients have no direct read on `report_drafts`. Client-visible reports
  flow through `business_control_reports` (P34 client-safe allowlist
  enforced), so P65 does not alter the client surface.
- Internal `admin_notes`, `evidence_used` (admin-only section), AI metadata,
  and any non-`client_safe` sections never enter the PDF export path.

## PDF export behavior

The PDF export in `ReportDraftDetail.downloadPdf`:

1. Includes only sections where `client_safe === true`.
2. Gates the RGS Stability Snapshot via `appendStabilitySnapshotIfClientReady`.
3. Appends a tier-specific **Scope Boundary** + exclusions list.
4. Appends the **Professional Review Disclaimer** for the tier.
5. Appends the standard service-boundary disclaimer (point-in-time,
   not legal/tax/HR/compliance advice, owner keeps final decision authority).
6. Filenames are derived from the title only — no IDs, emails, or notes leak.

## AI first-draft behavior

- AI assist runs only via the `report-ai-assist` edge function, server-side,
  with no frontend secrets.
- AI output stays as `ai_status` / draft sections; admin must mark sections
  `client_safe` and approve before any export.
- AI is never used to publish or to override deterministic scoring.
- Tier-specific AI prompt tightening (e.g. enforcing Fiverr Basic depth) is
  scaffolded but **deferred to the AI Assist Wiring Pass**.

## RGS Stability Snapshot language guard

Client-facing label is always **"RGS Stability Snapshot"**. The string
"SWOT" / "SWOT Analysis" never appears in client-visible content or the
PDF — enforced by `src/lib/reports/draftEngine.ts` and verified by the P65
contract test.

## Industry note

"MMJ / cannabis" tiers continue to be treated as cannabis/dispensary
operations, not healthcare. Reports avoid HIPAA, patient-care, and
healthcare-compliance framing. Cannabis findings use language like
"compliance-sensitive" and "review with qualified counsel where required".

## Deferred items

- AI drafting tightened to per-tier depth (defer to AI Assist Wiring Pass).
- Live multi-source automatic data pulling per tier.
- Automatic implementation report generation from implementation data.
- PDF storage in a dedicated Supabase Storage bucket with signed URLs.
- Report version supersede chain (current version = jsonb / draft chain only).
- Electronic signature, payment checkout, email delivery, client report
  portal for direct draft viewing, Fiverr API integration, Word/Google Docs
  export.

## Banned wording

The contract test scans P65 files for banned scope-creep and fake-proof
wording. The full list lives in
`src/lib/__tests__/reportGeneratorTieringContract.test.ts` and includes the
usual suspects: open-ended support claims, outcome guarantees, framing that
RGS operates the business, healthcare framing, and unsupported social-proof
language. The same scan also blocks the client-facing string for the
SWOT-style section name (the only allowed client-facing label is
"RGS Stability Snapshot").