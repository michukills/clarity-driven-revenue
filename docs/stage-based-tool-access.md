# P49.1 — Stage-Based Tool Access + Tool Walkthrough Rule

## Why this changed

Earlier passes implied that client tool access was driven primarily by manual
admin assignment. That was never the security model — `private.get_effective_tools_for_customer`
(P43 / P43.1) has always derived access from customer lifecycle, payment, and
lane state — but the language and admin UI made manual assignment look like
the source of truth.

P49.1 formalizes the model the backend already enforces and reframes manual
assignment as a secondary override layer.

## Access hierarchy (top wins)

1. **Hard security**
   - RLS, tenant isolation, authentication, payment / invite gates,
     admin-only restrictions, report / note visibility.
2. **Stage-based automatic access** (default)
   - Derived from `customers.lifecycle_state`, `customers.stage`,
     `diagnostic_payment_status` / `diagnostic_status` / `owner_interview_completed_at`,
     `implementation_payment_status` / `implementation_started_at` / `implementation_ended_at`,
     `rcc_subscription_status` / `rcc_paid_through`.
   - Mapped to `tool_catalog.tool_type` / `service_lane` / `customer_journey_phase`
     (P48.2 classification).
3. **Manual overrides** (`client_tool_access`)
   - `granted` — exception/early access; bypasses lane gates but never RLS,
     never admin-only, never `default_visibility = 'hidden'`.
   - `revoked` — always wins for that client/tool pair.
4. **Force-unlock** (`diagnostic_tools_force_unlocked`)
   - Narrow override that bypasses the P41 owner-interview gate only.

## Stage → tool mapping

Implemented by `private.get_effective_tools_for_customer`. Summary:

| Active stage / lane | Tools auto-enabled (client) |
|---|---|
| Public, pre-client | `scorecard` |
| Diagnostic lane active (paid/waived OR diagnostic_status started OR owner interview done) | `owner_diagnostic_interview`; after owner interview: pillar diagnostic tools (`rgs_stability_scorecard`, `buyer_persona_tool`, `customer_journey_mapper`, `revenue_leak_finder`, `process_breakdown_tool`) per visibility |
| Implementation lane active (paid/waived OR active impl stage) | `implementation_roadmap`, `sop_training_bible`, `decision_rights_accountability`, `implementation_command_tracker`, `implementation_foundation_system`, `priority_tasks` |
| RGS Control System lane active (subscription active/comped, active impl stage, or 30-day post-impl grace) | `revenue_control_center`, `revenue_risk_monitor`, `revenue_tracker`, `quickbooks_sync_health` |
| Always | shared support: `client_service_requests`, `evidence_uploads`, `weekly_alignment_system` (per visibility) |
| Never auto-exposed to clients | every `tool_type = 'admin_only'` row, anything with `default_visibility IN ('admin_only','hidden')`, `report_drafts`, `diagnostic_workspace` |

Diagnostic clients **do not** automatically see implementation or RCS tools.
RCS clients **do not** automatically see implementation tools unless
implementation lane is also active or a manual override grants it.

## My Tools / Stability Journey

- Render only what `get_effective_tools_for_customer` returns as enabled for
  the signed-in client.
- Locked states stay sparse and use friendly copy from `REASON_LABEL`. Raw
  reason codes never appear in client UI.
- Admin-only tools are filtered out at the RPC level (the WHERE clause
  excludes `tool_type = 'admin_only'` and `default_visibility` of
  `admin_only` / `hidden` for non-admins) and again by `ClientToolGuard`.

## Admin Scope / Access Snapshot

The admin Customer Detail surface continues to show:

- Lane state (Diagnostic / Implementation / RGS Control System) derived from
  the same fields the RPC uses.
- Counts of stage-default assignments vs. per-client overrides vs. force-unlock.
- Per-tool effective state and reason via `ToolAccessPanel`.

Copy reframes manual grants/revokes as **overrides** on top of the
stage-default access — not the primary access model.

## Industry behavior (P48.2 preserved)

- `requires_industry` tools still require an admin-confirmed industry and a
  verified business snapshot.
- Cannabis / MMJ / MMC / dispensary is treated as cannabis/dispensary logic,
  never as general healthcare.
- Unknown industry falls back to general logic; no fabricated benchmarks,
  no compliance or legal claims.

## Tool walkthrough — future rule

Every client-facing tool should eventually ship a lightweight, dismissible,
re-accessible guided walkthrough that explains:

- what the tool is for
- when to use it
- what good output looks like
- what the client should do next
- what RGS / admin reviews
- what is **outside** the tool's scope

Constraints:

- plain language, no fake proof, no scope creep
- never exposes internal notes, draft content, or admin-only logic
- industry-aware copy where the underlying tool is industry-aware
- never blocking; remembers dismissal per user

No walkthrough component is built in P49.1. This rule is documentation only
and applies to all future client-facing tools.

## Risks / deferred

- Walkthrough component / pattern not implemented yet.
- Admin Scope panel could later show per-tool stage-default vs. override
  badges; current version already exposes override pills in `ToolAccessPanel`.
- No data migration in this pass.