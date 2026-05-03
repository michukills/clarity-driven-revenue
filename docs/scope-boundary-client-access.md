# Scope Boundary & Client Access (P43)

RGS sells three distinct service lanes. The OS enforces that boundary in the
database (not just in UI copy):

## Service lanes

### 1. Diagnostic
One-time paid inspection. Collects evidence, maps slipping gears, scores the
0–1000 Business Stability Scorecard, produces a diagnostic report. Does **not**
include implementation, ongoing support, custom builds, unlimited consulting,
continuous monitoring, or RGS Control System access.

### 2. Implementation
Separate paid engagement. Installs SOPs, workflows, playbooks, standards,
tools, and training guidance derived from the diagnostic. Bounded by project
scope. Not unlimited support. Does **not** automatically include RCS tools.

### 3. RGS Control System™ / Revenue Control System™ (RCS)
Subscription / ongoing visibility lane. Dashboards, priorities, score history,
monitoring, action tracking, bounded advisory interpretation. Not unlimited
implementation. Not emergency support. Not RGS operating the business.

> The Diagnostic finds the slipping gears. Implementation installs the repair
> plan. The RGS Control System keeps the owner connected to the system without
> turning RGS into an ongoing operator inside the business.

## Where the boundary is enforced

- **`private.get_effective_tools_for_customer(_customer_id)`** — single source
  of truth used by both portal and admin surfaces. Returns
  `effective_enabled` + `reason` per tool.
- **`public.get_effective_tools_for_customer`** — thin wrapper. Used by the
  client via `getEffectiveToolsForCustomer` in `src/lib/toolCatalog.ts`.
- **`ClientToolGuard`** — wraps every client tool route. Blocks direct
  navigation when the RPC says the tool is not effectively enabled.
- **`tool_catalog`** — catalog with `tool_type` ∈
  {diagnostic, implementation, tracking, reporting, communication, admin_only}.
  `tool_type = tracking` is the RCS lane.
- **`client_tool_access`** — per-client overrides. Granted overrides bypass
  lane gates (used by admin to grant case-by-case access). Revoked overrides
  always win.

## Lane activation rules (clients only — admins always see everything)

| Lane | Active when |
|---|---|
| Diagnostic | `customers.diagnostic_payment_status ∈ ('paid','waived')` OR `diagnostic_status <> 'not_started'` OR Owner Diagnostic Interview is complete |
| Implementation | `customers.implementation_payment_status ∈ ('paid','waived')` OR stage is one of the active implementation stages |
| RCS | `customers.rcc_subscription_status ∈ ('active','comped')` OR an active implementation stage OR within the 30-day post-implementation grace window |

The Owner Diagnostic Interview gate from P41 still runs on top of the
diagnostic lane gate. `diagnostic_tools_force_unlocked` (admin-only) still
bypasses the interview gate but **not** the diagnostic lane gate — except
through an explicit per-client granted override.

## Reason codes returned by the RPC

New in P43:

- `diagnostic_lane_inactive` — diagnostic engagement not active.
- `implementation_lane_inactive` — implementation engagement not active.
- `rcs_lane_inactive` — RCS subscription/grace not active.

Existing reason codes (`owner_interview_required`, `override_revoked`,
`industry_*`, `snapshot_unverified`, `not_active_client`, `admin_only`,
`hidden`, `unrestricted`, etc.) are unchanged.

## What `ClientToolGuard` shows the client

`ClientToolGuard` intentionally renders a single neutral "not available"
message regardless of reason. Internal reasons, admin notes, lane status, and
payment state are **never** disclosed in the UI. Lane explanations live in the
admin Scope/Access surfaces and in CTAs scoped to the right lane (e.g. the
diagnostic offer page) — not in tool guards.

## What is never exposed to clients

- Admin notes (`admin_only`, internal review notes, scoring rationale).
- Draft reports.
- Other clients' data.
- Implementation tools when implementation is not active.
- RCS tools when RCS is not active.
- Admin-only tools.
- The fact that a tool exists for another industry.

## Banned client-facing copy

Per workspace policy, none of the following may appear in any client-facing
lane / scope copy: `quarterly`, `Diagnostic + ongoing`, unscoped `ongoing`,
`after major changes`, `ask RGS if`, `use anytime`, `upgrade anytime`,
pushy upsell language. Use lane-specific names (`Implementation`,
`RGS Control System`, `Revenue Control System`) instead.

## P43.1 — Stability Journey / My Tools filtering & admin snapshot

The P43 RPC remains the single source of truth for tool access. P43.1 only
shapes how the client-facing portal presents that result.

### Stability Journey / My Tools display rules

- The `My Tools` page hides legacy `resource_assignments` groups whose
  service lane is not active for this client. Lane activity is derived from
  the same RPC the guard uses, so there is no second source of truth.
- Diagnostic-only clients do not see implementation or RGS Control System
  groups by default.
- Implementation clients do not see RGS Control System groups unless the
  RCS lane is active or a tool is explicitly granted via per-client
  override.
- RGS Control System clients do not see implementation groups unless the
  implementation lane is active or a tool is explicitly granted.
- Locked tool tiles are used sparingly. The Owner Diagnostic Interview
  card is the canonical example: it explains the next step without
  exposing internal reason codes.
- Internal reason codes (`diagnostic_lane_inactive`,
  `implementation_lane_inactive`, `rcs_lane_inactive`,
  `owner_interview_required`, `admin_only`) are never rendered in
  client-facing UI.

### Minimal admin Scope / Access Snapshot

`AdminScopeAccessSnapshotPanel` (rendered on the admin Customer Detail
page) shows a read-only summary of:

- Diagnostic lane status, payment status, owner-interview state.
- Implementation lane status, payment status, current pipeline stage.
- RGS Control System lane status, subscription status, post-implementation
  grace flag.
- Active tool assignment count, per-client override count, diagnostic
  force-unlock state.

The panel only reads existing fields. It does not introduce new toggles or
duplicate the existing assignment / override panels above it.

### Deferred

- A larger admin Scope/Access management surface (lane-aware bulk actions,
  audit history) was intentionally deferred. P43.1 is read-only on the
  admin side.