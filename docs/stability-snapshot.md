# RGS Stability Snapshot

_Status: P20.18 — added to the Diagnostic Report draft engine._

The **RGS Stability Snapshot** is a SWOT-style diagnostic interpretation
layer attached to the Diagnostic Report. Internally we describe it as a
SWOT-style diagnostic layer; the **client-facing title is always
"RGS Stability Snapshot"** — never "SWOT Analysis".

It does not replace deterministic scoring, gear scoring, the priority
engine, provider metrics, or the repair roadmap. It turns the existing
evidence into a plain-English business interpretation an admin can review
before delivery.

## Sections

1. **Current Strengths to Preserve**
2. **System Weaknesses Creating Instability**
3. **Opportunities After Stabilization**
4. **Threats to Revenue / Control**

Each section has a `status` (`Draft`, `Needs Review`, `Approved`) and
each item has a `confidence` (`High`, `Medium`, `Low`).

## Input sources

The generator reads the existing `EvidenceSnapshot` produced by
`src/lib/reports/evidenceCollector.ts`, including:

- Customer profile (industry, lifecycle, stage, stated revenue)
- Connected sources (`customer_integrations`)
- QuickBooks period summaries
- Weekly RCC check-ins
- Owner-dependence items
- Operational SOPs and bottlenecks
- Receivables / overdue invoices
- Latest scorecard run + confidence

Provider-imported metrics (Square / Stripe / Dutchie via P20.13–P20.17)
feed the same evidence pipeline, so they are included automatically.

## Gear mapping

Weaknesses, threats, and opportunities map to one or more of the five
RGS Stability System™ gears:

- `demand_generation` → Gear 1
- `revenue_conversion` → Gear 2
- `operational_efficiency` → Gear 3
- `financial_visibility` → Gear 4
- `owner_independence` → Gear 5

The mapping reuses existing gear IDs from
`src/lib/gears/targetGear.ts` (no parallel naming).

## Confidence and low-evidence handling

- **High** — direct supporting score / metric / intake evidence.
- **Medium** — supported by multiple related signals.
- **Low** — weak evidence; usually requires admin review.
- A section with mostly low-confidence items is marked **Needs Review**.
- If any section is **Needs Review**, the overall snapshot is
  **Needs Review** and must not be auto-delivered to a client.
- Empty / missing evidence does **not** invent precise numbers, margins,
  staffing, or compliance issues.

## Admin review

The snapshot is generated as part of the deterministic report draft and
stored inside `draft_sections` as the `rgs_stability_snapshot` section,
plus a structured `stability_snapshot` field on the in-memory
`DraftPayload`. The section is marked `client_safe: false` until an
admin explicitly reviews and promotes it. Admins can edit section text
through the existing report editor (`/admin/report-drafts/:id`) and
approve via the standard report draft approval flow.

## Report placement

Insertion order in the Diagnostic Report draft:

1. Executive Summary
2. Current System Read
3. Evidence Used
4. Revenue / Cash / Pipeline Findings _(when applicable)_
5. **RGS Stability Snapshot**
6. Primary Risks
7. Recommended Next Actions
8. Missing Information / Validation Needed
9. Confidence Notes
10. Admin Review Notes

## Cannabis / MMJ wording rule

Cannabis businesses are framed as **regulated cannabis retail / POS /
inventory** operations — never as healthcare.

- Use: cannabis/MMJ, MMJ cannabis, cannabis retail, regulated cannabis
  retail, POS, inventory, product/category movement, discounts,
  promotions, transaction reporting, payment/POS reconciliation,
  reporting cadence.
- Never use: MMC, patient, clinical, diagnosis, insurance, claim,
  provider (in a healthcare sense), appointment, reimbursement,
  treatment, medical record, healthcare provider.

These rules are enforced by tests in
`src/lib/reports/stabilitySnapshot.test.ts`.

## Safety / professional boundaries

The snapshot must not:

- provide legal, tax, or medical advice
- guarantee revenue outcomes
- diagnose people
- make unsupported compliance claims
- overstate certainty
- invent precise numbers
- imply RGS is operating the business for the client

It stays within: business systems, operational stability, revenue
visibility, process control, owner independence, repair prioritization.

## Remaining gaps

- Snapshot is currently surfaced via the existing report draft sections
  loop. A dedicated section-level UI (per-item gear chips, confidence
  badges, item-level approve/reject) is not yet built.
- No standalone client-facing tool. Admin review is the gate.
- Industry-specific bullets are intentionally conservative: they only
  appear when minimum supporting evidence is present.
- Per-item review state (`Approved` per bullet) is not yet persisted
  separately from the section-level status.

## Recommended next slice

`p.20.19.stability-snapshot-admin-review-ui` — a dedicated review
surface in `ReportDraftDetail` to edit, approve, and promote the
snapshot per-section/per-item before client delivery.
