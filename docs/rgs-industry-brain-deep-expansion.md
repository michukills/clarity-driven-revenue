# RGS Industry Brain — Deep Expansion + Variable Coverage Hardening

## Why this pass exists

The Industry Brain (P63) shipped as a thin starter set: 2–3 entries per
industry. Screenshots showed misleading "100% default tool coverage"
badges in the admin tool surfaces. This pass deepens the seeded entries
and clarifies the coverage language without weakening any access gate.

## Audit findings

- **Schema** — `public.industry_brain_entries` already exists with the
  correct enums, RLS, admin-only policy, and audit triggers. No schema
  redesign needed.
- **Admin route** — `/admin/industry-brain` is wired through
  `ProtectedRoute requireRole="admin"`.
- **Client exposure** — there is no `/portal/industry-brain` route and the
  customer portal shell does not link to it.
- **Seed depth** — only ~11 rows existed (3/3/3/3/2). Cannabis row was
  thin. No repair-map or tool-readiness rows existed per industry.
- **Tool-coverage UI** — `ToolCatalog.tsx`, `ToolMatrix.tsx`, and
  `AdminLeakIntelligencePanel.tsx` rendered `coveragePct` raw. The
  Catalog/Matrix panels said "100% default tool coverage" / "100% default
  coverage", which read as a completeness guarantee.

## Industries expanded

- Trades / Field Service (`trades_services`)
- Restaurant / Food Service (`restaurant_food_service`)
- Retail (`retail`)
- Cannabis / MMJ / MMC / Rec (`cannabis_mmj_mmc`)
- General / Mixed Small Business (`general_small_business`)

## Variable categories now covered per industry

Each industry now has admin-only entries spanning:

- revenue streams & concentration
- demand / lead source attribution
- conversion / follow-up / handoff
- operational workflow & capacity
- financial visibility (margin, cash, AR, reconciliation)
- owner-dependence risks
- staffing / training / certification
- customer handoff & post-sale follow-through
- software / POS / CRM / accounting evidence sources
- margin / profitability drivers
- compliance-sensitive notes (cannabis only — visibility & warning support
  only, not legal advice, not a compliance guarantee)
- repair-map implications
- tool / report readiness mapping

## Cannabis / MMJ / MMC safety handling

Cannabis entries are dispensary / retail / operations logic only:
POS/menu accuracy, inventory traceability, cash handling, ID/age
verification workflow, vendor & license documents, regulated marketing
constraints, budtender consistency, product/category margin pressure.

They are **not** healthcare, patient-care, insurance, claims, HIPAA,
medical billing, or clinical workflow logic. The contract test rejects
any positive-framing healthcare/patient-care wording in the cannabis
seed; explicit "not healthcare or patient-care" negations are allowed.

## Tool-coverage language changes

- `src/pages/admin/ToolCatalog.tsx` — "100% default tool coverage" → at
  100%: "Default tools mapped"; otherwise: "X% of default tools mapped".
- `src/pages/admin/ToolMatrix.tsx` — "100% default coverage" → same
  treatment.
- Lane-level percentages on the same screens already display a numeric
  badge with a tone color and remain unchanged (they are read alongside
  the new copy).
- `AdminLeakIntelligencePanel.tsx` was already factual ("X%" with
  configured/missing/restricted breakdown) and was not changed.

## Files changed

- new migration: deep-expansion seeds + uniqueness index on
  `(industry_key, title)`.
- `src/pages/admin/ToolCatalog.tsx` — coverage copy softened.
- `src/pages/admin/ToolMatrix.tsx` — coverage copy softened.
- new test: `src/lib/__tests__/industryBrainDeepExpansion.test.ts`.
- new doc: this file.
- updated audit doc: `docs/rgs-os-feature-hardening-audit.md`.

## Routes / components touched

- `/admin/industry-brain` — IndustryBrainAdmin (unchanged code; deeper
  data).
- `/admin/tool-catalog` — ToolCatalog copy.
- `/admin/tool-matrix` — ToolMatrix copy.

## Report / source readiness

Each industry now has an explicit "Tool readiness for …" entry listing
the relevant report and tool surfaces (Diagnostic Report, RGS Stability
Snapshot, Implementation Roadmap, SOP / Training Bible, Decision Rights,
Workflow / Process Mapping, Tool Assignment + Training Tracker, Revenue
& Risk Monitor, Priority Action Tracker, Owner Decision Dashboard,
Scorecard History, Monthly System Review, Financial Visibility), and an
explicit "Software / POS / CRM evidence sources" entry naming the
expected systems of record.

## AI / context readiness

No AI surface was added or wired in this pass. If/when the deferred AI
Assist Wiring Pass connects Industry Brain entries as context, it must
remain backend/edge-only, admin-reviewed, and never bypass
`ClientToolGuard`, RLS, or tenant isolation. Industry Brain entries do
not replace deterministic scoring and are admin-only by default.

## Security / access confirmation

- `industry_brain_entries` RLS unchanged: admin-only `FOR ALL` policy via
  `public.is_admin(auth.uid())`.
- New entries default to `client_visible = false`.
- No client-safe RPC was added.
- No frontend secrets introduced.
- No admin-only fields exposed to clients.
- Cannabis entries are not a compliance certification.

## Deferred items

- AI Industry Brain generation / context wiring.
- Automatic industry classification from client input.
- Industry-specific scoring weights.
- P60A — State-Specific Cannabis Compliance Monitor + AI Rule Change
  Flagging.
- Direct retrofitting of P54–P62 tools to read from the Industry Brain.
- Per-industry public landing pages.
- Client-facing Industry Brain page.