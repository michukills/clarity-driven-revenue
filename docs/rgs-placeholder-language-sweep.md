# P68 — OS-Wide Placeholder Language + Premium Copy Sweep

## Goal
Remove placeholder, generic SaaS, and Lovable-filler copy from visible
RGS OS surfaces and replace it with calmer, sharper, owner-respecting
RGS-voice copy. No new features, no duplicate routes, no fake proof.

## Areas audited
- Admin Command Center (`src/components/admin/CommandGuidancePanel.tsx`)
- Client guided welcome (`src/components/portal/GuidedClientWelcome.tsx`)
- RGS Control System umbrella (`src/pages/portal/tools/RgsControlSystem.tsx`)
- Existing P66/P66A/P66B/P67 tool surfaces (already hardened — re-checked
  for residual "Coming soon" / "This is where" / "No data found" copy)

## Weak language patterns found
- "This is where..." intros on both admin and client landing surfaces.
- "Handle these before anything client-facing moves forward." — generic.
- "Coming soon" badge on RGS Control System tools that are simply not in
  the customer's plan.
- "A calm summary of the work happening behind the scenes." — vague.

## Examples of improved copy
- Admin Command Center intro now reads: *"This page shows what needs RGS
  review, what is blocked, and what can safely move forward before
  anything reaches the client. Begin with anything that affects access,
  reports, client next steps, or published guidance."*
- Visibility line now reads: *"Internal notes and AI drafts stay private
  unless an admin deliberately approves client-visible language. Nothing
  on this page bypasses client visibility rules."*
- Client welcome subtitle is no longer "This is where your diagnostic..."
  but "Your diagnostic, tools, reports, and next steps live here..."
- "What RGS is doing" body is now "A short summary of the work happening
  on RGS's side right now."
- RGS Control System tool tiles no longer say "Coming soon" — they say
  *"Not part of your current plan"* when a tool is not registered for
  the customer.

## Files changed
- `src/components/admin/CommandGuidancePanel.tsx`
- `src/components/portal/GuidedClientWelcome.tsx`
- `src/pages/portal/tools/RgsControlSystem.tsx`
- `src/lib/__tests__/premiumCommandCenterP66B.test.ts` (assertions updated)
- `src/lib/__tests__/placeholderLanguageSweepP68.test.ts` (new contract)
- `docs/rgs-os-feature-hardening-audit.md` (P68 section appended)

## Safety / access
- No role gating, RLS, or ClientToolGuard logic touched.
- No internal_notes / admin_notes / admin_summary / raw AI draft text
  exposed.
- No frontend secrets introduced.
- No fake proof, testimonials, guarantees, or unsupported claims added.
- Cannabis modules untouched (no healthcare/HIPAA wording introduced).

## What remains deferred
- Deeper sweep of admin-only secondary screens (industry brain admin,
  monthly review admin, scorecard history admin) — copy is functional
  but could be sharpened in a future pass.
- Empty-state and error-state language inside individual diagnostic
  surfaces beyond the three tools already hardened in P67.

## Testing
- New contract test asserts the banned placeholder phrases do not return
  in the touched files and asserts the new RGS-voice phrasing exists.
- Full vitest suite executed; no regressions.