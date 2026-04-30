# Public Site & Scorecard — Manual Smoke Checklist

Use this checklist before any public-facing release (or after any portal /
intelligence / security change that could ripple into the public marketing
site or the public scorecard funnel). It is intentionally short and is meant
to be runnable in ~10 minutes by one person against the live preview or the
published site.

Companion automated guards live in
`src/lib/__tests__/publicSiteScorecardSmokeAudit.test.ts` and
`src/lib/__tests__/scorecardP37Hardening.test.ts`.

## 1. Public homepage

- [ ] `/` loads with no console errors (React forwardRef dev-only warnings ok).
- [ ] Hero copy renders without overflow at desktop, tablet, mobile widths.
- [ ] Primary CTA button reads **"See How Stable Your Business Really Is (0–1000)"**.
- [ ] Primary CTA navigates to `/scorecard`.
- [ ] Secondary CTA ("Book a Diagnostic Call") resolves to a real route.
- [ ] Sticky CTA pill is visible on the homepage when the in-page CTA is
      scrolled out of view.

## 2. Scorecard funnel

- [ ] Click homepage CTA → land on `/scorecard` intro step.
- [ ] No 1–10 numeric self-rating fields, no sliders.
- [ ] Click "Start the RGS Scorecard" → lead capture step renders.
- [ ] Lead form requires first name, last name, email, business name,
      business model. Submit button stays disabled until valid.
- [ ] Industry intake (business model) selection is preserved through to
      questions step.
- [ ] Each pillar shows natural-language typed answer prompts, not numeric
      scales.
- [ ] Submitting fully detailed answers reaches the result step without an
      AI/edge call (verify in the network tab).
- [ ] Result step shows: total score, pillar bands, evidence/confidence
      notes, and missing-information / recommended-focus copy where
      applicable.
- [ ] Reload `/scorecard` directly: page renders without auth.

## 3. Sticky CTA suppression

- [ ] Sticky CTA is **hidden** on `/scorecard` and `/scorecard/...`.
- [ ] Sticky CTA is **hidden** on `/start` and `/start/...`.
- [ ] Sticky CTA is shown on `/`, `/system`, `/what-we-do` when the page CTA
      is offscreen.

## 4. Footer & legal

- [ ] Footer "Terms (EULA)" link → `/eula` and renders.
- [ ] Footer "Privacy Policy" link → `/privacy` and renders.
- [ ] Footer Insights spoke links resolve.
- [ ] Social icons (Facebook / Instagram) open to the correct external URLs
      in a new tab.
- [ ] No admin or portal routes are linked from the public footer.

## 5. Mobile responsiveness

- [ ] Homepage hero, CTAs, copy fit a 390px viewport without overflow.
- [ ] Scorecard intro, lead capture, and questions are usable at 390px.
- [ ] Result page is readable at 390px.
- [ ] Footer + legal links remain reachable on mobile.

## 6. Cannabis / MMC public copy

- [ ] Any public mention of MMJ / cannabis treats it as **regulated retail**
      (inventory, margin, category, dispensary).
- [ ] No public copy describes MMJ/cannabis as healthcare, patients, claims,
      reimbursement, insurance, providers, diagnosis, or clinical care.

## 7. Security & data exposure

- [ ] DevTools network tab on `/scorecard` shows **no** call to OpenAI,
      Gemini, Anthropic, Lovable AI gateway, or any edge function.
- [ ] Scorecard insert call uses the anon key only — no `service_role`
      header, no `SERVICE_ROLE_KEY` reference in any frontend bundle.
- [ ] No OAuth access/refresh tokens appear in any public network response.
- [ ] `/admin` and `/admin/...` redirect anonymous visitors away from admin
      surfaces.
- [ ] `/portal` and `/portal/...` require authentication.
- [ ] Public pages do not show internal debug copy, TODO markers, or staff
      notes.

## 8. Final sign-off

- [ ] `bunx vitest run` is green.
- [ ] No new console errors introduced compared to the previous release.
- [ ] Sticky CTA, footer, and 404 (`/this-route-does-not-exist`) all
      behave correctly.

If any item fails, treat it as a launch blocker and file a targeted repair
slice — do not redesign the public site or change scoring logic to work
around it.