# RGS Diagnostic Evidence Statuses (P41.3)

## Principle

RGS does **not** use vague 1–5 or 0–5 subjective scoring in any diagnostic UI —
client-facing or admin-facing. Numeric severity (0..5) remains internal as a
deterministic input to the scoring engine, but is **never displayed** as a
rating.

- Clients provide facts, examples, documents, and "I don't know" answers.
- Admins/RGS apply a structured **evidence-status rubric** to each factor.
- The engine derives bands, dollar leakage, and the 0–1000 scorecard
  deterministically from the chosen statuses.

## The 7 evidence statuses

| Status               | Meaning                                                              | Internal severity |
|----------------------|----------------------------------------------------------------------|:----------------:|
| Verified strength    | Documented, consistent, operating as intended                        | 0                |
| Mostly supported     | Largely working, with minor exceptions or informal practice          | 1                |
| Unclear / needs review | Inconsistent or undocumented; requires more evidence               | 2                |
| Not enough evidence  | RGS cannot judge yet — request more from the client                  | 2                |
| Gap identified       | Clear gap with operational impact                                    | 3                |
| Significant gap      | Material impact — recurring revenue, trust, or stability loss        | 4                |
| Critical gap         | Severe, immediate constraint                                         | 5                |

The mapping lives in `src/lib/diagnostics/engine.ts`:

- `EVIDENCE_STATUS_OPTIONS` — canonical list with labels, hints, and tones
- `evidenceStatusToSeverity(status)` — internal numeric mapping
- `severityToEvidenceStatus(n)` — reverse mapping for legacy data

## UI rules

- The numeric severity is **never** shown to client or admin.
- Labels in shared diagnostic UI use evidence language:
  - `Avg severity` → `RGS evidence assessment` (admin) / `Evidence status` (client)
  - `Why this score` → `Evidence basis` (admin) / `What we observe` (client)
  - `score / 5`, `severity / 5` → removed entirely
- Pickers (`FactorScorer`, `SeverityRow`) render the seven categorical
  statuses as labeled tone-coded chips. They still call `onScoreChange` with
  the mapped numeric value so the engine math is unchanged.

## What's preserved

- The deterministic 0–1000 public scorecard (`src/lib/scorecard/rubric.ts`).
- The `DiagnosticReport` band/category math.
- `ClientToolGuard`, the P41 Owner Diagnostic Interview gate, diagnostic
  sequencing, RLS, payments, invites, tenant isolation, and
  implementation/RCS access locks.

## Tests

- `src/lib/__tests__/clientFacingNoSelfScoringContract.test.ts`
  - Walks every file under `src/pages/portal`, `src/components/portal`,
    `src/components/tools`, `src/components/reports`,
    `src/pages/admin`, `src/components/admin`, `src/components/diagnostics`,
    and `src/components/bcc`.
  - Fails on `[0,1,2,3,4,5]` or `[1,2,3,4,5]` numeric button arrays.
  - Fails on `score / 5`, `severity / 5`, `Avg severity`,
    `RGS internal severity`, `Why this score`.
  - Asserts the deterministic mapping in
    `evidenceStatusToSeverity` / `severityToEvidenceStatus`.
