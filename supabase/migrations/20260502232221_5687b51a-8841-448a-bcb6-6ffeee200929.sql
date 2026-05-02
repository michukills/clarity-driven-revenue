
-- ============================================================
-- P32 — Admin payment notifications + lifecycle hooks
-- ============================================================

-- 1) admin_notifications table (admin-only operational queue, distinct
--    from customer_tasks because some events fire before a customer
--    record exists, e.g. paid-pending intake)
create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  customer_id uuid references public.customers(id) on delete set null,
  intake_id uuid references public.diagnostic_intakes(id) on delete set null,
  order_id uuid references public.diagnostic_orders(id) on delete set null,
  subscription_id uuid references public.payment_subscriptions(id) on delete set null,
  business_name text,
  email text,
  amount_cents integer,
  currency text,
  payment_lane public.offer_payment_lane,
  offer_slug text,
  message text not null,
  next_action text,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  read_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists admin_notifications_open_idx
  on public.admin_notifications (created_at desc)
  where completed_at is null;
create index if not exists admin_notifications_customer_idx
  on public.admin_notifications (customer_id);

alter table public.admin_notifications enable row level security;

drop policy if exists "admins manage notifications" on public.admin_notifications;
create policy "admins manage notifications"
  on public.admin_notifications for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 2) Helper RPC: mark any (lane-agnostic) diagnostic_orders row paid by
--    session id, idempotent. Used by webhook for both lanes.
create or replace function public.payment_order_mark_paid(
  _stripe_session_id text,
  _stripe_payment_intent_id text,
  _stripe_customer_id text,
  _amount_cents integer,
  _currency text,
  _environment text
) returns table (
  order_id uuid,
  customer_id uuid,
  intake_id uuid,
  payment_lane public.offer_payment_lane,
  offer_id uuid,
  email text,
  was_already_paid boolean
)
language plpgsql security definer set search_path = public as $$
declare
  v_was_paid boolean := false;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_only';
  end if;

  select (status = 'paid') into v_was_paid
    from public.diagnostic_orders
   where stripe_session_id = _stripe_session_id;

  update public.diagnostic_orders
     set status = 'paid',
         paid_at = coalesce(paid_at, now()),
         stripe_payment_intent_id = coalesce(_stripe_payment_intent_id, stripe_payment_intent_id),
         stripe_customer_id = coalesce(_stripe_customer_id, stripe_customer_id),
         amount_cents = coalesce(_amount_cents, amount_cents),
         currency = coalesce(_currency, currency),
         environment = coalesce(_environment, environment),
         total_cents = coalesce(_amount_cents, total_cents, amount_cents),
         updated_at = now()
   where stripe_session_id = _stripe_session_id
   returning id, customer_id, intake_id, payment_lane, offer_id, email
     into order_id, customer_id, intake_id, payment_lane, offer_id, email;

  if order_id is null then
    return;
  end if;

  -- public diagnostic lane: bump intake to paid_pending_access
  if intake_id is not null then
    update public.diagnostic_intakes
       set intake_status = case
             when intake_status in ('invite_sent','invite_accepted') then intake_status
             else 'paid_pending_access'::public.diagnostic_intake_status
           end,
           updated_at = now()
     where id = intake_id;
  end if;

  -- existing-client lane: refresh per-bucket payment status on customers
  if customer_id is not null and payment_lane = 'existing_client' then
    update public.customers c
       set last_activity_at = now(),
           implementation_payment_status = case
             when o.offer_type = 'implementation' then 'paid'
             else c.implementation_payment_status
           end,
           implementation_paid_at = case
             when o.offer_type = 'implementation' then now()
             else c.implementation_paid_at
           end,
           addon_payment_status = case
             when o.offer_type in ('add_on','custom_manual') then 'paid'
             else c.addon_payment_status
           end,
           addon_paid_at = case
             when o.offer_type in ('add_on','custom_manual') then now()
             else c.addon_paid_at
           end
      from public.offers o
     where c.id = customer_id
       and o.id = offer_id;
  end if;

  was_already_paid := coalesce(v_was_paid, false);
  return next;
end;
$$;

revoke all on function public.payment_order_mark_paid(text,text,text,integer,text,text) from public;
grant execute on function public.payment_order_mark_paid(text,text,text,integer,text,text) to service_role;

-- 3) Helper: upsert a payment_subscriptions row from a Stripe subscription
--    event (RCS recurring lane). Matched via stripe_subscription_id.
create or replace function public.payment_subscription_upsert(
  _customer_id uuid,
  _offer_id uuid,
  _stripe_subscription_id text,
  _stripe_customer_id text,
  _status public.payment_subscription_status,
  _current_period_start timestamptz,
  _current_period_end timestamptz,
  _cancel_at_period_end boolean,
  _amount_cents integer,
  _currency text,
  _environment text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_only';
  end if;

  insert into public.payment_subscriptions (
    customer_id, offer_id, stripe_subscription_id, stripe_customer_id,
    status, current_period_start, current_period_end, cancel_at_period_end,
    amount_cents, currency, environment
  ) values (
    _customer_id, _offer_id, _stripe_subscription_id, _stripe_customer_id,
    _status, _current_period_start, _current_period_end, coalesce(_cancel_at_period_end,false),
    _amount_cents, coalesce(_currency,'usd'), coalesce(_environment,'sandbox')
  )
  on conflict (stripe_subscription_id) do update
    set status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = now()
  returning id into v_id;

  -- mirror onto customers.rcc_subscription_status for back-compat
  update public.customers
     set rcc_subscription_status = case _status
           when 'active' then 'active'
           when 'trialing' then 'trialing'
           when 'past_due' then 'past_due'
           when 'canceled' then 'canceled'
           when 'paused' then 'paused'
           else rcc_subscription_status
         end,
         rcc_paid_through = coalesce(_current_period_end::date, rcc_paid_through),
         last_activity_at = now()
   where id = _customer_id;

  return v_id;
end;
$$;

revoke all on function public.payment_subscription_upsert(uuid,uuid,text,text,public.payment_subscription_status,timestamptz,timestamptz,boolean,integer,text,text) from public;
grant execute on function public.payment_subscription_upsert(uuid,uuid,text,text,public.payment_subscription_status,timestamptz,timestamptz,boolean,integer,text,text) to service_role;

-- 4) Helper view for the admin payments dashboard (computed next_action label)
create or replace view public.v_admin_payment_orders as
select
  o.id,
  o.created_at,
  o.paid_at,
  o.status,
  o.amount_cents,
  o.subtotal_cents,
  o.tax_cents,
  o.total_cents,
  o.currency,
  o.environment,
  o.stripe_session_id,
  o.stripe_payment_intent_id,
  o.stripe_customer_id,
  o.payment_lane,
  o.billing_type,
  o.email,
  o.customer_id,
  o.intake_id,
  o.offer_id,
  off.slug as offer_slug,
  off.name as offer_name,
  off.offer_type,
  c.business_name as customer_business_name,
  c.full_name as customer_full_name,
  i.business_name as intake_business_name,
  i.full_name as intake_full_name,
  i.intake_status,
  i.fit_status,
  case
    when o.payment_lane = 'public_non_client' then case
      when o.status = 'pending' then 'Payment pending'
      when o.status = 'failed' then 'Payment failed — review'
      when o.status = 'canceled' then 'Closed / no action'
      when o.status = 'paid' and i.intake_status = 'paid_pending_access' then 'Approve & send portal invite'
      when o.status = 'paid' and i.intake_status = 'invite_sent' then 'Invite sent'
      when o.status = 'paid' and i.intake_status = 'invite_accepted' then 'Begin diagnostic'
      else 'Review intake'
    end
    when o.payment_lane = 'existing_client' then case
      when o.status = 'pending' and o.billing_type = 'manual_invoice' then 'Send manual invoice'
      when o.status = 'pending' then 'Payment pending'
      when o.status = 'failed' then 'Payment failed — follow up'
      when o.status = 'canceled' then 'Closed / no action'
      when o.status = 'paid' and off.offer_type = 'implementation' then 'Begin implementation'
      when o.status = 'paid' and off.offer_type = 'revenue_control_system' then 'Activate Revenue Control System'
      when o.status = 'paid' then 'Assign next-step tools if appropriate'
      else 'Follow up manually'
    end
    else 'needs_review'
  end as next_action
from public.diagnostic_orders o
left join public.offers off on off.id = o.offer_id
left join public.customers c on c.id = o.customer_id
left join public.diagnostic_intakes i on i.id = o.intake_id;

-- view inherits RLS from base tables; admins-only via existing diagnostic_orders/intakes/offers policies
