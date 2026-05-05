-- Add new RGS Control System monthly subscription offer at $1,000/month
insert into public.offers
  (slug, name, offer_type, billing_type, payment_lane, visibility, is_active,
   price_cents, currency, public_description, stripe_lookup_key)
values
  ('rgs_revenue_control_1000_monthly', 'RGS Control System (Monthly)',
   'revenue_control_system', 'recurring_monthly', 'existing_client', 'private', true,
   100000, 'usd',
   'Ongoing visibility, priorities, score history, monitoring, action tracking, and bounded advisory interpretation. Guided independence, not unlimited execution.',
   'rgs_revenue_control_1000_monthly')
on conflict (slug) do nothing;

-- Deactivate prior $297/month subscription offer (kept for historical records, no new sales)
update public.offers
   set is_active = false
 where slug = 'rgs_revenue_control_297_monthly';