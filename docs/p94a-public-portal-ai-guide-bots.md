# P94A - Public + Portal AI Guide Bots

Status: implemented in Codex on 2026-05-13. Requires Lovable frontend publish, Supabase Edge Function deployment, AI secret verification, and live smoke verification before it should be treated as live-complete.

Implemented surfaces:
- Sticky bottom-right guide that starts as a quiet text bar and expands only after user interaction.
- Public RGS Guide for RGS, Scorecard, Diagnostic, Implementation, and Control System questions.
- Client Portal Guide with client-safe context boundaries.
- Admin OS Guide with admin-only context boundaries.
- Image/document-to-input assist for authenticated client/admin users only; extraction is draft-only and requires confirmation before use.

## Purpose

Build and harden the RGS public website guide bot, client portal guide bot, and admin OS guide bot. These bots should create a guided operating-system experience: they help visitors understand RGS, help clients know what to do next, help admins move through reviews and approvals, and safely convert images/documents into draft structured inputs.

These are not generic chat widgets. They must act as role-aware RGS workflow guides.

## Bot Surfaces

### Public Website Guide Bot

Purpose: explain RGS, the public Scorecard, the paid Diagnostic, Implementation, and the RGS Control System to a cold visitor.

Must answer:
- What RGS does.
- Who RGS is for.
- What the free Scorecard is.
- What someone gets from the Scorecard.
- How the paid Diagnostic is different.
- What happens after the Diagnostic.
- Why RGS is the architect, not the operator.
- What the five gears are.

Must route:
- Take free Scorecard.
- Compare Scorecard vs Diagnostic.
- Book or request Diagnostic.
- Read how RGS works.

Must not:
- Access portal, client, or admin data.
- Fully diagnose from chat.
- Promise outcomes.
- Claim legal, tax, accounting, compliance, valuation, revenue, profit, or growth guarantees.

### Client Portal Guide Bot

Purpose: help clients understand their current stage, next action, assigned tools, evidence requests, reports, and workflow boundaries.

Must help clients:
- Understand where they are in the RGS process.
- Know what to do next.
- Find assigned tools.
- Understand evidence requests and clarification questions.
- Understand Scorecard, Diagnostic, Implementation, and Control System boundaries.
- Turn uploaded image/document content into draft structured input for review.

Must not:
- Expose admin notes.
- Expose other client data.
- Access admin-only tools.
- Submit final answers without client confirmation.
- Override deterministic scoring.
- Claim evidence proves legal, tax, compliance, valuation, or financial accuracy.
- Publish AI conclusions as final.

### Admin OS Guide Bot

Purpose: help admin operate the OS, review client status, spot blockers, prepare next actions, and improve deliverables.

Must help admin:
- Summarize client status.
- Identify current blockers.
- Show next best admin action.
- Identify missing evidence.
- Review Scorecard lead quality.
- Summarize worn-tooth signals.
- Suggest clarification questions.
- Draft admin-reviewed client messages.
- Process uploaded images/docs into draft structured fields.
- Route to correct workflows/pages.
- Explain what needs review before publishing.

Must not:
- Override deterministic scoring.
- Publish client-visible output without approval.
- Leak admin notes to clients.
- Expose secrets.
- Cross client boundaries.
- Certify legal, tax, accounting, compliance, valuation, or outcome claims.
- Auto-delete, archive, approve, send, or publish without explicit admin action.

## Image/Document-To-Input Assist

Workflow:
1. User uploads or selects an image/document.
2. AI extracts likely fields.
3. AI shows draft structured data.
4. User/admin confirms or edits.
5. Only confirmed data is written.
6. Store source reference where possible.
7. Mark result as AI-assisted and user/admin-confirmed.
8. Never mark as verified unless deterministic/admin evidence rules support it.

Examples:
- Receipt or invoice image -> draft vendor, date, amount, category.
- Whiteboard or process photo -> draft SOP/process steps.
- Handwritten notes -> draft clarification input.
- CRM/POS/report screenshot -> draft evidence summary.
- Job board/calendar screenshot -> draft operational data point.

Safety:
- AI extraction is assistive, not authoritative.
- AI must not certify accuracy.
- AI must not give legal, tax, accounting, compliance, or valuation advice.
- AI must not process sensitive regulated data beyond allowed app boundaries.
- Show redaction warning for sensitive personal, health, financial, or regulated information.
- Admin/client must confirm before storing.

## Technical Requirements

- Backend/server-side AI only.
- No frontend API keys.
- No service-role keys in browser.
- No secrets in browser.
- Tenant isolation and RLS preserved.
- Client can only access their own context.
- Admin can access only admin-authorized context.
- Public bot has no client/admin data access.
- Role-based bot behavior.
- Audit/log important bot actions.
- Clear "AI-assisted draft" labels.
- Deterministic scoring remains source of truth.
- Admin approval required for client-visible generated deliverables.

## Context Rules

Public bot may use:
- Public site copy.
- Public offer descriptions.
- Public Scorecard explanation.
- Approved RGS positioning.

Client bot may use:
- That client's visible account status.
- Assigned tools.
- Visible reports.
- Visible evidence requests.
- Visible scorecard/report summaries.
- Approved client-facing guidance.

Admin bot may use:
- Admin-visible client status.
- Evidence review status.
- Scorecard lead data.
- Diagnostic status.
- Tool assignment status.
- Repair Map/report status.
- Admin-only notes inside admin context only.

Do not expose:
- System prompts.
- Internal scoring formulas beyond client-safe explanation.
- Admin notes to clients.
- Other client data.
- Secrets.
- Raw provider errors.
- Hidden framework logic not intended for public/client view.

## UX Requirements

- Bot should feel like an RGS guide inside the operating system, not a generic chatbot.
- Suggest next actions with buttons/links when possible.
- Route users directly to the correct page/workflow.
- Explain what it can and cannot do.
- Do not block the core workflow.
- Do not be visually intrusive.
- Easy to close/minimize.
- Role-aware guidance on public, client, and admin surfaces.

## Testing Requirements

Add tests proving:
1. Public bot cannot access client/admin data.
2. Client bot cannot access other clients.
3. Client bot cannot see admin notes.
4. Admin bot remains admin-only.
5. No frontend secrets.
6. AI does not override deterministic scoring.
7. AI-generated output is labeled draft/AI-assisted.
8. Image extraction requires confirmation before write.
9. Public bot does not make revenue/profit/growth guarantees.
10. Bots do not provide legal/tax/accounting/compliance/valuation advice.
11. Bot route suggestions are role-safe.
12. Bot can explain Scorecard vs Diagnostic.
13. Bot can guide client to next assigned action.
14. Bot can guide admin to next review action.
15. RLS/tenant boundaries hold.
16. Typecheck passes.
17. Build passes.
18. Secret scan passes.

## Acceptance Report Must Include

- Architecture summary.
- Bot role separation.
- Files changed.
- Backend functions added.
- AI provider/secrets used.
- RLS/security summary.
- Image-to-input workflow summary.
- Client/admin/public UX summary.
- Tests added/updated.
- Test pass/fail counts.
- Typecheck result.
- Build result.
- Secret scan result.
- Deployment steps.
- Honest remaining blockers.
