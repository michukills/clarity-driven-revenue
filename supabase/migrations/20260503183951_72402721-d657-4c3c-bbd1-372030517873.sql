CREATE OR REPLACE FUNCTION private.get_effective_tools_for_customer(_customer_id uuid)
 RETURNS TABLE(tool_id uuid, tool_key text, name text, description text, tool_type public.tool_catalog_type, default_visibility public.tool_catalog_visibility, status public.tool_catalog_status, route_path text, icon_key text, requires_industry boolean, requires_active_client boolean, effective_enabled boolean, reason text, industry_match boolean, override_state text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_industry public.industry_category;
  v_lifecycle text;
  v_stage text;
  v_is_admin boolean;
  v_owns boolean;
  v_industry_confirmed boolean;
  v_snapshot_verified boolean;
  v_owner_interview_done boolean;
  v_force_unlock boolean;
  v_diag_pay text;
  v_diag_status text;
  v_impl_pay text;
  v_impl_started_at timestamptz;
  v_impl_ended_at date;
  v_rcs_status text;
  v_rcs_paid_through date;
  v_today date := current_date;
  v_diag_lane_active boolean;
  v_impl_active_stage boolean;
  v_impl_lane_active boolean;
  v_rcs_grace boolean;
  v_rcs_lane_active boolean;
  v_active_impl_stages text[] := ARRAY[
    'implementation_added','implementation_onboarding','tools_assigned',
    'client_training_setup','implementation_active','waiting_on_client',
    'review_revision_window','implementation','work_in_progress'
  ];
BEGIN
  IF _customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_id required';
  END IF;

  v_is_admin := private.is_admin(auth.uid());
  v_owns := private.user_owns_customer(auth.uid(), _customer_id);
  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT c.industry, c.lifecycle_state::text, c.stage::text,
         COALESCE(c.industry_confirmed_by_admin, false),
         (c.owner_interview_completed_at IS NOT NULL),
         COALESCE(c.diagnostic_tools_force_unlocked, false),
         c.diagnostic_payment_status, c.diagnostic_status,
         c.implementation_payment_status, c.implementation_started_at, c.implementation_ended_at,
         c.rcc_subscription_status, c.rcc_paid_through
    INTO v_industry, v_lifecycle, v_stage, v_industry_confirmed, v_owner_interview_done, v_force_unlock,
         v_diag_pay, v_diag_status, v_impl_pay, v_impl_started_at, v_impl_ended_at,
         v_rcs_status, v_rcs_paid_through
    FROM public.customers c WHERE c.id = _customer_id;

  SELECT COALESCE(s.snapshot_status = 'admin_verified' AND s.industry_verified, false)
    INTO v_snapshot_verified
    FROM public.client_business_snapshots s WHERE s.customer_id = _customer_id;
  v_snapshot_verified := COALESCE(v_snapshot_verified, false);

  -- Lane activation flags (clients only; admins bypass)
  v_diag_lane_active := v_diag_pay IN ('paid','waived')
                        OR v_diag_status NOT IN ('not_started')
                        OR v_owner_interview_done;

  v_impl_active_stage := v_stage = ANY(v_active_impl_stages);
  v_impl_lane_active := v_impl_pay IN ('paid','waived') OR v_impl_active_stage;

  v_rcs_grace := v_impl_ended_at IS NOT NULL
                 AND (v_impl_ended_at + INTERVAL '30 days')::date >= v_today;
  v_rcs_lane_active := v_rcs_status IN ('active','comped')
                       OR v_impl_active_stage
                       OR v_rcs_grace
                       OR (v_rcs_status = 'past_due' AND v_rcs_grace);

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
        -- P43 lane gates (clients only; admin overrides bypass)
        WHEN NOT v_is_admin
             AND w.tool_type = 'diagnostic'
             AND w.tool_key NOT IN ('owner_diagnostic_interview','scorecard')
             AND w.override_state_v <> 'granted'
             AND NOT v_diag_lane_active
          THEN false
        WHEN NOT v_is_admin
             AND w.tool_type = 'implementation'
             AND w.override_state_v <> 'granted'
             AND NOT v_impl_lane_active
          THEN false
        WHEN NOT v_is_admin
             AND w.tool_type = 'tracking'
             AND w.override_state_v <> 'granted'
             AND NOT v_rcs_lane_active
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
        WHEN NOT v_is_admin
             AND w.tool_type = 'diagnostic'
             AND w.tool_key NOT IN ('owner_diagnostic_interview','scorecard')
             AND w.override_state_v <> 'granted'
             AND NOT v_diag_lane_active
          THEN 'diagnostic_lane_inactive'
        WHEN NOT v_is_admin
             AND w.tool_type = 'implementation'
             AND w.override_state_v <> 'granted'
             AND NOT v_impl_lane_active
          THEN 'implementation_lane_inactive'
        WHEN NOT v_is_admin
             AND w.tool_type = 'tracking'
             AND w.override_state_v <> 'granted'
             AND NOT v_rcs_lane_active
          THEN 'rcs_lane_inactive'
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