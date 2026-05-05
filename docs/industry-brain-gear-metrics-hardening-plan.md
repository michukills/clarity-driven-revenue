# Industry Brain Preload + Gear Metrics Evidence — Hardening Plan (IB-H Series)

> **Status:** IB-H1 audit & planning only. No production code changed in this
> pass. This doc plans IB-H2 through IB-H6.

## 0. Scope rules preserved

- Deterministic 0–1000 Business Stability Scorecard remains the single source
  of truth for scores. Industry Brain interprets evidence; it does **not**
  score the client.
- All AI is backend/edge-only, admin-reviewed, never frontend-keyed, never
  auto-published to clients, never used for legal / accounting / tax / HR /
  compliance certification.
- Cannabis / MMJ / MMC means **dispensary / cannabis retail / cannabis
  business operations only.** No healthcare, HIPAA, patient care, claims,
  clinical workflow, or healthcare compliance framing — anywhere.
- RGS Control System subscription pricing is **$1,000/month**. No active
  client/public-facing $297/month copy may be reintroduced.
- Diagnostic and Implementation prices are not modified by this series.
- All admin-only fields, notes, and AI drafts stay behind admin RLS and
  `client_visible = false` until explicit admin approval.
- `ProtectedRoute requireRole="admin"`, `ClientToolGuard`, tenant isolation,
  and signed-URL/private bucket patterns for tool reports must be preserved.

---

## 1. Current architecture inventory

### 1.1 Industry Brain — source of truth

- Schema: `public.industry_brain_entries` (admin-only RLS; `is_admin()`
  policy). Enums: `industry_brain_industry_key`,
  `industry_brain_template_type`, `industry_brain_gear`,
  `industry_brain_status`.
- TS surface: `src/lib/industryBrain.ts` (CRUD + label maps).
- Admin route: `/admin/industry-brain` → `src/pages/admin/IndustryBrainAdmin.tsx`.
- Education page: `src/pages/IndustryBrainEducation.tsx`.
- Deterministic per-vertical pattern brains:
  - `src/lib/intelligence/generalBrain.ts`
  - `src/lib/intelligence/industryBrains/{tradesServices,restaurants,retail,medicalMmc,generalMixed}.ts`
  - Router: `src/lib/intelligence/brainRouter.ts`
  - Types: `src/lib/intelligence/types.ts`
  - Data map / tool coverage: `src/lib/intelligence/{dataMap,toolCoverageMap}.ts`
- Existing seed/expansion docs:
  - `docs/industry-brain-enhancements.md` (P63)
  - `docs/rgs-industry-brain-deep-expansion.md`

### 1.2 Scorecard — source of truth

- Deterministic engine: `src/lib/scoring/stabilityScore.ts`,
  `src/lib/scoring/benchmark.ts`, `src/lib/scoring/autoStabilityRescore.ts`.
- Public scorecard data + page: `src/components/scorecard/scorecardData.ts`,
  `src/pages/RevenueScorecard.tsx`.
- Portal scorecard / history: `src/pages/portal/Scorecard.tsx`,
  `src/pages/portal/tools/ScorecardHistory.tsx`,
  `src/pages/admin/ScorecardHistoryAdmin.tsx`.
- Lead capture: `src/pages/admin/ScorecardLeads.tsx`.
- 5 gears × 200 pts = 1000 total. Bands:
  Critical Failure / Slipping / Optimized.

### 1.3 Diagnostic tools

- Owner Diagnostic Interview: `src/pages/portal/tools/OwnerDiagnosticInterview.tsx`,
  admin: `DiagnosticInterviews.tsx`, `DiagnosticInterviewDetail.tsx`.
- Diagnostic client/admin views: `src/components/diagnostics/*`.
- Tools 1–6 (Self-Assessment, Revenue Leak Engine, Revenue Review Sync,
  SWOT, Workflow / Process Mapping, etc.) under `src/pages/portal/tools/`.
- Saved benchmarks: `src/pages/admin/SavedBenchmarks.tsx`.

### 1.4 Implementation tools

- `ImplementationRoadmap.tsx`, `ImplementationTracker.tsx`,
  `SopTrainingBible.tsx`, `DecisionRightsAccountability.tsx`,
  `WorkflowProcessMapping.tsx`, `ToolAssignmentTrainingTracker.tsx`.
- Admin mirrors under `src/pages/admin/`.

### 1.5 RGS Control System tools

- Umbrella doc: `docs/rgs-control-system-umbrella.md`.
- Tools: `RgsControlSystem.tsx`, `ClientRevenueTrackerPage.tsx`,
  `RevenueLeakEngine.tsx`, `PriorityActionTracker.tsx`,
  `OwnerDecisionDashboard.tsx`, `ScorecardHistory.tsx`,
  `MonthlySystemReview.tsx`, `FinancialVisibility.tsx`,
  Revenue & Risk Monitor (admin: `RevenueRiskMonitorAdmin.tsx`).
- Client Health / Renewal Risk: `ClientHealthAdmin.tsx`,
  `docs/client-health-renewal-risk.md`.

### 1.6 Report / repair-map architecture

- Diagnostic Report Builder: `src/components/diagnostics/DiagnosticReport.tsx`.
- RGS Stability Snapshot client view:
  `src/components/reports/StabilitySnapshotClientView.tsx`.
- Admin: `ReportDrafts.tsx`, `ReportDraftDetail.tsx`, `ReportEditor.tsx`,
  `Reports.tsx`, `Reporting.tsx`.
- Tables: `report_drafts`, `tool_report_artifacts`.
- Component: `StoredToolReportsPanel` (signed URLs, private
  `tool-reports` bucket).
- Tiering doc: `docs/report-generator-tiering.md`,
  `docs/rgs-tool-specific-report-generator.md`,
  `docs/report-export-safety.md`.
- Repair map / roadmap recommendations rendered through
  `StopStartScaleDisplay.tsx` and the diagnostic report.

### 1.7 AI assist architecture

- Edge functions only: `supabase/functions/{report-ai-assist,
  diagnostic-ai-followup, sop-ai-assist, journey-ai-seed,
  persona-ai-seed, process-ai-seed, ai-readiness-status}`.
- Contract test: `src/lib/__tests__/aiAssistWiringContract.test.ts`
  enforces no frontend AI keys, admin-only output, label guards.
- Doc: `docs/ai-assist-wiring.md`.
- Default: AI output stored as draft, admin-reviewed, never
  client-visible without approval.

### 1.8 Access controls relevant to this work

- `ProtectedRoute requireRole="admin"` for all admin routes.
- `ClientToolGuard` for client tool surfaces.
- RLS: `industry_brain_entries` admin-only;
  `report_drafts` / `tool_report_artifacts` tenant-scoped + admin override.
- Private storage bucket `tool-reports` with signed URLs.

### 1.9 Cannabis / MMJ safety controls

- Industry key: `cannabis_mmj_mmc` (dispensary/retail operations only).
- Brain: `industryBrains/medicalMmc.ts` exports `runCannabisBrain` /
  `runMedicalBrain` aliases — both treat the vertical as cannabis retail.
- Existing contract tests forbid healthcare/patient-care framing in seed
  content (see `industryBrainDeepExpansion.test.ts`).
- Doc: `docs/rgs-medical-terminology-clarification.md`.

### 1.10 Pricing confirmation

- RGS Control System = **$1,000/month** across pages, docs, and offer
  config. Verified in `src/lib/__tests__/rgsControlSystemPricingUpdate.test.ts`.
- No active $297/month client/public-facing copy.

---

## 2. Gap analysis

| # | Area | Current state | Gap | Owning pass |
|---|------|---------------|-----|-------------|
| 1 | **Failure libraries** per industry | Pattern logic embedded in `industryBrains/*.ts`; ~13 admin-seeded entries; no normalized failure-pattern schema with symptoms / hidden cause / score impact / repair-map link. | Add structured anchors. | IB-H2 |
| 2 | **Gold-standard benchmark anchors** | `SavedBenchmarks.tsx` + `benchmark.ts` exist; no per-industry × gear × metric anchor table with warning/critical ranges and source-status. | Add benchmark anchor anchors (table or seed extension). | IB-H2 |
| 3 | **Industry glossary / nuance** | None. | Add glossary anchors (term, industry, meaning, related gear/tool). | IB-H2 |
| 4 | **Synthetic slipping-engine case studies** | None labeled as such. Demo data exists but isn't case-study structured. | Add 5 per industry across score bands; clearly labeled training/non-proof. | IB-H2 |
| 5 | **5-gear hard-truth metrics** | Partial fields in `IndustryDataInput` (types.ts). Many metrics (CPQL, MER, cycle time, vacation test, runway) not captured as first-class evidence fields. | Add metric registry + evidence fields, including "unknown / not tracked" as valid evidence. | IB-H3 |
| 6 | **Tool-question coverage** | Owner Diagnostic Interview + tools 1–6 collect partial evidence; no progressive-disclosure mapping to the metric registry. | Expand questions w/ progressive disclosure; admin-only deeper fields. | IB-H3 |
| 7 | **Report builder integration** | `DiagnosticReport.tsx` renders findings; no native "industry interpretation" or "benchmark comparison" blocks tied to the brain. | Wire failure patterns + benchmark anchors into report sections. | IB-H4 |
| 8 | **Repair map integration** | Repair items rendered via `StopStartScaleDisplay`; missing metric/evidence/severity/dependency/order linkage to brain anchors. | Extend repair-map item shape + admin notes split. | IB-H4 |
| 9 | **Admin review integration** | `ReportDraftDetail.tsx`, `RgsReviewQueue.tsx` exist; no surface for "metric gaps / unknown answers / suggested clarifying questions / industry comparisons". | Add review panel sections sourced from brain. | IB-H4 |
| 10 | **Admin-reviewed AI assist** | `report-ai-assist`, `diagnostic-ai-followup` exist as edge functions. They do not yet load Industry Brain anchors as context. | Inject brain context into prompts (server-side); keep admin-draft default. | IB-H5 |
| 11 | **Regression / security proof** | Existing aiAssistWiring + industryBrainDeepExpansion + rgsControlSystemPricingUpdate tests. No combined regression for the new evidence/anchor surfaces. | Add IB-series contract tests + security sweep. | IB-H6 |

---

## 3. Schema & migration recommendations

- **Reuse first.** `industry_brain_entries` already supports failure
  patterns (template_type `risk_signal`), benchmark notes
  (`benchmark_note`), report language (`report_language`), workflow
  examples, etc. IB-H2 should **prefer seeding into the existing table**
  using new template_type values where possible, before adding tables.
- **Likely new (IB-H2):** small companion tables only if existing
  template_type cannot represent ranges/structured fields cleanly:
  - `industry_benchmark_anchors` (industry × gear × metric, with
    `ideal_min`, `ideal_max`, `warning_min`, `warning_max`,
    `critical_min`, `critical_max`, `source_status`,
    `client_safe_wording`, `admin_notes`, `client_visible` default false).
  - `industry_glossary_terms`.
  - `industry_case_studies` (synthetic; `is_synthetic` NOT NULL true,
    `client_visible` default false, never surfaced as proof).
- **Likely new (IB-H3):** `gear_metric_registry` (metric_key, gear,
  description, owner-friendly question, admin-only deep fields,
  scoring band hints) and an evidence capture table or extension to
  existing diagnostic responses (favor extension).
- All new tables: RLS enabled, admin-only by default,
  `client_visible = false` default, audit columns, no auth.users FKs.
- No changes to `auth`, `storage`, `realtime`, `supabase_functions`,
  `vault` schemas.

---

## 4. Security / approval risks

- Synthetic case studies must never be displayed as real client proof.
  Add a contract test in IB-H6 that any case-study render path requires
  a "Training example — not a real customer" label.
- Benchmark anchors flagged `needs external verification` must not be
  rendered to clients as authoritative.
- Cannabis content must continue to fail any healthcare/patient/HIPAA
  scan (existing test stays + extends).
- AI prompts that include brain context must not include other tenants'
  data; tenant scoping enforced server-side.
- Client-visible approval flag on every brain anchor; default off.

---

## 5. What should NOT be built

- Do **not** create a parallel "Industry Brain v2" table set if existing
  `industry_brain_entries` covers the use case.
- Do **not** wire AI to score the client.
- Do **not** auto-publish AI drafts.
- Do **not** add per-industry duplicate tools.
- Do **not** create client-facing Industry Brain pages beyond the
  existing education page in this series.
- Do **not** introduce healthcare framing under cannabis.
- Do **not** alter Diagnostic / Implementation pricing or reintroduce
  $297/month copy.

---

## 6. Proposed sequence

### IB-H2 — Industry Anchor Schema + Content Foundation
- Seed failure libraries, benchmark anchors, glossary terms, and
  synthetic case studies for all 5 verticals.
- Add minimal companion tables only where `industry_brain_entries`
  cannot cleanly represent ranges/structured fields.
- Acceptance: each vertical has ≥ top failure patterns, ≥ benchmark
  anchors per gear, ≥ glossary terms, and ≥ 5 synthetic case studies
  spanning score bands; all admin-only by default.

### IB-H3 — Gear Metrics Evidence Fields + Tool Question Expansion
- Add `gear_metric_registry`; expand Owner Diagnostic Interview and
  tools 1–6 to capture the 5 hard-truth metrics per gear with
  progressive disclosure and "unknown / not tracked" support.
- Acceptance: deterministic scoring unchanged; new evidence routes into
  brain interpretation only.

### IB-H4 — Report / Repair Map / Admin Review Integration
- Diagnostic Report renders industry interpretation + benchmark
  comparison blocks sourced from brain anchors; repair-map items carry
  gear/metric/evidence/severity/dependency; admin review surface shows
  metric gaps, unknown answers, suggested clarifying questions, AI
  drafts pending approval.
- Acceptance: clients see only approved content; admin-only notes never
  leak.

### IB-H5 — Admin-Reviewed AI Assist Integration
- Inject Industry Brain anchors into `report-ai-assist` and
  `diagnostic-ai-followup` prompts server-side; default output stays
  admin draft; tenant isolation enforced.
- Acceptance: aiAssistWiringContract still passes; new tests confirm
  brain context is loaded server-side and never bypasses admin review.

### IB-H6 — Industry Brain Evidence Regression + Security Sweep
- Full regression: cannabis safety, deterministic scoring, $1,000/month
  pricing, admin-only defaults, signed-URL patterns, no frontend AI
  keys, synthetic case study labeling.
- Acceptance: full vitest suite green; security linter clean.

---

## 7. Acceptance criteria for IB-H1 (this pass)

- This doc exists and references IB-H2 through IB-H6.
- Architecture inventory + gap analysis present.
- Deterministic scoring preserved as source of truth.
- AI remains backend / admin-reviewed only.
- Cannabis / MMJ scope remains dispensary/cannabis operations only.
- RGS Control System pricing confirmed at **$1,000/month**; no active
  $297/month client/public-facing copy.
- No production code changed in this pass.