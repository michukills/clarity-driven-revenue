# Tool Assignment + Training Tracker (P51)

## Purpose

Document and explain — per client — which implementation tools are part of the
client's stage-default access, which were granted/revoked as exceptions,
training status, who was trained, what the client/team is expected to do with
each tool, and whether handoff is complete.

This tool **documents** access and training. It does not replace the actual
access-control system. Tool availability still flows through:

- stage-based defaults (lifecycle/stage/lane/payment),
- `tool_catalog` classification metadata,
- `client_tool_access` overrides,
- `private.get_effective_tools_for_customer` RPC,
- `ClientToolGuard`.

## Classification

| Field | Value |
|---|---|
| tool_key | `tool_assignment_training_tracker` |
| service_lane | `implementation` |
| customer_journey_phase | `training_handoff` |
| industry_behavior | `all_industries_shared` |
| tool_type | `implementation` |
| default_visibility | `client_available` |
| requires_active_client | true |
| contains_internal_notes | true |
| can_be_client_visible | true |

## Access

- Diagnostic-only clients: not visible by default.
- Implementation-stage clients: automatically receive it via stage-based access.
- RGS Control System™-only clients: not visible unless separately assigned.
- Admin: full manage access.

## Routes

- Client: `/portal/tools/tool-assignment-training-tracker` — gated by `ClientToolGuard`.
- Admin: `/admin/customers/:customerId/tool-assignment-training-tracker` — `requireRole="admin"`.

## Data model

Table: `public.tool_training_tracker_entries`

Fields include `tool_key`, `tool_name_snapshot`, `service_lane`,
`customer_journey_phase`, `access_source`, `access_status`, `training_required`,
`training_status`, `trained_people`, `trained_roles`, `training_method`,
`training_date`, `next_training_step`, `client_expectation`,
`rgs_support_scope`, `handoff_status`, `handoff_notes` (admin-only),
`client_summary`, `internal_notes` (admin-only), `status`, `sort_order`,
`client_visible`, `archived_at`.

### access_source

- `stage_default` — included via current stage/lane.
- `manual_grant` — exception override granted.
- `manual_revoke` — exception override revoked.
- `admin_only` — admin-only tool, never client-visible.
- `locked` — not currently available (lane/stage/payment/subscription).

### access_status

`available` · `locked` · `revoked` · `hidden` · `admin_only`

### training_status

`not_required` · `not_started` · `scheduled` · `in_progress` ·
`completed` · `needs_refresh` · `blocked`

### handoff_status

`not_started` · `in_progress` · `handed_off` · `needs_follow_up` · `not_applicable`

## RLS / access control

- `ENABLE ROW LEVEL SECURITY` on `tool_training_tracker_entries`.
- Admin policy: full manage.
- Client policy: SELECT only own entries where
  `client_visible = true`, not archived, `status <> 'draft'`.
- Client-safe RPC `public.get_client_tool_training_tracker_entries(_customer_id)`
  — `SECURITY DEFINER`, never returns `internal_notes` or `handoff_notes`,
  excludes `admin_only` access_status, requires admin or owner.
- `EXECUTE` revoked from `PUBLIC`, granted only to `authenticated`.

## Visibility rules

Clients never see:

- `internal_notes`
- `handoff_notes`
- other clients' entries
- archived entries
- draft entries
- admin-only tools
- raw reason codes (client UI uses `ACCESS_SOURCE_CLIENT_LABEL`).

## Banned / scope-creep wording

The tracker must never imply unlimited support, unlimited training, guaranteed
adoption / employee performance / results / revenue / ROI, fully automated
training, replacement of management / legal / compliance review, "RGS trains
everyone for you", "RGS manages the team for you", done-for-you / full-service,
"we run your business", "hands-off for the owner", "use anytime", "upgrade
anytime", "ask RGS if", or "Diagnostic + ongoing".

Contract tests guard these phrases.

## AI assist

Deferred to the AI Assist Wiring Pass. No AI patterns are wired in P51.

## Deferred

- Bulk-create tracker entries from the effective-tool list.
- Linking tracker entries to roadmap items / SOPs / decision rights / workflow maps.
- AI-assisted summarization of training notes.