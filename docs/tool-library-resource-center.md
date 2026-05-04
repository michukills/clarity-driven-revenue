# P59 — Tool Library / Resource Center

## Purpose
Stage-aware, lane-aware, client-safe reference library for approved RGS guides,
templates, checklists, worksheets, explainers, and training/decision/report/SOP
support materials. Lives inside the RGS Control System™ umbrella as a support
surface — not a public blog, file dump, or replacement for any tool.

## Boundaries
- Not a separate service lane.
- Not a replacement for `tool_catalog`. Tool routes stay in `tool_catalog`;
  the Resource Center references them via `related_tool_key`.
- Not a project-management suite, valuation tool, forecast tool, or unlimited
  advisory channel.
- Resources are support materials. They do not replace owner judgment and do
  not substitute for accounting, legal, tax, compliance, payroll, or HR review.
- The legacy `resources` + `resource_assignments` tables remain unchanged and
  continue to power per-customer assignment flows. P59 is additive.

## Routes
- Client: `/portal/tools/tool-library` — gated by
  `ClientToolGuard toolKey="tool_library_resource_center"`.
- Admin: `/admin/customers/:customerId/tool-library` — protected by
  `ProtectedRoute requireRole="admin"`.

## tool_catalog classification
| field | value |
|---|---|
| tool_key | `tool_library_resource_center` |
| tool_type | `reporting` (closest existing enum value to library/support) |
| default_visibility | `client_available` |
| status | `active` |
| service_lane | `shared_support` |
| customer_journey_phase | `rcs_ongoing_visibility` |
| industry_behavior | `all_industries_shared` |
| requires_active_client | `true` |
| contains_internal_notes | `true` |
| can_be_client_visible | `true` |

## Schema — `public.tool_library_resources`
- `customer_id` nullable. `NULL` = global resource available to all eligible
  clients; non-null = customer-specific.
- Classification: `service_lane`, `customer_journey_phase`,
  `industry_behavior` (all CHECK-constrained against the same vocabularies as
  `tool_catalog`).
- Resource shape: `title`, `slug`, `summary`, `body`, `resource_type`,
  `related_tool_key`, `related_gear`, `external_url`, `cta_label`,
  `tags` (jsonb), `industry_notes` (jsonb), `display_order`.
- Lifecycle: `status` enum (`draft` / `published` / `archived`),
  `client_visible` boolean, `archived_at` timestamp.
- Admin-only: `internal_notes`, `created_by`, `updated_by`.
- Enums: `tlr_status`, `tlr_resource_type`, `tlr_related_gear`.

## RLS
- Admins (`is_admin(auth.uid())`): full manage.
- Clients: `SELECT` allowed only when
  `client_visible = true AND status = 'published' AND archived_at IS NULL`
  AND (`customer_id IS NULL` OR `user_owns_customer(auth.uid(), customer_id)`).

## Client-safe RPC — `public.get_client_tool_library_resources(_customer_id)`
- Verifies `auth.uid()`, requires admin or owner of `_customer_id`.
- Returns only safe fields. Excludes `internal_notes`, `status`,
  `client_visible`, `requires_active_client`, `archived_at`,
  `industry_notes`, `created_by`, `updated_by`.
- Applies the same `client_visible / published / non-archived` filter.

## Stage-based access
- Default access flows through `tool_catalog` →
  `private.get_effective_tools_for_customer` → `ClientToolGuard`.
- The Resource Center surface itself is gated by the tool key. Per-resource
  filtering by lane/phase beyond the published/visible filter is treated as a
  future enhancement and is not enforced server-side today; the admin curates
  publishing decisions.

## Deferred (NOT in P59)
- File upload / PDF storage / versioning.
- Resource favorites or bookmarks.
- AI drafting / AI tagging (covered by the later AI Assist Wiring Pass).
- Direct Monthly System Review → resource recommendation links.
- SOP / Training Bible attachments.
- Per-resource manual assignment override system.
- Public (unauthenticated) resource library.
- Open / view analytics.
- Notification fan-out on publish.

## AI
Deferred. No AI wiring is included in P59. AI assist (drafting, tagging,
suggested resources) will be added in the dedicated AI Assist Wiring Pass.
Any future AI must remain admin-reviewed, edge-function only, scope-safe,
tenant-safe, and never publish to clients without admin approval.
