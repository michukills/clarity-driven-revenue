-- P97 — Campaign Control Phase 1: audit events.
-- Note: campaign_briefs / campaign_assets base tables are not yet present in
-- this database; we therefore reference brief/asset ids as plain uuid columns
-- (no FK) so the audit log can be created independently and back-filled later.

create table if not exists public.campaign_audit_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_brief_id uuid,
  campaign_asset_id uuid,
  actor_user_id uuid,
  action text not null,
  from_status text,
  to_status text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint campaign_audit_action_chk check (action in (
    'brief_created','brief_updated','brief_status_changed','brief_archived',
    'asset_created','asset_updated','asset_status_changed','asset_archived',
    'ai_brief_generated','ai_assets_generated',
    'review_requested','approved','edits_requested','rejected',
    'ready_to_publish_marked','manually_posted_marked',
    'safety_blocked','safety_cleared'
  )),
  constraint campaign_audit_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  )
);

create index if not exists campaign_audit_events_customer_idx
  on public.campaign_audit_events(customer_id, created_at desc);
create index if not exists campaign_audit_events_brief_idx
  on public.campaign_audit_events(campaign_brief_id, created_at desc);
create index if not exists campaign_audit_events_asset_idx
  on public.campaign_audit_events(campaign_asset_id, created_at desc);
create index if not exists campaign_audit_events_rgs_workspace_idx
  on public.campaign_audit_events(rgs_workspace_key, created_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_audit_events enable row level security;

drop policy if exists "campaign_audit_events admin all" on public.campaign_audit_events;
create policy "campaign_audit_events admin all"
  on public.campaign_audit_events
  for all
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role::text = 'admin'
    )
  );