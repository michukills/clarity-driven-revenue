# Public Demo Silent Walkthrough — Script & Storyboard (For Approval)

**Status:** Script only. Not yet built. No `/demo` page changes have been made.
A later pass will build the silent walkthrough component and place it on `/demo`
only after this script is approved.

---

## 1. Purpose

The silent walkthrough replaces the removed public demo video on `/demo`. It is
a short, captioned product walkthrough that shows how the RGS OS works from the
first public touchpoint through Diagnostic, report, repair map, Implementation,
and the RGS Control System. It uses sample/demo data only. It is not a client
case study. It does not imply real client outcomes or guaranteed results.

The goal is to build trust quickly, show the OS is real, show the path from
Scorecard to report and repair map and ongoing visibility, and move the visitor
toward starting the Scorecard or requesting a Diagnostic — without overwhelming
them with a full software training tour.

## 2. Placement (planned, not yet implemented)

Future placement on `/demo`, in this order:

1. Demo page hero / short intro
2. Silent walkthrough video-style section (this script)
3. "What this demo shows" summary
4. "What this demo does not claim" safety block
5. CTA to Scorecard / Diagnostic

No code change in this pass. The current placeholder on `/demo` stays in place
until the walkthrough component is approved and built.

## 3. Target length

**60–90 seconds.** The public version stays short on purpose. A longer 5–8
minute private sales/demo walkthrough may be created later (see section 15) but
it is not the main public `/demo` asset.

## 4. Public demo format decision

**Hybrid silent walkthrough.** Not a raw full OS click-through. Not a
slides-only explainer. The format is:

- selected OS screens (real surfaces, sample/demo data, DEMO watermark)
- slide-style explanation cards between screens
- subtitles/captions on every scene
- short visual proof that the OS is real
- controlled explanation of value
- no overwhelming software training feel
- no long full-system tour on the public page

Silent (captioned). No voiceover required for the public cut. If a voiceover is
ever added, it must match the captions word-for-word and be a real human read.

## 5. Scene-by-scene walkthrough (~9 scenes, 60–90s total)

Each scene lists: title, visual, on-screen label, caption/subtitle, DEMO
watermark requirement, transition, safety note. Captions appear bottom-center,
single line where possible, max two lines. Watermark stays in the upper-right
corner so it never sits behind captions.

### Scene 1 — Problem framing slide (~8s)
- **Visual:** Slide-style card. Dark background (#1F1F1F). Single SVG gear, one
  highlighted tooth in primary green (#6B7B3A). No OS UI.
- **On-screen label:** "Busy is not the same as stable."
- **Caption:** "Most business problems start when one gear slips."
- **DEMO watermark:** Optional (no OS UI). May be present for consistency.
- **Transition:** Slow fade to scorecard screen.
- **Safety note:** None required on this slide.

### Scene 2 — Scorecard screen (~9s)
- **Visual:** Public 0–1000 Business Stability Scorecard intro screen with a
  sample mid-band score reveal.
- **On-screen label:** "0–1000 Business Stability Scorecard"
- **Caption:** "A structured, deterministic 0–1000 read across five gears. Same inputs always produce the same score."
- **Secondary chip:** "Self-reported · Preliminary · Not a final diagnosis."
- **DEMO watermark:** Required (UI visible). Upper-right.
- **Transition:** Cut to portal welcome.
- **Why this scene matters:** Shows the starting point is real and repeatable
  — not a personality quiz, not a generic lead magnet. Owners can trust the
  read because the math is fixed.
- **OS strength demonstrated:** Deterministic scoring · structured starting point.

### Scene 3 — Client portal welcome (~8s)
- **Visual:** Guided Client Welcome screen in the portal with the next-step
  card visible.
- **On-screen label:** "Guided client portal"
- **Caption:** "The client gets a guided path. One next step at a time, instead of a pile of random forms."
- **DEMO watermark:** Required. Upper-right.
- **Transition:** Cut to admin review.
- **Why this scene matters:** Most owners have been handed a folder of
  questionnaires and told "fill this out." RGS replaces that with a calm,
  sequenced path so the client always knows what is next.
- **OS strength demonstrated:** Premium guided client experience.

### Scene 4 — Admin review / Industry Brain (~10s)
- **Visual:** Admin diagnostic review surface with Industry Brain / Industry
  Emphasis panel visible.
- **On-screen label:** "Admin review · Industry Brain"
- **Caption:** "Every finding is reviewed by RGS with industry context before it ever reaches the client."
- **Secondary chip:** "Industry emphasis informs interpretation. It does not change the base score."
- **DEMO watermark:** Required. Upper-right.
- **Why this scene matters:** Shows there is a real review layer behind the
  output. AI can assist, but nothing auto-publishes. Industry context sharpens
  interpretation without secretly distorting the underlying score.
- **OS strength demonstrated:** Admin-reviewed evidence · industry-aware interpretation without score corruption.

### Scene 5 — Report / RGS Stability Snapshot (~10s)
- **Visual:** Stability Snapshot client view with strengths, risks, and
  opportunities visible. Sample data only.
- **On-screen label:** "RGS Stability Snapshot"
- **Caption:** "A clear picture of what is working, what is slipping, and what needs attention. In plain language."
- **DEMO watermark:** Required. Upper-right.
- **Why this scene matters:** The output is readable by an owner, not written
  in consultant language. Strengths, risks, and opportunities sit side by
  side so the picture is honest, not just flattering or alarming.
- **OS strength demonstrated:** Client-ready reporting · plain-language clarity.

### Scene 6 — Priority Repair Map (~9s)
- **Visual:** Priority repair map / prioritized findings view, top 3 items
  visible with severity.
- **On-screen label:** "Priority Repair Map"
- **Caption:** "What to fix first, why it matters, and what changes when it is fixed."
- **DEMO watermark:** Required. Upper-right.
- **Why this scene matters:** This is one of the strongest moments in the
  walkthrough. Most owners get a long list of problems with no order. RGS
  gives direction: a sequenced repair map instead of a pile of findings.
- **OS strength demonstrated:** Direction over diagnosis · sequenced priorities.

### Scene 7 — Implementation tools (~10s)
- **Visual:** Implementation surface showing tiles for Implementation Roadmap,
  SOP / Training Bible, Decision Rights / Accountability, Workflow / Process
  Mapping, and Tool Assignment + Training Tracker.
- **On-screen label:** "Implementation tools"
- **Caption:** "Implementation installs the repair plan. Roadmap, SOPs, decision rights, workflows, training."
- **DEMO watermark:** Required. Upper-right.
- **Why this scene matters:** RGS does not stop at "here are your problems."
  Implementation is real structure: the things that usually get skipped in
  small businesses actually get installed. Substantial without overwhelming.
- **OS strength demonstrated:** Implementation depth · structure that gets installed, not just recommended.
- **Safety note:** Implementation installs the repair plan. It is structured work, not unlimited support.

### Scene 8 — RGS Control System (~10s)
- **Visual:** RGS Control System dashboard showing Revenue & Risk Monitor,
  Priority Action Tracker, Owner Decision Dashboard, and Scorecard History.
- **On-screen label:** "RGS Control System"
- **Caption:** "Ongoing visibility, priorities, and score history. The owner stays connected to the system — without RGS becoming the operator."
- **DEMO watermark:** Required. Upper-right.
- **Why this scene matters:** This is not generic monthly support. It is a
  live visibility layer the owner uses to stay in front of the business. The
  point is guided independence, not dependence.
- **OS strength demonstrated:** Guided independence · ongoing visibility · architect, not operator.

### Scene 9 — Closing CTA slide (~10s)
- **Visual:** Slide-style CTA card. No OS UI. Single headline, two buttons.
- **On-screen label:** "If the same problems keep coming back, check the system."
- **Caption:** "See where the business may be slipping. Start with the structured 0–1000 read."
- **Primary CTA:** "Start the 0–1000 Scorecard" → `/scorecard`
- **Secondary CTA:** "Request a Diagnostic" → `/diagnostic-apply`
- **DEMO watermark:** Optional (no OS UI).
- **Why this scene matters:** Closes with quiet confidence. The viewer should
  feel they have just seen a real operating system, and the next step is
  small, structured, and low-risk.

## 6. Subtitle/caption text (consolidated)

1. "Most business problems start when one gear slips."
2. "A structured, deterministic 0–1000 read across five gears. Same inputs always produce the same score."
3. "The client gets a guided path. One next step at a time, instead of a pile of random forms."
4. "Every finding is reviewed by RGS with industry context before it ever reaches the client."
5. "A clear picture of what is working, what is slipping, and what needs attention. In plain language."
6. "What to fix first, why it matters, and what changes when it is fixed."
7. "Implementation installs the repair plan. Roadmap, SOPs, decision rights, workflows, training."
8. "Ongoing visibility, priorities, and score history. The owner stays connected to the system — without RGS becoming the operator."
9. "See where the business may be slipping. Start with the structured 0–1000 read."

Captions are bottom-centered. They never sit behind the DEMO watermark. Where a
scene also needs a safety note, the safety text appears as a small secondary
caption above the primary caption or as an on-screen chip near the relevant UI.

## 7. Visual direction

- Calm, deliberate motion. No whooshes, no stock startup footage, no neon, no
  startup-purple gradients.
- Background `#1F1F1F`, primary green `#6B7B3A`, white/cream body type.
- Source Serif 4 for slide headlines. Inter for captions, labels, chips.
- Slide-style scenes (1, 9) hold longer than UI scenes.
- UI scenes use a slow zoom-in on the relevant region. No frantic cursor motion.
- Scene transitions: slow fade or simple cut. No 3D, no parallax, no spin.

## 8. Exact on-screen text

- Scene 1 headline: "Busy is not the same as stable."
- Scene 2 label: "0–1000 Business Stability Scorecard"
- Scene 2 chip: "Self-reported · Preliminary"
- Scene 3 label: "Guided client portal"
- Scene 4 label: "Admin review · Industry Brain"
- Scene 4 chip: "Industry emphasis does not change the base score."
- Scene 5 label: "RGS Stability Snapshot"
- Scene 6 label: "Priority Repair Map"
- Scene 7 label: "Implementation tools"
- Scene 8 label: "RGS Control System"
- Scene 9 headline: "If the same problems keep coming back, check the system."
- Scene 9 buttons: "Start the 0–1000 Scorecard" and "Request a Diagnostic"
- Persistent footer chip on UI scenes: "Sample / demo data."

## 9. DEMO watermark instructions

- Watermark text reads exactly: **DEMO**.
- Required on every scene where OS UI (real or simulated) is visible (scenes
  2–8). Optional on slide-only scenes (1, 9), but may be kept for consistency.
- Placement: upper-right corner. If a particular composition makes the
  upper-right unsafe, fall back to upper-left. Never place behind captions.
- Treatment: small semi-transparent badge/chip. Premium and subtle, but
  unmistakably readable in a screenshot or social clip.
- Must remain visible at mobile and desktop sizes.
- Must not cover scores, charts, primary CTAs, or tool labels.
- Must not be so faint it disappears against light UI regions.
- Must not be hidden by the bottom subtitle/caption track.
- Placement should be consistent across UI scenes.

The build pass will need to verify the watermark renders on every UI scene and
does not collide with captions.

## 10. Safety / disclaimer copy (must appear, in plain language)

- "Sample/demo data only."
- "Product walkthrough, not a client case study."
- "No revenue improvement or business outcome is guaranteed."
- "The Scorecard is deterministic and preliminary until the paid Diagnostic."
- "AI-assisted outputs are admin-reviewed before becoming client-visible."
- "Industry emphasis does not change the base 0–1000 score."
- "Cannabis / MMJ examples are operational visibility only — not legal advice and not a compliance certification. State-specific rules may apply and professional review may still be required."
- "RGS does not provide legal, tax, accounting, HR, or healthcare advice."

These are surfaced through scene chips, the persistent "Sample / demo data."
footer chip on UI scenes, and the "What this demo does not claim" block on the
`/demo` page that frames the walkthrough.

## 11. CTA copy

- Primary: **Start the 0–1000 Scorecard** → `/scorecard`
- Secondary: **Request a Diagnostic** → `/diagnostic-apply`
- CTA support line: "Start by seeing where the business may be slipping." or
  "See how stable your business really is."

## 12. What not to show

- Real client names, logos, financial data, or reports
- Fake testimonials, fake reviews, fake awards
- Fake revenue outcomes or fake ROI numbers
- Fake compliance certifications or fake compliance proof
- Unapproved or draft reports presented as client-visible
- Admin-only notes shown in any client-visible context
- Service-role keys, secrets, signed URLs, environment values
- Anything that implies RGS is the operator inside the business
- Healthcare / clinical / HIPAA / patient framing of any kind
- Stock startup footage or fabricated dashboards

## 13. What not to claim

- Guaranteed revenue or guaranteed stabilization
- "We'll fix everything" or "done-for-you operator"
- That the Scorecard is a final diagnosis
- That the RGS Control System makes decisions for the owner
- That AI outputs are published without admin review
- That industry emphasis changes the base 0–1000 score
- That cannabis support is legal advice or a compliance certification
- Any "10x", "skyrocket", "explosive growth", "next level", "dominate",
  "revolutionary", "game-changing", "unlock", "AI-powered business
  transformation" framing

## 14. Matt / RGS tone rules

- Calm, direct, honest, practical, premium but not flashy.
- Owner-respecting. Never shaming. Never motivational coaching.
- System-focused. "Friend being honest with a small business owner."
- Not hype. Not AI-sounding. Not consultant-polished fluff. Not generic SaaS.
- Use the gear metaphor: gears, slipping gears, worn teeth, pressure moving
  through the system, repair map, guided independence, visibility, owner not
  being the bottleneck.
- Required positioning lines (use verbatim if quoted, otherwise honor the
  meaning):
  - "The point is not to make the owner need RGS forever. The point is to make
    the business clearer."
  - "The Diagnostic finds the slipping gears. Implementation installs the
    repair plan. The RGS Control System keeps the owner connected to the
    system without turning RGS into an operator inside the business."
- Banned phrases: revolutionary, game-changing, explosive growth, AI-powered
  business transformation, guaranteed results, we'll fix everything,
  done-for-you operator, fake urgency, fake proof, consultant buzzwords,
  generic SaaS phrasing, unlock, optimize, transform, supercharge, dominate,
  crush it, next level, 10x, skyrocket.
- No exclamation marks.

## 15. Future private / long-form demo note

A longer 5–8 minute private sales/demo walkthrough may be produced later as a
separate asset. It is not part of the public `/demo` page. The private cut may
include deeper scenes such as:

- Owner Diagnostic Interview
- Personalized diagnostic tool sequence
- Detailed report builder
- Full Implementation Roadmap
- SOP / Training Bible
- Decision Rights / Accountability
- Workflow / Process Mapping
- Tool Assignment + Training Tracker
- Monthly System Review
- Client Health / Renewal Risk
- Long-term lifecycle demo accounts

The same Matt/RGS tone, DEMO watermark, sample-data labeling, and safety copy
rules apply to the private cut. The private cut must never be substituted for
the public 60–90 second walkthrough on `/demo`.

## 16. Approval checklist

- [ ] Public hybrid format approved
- [ ] 60–90 second target approved
- [ ] Scene order approved
- [ ] Captions/subtitles approved
- [ ] Matt/RGS tone approved
- [ ] DEMO watermark rules approved
- [ ] Safety copy approved
- [ ] Cannabis/MMJ wording approved
- [ ] CTA wording approved
- [ ] Strongest value points emphasized enough
- [ ] Public excitement/trust level approved
- [ ] Ready to build silent walkthrough component

## 17. Strongest Value Points This Walkthrough Is Designed To Highlight

This section is internal guidance for the future build pass. Each point maps
to a real OS strength the public walkthrough is intentionally surfacing —
honestly, without hype.

- **Deterministic scorecard.** Same inputs always produce the same 0–1000
  score. Structured, repeatable, not a personality quiz.
- **Guided client portal experience.** One next step at a time. Premium and
  calm instead of a stack of forms.
- **Admin-reviewed evidence.** AI can assist, but findings are reviewed by
  RGS before they ever become client-visible.
- **Industry-aware interpretation without score corruption.** Industry Brain
  / Industry Emphasis sharpens interpretation; the base 0–1000 score stays
  honest.
- **Client-ready reporting.** The RGS Stability Snapshot is written in plain
  language an owner can actually use.
- **Priority Repair Map.** Direction over diagnosis: what to fix first, why
  it matters, what changes when it is fixed.
- **Implementation depth.** Roadmap, SOPs, decision rights, workflows,
  training — the structural work that usually gets skipped actually gets
  installed.
- **Ongoing visibility through the RGS Control System.** Live monitoring,
  priorities, and score history. Not generic monthly support.
- **Guided independence — architect, not operator.** RGS installs clarity
  and structure. It does not become the operator inside the business.

The walkthrough should make these strengths *felt*, not listed. Captions stay
short. Visuals carry the weight. The energy is quietly impressive, not loudly
promotional.
