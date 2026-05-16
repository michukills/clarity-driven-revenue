# P102A — RGS Tool Registry + Visibility + Access Architecture Repair

## Root cause of visibility failure (verified)

The codebase has **four parallel registries**, none of which is a single source of truth:

1. `REPORTABLE_TOOL_CATALOG` — `src/lib/reports/toolReports.ts` (reportable tools, service lane)
2. `GIG_TOOL_REGISTRY` + `FULL_CLIENT_ONLY_TOOLS` — `src/lib/gig/gigTier.ts` (gig eligibility, tiers, excluded sections)
3. `ELIGIBILITY` map — `src/lib/standaloneToolRunner.ts` (standalone runnable / gig use-case)
4. `TOOL_REPORT_SECTION_CATALOG` — `src/lib/reports/toolReportSectionCatalog.ts` (report section sets)
5. Admin nav arrays — `src/components/portal/PortalShell.tsx`

Consequences:
- **Campaign Control Center has no entry in any of these**. It has routes (`/admin/campaign-control`, `/admin/customers/:id/campaign-control`, `/portal/tools/campaign-control`) but no admin nav link, no `REPORTABLE_TOOL_CATALOG` entry, no `ELIGIBILITY` entry, and no `standaloneToolRoutes` mapping. It only exists in `gigToolKeyMap.ts` as an alias.
- Standalone Tool Finder iterates `REPORTABLE_TOOL_CATALOG` → cannot show Campaign Control.
- `resolveStandaloneToolRoute` has no `campaign_control` / `campaign_brief` / `campaign_strategy` entries → falls to "unavailable".

## Scope (strict — only visibility, navigation, access; no new functionality)

### 1. Central RGS Tool Registry (consolidation, not duplication)
Create `src/lib/toolRegistry/rgsToolRegistry.ts` as the single source of truth that **composes** from existing registries (does not replace them):
- imports `REPORTABLE_TOOL_CATALOG`, `GIG_TOOL_REGISTRY`, `FULL_CLIENT_ONLY_TOOLS`, `TOOL_REPORT_SECTION_CATALOG`, `resolveStandaloneToolRoute`
- exposes `RGSToolEntry` with all fields the brief requires (tool_key, display_name, category, lifecycle_zone, gears, access_scope, allowed_account_types, allowed_customer_types, allowed_lifecycle_states, gig_capable, minimum_gig_tier, full_client_only, admin_visible, client_visible, standalone_visible, diagnostic_visible, implementation_visible, control_system_visible, report_capable, supported_report_modes, route_resolver, disabled_reason_resolver, safe_copy_notes, forbidden_claim_notes)
- exposes pure `resolveToolVisibility({ toolKey, surface, customer, gigTier, gigStatus, accountKind, role })` → `{ visible, enabled, reason, route, badges, reportModes }`

### 2. Register missing tools — primarily Campaign Control
- Add `campaign_control` (admin command), `campaign_brief` (gig-eligible Basic+), `campaign_strategy` (Premium gig + full client), `campaign_video_plan` (Premium gig + full client sub-tool) into:
  - `REPORTABLE_TOOL_CATALOG` (new service lane `"campaign_marketing"`)
  - `standaloneToolRunner.ts` ELIGIBILITY map (with safe gig use-case copy)
  - `standaloneToolRoutes.ts` CUSTOMER_SCOPED + ADMIN_GLOBAL maps
  - Operational Friction Scan (public — registry-only entry, no route exposure changes)

### 3. Admin nav — surface Campaign Control
- `src/components/portal/PortalShell.tsx`: add Campaign Control to `adminWorkspaces` group, between Implementation Workspace and RGS Business Control. Single nav item to `/admin/campaign-control`. Calm copy; no posting/scheduling/analytics language.

### 4. Standalone Tool Finder
- Standalone Tool Runner already iterates `listStandaloneTools()` which reads `REPORTABLE_TOOL_CATALOG`. Once Campaign tools are registered, they appear automatically with correct gig gating via existing `useGigCustomerScope` + `checkGigToolAccess`. No engine changes.

### 5. Tests (new)
- `src/lib/__tests__/p102aRgsToolRegistryContract.test.ts`
  - Every entry has required fields; no duplicate `tool_key`s.
  - Campaign Control + Campaign Brief + Campaign Strategy + Campaign Video Plan present.
  - SOP, Workflow, Decision Rights, ICP, SWOT, Campaign Brief, Campaign Video Plan are `report_capable=true` with matching section catalog entries.
  - `full_client_only` tools (diagnostic_scorecard, owner_interview, evidence_vault, diagnostic_report, priority_repair_map, implementation_roadmap, control_system, revenue_risk_monitor) have `gig_capable=false`.
- `src/lib/__tests__/p102aResolveToolVisibility.test.ts`
  - `surface=admin_nav` → Campaign Control visible for admin.
  - `surface=admin_standalone_finder` + gig basic → `campaign_brief` enabled, `campaign_strategy` disabled with `"This tool is not included in this gig package."` reason.
  - `surface=admin_standalone_finder` + gig customer + `diagnostic_scorecard` → disabled with full-client-only reason.
  - `surface=public_funnel` → only `operational_friction_scan` visible.
  - Archived gig customer → all tools disabled with archived reason.
- `src/lib/__tests__/p102aCopySafety.test.ts`
  - No registry entry copy contains: "auto-post", "scheduled", "guaranteed", "paid ads", "live analytics", "guaranteed leads/ROI/revenue", legal/tax/compliance/medical certification.

### 6. Acceptance verification
- Run `npm test` (or `bunx vitest run`) for the new tests + regression: P100A gig wiring, P101 report mode + section catalog, P102 industry depth.
- Typecheck via existing harness.

## Out of scope (explicitly NOT changed)
- `/scan`, `/scorecard → /scan` redirect, `/diagnostic/scorecard` protection
- RLS policies (no DB migration)
- Remotion worker / Campaign Video render pipeline
- Report content generation, PDF engine, AI brain
- Public funnel pages, brand pass, industry depth
- Client portal full redesign (only registry hooks, no rendered UI changes outside admin nav)
- Adding new functional features to any tool

## Files
- **new**: `src/lib/toolRegistry/rgsToolRegistry.ts`
- **new**: `src/lib/__tests__/p102aRgsToolRegistryContract.test.ts`
- **new**: `src/lib/__tests__/p102aResolveToolVisibility.test.ts`
- **new**: `src/lib/__tests__/p102aCopySafety.test.ts`
- **edit**: `src/lib/reports/toolReports.ts` (add 4 campaign entries; add `"campaign_marketing"` service lane)
- **edit**: `src/lib/standaloneToolRunner.ts` (add ELIGIBILITY entries for the 4 keys)
- **edit**: `src/lib/standaloneToolRoutes.ts` (add admin route mappings)
- **edit**: `src/components/portal/PortalShell.tsx` (add Campaign Control nav item)
