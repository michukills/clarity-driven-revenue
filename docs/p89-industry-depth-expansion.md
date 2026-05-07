# P89 Industry Depth Expansion

## Status
Production-safe completion target for the General Industry Deterministic Depth
Hardening Sweep.

This pass extends the existing P86C/P87/P88 industry depth architecture. It
does not create a duplicate Industry Brain, repair-map system, tool route,
access model, scoring engine, AI scorer, or client-facing automation claim.

## Scope
- Adds 85 deterministic expansion metrics across five industries:
  - General Small Business
  - Restaurant / Food Service
  - Retail
  - Professional Services
  - E-commerce / Online Retail
- Adds admin annotations for each expansion metric:
  - admin-only note
  - repair trigger
  - source-of-truth conflict capable flag
- Adds helper functions for admin catalog review and client-safe metric
  rendering.
- Extends the existing admin Industry Operational Depth panel so admins can
  inspect the full deterministic metric catalog by industry.

## Quick-Start Templates
The expansion reuses the existing Quick-Start template registry and validates
the newly added templates:
- opening_closing_checklist
- inventory_count_sheet
- client_onboarding_checklist
- customer_support_response_tracker
- stockout_backorder_log
- owner_time_audit_worksheet
- proposal_pipeline_tracker
- channel_concentration_review

Templates remain honest about what is currently wired. No export, PDF,
download, connector, or live-sync behavior is claimed unless it exists.

## Admin Visibility
Admins may see:
- metric key and label
- gear mapping
- trigger rule
- threshold
- evidence examples
- repair-map recommendation
- recommended Quick-Start templates
- admin-only note
- repair trigger
- source-of-truth conflict capable flag

The repair trigger is an additive admin annotation. It helps an admin decide
whether a metric should inform a repair-map discussion, but it does not
automatically create repair-map items.

## Client Visibility
Client-safe helpers may expose:
- metric label
- gear labels
- client-safe explanation
- evidence example labels
- repair-map recommendation
- recommended Quick-Start template titles

Client-safe helpers strip:
- metric keys
- raw trigger rules
- admin-only notes
- repair triggers
- raw source-of-truth conflict flags
- raw internal evidence keys
- internal scoring or catalog IDs

No broad client catalog was forced into the portal. Existing client UI remains
limited to already approved, client-safe contexts.

## Source-of-Truth Conflict Handling
Metrics marked `source_of_truth_conflict_capable` are discoverable for admin
review through helper functions. They point to the existing Source-of-Truth
Conflict Flag(TM) system as a review path.

This pass does not auto-create conflict flags, auto-publish findings, or imply
live connector monitoring.

## Repair-Map Trigger Handling
P89 repair triggers are additive admin annotations. They are intentionally not
treated as the existing repair priority engine's trigger source and do not
pretend to generate repair-map items automatically.

## Positioning Guard
Approved sentence:

"RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control."

Deprecated brick/building metaphor wording is guarded by contract tests.

## Security
- No new tables.
- No new RLS policies.
- No new client routes.
- No new RPCs.
- No frontend secrets.
- No AI wiring.
- No tenant data movement.
- Existing admin/client route boundaries remain unchanged.

## AI
AI is deferred to the later AI Assist Wiring Pass. P89 remains deterministic
and admin-reviewed.

## Testing Checklist
- P89 regression tests validate combined metric depth, gear coverage, field
  completeness, valid Quick-Start references, admin annotations, repair trigger
  annotations, source-of-truth conflict discoverability, client-safe stripping,
  forbidden client-safe claims, honest connector/manual-upload language, and
  positioning guards.
- P86/P87/P88 regression tests remain required.
- Typecheck and build remain required before release.

## Deferred
- Automatic repair-map item creation.
- Automatic source-of-truth conflict creation.
- Client-facing full metric catalog.
- AI-assisted metric review summaries.
- Connector-based live monitoring claims.
