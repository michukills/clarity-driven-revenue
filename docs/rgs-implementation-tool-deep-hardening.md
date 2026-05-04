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

---

# Correction Pass — Launch-Readiness Proof

The previous pass added scope banners but did not codify proof of usable tool
functionality. This correction pass adds a launch-readiness proof matrix that
is enforced by `src/lib/__tests__/implementationToolLaunchReadiness.test.ts`.

## Launch-readiness classification

| Tool | Classification | Primary table | Admin route | Client route |
|---|---|---|---|---|
| Implementation Roadmap | **Launch-ready** | `implementation_roadmap_items` (parent: `implementation_roadmaps`) | `/admin/customers/:customerId/implementation-roadmap` | `/portal/tools/implementation-roadmap` |
| SOP / Training Bible | **Launch-ready** | `sop_training_entries` | `/admin/customers/:customerId/sop-training-bible` | `/portal/tools/sop-training-bible` |
| Decision Rights / Accountability | **Launch-ready** | `decision_rights_entries` | `/admin/customers/:customerId/decision-rights-accountability` | `/portal/tools/decision-rights-accountability` |
| Workflow / Process Mapping | **Launch-ready** | `workflow_process_maps` | `/admin/customers/:customerId/workflow-process-mapping` | `/portal/tools/workflow-process-mapping` |
| Tool Assignment + Training Tracker | **Launch-ready** | `tool_training_tracker_entries` | `/admin/customers/:customerId/tool-assignment-training-tracker` | `/portal/tools/tool-assignment-training-tracker` |
| Scope Boundary / Client Access Rules | **Launch-ready** (enforcement, not a CRUD tool) | `tool_catalog` + `client_tool_access` + `private.get_effective_tools_for_customer` | n/a | enforced by `ClientToolGuard` |
| Implementation Report / Roadmap surfaces | **Launch-ready** | `report_drafts` + `tool_report_artifacts` (preserved from accepted pass) | `/admin/report-drafts/:id` | `/portal/reports` |
| Repair Map → Implementation connections | **Launch-ready** (FK) | `implementation_roadmap_items.source_repair_map_item_id`, `.source_finding_id` | n/a | n/a |
| Customer Detail implementation actions | **Launch-ready** | `customers.implementation_status`, `track`, `implementation_started_at`, `implementation_ended_at` | `/admin/customers/:customerId` | n/a |
| `ImplementationTracker` (legacy generic tracker) | **Auxiliary — not required for launch** | none (frontend-only `ClientToolShell` state) | n/a | `/portal/tools/implementation-tracker` |

## Per-tool proof

Each Launch-ready row above is enforced by the new
`implementationToolLaunchReadiness.test.ts` suite, which asserts:

1. **Schema completeness** — the primary table contains every required field
   for an implementation deliverable (customer_id, source links, title,
   client_summary, internal_notes, status, client_visible, archived_at, plus
   tool-specific fields listed below).
2. **RLS enabled** on the primary table.
3. **Admin save behavior** — the admin lib exposes create/update/archive
   helpers AND the admin page wires at least one of them and exposes a
   `client_visible` toggle.
4. **Client-safe RPC** — `SECURITY DEFINER`, `EXECUTE` revoked from `PUBLIC`
   and granted only to `authenticated`, and the function body never selects
   `internal_notes` or `handoff_notes`.
5. **Client read path** — the client page calls only the safe RPC and never
   references admin-only notes.
6. **Route gating** — admin route is `requireRole="admin"` and customer-scoped
   (no fake global route); client route is wrapped in `ClientToolGuard` with
   the correct `toolKey`.
7. **Scope hygiene** — no banned scope-creep wording or out-of-scope advice on
   either the admin or client surface.
8. **Premium UX** — `ImplementationScopeBanner` is mounted on every
   implementation client page.
9. **Customer Detail integration** — every customer-scoped admin tool slug
   appears in `src/pages/admin/CustomerDetail.tsx`.

### Field coverage by tool (asserted by the launch-readiness suite)

- **Implementation Roadmap (`implementation_roadmap_items`)**
  customer_id · roadmap_id · source_repair_map_item_id · source_finding_id ·
  title · client_summary · internal_notes · priority · phase · owner_type ·
  status (`impl_roadmap_item_status`: draft / not_started / in_progress /
  waiting_on_client / waiting_on_rgs / blocked / complete / archived) ·
  deliverable · success_indicator · client_visible · archived_at.

- **SOP / Training Bible (`sop_training_entries`)**
  customer_id · implementation_roadmap_item_id · title · purpose · role_team ·
  trigger_when_used · inputs_tools_needed · quality_standard ·
  common_mistakes · escalation_point · owner_decision_point · training_notes ·
  client_summary · internal_notes · steps (jsonb) · version · status ·
  review_state · client_visible · archived_at.

- **Decision Rights / Accountability (`decision_rights_entries`)**
  customer_id · implementation_roadmap_item_id · sop_training_entry_id ·
  title · business_area · decision_or_responsibility · decision_owner ·
  action_owner · approver · consulted · informed · escalation_path ·
  handoff_trigger · decision_cadence · client_summary · internal_notes ·
  status · client_visible · archived_at.

- **Workflow / Process Mapping (`workflow_process_maps`)**
  customer_id · implementation_roadmap_item_id · title · process_purpose ·
  process_trigger · current_state_summary · desired_future_state_summary ·
  process_owner · primary_roles · systems_tools_used · handoff_points ·
  decision_points · bottlenecks · rework_loops · steps (jsonb) ·
  client_summary · internal_notes · status · client_visible · archived_at.

- **Tool Assignment + Training Tracker (`tool_training_tracker_entries`)**
  customer_id · tool_key · tool_name_snapshot · service_lane ·
  customer_journey_phase · access_source · access_status · training_required ·
  training_status · trained_people · trained_roles · training_method ·
  training_date · next_training_step · client_expectation ·
  rgs_support_scope · handoff_status · handoff_notes · client_summary ·
  internal_notes · status · client_visible · archived_at.

## Save / review behavior

- Each admin page imports an `adminCreate*` and `adminUpdate*` helper from its
  lib (`src/lib/implementationRoadmap.ts`, `sopTrainingBible.ts`,
  `decisionRights.ts`, `workflowProcessMapping.ts`, `toolTrainingTracker.ts`)
  and exposes a `client_visible` toggle. Items default to `client_visible =
  false` and `status = draft` so nothing reaches the client until the admin
  releases it.
- Client-safe RPCs filter to `client_visible = true`, `archived_at IS NULL`,
  and `status <> 'draft'` so unreleased or archived data is invisible to the
  client even at the database layer.
- `internal_notes` and `handoff_notes` are stripped at the RPC layer and never
  rendered on any client page (asserted).

## Report / source readiness

- `implementation_report` remains a registered `report_type` in
  `src/lib/reports/types.ts` (asserted).
- `tool_specific` remains a registered `report_type` (asserted).
- `report_drafts` and `tool_report_artifacts` tables remain (asserted).
- Each implementation tool's data can be drafted into a `report_draft` and
  exported / stored as a tool-specific PDF via `StoredToolReportsPanel`.
  Visibility to the client requires admin approval AND the artifact's
  `client_visible` flag — the previously accepted Tool-Specific Report pass
  enforces this.

## Repair Map connection (proof)

`implementation_roadmap_items` carries
`source_repair_map_item_id uuid` and `source_finding_id uuid`, allowing each
roadmap item to trace back to a repair-map item and/or originating diagnostic
finding. No duplicate repair-map system was introduced.

## Customer Detail integration (proof)

`src/pages/admin/CustomerDetail.tsx` links to all five customer-scoped
admin tool slugs (`implementation-roadmap`, `sop-training-bible`,
`decision-rights-accountability`, `workflow-process-mapping`,
`tool-assignment-training-tracker`) — asserted by the launch-readiness suite.

## Security / access confirmation (re-verified)

- Admin routes: `ProtectedRoute requireRole="admin"` (asserted).
- Client routes: `ProtectedRoute` + `ClientToolGuard toolKey=...` (asserted).
- No fake global admin routes for customer-scoped implementation tools
  (asserted).
- Tenant isolation enforced by `customer_id` FK + RLS (asserted).
- Client RPCs `SECURITY DEFINER` with explicit admin/owner check; never
  return `internal_notes`/`handoff_notes` (asserted).
- No frontend secrets introduced.
- No AI auto-publish; report visibility still requires admin approval.

## Remaining gaps (not launch-blocking)

- Drag-to-reorder for roadmap items.
- Auto-seed of roadmap items from `priority_engine_scores`.
- Bulk-create of tracker entries from the effective-tool list.
- AI-assisted SOP summarization (lands in AI Assist Wiring; backend +
  admin-reviewed only).

No required launch implementation tool remains framework-only.