# P65 — Diagnostic + Implementation Report Generator Tiering

The RGS report generator now distinguishes between five report tiers so that
the Full RGS Business Stability Diagnostic Report, the three Fiverr diagnostic offers, and the
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
  server-side, and reads `report_type` as a string. AI drafts remain
  admin-reviewed and never auto-publish.
- **Tool report storage reused.** Diagnostic PDFs download locally from the
  admin surface. Tool-specific PDFs use the private `tool-reports` bucket,
  signed URLs, and the approval gate from P70.

## Allowed report types

The `report_drafts.report_type` CHECK constraint accepts:

| key | label | public offer name |
|---|---|---|
| `full_rgs_diagnostic` | Full RGS Business Stability Diagnostic Report | Full RGS Business Stability Diagnostic Report |
| `fiverr_basic_diagnostic` | Business Health Check Report | Business Health Check |
| `fiverr_standard_diagnostic` | Business Systems Diagnostic Report | Business Systems Diagnostic Report |
| `fiverr_premium_diagnostic` | Priority Repair Roadmap Report | Priority Repair Roadmap Report |
| `implementation_report` | Implementation Report / Roadmap | Implementation Report / Roadmap |
| `diagnostic`, `scorecard`, `rcc_summary`, `implementation_update` | legacy types preserved for back-compat | — |

The single source of truth for tier metadata (sections, depth, exclusions,
scope boundary, disclaimer, includes-flagship-scorecard, etc.) lives in
`src/lib/reports/reportTypeTemplates.ts`.

## Tier rules

- **Full RGS Business Stability Diagnostic Report** — flagship. Includes the full 0–1000 Business
  Stability Scorecard, full five-gear analysis, RGS Stability Snapshot,
  Worn Tooth Signals, Reality Check Flags, Cost of Friction findings where
  applicable, Priority Repair Map, implementation readiness notes, and
  clarification boundary language. Approximately 20–40+ pages.
- **Business Health Check Report** — Basic Fiverr / standalone tier. Includes
  a quick stability score, high-level gear summary, 3–5 weak points, short
  RGS Stability Snapshot, and basic next steps. Approximately 3–5 pages.
- **Business Systems Diagnostic Report** — Standard Fiverr / standalone tier.
  Includes the 0–1000 score breakdown, gear-by-gear explanation, top system
  leaks, top 3 priorities, RGS Stability Snapshot, and basic repair
  recommendations.
- **Priority Repair Roadmap Report** — Premium Fiverr / standalone tier.
  Includes full diagnostic summary, RGS Stability Snapshot, root-cause notes,
  revenue/time/operational leak analysis where safe, Priority Repair Roadmap,
  Quick Wins, Big Rocks, Fillers, De-Prioritize, sequence, risks, and evidence
  gaps. Critically: it does **not** equal the Full RGS Business Stability
  Diagnostic Report unless the admin explicitly selects `full_rgs_diagnostic`.
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
6. Filenames use exact report type + client/business label + date, for
   example `Business_Health_Check_Report_ClientName_2026-05-07.pdf`.

## AI first-draft behavior

- AI assist runs only via the `report-ai-assist` edge function, server-side,
  with no frontend secrets.
- AI output stays as `ai_status` / draft sections; admin must mark sections
  `client_safe` and approve before any export.
- AI is never used to publish or to override deterministic scoring.
- Tier-specific AI prompt rules mirror the same report names and scope
  boundaries. AI remains review assist only.

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
- Stored PDFs for non-tool diagnostic drafts remain local-download only.
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
