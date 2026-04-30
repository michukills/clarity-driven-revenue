# Scorecard — Lead Capture After Inputs (Manual Checklist)

Verifies the public scorecard funnel order: users complete all answers
before contact capture, but must submit contact details before the score
and pillar results are revealed.

## Flow under test

1. Intro
2. Natural-language pillar questions (no contact form yet)
3. Silent deterministic scoring (hidden)
4. Lead/contact capture gate
5. `scorecard_runs` insert
6. Results revealed

## Steps

1. Open `/scorecard` in an incognito window.
2. Confirm the intro CTA reads **"Start the RGS Scorecard"**.
3. Click it. Confirm you land directly on the **first pillar's questions**,
   not on a contact form.
4. Type natural-language answers across all 5 pillars. Confirm:
   - No numeric 1–10 inputs.
   - No sliders.
   - No contact fields are visible at any pillar.
5. On the final pillar, click **"See my read"**.
   - If evidence is "low", a prompt appears. Both **Review answers** and
     **Submit anyway** must NOT reveal a score. *Submit anyway* should
     route to the lead capture gate, not directly to results.
6. Confirm the lead gate page shows:
   - Eyebrow: *Your scorecard is ready*.
   - Headline: *Enter your contact details to view your read*.
   - Required fields: first name, last name, work email, business name,
     business model.
   - Submit button reads **"View my scorecard"**.
7. Before submitting the lead form, open DevTools and confirm the page
   does NOT contain the rendered overall score, pillar bands, or
   recommended focus.
8. Submit the lead form. Confirm:
   - A row is inserted into `scorecard_runs` with answers, contact fields,
     deterministic score, pillar results, evidence/confidence,
     `rubric_version`, `recommended_focus`, and timestamps.
   - Only after the insert, the results screen renders the 0–1,000 score,
     pillar maturity grid, and confidence explainer.
9. Refresh the results screen. Confirm component state resets to the
   intro (no score visible without re-completing the funnel).
10. With the network tab open, confirm there are NO calls to
    `functions/v1/...` (no AI / edge invocations) during scoring or save.
11. On a 375px viewport, repeat steps 3–8. Confirm the gate and questions
    remain readable and submit works.
12. Confirm the Sticky CTA does NOT appear on `/scorecard` at any step.
13. If the save fails (force a network error), confirm the user sees a
    calm error and the score remains hidden.
