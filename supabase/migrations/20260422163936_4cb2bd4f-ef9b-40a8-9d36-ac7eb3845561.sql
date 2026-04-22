-- Ensure one active weekly summary per customer per week.
-- Existing weekly_checkins is currently empty, so adding the unique
-- index is safe. Historical rows (if ever present) are preserved by
-- only ever updating the latest one via app-level upsert keyed here.
CREATE UNIQUE INDEX IF NOT EXISTS weekly_checkins_customer_week_uidx
  ON public.weekly_checkins (customer_id, week_end);