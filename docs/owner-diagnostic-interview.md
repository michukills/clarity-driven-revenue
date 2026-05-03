# P41 — Owner Diagnostic Interview + Personalized Diagnostic Sequence

## Summary
New paid diagnostic clients see only the **Owner Diagnostic Interview** until
it is completed. On completion, a deterministic recommended order for the
remaining diagnostic tools is generated and persisted; admins can override.

## Data model
- `customers.owner_interview_completed_at` (timestamptz)
- `customers.diagnostic_tools_force_unlocked` (boolean, admin escape hatch)
- `diagnostic_tool_sequences` (one row per customer): `ranked_tool_keys[]`,
  `rationale jsonb`, `admin_override_keys[]`, `admin_override_by/at`.
- Interview answers reuse `diagnostic_intake_answers`, keys defined in
  `src/lib/diagnostics/ownerInterview.ts`.

## Gate
Enforced inside `private.get_effective_tools_for_customer`: for non-admin
callers, every `tool_type='diagnostic'` row except `owner_diagnostic_interview`
and `scorecard` reports `effective_enabled=false` with reason
`owner_interview_required` until completion (or force-unlock, or per-tool
admin grant). Admins always see the full catalog. `ClientToolGuard` rejects
direct route hits using the same RPC, so there is no frontend-only bypass.

## Sequencing
`mark_owner_interview_complete(_customer_id)` validates 18 required answers,
stamps `owner_interview_completed_at`, and writes a deterministic ranked list
based on five theme signals (demand, conversion, ops, finance, owner
independence). Tools not flagged are appended in a stable default order so
every paid client always gets the full pillar set.

## Admin override
`set_diagnostic_tool_sequence_override(_customer_id, _ranked_tool_keys)` —
admin-only. Empty array reverts to the auto sequence. Surfaced in
`DiagnosticSequenceAdminPanel` on the customer detail page; the same panel
toggles `diagnostic_tools_force_unlocked`.

## Tests
`src/lib/__tests__/ownerInterviewSequenceContract.test.ts` pins the
catalogue/SQL contract and the override resolver behavior.

## Untouched
Payment flow, invite-only account creation, admin notifications, portal
login, tenant isolation, blog system, report visibility, and all P28–P40
protections are untouched.