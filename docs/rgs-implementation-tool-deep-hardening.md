# Implementation Tool Deep Hardening

This pass audits and hardens every Implementation-lane tool surface so that the
lane consistently communicates the bounded RGS scope ("install the repair plan
— do not become the operator") and meets premium UX, data-completeness, and
report-readiness expectations.

## Surfaces audited

| # | Surface | Route(s) | Status |
|---|---|---|---|
| 1 | Scope Boundary / Client Access Rules | `private.get_effective_tools_for_customer` + `ClientToolGuard` + new `ImplementationScopeBanner` | Launch-ready |
| 2 | Implementation Roadmap Tool | `/portal/tools/implementation-roadmap`, `/admin/customers/:customerId/implementation-roadmap` | Launch-ready |
| 3 | SOP / Training Bible Creator | `/portal/tools/sop-training-bible`, `/admin/customers/:customerId/sop-training-bible` | Launch-ready |
| 4 | Decision Rights / Accountability Tool | `/portal/tools/decision-rights-accountability`, `/admin/customers/:customerId/decision-rights-accountability` | Launch-ready |
| 5 | Workflow / Process Mapping Tool | `/portal/tools/workflow-process-mapping`, `/admin/customers/:customerId/workflow-process-mapping` | Launch-ready |
| 6 | Tool Assignment + Training Tracker | `/portal/tools/tool-assignment-training-tracker`, `/admin/customers/:customerId/tool-assignment-training-tracker` | Launch-ready |
| 7 | Implementation Report / Roadmap surfaces | `report_drafts.report_type='implementation_report'` + `tool_specific` PDFs | Launch-ready (uses accepted Tool-Specific Report + PDF storage) |
| 8 | Repair Map → Implementation connections | `implementation_roadmap_items.source_repair_map_item_id` + `source_finding_id` | Launch-ready |
| 9 | Customer Detail implementation status/actions | `/admin/customers/:customerId` | Launch-ready (no fake global routes for customer-specific tools) |
| 10 | `ImplementationTracker` legacy client tool | `ClientToolShell` driven, frontend-only state | Framework — preserved as a generic in-flight task list. Not the source of truth for the implementation roadmap. |

## Surfaces changed in this pass

- **New shared component** `src/components/tools/ImplementationScopeBanner.tsx`
  — single source of premium copy that makes the included/excluded boundary
  explicit and reminds the client that ongoing visibility is offered separately
  through the RGS Control System™ subscription.
- **Implementation Roadmap (client view)** — banner mounted, scope language preserved.
- **SOP / Training Bible (client view)** — banner mounted with SOP-specific
  included/excluded language; reminds owners to adapt to legal/HR/compliance
  requirements without giving advice.
- **Decision Rights / Accountability (client view)** — banner mounted with
  decision-rights specific language; reinforces that RGS does not make
  operating decisions for the business.
- **Workflow / Process Mapping (client view)** — banner mounted; reinforces
  that RGS maps work but does not run operations for the client.
- **Tool Assignment + Training Tracker (client view)** — banner mounted; makes
  explicit that manual assignment is an exception override and stage-based
  access remains the primary access model.
- **New test** `src/lib/__tests__/implementationToolDeepHardening.test.ts`
  — locks in admin route gating, ClientToolGuard wrapping, no fake global
  customer-scoped routes, banner presence, no admin-only note references in
  client surfaces, and the banned scope-creep vocabulary.

## Surfaces left unchanged and why

- **Admin pages** (`*Admin.tsx`): already gated by `ProtectedRoute requireRole="admin"` and already render admin-only fields and notes. No additional hardening required for this pass.
- **Database migrations + RPCs** (`get_client_implementation_roadmap`, `get_client_sop_training_bible`, `get_client_workflow_process_maps`, `get_client_tool_training_tracker_entries`, `get_client_decision_rights`): already client-safe (`SECURITY DEFINER`, `internal_notes`/`handoff_notes` excluded, `EXECUTE` granted only to `authenticated`). Locked by their existing per-tool contract tests; no schema changes needed.
- **Tool-Specific Report Generator + PDF storage**: accepted in the previous pass; this pass intentionally does not rebuild it. Implementation tools route through the same `report_drafts` + `tool_report_artifacts` flow.
- **`ImplementationTracker.tsx`**: kept as a generic task tracker on `ClientToolShell`; the canonical implementation plan is the Implementation Roadmap tool above.

## Performance / UX improvements

- Single shared banner component avoids duplicating ~6 paragraphs of premium scope copy across 5 tools.
- Each client implementation tool now opens with the same calm, premium scope frame before the data list — improves clarity and reduces "what is this tool for?" friction without adding any new queries.
- No additional client-side data fetches were introduced; banner is pure presentation.

## Data completeness

- Existing schemas already capture: source repair-map item / source finding (roadmap), steps + quality standard + escalation (SOPs), RACI + cadence + escalation (decision rights), trigger + steps + handoffs + bottlenecks + leaks (workflow maps), training/handoff/access-source (tracker).
- Admin-only notes remain separated from `client_summary` in every tool.
- No new fields were required for launch readiness; coverage was verified via the per-tool contract tests already in the suite.

## Report / source readiness

- `implementation_report` remains a registered report type in `src/lib/reports/types.ts`.
- Each implementation tool can flow into the `tool_specific` PDF pipeline through `StoredToolReportsPanel`, with `client_visible` gated on draft approval and `client_safe` flags.
- Roadmap items remain linkable to repair-map items and source findings via `source_repair_map_item_id` / `source_finding_id`.

## Security / access confirmation

- All admin routes: `ProtectedRoute requireRole="admin"`.
- All client routes: `ProtectedRoute` + `ClientToolGuard toolKey=...` (lane/stage gated by `private.get_effective_tools_for_customer`).
- No customer-specific implementation tool is exposed as a fake global admin route.
- No admin notes / handoff notes / internal notes referenced by any client implementation page (asserted by test).
- No frontend secrets introduced.
- No AI auto-publish; report artifacts still require admin approval before client visibility.

## Deferred (not required for launch)

- Per-item drag-to-reorder on the roadmap.
- Auto-generation of roadmap items from `priority_engine_scores`.
- Bulk-create tracker entries from the effective-tool list.
- AI-assisted summarization in SOPs (will land in the AI Assist Wiring pass; backend/admin-reviewed only).

## Confirmation

No core implementation tool remains framework-only. The legacy
`ImplementationTracker` is intentionally a generic task list and is not
counted as a launch-blocking implementation deliverable.