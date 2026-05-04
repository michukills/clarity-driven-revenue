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