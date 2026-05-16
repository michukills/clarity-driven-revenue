-- P95 Campaign Control Core
-- Additive campaign operating layer with customer-scoped records plus an
-- admin-only RGS internal marketing workspace. No social posting or GA4 live
-- sync is claimed here; manual posting and manual analytics are the safe
-- production fallback until verified connectors exist.

create table if not exists public.campaign_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  location_market_area text,
  industry text,
  business_stage text,
  primary_offers jsonb not null default '[]'::jsonb,
  average_sale_value numeric,
  margin_capacity_sensitivity text,
  target_audiences jsonb not null default '[]'::jsonb,
  buyer_persona_refs jsonb not null default '[]'::jsonb,
  swot_refs jsonb not null default '[]'::jsonb,
  diagnostic_refs jsonb not null default '[]'::jsonb,
  scorecard_refs jsonb not null default '[]'::jsonb,
  repair_map_refs jsonb not null default '[]'::jsonb,
  implementation_refs jsonb not null default '[]'::jsonb,
  control_system_refs jsonb not null default '[]'::jsonb,
  brand_voice_notes text,
  forbidden_claims jsonb not null default '[]'::jsonb,
  preferred_cta_types jsonb not null default '[]'::jsonb,
  channel_preferences jsonb not null default '[]'::jsonb,
  channel_restrictions jsonb not null default '[]'::jsonb,
  readiness_status text not null default 'insufficient_data',
  missing_inputs jsonb not null default '[]'::jsonb,
  scope_mode text not null default 'full_rgs_client',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_profiles_readiness_chk check (readiness_status in (
    'ready_to_market','market_with_caution','fix_intake_first',
    'fix_conversion_first','fix_delivery_capacity_first',
    'needs_strategy_review','insufficient_data'
  )),
  constraint campaign_profiles_scope_chk check (scope_mode in (
    'full_rgs_client','standalone_gig','demo_test'
  )),
  constraint campaign_profiles_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_profiles_customer_idx
  on public.campaign_profiles(customer_id);
create index if not exists campaign_profiles_rgs_workspace_idx
  on public.campaign_profiles(rgs_workspace_key, updated_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_profiles enable row level security;

drop policy if exists "campaign_profiles admin all" on public.campaign_profiles;
create policy "campaign_profiles admin all"
  on public.campaign_profiles for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.campaign_briefs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_profile_id uuid references public.campaign_profiles(id) on delete set null,
  objective text not null,
  target_audience text not null,
  offer_service_line text not null,
  channel_platform text not null,
  campaign_type text not null,
  funnel_stage text not null,
  cta text not null,
  timing_recommendation text,
  manual_budget text,
  capacity_readiness_check text,
  operational_risk_warning text,
  evidence_confidence text not null default 'low',
  missing_inputs jsonb not null default '[]'::jsonb,
  admin_notes text,
  client_safe_notes text,
  status text not null default 'draft',
  publishing_status text not null default 'manual_only',
  client_visible boolean not null default false,
  created_by uuid,
  updated_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_briefs_confidence_chk check (evidence_confidence in ('low','medium','high')),
  constraint campaign_briefs_status_chk check (status in (
    'draft','needs_inputs','ready_for_generation','generated','in_review',
    'approved','scheduled','posted','paused','completed','rejected'
  )),
  constraint campaign_briefs_publishing_chk check (publishing_status in (
    'manual_only','connector_planned','connector_configured_not_synced',
    'ready_for_manual_post','ready_for_scheduling_when_connector_exists',
    'scheduled','posted_manually','posted_via_integration','failed_needs_attention'
  )),
  constraint campaign_briefs_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_briefs_customer_idx
  on public.campaign_briefs(customer_id, updated_at desc);
create index if not exists campaign_briefs_profile_idx
  on public.campaign_briefs(campaign_profile_id);
create index if not exists campaign_briefs_rgs_workspace_idx
  on public.campaign_briefs(rgs_workspace_key, updated_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_briefs enable row level security;

drop policy if exists "campaign_briefs admin all" on public.campaign_briefs;
create policy "campaign_briefs admin all"
  on public.campaign_briefs for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.campaign_assets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_brief_id uuid not null references public.campaign_briefs(id) on delete cascade,
  asset_type text not null,
  platform text,
  title text not null,
  draft_content text not null,
  edited_content text,
  ai_draft_metadata jsonb not null default '{}'::jsonb,
  safety_status text not null default 'needs_review',
  brand_check_status text not null default 'needs_review',
  approval_status text not null default 'draft',
  approved_by uuid,
  approved_at timestamptz,
  scheduled_for timestamptz,
  posted_at timestamptz,
  external_post_id text,
  posted_url text,
  connection_proof_id uuid,
  manual_posting_instructions text,
  publishing_status text not null default 'manual_only',
  client_visible boolean not null default false,
  client_safe_explanation text,
  admin_only_rationale text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_assets_type_chk check (asset_type in (
    'social_post','ad_copy','email','follow_up','landing_page_section',
    'image_prompt','image_asset','carousel','story_graphic',
    'campaign_calendar','sequence','report_export'
  )),
  constraint campaign_assets_safety_chk check (safety_status in ('passed','needs_review','blocked')),
  constraint campaign_assets_brand_chk check (brand_check_status in ('passed','needs_review','blocked')),
  constraint campaign_assets_approval_chk check (approval_status in ('draft','needs_review','approved','rejected')),
  constraint campaign_assets_publishing_chk check (publishing_status in (
    'manual_only','connector_planned','connector_configured_not_synced',
    'ready_for_manual_post','ready_for_scheduling_when_connector_exists',
    'scheduled','posted_manually','posted_via_integration','failed_needs_attention'
  )),
  constraint campaign_assets_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_assets_customer_idx
  on public.campaign_assets(customer_id, updated_at desc);
create index if not exists campaign_assets_brief_idx
  on public.campaign_assets(campaign_brief_id);
create index if not exists campaign_assets_rgs_workspace_idx
  on public.campaign_assets(rgs_workspace_key, updated_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_assets enable row level security;

drop policy if exists "campaign_assets admin all" on public.campaign_assets;
create policy "campaign_assets admin all"
  on public.campaign_assets for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.campaign_connection_proofs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  provider text not null,
  capability text not null,
  status text not null default 'not_configured',
  proof_label text not null,
  proof_source text,
  integration_id uuid,
  last_verified_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  verified_by uuid,
  client_safe_summary text,
  admin_only_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_connection_capability_chk check (capability in (
    'analytics','social_posting','ad_platform','crm','manual_import'
  )),
  constraint campaign_connection_status_chk check (status in (
    'not_configured','manual_export_supported','setup_requested',
    'connector_configured_not_synced','verified_live','sync_success',
    'sync_failed','demo_only'
  )),
  constraint campaign_connection_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_connection_customer_idx
  on public.campaign_connection_proofs(customer_id, capability, provider);
create index if not exists campaign_connection_rgs_workspace_idx
  on public.campaign_connection_proofs(rgs_workspace_key, capability, provider)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_connection_proofs enable row level security;

drop policy if exists "campaign_connection admin all" on public.campaign_connection_proofs;
create policy "campaign_connection admin all"
  on public.campaign_connection_proofs for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

alter table public.campaign_assets
  drop constraint if exists campaign_assets_connection_proof_id_fkey;

alter table public.campaign_assets
  add constraint campaign_assets_connection_proof_id_fkey
  foreign key (connection_proof_id)
  references public.campaign_connection_proofs(id)
  on delete set null;

create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_brief_id uuid references public.campaign_briefs(id) on delete cascade,
  campaign_asset_id uuid references public.campaign_assets(id) on delete set null,
  event_type text not null,
  actor_id uuid,
  actor_role text,
  event_detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint campaign_events_type_chk check (event_type in (
    'created','ai_generated','edited','safety_flagged','approved',
    'rejected','scheduled','posted_manually','posted_via_integration',
    'paused','rescheduled','completed','analytics_imported',
    'learning_summary_created','manual_performance_recorded'
  )),
  constraint campaign_events_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_events_customer_idx
  on public.campaign_events(customer_id, created_at desc);
create index if not exists campaign_events_brief_idx
  on public.campaign_events(campaign_brief_id, created_at desc);
create index if not exists campaign_events_rgs_workspace_idx
  on public.campaign_events(rgs_workspace_key, created_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_events enable row level security;

drop policy if exists "campaign_events admin all" on public.campaign_events;
create policy "campaign_events admin all"
  on public.campaign_events for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create table if not exists public.campaign_performance (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_brief_id uuid references public.campaign_briefs(id) on delete cascade,
  campaign_asset_id uuid references public.campaign_assets(id) on delete set null,
  connection_proof_id uuid references public.campaign_connection_proofs(id) on delete set null,
  platform_channel text not null,
  source_medium_campaign text,
  date_range_start date not null,
  date_range_end date not null,
  impressions numeric,
  reach numeric,
  clicks numeric,
  ctr numeric,
  landing_page_visits numeric,
  scorecard_starts numeric,
  scorecard_completions numeric,
  diagnostic_inquiries numeric,
  conversions_leads numeric,
  cost numeric,
  notes text,
  confidence_level text not null default 'low',
  data_source text not null default 'manual',
  client_visible boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_performance_confidence_chk check (confidence_level in ('low','medium','high')),
  constraint campaign_performance_source_chk check (data_source in (
    'manual','GA4','platform_import','demo','unavailable'
  )),
  constraint campaign_performance_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  ))
);

create index if not exists campaign_performance_customer_idx
  on public.campaign_performance(customer_id, date_range_start desc);
create index if not exists campaign_performance_brief_idx
  on public.campaign_performance(campaign_brief_id);
create index if not exists campaign_performance_rgs_workspace_idx
  on public.campaign_performance(rgs_workspace_key, date_range_start desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_performance enable row level security;

drop policy if exists "campaign_performance admin all" on public.campaign_performance;
create policy "campaign_performance admin all"
  on public.campaign_performance for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create or replace function public.campaign_assert_connection_proof(
  _customer_id uuid,
  _rgs_workspace_key text,
  _connection_proof_id uuid,
  _capability text
) returns boolean
language plpgsql
stable
set search_path = public
as $$
begin
  if _connection_proof_id is null then
    return false;
  end if;

  return exists (
	    select 1
	    from public.campaign_connection_proofs p
	    where p.id = _connection_proof_id
	      and (
	        (p.workspace_scope = 'customer' and p.customer_id = _customer_id)
	        or
	        (p.workspace_scope = 'rgs_internal' and p.rgs_workspace_key = _rgs_workspace_key)
	      )
	      and p.capability = _capability
	      and p.status in ('verified_live','sync_success')
	      and (p.last_verified_at is not null or p.last_sync_at is not null)
  );
end;
$$;

create or replace function public.campaign_performance_connection_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.data_source in ('GA4','platform_import') then
    if not public.campaign_assert_connection_proof(new.customer_id, new.rgs_workspace_key, new.connection_proof_id, 'analytics')
       and not public.campaign_assert_connection_proof(new.customer_id, new.rgs_workspace_key, new.connection_proof_id, 'ad_platform') then
      raise exception 'Verified campaign connection proof is required before recording % performance', new.data_source;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_performance_connection_guard_trg on public.campaign_performance;
create trigger campaign_performance_connection_guard_trg
  before insert or update on public.campaign_performance
  for each row execute function public.campaign_performance_connection_guard();

create or replace function public.campaign_asset_connection_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.publishing_status = 'posted_via_integration' then
    if not public.campaign_assert_connection_proof(new.customer_id, new.rgs_workspace_key, new.connection_proof_id, 'social_posting')
       and not public.campaign_assert_connection_proof(new.customer_id, new.rgs_workspace_key, new.connection_proof_id, 'ad_platform') then
      raise exception 'Verified campaign posting proof is required before marking posted via integration';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists campaign_asset_connection_guard_trg on public.campaign_assets;
create trigger campaign_asset_connection_guard_trg
  before insert or update on public.campaign_assets
  for each row execute function public.campaign_asset_connection_guard();

create table if not exists public.campaign_learning_summaries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  workspace_scope text not null default 'customer',
  rgs_workspace_key text,
  campaign_brief_id uuid references public.campaign_briefs(id) on delete cascade,
  summary text not null,
  what_worked text,
  what_did_not_work text,
  recommended_next_action text,
  confidence text not null default 'low',
  source_data_used jsonb not null default '[]'::jsonb,
  admin_approval_status text not null default 'needs_review',
  created_by_ai boolean not null default false,
  client_visible boolean not null default false,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_learning_confidence_chk check (confidence in ('low','medium','high')),
  constraint campaign_learning_approval_chk check (admin_approval_status in ('needs_review','approved','rejected')),
  constraint campaign_learning_workspace_chk check (
    (workspace_scope = 'customer' and customer_id is not null and rgs_workspace_key is null)
    or
    (workspace_scope = 'rgs_internal' and customer_id is null and rgs_workspace_key is not null)
  )
);

create index if not exists campaign_learning_customer_idx
  on public.campaign_learning_summaries(customer_id, created_at desc);
create index if not exists campaign_learning_brief_idx
  on public.campaign_learning_summaries(campaign_brief_id);
create index if not exists campaign_learning_rgs_workspace_idx
  on public.campaign_learning_summaries(rgs_workspace_key, created_at desc)
  where workspace_scope = 'rgs_internal';

alter table public.campaign_learning_summaries enable row level security;

drop policy if exists "campaign_learning admin all" on public.campaign_learning_summaries;
create policy "campaign_learning admin all"
  on public.campaign_learning_summaries for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create or replace function public.campaign_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists campaign_profiles_touch on public.campaign_profiles;
create trigger campaign_profiles_touch
  before update on public.campaign_profiles
  for each row execute function public.campaign_touch_updated_at();

drop trigger if exists campaign_briefs_touch on public.campaign_briefs;
create trigger campaign_briefs_touch
  before update on public.campaign_briefs
  for each row execute function public.campaign_touch_updated_at();

drop trigger if exists campaign_assets_touch on public.campaign_assets;
create trigger campaign_assets_touch
  before update on public.campaign_assets
  for each row execute function public.campaign_touch_updated_at();

drop trigger if exists campaign_performance_touch on public.campaign_performance;
create trigger campaign_performance_touch
  before update on public.campaign_performance
  for each row execute function public.campaign_touch_updated_at();

drop trigger if exists campaign_learning_touch on public.campaign_learning_summaries;
create trigger campaign_learning_touch
  before update on public.campaign_learning_summaries
  for each row execute function public.campaign_touch_updated_at();

drop trigger if exists campaign_connection_touch on public.campaign_connection_proofs;
create trigger campaign_connection_touch
  before update on public.campaign_connection_proofs
  for each row execute function public.campaign_touch_updated_at();

create or replace function public.get_client_campaign_control(_customer_id uuid)
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_owns boolean;
  v_result jsonb;
begin
  if _customer_id is null then
    raise exception 'customer_id required';
  end if;

  v_is_admin := public.is_admin(v_uid);
  v_owns := public.user_owns_customer(v_uid, _customer_id);

  if not v_is_admin and not v_owns then
    raise exception 'not authorized';
  end if;

  select jsonb_build_object(
    'profile', (
      select to_jsonb(p) - 'created_by' - 'updated_by'
      from public.campaign_profiles p
      where p.customer_id = _customer_id
      order by p.updated_at desc
      limit 1
    ),
    'briefs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id,
        'customer_id', b.customer_id,
        'campaign_profile_id', b.campaign_profile_id,
        'objective', b.objective,
        'target_audience', b.target_audience,
        'offer_service_line', b.offer_service_line,
        'channel_platform', b.channel_platform,
        'campaign_type', b.campaign_type,
        'funnel_stage', b.funnel_stage,
        'cta', b.cta,
        'timing_recommendation', b.timing_recommendation,
        'capacity_readiness_check', b.capacity_readiness_check,
        'operational_risk_warning', b.operational_risk_warning,
        'evidence_confidence', b.evidence_confidence,
        'missing_inputs', b.missing_inputs,
        'client_safe_notes', b.client_safe_notes,
        'status', b.status,
        'publishing_status', b.publishing_status,
        'approved_at', b.approved_at,
        'updated_at', b.updated_at
      ) order by b.updated_at desc)
      from public.campaign_briefs b
      where b.customer_id = _customer_id
        and b.client_visible = true
        and b.status in ('approved','scheduled','posted','completed')
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'campaign_brief_id', a.campaign_brief_id,
        'asset_type', a.asset_type,
        'platform', a.platform,
        'title', a.title,
        'content', coalesce(a.edited_content, a.draft_content),
        'approval_status', a.approval_status,
        'safety_status', a.safety_status,
        'publishing_status', a.publishing_status,
        'manual_posting_instructions', a.manual_posting_instructions,
        'client_safe_explanation', a.client_safe_explanation,
        'scheduled_for', a.scheduled_for,
        'posted_at', a.posted_at,
        'posted_url', a.posted_url,
        'updated_at', a.updated_at
      ) order by a.updated_at desc)
      from public.campaign_assets a
      where a.customer_id = _customer_id
        and a.client_visible = true
        and a.approval_status = 'approved'
        and a.safety_status = 'passed'
    ), '[]'::jsonb),
    'performance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'campaign_brief_id', p.campaign_brief_id,
        'campaign_asset_id', p.campaign_asset_id,
        'connection_proof_id', p.connection_proof_id,
        'platform_channel', p.platform_channel,
        'date_range_start', p.date_range_start,
        'date_range_end', p.date_range_end,
        'impressions', p.impressions,
        'reach', p.reach,
        'clicks', p.clicks,
        'ctr', p.ctr,
        'landing_page_visits', p.landing_page_visits,
        'scorecard_starts', p.scorecard_starts,
        'scorecard_completions', p.scorecard_completions,
        'diagnostic_inquiries', p.diagnostic_inquiries,
        'conversions_leads', p.conversions_leads,
        'confidence_level', p.confidence_level,
        'data_source', p.data_source,
        'notes', p.notes
      ) order by p.date_range_start desc)
      from public.campaign_performance p
      where p.customer_id = _customer_id
        and p.client_visible = true
    ), '[]'::jsonb),
    'connection_proofs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cp.id,
        'provider', cp.provider,
        'capability', cp.capability,
        'status', cp.status,
        'proof_label', cp.proof_label,
        'last_verified_at', cp.last_verified_at,
        'last_sync_at', cp.last_sync_at,
        'last_sync_status', cp.last_sync_status,
        'client_safe_summary', cp.client_safe_summary
      ) order by cp.updated_at desc)
      from public.campaign_connection_proofs cp
      where cp.customer_id = _customer_id
        and cp.client_safe_summary is not null
    ), '[]'::jsonb),
    'learning', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'campaign_brief_id', l.campaign_brief_id,
        'summary', l.summary,
        'what_worked', l.what_worked,
        'what_did_not_work', l.what_did_not_work,
        'recommended_next_action', l.recommended_next_action,
        'confidence', l.confidence,
        'reviewed_at', l.reviewed_at
      ) order by l.created_at desc)
      from public.campaign_learning_summaries l
      where l.customer_id = _customer_id
        and l.client_visible = true
        and l.admin_approval_status = 'approved'
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_client_campaign_control(uuid) from public;
grant execute on function public.get_client_campaign_control(uuid) to authenticated;

create or replace function public.upsert_client_campaign_profile_inputs(
  _customer_id uuid,
  _business_stage text,
  _primary_offers jsonb,
  _target_audiences jsonb,
  _brand_voice_notes text,
  _preferred_cta_types jsonb,
  _channel_preferences jsonb,
  _channel_restrictions jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_primary_offers jsonb := case when jsonb_typeof(coalesce(_primary_offers, '[]'::jsonb)) = 'array' then coalesce(_primary_offers, '[]'::jsonb) else '[]'::jsonb end;
  v_target_audiences jsonb := case when jsonb_typeof(coalesce(_target_audiences, '[]'::jsonb)) = 'array' then coalesce(_target_audiences, '[]'::jsonb) else '[]'::jsonb end;
  v_preferred_cta_types jsonb := case when jsonb_typeof(coalesce(_preferred_cta_types, '[]'::jsonb)) = 'array' then coalesce(_preferred_cta_types, '[]'::jsonb) else '[]'::jsonb end;
  v_channel_preferences jsonb := case when jsonb_typeof(coalesce(_channel_preferences, '[]'::jsonb)) = 'array' then coalesce(_channel_preferences, '[]'::jsonb) else '[]'::jsonb end;
  v_channel_restrictions jsonb := case when jsonb_typeof(coalesce(_channel_restrictions, '[]'::jsonb)) = 'array' then coalesce(_channel_restrictions, '[]'::jsonb) else '[]'::jsonb end;
begin
  if _customer_id is null then
    raise exception 'customer_id required';
  end if;

  if not public.user_owns_customer(v_uid, _customer_id) then
    raise exception 'not authorized';
  end if;

  select p.id into v_profile_id
  from public.campaign_profiles p
  where p.customer_id = _customer_id
    and p.workspace_scope = 'customer'
  order by p.updated_at desc
  limit 1;

  if v_profile_id is null then
    insert into public.campaign_profiles (
      customer_id, workspace_scope, business_stage, primary_offers,
      target_audiences, brand_voice_notes, preferred_cta_types,
      channel_preferences, channel_restrictions, readiness_status,
      missing_inputs, scope_mode, created_by, updated_by
    ) values (
      _customer_id, 'customer', nullif(trim(coalesce(_business_stage, '')), ''),
      v_primary_offers, v_target_audiences,
      nullif(trim(coalesce(_brand_voice_notes, '')), ''),
      v_preferred_cta_types, v_channel_preferences, v_channel_restrictions,
      'needs_strategy_review', '["RGS review of client-submitted campaign inputs"]'::jsonb,
      'full_rgs_client', v_uid, v_uid
    )
    returning id into v_profile_id;
  else
    update public.campaign_profiles
       set business_stage = nullif(trim(coalesce(_business_stage, '')), ''),
           primary_offers = v_primary_offers,
           target_audiences = v_target_audiences,
           brand_voice_notes = nullif(trim(coalesce(_brand_voice_notes, '')), ''),
           preferred_cta_types = v_preferred_cta_types,
           channel_preferences = v_channel_preferences,
           channel_restrictions = v_channel_restrictions,
           readiness_status = 'needs_strategy_review',
           missing_inputs = '["RGS review of client-submitted campaign inputs"]'::jsonb,
           updated_by = v_uid
     where id = v_profile_id
       and customer_id = _customer_id
       and workspace_scope = 'customer';
  end if;

  insert into public.campaign_events (
    customer_id, workspace_scope, event_type, actor_id, actor_role, event_detail
  ) values (
    _customer_id, 'customer', 'edited', v_uid, 'client',
    jsonb_build_object(
      'source', 'client_campaign_inputs',
      'profile_id', v_profile_id,
      'requires_rgs_review', true
    )
  );

  return public.get_client_campaign_control(_customer_id);
end;
$$;

revoke all on function public.upsert_client_campaign_profile_inputs(uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.upsert_client_campaign_profile_inputs(uuid, text, jsonb, jsonb, text, jsonb, jsonb, jsonb) to authenticated;

insert into public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) values (
  'campaign_control_system',
  'RGS Campaign Control System',
  'Customer-scoped campaign operating layer inside the RGS Control System / Revenue Control Center add-on lane. Turns Scorecard, Diagnostic, Repair Map, Implementation, Control System, persona, SWOT, channel readiness, and manual performance signals into reviewed campaign briefs, assets, posting instructions, and learning summaries. Manual publishing and manual analytics are the safe fallback unless verified connectors are configured.',
  'tracking',
  'client_available',
  'beta',
  '/portal/tools/campaign-control',
  'megaphone',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'industry_aware_outputs',
  true,
  true,
  75,
  75
)
on conflict (tool_key) do update
  set name = excluded.name,
      description = excluded.description,
      tool_type = excluded.tool_type,
      default_visibility = excluded.default_visibility,
      status = excluded.status,
      route_path = excluded.route_path,
      icon_key = excluded.icon_key,
      requires_industry = excluded.requires_industry,
      requires_active_client = excluded.requires_active_client,
      service_lane = excluded.service_lane,
      customer_journey_phase = excluded.customer_journey_phase,
      industry_behavior = excluded.industry_behavior,
      contains_internal_notes = excluded.contains_internal_notes,
      can_be_client_visible = excluded.can_be_client_visible,
      lane_sort_order = excluded.lane_sort_order,
      phase_sort_order = excluded.phase_sort_order;

-- Campaign Control belongs inside the existing RGS Control System / Revenue
-- Control Center add-on lane. This replacement preserves the existing lane
-- gates while allowing Campaign Control when that existing lane is active,
-- package_ongoing_support/package_revenue_tracker is present, or the customer
-- has the full bundle. It does not create a separate generic add-on lane.
create or replace function private.get_effective_tools_for_customer(_customer_id uuid)
 returns table(tool_id uuid, tool_key text, name text, description text, tool_type public.tool_catalog_type, default_visibility public.tool_catalog_visibility, status public.tool_catalog_status, route_path text, icon_key text, requires_industry boolean, requires_active_client boolean, effective_enabled boolean, reason text, industry_match boolean, override_state text)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_industry public.industry_category;
  v_lifecycle text;
  v_stage text;
  v_is_admin boolean;
  v_owns boolean;
  v_industry_confirmed boolean;
  v_snapshot_verified boolean;
  v_owner_interview_done boolean;
  v_force_unlock boolean;
  v_diag_pay text;
  v_diag_status text;
  v_impl_pay text;
  v_impl_started_at timestamptz;
  v_impl_ended_at date;
  v_rcs_status text;
  v_rcs_paid_through date;
  v_package_ongoing_support boolean;
  v_package_revenue_tracker boolean;
  v_package_full_bundle boolean;
  v_today date := current_date;
  v_diag_lane_active boolean;
  v_impl_active_stage boolean;
  v_impl_lane_active boolean;
  v_rcs_grace boolean;
  v_rcs_lane_active boolean;
  v_campaign_control_center_active boolean;
  v_active_impl_stages text[] := array[
    'implementation_added','implementation_onboarding','tools_assigned',
    'client_training_setup','implementation_active','waiting_on_client',
    'review_revision_window','implementation','work_in_progress'
  ];
begin
  if _customer_id is null then
    raise exception 'customer_id required';
  end if;

  v_is_admin := private.is_admin(auth.uid());
  v_owns := private.user_owns_customer(auth.uid(), _customer_id);
  if not v_is_admin and not v_owns then
    raise exception 'not authorized';
  end if;

  select c.industry, c.lifecycle_state::text, c.stage::text,
         coalesce(c.industry_confirmed_by_admin, false),
         (c.owner_interview_completed_at is not null),
         coalesce(c.diagnostic_tools_force_unlocked, false),
         c.diagnostic_payment_status, c.diagnostic_status,
         c.implementation_payment_status, c.implementation_started_at, c.implementation_ended_at,
         c.rcc_subscription_status, c.rcc_paid_through,
         coalesce(c.package_ongoing_support, false),
         coalesce(c.package_revenue_tracker, false),
         coalesce(c.package_full_bundle, false)
    into v_industry, v_lifecycle, v_stage, v_industry_confirmed, v_owner_interview_done, v_force_unlock,
         v_diag_pay, v_diag_status, v_impl_pay, v_impl_started_at, v_impl_ended_at,
         v_rcs_status, v_rcs_paid_through,
         v_package_ongoing_support, v_package_revenue_tracker, v_package_full_bundle
    from public.customers c where c.id = _customer_id;

  select coalesce(s.snapshot_status = 'admin_verified' and s.industry_verified, false)
    into v_snapshot_verified
    from public.client_business_snapshots s where s.customer_id = _customer_id;
  v_snapshot_verified := coalesce(v_snapshot_verified, false);

  v_diag_lane_active := v_diag_pay in ('paid','waived')
                        or v_diag_status not in ('not_started')
                        or v_owner_interview_done;

  v_impl_active_stage := v_stage = any(v_active_impl_stages);
  v_impl_lane_active := v_impl_pay in ('paid','waived') or v_impl_active_stage;

  v_rcs_grace := v_impl_ended_at is not null
                 and (v_impl_ended_at + interval '30 days')::date >= v_today;
  v_rcs_lane_active := v_rcs_status in ('active','comped')
                       or v_impl_active_stage
                       or v_rcs_grace
                       or (v_rcs_status = 'past_due' and v_rcs_grace);
  v_campaign_control_center_active := v_rcs_status in ('active','comped')
                                      or v_package_ongoing_support
                                      or v_package_revenue_tracker
                                      or v_package_full_bundle;

  return query
  with base as (
    select t.* from public.tool_catalog t where t.status <> 'deprecated'
  ),
  with_override as (
    select b.*, o.enabled as override_enabled,
      case when o.id is null then 'none'
           when o.enabled then 'granted'
           else 'revoked' end as override_state_v
    from base b
    left join public.client_tool_access o
      on o.tool_id = b.id and o.customer_id = _customer_id
  ),
  with_industry as (
    select w.*,
      exists (select 1 from public.tool_category_access a
               where a.tool_id = w.id and a.industry = v_industry and a.enabled) as industry_allowed_v,
      exists (select 1 from public.tool_category_access a where a.tool_id = w.id) as has_industry_rules_v
    from with_override w
  ),
  scored as (
    select w.*,
      case
        WHEN w.override_state_v = 'revoked' THEN false
        when w.tool_type = 'admin_only' or w.default_visibility = 'admin_only' then v_is_admin
        when w.default_visibility = 'hidden' then false
        WHEN NOT v_is_admin
             and w.tool_key = 'campaign_control_system'
             and w.override_state_v <> 'granted'
             and v_campaign_control_center_active
          then true
        WHEN NOT v_is_admin
             and w.tool_type = 'diagnostic'
             and w.tool_key not in ('owner_diagnostic_interview','scorecard')
             and not v_owner_interview_done
             and not v_force_unlock
             and w.override_state_v <> 'granted'
          then false
        WHEN NOT v_is_admin
             and w.tool_type = 'diagnostic'
             and w.tool_key not in ('owner_diagnostic_interview','scorecard')
             and w.override_state_v <> 'granted'
             and not v_diag_lane_active
          then false
        WHEN NOT v_is_admin
             and w.tool_type = 'implementation'
             and w.override_state_v <> 'granted'
             and not v_impl_lane_active
          then false
        WHEN NOT v_is_admin
             and w.tool_type = 'tracking'
             and w.override_state_v <> 'granted'
             and not v_rcs_lane_active
          then false
        when w.override_state_v = 'granted' then true
        when w.requires_active_client and v_lifecycle in ('inactive','re_engagement') then false
        when w.requires_industry and v_industry is null then false
        when w.requires_industry and v_industry = 'other' then false
        when w.requires_industry and not v_industry_confirmed then false
        when w.requires_industry and not v_snapshot_verified then false
        when w.requires_industry and not w.industry_allowed_v then false
        when w.has_industry_rules_v and w.industry_allowed_v
             and (not v_industry_confirmed or not v_snapshot_verified) then false
        when not w.requires_industry and not w.industry_allowed_v
             and not w.has_industry_rules_v then true
        when w.industry_allowed_v then true
        else false
      end as effective_enabled_v,
      case
        when w.override_state_v = 'revoked' then 'override_revoked'
        when w.tool_type = 'admin_only' or w.default_visibility = 'admin_only' then 'admin_only'
        when w.default_visibility = 'hidden' then 'hidden'
        WHEN NOT v_is_admin
             and w.tool_key = 'campaign_control_system'
             and w.override_state_v <> 'granted'
             and v_campaign_control_center_active
          then 'control_center_package_active'
        WHEN NOT v_is_admin
             and w.tool_type = 'diagnostic'
             and w.tool_key not in ('owner_diagnostic_interview','scorecard')
             and not v_owner_interview_done
             and not v_force_unlock
             and w.override_state_v <> 'granted'
          then 'owner_interview_required'
        WHEN NOT v_is_admin
             and w.tool_type = 'diagnostic'
             and w.tool_key not in ('owner_diagnostic_interview','scorecard')
             and w.override_state_v <> 'granted'
             and not v_diag_lane_active
          then 'diagnostic_lane_inactive'
        WHEN NOT v_is_admin
             and w.tool_type = 'implementation'
             and w.override_state_v <> 'granted'
             and not v_impl_lane_active
          then 'implementation_lane_inactive'
        WHEN NOT v_is_admin
             and w.tool_type = 'tracking'
             and w.override_state_v <> 'granted'
             and not v_rcs_lane_active
          then 'rcs_lane_inactive'
        when w.override_state_v = 'granted' then 'override_granted'
        when w.requires_active_client and v_lifecycle in ('inactive','re_engagement') then 'not_active_client'
        when w.requires_industry and v_industry is null then 'industry_unset'
        when w.requires_industry and v_industry = 'other' then 'industry_unset'
        when w.requires_industry and not v_industry_confirmed then 'industry_unconfirmed'
        when w.requires_industry and not v_snapshot_verified then 'snapshot_unverified'
        when w.requires_industry and not w.industry_allowed_v then 'industry_blocked'
        when w.has_industry_rules_v and w.industry_allowed_v
             and (not v_industry_confirmed or not v_snapshot_verified) then 'snapshot_unverified'
        when w.industry_allowed_v then 'industry_allowed'
        when not w.has_industry_rules_v then 'unrestricted'
        else 'industry_blocked'
      end as reason_v
    from with_industry w
  )
  select s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
         s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
         s.effective_enabled_v, s.reason_v, s.industry_allowed_v, s.override_state_v
  from scored s
  where v_is_admin
     or (s.effective_enabled_v = true
         and s.tool_type <> 'admin_only'
         and s.default_visibility <> 'admin_only'
         and s.default_visibility <> 'hidden')
  order by s.tool_type, s.name;
end;
$function$;

grant execute on function private.get_effective_tools_for_customer(uuid) to authenticated, service_role;

-- P97.1 — Extend approval/status constraints with `archived` so the
-- deterministic status machine can terminally archive briefs and assets.
alter table public.campaign_assets
  drop constraint if exists campaign_assets_approval_chk;
alter table public.campaign_assets
  add constraint campaign_assets_approval_chk
  check (approval_status in ('draft','needs_review','approved','rejected','archived'));

alter table public.campaign_briefs
  drop constraint if exists campaign_briefs_status_chk;
alter table public.campaign_briefs
  add constraint campaign_briefs_status_chk
  check (status in (
    'draft','needs_inputs','ready_for_generation','generated','in_review',
    'approved','scheduled','posted','paused','completed','rejected','archived'
  ));
