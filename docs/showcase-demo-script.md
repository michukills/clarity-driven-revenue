# RGS OS — Multi-Stage Showcase Demo Script

**Purpose:** Run a credible, evidence-grounded grant demo using four synthetic showcase customers that illustrate how RGS OS gets sharper as evidence accumulates.

All four accounts are seeded by **Admin → Settings → "Seed / refresh showcase"** (idempotent). Every record is `is_demo_account = true`, `learning_enabled = false`, `contributes_to_global_learning = false`, and uses the `*@showcase.rgs.local` email suffix. They never pollute global pattern intelligence.

## Cast

| Account | Stage | Story in one line |
|---|---|---|
| **Atlas Home Services** | Early lead, thin evidence | The system refuses to overclaim and asks for proof. |
| **Northstar HVAC** | Diagnostic, medium evidence | Owner belief vs. evidence — validation checklist drives next steps. |
| **Summit Roofing & Restoration** | Implementation, strong evidence | Findings become SOP work, owner-handoff, and assigned tasks. |
| **Keystone Plumbing Co.** | RCC, 8-week timeline | Outcomes are logged, owner beliefs get contradicted, OS gets sharper. |

---

## 5-minute grant demo

**Goal:** Prove the OS is evidence-disciplined and learns over time.

1. **Open Admin → Customers.** Point out the four showcase rows visibly labeled with the demo badge. *"These are synthetic accounts. Real client data is segregated."* (~30s)
2. **Open Atlas → Diagnostic / Report Drafts.** Show low-confidence draft + missing-info list. *"With thin evidence, RGS does not invent findings. It tells us what to collect."* (~45s)
3. **Switch to Northstar.** Open the diagnostic interview run → evidence map + validation checklist. *"Now we have partial QuickBooks + CRM. The system separates owner belief from evidence and queues what to validate first."* (~60s)
4. **Switch to Summit.** Show approved report + customer tasks + checklist + SOP-gap recommendations. *"Once evidence is strong and the report is approved, findings turn into owned work."* (~45s)
5. **Switch to Keystone.** Open report drafts list — three snapshots: Week 1, Week 4, Week 8. Open Week 8 → recommendations + learning events. *"Eight weeks of weekly check-ins and QuickBooks summaries. AR over 60 days dropped 22%. One owner belief — that capacity was maxed at 90% — was contradicted by data showing 72% utilization. The OS learned, the recommendation changed."* (~90s)
6. **Close.** *"Same OS, four maturity stages. Discipline at the bottom, learning at the top."* (~30s)

---

## 12-minute deeper demo

Use the 5-minute flow as the spine, then expand each stop.

### 1. Atlas Home Services — Discipline (2 min)
- **Pages:** Admin → Customers → Atlas → Diagnostic Workspace; Report Drafts → initial draft.
- **Show:** missing-information list (no accounting summary, no AR data, no pipeline, no SOP), connected-source request for QuickBooks, scorecard with low confidence per pillar.
- **Talking points:**
  - "Three pillars scored low-confidence on purpose."
  - "The recommendations are not strategic — they are evidence requests."
  - "RGS will not generate a polished narrative without evidence to back it."
- **Do not claim:** any operational improvement for Atlas yet.

### 2. Northstar HVAC — Validation (2.5 min)
- **Pages:** Diagnostic interview run; Report Draft (status: needs review); Connected sources.
- **Show:** evidence map with mixed source/owner-statement entries; validation checklist with open/in-progress items; QuickBooks active, HubSpot requested.
- **Talking points:**
  - "Repeat-client revenue ~55% is sourced from QB. Owner-bottleneck claim is owner-statement only — flagged for validation."
  - "Recommendations are tied to specific evidence items, not generic best practices."
  - "The validation checklist is the next-step generator."
- **Do not claim:** that recommendations are final or implemented.

### 3. Summit Roofing & Restoration — Action (2.5 min)
- **Pages:** Report Drafts → approved diagnostic report; Implementation workspace → tasks + checklist; Customer detail → SOP gaps + owner-handoff.
- **Show:** approved/high-confidence report; "Document estimating SOP" task in progress; checklist progressing; field-to-billing handoff gaps recommended.
- **Talking points:**
  - "Evidence base is strong: QB + invoice detail + SOP audit + incident log."
  - "The OS turned three findings into three concrete work items with owners and target gears."
  - "Owner-dependence is now a measurable, scoped reduction project."
- **Do not claim:** that all SOPs are done — show the in-progress state honestly.

### 4. Keystone Plumbing Co. — Learning over time (4 min)
This is the headline story. Slow down here.
- **Pages:**
  - Customer detail → 8 weekly check-ins.
  - QuickBooks period summaries (3+ periods).
  - Report Drafts → Week 1, Week 4, Week 8 snapshots side-by-side.
  - Week 8 draft → recommendations + learning events panel.
- **Show / talking points:**
  - **Week 1:** baseline. Owner does every enterprise renewal. AR > 60 = 14%. Recommendation: pilot delegation.
  - **Week 4:** AR > 60 down 11%. Pilot is working. One earlier recommendation (emergency-dispatch SOP) is **rejected** because new evidence reprioritized it. The OS shows the rejection event in the learning timeline.
  - **Week 8:** AR > 60 down **22%**. Renewal-delegation pilot succeeded → codify SOP. **Owner belief was "no slack at 90% utilization." Data shows 72%.** Belief contradicted; new recommendation generated to evaluate Q4 capacity expansion.
  - "Recommendations changed because evidence changed. The OS remembers what was generated, accepted, rejected, and what outcome it produced."
- **Do not claim:** that the OS auto-executes work or replaces operators. The OS proposes; humans approve.

---

## What we explicitly do NOT claim during the demo

- No paid AI inference is happening on these accounts. All payloads are deterministic.
- Showcase data is **excluded from global learning** — we do not pretend Keystone's outcomes train the model for real clients.
- Only QuickBooks has live-sync code; other connected sources are request/setup placeholders. Do not imply OAuth for Stripe / Jobber / HubSpot.
- These accounts are synthetic. Numbers are illustrative, not benchmark claims.
- We do not show admin-only notes inside the client preview. The trust boundary is real.

---

## Pre-demo checklist

- [ ] Re-run **Admin → Settings → "Seed / refresh showcase"** within the last 24 hours so timestamps look fresh.
- [ ] Confirm all four accounts visible in Admin → Customers with demo label.
- [ ] Open each account once to warm caches and verify pages render.
- [ ] For Keystone, confirm Week 1 / Week 4 / Week 8 report drafts each open without error.
- [ ] Use **View as client → Keystone Plumbing Co.** to confirm portal preview works for the closing flourish.
- [ ] Have this script open on a second screen.

---

## Reset / cleanup

Re-running the seed is safe and idempotent. To remove the showcase set entirely, archive the four `*@showcase.rgs.local` customers from Admin → Customers; their child rows are already excluded from global learning so no further cleanup is required.