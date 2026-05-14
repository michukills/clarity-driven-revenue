# RGS SWOT Strategic Matrix

Status: data layer + deterministic engine + downstream signal contract +
AI-readiness brain. This pass intentionally **does not** touch RGS Campaign
Control internals (Codex is working on that module). SWOT only exposes clean
signals that Campaign Control (and Repair Map, Implementation, Control System,
Buyer Persona/ICP, Re-engagement) can later consume.

## What this pass adds

### Data layer (new, layered alongside P61 `swot_analysis_items`)
- `swot_analyses` — parent SWOT record per customer, with status, mode,
  industry, business stage, reviewer/approver, and client visibility flag.
- `swot_items` — individual findings linked to a SWOT analysis with category,
  evidence summary + confidence, source, linked RGS gear, severity/leverage,
  internal vs external, client-safe summary, admin-only notes, recommended
  action, and relevance flags for repair map / implementation / campaign /
  control system monitoring / re-engagement triggers.
- `swot_signals` — structured downstream signals derived from SWOT items.

RLS:
- Admins fully manage all three tables.
- Customers can only read approved + `client_visible` analyses for their own
  customer record, and only `client_visible` items + `client_safe` non-admin
  signals tied to those approved analyses.
- Admin-only notes never appear in client-facing reads.

### Engine (`src/lib/swot/swotEngine.ts`)
- `defaultInternalExternal(category)`
- `inferGear(title, description?)` — keyword mapping to RGS gears
- `inferSeverity(item)` — deterministic from confidence + relevance flags
- `normalizeSwotItem(input)` — strips/cleans fields; never copies
  `admin_only_notes` into `client_safe_summary`
- `isMissingEvidence(item)`

### Signal contract (`src/lib/swot/swotSignals.ts`)
- `deriveSignalsForItem(ctx, item)`
- `buildSwotSignalSummary(customer_id, swot_analysis_id, items)`
- `getCampaignRelevantSwotSignals(signals)`
- `getRepairMapRelevantSwotSignals(signals)`
- `getImplementationRelevantSwotSignals(signals)`
- `getControlSystemWatchSignals(signals)`
- `getReengagementTriggerSignals(signals)`
- `SWOT_SCOPE_DISCLAIMER` — safe-language scope statement used in reports

### AI brain (`src/lib/swot/swotAiBrain.ts`)
- `isSwotAiLive()` returns `false` (readiness-only).
- `SWOT_AI_ALLOWED` / `SWOT_AI_FORBIDDEN` lists.
- `SWOT_AI_SYSTEM_PROMPT` enforces admin-review and scope safety.
- AI cannot override deterministic scoring, invent evidence, mark evidence
  verified, publish without admin review, leak admin-only notes, or use other
  customers' data.

## Hard boundaries

- No Campaign Control internals are imported, mutated, or duplicated here.
- No service-role keys in frontend.
- No legal/tax/accounting/compliance/valuation conclusions.
- No revenue/profit/growth/leads/ROI promises.
- Cannabis/MMJ context = operational/documentation visibility only, not
  regulatory or compliance certification.
- The existing P61 SWOT Analysis Tool surface (`swot_analysis_items`,
  `/portal/tools/swot-analysis`, `/admin/customers/:id/swot-analysis`) is
  preserved unchanged.

## Tests

`src/lib/__tests__/swotStrategicMatrix.test.ts` — engine, signals, AI brain
contract, legal/scope language, schema migration. Existing
`swotAnalysisToolContract.test.ts` and `legalScopeLanguageContract.test.ts`
continue to pass.

## Future

- Admin Strategic Matrix UI to author analyses + items + persist signals.
- Approved-flow client view backed by `swot_analyses` / `swot_items`.
- Live AI assist wiring once the global AI assist plumbing is approved.
- Direct Campaign Control consumption of SWOT signals (Codex-owned module).