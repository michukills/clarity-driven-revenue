# RGS Stability Snapshot

_Status: P20.18 — added to the Diagnostic Report draft engine._
_Status: P20.19 — admin review surface added in `ReportDraftDetail`._
_Status: P20.20 — client-facing renderer + PDF/export gating added._

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

## P20.19 — Admin review surface

Admins review the snapshot in the report draft detail page
(`/admin/report-drafts/:id`) via `StabilitySnapshotReviewPanel`. The panel
is rendered above the rendered draft sections and supports:

- Per-item edits to **text** and **evidence summary**.
- Per-item **confidence** dropdown (`High` / `Medium` / `Low`).
- Per-item **gear toggles** mapped to the five RGS Stability System™ gears
  (`demand_generation`, `revenue_conversion`, `operational_efficiency`,
  `financial_visibility`, `owner_independence`).
- Per-section **status** dropdown (`Draft`, `Needs Review`, `Approved`).
- Adding or removing items per section.
- Regenerate (re-runs the deterministic snapshot via the same
  "Regenerate" path as the surrounding draft).

The structured snapshot is persisted inside the existing `draft_sections`
JSON column as `draft_sections.stability_snapshot` — no schema migration
required. When the panel is edited, the matching `rgs_stability_snapshot`
section body is re-rendered from the structured object, so the readable
text view stays in sync with the structured admin view.

### Client-ready gating

The snapshot is **admin-only** unless **all** of the following are true:

1. Every section status is `Approved`.
2. The overall snapshot status (derived in `deriveOverallStatus`) is
   `Approved`.
3. The parent report draft itself is `approved`.

On parent-draft approval, the snapshot is stamped with `reviewed_at` and
`reviewed_by` at save time so downstream renderers can trust it.

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

- provide legal, tax, accounting, or healthcare/clinical advice
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

## P20.20 — Client renderer + export

### Client-ready gate (strict)

The structured snapshot is **client-visible** only when every condition
below is true. The single source of truth is
`isSnapshotClientReadyForDraft(snapshot, draftStatus)` in
`src/lib/reports/stabilitySnapshot.ts`:

1. `draft_sections.stability_snapshot` exists.
2. `stability_snapshot.overall_status === "Approved"`.
3. **Every** snapshot section status === `"Approved"`.
4. Parent report draft `status === "approved"`.

If any condition fails:

- The structured snapshot is **not** rendered to the client.
- Partial / draft snapshot content is **not** exposed in portal views.
- It is **not** included in PDF/export output.
- Admins can still see and edit it internally.

### Where the snapshot now renders (client-facing)

- `src/components/reports/StabilitySnapshotClientView.tsx` — reusable
  client-facing component. Title is always
  **"RGS Stability Snapshot™"** (never "SWOT Analysis"). Each item
  shows plain-English text, gear chips, and an understated confidence
  label.
- `src/components/bcc/ReportRenderer.tsx` — the client-facing report
  renderer used by the portal report view. Renders the snapshot when
  `report_data.rgs_stability_snapshot` is present **and**
  `isSnapshotClientReady` returns `true`. Placement is **after** the
  Stability Benchmark / executive summary and **before** the deeper
  trend / stop-start-scale sections, so it acts as the executive
  orientation layer.
- `src/pages/admin/ReportDraftDetail.tsx` — admin sees the same
  client-facing component as a "Client preview" block, gated by the
  identical helper.

### PDF / export pipeline

- `src/lib/exports.ts`
  - `buildStabilitySnapshotPdfSections(snapshot)` returns
    `PdfSection[]` blocks (heading + subheadings + bullet paragraphs)
    using the same client-facing labels as the on-screen renderer.
  - `appendStabilitySnapshotIfClientReady(snapshot, draftStatus)` is
    the **gated** helper. Returns `[]` unless
    `isSnapshotClientReadyForDraft` passes. All export call sites use
    this helper so the gating cannot be accidentally bypassed.
  - Gear keys render as plain compact labels (e.g. "Finance",
    "Owner Independence") because jsPDF does not support chip styling.
- `ReportDraftDetail` exposes a **Download PDF** button that is
  disabled until the snapshot + draft are fully approved. The PDF
  appends the gated snapshot blocks after the client-safe sections.

### Backward compatibility

- Older `report_drafts` rows without `draft_sections.stability_snapshot`
  continue to render the rest of the draft normally — the helper
  returns `false`, no client view is shown, no export blocks are
  appended.
- `business_control_reports.report_data` rows without
  `rgs_stability_snapshot` render exactly as before — the field is
  optional and additive in `ReportSnapshot`.
- `parseReportSnapshot` passes `rgs_stability_snapshot` through
  verbatim when present; downstream renderers re-check
  `isSnapshotClientReady` before display.

### Language guard (client-facing)

- Allowed: **"RGS Stability Snapshot™"**, "Current Strengths to
  Preserve", "System Weaknesses Creating Instability", "Opportunities
  After Stabilization", "Threats to Revenue / Control".
- Never client-facing: "SWOT Analysis", "MMC", "patient", "clinical",
  "diagnosis", "treatment", "insurance claim". MMJ businesses stay
  framed as cannabis retail / POS / inventory operations.
- Enforced by tests in
  `src/components/reports/__tests__/stabilitySnapshotClientViewP20_20.test.tsx`
  and `src/lib/reports/stabilitySnapshot.test.ts`.

### Tests added (P20.20)

- Gating helper:
  - missing snapshot → false
  - snapshot approved but parent draft not approved → false
  - snapshot not approved + draft approved → false
  - fully approved end-to-end → true
- Client view: renders client-facing title, all four section labels,
  no "SWOT Analysis" / no MMC / no healthcare wording.
- `ReportRenderer`: legacy reports without snapshot do not crash;
  approved snapshot renders; unapproved snapshot does not render.
- PDF export: excludes when not approved; includes client-facing
  labels when approved; never emits "SWOT Analysis" or healthcare
  language.
