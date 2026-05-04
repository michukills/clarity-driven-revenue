# Guided Landing Pages + Tool Walkthrough Video Framework

## Purpose
Make the next step obvious for both clients and admins, and provide a safe
framework for instructional walkthrough videos per tool.

## Client landing route
- `/portal` (existing `CustomerDashboard`) — hardened with `GuidedClientWelcome`.
  - Greets by business or full name.
  - Translates existing `customer.stage` into "Where you are / What RGS is doing / Your next step" via `src/lib/clientStage.ts`.
  - Includes the canonical product sentence: "The Diagnostic finds the slipping gears. Implementation installs the repair plan. The RGS Control System™ keeps the owner connected to the system without turning RGS into an operator inside the business."
  - Available tools / reports / RCC continue to flow through existing `ClientToolGuard`, `private.get_effective_tools_for_customer`, and `useRccAccess` — no new bypasses.
  - Never references `internal_notes`, `admin_notes`, `admin_summary`, AI draft content, or raw reason codes.

## Admin command landing route
- `/admin` (existing `AdminDashboard`) — hardened with `CommandGuidancePanel` at the top.
  - Reads safe counts only: `report_drafts.status='needs_review'`, `report_drafts.ai_status='needs_review'`, `client_health_records.attention_needed`, and high/critical `renewal_risk_level`.
  - Quick links: Customers, Report Drafts, Client Health, Industry Brain, Tool Library, Walkthrough Videos.
- Protected by `ProtectedRoute requireRole="admin"`. Clients are redirected away.

## Tool walkthrough video framework
- Table: `public.tool_walkthrough_videos`
- Enums: `walkthrough_video_status` (`not_started|planned|recorded|uploaded|approved|archived`), `walkthrough_caption_format` (`plain_text|srt|vtt`)
- Fields: `tool_key, title, short_description, video_url, embed_url, video_status, transcript, captions, caption_format, duration_seconds, client_visible, internal_notes, archived_at, created_by, updated_by, created_at, updated_at`
- RLS: admin-only manage policy (`is_admin(auth.uid())`).
- Client-safe RPC: `public.get_client_tool_walkthrough_videos()` (SECURITY DEFINER, EXECUTE only for `authenticated`) — returns only rows where `video_status='approved' AND client_visible=true AND archived_at IS NULL`, and never returns `internal_notes`.
- Admin manager route: `/admin/walkthrough-videos`.
- Reusable client component: `<ToolWalkthroughCard toolKey="..." />` — shows video / captions / transcript when approved, otherwise "Walkthrough video coming soon."

## Approval rule
Only approve real walkthrough videos that show the actual tool or approved
demo data. Do not publish placeholder or fabricated walkthroughs.

## Deferred
- Real video recording, upload pipeline, transcoding, and automatic captioning.
- Per-tool embedding across every existing client tool page (component is in place; broader rollout deferred).
- Cross-tool admin task engine, automated reminders, email/calendar integrations.
- Owner Admin Command Center standalone runner, P60A compliance monitor, demo build/reset.