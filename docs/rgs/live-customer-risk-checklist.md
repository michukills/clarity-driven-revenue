# RGS Live-Customer Risk Prevention Baseline

Every new module, UI element, floating element, CTA, chatbot, modal, drawer,
or workflow MUST be reviewed against the full RGS operating system before it
ships to live customers. No pass is complete until checked against:

- Public CTA flow (homepage primary CTA, secondary CTAs)
- Sticky CTA (bottom-right / mobile sticky)
- Chatbot launcher and panel
- Scorecard flow (RGS Business Scorecard)
- Checkout flow
- Account creation / signup
- Client portal (assigned tools, documents, messages)
- Admin dashboard (lifecycle board, customers, packages)
- Diagnostic interview (public self-submitted)
- Industry diagnostic interview (admin live workspace)
- Evidence vault / uploads / imports
- Reports (drafts, finalized, exports)
- Repair Map
- Implementation roadmap
- Control System
- Campaign Control (P95)
- Standalone / gig workflow (StandaloneToolRunner)
- Demo / test workflow (seeded demo accounts, isolation)

## Required output on every Lovable / Codex pass

Close every pass with a "Risk Prevented / Risk Remaining" section. Do not
claim 120/100 unless implementation AND integration review both pass.

## Known UI/conversion blockers (queued, do NOT fix in unrelated passes)

- **Chatbot + Sticky CTA Collision Fix** — the floating chatbot launcher
  overlaps the sticky CTA on the public site. Conversion blocker. Must be
  resolved before final launch verification. Fix scope:
  - Stagger z-index and bottom offsets so neither obscures the other on
    mobile (≤640px) or desktop (≥1280px).
  - On scrolled-to-CTA hero state, the chatbot should yield (collapse or
    shift) so the primary CTA stays one-tap reachable.
  - Verify across all 5 device classes and the public CTA flow.

## Industry diagnostic depth standard

See `src/lib/industryDiagnostic/depthStandard.ts` for the enforceable
contract. Industries remain `starter_bank` until they meet the full-depth
thresholds AND pass `auditBank` with zero errors. Reports must NOT consume
starter banks as if they were full-depth.

## Safety invariants (never violate)

- No legal / tax / accounting / compliance / fiduciary / valuation guarantees
- No revenue / profit / growth / lead / ROI promises
- No fake live-sync / OAuth claims
- No fake AI scoring of evidence
- Cannabis / MMJ = operational/documentation visibility ONLY
- `admin_only_notes` and `admin_observation` MUST NOT cross the client boundary
- Starter industry banks MUST NOT power client-facing reports as "complete"
