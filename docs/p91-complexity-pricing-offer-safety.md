# P91 — Complexity-Based Pricing + Offer Tiering + Founding Client Sales Safety

Status: implemented as a production-safe sales/scope/pricing hardening pass.

## Central Pricing Source

Pricing guidance now lives in `src/config/rgsPricingTiers.ts`.

This config does not replace the existing `offers` table or Stripe edge functions. Exact checkout/payment-link prices still resolve server-side from the offer catalog. The P91 config is the sales and scope guidance layer used by public copy, admin reference panels, tests, and standalone deliverable guidance.

Approved positioning sentence:

> RGS builds the operating structure owners use to see what is slipping, decide what to fix, and run the business with more control.

## Complexity Tiers

Tier 1 — Solo / Micro:

- Diagnostic usually starts around $2,500.
- Implementation typically ranges from $7,500-$15,000.
- RGS Control System usually starts around $1,500/month.

Tier 2 — Growth:

- Diagnostic is often around $5,000.
- Implementation typically ranges from $15,000-$40,000.
- RGS Control System is often around $3,000/month.

Tier 3 — Scaled / Multi-Role:

- Diagnostic starts at $10,000+.
- Implementation typically ranges from $50,000-$100,000+.
- RGS Control System starts at $5,000+/month.

Final pricing depends on complexity, evidence depth, implementation scope, HITL review level, reporting depth, and monitoring needs.

## Founding Client / Beta Partner

Founding-client pricing is marked `founding_client_only`.

- Diagnostic / RGS Business Stress Test: $1,500-$2,500.
- Implementation / RGS System Installation: $7,500-$10,000 for clearly scoped first repair-map items.
- RGS Control System: $1,000-$1,500/month for a defined term.

Requirements are limited to candid feedback, UX friction feedback, and permissioned/anonymized proof material only where approved. No testimonial, case study, or business result is promised.

## Offer Boundaries

Diagnostic:

- One-time business system inspection.
- Identifies slipping gears.
- Uses the 0-1000 Business Stability Scorecard where applicable.
- Produces Stability Snapshot, Priority Repair Map, and report walkthrough/clarification where included.
- Does not include implementation, custom builds, execution, open-ended consulting, continuous monitoring, or RGS operating the business.

Implementation:

- Project-based system installation support.
- Uses diagnostic findings and the repair map.
- Builds or installs SOPs, workflows, tools, playbooks, operating standards, training guidance, and decision rights.
- Requires defined scope, timeline, and deliverables.
- Does not include indefinite advisory access, open-ended consulting, emergency response, or RGS acting as operator.

RGS Control System:

- Ongoing visibility and guided independence.
- Revenue Control System lives inside the broader RGS Control System.
- Includes dashboards, score history, evidence freshness, priority tracking, monitoring of selected signals, and bounded advisory interpretation.
- Does not include implementation outside subscription scope, emergency support, execution inside the business, or licensed professional review.

Standalone Deliverables:

- Limited-scope outputs from eligible individual tools.
- Do not equal a full Diagnostic unless purchased.
- Do not include Implementation or RGS Control System access unless purchased separately.
- Use the P90 report workflow where wired and admin-reviewed.

## Exact Checkout Honesty

Current exact offer records are preserved and documented in `EXACT_CHECKOUT_FLOWS`:

- `rgs_diagnostic_3000`: wired public non-client fixed-scope Diagnostic checkout.
- `rgs_implementation_10000`: existing-client admin payment-link offer.
- `rgs_revenue_control_1000_monthly`: existing-client admin subscription-link offer.

Public pages no longer present these as the complete current pricing model. They are reconciled as exact offer-catalog records while the forward pricing model is complexity-based.

## Admin UI

`/admin/offers` now includes `RgsPricingReferencePanel`.

The panel is read-only. It gives admin a safe reference for:

- tier name
- complexity range
- Diagnostic, Implementation, and RGS Control System guidance
- founding-client ranges
- price factors
- offer boundaries
- exact checkout/payment-link honesty
- standalone deliverable ranges

No new pricing table, editable settings system, RLS policy, or checkout system was created.

## Client/Public Safety

Client-safe pricing helpers strip `admin_only_note`. Public pages use scope-based language and keep exact checkout language limited to the wired Diagnostic checkout page.

Unsafe claims are blocked by `src/lib/__tests__/p91PricingOfferSafety.test.ts`, including:

- outcome promises
- fake legal/tax/accounting/compliance/valuation claims
- fake live-sync/export claims
- deprecated positioning wording
- confusing standalone deliverable scope

## Standalone Deliverable Framework

Added guidance for:

- SOP / Training Bible Draft: $250-$750
- Owner Time Audit: $250-$500
- Lead Tracking / Revenue Leak Review: $300-$750
- Operational Leakage Snapshot: $500-$1,500
- Cannabis / MMJ Operational Documentation Readiness Snapshot: $750-$2,500
- Trades / Home Services Dispatch & Labor Leakage Snapshot: $500-$1,500

Cannabis/MMJ/MMC remains cannabis/dispensary operations logic, not healthcare. Compliance-sensitive outputs say to review with qualified counsel/compliance support where required.

## Security / RLS Impact

No database tables, RLS policies, RPCs, or edge-function trust boundaries were changed for pricing configuration. Existing Stripe flows continue resolving prices server-side through the `offers` table. No frontend secrets were introduced.

## Deferred

- Backend editable pricing settings.
- New public `/pricing` page.
- Automated complexity-to-offer quote generation.
- New Stripe products for every complexity tier.
- Founding-client contract templates.
