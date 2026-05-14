# P93E-E2D — Plain-English Scorecard + Server-Side Classifier

## Goal

Replace the public Scorecard's selectable-option cards with a plain-English text intake. A backend classifier (AI when wired, deterministic rules as honest fallback) maps each owner answer to one of the existing v3 rubric option ids. Deterministic v3 weighted scoring (5 gears × 200 = 1000) remains the only source of the score.

## Non-Goals

- No change to v3 rubric weights, gear architecture, or 0–1000 math.
- No change to v2 historical compatibility.
- No change to lead capture, scorecard-followup, admin resend, homepage E5, or P93F cleanup.
- No frontend AI keys.

## Architecture

```text
[Public Scorecard UI]
   owner types plain English answers (one textarea per question)
        │
        ▼ (submit, after lead capture)
[Edge Function: scorecard-classify]
   input:  { runId, rubricVersion, answers: [{ question_id, gear, owner_text }] }
   logic:  prefer Lovable AI Gateway (gemini-3-flash-preview) constrained
           to allowed option_ids per question via tool-calling JSON schema.
           If AI unavailable / invalid JSON / low confidence → deterministic
           keyword rules fallback. Conservative bias: when unsure, pick the
           lowest-credit option AND mark low_confidence.
   output: per-answer { question_id, classified_option_id, confidence,
           rationale, insufficient_detail, follow_up_question?,
           classifier_type: "ai" | "rules" | "fallback" }
        │
        ▼
[Client] receives classifications → builds V3Answers map →
   scoreScorecardV3() runs unchanged (deterministic) →
   inserts scorecard_runs row with new `answers` shape (see schema)
        │
        ▼
[Admin] views original owner text + classified option + confidence + rationale
```

The classifier NEVER returns a score. It only returns option_ids that already exist in `rubricV3.ts`. Validated via zod against the per-question allowed option set on the edge.

## Data / Schema

New table: `scorecard_answer_classifications`
- `id uuid pk`
- `run_id uuid` (fk → scorecard_runs.id, on delete cascade)
- `question_id text`
- `gear text`
- `owner_text text`
- `classified_option_id text`
- `confidence text` ('high'|'medium'|'low')
- `classification_rationale text`
- `insufficient_detail boolean default false`
- `follow_up_question text null`
- `classifier_type text` ('ai'|'rules'|'fallback')
- `rubric_version text`
- `created_at timestamptz default now()`

RLS:
- Public insert allowed only via the edge function using service role (no direct client insert).
- Admin select via existing `has_role(auth.uid(), 'admin')`.
- No client/select policy for non-admins.

Existing `scorecard_runs.answers` (jsonb) keeps the same flattened shape so v2 reads continue. We add the per-answer `owner_text` and `classifier_meta` inside the existing per-question entry — additive, non-breaking.

## UI Changes (`src/pages/Scorecard.tsx`)

- Remove `AssessmentQuestion` selectable-card radio group as the primary input.
- Replace with `TextIntakeQuestion`:
  - prompt + helper
  - single `<Textarea>` (placeholder shows example; not selectable scoring choices)
  - optional "what to mention" hint chips (descriptive, not selectable scoring)
  - 600-char soft cap, 30-char minimum to count as answered
- Submit flow:
  1. Lead gate (unchanged)
  2. Submit → show Submitting state
  3. Call `scorecard-classify` edge → get classifications
  4. Build `V3Answers` from classifications
  5. Run `scoreScorecardV3()` deterministically
  6. Insert `scorecard_runs` (existing table) + insert classifications batch
  7. Invoke `scorecard-followup` (unchanged)
  8. Show Result with low-confidence note if any classifications were conservative
- Results page: add small line "Some answers were interpreted conservatively because they were unclear. The paid Diagnostic reviews evidence and resolves ambiguity." when any low-confidence flag exists.
- Copy sweep: remove "select", "choose", "operational state" framing on questions; keep deterministic-rubric explainer.

## Classifier (Edge Function `scorecard-classify`)

- `verify_jwt = false` (public endpoint, like scorecard-followup)
- Input validated by zod; rejects unknown question_ids
- Builds per-question `allowed_option_ids` from the same rubric data (mirror of `rubricV3.ts` minimal subset embedded in the function — kept in sync via a generated JSON or a small hand-maintained map; for v1 we hardcode in the function).
- Calls Lovable AI Gateway with tool-calling forcing `{ classifications: [{ question_id, classified_option_id, confidence, rationale, insufficient_detail, follow_up_question? }] }`.
- Validates each `classified_option_id ∈ allowed_option_ids[question_id]`. If not, fallback to rules.
- Rules fallback: simple keyword heuristics + always-conservative default (lowest-credit option, low confidence, insufficient_detail=true).
- If `LOVABLE_API_KEY` missing → all-rules path, classifier_type='rules'.
- Never returns scores. Caps prompt size. Strips PII from logs.

## Admin Visibility

- New section in the existing admin Scorecard run detail page rendering classifications: owner text, classified label, confidence pill, rationale, low-confidence flag.
- Read-only via `has_role(auth.uid(), 'admin')`.

## Tests

Client/unit:
- Plain-text intake renders `<textarea>` per question; no `role="radiogroup"` and no selectable cards.
- Owner text is sent to classifier; classifier output drives V3Answers.
- Deterministic scoring: each gear ≤ 200, total ≤ 1000, weights non-uniform (existing v3 tests preserved).
- Low-confidence flag surfaces results-page disclaimer.
- No frontend secrets / no `service_role` strings in `src/`.

Edge:
- `scorecard-classify` rejects unknown question_id.
- Classifier output schema-validated; invalid AI JSON falls back to rules.
- Conservative fallback returns lowest-credit option with low confidence.
- Question maxPoints/weights untouched.

Regression:
- E5 homepage tests, E4 email/admin tests, P93F tests still pass.
- v2 historical reads unchanged.

## Risks / Honest Limits

- Classifier quality depends on Lovable AI Gateway availability. v1 launches with rules fallback honestly labeled; AI path is wired and logged but not blocking.
- Rewriting 30 selectable-card answers into honest plain-English UX increases time-to-complete; we keep the 10–15 min framing and add gentle prompts.
- This is a multi-file, schema-touching change; landing it requires one migration approval cycle before code lands cleanly.

## Landing Order

1. Migration: `scorecard_answer_classifications` table + RLS.
2. Edge function `scorecard-classify` (rules-only first, AI behind feature check on `LOVABLE_API_KEY`).
3. UI rewrite of `Scorecard.tsx` to text intake + new submit flow.
4. Admin run-detail view extension.
5. Tests + copy sweep + verification (typecheck, build, secret scan).

## Confirmation Needed

This is a 5–7 file change plus a schema migration plus an edge function. Confirm:
- (a) Proceed with this plan as scoped.
- (b) AI classifier should run live via Lovable AI Gateway (default `google/gemini-3-flash-preview`) when `LOVABLE_API_KEY` is set; deterministic rules otherwise. OK?
- (c) OK to ship classifier_type='rules' as the launch state and let AI take over once verified.
