# P38.1 — Public Demo / Ad Video

The RGS public demo is a silent, text-led storyboard rendered in code.
It explains the Stability System without making outcome claims, fake
proof, or legal/tax/accounting/financial advice claims. P38.1 rewrote
the script and storyboard so the demo lands harder for a skeptical
owner.

## What exists today

- **Component:** `src/components/demo/SystemDemoAnimation.tsx` — an
  8-scene motion storyboard rendered in the brand palette
  (background `#1F1F1F`, primary `#6B7B3A`, accent `#8FA35A`). Silent,
  text-led, aspect-ratio responsive (4:5 mobile → 16:9 desktop). A
  persistent "Sandbox" pill is visible on every scene.
- **Page:** `src/pages/Demo.tsx` (`/demo`) — hero, embedded animation,
  illustrative-visuals disclaimer, share row, "What this demo shows"
  card, "What this demo does not claim" card, full transcript, closing
  CTA.
- **Homepage placement:** `src/pages/Index.tsx` includes a "Watch the
  RGS Stability System" card with primary, secondary, tertiary, and
  support CTAs.

## Locked script (P38.1)

The transcript on `/demo` and the script in
`docs/demo-video-script.md` are the single source of truth.

> Most business problems do not start as a disaster. They start as a
> small slip.
>
> A lead comes in, but follow-up is inconsistent. Sales happen, but
> the process depends too much on the owner. Work gets done, but
> handoffs are messy. The numbers exist, but they do not help when a
> decision has to be made.
>
> That is not usually five separate problems. It is one system
> carrying pressure in the wrong places.
>
> Revenue & Growth Systems looks at the business through five gears:
> Demand Generation. Revenue Conversion. Operational Efficiency.
> Financial Visibility. Owner Independence.
>
> The Business Stability Diagnostic looks for where the system is
> slipping, what evidence supports that, and what should be fixed
> first.
>
> This is not done-for-you marketing. It is not legal, tax,
> accounting, or financial advice. And it is not a promise that a
> report magically fixes the business.
>
> The point is to make the business clearer, so the owner can make
> better decisions with less guessing. RGS does not create dependency.
> It gives the owner clearer control.
>
> Start with the 0–1000 Business Stability Scorecard.

## Storyboard (8 scenes)

1. **It usually starts small** — a single slipping gear; "Most
   business problems do not start as a disaster."
2. **Symptoms show up** — slower sales, missed follow-ups, messy
   handoffs, unclear numbers; "At first, it looks like separate
   problems."
3. **Pressure moves** — one gear slips, pressure flows into the next;
   "One slipping gear puts pressure on the rest of the system."
4. **The five gears** — Demand Generation, Revenue Conversion,
   Operational Efficiency, Financial Visibility, Owner Independence;
   "RGS looks at the business as a system."
5. **The Diagnostic lens** — Scorecard → Evidence → Findings →
   Roadmap; "What is slipping, what supports it, and what to fix
   first."
6. **No more guessing** — fog clears into a clearer operating
   picture; "The goal is not more noise. It is clearer decisions."
7. **Guided independence** — owner stays at the center of control;
   "RGS does not create dependency. It gives the owner clearer
   control."
8. **CTA** — Take the 0–1000 Business Stability Scorecard.

## CTA behavior

| CTA | Label | Route |
| --- | --- | --- |
| Primary | Take the 0–1000 Business Stability Scorecard | `/scorecard` |
| Secondary | Watch the demo | `/demo` |
| Tertiary | Start the Business Stability Diagnostic | `/diagnostic-apply` |
| Footer | Why RGS Is Different | `/why-rgs-is-different` |

## Accessibility

- Animation wrapped in `role="img"` with an `aria-label`.
- Full transcript renders on `/demo` for screen readers and SEO.
- No autoplay sound. No clickable controls inside the frame.
- Aspect ratio adapts at `sm` and `md` breakpoints.
- Color contrast respects the locked dark theme tokens.

## Fallback behavior

The component never depends on a remote video source. There is no
`<video>` element to break. If a real MP4 ships later, mount it inside
`Demo.tsx` and `Index.tsx` only after captions/transcript are matched.

## No-fake-proof rules

The demo block must never include:

- testimonials, case studies, or quoted client results
- third-party client logos or "trusted by" rows
- guaranteed revenue, growth, or outcome claims
- "official partner of <Brand>" claims
- legal, tax, accounting, or financial advice
- fabricated dashboards implying real client data

These rules are enforced by:

- `src/lib/__tests__/legalScopeLanguageContract.test.ts` (P36)
- `src/lib/__tests__/publicDemoVideoContract.test.ts` (P38 / P38.1)
