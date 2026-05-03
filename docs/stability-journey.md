# Stability Journey (P42)

The Stability Journey is the client-facing progression layer built on top of the
P41 Owner Diagnostic Interview gate and the persisted `diagnostic_tool_sequences`
order. It turns a flat tool list into a guided "business mapping" experience so a
paid diagnostic client knows exactly what to do next, what evidence has been
captured, and where they sit relative to a real RGS Stability Report.

It is **derivation only**. It never invents scores, completion, or report state.

## How P41 feeds P42

| P41 surface                              | P42 derivation                                  |
| ---------------------------------------- | ----------------------------------------------- |
| `customers.owner_interview_completed_at` | Gates the journey; drives "interview complete"  |
| `diagnostic_intake_answers`              | Feeds five-gear progress + evidence strength    |
| `diagnostic_tool_sequences` (rank/override) | Drives recommended next move                |
| `diagnostic_tool_runs` (status=completed)| Marks tools complete + strengthens gears         |

## Recommended Next Move

1. If the Owner Diagnostic Interview is incomplete → Owner Diagnostic Interview.
2. Otherwise walk `effectiveSequence(sequence)` (admin override applied) and pick
   the first tool not in `completedToolKeys`.
3. If every sequenced tool is complete, surface a "strengthen evidence" pivot for
   the weakest gear.
4. If gears are all at strong evidence, surface "Awaiting RGS review" — never a
   "report ready" claim.

## Admin Override

`effectiveSequence` honours `admin_override_keys` first, then `ranked_tool_keys`.
Override is recorded with `admin_override_by` / `admin_override_at`. P42 simply
consumes the result; it does not bypass override.

## Five Gear States

Five gears: Demand Generation, Revenue Conversion, Operational Efficiency,
Financial Visibility, Owner Independence.

For each gear:

- `not_started` — no interview answers and no completed tool.
- `in_progress` — owner interview complete but gear still has 0 answers.
- `evidence_light` — partial answers, tool not complete.
- `evidence_moderate` — all interview keys answered, tool not complete.
- `evidence_strong` — gear's primary diagnostic tool completed.
- `ready_for_review` — tool completed AND all interview keys answered.
- `diagnosed` — reserved for future report-linked state.

"I don't know" counts as captured evidence — the diagnostic intentionally accepts
it; we do not penalise honest gaps.

## Evidence Strength

Aggregated across the five gears:

- `strong` — at least 4 gears at strong evidence.
- `moderate` — at least 3 gears at moderate-or-stronger evidence.
- `light` — at least 1 gear with any captured evidence.
- `none` — nothing captured.

## Report Readiness

Report readiness mirrors the journey phase. The string `stability_report_ready`
is **only** produced when an explicit `reportState === "ready"` is passed in.
There is no path through pure interview/tool completion that fakes a "report
ready" status. The default phase ceiling without a real report record is
`ready_for_rgs_review`.

## Scope Language (banned in journey copy)

Because the journey lives entirely inside the paid diagnostic scope, journey copy
must not blur lanes into RCS or imply ongoing service. The following are banned
in `src/lib/journey/**`, `src/components/journey/**`,
`src/components/admin/AdminStabilityJourneyPanel.tsx`, and this document:

- "quarterly", "then quarterly", "run quarterly"
- "Diagnostic + ongoing" / "diagnostic + ongoing"
- "ongoing review", "ongoing monitoring", and unscoped "ongoing"
- "ask RGS if", "use anytime"
- "after major changes", "between reviews"
- "fake proof", "fake testimonial", "fake case study", "guaranteed result"

If "ongoing" is ever required, it must be explicitly scoped to an active
RCS / Revenue Control System / subscription context. Journey copy should
prefer to avoid the word entirely.

## Promises that must NOT be made to diagnostic-only clients

- No promise of ongoing monitoring, reviews, or subscription-grade cadence.
- No promise of guaranteed revenue lift.
- No claim that the Stability Report exists before RGS produces it.
- No fabricated benchmarks, scores, or peer comparisons.

## Logic that must not be weakened in future passes

- Owner Diagnostic Interview gate (P41) must remain the entry condition.
- Recommended next move must always honour the persisted sequence and admin
  override, never a client-side reorder.
- Report readiness must never claim "ready" without a real report state.
- Gear states must remain derivation-only — no manual override that fakes
  completion.
- Evidence strength must remain deterministic from captured answers + completed
  tools, never a self-rated number.