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

---

## 8. IB-H2 — Industry Anchor Schema + Content Foundation (implemented)

**Schema choice:** Reused `industry_brain_entries` (template_type
`risk_signal`) for failure libraries. Added three additive companion
tables for structured shapes that the existing schema cannot represent
cleanly:

- `public.industry_benchmark_anchors` — industry × gear × metric with
  benchmark / warning / critical values, unit, `source_status`,
  `interpretive_only=true` default, `client_visible=false` default,
  admin notes, and client-safe wording.
- `public.industry_glossary_terms` — per-industry term, meaning,
  cross-industry note, related gear, report wording guidance,
  client-safe wording, `client_visible=false` default.
- `public.industry_case_studies` — synthetic slipping-engine cases with
  `is_synthetic=true` and `not_real_client=true` enforced via CHECK,
  `client_visible=false` default, `score_band` (300_450 / 451_650 /
  651_800 / 801_plus), gear scores, admin interpretation, client-safe
  summary, repair-map priorities, suggested next questions, and a
  `display_label` of "Training example — not a real customer."

All companion tables are RLS-enabled, admin-only via `is_admin(auth.uid())`,
have `updated_at` triggers, and use safe additive indexes.

**Migration:** `supabase/migrations/20260505043826_df0de85e-a386-47d8-acb3-2caf256215e0.sql`

**Coverage seeded (per industry):**

| Industry | Failures | Benchmarks | Glossary | Case studies | Bands |
|---|---|---|---|---|---|
| general_small_business | 10 | 5 | 10 | 5 | 300–450 / 451–650 / 651–800 / 801+ |
| trades_services | 11 | 7 | 10 | 5 | all four |
| restaurant_food_service | 11 | 7 | 10 | 5 | all four |
| retail | 11 | 7 | 10 | 5 | all four |
| cannabis_mmj_mmc | 12 | 8 | 10 | 5 | all four |

**Visibility defaults:** All IB-H2 anchors are admin-only and not
published to clients. Synthetic case studies carry the explicit
"Training example — not a real customer." label and a CHECK constraint
that they cannot be marked non-synthetic.

**Cannabis / MMJ safety:** All cannabis IB-H2 content stays dispensary /
cannabis retail operations only. No HIPAA, healthcare, patient care,
clinical workflow, medical billing, or insurance-claim framing. All
cannabis anchors include "state-specific rules may apply", "not legal
advice", and "RGS does not certify compliance" wording.

**Deterministic scoring:** Untouched. IB-H2 is interpretation/context
only; benchmark anchors are `interpretive_only=true` until a future
approved pass wires any of them into scoring.

**AI wiring:** None added in this pass. Anchors are preloaded so IB-H5
can inject them into server-side admin-reviewed AI prompts.

**Pricing safety:** RGS Control System remains $1,000/month. IB-H2 SQL
contains no `$297/month` and no `29700` price reintroduction.

**Tests:** `src/lib/__tests__/industryBrainAnchorFoundationIBH2.test.ts`
enforces presence of the migration, companion tables, RLS/admin-only
policies, client_visible defaults, synthetic-only CHECK, per-industry
counts (≥10 failures, ≥5 benchmarks, ≥10 glossary, ≥5 case studies),
all four score bands per industry, gear coverage, cannabis safety
wording, no scoring-file modification, and no $297/month reintroduction.

**Remaining items:**

- IB-H3: gear metric registry + tool-question expansion (progressive
  disclosure, "unknown / not tracked" support).
- IB-H4: report builder + repair map integration sourced from IB-H2
  anchors; admin review surface for metric gaps.
- IB-H5: server-side anchor injection into `report-ai-assist` and
  `diagnostic-ai-followup`; admin-draft default preserved.
- IB-H6: full regression + security sweep.

---

## 9. IB-H3 — Gear Metrics Evidence Fields + Tool Question Expansion (implemented)

**Schema/config choice:** TypeScript constants only. No new database
migration was added. The 5-Gear hard-truth metric registry lives at
`src/lib/intelligence/gearMetricRegistry.ts` and reuses the existing
pillar keys (`demand` / `conversion` / `operations` / `financial` /
`independence`) so the deterministic 0–1000 score (5 × 200) is unchanged.

**Where the registry lives:** `src/lib/intelligence/gearMetricRegistry.ts`
exports `GEAR_METRIC_REGISTRY` (25 metrics), `GEAR_METRIC_QUESTION_MAP`
(Owner Diagnostic Interview + per-gear diagnostic mapping), and
`interpretAnswerState` for IB-H4 admin review.

**Metrics per gear:** 5 / 5 / 5 / 5 / 5 = **25 total**.

**The 25 hard-truth metrics:**
- Gear 1 — Demand: CPQL, Channel Concentration, Inquiry-to-Lead Ratio, MER, Lead Quality / Buyer Fit Evidence.
- Gear 2 — Conversion: Sales Cycle Length, Lead-to-Close Rate, AOV/ACV, No-Show / Cancellation Rate, Follow-Up Completion Rate.
- Gear 3 — Operations: Capacity Utilization, Rework / Error Rate, Cycle Time, Owner Bottleneck, Delivery Process Consistency.
- Gear 4 — Financial: Break-Even Point, Cash Runway, Gross Margin, Net Margin, AR Aging.
- Gear 5 — Independence: Vacation Test, Decision Frequency, Documentation Coverage, Single Point of Failure, Delegation / Accountability Clarity.

**Answer states:** Each metric supports `verified` / `incomplete` /
`unknown` / `no`. `unknown` is treated as **visibility weakness** (not
neutral) and `incomplete` as **system-exists-but-slips** (not a pass) —
enforced both in metric copy and the `interpretAnswerState` helper.

**Tool / question mapping:** Each metric is mapped into the Owner
Diagnostic Interview (`owner_diagnostic_interview`) and its
gear-specific diagnostic (`{gear}_diagnostic`). Evidence prompts
explicitly accept "not tracked" as valid diagnostic evidence. Deeper
industry-specific tool depth is intentionally deferred to **IB-H3B**.

**Industry awareness:** Cross-industry by default. Industry-specific
nuance is held in `industryNotes` (e.g., Cycle Time differs across
trades / restaurant / retail / cannabis). IB-H2 failure patterns and
benchmark anchors are referenced via `relatedFailurePatterns` and
`relatedBenchmarkAnchors`.

**Deterministic scoring safety:** No files under `src/lib/scoring/` and
no scorecard categories were modified. All 25 metrics are
`interpretiveOnly = true`. A test asserts `stabilityScore.ts` does not
import the registry.

**AI wiring:** None. No edge functions, prompts, or secrets were added.

**Cannabis / MMJ safety:** Cannabis nuance covers intake/check-in /
reconciliation / operational documentation only. Tests block the terms
`hipaa`, `patient care`, `medical billing`, `insurance claim`,
`clinical workflow`.

**Pricing safety:** RGS Control System remains **$1,000/month**. Tests
block `$297` and `297/month` reintroduction in the registry source.

**Tests:** `src/lib/__tests__/gearMetricRegistryIBH3.test.ts` —
structure, evidence fields, answer-state semantics, tool mapping,
scoring isolation, cannabis safety, no premature AI wiring, no migration
leakage.

**Deferred to later passes:**
- **IB-H3A** — public/private scorecard surface alignment to gear
  metric language where appropriate.
- **IB-H3B** — industry-specific deterministic tool depth (per-industry
  question variants, optional file-evidence upload reuse).
- **IB-H4** — admin review surface for metric gaps; report builder and
  Priority Repair Map consumption of metric evidence.
- **IB-H5** — server-side anchor + metric injection into
  `report-ai-assist` / `diagnostic-ai-followup` (admin-draft only).
- **IB-H6** — full regression + security sweep.

---

## 10. IB-H3B — Industry-Specific Deterministic Tool Depth (implemented)

**Schema/config choice:** TypeScript registry only — no DB migration,
no schema churn. Lives at
`src/lib/intelligence/industryDepthQuestionRegistry.ts`.

**Industries hardened:** `trades_services`, `restaurant_food_service`,
`retail`, `professional_services`, `ecommerce_online_retail` (the last
two added as deterministic tool-depth profiles without altering existing
public industry pages). Cannabis / MMJ deliberately out of scope this
pass; IB-H2 / IB-H3 cannabis safety preserved.

**Question counts:** 25 per industry × 5 industries = **125 questions**.
Gear coverage per industry: 5 demand / 5 conversion / 5 operations /
5 financial / 5 independence.

**Per-question structure:** `questionKey`, `industryKey`, `industryLabel`,
`gear`, `questionText`, `ownerFriendlyLabel`, `whyItMatters`,
`answerStateLogic` (verified / incomplete / unknown / no), `evidencePrompt`,
`evidenceExamples`, `metricMappings` (into IB-H3 `GEAR_METRIC_REGISTRY`),
`failurePatternMappings` (into IB-H2 failure libraries),
`benchmarkAnchorMappings` (into IB-H2 `industry_benchmark_anchors`),
`repairMapTrigger`, `reportLanguageSeed`, `clientSafeExplanation`,
`adminOnlyInterpretationNotes`, `aiDraftSupport` (allowed=true,
adminReviewedOnly=true, noAutoPublish=true), `interpretiveOnly=true`,
`displayOrder`, `clientVisible=true`.

**Answer-state semantics:** `interpretIndustryDepthAnswer` mirrors the
IB-H3 helper. `unknown` is a **visibility weakness** (not neutral),
`incomplete` is **system-exists-but-slips** (not a pass), `no` is a
slipping gear/failing tooth, `verified` is stable.

**Deterministic scoring safety:** Registry does not import or modify
`src/lib/scoring/*`. All questions are `interpretiveOnly = true`.
No scorecard categories were changed.

**AI safety:** No AI wiring. No edge functions, prompts, secrets, or
network calls in this pass. `aiDraftSupport` flags are forward-looking
only and gate IB-H5 admin-draft consumption.

**Cannabis / MMJ safety:** Cannabis profiles intentionally not in this
registry; existing IB-H2 / IB-H3 cannabis safety preserved. No
healthcare / HIPAA / patient-care / clinical-workflow / medical-billing
/ insurance-claim framing anywhere (test-guarded).

**Pricing safety:** RGS Control System remains **$1,000/month**.
Test guard blocks `$297` reintroduction in this registry source.

**Tests:**
`src/lib/__tests__/industryDepthQuestionRegistryIBH3B.test.ts` —
industry presence, 20–30 questions per industry, ≥4 questions per gear
per industry, full structured shape, answer-state semantics, metric
namespace validity, unique question keys, scoring isolation, no AI
wiring, no healthcare drift, cannabis still out of scope here, no
$297/month reintroduction.

**Remaining for IB-H3A / IB-H4 / IB-H5 / IB-H6:** UI consumption with
progressive disclosure, admin review surface for slipping/visibility
evidence, report builder + Priority Repair Map wiring, server-side
admin-draft AI injection, full regression + security sweep.

## 11. IB-H3A — Logic Coverage + Clarity Hardening Audit (implemented)

**Purpose:** Audit pass after IB-H2/IB-H3/IB-H3B to prove there is no
missing, shallow, placeholder-only, mislabeled, or disconnected logic
at the registry layer before wiring into reports / repair maps / admin
review / AI in IB-H4+.

**Audited surfaces:** `industry_brain_entries`,
`industry_benchmark_anchors`, `industry_glossary_terms`,
`industry_case_studies`, `src/lib/intelligence/industryBrains/*`,
`src/lib/intelligence/gearMetricRegistry.ts`,
`src/lib/intelligence/industryDepthQuestionRegistry.ts`, industry
labels, `/industry-brain` education page, public demo, RGS Control
System pricing surfaces.

**Findings:**

- **Metric ↔ question alignment:** All 25 IB-H3 hard-truth metrics are
  mapped at least once by `GEAR_METRIC_QUESTION_MAP` (Owner Diagnostic
  Interview + per-gear diagnostic tool). All 125 IB-H3B industry-depth
  questions reference only valid IB-H3 metric keys (verified by
  contract test in this pass; 0 unmapped, 0 bad refs).
- **Industry coverage alignment:** Five public/first-class industries
  remain consistent: General Small Business / General Mixed Business,
  Trades / Home / Field Services, Restaurant / Food Service, Retail,
  and Cannabis / MMJ / MMC (dispensary operations only). Professional
  Services and E-commerce / Online Retail are documented here as
  **tool-depth profiles** in `industryDepthQuestionRegistry`, not yet
  public first-class industry pages, and must not be marketed as
  launch-ready industry verticals until IB-H4+ surfaces them.
- **Gear coverage alignment:** Each of the five gears (Demand
  Generation, Revenue Conversion, Operational Efficiency, Financial
  Visibility, Owner Independence) has 5 hard-truth metrics in IB-H3
  and 5 questions per industry-depth profile in IB-H3B. No gear has
  blank categories or filler-only questions.
- **Answer-state clarity:** `interpretAnswerState` (IB-H3) and
  `interpretIndustryDepthAnswer` (IB-H3B) are aligned — `verified` =
  stable, `incomplete` = system-exists-but-slipping, `unknown` =
  visibility weakness (not neutral), `no` = slipping. No client-facing
  copy in registries implies `unknown` is acceptable or `incomplete`
  is a pass.
- **Client / admin clarity:** Every IB-H3B question carries
  `clientSafeExplanation` and `adminOnlyInterpretationNotes`; admin
  notes are never copied into client-safe fields. Registry data is
  not surfaced as live UI yet — that is deferred to IB-H4.
- **Tool / stage mapping:** Owner Diagnostic Interview maps to all 25
  hard-truth metrics. Industry-depth questions remain registry/config
  until IB-H4 wires admin review and report builder.
- **Report / repair-map readiness:** Every industry-depth question
  carries `repairMapTrigger`, `reportLanguageSeed`, `metricMappings`,
  `failurePatternMappings`, `benchmarkAnchorMappings`,
  `clientSafeExplanation`, and `adminOnlyInterpretationNotes`. Every
  gear metric carries `futureWiring`, `clientSafeExplanation`,
  `adminOnlyNotes`, `deterministicScoringHint`, and
  `interpretiveOnly = true`. IB-H4 has a clean consumption path.
- **RGS Control readiness:** `futureWiring` flags include
  `rgsControlSystem`, `revenueRiskMonitor`,
  `clientHealthRenewalRisk`, `priorityRepairMap`, and
  `stabilitySnapshot`. RGS Control System pricing remains
  **$1,000/month**.
- **Cannabis / MMJ safety:** No healthcare / HIPAA / patient-care /
  clinical-workflow / medical-billing / insurance-claim drift in any
  IB-H2 / IB-H3 / IB-H3B artifact (test-guarded). Cannabis depth
  profile is intentionally not in IB-H3B's industry list yet; cannabis
  remains covered by `industry_brain_entries` + the cannabis brain
  with dispensary-only framing.
- **Public / demo / proof safety:** Synthetic case studies remain
  `is_synthetic = true`, `not_real_client = true`, `client_visible =
  false`. Public `/demo` continues to use sample/demo data only and
  no IB-H3A change exposes registry data as real customer proof.
- **Pricing safety:** No `$297/month` active pricing reintroduced
  anywhere in IB-H2 / IB-H3 / IB-H3B / IB-H3A artifacts (test-guarded).

**Patches applied in this pass:** Documentation update (this section)
and a new contract test `ibH3ALogicCoverageHardening.test.ts` proving
the alignment above. No registry data was changed; no schema was
changed; no AI wiring was added; deterministic scoring was not touched.

**Tests:**
`src/lib/__tests__/ibH3ALogicCoverageHardening.test.ts` —
metric→question coverage, question→metric validity, full required
report/repair-map/admin field shape, per-gear coverage per industry,
answer-state alignment between IB-H3 and IB-H3B helpers,
`interpretiveOnly` enforcement, deterministic scoring isolation, no AI
wiring in registries, cannabis/MMJ safety, `$1,000/month` confirmation,
and `$297/month` non-reintroduction.

**Remaining for IB-H4 / IB-H5 / IB-H6:** Admin review surface, report
builder + Priority Repair Map wiring, server-side admin-draft AI
injection, full regression + security sweep, and any later promotion
of Professional Services / E-commerce from tool-depth profile to
first-class industry vertical.

## IB-H4 — Report / Repair Map / Admin Review Integration

IB-H4 wires the accepted IB-H2 / IB-H3 / IB-H3B layers into the
admin diagnostic / report-draft surfaces without changing the
deterministic 0–1000 score and without adding AI.

**Helpers added:**
- `src/lib/intelligence/evidenceInterpretation.ts`
  - `buildEvidenceSignal(input)` — turns one (gear, metric, question,
    answerState) into a structured signal with admin / client-safe
    separation.
  - `buildEvidenceSignals(inputs[])` — batch convenience.
  - `buildIndustryEvidenceReportSections(signals, industryKey)` —
    groups signals into report-ready sections (`strengths`,
    `slippingSignals`, `visibilityWeaknesses`, `priorityClarifications`,
    `industryContext`, `benchmarkNotes`, `clientSafeDraftSections`,
    `adminOnlyNotes`) with `reviewRequired = true` and
    `clientVisible = false` defaults.
  - `buildRepairMapCandidatesFromEvidence(signals)` — emits priority
    repair-map candidates (`gear`, `metricKey`, `questionKey`,
    `severity`, `clientSafeAction`, `adminOnlyNotes`, `belongsTo`,
    `clientVisible = false`, `approvalRequired = true`). Verified
    answers never produce repair items; unknown answers create
    `diagnostic_clarification` candidates; incomplete/no answers create
    `implementation` candidates.

**Admin-only UI mounted:**
- `src/components/admin/IndustryEvidenceReviewPanel.tsx` — rendered in
  `src/pages/admin/ReportDraftDetail.tsx` (already gated by
  `ProtectedRoute requireRole="admin"`). When no signals are present
  the panel shows a documented empty state — never fake findings.

**Wired now vs deferred:**
- Wired now: deterministic helpers, admin review panel surface, draft
  section + repair-map candidate shape, safe defaults.
- Deferred to IB-H5: pulling actual stored diagnostic answers into the
  panel, persisting admin-approved client-visible promotions, exposing
  candidates in the live Priority Repair Map UI.
- Deferred to IB-H6: AI-assisted draft language, full regression sweep,
  Professional Services / E-commerce promotion to first-class verticals.

**Safety confirmations (IB-H4):**
- Deterministic scoring untouched — `src/lib/scoring/*` does not import
  the new helper (test-enforced).
- No AI / fetch / Supabase / secret wiring inside the helper file.
- Admin-only notes are kept on a separate field and never merged into
  client-safe summaries, report seeds, or clarification questions
  (test-enforced).
- Cannabis / MMJ safety preserved — no healthcare / HIPAA / clinical /
  patient / billing / claim drift in the helper.
- Professional Services and E-commerce remain industry-depth profiles,
  not public first-class verticals.
- RGS Control System price remains **$1,000/month**.

**Tests:** `src/lib/__tests__/ibH4EvidenceInterpretation.test.ts`
(16 tests) — answer-state semantics, signal shape, admin/client
separation, report section shape, repair-map candidate shape, verified
suppression, helper safety, cannabis safety, scoring isolation.

## IB-H5 — Admin-Reviewed AI Assist Integration

IB-H5 wires the IB-H4 evidence interpretation layer into the existing
admin-reviewed AI assist edge functions. AI remains assistant-only:
admin reviews and approves before any client-visible publishing.

**New shared edge utility:**
- `supabase/functions/_shared/industry-evidence-context.ts`
  - `buildIndustryEvidenceContext(input)` — produces a compact prompt
    block + structured audit summary from admin-supplied IB-H4 signals,
    repair-map candidates, IB-H2 benchmark anchors, and glossary terms.
  - Tells the model the deterministic 0–1000 score is fixed and lists
    banned claims (no legal/tax/HR/compliance certification, no
    cannabis = healthcare framing, no synthetic-as-real-proof, no
    admin-only-into-client-safe leak).
  - `isAdminOnlyAiOutput(value)` — predicate used by tests to confirm
    AI output keeps `ai_assisted=true`, `review_required=true`,
    `client_visible=false`, `score_change_requested=false`.

**Edge functions hardened:**
- `supabase/functions/report-ai-assist/index.ts` — accepts optional
  `ib_h5_signals`, `ib_h5_repair_candidates`, `ib_h5_benchmark_anchors`,
  `ib_h5_glossary` from the admin caller, builds the IB-H5 context
  block, and prepends it to the existing admin-only prompt. Output is
  forced through `forceAdminOnly` (`client_safe=false`,
  `status='needs_review'`). AI version bumped to
  `ib-h5.report-ai-assist.v3-industry-evidence-context`.
- `supabase/functions/diagnostic-ai-followup/index.ts` — accepts
  optional `ib_h5_signals` + `industry_key` and folds the IB-H5 context
  into the user prompt before requesting clarifying questions. Output
  remains admin-only clarifying questions; deterministic intake
  unaffected.

**Wired now vs deferred:**
- Wired now: shared context builder, prompt-block injection in both AI
  functions, admin-caller-supplied IB-H4 signals, audit-friendly
  structured summary.
- Deferred to IB-H6: server-side resolution of signals from stored
  diagnostic answers (no client-side payload required), full
  admin-approval-to-client-visible promotion path, regression sweep,
  Professional Services / E-commerce promotion.

**Safety confirmations (IB-H5):**
- No frontend AI gateway calls. The shared utility lives under
  `supabase/functions/_shared/` and is never imported from `src/`.
- Deterministic scoring untouched — `src/lib/scoring/*` does not import
  the new utility (test-enforced).
- AI output remains admin-only (`client_safe=false`,
  `status='needs_review'`) and never auto-publishes.
- Cannabis / MMJ stays operational visibility only — no HIPAA,
  clinical, patient care, medical billing, insurance claim drift in
  the prompt block.
- Synthetic / training case studies are not surfaced as real proof
  (the builder accepts no case-study input).
- Admin-only notes never collapse into client-safe summaries.
- RGS Control System price remains **$1,000/month**.

**Tests:** `src/lib/__tests__/ibH5AiAssistIntegration.test.ts` —
context-block content, banned claims, cannabis framing,
admin-only output predicate, admin-only callsite injection in both
edge functions, scoring isolation, no frontend imports of the shared
utility, pricing safety.