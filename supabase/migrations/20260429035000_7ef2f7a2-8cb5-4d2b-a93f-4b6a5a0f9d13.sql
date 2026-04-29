-- P32.2 — Treat explicit industry review flags as tool-access blockers.
--
-- P32.1 already requires admin-confirmed industry + verified snapshot before
-- industry-gated tools unlock. This patch adds the final guard: if an admin
-- marks customers.needs_industry_review=true, industry-gated tools stay locked
-- even if an older industry/snapshot had previously been verified.

CREATE OR REPLACE FUNCTION public.get_effective_tools_for_customer(_customer_id uuid)
 RETURNS TABLE(tool_id uuid, tool_key text, name text, description text, tool_type tool_catalog_type, default_visibility tool_catalog_visibility, status tool_catalog_status, route_path text, icon_key text, requires_industry boolean, requires_active_client boolean, effective_enabled boolean, reason text, industry_match boolean, override_state text)
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
  v_needs_industry_review boolean;
  v_snapshot_verified boolean;
BEGIN
  v_is_admin := public.is_admin(auth.uid());
  v_owns := public.user_owns_customer(auth.uid(), _customer_id);

  IF NOT v_is_admin AND NOT v_owns THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
      c.industry,
      c.lifecycle_state::text,
      COALESCE(c.industry_confirmed_by_admin, false),
      COALESCE(c.needs_industry_review, false)
    INTO v_industry, v_lifecycle, v_industry_confirmed, v_needs_industry_review
    FROM public.customers c
   WHERE c.id = _customer_id;

  SELECT COALESCE(s.snapshot_status = 'admin_verified' AND s.industry_verified, false)
    INTO v_snapshot_verified
    FROM public.client_business_snapshots s
   WHERE s.customer_id = _customer_id;
  v_snapshot_verified := COALESCE(v_snapshot_verified, false);

  RETURN QUERY
  WITH base AS (
    SELECT t.* FROM public.tool_catalog t WHERE t.status <> 'deprecated'
  ),
  with_override AS (
    SELECT
      b.*,
      o.enabled AS override_enabled,
      CASE
        WHEN o.id IS NULL THEN 'none'
        WHEN o.enabled THEN 'granted'
        ELSE 'revoked'
      END AS override_state_v
    FROM base b
    LEFT JOIN public.client_tool_access o
      ON o.tool_id = b.id AND o.customer_id = _customer_id
  ),
  with_industry AS (
    SELECT
      w.*,
      EXISTS (
        SELECT 1 FROM public.tool_category_access a
         WHERE a.tool_id = w.id
           AND a.industry = v_industry
           AND a.enabled
      ) AS industry_allowed_v,
      EXISTS (
        SELECT 1 FROM public.tool_category_access a WHERE a.tool_id = w.id
      ) AS has_industry_rules_v
    FROM with_override w
  ),
  scored AS (
    SELECT
      w.*,
      CASE
        WHEN w.override_state_v = 'revoked' THEN false
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN v_is_admin
        WHEN w.default_visibility = 'hidden' THEN false
        -- per-client grant always wins over industry/verification gating
        WHEN w.override_state_v = 'granted' THEN true
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN false
        WHEN w.requires_industry AND v_industry IS NULL THEN false
        WHEN w.requires_industry AND v_industry = 'other' THEN false
        WHEN w.requires_industry AND v_needs_industry_review THEN false
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN false
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN false
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN false
        -- Tools with industry rules but not flagged requires_industry: still
        -- need admin confirmation and verified snapshot when industry rules match.
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (v_needs_industry_review OR NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN false
        WHEN NOT w.requires_industry AND NOT w.industry_allowed_v
             AND NOT w.has_industry_rules_v THEN true
        WHEN w.industry_allowed_v THEN true
        ELSE false
      END AS effective_enabled_v,
      CASE
        WHEN w.override_state_v = 'revoked' THEN 'override_revoked'
        WHEN w.tool_type = 'admin_only' OR w.default_visibility = 'admin_only' THEN 'admin_only'
        WHEN w.default_visibility = 'hidden' THEN 'hidden'
        WHEN w.override_state_v = 'granted' THEN 'override_granted'
        WHEN w.requires_active_client AND v_lifecycle IN ('inactive','re_engagement') THEN 'not_active_client'
        WHEN w.requires_industry AND v_industry IS NULL THEN 'industry_unset'
        WHEN w.requires_industry AND v_industry = 'other' THEN 'industry_unset'
        WHEN w.requires_industry AND v_needs_industry_review THEN 'industry_needs_review'
        WHEN w.requires_industry AND NOT v_industry_confirmed THEN 'industry_unconfirmed'
        WHEN w.requires_industry AND NOT v_snapshot_verified THEN 'snapshot_unverified'
        WHEN w.requires_industry AND NOT w.industry_allowed_v THEN 'industry_blocked'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v AND v_needs_industry_review THEN 'industry_needs_review'
        WHEN w.has_industry_rules_v AND w.industry_allowed_v
             AND (NOT v_industry_confirmed OR NOT v_snapshot_verified) THEN 'snapshot_unverified'
        WHEN w.industry_allowed_v THEN 'industry_allowed'
        WHEN NOT w.has_industry_rules_v THEN 'unrestricted'
        ELSE 'industry_blocked'
      END AS reason_v
    FROM with_industry w
  )
  SELECT
    s.id, s.tool_key, s.name, s.description, s.tool_type, s.default_visibility,
    s.status, s.route_path, s.icon_key, s.requires_industry, s.requires_active_client,
    s.effective_enabled_v AS effective_enabled,
    s.reason_v AS reason,
    s.industry_allowed_v AS industry_match,
    s.override_state_v AS override_state
  FROM scored s
  WHERE
    v_is_admin
    OR (
      s.effective_enabled_v = true
      AND s.tool_type <> 'admin_only'
      AND s.default_visibility <> 'admin_only'
      AND s.default_visibility <> 'hidden'
    )
  ORDER BY s.tool_type, s.name;
END;
$function$;
