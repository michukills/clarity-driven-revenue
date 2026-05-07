# Public Demo / Ad Video

The RGS public demo now uses a narrated, screen-recorded MP4 from actual
RGS public and OS demo surfaces. It carries demo/sample-data watermarking,
privacy masks, burned-in captions, web captions, transcript, and a poster.
It explains the operating system without making outcome claims, fake proof,
or legal/tax/accounting/financial advice claims.

## What exists today

- **Player:** `src/components/video/RgsVideoPlayer.tsx` — mobile-friendly
  HTML5 player with play/pause, mute, volume, seek, time display, captions
  track support, poster, and no download control.
- **Public MP4:** `/videos/public/revenue-growth-systems-operating-system-public-demo.mp4`
  — narrated screen-recorded RGS OS demo using sample/demo data.
- **Captions/transcript/poster:** Stored beside the public MP4 under
  `/videos/public`.
- **Page:** `src/pages/Demo.tsx` (`/demo`) — hero, real public-safe video,
  scope-safe disclaimer, share row, support copy, transcript, and CTA.
- **Homepage placement:** `src/pages/Index.tsx` includes a "Watch the
  RGS Stability System" card with primary, secondary, tertiary, and
  support CTAs.

## Locked public OS script

The public OS walkthrough preserves the approved concise script:

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

- Real `<video>` element with native track support through
  `RgsVideoPlayer`.
- Full transcript and `.vtt` captions ship with the public MP4.
- No autoplay sound.
- Player layout is responsive and keeps controls usable on mobile.
- Color contrast respects the locked dark theme tokens.

## Production QA

- Final cut includes scene breathing room and a final hold so narration
  does not cut off the last word.
- Burned-in captions were spot-checked near the end of public and portal
  videos so caption boxes do not cut off text.
- Demo/sample-data watermarking and internal-logic protection are visible.
- Old builder/preview/incomplete UI badges are masked in the rendered video.

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
