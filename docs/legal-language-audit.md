# P36 — Legal / Scope / Expectation Language Audit

Sitewide pass to ensure RGS public, checkout, portal-onboarding, offers,
footer, and legal-page surfaces do not overpromise outcomes or imply
regulated advice. Locked in by `legalScopeLanguageContract.test.ts`.

## Surfaces audited

- Public site: `Index`, `WhatWeDo`, `System`, `Diagnostic`, `DiagnosticOffer`,
  `Implementation`, `RevenueControlSystem`, `Services`, `ServicePages`,
  `About`, `Contact`, `Insights` (+ spokes), `HowRGSWorks`, `Visibility`,
  `WhyRGSExists`, `WhyRGSIsDifferent`, `BusinessMRI`, `Demo`, `Scorecard`,
  `RevenueScorecard`, `StabilityFramework`.
- Checkout / intake: `DiagnosticApply` (incl. P35 acknowledgements),
  payment success copy.
- Portal onboarding: `portal/Auth`, `ClaimInvite`.
- Footer: `components/Footer.tsx` legal row + disclaimers.
- Legal pages: `pages/Privacy.tsx`, `pages/Eula.tsx` (both flagged as
  draft placeholders pending attorney review — no Terms.tsx yet, EULA
  serves as Terms link).

## Findings (and resolutions)

| Surface | Issue | Resolution |
|---|---|---|
| `DiagnosticOffer` "What This Is Not" | Did not explicitly call out "not legal/tax/financial advice", "not a guarantee", "not execution". | Added three additional bullets + scope note (one primary product/service, portal access not instant). |
| `portal/Auth` | No legal-link footnote or no-advice/no-guarantee disclaimer at sign-in. | Added inline footnote linking `/eula` + `/privacy` with no-guarantee/no-advice line. |
| `ClaimInvite` | Same gap at account-creation moment. | Added the same footnote under the create-account form. |
| Public pages overall | Scanned for "guarantee", "10x", "skyrocket", "we run your business", "done-for-you execution", "instant unlock", "official partner of <Brand>", "we provide legal/tax/financial advice". | None found. Locked by contract test going forward. |
| Public pages overall | Scanned for fabricated proof: `<blockquote>`, "testimonial", "case study". | None found in client-facing surfaces. Locked by contract test. |

## Existing protections preserved

- P31 invite-only account creation: unchanged.
- P32–P33 admin notification + email pipeline: unchanged.
- P34 report-export safety allowlist: unchanged.
- P35 first-client acknowledgement gates (`ack_no_guarantee`,
  `ack_one_primary_scope`): preserved and asserted in the new contract test.
- Footer disclaimers (not financial/legal/tax advice; no third-party
  affiliation; client data handling) preserved.

## Legal pages

`Privacy.tsx` and `Eula.tsx` already exist as **draft placeholders** with
a visible banner stating they must be reviewed by qualified legal counsel
before production use. No new legal copy was written in this pass — the
goal is to clarify expectations, not to produce attorney-grade documents.
A Terms page is intentionally not added; `/eula` doubles as the Terms
link in the footer.

## Brand voice

Voice remained calm, direct, plain-spoken. No legalese rewrites were
applied to body copy. Disclaimers are short, in muted footnote treatment,
and respect the dark-theme design tokens (no new colors).

## Pre-launch checklist for the owner

- [ ] Have an attorney review `Privacy.tsx` and `Eula.tsx` and replace the
      draft banner.
- [ ] Confirm the legal entity name (`Revenue & Growth Systems LLC`) and
      jurisdiction listed in those pages.
- [ ] Decide whether a separate `Terms.tsx` is needed or whether `/eula`
      should remain the single Terms surface.
- [ ] Re-run `vitest run` after any copy changes — the contract test
      will catch regressions in guarantee / advice / proof language.