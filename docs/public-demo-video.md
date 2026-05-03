# P38 — Public Demo / Ad Video

RGS already ships a working public demo system. This doc captures what
exists, where it lives, and how to upgrade or replace the placeholder
with a real video later — without breaking the contracts that protect
the brand voice and legal posture.

## What exists today

- **Component:** `src/components/demo/SystemDemoAnimation.tsx` — a
  12-scene, frame-paced motion storyboard rendered in the brand palette
  (background `#1F1F1F`, primary `#6B7B3A`, accent `#8FA35A`). It is
  silent, text-led, and aspect-ratio responsive (4:5 mobile → 16:9
  desktop). A persistent "Sandbox" pill is visible on every scene.
- **Page:** `src/pages/Demo.tsx` (`/demo`) — hero, embedded animation,
  sandbox-data disclaimer, share row, "what this demo shows" proof
  bullets (signal vs mechanism), full transcript, and a closing CTA
  card.
- **Homepage placement:** `src/pages/Index.tsx` includes a "60-second
  system demo" card that links to `/demo`, the Scorecard, the
  Diagnostic apply route, and the Why RGS Is Different page.
- **Existing scripts:** `docs/demo-video-script.md` already contains
  the long-form script, 30s and 15s cutdowns, and a storyboard table.

## Script (locked)

The transcript on `/demo` and the script in `docs/demo-video-script.md`
are the single source of truth. Both follow the Matt/RGS voice rules
stored in memory:

- Calm, direct, plain-spoken, owner-respecting.
- Core line: *Busy is not the same as stable.*
- Five gears named in the locked order: Demand Generation, Revenue
  Conversion, Operational Efficiency, Financial Visibility, Owner
  Independence.
- Offer order: Scorecard → Diagnostic → Implementation → Revenue
  Control System™.
- No hype, no fake proof, no guaranteed outcomes, no legal/tax/
  accounting/financial advice claims.

If a higher-quality MP4 is produced later, the spoken track must match
the on-page transcript word-for-word.

## Storyboard (current)

`SystemDemoAnimation` renders these scenes in order:

1. Hook part 1 — "Are you reacting to problems…"
2. Hook part 2 — "…or operating with a system that guides the solution?"
3. Pain — owner-felt symptoms (slow follow-up, unclear profit, cash
   tightening, every decision routed through the owner).
4. Cost of guessing — scattered signals collapse into one operating view.
5. What RGS is — Revenue Control System™ for owner-led businesses.
6. Industries — trade/field service, retail, restaurant, cannabis,
   general/mixed.
7. Diagnose — five places revenue breaks (the five gears).
8. How RGS works — Scorecard → Diagnostic → Evidence → Priority Roadmap
   → Action.
9. Data layer — QuickBooks sandbox, spreadsheet import, owner
   interview, uploaded evidence.
10. Revenue leak — sandbox signal surfacing.
11. Priority — fix first / fix next / monitor.
12. CTA — Scorecard call to action (text only inside the frame).

Visuals stay aligned with the dark brand palette and avoid fake client
dashboards or fabricated metrics.

## CTA behavior

| CTA | Label | Route |
| --- | --- | --- |
| Primary | Take the 0–1000 Business Stability Scorecard | `/scorecard` |
| Secondary | Watch the demo | `/demo` |
| Tertiary | Start the Business Stability Diagnostic | `/diagnostic-apply` |
| Footer | Why RGS Is Different | `/why-rgs-is-different` |

The homepage demo card and the `/demo` page both share these routes.
Scorecard links carry UTM params for attribution.

## Accessibility

- The animation is wrapped in `role="img"` with an `aria-label`.
- Full transcript is rendered on `/demo` so screen readers and search
  engines can read the message without playing media.
- No autoplay sound. No required keyboard interaction inside the frame
  (no clickable controls live inside the animation surface).
- Aspect ratio adapts at `sm` and `md` breakpoints for mobile.
- Color contrast respects the locked dark theme tokens.

## Fallback behavior

If a real MP4 is ever embedded but unavailable, the existing
`SystemDemoAnimation` storyboard plus the on-page transcript continue
to render. The component never depends on a remote video source, so
there is no broken `<video>` element to expose. Replace the storyboard
by rendering a `<video>` element in `Demo.tsx` and `Index.tsx` only
after a real asset and captions are produced — keep the storyboard as
the silent fallback.

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
- `src/lib/__tests__/publicDemoVideoContract.test.ts` (P38, this pass)

## Replacing the storyboard with a real video later

1. Produce an MP4 that matches the on-page transcript word-for-word.
2. Bake captions in or ship a `.vtt` track. Match transcript exactly.
3. Drop the file under `public/video/` and reference it via
   `staticFile()` or a `<video>` element in `Demo.tsx`.
4. Keep `SystemDemoAnimation` mounted as the fallback when the video
   element fails to load.
5. Re-run `vitest run` — the P38 contract checks both the storyboard
   path and the homepage CTA wiring.

## Future production notes

- Do not ship low-quality TTS as a voiceover. Use a real human read or
  ship the silent storyboard.
- Subtitles must match spoken script word-for-word.
- 9:16 cuts derive from the same script — do not rewrite for "punchy"
  hype lines.