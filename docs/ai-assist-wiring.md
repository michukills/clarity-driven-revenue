# AI Assist Wiring Pass

## Purpose

A safe, admin-reviewed AI assist layer across eligible RGS OS tools.
AI helps the RGS admin draft, summarize, classify, and review faster.
It does not replace deterministic scoring, owner judgment, the RGS
system, or professional review.

## Boundaries (non-negotiable)

- All AI calls go through Supabase edge functions. No frontend / admin /
  client source file ever reads provider keys (`LOVABLE_API_KEY`,
  `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`) or hits
  provider endpoints directly.
- Admin role is required and verified inside the function before the AI
  gateway is called.
- AI output is admin-only by default and stored as draft material. It
  becomes client-visible only after explicit admin transformation into
  the existing `client_safe` / `client_visible` fields.
- AI cannot:
  - publish reports or any client content automatically,
  - override deterministic scoring,
  - change access, payment, invite, or tenant gates,
  - expose `internal_notes`, `admin_notes`, raw reason codes, tokens,
    storage paths, or secrets,
  - certify legal, tax, accounting, HR, payroll, insurance, healthcare,
    or compliance status,
  - generate fake testimonials, fake proof, or "trusted by" claims.
- For cannabis / MMJ / MMC clients: business operations only. Not
  healthcare, not patient care, not HIPAA. Use phrasing like
  "compliance-sensitive", "state-specific rules may apply",
  "review with qualified counsel where required",
  "not a compliance guarantee".

## Edge functions

Existing admin-only AI functions (all `verify_jwt = true`, all call
`requireAdmin`):

- `report-ai-assist` — first-draft / refinement assist for the report
  draft system. Hardened in this pass with P65 tier constraints.
- `persona-ai-seed`, `journey-ai-seed`, `process-ai-seed` — admin draft
  seeds for personas, journey, processes.
- `diagnostic-ai-followup` — diagnostic interview follow-up assist.
- `ai-readiness-status` — read-only AI readiness probe; does not return
  secrets.

No new shared `rgs-ai-assist` function was created. The existing
per-surface admin-only functions already cover the required pattern;
adding a generic shared function would have duplicated the existing
admin-review precedent without benefit.

## Report AI tier constraints (P65)

`report-ai-assist` now reads the draft's `report_type` and injects a
per-tier constraints block into the user prompt. The block mirrors
`src/lib/reports/reportTypeTemplates.ts` (edge functions cannot import
from `src/`; the constants are duplicated and must be kept in sync).

Per tier:

| Tier | Full Scorecard | Full 5-Gear | RGS Stability Snapshot | Repair Map | 30/60/90 | Implementation Notes |
|------|---------------|-------------|------------------------|------------|----------|----------------------|
| `full_rgs_diagnostic`        | yes | yes | yes | full | no  | yes |
| `fiverr_basic_diagnostic`    | no  | no  | no  | none | no  | no  |
| `fiverr_standard_diagnostic` | no  | no  | no  | lite | no  | no  |
| `fiverr_premium_diagnostic`  | no  | no  | yes | full | yes | no  |
| `implementation_report`      | no  | no  | no  | full | no  | yes |

The prompt tells the model that any non-flagship tier is NOT the Full
RGS Diagnostic and must not be promoted to that depth, and that the
SWOT-style section must always be labeled "RGS Stability Snapshot" in
client-facing output (never "SWOT Analysis").

## Admin review workflow

`report-ai-assist` always:

- sets `generation_mode = 'ai_assisted'`,
- sets `ai_status = 'complete'` (or `failed` / `disabled` on error),
- sets `client_safe = false`,
- sets `status = 'needs_review'`,
- forces every section/recommendation/risk to `client_safe: false`,
- appends an admin note explaining the AI version and that admin
  review is required.

An admin must then edit and approve the draft. Publishing to the client
continues to flow through the separate `business_control_reports`
surface (no change in this pass).

## AI run logging

All AI attempts append to `public.ai_run_logs` (admin-only RLS). The
log captures: feature, model, status, object table/id, token usage,
error message, and metadata such as `report_type`. The log never stores
the raw prompt content or any provider secret.

## Tools wired in this pass

- Report Drafts / P65 report tiering — tightened (tier constraints +
  scope warnings + cannabis/MMJ rule).

## Tools scaffolded / deferred

The following tools have admin surfaces ready to receive AI assist
later. Wiring is deferred to keep this pass surgical and avoid
regressing existing flows:

- Advisory Notes / Clarification Log
- Monthly System Review
- RGS Stability Snapshot (SWOT-style admin tool)
- Financial Visibility
- Client Health / Renewal Risk
- Industry Brain
- SOP / Training Bible, Workflow Mapping, Decision Rights, Priority
  Action, Owner Decision, Revenue & Risk Monitor

When wired, each will reuse the same pattern:
`requireAdmin` → tier/scope guard → admin-only draft fields →
`ai_run_logs` → admin must approve before any client-visible field
changes.

## Banned UI copy (do not use anywhere)

- "AI advisor"
- "AI consultant"
- "Ask AI anything"
- "client-facing AI chatbot"
- "automatic client guidance"
- "guaranteed revenue / ROI / renewal / compliance / outcome"
- "RGS keeps you compliant"
- "RGS runs your business"
- "done-for-you" / "full-service" / "unlimited support"
- Client-facing "SWOT Analysis" (use "RGS Stability Snapshot")

## Deferred (future passes)

- AI assist wiring for tools listed above.
- A shared `rgs-ai-assist` function (only if a pattern not already
  covered emerges).
- AI-driven client surfaces (intentionally not built).
- P60A state-specific cannabis compliance monitor.

## Tests

- `src/lib/__tests__/aiAssistWiringContract.test.ts`
- existing `edgeFunctionSecurity.test.ts`,
  `aiPromptVoiceContract.test.ts`,
  `reportGeneratorTieringContract.test.ts` continue to apply.