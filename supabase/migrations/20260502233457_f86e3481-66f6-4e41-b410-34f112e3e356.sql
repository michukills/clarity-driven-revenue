-- P33 — Admin email notification tracking
alter table public.admin_notifications
  add column if not exists email_status text
    check (email_status in ('pending','sent','skipped_missing_config','failed','retry_needed')),
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_error text,
  add column if not exists email_recipients text[],
  add column if not exists email_attempts integer not null default 0,
  add column if not exists last_email_attempt_at timestamptz;

create index if not exists admin_notifications_email_status_idx
  on public.admin_notifications (email_status)
  where email_status in ('failed','retry_needed','skipped_missing_config');

-- Service-role RPC to record email send outcomes
create or replace function public.admin_notification_record_email_result(
  _notification_id uuid,
  _status text,
  _recipients text[],
  _error text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'service_role_only';
  end if;
  if _status not in ('sent','skipped_missing_config','failed','retry_needed','pending') then
    raise exception 'invalid_status';
  end if;
  update public.admin_notifications
     set email_status = _status,
         email_sent_at = case when _status = 'sent' then now() else email_sent_at end,
         email_error = _error,
         email_recipients = coalesce(_recipients, email_recipients),
         email_attempts = email_attempts + 1,
         last_email_attempt_at = now()
   where id = _notification_id;
end;
$$;
revoke all on function public.admin_notification_record_email_result(uuid,text,text[],text) from public;
grant execute on function public.admin_notification_record_email_result(uuid,text,text[],text) to service_role;

-- Admin RPC to mark a notification's email as needing retry
create or replace function public.admin_notification_retry_email(_notification_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin_only';
  end if;
  update public.admin_notifications
     set email_status = 'retry_needed',
         email_error = null
   where id = _notification_id;
end;
$$;
revoke all on function public.admin_notification_retry_email(uuid) from public;
grant execute on function public.admin_notification_retry_email(uuid) to authenticated;