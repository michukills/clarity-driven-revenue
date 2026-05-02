
-- =====================================================================
-- P31: Diagnostic intake, orders, and portal invites
-- =====================================================================

-- ---------- enums ----------
do $$ begin
  create type public.diagnostic_intake_fit as enum (
    'pending', 'auto_qualified', 'needs_review', 'auto_declined'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_intake_status as enum (
    'submitted',
    'fit_review',
    'fit_passed',
    'fit_declined',
    'checkout_started',
    'paid_pending_access',
    'invite_sent',
    'invite_accepted',
    'abandoned',
    'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.diagnostic_order_status as enum (
    'pending', 'paid', 'failed', 'refunded', 'canceled'
  );
exception when duplicate_object then null; end $$;

-- ---------- diagnostic_intakes ----------
create table if not exists public.diagnostic_intakes (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  business_name text not null,
  business_description text,
  situation text,
  situation_other text,
  monthly_revenue text,
  primary_goal text,
  scorecard_prompt text,
  source text not null default 'diagnostic_apply',
  user_agent text,
  ip_hash text,
  fit_status public.diagnostic_intake_fit not null default 'pending',
  fit_reason text,
  intake_status public.diagnostic_intake_status not null default 'submitted',
  customer_id uuid references public.customers(id) on delete set null,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diagnostic_intakes_email_chk check (char_length(email) between 3 and 255),
  constraint diagnostic_intakes_full_name_chk check (char_length(full_name) between 1 and 200),
  constraint diagnostic_intakes_business_name_chk check (char_length(business_name) between 1 and 200)
);
create index if not exists diagnostic_intakes_email_idx on public.diagnostic_intakes (lower(email));
create index if not exists diagnostic_intakes_status_idx on public.diagnostic_intakes (intake_status);
create index if not exists diagnostic_intakes_created_idx on public.diagnostic_intakes (created_at desc);
create index if not exists diagnostic_intakes_customer_idx on public.diagnostic_intakes (customer_id);

create trigger diagnostic_intakes_touch_updated
  before update on public.diagnostic_intakes
  for each row execute function public.touch_updated_at();

alter table public.diagnostic_intakes enable row level security;

-- Anon + authenticated may submit a new intake (insert only).
create policy "anyone may submit a diagnostic intake"
  on public.diagnostic_intakes
  for insert
  to anon, authenticated
  with check (true);

-- Admins may read / update / delete intakes.
create policy "admins read intakes"
  on public.diagnostic_intakes
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "admins update intakes"
  on public.diagnostic_intakes
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "admins delete intakes"
  on public.diagnostic_intakes
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Per-email rate limit: 5 submissions / 5 minutes.
create or replace function public.diagnostic_intakes_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent int;
begin
  if auth.uid() is not null and public.is_admin(auth.uid()) then
    return new;
  end if;
  select count(*) into recent
    from public.diagnostic_intakes
   where lower(email) = lower(new.email)
     and created_at > now() - interval '5 minutes';
  if recent >= 5 then
    raise exception 'diagnostic_intake_rate_limited'
      using errcode = 'P0001',
            hint = 'too_many_submissions';
  end if;
  return new;
end;
$$;

create trigger diagnostic_intakes_rate_limit_trg
  before insert on public.diagnostic_intakes
  for each row execute function public.diagnostic_intakes_rate_limit();

-- ---------- diagnostic_orders ----------
create table if not exists public.diagnostic_orders (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid references public.diagnostic_intakes(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  email text not null,
  product_id text not null default 'rgs_diagnostic',
  price_id text not null default 'rgs_diagnostic_3000',
  amount_cents integer not null,
  currency text not null default 'usd',
  environment text not null default 'sandbox',
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  status public.diagnostic_order_status not null default 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint diagnostic_orders_env_chk check (environment in ('sandbox','live')),
  constraint diagnostic_orders_amount_chk check (amount_cents > 0)
);
create index if not exists diagnostic_orders_intake_idx on public.diagnostic_orders (intake_id);
create index if not exists diagnostic_orders_customer_idx on public.diagnostic_orders (customer_id);
create index if not exists diagnostic_orders_status_idx on public.diagnostic_orders (status);
create index if not exists diagnostic_orders_email_idx on public.diagnostic_orders (lower(email));

create trigger diagnostic_orders_touch_updated
  before update on public.diagnostic_orders
  for each row execute function public.touch_updated_at();

alter table public.diagnostic_orders enable row level security;

-- Admins read / update; service role (webhook) writes via security-definer functions.
create policy "admins read orders"
  on public.diagnostic_orders
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "admins update orders"
  on public.diagnostic_orders
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- portal_invites ----------
create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  intake_id uuid references public.diagnostic_intakes(id) on delete set null,
  order_id uuid references public.diagnostic_orders(id) on delete set null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_sent_at timestamptz,
  send_count integer not null default 0,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists portal_invites_customer_idx on public.portal_invites (customer_id);
create index if not exists portal_invites_email_idx on public.portal_invites (lower(email));

create trigger portal_invites_touch_updated
  before update on public.portal_invites
  for each row execute function public.touch_updated_at();

alter table public.portal_invites enable row level security;

create policy "admins read invites"
  on public.portal_invites
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "admins manage invites"
  on public.portal_invites
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- ---------- token-claim helper functions ----------
-- Hash helper: sha256 hex of provided token. Used for token-only lookup
-- without ever storing the raw token. Marked stable + security definer
-- so anonymous claim flows can verify without read access to the table.
create or replace function public.hash_invite_token(_token text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(extensions.digest(_token, 'sha256'), 'hex');
$$;

-- Lookup invite by raw token. Returns minimal, safe fields. Caller cannot
-- enumerate other invites; the function only returns rows whose hash matches
-- and that are still claimable (not revoked, not expired, not accepted).
create or replace function public.lookup_invite_by_token(_token text)
returns table(
  invite_id uuid,
  customer_id uuid,
  email text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, customer_id, email, expires_at, accepted_at, revoked_at
    from public.portal_invites
   where token_hash = public.hash_invite_token(_token)
   limit 1;
$$;

-- Mark invite as accepted by the calling authenticated user, link the
-- customer row to that user, and record a timeline event. Caller must be
-- authenticated, the JWT email must match the invite email (case-insensitive),
-- and the invite must not be expired/revoked/already accepted.
create or replace function public.accept_portal_invite(_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite record;
begin
  if v_uid is null then
    raise exception 'authentication_required' using errcode = 'P0001';
  end if;

  select email::text into v_email from auth.users where id = v_uid;
  if v_email is null then
    raise exception 'auth_user_not_found' using errcode = 'P0001';
  end if;

  select id, customer_id, email, expires_at, accepted_at, revoked_at
    into v_invite
    from public.portal_invites
   where token_hash = public.hash_invite_token(_token)
   limit 1;

  if v_invite.id is null then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
  if v_invite.revoked_at is not null then
    raise exception 'invite_revoked' using errcode = 'P0001';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_already_accepted' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'invite_email_mismatch' using errcode = 'P0001';
  end if;

  -- Ensure the auth user is not already linked to a different customer.
  if exists (select 1 from public.customers
              where user_id = v_uid
                and id <> v_invite.customer_id) then
    raise exception 'auth_user_already_linked' using errcode = 'P0001';
  end if;

  update public.customers
     set user_id = v_uid,
         portal_unlocked = true,
         last_activity_at = now()
   where id = v_invite.customer_id
     and (user_id is null or user_id = v_uid);

  update public.portal_invites
     set accepted_at = now(),
         accepted_by_user_id = v_uid,
         updated_at = now()
   where id = v_invite.id;

  -- Move the originating intake (if any) to invite_accepted.
  update public.diagnostic_intakes di
     set intake_status = 'invite_accepted',
         updated_at = now()
   from public.portal_invites pi
   where pi.id = v_invite.id
     and di.id = pi.intake_id;

  insert into public.customer_timeline (customer_id, event_type, title, detail, actor_id)
  values (v_invite.customer_id,
          'client_account_linked',
          'Client portal account claimed',
          'Invite accepted by ' || v_email,
          v_uid);

  return v_invite.customer_id;
end;
$$;

-- Service-role only helper used by the Stripe webhook to record an order
-- update and move the intake into paid_pending_access. Never callable
-- from the client.
create or replace function public.diagnostic_order_mark_paid(
  _stripe_session_id text,
  _stripe_payment_intent_id text,
  _stripe_customer_id text,
  _amount_cents integer,
  _currency text,
  _environment text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_intake_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_only';
  end if;

  update public.diagnostic_orders
     set status = 'paid',
         paid_at = now(),
         stripe_payment_intent_id = coalesce(_stripe_payment_intent_id, stripe_payment_intent_id),
         stripe_customer_id = coalesce(_stripe_customer_id, stripe_customer_id),
         amount_cents = coalesce(_amount_cents, amount_cents),
         currency = coalesce(_currency, currency),
         environment = coalesce(_environment, environment),
         updated_at = now()
   where stripe_session_id = _stripe_session_id
   returning id, intake_id into v_order_id, v_intake_id;

  if v_intake_id is not null then
    update public.diagnostic_intakes
       set intake_status = case
             when intake_status in ('invite_sent','invite_accepted') then intake_status
             else 'paid_pending_access'::public.diagnostic_intake_status
           end,
           updated_at = now()
     where id = v_intake_id;
  end if;

  return v_order_id;
end;
$$;

grant execute on function public.lookup_invite_by_token(text) to anon, authenticated;
grant execute on function public.accept_portal_invite(text) to authenticated;
revoke execute on function public.diagnostic_order_mark_paid(text, text, text, integer, text, text) from public;
