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
- Reusable client component: `<ToolWalkthroughCard toolKey="..." />` — shows the approved inline screen-recorded video, captions, transcript, and mobile-safe mute/volume controls when approved, otherwise a written "How to use this tool" guide.

## P89 video production placement
- Public demo MP4: `/videos/public/revenue-growth-systems-operating-system-public-demo.mp4`
- Public demo captions/transcript/poster live beside the public MP4 under `/videos/public`.
- Client walkthrough MP4s: `/videos/walkthroughs/revenue-growth-systems-*-walkthrough.mp4`
- Client walkthrough captions/transcripts/posters live beside those files under `/videos/walkthroughs` and `/videos/walkthroughs/posters`.
- The public `/demo` page renders the real RGS Operating System demo and no longer mounts the old top silent walkthrough.
- Client tool pages render `<ToolWalkthroughCard />` near the top where a safe tool context exists.
- The Supabase seed migration `20260506164500_p89_screen_recorded_walkthrough_video_entries.sql` approves the produced walkthroughs through the existing `tool_walkthrough_videos` table and does not change RLS, `ClientToolGuard`, `RccGate`, or stage-based access.
- Production videos include demo/sample-data watermarking, internal-logic protection, focus callouts, scene breathing room, and a final hold to avoid clipping narration.

## Approval rule
Only approve real walkthrough videos that show the actual tool or approved
demo data. Do not publish placeholder or fabricated walkthroughs.

## Deferred
- Additional recordings for lower-priority tools that still have written-guide fallbacks.
- Automatic captioning.
- Cross-tool admin task engine, automated reminders, email/calendar integrations.
- Owner Admin Command Center standalone runner, P60A compliance monitor, demo build/reset.
