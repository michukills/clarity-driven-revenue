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