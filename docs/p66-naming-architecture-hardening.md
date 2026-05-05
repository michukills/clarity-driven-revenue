# P66 — Full RGS Naming Architecture Hardening Pass

## Approach

Naming was hardened **non-destructively**. We introduced a single canonical
registry (`src/config/rgsNaming.ts`) and updated the highest-visibility
public surfaces (Diagnostic offer page, Scorecard finalizer, Homepage step
copy) to use the premium ™ names. Routes, database tables, enums, RLS
policies, storage paths, and scoring logic were intentionally **not**
renamed — display labels are the right unit of change.

## Canonical names (registry)

See `src/config/rgsNaming.ts` for the full export. Highlights:

| Concept | Canonical name |
| --- | --- |
| Parent brand | Revenue & Growth Systems LLC / RGS |
| Positioning | Business Systems Architecture for Owner-Led Companies |
| Framework | The RGS Stability System™ (5 gears) |
| Scorecard | RGS Business Stability Scorecard™ (0–1000) |
| Paid diagnostic | RGS Business Stress Test™ ($3,000) |
| Diagnostic report | RGS Structural Health Report™ |
| Action plan | RGS Repair Map™ (30/60/90) |
| Core OS | RGS Blueprint Engine™ |
| Monthly platform | RGS Control System™ ($1,000/mo) |
| Revenue subsystem | Revenue Control System™ |
| Ledger | RGS System Ledger™ |
| Evidence | RGS Evidence Vault™ |
| Cannabis/MMJ evidence | Compliance Evidence Vault™ (with disclaimer) |
| Risk monitor | Revenue & Risk Monitor™ / Worn Tooth Signals™ |
| ROI | Cost of Friction Calculator™ |
| Value lens | Stability-to-Value Lens™ (with disclaimer) |
| Scope | Architect’s Shield™ / Architect’s Shield Scope Agreement |
| Admin portal | RGS Command Center™ |
| Client portal | RGS Client Portal |
| AI layer | RGS Draft Assist™ |
| Contradiction flags | Reality Check Flags™ |
| Implementation offer | RGS System Installation™ |

## What changed in this pass

- Added `src/config/rgsNaming.ts` (single source of truth) with two
  scope-safety disclaimers: `COMPLIANCE_EVIDENCE_VAULT_DISCLAIMER` and
  `STABILITY_TO_VALUE_DISCLAIMER`.
- `src/pages/DiagnosticOffer.tsx` — hero badge, hero copy, "What you
  receive" bullets, "How it works" step, and the primary CTA label all
  now use the registry. `RGS Business Stress Test™`, `RGS Structural
  Health Report™`, `RGS Repair Map™`, `RGS Business Stability
  Scorecard™`, and `The RGS Stability System™` are surfaced.
- `src/pages/Scorecard.tsx` — "What happens with this read" now refers
  to the `RGS Structural Health Report™` and `30/60/90 RGS Repair Map™`.
- `src/pages/Index.tsx` — Step 03 of the "How RGS works" rail now
  references the Structural Health Report™ and Repair Map™ explicitly.
- `src/lib/__tests__/p66NamingArchitectureHardening.test.ts` — pins the
  registry, verifies adoption on the three public surfaces above, and
  forbids guaranteed-results / done-for-you / "we manage everything"
  language on those surfaces.
- `aiAssistWiringContract.test.ts` allow-list updated to permit the new
  test file's literal naming references.

## Intentionally preserved (not renamed in P66)

- All routes (`/revenue-control-system`, `/diagnostic`, `/scorecard`,
  `/portal/*`, `/admin/*`).
- All Supabase tables, enums, columns, storage buckets, RLS policies.
- Existing tool registry keys (`revenue_control_center`, `scorecard`,
  `weekly_alignment_system`, etc.).
- Public route slugs (SEO continuity).
- The `Revenue Control System™` label (it is the revenue subsystem
  inside the `RGS Control System™` umbrella, exactly per the spec).
- The "Diagnostic" / "Implementation" short labels in the homepage
  pricing cards — they remain the customer-facing short names; the
  premium ™ names appear in supporting copy and on the offer pages.

## Follow-up scope (intentionally deferred)

- A broader rename sweep across admin-portal headings (Command Center
  framing), portal report-builder copy, PDF export footers, EULA/scope
  document copy, and email templates — these are large surfaces and
  belong in P67–P69 alongside the structural / evidence / scope passes
  that touch the same files.
- Cannabis/MMJ surfaces will adopt `Compliance Evidence Vault™` and the
  registry's disclaimer in the P67 evidence-vault hardening pass so the
  vault label and storage layout are tightened together.
- Reality Check Flags™ display surfaces are deferred to P70, where the
  contradiction-detection logic is implemented; introducing the label
  earlier would imply behavior that does not yet exist.

## Security / scope verification

- No route paths, table names, or RLS policies were modified.
- No frontend secrets were introduced.
- No AI scoring / auto-publish behavior was added.
- Public copy adds no guarantees, no done-for-you promises, no
  legal/tax/compliance certification claims (regression-tested).
- Deterministic scoring remains the source of truth.