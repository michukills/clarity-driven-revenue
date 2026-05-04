# Medical Terminology Clarification

RGS does **not** currently include a general medical / healthcare industry
vertical. Anywhere the word "medical" appears in this codebase it must mean
one of the following only:

- MMJ
- Medical Marijuana
- Cannabis dispensary operations
- Cannabis retail / regulated cannabis operations
- Recreational cannabis (Rec)

It must **never** mean: healthcare, clinics, doctors, patient care, HIPAA,
insurance claims, medical billing, clinical workflows, treatment plans,
patient intake, healthcare compliance, or healthcare operations.

## Preferred phrasing

Use:
- Cannabis / MMJ / Medical Marijuana / Recreational
- Cannabis / MMJ / MMC / Rec
- Cannabis dispensary operations
- Cannabis retail operations
- Compliance-sensitive cannabis operations

Avoid in disclaimers and copy:
- "Medical industry"
- "Medical operations"
- "Medical compliance"
- "Medical review"
- "Healthcare"
- "Patient workflows"
- "Clinical"
- "HIPAA"
- "Insurance claims"

Disclaimers that previously listed `HR / medical review` as the trailing
item have been updated to instead list `HR / healthcare or clinical
review`, so that the word "medical" is reserved for the cannabis/MMJ
context only.

## Future expansion

If RGS later adds a real healthcare/medical industry vertical, it must be
a separate vertical with its own brain, scoring weights, and tool surfaces
— it must not be merged with the existing Cannabis / MMJ / MMC logic.

## Enforcement

- `src/lib/intelligence/industryBrains/medicalMmc.ts` is cannabis-only and
  guarded by `cannabisIndustryP20_4a.test.ts`.
- Customer-facing healthcare wording is guarded by
  `industryLogicContract.test.ts` and
  `intelligencePanelsP20_4c.test.ts` (and similar).
- This file plus the audit doc are the source of truth for the
  terminology convention.