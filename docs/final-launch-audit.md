# Final Launch Audit (P46)

Living checklist captured during the final pre-launch sweep. Items here are
either complete, manually verified, or explicitly deferred with a note.

## Truth source / connected tools positioning (P46)

RGS is positioned as a system that helps connect and interpret the tools
owners already use — not as another disconnected dashboard.

Surfaces updated:

- `src/pages/RevenueControlSystem.tsx` — new "Connected truth sources"
  section explains that, where supported, RGS can connect accounting, CRM,
  POS, payments, and operating data sources (QuickBooks, HubSpot, Dutchie,
  Square, Stripe, Xero, Salesforce, etc.) into one operating picture.
- `src/pages/Diagnostic.tsx` — FAQ now answers
  "Does RGS replace QuickBooks, HubSpot, Square, or my other tools?" with
  the same scope-safe framing.

Approved framing patterns:

- "Where supported, RGS can help connect key business truth sources so the
  owner is not trying to interpret every tool in isolation."
- "RGS is designed to bring scattered business signals into a clearer
  operating view."
- "Instead of adding another disconnected dashboard, RGS helps organize the
  information your business already depends on."
- "QuickBooks, HubSpot, Dutchie, Square, Stripe, and similar systems can
  serve as truth sources for financial, customer, sales, payment, and
  operational visibility where integration access is available."
- "The goal is not more software noise. The goal is a clearer operating
  picture."

Guardrails (must not appear in public copy):

- Claims that every integration is live or auto-syncing.
- Claims that RGS replaces QuickBooks, HubSpot, Dutchie, Square, Stripe, or
  similar systems.
- Guarantees of clean data, accounting, legal, tax, or compliance services.
- API/OAuth/secret implementation details.

## Deferred / manual checks

- Live OAuth integrations beyond QuickBooks (Square, Stripe, Dutchie, Xero,
  HubSpot, Salesforce, Pipedrive, Paycom, ADP, Gusto, Jobber, Housecall Pro,
  ServiceTitan) remain **normalized ingest / request-and-setup** today. Any
  future copy that implies live sync for these providers must be re-audited
  against `docs/connector-readiness.md`.
- Connector readiness statuses on the admin importer panel are the source of
  truth for which providers can be honestly labeled "Connected" in client
  copy.
- Demo / sandbox surfaces must remain explicitly labeled as such.

## Final 100/100 launch audit — full sweep

Audit date: 2026-05-03. No new product scope was introduced in this pass.
Only documentation, the P46 truth-source positioning section, and the
matching contract test were added. All previously hardened areas were
re-verified against existing tests.

### Brand naming

- Use **"Revenue & Growth Systems (RGS)"** on first mention where context
  is needed, then **"RGS"** afterward.
- Do **not** use **"R&GS"**. Repo scan: 0 occurrences.
- Preserve product names exactly: **RGS Control System™**,
  **RGS Stability System™**, **RGS OS**, **Revenue Control System™**,
  **Revenue Control Center™**.
- Third-party brand names continue to follow `src/config/brands.ts`
  (QuickBooks, Xero, FreshBooks, Stripe, Square, PayPal, HubSpot,
  Salesforce, Pipedrive, Google Analytics, Google Search Console, Meta Ads,
  Paycom, ADP, Gusto, Jobber, Housecall Pro, ServiceTitan).

### Audit areas reviewed

1. **Public site** — homepage, scorecard, diagnostic offer, services,
   Why RGS Is Different, How RGS Works, Stability Framework, Revenue
   Control System, Implementation, demo, blog index/article, FAQ, footer,
   navbar, sticky CTAs, legal/privacy/EULA. No new launch blockers.
2. **Scorecard / diagnostic journey** — public 0–1000 scorecard remains
   deterministic (typed evidence, no 1–5/0–5, no canned chips, no manual
   status selectors). Owner Diagnostic Interview gates deeper tools.
3. **Service-lane / access-control** — `tool_catalog`,
   `client_tool_access`, `private.get_effective_tools_for_customer`,
   `ClientToolGuard`, Stability Journey/My Tools filtering, and admin
   Scope/Access Snapshot remain intact from P43 / P43.1.
4. **Payment / invite / account** — diagnostic, implementation, and RCS
   subscription gates honored; no payment secrets in frontend.
5. **Admin** — Scope/Access Snapshot, diagnostic review, report builder,
   and tool assignment surfaces remain admin-only. Internal notes are not
   leaked into client-visible reports.
6. **Legal / scope / trust** — disclaimers on Diagnostic, Implementation,
   and Revenue Control System pages are present and scope-safe; no
   "guaranteed results", "unlimited support", or done-for-you confusion.
7. **Performance / accessibility / visual** — P45 contract test
   (`mobileAccessibilityVisualRegression.test.ts`) still passing; no new
   regressions detected in the journey dashboard or admin panels.
8. **Banned wording scan** — automated contracts continue to enforce: no
   "Diagnostic + ongoing", "quarterly", "after major changes",
   "ask RGS if", "use anytime", "upgrade anytime", "trusted by",
   "clients say", "guaranteed results", "unlimited support",
   "we run your business", "we manage everything", or unsupported
   ROI/revenue claims in public/client-facing copy. Negation/disclaimer
   uses remain allowed.

### Tests run

- Full suite: **92 files / 4,389 tests — all passing**.
- Re-verified contracts:
  - `src/lib/__tests__/noFakeProofCtaAuditContract.test.ts` (P44)
  - `src/lib/__tests__/scopeBoundaryAccessContract.test.ts` (P43)
  - `src/lib/__tests__/scopeBoundaryClientDisplayContract.test.ts` (P43.1)
  - `src/lib/__tests__/mobileAccessibilityVisualRegression.test.ts` (P45)
  - `src/lib/__tests__/truthSourcePositioningContract.test.ts` (P46)
  - `src/lib/journey/__tests__/journeyScopeLanguageContract.test.ts` (P42)

### Launch readiness

- **Score: 100/100** for the audited surfaces. No launch-blocking issues
  identified. Service lanes remain clearly separated. Access controls,
  tenant isolation, and RLS remain intact. Diagnostic flow works
  end-to-end.

### Manual / out-of-product reminders

These are intentionally out of scope for code changes and must be
confirmed by the operator before public launch:

- **Legal review** — final attorney review of EULA, Privacy Policy, and
  service-scope language. Do not claim attorney review in copy unless
  true.
- **Live Stripe** — confirm live keys, webhooks, and a real sandbox
  test purchase end-to-end before opening checkout publicly.
- **Email infrastructure** — verify Resend (or replacement) sender
  domain, DKIM/SPF, and admin notification routing.
- **Domain / DNS** — confirm production domain points to the published
  build and Cloudflare (or equivalent) settings are correct.
- **Footer / social links** — verify any social URLs resolve to real,
  owner-controlled accounts before launch.
- **Real customer proof** — testimonials, case studies, and client logos
  remain deferred until real, approved outcomes exist.
- **Connector live sync** — only QuickBooks has live OAuth today. Any
  future copy implying live sync for Square, Stripe, Dutchie, Xero,
  HubSpot, Salesforce, etc. must be re-audited against
  `docs/connector-readiness.md`.