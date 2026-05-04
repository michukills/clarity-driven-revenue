# Industry Brain Enhancements (P63)

## Purpose

Industry Brain Enhancements is an admin-managed system layer that stores
industry-aware examples, templates, risk signals, benchmark notes, and
caution language. These entries support tool outputs across the diagnostic,
implementation, and RGS Control System lanes **without** duplicating tools
per industry.

RGS uses one shared system. Industry Brain entries feed industry-aware copy,
examples, and warnings into shared tools.

## Boundaries

- This is admin-only system logic in P63. There is no client route.
- Entries do not replace tools, deterministic scoring, or owner judgment.
- Entries do not provide legal, tax, accounting, compliance, healthcare, or
  HR determinations.
- Cannabis / MMJ / MMC entries here mean cannabis, dispensary, medical
  marijuana, and recreational marijuana **business operations** — not
  healthcare, patient care, insurance, or claims logic.
- Compliance-sensitive notes are warning and visibility support only. They
  are not legal advice and not a compliance guarantee. State-specific rules
  may apply. Review with qualified counsel or compliance support where
  required.

## Route

- Admin: `/admin/industry-brain` (protected by `ProtectedRoute requireRole="admin"`).
- No client route in P63.

## Schema

Table: `public.industry_brain_entries`

Key columns:
- `industry_key` (`trades_services`, `restaurant_food_service`, `retail`,
  `cannabis_mmj_mmc`, `general_small_business`)
- `industry_label`, `title`, `summary`, `content`, `caution_note`
- `template_type`, `gear`, `service_lane`, `customer_journey_phase`,
  `industry_behavior`
- `related_tool_key`, `tags`, `version`, `status`, `client_visible`
- `internal_notes`, `admin_notes` (admin-only, never client-visible)
- audit columns: `created_by`, `updated_by`, `created_at`, `updated_at`,
  `archived_at`

Enums:
- `industry_brain_industry_key`
- `industry_brain_template_type`
- `industry_brain_gear`
- `industry_brain_status`

## RLS

- RLS is enabled.
- Admin-only policy: `Admin manage industry brain entries`
  (`USING (public.is_admin(auth.uid()))`).
- No client read policy in P63.
- No client-safe RPC in P63.

## Visibility rules

- `client_visible` defaults to `false`. Entries are admin-only by default and
  must be explicitly marked client-visible before any future client surface
  uses them.
- `internal_notes` and `admin_notes` are never displayed to clients.
- Draft and archived entries are not used in client-facing output.

## Relationship to other tools

- P54 Revenue & Risk Monitor, P55 Priority Action Tracker, P56 Owner
  Decision Dashboard, P57 Scorecard History, P58 Monthly System Review,
  P59 Tool Library / Resource Center, P60 Advisory Notes, P61 RGS Stability
  Snapshot / SWOT Analysis Tool, and P62 Financial Visibility may later
  reference industry brain entries through `related_tool_key`. P63 only
  hardens the brain layer; existing tools are not retrofitted in this phase.

## Cannabis / MMJ / MMC rule

Cannabis / MMJ / MMC means dispensary / retail / cannabis business
operations. It does **not** mean healthcare, patient care, insurance, or
claims logic. Cash-heavy or payment-limited operations should be treated as
partial visibility sources, not complete financial truth.

## Relationship to future P60A

The state-specific cannabis compliance monitor and AI rule-change flagging
is a separate, later workstream tracked as **P60A — State-Specific Cannabis
Compliance Monitor + AI Rule Change Flagging**. P63 does not build it.

## Deferred items

- AI industry brain generation
- Automatic industry classification from client input
- Industry-specific scoring weights
- Industry-specific legal/compliance monitoring
- State-specific cannabis compliance monitor (P60A)
- Direct retrofitting of P54–P62 tools to read from industry brain
- Industry-specific public landing pages
- Per-industry duplicate tool copies
- Client-facing industry brain page

## AI

AI assist is deferred. There is a separate later queue item (AI Assist
Wiring Pass). When added, it must be admin-reviewed, backend/edge-only, and
must never bypass `ClientToolGuard`, RLS, or tenant isolation.