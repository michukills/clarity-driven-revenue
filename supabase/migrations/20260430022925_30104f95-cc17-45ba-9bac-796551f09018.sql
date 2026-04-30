create table if not exists public.diagnostic_ai_followups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  section_key text not null,
  question text not null,
  answer text,
  model text,
  rationale text,
  hidden_from_report boolean not null default false,
  admin_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  answered_by uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostic_ai_followups_customer_section_idx
  on public.diagnostic_ai_followups (customer_id, section_key, created_at desc);

create trigger diagnostic_ai_followups_touch_updated_at
  before update on public.diagnostic_ai_followups
  for each row execute function public.touch_updated_at();

alter table public.diagnostic_ai_followups enable row level security;

create policy "diagnostic_ai_followups admin all"
  on public.diagnostic_ai_followups
  for all
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "diagnostic_ai_followups customer read own"
  on public.diagnostic_ai_followups
  for select
  to authenticated
  using (public.user_owns_customer(auth.uid(), customer_id));

create policy "diagnostic_ai_followups customer update own answer"
  on public.diagnostic_ai_followups
  for update
  to authenticated
  using (public.user_owns_customer(auth.uid(), customer_id))
  with check (public.user_owns_customer(auth.uid(), customer_id));

create or replace function public.diagnostic_ai_followups_guard_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;

  if new.customer_id is distinct from old.customer_id
     or new.section_key is distinct from old.section_key
     or new.question is distinct from old.question
     or new.model is distinct from old.model
     or new.rationale is distinct from old.rationale
     or new.hidden_from_report is distinct from old.hidden_from_report
     or new.admin_notes is distinct from old.admin_notes
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at
  then
    raise exception 'clients may only update the answer field on AI follow-ups';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger diagnostic_ai_followups_guard_client_update_trg
  before update on public.diagnostic_ai_followups
  for each row execute function public.diagnostic_ai_followups_guard_client_update();