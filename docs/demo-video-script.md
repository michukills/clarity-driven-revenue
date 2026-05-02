# RGS Public Demo / Ad Video — Script, Cutdowns & Storyboard

**Voice:** Matt/RGS — calm, direct, honest, practical, owner-respecting, system-focused, plainspoken. A friend being honest with a small business owner. Not motivational. Not agency. Not AI-sounding.

**Core line:** *Busy is not the same as stable.*

**Offer sequence (must stay in order):** Scorecard → Diagnostic → Implementation → Revenue Control System™.

**Five gears (use exact names):** Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, Owner Independence.

**Banned in any cut:** unlock, optimize, transform, supercharge, scale faster, dominate, crush it, next level, game-changing, AI-powered business transformation, fake testimonials, fake clients, fake revenue claims, urgency language, exclamation marks.

**Service boundary:** Never imply guaranteed revenue, guaranteed stabilization, that RGS runs the business, that the Scorecard is a final diagnosis, or that the Revenue Control System™ makes decisions for the owner.

---

## 1. Primary script — 60–90 seconds

> Busy is not the same as stable.
>
> A business can have customers, activity, and effort and still feel like the same problems keep coming back.
>
> Most owners are not failing from lack of effort. A lot of the time, the business is carrying pressure in a part of the system that has not been clearly identified yet.
>
> A gear usually does not fail all at once. One worn tooth starts slipping. Then the next part of the system has to carry pressure it was not built to carry.
>
> Businesses work the same way. If demand is inconsistent, sales follow-up is unclear, operations keep getting stuck, financial visibility is late, or every decision has to come back to the owner, the system starts slipping.
>
> Revenue & Growth Systems helps owner-led businesses diagnose where that pressure is building.
>
> The 0–1000 Business Stability Scorecard gives you a self-reported starting read across five gears: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, and Owner Independence. The Scorecard is not a final diagnosis. It helps point attention.
>
> The Diagnostic goes deeper by reviewing the information behind the score and identifying what needs attention first. Implementation turns the diagnosis into a repair plan. The Revenue Control System™ keeps important signals visible after the work is done.
>
> RGS is not here to make the owner dependent. It is here to make the business easier to think through. When the right information is in front of you, the next step usually makes more sense.
>
> If the same problems keep coming back, check the system.
>
> Take the 0–1000 Business Stability Scorecard.

**Primary CTA:** Take the 0–1000 Business Stability Scorecard → `/scorecard`
**Secondary CTA:** See Why RGS Is Different → `/why-rgs-is-different`

---

## 2. 30-second ad cutdown

> Busy is not the same as stable.
>
> Most owners are not failing from lack of effort. The business is usually carrying pressure in a part of the system that has not been clearly identified yet.
>
> A gear does not fail all at once. One worn tooth slips, and the next part of the system has to carry pressure it was not built to carry.
>
> RGS helps owner-led businesses diagnose where that pressure is building — across demand, sales, operations, financial visibility, and owner independence.
>
> If the same problems keep coming back, check the system. Start with the 0–1000 Business Stability Scorecard.

**End card:** Take the 0–1000 Business Stability Scorecard.

---

## 3. 15-second short-form hook

> Busy is not the same as stable.
>
> If the same problems keep coming back, the system may be slipping. RGS helps owners see what is actually breaking.
>
> Start with the 0–1000 Business Stability Scorecard.

---

## 4. Suggested visual storyboard

Calm, deliberate motion. No whooshes. No stock startup footage. No fake clients or fake numbers. Optional ambient instrumental, low BPM.

| # | Beat | Visual direction |
|---|------|------------------|
| 1 | "Busy is not the same as stable." | Quiet open. Dark background (#1F1F1F). Single line of large serif type, left-aligned. Hold for two seconds. |
| 2 | Customers, activity, effort, same problems | Owner-perspective shot: a desk with notebook, laptop showing a busy task list, phone lighting up. No faces required. |
| 3 | Most owners are not failing from lack of effort | Single line of type over a soft, near-still frame. No motion graphics. |
| 4 | Gear metaphor | One SVG gear turns slowly. A single tooth highlights in primary green (#6B7B3A). A second gear in the chain begins to wobble. No sparks. No breakage. |
| 5 | Five gears slipping in different ways | Five labeled gears appear in sequence: Demand Generation, Revenue Conversion, Operational Efficiency, Financial Visibility, Owner Independence. Each pulses once as it is named. |
| 6 | Scorecard | Screen capture of the public Scorecard intro, then a 0–1000 score reveal animating to a calm mid-band number. Caption: "Self-reported starting read. Not a final diagnosis." |
| 7 | Diagnostic | UI capture of the Stability Snapshot / Diagnostic report. Caption: "Reviews the information behind the score." |
| 8 | Implementation | UI capture of a repair-plan / sequenced task view. Caption: "Sequenced by impact." |
| 9 | Revenue Control System™ | UI capture of the Revenue Control Center — weekly revenue line, cash, blockers. Caption: "Important signals stay visible." |
| 10 | Guided independence | Return to the gear from beat 4, now turning steadily. Caption: "RGS is not here to make the owner dependent." |
| 11 | Close | Single CTA card. Headline: "If the same problems keep coming back, check the system." Button: "Take the 0–1000 Business Stability Scorecard." |

**Type:** Source Serif 4 for landed lines. Inter for everything else. No emoji. No exclamation marks.
**Color:** Background #1F1F1F. Primary green #6B7B3A for highlighted gear tooth and score. White/cream body type. No gradients across the spectrum, no neon, no startup-purple.
**Pacing:** Slow. A small pause after each period. The pacing is the message.

---

## 5. On-page demo placement

**`/demo`:** Hero headline frames the core line. Transcript on the page mirrors the 60–90 second primary script verbatim so the page reads correctly even before any new MP4 exists.

**Homepage demo card (`Index.tsx`):** Headline reframed to "See how RGS helps owners find what is slipping." Subheadline mirrors the demo page. Primary CTA routes to `/scorecard`. Secondary link routes to `/why-rgs-is-different`.

**`WhatWeDo.tsx` demo block:** Existing short copy already aligned. Not changed in this pass.

**Disclaimer beneath any player stays:** "This demo uses sandbox-style data to demonstrate system capability. It does not represent an actual customer outcome, and no private client data is used in public demos."

---

## 6. Production notes (internal only)

- Do not produce an MP4 with low-quality TTS. If voiceover is recorded, use a real human read at normal speaking pace.
- The current `SystemDemoAnimation` component is preserved. Do not rebuild from scratch; update the source file in place when a higher-quality clip exists.
- No fake client names, fake testimonials, fake revenue numbers, or fake case studies anywhere in the cut, including end cards.
- Captions and subtitles must match the spoken script word-for-word.
- 9:16 cuts (social, short-form) should derive from the same script. Do not rewrite for "punchier" hype.
