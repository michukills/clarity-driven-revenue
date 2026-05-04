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