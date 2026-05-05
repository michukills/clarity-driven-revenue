# RGS OS — IP Protection Verification (IP-H1)

This document records the **technical / product** IP-protection verification
performed in pass IP-H1. It is **not legal advice** and does not replace an
attorney, IP counsel, trademark/copyright filing, NDA, or vendor/legal
review.

RGS OS must be safe to demo, share with testers, and prepare for launch
without unnecessarily exposing the proprietary operating system.

---

## A. Technical protections verified

- **Role gating** — every `/admin/*` route is wrapped in
  `ProtectedRoute requireRole="admin"` (see `src/App.tsx`); the
  `roleGatingRegression` and `tenantIsolationContract` suites lock this
  in.
- **Tenant isolation** — portal pages resolve customer scope via
  `usePortalCustomerId` (auth-derived), never URL params.
- **RLS** — `industry_brain_entries`, `industry_benchmark_anchors`,
  `industry_glossary_terms`, `industry_case_studies`, `report_drafts`,
  and `tool_report_artifacts` are admin-only.
- **Synthetic case studies** — enforced by
  `CONSTRAINT ics_must_be_synthetic CHECK (is_synthetic = true AND
  not_real_client = true)` and admin-only RLS.
- **Private storage** — `tool-reports` bucket is private
  (`public = false`), accessed via short-lived signed URLs from
  `getToolReportSignedUrl` in `src/lib/reports/toolReports.ts`.
- **Client report queries** — explicitly exclude `internal_notes` via the
  `CLIENT_SAFE_REPORT_SELECT` allow-list.
- **No frontend secrets** — service-role keys, Stripe secret keys, and
  AI provider keys are never referenced from `src/`. Enforced by
  `aiAssistWiringContract` and `roleGatingRegression`.
- **AI prompts are edge-only** — `industry-evidence-context.ts` lives in
  `supabase/functions/_shared/` and is never imported from `src/`.
- **AI assist defaults** — `report-ai-assist` and `diagnostic-ai-followup`
  force `client_safe = false`, `review_required = true`, and never
  request a score change.
- **Deterministic scoring isolation** — `src/lib/scoring/*` does not
  import the gear metric registry, depth question registry, evidence
  interpretation helper, or any AI utility.
- **Production source maps** — disabled (`vite.config.ts`
  `build.sourcemap = mode === "development"`). Production bundles do not
  ship readable source for proprietary registries / report builders.
- **Demo / showcase safety** — public `/demo` page labels content as
  "sample/demo data only", contains no real testimonials, no ROI claims,
  and no fake proof; demo flag does not bypass `ProtectedRoute` or
  `ClientToolGuard`.
- **Pricing posture preserved** — RGS Control System remains
  `$1,000/month`. No active `$297/month` pricing.
- **Cannabis / MMJ scope** — limited to operational visibility and
  documentation readiness; HIPAA / clinical / patient-care / medical
  billing terminology is forbidden in prompts and registries.

## B. Product / IP boundaries that still require legal follow-up

The following are **outside the scope of this technical pass** and must be
handled by qualified counsel / professionals:

- Client NDA / confidentiality agreements
- Client service agreement & scope-of-work language
- Contractor / vendor NDAs and IP-assignment agreements
- Trademark review and filing strategy for **RGS**, **RGS Stability
  System™**, **Revenue Control System™**, **RGS Control System™**
- Copyright registration strategy for reports, frameworks, training
  materials, site copy, and tool text
- Attorney review of EULA and Privacy Policy
- Attorney review of all scope disclaimers
- Cannabis compliance attorney / compliance professional review for
  MMJ-related tools and language
- CPA / tax professional review for 280E and tax-related framing
- Vendor terms review (Lovable, Supabase, Stripe, OpenAI, Resend,
  Cloudflare, etc.)
- Data retention and privacy policies
- Client consent for AI-assisted review (where applicable)

## C. What is NOT being claimed by this pass

- RGS is **not** claimed to be fully legally protected.
- Trademark / copyright registration is **not** claimed to be complete.
- Documents have **not** been attorney-reviewed by virtue of this pass.
- No compliance certification is implied.
- Trade-secret protection is **not** guaranteed.
- Competitors are **not** prevented from independently developing
  similar ideas.
- Full legal defensibility is **not** asserted.

IP-H1 verifies **technical / product / security exposure hardening only.**