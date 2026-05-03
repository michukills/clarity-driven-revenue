# P44 — No-Fake-Proof + CTA Audit

This pass is a launch-readiness sweep. No new features. The goal is to make
sure public and client-facing copy is honest about scope, free of fake
proof, and routes the visitor into the correct service lane.

## What was audited

- All public marketing routes: `/`, `/scorecard`, `/why-rgs-is-different`,
  `/how-rgs-works`, `/services`, `/diagnostic`, `/implementation`,
  `/revenue-control-system`, `/demo`, `/insights`, blog templates,
  footer, sticky CTA, navbar.
- Portal-facing marketing copy: `MyTools`, Stability Journey dashboard,
  diagnostic intake/interview, locked-state copy.
- Demo + ad surfaces: `/demo`, `SystemDemoAnimation`.
- Legal/scope surfaces: EULA, Privacy, scope boundary doc.

## Banned proof language (must not appear in client/public copy)

- "testimonial", "case study", "trusted by", "clients say"
- "proven results", "guaranteed", "unlimited", "hundreds of businesses"
- "join N+ owners", "over N businesses", fake client logos
- fake before/after numbers, fake ROI claims, fake success-rate claims
- any phrasing implying RGS has completed client outcomes that do not
  exist yet

These phrases may legitimately appear inside negation/disclaimer prose
(e.g. "this is not done-for-you marketing") and inside contract tests,
banned-word lists, or audit docs. The contract test below excludes those
sources and matches whole-word usage in narrative copy only.

## Banned scope-creep wording

- "Diagnostic + ongoing"
- "quarterly" — when used as a client/public scope or upsell phrase
  (the term is still allowed in legitimate report-cadence labels such as
  "Quarterly Stability Review", which is a real internal report type)
- "after major changes"
- "ask RGS if"
- "use anytime"
- "upgrade anytime"
- "ongoing support" — unless explicitly describing the bounded RGS
  Control System subscription lane
- "full-service", "done-for-you", "we run your business",
  "we manage everything" — except in negation prose

## Approved wording patterns

Soft, designed-to-help phrasing instead of unsupported claims:

- "designed to", "built to", "intended to"
- "helps identify", "helps clarify"
- "gives the owner a clearer view"
- "shows where the system is slipping"
- "maps the repair plan"
- "early version", "demo", "sample", "example scenario",
  "for demonstration purposes", "fictional walkthrough"

## Service-lane descriptions

The site uses the canonical phrasing on the homepage and offer pages:

> The Diagnostic finds the slipping gears. Implementation installs the
> repair plan. The RGS Control System™ keeps the owner connected to the
> system without turning RGS into an operator inside the business.

Each lane page must stay inside its scope:

- **Diagnostic** — one-time paid inspection. Evidence collection,
  slipping-gear identification, the 0–1000 Business Stability Scorecard
  where applicable, the diagnostic report, and the priority repair map.
  Never implies implementation, ongoing support, custom builds,
  unlimited consulting, continuous monitoring, subscription access, RGS
  operating the business, or guaranteed results.
- **Implementation** — separate paid engagement. Project-based, bounded
  by scope. May include SOPs, workflows, playbooks, standards, training
  guidance. Never implies unlimited support, continuous monitoring,
  indefinite advisory access, automatic RCS subscription access, or RGS
  becoming the operator inside the business.
- **RGS Control System™ / Revenue Control System™** — subscription /
  ongoing visibility lane. Dashboards, priorities, score history,
  monitoring, action tracking, bounded advisory interpretation. Frames
  the relationship as guided independence, not unlimited implementation
  or emergency support.

## CTA hierarchy

- **Primary public CTA**: "See How Stable Your Business Really Is" →
  `/scorecard` (`SCORECARD_CTA_LABEL` in `src/lib/cta.ts`,
  surfaced via `StickyCTA`).
- **Diagnostic CTA**: "Start the Diagnostic" / "Start With the
  Diagnostic" → `/diagnostic`.
- **Learning CTAs**: "See Why RGS Is Different" → `/why-rgs-is-different`,
  "View the Demo" → `/demo`, "Read the Framework" → `/how-rgs-works` or
  `/stability-framework`.
- **Avoid** vague labels ("Get Started" with unclear destination), pushy
  upgrade labels, and any CTA that implies a different service lane than
  the destination actually delivers.

## Demo / sample labeling rules

Any visual or numeric content shown publicly must be honest about its
source:

- Sandbox / illustrative visuals must be labeled (e.g. "The demo uses
  illustrative sandbox visuals only. No real client data is shown.").
- Sample scorecards must read as sample/example, not as a real client
  result.
- Animations and screen recordings must not present unlabeled fictitious
  numbers as live customer data.

## Deferred

- A formal real-customer proof program (real testimonials, real case
  studies, real client logos) is intentionally not part of P44. Add only
  as approved real customer outcomes become available.
