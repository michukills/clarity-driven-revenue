ALTER TABLE public.diagnostic_intakes
  ADD COLUMN IF NOT EXISTS ack_no_guarantee boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ack_one_primary_scope boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ack_recorded_at timestamptz;