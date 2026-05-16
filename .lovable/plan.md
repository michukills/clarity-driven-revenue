# P96C — Public Funnel Architecture Correction

Goal: Make the public funnel behave as **Scan → lead activation → deeper Diagnostic (Scorecard + Interview + Review)**, not Scorecard → generic lead magnet.

## A. Public funnel + hero (frontend only)
- Rewrite `src/pages/Index.tsx` hero:
  - Primary CTA = **Run the Operational Friction Scan** (`/scan`)
  - Demote the Scorecard block from "Or go deeper" to **"Diagnostic Part 1 — Stability Assessment"** under a separate "Inside the Diagnostic" explainer (Scorecard + Owner Interview + Evidence Review → Diagnostic Report).
  - Remove "FREE Business Stability Scorecard" framing from hero.
- Update `src/lib/cta.ts`:
  - Add `SCAN_CTA_LABEL` already exists. Add `SCORECARD_DIAGNOSTIC_LABEL = "Open Diagnostic Part 1 — Stability Assessment"`.
  - Keep `SCORECARD_CTA_LABEL` constant for back-compat (referenced by pinned tests), but it is no longer rendered on the hero.
- `StickyCTA` + `Navbar` + `Footer`: already point to `/scan`. Verify scorecard nav entry is reframed as "Diagnostic Part 1".
- Update `src/pages/Scorecard.tsx` intro copy: reframe as "Diagnostic Part 1 — Stability Assessment", explain it pairs with the Owner Interview + Review to produce the full Diagnostic Report. Keep engine + lead capture untouched.

## B. Scan → lead activation (the core new behavior)
- Add a **Lead Capture stage** to `src/pages/Scan.tsx` between `result` reveal and the "next step" CTA. Pattern:
  - Show the gear-map + bottleneck immediately (it's the hook).
  - A "Have RGS review what's slipping" section invites first name, last name, work email, business name, optional phone, optional "what feels most off in one line", email consent checkbox.
  - On submit → insert row into new `scan_leads` table + invoke `scan-followup` edge function.
- New table `public.scan_leads`:
  - id, created_at, updated_at
  - first_name, last_name, email (lowercased), business_name, phone, consent_one_liner
  - email_consent (boolean, default true)
  - source = 'operational_friction_scan'
  - scan_answers jsonb, scan_summary jsonb (bottleneck headline, upstream gear, worn teeth ids, downstream items, confidence)
  - lifecycle: `prospect` (free text, not pipeline_stage — Scan leads are NOT full customers yet)
  - linked_customer_id (nullable) — set by trigger when matched
  - follow_up_email_status, follow_up_email_at, follow_up_email_error
  - manual_followup_required boolean
  - RLS: anonymous INSERT-only; SELECT/UPDATE restricted to admins via `has_role`.
- Trigger `ensure_scan_lead_customer_link`: on insert, if a `customers` row exists with same email (case-insensitive), set `linked_customer_id`. **Do NOT** auto-create a customer row from a Scan — Scans are top-of-funnel; we only link if the person already exists. This preserves "no full-client access unlock from Scan lead".

## C. New edge function `scan-followup`
- `supabase/functions/scan-followup/index.ts`, `verify_jwt = false`, anonymous-callable.
- Re-reads the scan_leads row server-side by id, validates consent, sends a Scan-specific follow-up email via existing Resend setup (reuse sender identity from `_shared/scorecard-followup-email.ts` — same FROM, new body).
- New shared template `_shared/scan-followup-email.ts`:
  - Subject: "Your Operational Friction Scan read"
  - Body summarizes: scan is directional, references the identified upstream gear/bottleneck and the "worn teeth" categories (NOT the deterministic scorecard score language), explains the full Diagnostic = Scorecard (Part 1) + Owner Interview + Review, CTA → `/diagnostic`.
  - Includes safety boundaries (no legal/tax/etc., no guarantees, John Matthew Chubb sign-off).
- Records dispatch result via new RPC `admin_record_scan_email_result` (service_role only).
- Fires admin notification through existing `_shared/admin-email.ts` with new event `scan_lead_captured`.

## D. Email automation — separation
- `scorecard-followup` stays exactly as-is. It now fires from the Scorecard (Diagnostic Part 1), not from the public lead-gen path. Body copy is **already** Scorecard-specific so no rewrite needed there.
- New `scan-followup` is the public lead-gen email.
- Admin alert helper `_shared/admin-email.ts`: add `scan_lead_captured` event alongside `scorecard_lead_captured`.

## E. Admin OS visibility
- New admin page `src/pages/admin/ScanLeads.tsx` modeled on `ScorecardLeads.tsx`:
  - Lists scan_leads rows with: contact info, source = "Operational Friction Scan", bottleneck headline, upstream gear, worn-teeth count, follow-up status, linked customer link, "request next step" flag, manual_followup_required.
- Register route in admin router.
- Add nav entry "Scan Leads" alongside "Scorecard Leads" so they are visibly distinct surfaces.

## F. Tests — update only what's now intentionally obsolete
- `src/lib/__tests__/p92aPublicFunnelAcceptance.test.ts` — keep; routes preserved.
- `p93eE5*` / `p93hCtaCleanup*` — these pin `SCORECARD_CTA_LABEL` on the hero. Update those tests to pin **Scan** as the hero primary CTA and Scorecard as the Diagnostic Part 1 secondary surface. (This is intentional architectural change — old assertions are now wrong.)
- New test `src/lib/__tests__/p96cScanLeadFunnel.test.ts`:
  - Hero asserts Scan is primary, Scorecard is "Diagnostic Part 1" only
  - Scan page contains a lead-capture form before "Open the Diagnostic-Grade Assessment"
  - `scan_leads` migration exists with RLS + trigger
  - `scan-followup` edge function exists with `verify_jwt = false`
  - `_shared/scan-followup-email.ts` references Operational Friction Scan, not "your full score is ready"
  - Admin nav exposes Scan Leads route distinct from Scorecard Leads
- Run: typecheck, full vitest, scanEngine tests.

## G. Risks
- Prevented: scorecard-as-lead-magnet drift, full-client unlock from Scan, fake-completion email language, admin lead source confusion.
- Remaining: emotional continuity on `/what-we-do`, `/system`, insights hub is deferred to P96B.2; published Resend sender domain assumed valid.

## H. Manual publish/deploy
- Migration approval (scan_leads table + trigger + RPC).
- After merge: edge functions `scan-followup` auto-deploy. No DNS/Resend changes required (reusing existing sender).
- Smoke: load `/`, confirm Scan is primary CTA; run `/scan` end-to-end on mobile 390px; verify lead row appears in `scan_leads` and admin Scan Leads page lists it.
