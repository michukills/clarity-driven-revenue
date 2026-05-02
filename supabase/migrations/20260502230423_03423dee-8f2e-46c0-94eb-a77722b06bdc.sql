
-- ============================================================
-- P31 expansion — Offer & pricing foundation, payment lanes,
-- subscription tracking, tax mode config
-- ============================================================

-- ---------- enums ----------
do $$ begin
  create type public.offer_type as enum (
    'diagnostic',
    'implementation',
    'revenue_control_system',
    'add_on',
    'custom_manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_billing_type as enum (
    'one_time',
    'recurring_monthly',
    'deposit',
    'manual_invoice'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_payment_lane as enum (
    'public_non_client',
    'existing_client'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.offer_visibility as enum (
    'public',
    'private'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_subscription_status as enum (
    'active','trialing','past_due','canceled','paused','incomplete'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tax_mode as enum (
    'tax_not_configured',
    'stripe_tax_enabled',
    'manual_review_required'
  );
exception when duplicate_object then null; end $$;

-- ---------- offers ----------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  offer_type public.offer_type not null,
  billing_type public.offer_billing_type not null default 'one_time',
  payment_lane public.offer_payment_lane not null default 'existing_client',
  visibility public.offer_visibility not null default 'private',
  is_active boolean not null default true,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'usd',
  start_at timestamptz,
  end_at timestamptz,
  max_uses integer,
  current_uses integer not null default 0,
  requires_admin_approval boolean not null default false,
  public_description text,
  internal_admin_notes text,
  stripe_product_id text,
  stripe_price_id text,
  stripe_lookup_key text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint offers_slug_lc check (slug = lower(slug)),
  constraint offers_max_uses_ck check (max_uses is null or max_uses > 0)
);
create index if not exists offers_active_idx on public.offers (is_active, offer_type);
create index if not exists offers_visibility_idx on public.offers (visibility);

create trigger offers_touch_updated
  before update on public.offers
  for each row execute function public.touch_updated_at();

alter table public.offers enable row level security;

create policy "admins manage offers"
  on public.offers for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Public/active offers are readable by anon+authenticated so the public
-- checkout flow can resolve names/descriptions. Private offers stay admin-only.
create policy "public read of public active offers"
  on public.offers for select
  to anon, authenticated
  using (visibility = 'public' and is_active = true);

-- ---------- extend diagnostic_orders to support offer system ----------
alter table public.diagnostic_orders
  add column if not exists offer_id uuid references public.offers(id) on delete set null,
  add column if not exists payment_lane public.offer_payment_lane,
  add column if not exists billing_type public.offer_billing_type,
  add column if not exists subtotal_cents integer,
  add column if not exists tax_cents integer,
  add column if not exists total_cents integer,
  add column if not exists customer_billing_country text;
create index if not exists diagnostic_orders_offer_idx on public.diagnostic_orders (offer_id);

-- ---------- payment_subscriptions (Revenue Control System recurring) ----------
create table if not exists public.payment_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  offer_id uuid references public.offers(id) on delete set null,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  status public.payment_subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  amount_cents integer not null,
  currency text not null default 'usd',
  environment text not null default 'sandbox' check (environment in ('sandbox','live')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_subscriptions_customer_idx on public.payment_subscriptions (customer_id);
create index if not exists payment_subscriptions_status_idx on public.payment_subscriptions (status);

create trigger payment_subscriptions_touch_updated
  before update on public.payment_subscriptions
  for each row execute function public.touch_updated_at();

alter table public.payment_subscriptions enable row level security;

create policy "admins read subs"
  on public.payment_subscriptions for select
  to authenticated using (public.is_admin(auth.uid()));
create policy "admins manage subs"
  on public.payment_subscriptions for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
create policy "customers read own subs"
  on public.payment_subscriptions for select
  to authenticated
  using (public.user_owns_customer(auth.uid(), customer_id));

-- ---------- app_payment_settings (singleton) ----------
create table if not exists public.app_payment_settings (
  id boolean primary key default true check (id = true),
  tax_mode public.tax_mode not null default 'tax_not_configured',
  default_currency text not null default 'usd',
  collect_billing_country boolean not null default true,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.app_payment_settings (id) values (true) on conflict (id) do nothing;

create trigger app_payment_settings_touch_updated
  before update on public.app_payment_settings
  for each row execute function public.touch_updated_at();

alter table public.app_payment_settings enable row level security;

create policy "admins read settings"
  on public.app_payment_settings for select
  to authenticated using (public.is_admin(auth.uid()));
create policy "admins manage settings"
  on public.app_payment_settings for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- seed default offers ----------
insert into public.offers
  (slug, name, offer_type, billing_type, payment_lane, visibility, is_active,
   price_cents, currency, public_description, stripe_lookup_key)
values
  ('rgs_diagnostic_3000', 'RGS Business Stability Diagnostic',
   'diagnostic', 'one_time', 'public_non_client', 'public', true,
   300000, 'usd',
   'Comprehensive business stability diagnostic with structured findings and a prioritized roadmap.',
   'rgs_diagnostic_3000'),
  ('rgs_implementation_10000', 'Implementation Playbook & System Installation',
   'implementation', 'one_time', 'existing_client', 'private', true,
   1000000, 'usd',
   'Hands-on implementation of the diagnostic roadmap, SOPs, and installed operating system.',
   'rgs_implementation_10000'),
  ('rgs_revenue_control_297_monthly', 'Revenue Control System (Monthly)',
   'revenue_control_system', 'recurring_monthly', 'existing_client', 'private', true,
   29700, 'usd',
   'Ongoing structured tracking, weekly review cadence, and operating support.',
   'rgs_revenue_control_297_monthly')
on conflict (slug) do nothing;

-- Backfill diagnostic_orders.offer_id for the existing diagnostic offer.
update public.diagnostic_orders o
   set offer_id = (select id from public.offers where slug = 'rgs_diagnostic_3000'),
       payment_lane = 'public_non_client',
       billing_type = 'one_time'
 where offer_id is null
   and o.price_id = 'rgs_diagnostic_3000';

-- ---------- helper: server-side resolve of a payable offer ----------
-- Returns the offer row for slug if it is active and not exhausted.
-- Used by edge functions so the price is never trusted from the client.
create or replace function public.get_payable_offer_by_slug(_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  offer_type public.offer_type,
  billing_type public.offer_billing_type,
  payment_lane public.offer_payment_lane,
  visibility public.offer_visibility,
  price_cents integer,
  currency text,
  stripe_lookup_key text,
  requires_admin_approval boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.slug, o.name, o.offer_type, o.billing_type, o.payment_lane,
         o.visibility, o.price_cents, o.currency, o.stripe_lookup_key,
         o.requires_admin_approval
    from public.offers o
   where o.slug = _slug
     and o.is_active = true
     and (o.start_at is null or o.start_at <= now())
     and (o.end_at is null or o.end_at > now())
     and (o.max_uses is null or o.current_uses < o.max_uses)
   limit 1;
$$;
grant execute on function public.get_payable_offer_by_slug(text) to anon, authenticated, service_role;

-- Atomically increment current_uses (called by webhook after a successful payment).
create or replace function public.increment_offer_use(_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_only';
  end if;
  update public.offers
     set current_uses = current_uses + 1,
         updated_at = now()
   where id = _offer_id;
end;
$$;
revoke execute on function public.increment_offer_use(uuid) from public;
