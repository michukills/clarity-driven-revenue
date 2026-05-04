# RGS OS — Feature Hardening Audit (P66)

This pass focused on **hardening** existing surfaces flagged as too weak in
the previous Welcome / Guided Command / Walkthrough work, rather than
building new modules. It did not create duplicate dashboards, tool tables,
report systems, or AI systems.

## Audited surfaces

Client-facing:

- `/portal` (`CustomerDashboard.tsx`) — guided welcome integration, command
  center sections, operating companion, scorecard, priorities, tools list.
- `GuidedClientWelcome` — stage greeting, "Where you are / What RGS is
  doing / Your next step" trio, canonical product sentence.
- `ToolWalkthroughCard` — video card or fallback content.
- Diagnostic tools, implementation tools, RGS Control System tools (route
  inventory only).

Admin-facing:

- `/admin` (`AdminDashboard.tsx`) — `CommandGuidancePanel`, RGS Action
  Inbox, priority queue, matrix alerts.
- `/admin/walkthrough-videos` (`WalkthroughVideosAdmin.tsx`) — metadata
  CRUD, approval, archive.
- Existing admin tool/report surfaces (route inventory only — not modified
  in this pass).

Shared systems:

- Stage/lane access logic via `clientStage.ts` and `portal.ts`.
- Client-safe RPC for walkthrough videos
  (`get_client_tool_walkthrough_videos`).
- Report-draft RLS / ai-status review states (unchanged this pass).

## Issues found

1. Walkthrough fallback was a single weak line ("Walkthrough video coming
   soon"), making most tool surfaces feel unfinished.
2. Client welcome card answered "where you are" but did not answer "what
   is **not** required from you yet" or "what happens after this step",
   which are the two questions owners typically ask next.
3. Admin command panel only surfaced four counts and was framed as a
   passive info strip, not a command center.
4. Admin walkthrough manager had no readiness/status matrix — admins had
   to open each record individually to know which ones were missing
   transcript / captions / approval.
5. There was no per-tool written guidance source of truth, so each tool
   would have re-invented its own copy.

## What was hardened

- **Per-tool written guides** (`src/lib/toolGuides.ts`) added as the
  canonical fallback. Each guide answers: what the tool is for, what to
  gather, what a good submission looks like, what happens after submit /
  who reviews it, and the scope boundary. Voice is calm, owner-respecting,
  no guarantees, no legal/tax/HR/compliance advice, no healthcare/HIPAA
  framing for cannabis tools.
- **`ToolWalkthroughCard`** now renders the written guide as a polished
  fallback when no approved video exists — never invents a video, never
  shows a placeholder URL.
- **`GuidedClientWelcome`** extended with two status-aware bands: "What
  is not required from you yet" and "What happens after this step", plus
  tightened "How RGS works" copy reaffirming RGS-as-architect.
- **`clientStage.ts`** extended with `notRequiredYet` and `afterNextStep`
  per stage, keeping a single source of truth for stage copy.
- **`CommandGuidancePanel`** reframed as "Today's operating priorities"
  and extended with two more existing safe signals (open client requests,
  walkthroughs not yet approved). All counts come from existing review
  queues; no client surfaces are bypassed.
- **`WalkthroughVideosAdmin`** gains a readiness matrix at the top:
  per-tool video status, transcript / captions / client-visible flags,
  the missing items, and the recommended next action.

## Security / access confirmation

- All admin pages remain behind `ProtectedRoute requireRole="admin"`
  (unchanged).
- Client routes remain behind `ProtectedRoute` and `ClientToolGuard`
  where applicable (unchanged).
- Client walkthrough card continues to fetch via the client-safe
  `get_client_tool_walkthrough_videos` RPC, which excludes
  `internal_notes`, requires `video_status='approved'`,
  `client_visible=true`, and `archived_at IS NULL`.
- No new tables, RPCs, or migrations were created in this pass.
- No frontend secrets were introduced; no AI provider keys are read from
  the client; AI surfaces remain admin-reviewed and not client-visible by
  default.

## What remains weak / deferred

- Per-tool embedding of `ToolWalkthroughCard` inside individual tool
  pages is still a rollout. The reusable pattern + canonical guide
  registry are now in place; embedding into each tool route can proceed
  incrementally without reopening this work.
- Real walkthrough video recordings remain to be produced; this pass
  intentionally avoided fake or placeholder URLs.
- Several legacy admin tool pages (`*Admin.tsx`) still have varying
  copy/structure quality. They were inventoried but not rewritten here
  to keep the change set focused. A future hardening pass should bring
  them onto a shared admin-page shell.
- Tier-aware AI prompt tightening, Storage-backed PDF archival, and
  multi-source data pulling for reports remain deferred (carried over
  from P65).

## Testing performed

- New contract test:
  `src/lib/__tests__/featureHardeningContract.test.ts` covering the
  written-guide registry, the welcome status bands, the command panel
  reframe, and the walkthrough readiness matrix.
- Existing P62/P63/P64/P65/AI Wiring/Guided Landing contract tests
  continue to pass.
- Full vitest suite executed.

## P66A — Admin Command Center Deep Hardening

The first P66 pass shipped a working command band but the surface still
read like a generic placeholder dashboard: a count strip, repeated
"Review" CTAs, no explanation of what each count meant, and no grouped
navigation for the most common admin workflows.

### What was weak before

- "Operating priorities" header + "calm overview…" subhead read as
  scaffold copy.
- Six identical count tiles, every one ending in the word "Review".
- No plain-English meaning under any tile — admin had to know the OS
  internals to interpret the numbers.
- No empty state. When all counts were zero the page felt dead.
- Quick links were a single un-grouped chip row with no context.
- Card label "Walkthroughs not yet approved" read like a raw database
  filter, not human guidance.

### What was improved

- `CommandGuidancePanel` rebuilt as a structured RGS Command Center:
  premium header ("Start here.") with the safety line that client-facing
  surfaces are not bypassed and that internal notes / AI drafts stay
  admin-only until approved.
- "Today's priority lane" replaces the count strip. Each priority has a
  human title, a 1–2 sentence meaning, a count badge (urgency-toned for
  high-risk renewal), and a specific CTA — "Review report drafts",
  "Check AI drafts", "Open client health", "Review renewal risk",
  "Answer client requests", "Manage walkthroughs". No two CTAs repeat.
- Empty state renders RGS-voice copy when no items are pending, instead
  of an empty grid.
- "Currently clear" chip row surfaces the resolved priorities so the
  admin can confirm at a glance that those queues are quiet.
- "Where to go next" replaces the unsorted chip row with three grouped
  destination cards: Client work, Reports & review, System tools. Only
  routes that actually exist in `App.tsx` are linked.
- Voice tightened to the RGS standard — calm, direct, owner-respecting,
  no consultant fluff, no SaaS dashboard filler.

### Routes / components touched

- `src/components/admin/CommandGuidancePanel.tsx` — full rewrite of the
  rendered structure. Data reads unchanged (same safe count queries).
- `src/pages/admin/AdminDashboard.tsx` — unchanged; continues to mount
  `<CommandGuidancePanel />` at the top.
- No new routes added. No tables / RPCs / migrations created.

### Security / access

- `/admin` remains behind `ProtectedRoute requireRole="admin"`.
- The panel reads counts only — never selects `internal_notes`,
  `admin_notes`, or AI draft body content.
- No frontend secrets are introduced. No client-facing surfaces are
  bypassed by any link on the page.
- All grouped quick-navigation links resolve to existing admin routes.

### Tests added

- `src/lib/__tests__/adminCommandCenterDeepHardeningContract.test.ts`
  enforces: admin route gating, panel mount on AdminDashboard, distinct
  per-priority CTAs, meaningful explanation text per priority, the
  safety language about not bypassing client surfaces, the empty state
  copy, the three-group quick-nav structure, no banned scope-creep /
  fake-proof / AI-advisor wording, and no client data leakage.
- `src/lib/__tests__/featureHardeningContract.test.ts` updated to match
  the new panel structure.

### What remains deferred

- Per-customer command rollups (e.g. "this client is blocking 3
  things") still live on the customer detail surfaces, not on the
  command center.
- Real walkthrough recordings, Storage-backed PDF archival, tier-aware
  AI prompt tightening, and multi-source report data pulls remain
  deferred from earlier passes.
- Several legacy `*Admin.tsx` pages still vary in copy/structure
  quality; bringing them onto a shared admin page shell is still
  out of scope for this hardening pass.

## P66B — Premium Command Center + Tool Sharpness Pass

### What still felt weak after P66A

- The command center jumped straight from header to per-priority rows
  with no high-level read of system state.
- Priority CTAs were correct but a little flat ("Review report drafts",
  "Manage walkthroughs"), without the sharper RGS verbs the brand uses.
- Quick-action groups had short labels but the explanatory notes were
  generic dashboard captions instead of intentional command guidance.
- Walkthrough fallback never said "coming soon", but the safety language
  around it was not enforced by tests.

### What was sharpened

- Added a 4-card **Command summary** strip — Needs RGS review, Waiting on
  client, Ready to publish, System cleanup. Reads existing safe counts
  only; "Ready to publish" is honestly marked "no signal yet" rather than
  faking a metric.
- Reworded priority titles + CTAs: "Open report queue", "Review
  AI-assisted drafts", "Open health review", "Sharpen walkthroughs",
  "Answer client requests". Each CTA stays unique; no shared "Review"
  fallback.
- Tightened header copy to RGS voice ("Start here. This is where RGS
  checks what needs review…" / "Nothing on this page bypasses client
  visibility rules.").
- Quick-action groups now carry intentional explanations (Client work /
  Reports & review / System tools), routing only to existing routes.
- Locked the walkthrough fallback against any future "coming soon"
  regression via contract test.

### Routes / components touched

- `src/components/admin/CommandGuidancePanel.tsx` — added Command
  summary, sharpened CTAs, refreshed quick-action notes.
- `src/lib/__tests__/premiumCommandCenterP66B.test.ts` — new contract
  test for this pass.
- `src/lib/__tests__/adminCommandCenterDeepHardeningContract.test.ts`
  and `featureHardeningContract.test.ts` updated for new label set.
- No new routes, tables, RPCs, or migrations.

### What remains deferred

- A real "Ready to publish" count requires joining published vs draft
  report state with approval timestamps; left as honest "no signal yet"
  for now instead of a fabricated metric.
- Per-tool readiness on the command center itself (we still link to the
  walkthrough readiness matrix instead of inlining it).
- Sharpening every individual `*Admin.tsx` page onto a shared shell is
  still out of scope and remains tracked from P66.

### Security / access

- `/admin` remains gated by `ProtectedRoute requireRole="admin"`.
- No new data is read; the panel still queries counts only and never
  selects `internal_notes`, `admin_notes`, or AI draft body content.
- No frontend secrets, fake metrics, fake videos, or guarantees added.

## P67 — Full Tool Experience Hardening / Premium Product UX Pass

See `docs/rgs-tool-experience-hardening-audit.md` for the full audit.

- Added shared `PremiumToolHeader`, `ToolGuidancePanel`,
  `ToolEmptyState`, `ToolLoadingState`, `ToolErrorState` so every
  client/admin tool can share the same premium structure.
- Migrated three RGS Control System™ client tools to the new pattern:
  Priority Action Tracker, Monthly System Review, Scorecard History.
  Each now states purpose, what to prepare, what a strong update looks
  like, what happens next, who reviews it, and what is outside scope.
- Replaced bare "No data" / `Loader2` / `bg-destructive` blocks with
  calm responsibility-tagged states ("Waiting on RGS review").
- Tool routes, RLS, and `ClientToolGuard` usage unchanged. No new
  data sources. No `internal_notes` or `admin_notes` exposed.
- Deferred: rolling the same pattern into Diagnostic, Implementation,
  remaining RGS Control System, and admin tool surfaces.
## P68 — OS-Wide Placeholder Language + Premium Copy Sweep
- Replaced placeholder "This is where..." intros on the Admin Command
  Center and Client guided welcome with sharper RGS-voice copy.
- Removed "Coming soon" badge from the RGS Control System umbrella;
  unregistered tools now read "Not part of your current plan."
- Tightened the visibility-rules sentence on the Command Center to
  describe exactly what stays private until an admin approves it.
- Added a P68 contract test (`placeholderLanguageSweepP68.test.ts`) that
  fails if banned placeholder phrases or scope-creep language return.
- No new routes, tables, RPCs, or features. No fake proof, guarantees,
  or unsupported claims introduced. Role gating untouched.
- See `docs/rgs-placeholder-language-sweep.md` for the full pass log.
## Strict UI View Hardening + Responsive Layout System Pass
- Hardened `PortalShell` main area padding and added `min-w-0` so wide
  content no longer pushes horizontal scroll into the body on phones.
- Restructured Admin Command Center summary + quick-link grids and
  priority rows for cleaner stacking on mobile/tablet without losing
  desktop density.
- Smoothed Client guided welcome hero typography and grid breakpoints
  so guidance cards no longer jump from 1 → 3 columns.
- Added `strictUiViewHardening.test.ts` to lock the responsive grids
  and overflow guards in place. No business logic, RLS, RPCs, routes,
  or access gates were modified.
- See `docs/rgs-strict-ui-view-hardening.md` for the full pass log.

## Legacy Admin Table Cardification + Dark-Mode Contrast Pass
Mobile card fallbacks added to the highest-traffic admin tables (`/admin/reports`, `/admin/pending-accounts`). Primary table cell text strengthened from `text-muted-foreground` to `text-foreground/80` for dark-mode readability. Action labels sharpened (e.g., "Open" → "Open client record" / "Open report"). See `docs/rgs-legacy-admin-table-cardification-dark-mode.md` for full audit.

## Tool-Specific Report Generator + Separate PDF Storage Framework
- Extended `report_drafts.report_type` to allow `tool_specific` (existing
  tier values preserved). RLS unchanged; admin-only management.
- Added a reusable framework in `src/lib/reports/toolReports.ts`:
  catalog of reportable tools, deterministic draft creator, and PDF
  builder/exporter that auto-appends the tool-specific scope boundary,
  exclusions, and professional review disclaimer.
- Defaults are safe: every tool-specific draft is created with
  `status='draft'`, `client_safe=false`, `generation_mode='deterministic'`.
  No client auto-publish. AI assist remains admin-triggered/back-end only.
- No new tables. No parallel report system. Local PDF download supported;
  remote PDF archive bucket explicitly deferred.
- See `docs/rgs-tool-specific-report-generator.md` for the full audit
  (including which tools are reportable and which are excluded with
  reasons).

- Admin Command Center Tool Directory / Scrollable Separated Tools Menu — added `AdminToolDirectory` Sheet with lane grouping, search, and route-validated entries. See docs/rgs-admin-tool-directory.md.

- Diagnostic Tool Deep Hardening — premium header + guidance panel on Owner Diagnostic Interview, evidence-completeness fields added (buyer profile, lead handling, fulfillment, retention, current tools, industry risks, where it first slipped), RPC required-key contract unchanged. See docs/rgs-diagnostic-tool-deep-hardening.md.

- RGS Control System™ Tool Deep Hardening — added reusable `RcsScopeBanner` and wired it into the RCS umbrella, Priority Action Tracker, Owner Decision Dashboard, Monthly System Review, Scorecard History, Advisory Notes, and Financial Visibility client surfaces. Verified ClientToolGuard/admin-route gating, no admin-note leakage, no payment internals, and report-framework preservation. See docs/rgs-control-system-tool-deep-hardening.md.

- Admin/System Tool Deep Hardening — added reusable `AdminScopeBanner` and wired it into Pending Accounts, Report Drafts, Client Health, Financial Visibility (admin), System Readiness, Saved Benchmarks, and Walkthrough Videos. Verified `ProtectedRoute requireRole="admin"` on all audited admin routes, preserved `report_drafts` / `tool_report_artifacts` / `StoredToolReportsPanel` (signed-URL + approve+client_safe gate), confirmed AI assist remains edge/admin-only, asserted no tokens/secrets in browser for Financial Visibility, and verified the RGS Tool Directory is not exposed to the customer nav. See docs/rgs-admin-system-tool-deep-hardening.md.
