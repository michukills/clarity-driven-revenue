# SWOT Analysis Tool (P61)

_Status: P61 — added as a standalone admin-curated SWOT-style tool. Separate from
the existing **RGS Stability Snapshot** (P20.18–P20.20) embedded in the Diagnostic
Report Builder._

## Purpose

The SWOT Analysis Tool gives RGS admins a structured way to organize ongoing
business observations into Strengths, Weaknesses, Opportunities, and Threats —
connected to RGS gears, diagnostic evidence, and planning context.

It is **evidence organization**, not a guarantee, scoring replacement, decision
replacement, or substitute for qualified accounting / legal / tax / compliance
review. RGS does not choose strategy for the owner; it organizes evidence so the
owner can see the system more clearly.

## Boundaries

- Does NOT replace deterministic scoring or the 0–1000 Business Stability Scorecard.
- Does NOT replace the diagnostic report, repair map, or implementation roadmap.
- Does NOT replace owner judgment.
- Does NOT replace qualified legal / accounting / tax / compliance / payroll / HR review.
- NOT real-time messaging or open-ended advisory.
- NOT a guarantee of any business outcome.

## Routes

- Client: `/portal/tools/swot-analysis`
  - Gated by `<ClientToolGuard toolKey="swot_analysis_tool">`.
  - **Client-facing label is "RGS Stability Snapshot"** — never "SWOT Analysis"
    on the client surface. This honors the language guard from
    `docs/stability-snapshot.md` (P20.18–P20.20) so client wording stays
    consistent across the diagnostic report and the ongoing snapshot view.
- Admin: `/admin/customers/:customerId/swot-analysis`
  - Protected by `<ProtectedRoute requireRole="admin">`.
  - Admin surface is labeled "SWOT Analysis Tool (Admin)".

## tool_catalog classification

| field | value |
|---|---|
| `tool_key` | `swot_analysis_tool` |
| `service_lane` | `shared_support` |
| `customer_journey_phase` | `rcs_ongoing_visibility` |
| `industry_behavior` | `all_industries_shared` |
| `tool_type` | `reporting` |
| `default_visibility` | `client_available` |
| `requires_active_client` | `true` |
| `contains_internal_notes` | `true` |
| `can_be_client_visible` | `true` |

## Schema — `public.swot_analysis_items`

Per-customer SWOT items. Domain columns:

- `customer_id`, `title`
- `swot_category` (`strength` / `weakness` / `opportunity` / `threat`)
- `status` (`draft` / `active` / `reviewed` / `converted` / `archived`)
- `priority` (`low` / `normal` / `high` / `needs_attention`)
- `service_lane`, `customer_journey_phase`, `industry_behavior`
- `related_tool_key`, `related_source_type`, `related_source_id`, `related_gear`
- `client_visible_summary`, `client_visible_body`
- `evidence_note`, `recommended_next_step`
- `internal_notes`, `admin_notes` — admin-only, never returned by client RPC
- `tags`, `client_visible`, `pinned`, `display_order`, `archived_at`

CHECK constraints align `service_lane`, `customer_journey_phase`, and
`industry_behavior` with the same vocabularies used by P54–P60.

## RLS

- Admin policy: full management via `is_admin(auth.uid())`.
- Client SELECT policy: `client_visible = true AND archived_at IS NULL AND status NOT IN ('draft','archived') AND user_owns_customer(auth.uid(), customer_id)`.

## Client-safe RPC

`public.get_client_swot_analysis_items(_customer_id uuid)`:

- `SECURITY DEFINER`, restricted to admins or owners of the customer.
- Filters by `client_visible = true`, `archived_at IS NULL`,
  `status NOT IN ('draft','archived')`.
- Returned columns **explicitly exclude** `internal_notes`, `admin_notes`,
  `status`, `created_by`, `updated_by`.
- Ordered by `swot_category`, `pinned DESC`, `display_order`, `updated_at`.

## Relationship to other tools (P54–P60, P20.18–P20.20)

- **RGS Stability Snapshot (P20.18–P20.20)**: lives inside the Diagnostic Report
  Builder, persisted in `draft_sections.stability_snapshot`. Tied to a specific
  diagnostic report draft. SWOT Analysis Tool (P61) is the **ongoing**
  per-customer SWOT log that lives in the RGS Control System™ umbrella and is
  not bound to any one report draft. The two surfaces share the same
  client-facing language ("RGS Stability Snapshot") so clients see consistent
  terminology.
- **Revenue & Risk Monitor (P54)**, **Priority Action Tracker (P55)**,
  **Owner Decision Dashboard (P56)**, **Scorecard History (P57)**,
  **Monthly System Review (P58)**, **Tool Library (P59)**,
  **Advisory Notes (P60)**: SWOT items can reference these via
  `related_tool_key` / `related_source_type` / `related_source_id`. Direct
  cross-tool conversion workflows (e.g. "convert SWOT item to Priority Action")
  are deferred — see below.

## Stage-based access

Access is gated by `ClientToolGuard` against `tool_catalog`. Stage/lane filtering
beyond `client_visible` + status + tenant scope is deferred to the existing
`private.get_effective_tools_for_customer` access pattern; SWOT items are
classified with `service_lane` / `customer_journey_phase` / `industry_behavior`
metadata so future stage filtering can use those fields without schema changes.

## Deferred (not built in P61)

- AI-generated SWOT items / AI evidence summarization (deferred to the global
  AI Assist Wiring Pass).
- Convert SWOT item → Priority Action / Owner Decision / Advisory Note workflows.
- Monthly System Review / Resource Center direct references to SWOT items.
- File upload / attachments on SWOT items.
- Public SWOT worksheet, PDF export, SWOT scoring, competitive intelligence
  scraping, market research automation.

## AI rule

AI assist is deferred for P61. When added later it must be backend/edge-function
only, admin-reviewed, never client-visible without explicit admin approval, and
clearly labeled as "AI draft" / "AI assist" / "review assist".
