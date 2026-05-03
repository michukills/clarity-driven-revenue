
-- 1. Customer-level state for the gate + admin override
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS owner_interview_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS diagnostic_tools_force_unlocked boolean NOT NULL DEFAULT false;

-- 2. Personalised sequence storage
CREATE TABLE IF NOT EXISTS public.diagnostic_tool_sequences (
  customer_id uuid PRIMARY KEY REFERENCES public.customers(id) ON DELETE CASCADE,
  ranked_tool_keys text[] NOT NULL DEFAULT ARRAY[]::text[],
  rationale jsonb NOT NULL DEFAULT '[]'::jsonb,
  admin_override_keys text[],
  admin_override_by uuid,
  admin_override_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diagnostic_tool_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage diagnostic_tool_sequences" ON public.diagnostic_tool_sequences;
CREATE POLICY "Admins manage diagnostic_tool_sequences"
  ON public.diagnostic_tool_sequences
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Clients view own diagnostic_tool_sequences" ON public.diagnostic_tool_sequences;
CREATE POLICY "Clients view own diagnostic_tool_sequences"
  ON public.diagnostic_tool_sequences
  FOR SELECT
  USING (customer_id IS NOT NULL AND public.user_owns_customer(auth.uid(), customer_id));

DROP TRIGGER IF EXISTS diagnostic_tool_sequences_touch ON public.diagnostic_tool_sequences;
CREATE TRIGGER diagnostic_tool_sequences_touch
  BEFORE UPDATE ON public.diagnostic_tool_sequences
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Register Owner Diagnostic Interview tool
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client
) VALUES (
  'owner_diagnostic_interview',
  'Owner Diagnostic Interview',
  'The required first diagnostic step. Captures the owner''s view of the business, where pressure is building, and where visibility is missing — before deeper diagnostic tools unlock.',
  'diagnostic',
  'client_available',
  'active',
  '/portal/tools/owner-diagnostic-interview',
  'clipboard',
  false,
  false
)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path,
      tool_type = EXCLUDED.tool_type,
      default_visibility = EXCLUDED.default_visibility,
      status = EXCLUDED.status;

-- 4. Update effective-tools RPC to apply the owner-interview gate for clients
CREATE OR REPLACE FUNCTION private.get_effective_tools_for_customer(_customer_id uuid)
 RETURNS TABLE(tool_id uuid, tool_key text, name text, description text, tool_type public.tool_catalog_type, default_visibility public.tool_catalog_visibility, status public.tool_catalog_status, route_path text, icon_key text, requires_industry boolean, requires_active_client boolean, effective_enabled boolean, reason text, industry_match boolean, override_state text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_industry public.industry_category;
  v_lifecycle text;
  v_is_admin boolean;
  v_owns boolean;
  v_industry_confirmed boolean;
  v_snapshot_verified boolean;
  v_owner_interview_done boolean;
  v_force_unlock boolean;
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;

  v_is_admin := private.is_admin(auth.uid());
  v_owns := private.user_owns_customer(auth.uid(), _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT c.industry, c.lifecycle_state::text, COALESCE(c.industry_confirmed_by_admin, false),
         (c.owner_interview_completed_at IS NOT NULL),
         COALESCE(c.diagnostic_tools_force_unlocked, false)
    INTO v_industry, v_lifecycle, v_industry_confirmed, v_owner_interview_done, v_force_unlock
    FROM public.customers c WHERE c.id = _customer_id;

  SELECT COALESCE(s.snapshot_status = 'admin_verified' AND s.industry_verified, false)
    INTO v_snapshot_verified
    FROM public.client_business_snapshots s WHERE s.customer_id = _customer_id;
  v_snapshot_verified := COALESCE(v_snapshot_verified, false);

  RETURN QUERY
  WITH base AS (
    SELECT t.* FROM public.tool_catalog t WHERE t.status <> 'deprecated'
  ),
  with_override AS (
    SELECT b.*, o.enabled AS override_enabled,
      CASE WHEN o.id IS NULL THEN 'none'
           WHEN o.enabled THEN 'granted'
           ELSE 'revoked' END AS override_state_v
    FROM base b
    LEFT JOIN public.client_tool_access o
      ON o.tool_id = b.id AND o.customer_id = _customer_id
  ),
  with_industry AS (
    SELECT w.*,
      EXISTS (SELECT 1 FROM public.tool_category_access a
               WHERE a.tool_id = w.id AND a.industry = v_industry AND a.enabled) AS industry_allowed_v,
      EXISTS (SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id) AS has_industry_rules_v
    FROM with_override w
  ),
  scored AS (
    SELECT w.*,
      CASE
        WHEN w.override_state_v = 'revoked' THEN false
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN v_is_admin
        WHEN w.default_visibility = 'hidden' THEN false
        -- Owner Diagnostic Interview gate (clients only). Admins always see full set.
        WHEN NOT v_is_admin
             AND w.tool_type = 'diagnostic'
             AND w.tool_key NOT IN ('owner_diagnostic_interview','scorecard')
             AND NOT v_owner_interview_done
             AND NOT v_force_unlock
             AND w.override_state_v <> 'granted'
          THEN false
        WHEN w.override_state_v = 'granted' THEN true
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN false
        WHEN w.requires_industry AND v_industry IS NULL THEN false
        WHEN w.requires_industry AND v_industry = 'other' THEN false
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN false
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN false
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN false
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN false
        WHEN NOT w.requires_industry AND NOT w.industry_allowed_v
             AND NOT w.has_industry_rules_v THEN true
        WHEN w.industry_allowed_v THEN true
        ELSE false
      END AS effective_enabled_v,
      CASE
        WHEN w.override_state_v = 'revoked' THEN 'override_revoked'
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN 'admin_only'
        WHEN w.default_visibility = 'hidden' THEN 'hidden'
        WHEN NOT v_is_admin
             AND w.tool_type = 'diagnostic'
             AND w.tool_key NOT IN ('owner_diagnostic_interview','scorecard')
             AND NOT v_owner_interview_done
             AND NOT v_force_unlock
             AND w.override_state_v <> 'granted'
          THEN 'owner_interview_required'
        WHEN w.override_state_v = 'granted' THEN 'override_granted'
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN 'not_active_client'
        WHEN w.requires_industry AND v_industry IS NULL THEN 'industry_unset'
        WHEN w.requires_industry AND v_industry = 'other' THEN 'industry_unset'
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN 'industry_unconfirmed'
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN 'snapshot_unverified'
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN 'industry_blocked'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN 'snapshot_unverified'
        WHEN w.industry_allowed_v THEN 'industry_allowed'
        WHEN NOT w.has_industry_rules_v THEN 'unrestricted'
        ELSE 'industry_blocked'
      END AS reason_v
    FROM with_industry w
  )
  SELECT s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
         s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
         s.effective_enabled_v, s.reason_v, s.industry_allowed_v, s.override_state_v
  FROM scored s
  WHERE v_is_admin
     OR (s.effective_enabled_v = true
         AND s.tool_type <> 'admin_only'
         AND s.default_visibility <> 'admin_only'
         AND s.default_visibility <> 'hidden')
  ORDER BY s.tool_type, s.name;
END;
$function$;

-- 5. Mark complete + compute deterministic sequence
CREATE OR REPLACE FUNCTION public.mark_owner_interview_complete(_customer_id uuid)
RETURNS public.diagnostic_tool_sequences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_owns boolean;
  v_required_keys text[] := ARRAY[
    'biz_identity','biz_industry','biz_offer','biz_revenue_stage',
    'owner_problem_top','owner_what_changed','owner_already_tried',
    'demand_sources','demand_reliable','demand_unreliable',
    'sales_process','followup_process',
    'ops_bottleneck','ops_owner_dependent',
    'fin_visibility','fin_pricing_confidence',
    'owner_decisions_only','owner_key_person_risk'
  ];
  v_missing int;
  v_answers jsonb;
  v_ranked text[] := ARRAY[]::text[];
  v_rationale jsonb := '[]'::jsonb;
  v_row public.diagnostic_tool_sequences;
  v_demand_signal boolean;
  v_conv_signal boolean;
  v_ops_signal boolean;
  v_fin_signal boolean;
  v_owner_signal boolean;
  fn_low text := 'I don''t know';
BEGIN
  IF _customer_id IS NULL THEN RAISE EXCEPTION 'customer_id required'; END IF;
  v_is_admin := public.is_admin(v_uid);
  v_owns := public.user_owns_customer(v_uid, _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  -- Verify required answers
  SELECT count(*) INTO v_missing
    FROM unnest(v_required_keys) k
   WHERE NOT EXISTS (
     SELECT 1 FROM public.diagnostic_intake_answers a
      WHERE a.customer_id = _customer_id
        AND a.section_key = k
        AND a.answer IS NOT NULL
        AND length(trim(a.answer)) > 0
   );
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'owner_interview_incomplete' USING HINT = v_missing::text || ' required answers missing';
  END IF;

  -- Pull all answers as jsonb map for theme detection
  SELECT jsonb_object_agg(section_key, COALESCE(answer,''))
    INTO v_answers
    FROM public.diagnostic_intake_answers
   WHERE customer_id = _customer_id;
  v_answers := COALESCE(v_answers, '{}'::jsonb);

  -- Theme signals: marked when answer length > 8 chars and not "I don't know"
  v_demand_signal := length(coalesce(v_answers->>'demand_unreliable','')) > 8
                  OR position('don''t know' in lower(coalesce(v_answers->>'demand_sources',''))) > 0
                  OR position('don''t know' in lower(coalesce(v_answers->>'demand_reliable',''))) > 0;
  v_conv_signal   := length(coalesce(v_answers->>'sales_process','')) > 8
                  OR length(coalesce(v_answers->>'followup_process','')) > 8;
  v_ops_signal    := length(coalesce(v_answers->>'ops_bottleneck','')) > 8
                  OR length(coalesce(v_answers->>'ops_owner_dependent','')) > 8;
  v_fin_signal    := position('don''t know' in lower(coalesce(v_answers->>'fin_visibility',''))) > 0
                  OR position('don''t know' in lower(coalesce(v_answers->>'fin_pricing_confidence',''))) > 0
                  OR length(coalesce(v_answers->>'fin_visibility','')) > 8;
  v_owner_signal  := length(coalesce(v_answers->>'owner_decisions_only','')) > 8
                  OR length(coalesce(v_answers->>'owner_key_person_risk','')) > 8;

  -- Deterministic priority order: pillar tools mapped to themes.
  -- Default fallback order if nothing flagged: stability, persona, journey, leak, process.
  IF v_demand_signal THEN
    v_ranked := v_ranked || 'buyer_persona_tool';
    v_rationale := v_rationale || jsonb_build_object('tool_key','buyer_persona_tool','reason','Demand sources are unclear or unreliable — start by clarifying who actually buys.');
  END IF;
  IF v_conv_signal THEN
    v_ranked := v_ranked || 'customer_journey_mapper';
    v_rationale := v_rationale || jsonb_build_object('tool_key','customer_journey_mapper','reason','Sales/follow-up flow appears uneven — map the buying path before tuning anything else.');
  END IF;
  IF v_ops_signal THEN
    v_ranked := v_ranked || 'process_breakdown_tool';
    v_rationale := v_rationale || jsonb_build_object('tool_key','process_breakdown_tool','reason','Operational handoffs / owner-dependence flagged — process clarity comes next.');
  END IF;
  IF v_fin_signal THEN
    v_ranked := v_ranked || 'revenue_leak_finder';
    v_rationale := v_rationale || jsonb_build_object('tool_key','revenue_leak_finder','reason','Margin / cash visibility is unclear — surface where revenue may be leaking.');
  END IF;
  IF v_owner_signal THEN
    v_ranked := v_ranked || 'rgs_stability_scorecard';
    v_rationale := v_rationale || jsonb_build_object('tool_key','rgs_stability_scorecard','reason','Owner is acting as the system — score stability across all five gears to see the gap.');
  END IF;

  -- Append any pillar tools not yet ranked, in stable default order
  IF NOT 'rgs_stability_scorecard' = ANY(v_ranked) THEN
    v_ranked := v_ranked || 'rgs_stability_scorecard';
    v_rationale := v_rationale || jsonb_build_object('tool_key','rgs_stability_scorecard','reason','Baseline stability check across the five RGS gears.');
  END IF;
  IF NOT 'buyer_persona_tool' = ANY(v_ranked) THEN
    v_ranked := v_ranked || 'buyer_persona_tool';
    v_rationale := v_rationale || jsonb_build_object('tool_key','buyer_persona_tool','reason','Confirm the best-fit buyer.');
  END IF;
  IF NOT 'customer_journey_mapper' = ANY(v_ranked) THEN
    v_ranked := v_ranked || 'customer_journey_mapper';
    v_rationale := v_rationale || jsonb_build_object('tool_key','customer_journey_mapper','reason','Map how customers actually move from first contact to paying.');
  END IF;
  IF NOT 'revenue_leak_finder' = ANY(v_ranked) THEN
    v_ranked := v_ranked || 'revenue_leak_finder';
    v_rationale := v_rationale || jsonb_build_object('tool_key','revenue_leak_finder','reason','Identify where revenue is being lost between systems.');
  END IF;
  IF NOT 'process_breakdown_tool' = ANY(v_ranked) THEN
    v_ranked := v_ranked || 'process_breakdown_tool';
    v_rationale := v_rationale || jsonb_build_object('tool_key','process_breakdown_tool','reason','Document the workflow that delivers the offer.');
  END IF;

  -- Stamp completion
  UPDATE public.customers
     SET owner_interview_completed_at = COALESCE(owner_interview_completed_at, now()),
         last_activity_at = now()
   WHERE id = _customer_id;

  -- Upsert sequence
  INSERT INTO public.diagnostic_tool_sequences (customer_id, ranked_tool_keys, rationale, generated_at, updated_at)
  VALUES (_customer_id, v_ranked, v_rationale, now(), now())
  ON CONFLICT (customer_id) DO UPDATE
    SET ranked_tool_keys = EXCLUDED.ranked_tool_keys,
        rationale = EXCLUDED.rationale,
        generated_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
  VALUES (_customer_id, 'owner_interview_completed', 'Owner Diagnostic Interview completed',
          'Diagnostic tools unlocked. Personalized priority sequence generated.', v_uid);

  RETURN v_row;
END;
$$;

-- 6. Admin-only sequence override
CREATE OR REPLACE FUNCTION public.set_diagnostic_tool_sequence_override(
  _customer_id uuid,
  _ranked_tool_keys text[]
)
RETURNS public.diagnostic_tool_sequences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.diagnostic_tool_sequences;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  IF _customer_id IS NULL THEN RAISE EXCEPTION 'customer_id required'; END IF;

  INSERT INTO public.diagnostic_tool_sequences (customer_id, ranked_tool_keys, rationale, admin_override_keys, admin_override_by, admin_override_at)
  VALUES (_customer_id, COALESCE(_ranked_tool_keys, ARRAY[]::text[]), '[]'::jsonb,
          _ranked_tool_keys, auth.uid(), now())
  ON CONFLICT (customer_id) DO UPDATE
    SET admin_override_keys = _ranked_tool_keys,
        admin_override_by = auth.uid(),
        admin_override_at = now(),
        updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.customer_timeline (customer_id, event_type, title, detail, actor_id)
  VALUES (_customer_id, 'diagnostic_sequence_overridden', 'Diagnostic tool order overridden',
          'Admin set a custom diagnostic tool sequence.', auth.uid());

  RETURN v_row;
END;
$$;
