
-- P52: Register the RGS Control System umbrella page as a tool_catalog entry.
-- No new table, no RLS changes. Access is enforced by the existing
-- get_effective_tools_for_customer + ClientToolGuard + RccGate pipeline.
INSERT INTO public.tool_catalog (
  tool_key, name, description, tool_type, default_visibility, status,
  route_path, icon_key, requires_industry, requires_active_client,
  service_lane, customer_journey_phase, industry_behavior,
  contains_internal_notes, can_be_client_visible,
  lane_sort_order, phase_sort_order
) VALUES (
  'rgs_control_system',
  'RGS Control System™',
  'Umbrella view for the RGS Control System subscription lane. Brings together ongoing visibility tools, current priorities, review rhythm, decision support, and connected truth-source signals so the owner stays connected to the system without RGS becoming an operator inside the business.',
  'tracking',
  'client_available',
  'active',
  '/portal/tools/rgs-control-system',
  'gauge',
  false,
  true,
  'rgs_control_system',
  'rcs_ongoing_visibility',
  'all_industries_shared',
  false,
  true,
  10,
  10
)
ON CONFLICT (tool_key) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      route_path = EXCLUDED.route_path,
      tool_type = EXCLUDED.tool_type,
      default_visibility = EXCLUDED.default_visibility,
      status = EXCLUDED.status,
      icon_key = EXCLUDED.icon_key,
      requires_active_client = EXCLUDED.requires_active_client,
      service_lane = EXCLUDED.service_lane,
      customer_journey_phase = EXCLUDED.customer_journey_phase,
      industry_behavior = EXCLUDED.industry_behavior,
      contains_internal_notes = EXCLUDED.contains_internal_notes,
      can_be_client_visible = EXCLUDED.can_be_client_visible;
