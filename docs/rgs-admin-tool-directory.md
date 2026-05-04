# Admin Command Center — Tool Directory

## Audit findings
- The Admin Command Center (`/admin`, `AdminDashboard.tsx`) previously surfaced
  portfolio panels and `CommandGuidancePanel`, but had no consolidated, scrollable
  menu of every separated RGS tool. Admins had to navigate via the sidebar or dig
  into customer detail pages to reach individual tools.
- A scan of `src/App.tsx` shows 70+ `/admin/*` routes plus customer-scoped
  `/admin/customers/:customerId/*` tool routes. Many tools are intentionally
  customer-specific and do not have a global admin route.

## What changed
- Added `src/components/admin/AdminToolDirectory.tsx`: a Sheet-based, scrollable
  Tool Directory triggered by an "Open Tool Directory" button in the Command
  Center header.
- Wired the trigger into `src/pages/admin/AdminDashboard.tsx` next to the loading
  indicator so admins can open the directory from any state of `/admin`.

## Grouping logic
Tools are grouped by service lane:
1. **Diagnostic** — diagnostic workspace, intake review, scorecard, leak finder,
   report drafts, saved benchmarks.
2. **Implementation** — implementation workspace, roadmap, SOP bible, decision
   rights, workflow mapping, tool assignment, tool distribution.
3. **RGS Control System** — control system umbrella, revenue & risk monitor,
   priority action tracker, owner decision dashboard, scorecard history, monthly
   review, advisory notes, financial visibility, BCC, RGS review queue.
4. **Admin / System** — customers, pending accounts, client health, industry
   brain, tool catalog/library/matrix, walkthrough videos, reports, service
   requests, tasks, templates, imports, files, integration planning, system
   readiness, settings.

Each entry carries lane, optional pillar, access label (admin-only / client-facing
/ admin + client review), reportable badge where relevant, and a short purpose
statement.

## Search / filter
- Free-text search across name, purpose, and pillar.
- Lane chips (`All`, `Diagnostic`, `Implementation`, `RGS Control System`,
  `Admin / System`).
- Sticky header (search + chips) inside the Sheet, with a `ScrollArea` body that
  handles long lists without horizontal overflow.

## Customer-specific tools (not linked globally)
The following tools are surfaced in the directory but intentionally **do not**
expose a global admin route — they require customer context and are reached from
a client record. This preserves tenant isolation, ClientToolGuard semantics, and
access boundaries:
- Implementation Roadmap
- SOP / Training Bible
- Decision Rights & Accountability
- Workflow / Process Mapping
- Tool Assignment + Training Tracker
- RGS Control System™ (per-customer surface)
- Revenue & Risk Monitor
- Priority Action Tracker
- Owner Decision Dashboard
- Scorecard History
- Monthly System Review
- Advisory Notes / Clarification Log
- Financial Visibility

Each is labeled "Customer-specific tool — open from a client record." A test
(`adminToolDirectory.test.ts`) enforces that customer-scoped entries never carry
a global `href`.

## Security / access
- The directory is rendered only inside `AdminDashboard`, which is wrapped in
  `ProtectedRoute requireRole="admin"` in `src/App.tsx`.
- Every linked route maps to an existing `path="/admin/..."` route also wrapped
  with `ProtectedRoute requireRole="admin"`. A test asserts each `href` exists
  in `App.tsx`.
- No frontend secrets, AI auto-publishing, ClientToolGuard bypass, or
  client-only routes are exposed.
- No fake tools, fake metrics, fake proof, guarantees, or compliance/healthcare
  language is introduced (enforced by test).

## Deferred
- Live status badges (e.g. "needs review" counts) per tool — would require
  per-tool aggregate queries; out of scope for this pass.
- Pillar metadata for tools that don't currently have a single canonical pillar.
- A persistent in-page section (the directory is currently a Sheet/drawer) — can
  be added in a future polish pass if telemetry shows admins want it always-on.

## Testing
- `src/lib/__tests__/adminToolDirectory.test.ts` (8 tests): mounting in Command
  Center, lane coverage, route validity, customer-scoped safety, scroll/search
  presence, language safety, metadata completeness, and required-surface
  coverage (Owner Diagnostic Interview, Stability Scorecard, Scorecard Leads,
  Saved Benchmarks, Diagnostic Workspace, SWOT Analysis, Persona Builder,
  Journey Mapper, Process Breakdown).
- Full suite: **5,162 tests passed across 128 files.**

## Update — Coverage pass
Added directory entries for previously-missing audited routes/surfaces:
`Persona Builder`, `Journey Mapper`, `Process Breakdown`, `Intelligence Demo`
(global admin routes), and `SWOT Analysis` (customer-scoped, opens from a
client record). All entries link only to routes that exist in `src/App.tsx`
under `ProtectedRoute requireRole="admin"`.