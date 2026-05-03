# P45 — Mobile / Accessibility / Performance / Visual Regression Sweep

Polish-and-hardening pass across the public site, client portal, admin views,
diagnostic journey, and report UI. No redesign, no copy rewrite beyond clarity
and overflow fixes, and no changes to access controls, RPCs, RLS, payment
gates, `ClientToolGuard`, or service-lane logic from P41–P44.

## Audited surfaces

- Public: homepage, scorecard, How RGS Works, Why RGS Is Different, services,
  Diagnostic offer, Implementation, Revenue Control System, Demo, Insights,
  blog, navbar, footer, sticky CTAs.
- Portal: Customer Dashboard, Stability Journey, My Tools, Owner Diagnostic
  Interview, diagnostic tools 1–6, scorecard results, report views, locked
  states, account / payment / access states.
- Admin: Customer Detail, Scope / Access Snapshot, diagnostic review queue,
  report builder, tool assignment / matrix panels, pipeline.

## Visual fixes applied

- `StabilityJourneyDashboard` gear cards: equalized heights, allowed long gear
  names to wrap (`break-words`), kept the state pill on a single line
  (`whitespace-nowrap`) so it never truncates the gear title, and softened
  hero padding for narrow viewports.
- Recommended-next-move card: added a visible focus ring, allowed long labels
  / reasons to wrap cleanly, and switched alignment to `items-start` on
  mobile so the arrow no longer collides with multi-line copy.

## Responsive layout rules applied

- Continue using `auto-fit, minmax(220–260px, 1fr)` grids for journey tiles so
  cards collapse to a single column under ~480px without horizontal scroll.
- Cards that previously assumed equal copy length now use `h-full` inside the
  grid and `flex flex-col` so neighbouring cards line up at every breakpoint.
- Reserved `min-w-[…]` widths inside admin tables remain wrapped in
  `overflow-x-auto` containers; mobile users get a single scroll surface
  instead of nested scroll boxes.

## Accessibility improvements

- Added `focus-visible:ring-2 focus-visible:ring-primary` to the journey
  "Recommended next move" link so keyboard users get a visible focus state on
  the dark theme.
- Verified that locked-state copy in `ClientToolGuard` still uses neutral,
  plain-language wording and never surfaces internal P43 reason codes.

## Performance posture

- No new media or heavy components were added in this pass.
- Existing memoization in `useStabilityJourney` and `getEffectiveToolsForCustomer`
  remains the source of truth; no duplicate queries were introduced.
- Decorative blur/glow elements on the homepage and Demo page are already
  marked `aria-hidden` and `pointer-events-none`; no changes required.

## Trust / scope guarantees preserved

- No fake testimonials, logos, or "trusted by" claims were added.
- No banned wording ("quarterly", "upgrade anytime", "unlimited support",
  "guaranteed results", "diagnostic + ongoing", etc.) reintroduced.
- Service lanes (Diagnostic / Implementation / RGS Control System) remain
  separated; no copy in this pass implies bundling, ongoing support, or RGS
  operating the business.

## Tests

- Added `src/lib/__tests__/mobileAccessibilityVisualRegression.test.ts` to
  guard against the most common regressions this pass fixed: hard-coded card
  heights in the journey dashboard, missing focus styling on the
  recommended-next-move CTA, and reintroduction of banned scope-creep
  wording in the journey component.
- Full suite: `bunx vitest run` — 90 files / 4381 tests passing.

## Deferred

- Visual snapshot testing (Chromatic / Playwright screenshots) — deferred
  until a stable baseline environment exists; brittle snapshots would fail on
  harmless copy changes today.
- A full keyboard-only walkthrough of every admin workspace — deferred to a
  dedicated admin a11y pass.
- Responsive table → card transformations for legacy admin pages
  (`PendingAccounts`, `Reports`) remain wrapped in horizontal scroll; a true
  card layout is queued for the admin polish phase.