CREATE TABLE IF NOT EXISTS public.source_conflict_flags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  data_point_key text NOT NULL,
  data_point_label text,
  gear_key text,
  higher_authority_source_type text NOT NULL,
  lower_authority_source_type text NOT NULL,
  higher_authority_value numeric,
  lower_authority_value numeric,
  higher_authority_value_text text,
  lower_authority_value_text text,
  difference_percent numeric,
  conflict_status text NOT NULL DEFAULT 'amber'
    CHECK (conflict_status IN ('amber','open','resolved','dismissed')),
  scoring_value_used numeric,
  scoring_value_used_text text,
  resolution_note text,
  resolved_by uuid,
  resolved_at timestamptz,
  source_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_safe_explanation text,
  client_visible boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scf_customer ON public.source_conflict_flags(customer_id);
CREATE INDEX IF NOT EXISTS idx_scf_open
  ON public.source_conflict_flags(customer_id)
  WHERE conflict_status IN ('amber','open');

ALTER TABLE public.source_conflict_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scf admin all"
  ON public.source_conflict_flags
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "scf client read approved"
  ON public.source_conflict_flags
  FOR SELECT
  USING (
    client_visible = true
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = source_conflict_flags.customer_id
        AND c.user_id = auth.uid()
    )
  );

DROP TRIGGER IF EXISTS scf_set_updated_at ON public.source_conflict_flags;
CREATE TRIGGER scf_set_updated_at
  BEFORE UPDATE ON public.source_conflict_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.has_open_source_conflicts(_customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.source_conflict_flags
    WHERE customer_id = _customer_id
      AND conflict_status IN ('amber','open')
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_open_source_conflicts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_source_conflict(
  _flag_id uuid,
  _resolution_note text,
  _action text DEFAULT 'resolved'
)
RETURNS public.source_conflict_flags
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result public.source_conflict_flags;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _resolution_note IS NULL OR length(btrim(_resolution_note)) = 0 THEN
    RAISE EXCEPTION 'resolution note required';
  END IF;
  IF _action NOT IN ('resolved','dismissed') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;
  UPDATE public.source_conflict_flags
     SET conflict_status = _action,
         resolution_note = _resolution_note,
         resolved_by = auth.uid(),
         resolved_at = now(),
         updated_at = now()
   WHERE id = _flag_id
   RETURNING * INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_source_conflict(uuid, text, text) TO authenticated;