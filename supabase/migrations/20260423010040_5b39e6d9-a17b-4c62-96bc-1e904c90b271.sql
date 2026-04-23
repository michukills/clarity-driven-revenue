-- P7.2.4 — RCC implementation grace period
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS implementation_ended_at date NULL;

-- Update stage-change handler to maintain implementation_ended_at.
CREATE OR REPLACE FUNCTION public.handle_customer_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_items text[] := ARRAY[
    'Kickoff call scheduled',
    'Workspace created and shared',
    'Login credentials delivered',
    'Initial tools assigned',
    'Onboarding worksheet completed',
    'Process map reviewed',
    'First implementation milestone',
    'Mid-implementation review',
    'Final review and handoff'
  ];
  active_impl_stages text[] := ARRAY[
    'implementation_added','implementation_onboarding','tools_assigned',
    'client_training_setup','implementation_active','waiting_on_client',
    'review_revision_window','implementation','work_in_progress'
  ];
  item text;
  pos int := 0;
BEGIN
  NEW.last_activity_at := now();

  IF NEW.stage = 'implementation_added' AND (OLD.stage IS DISTINCT FROM 'implementation_added') THEN
    NEW.track := 'implementation';
    NEW.implementation_status := 'onboarding';
    NEW.portal_unlocked := true;
    NEW.implementation_started_at := COALESCE(NEW.implementation_started_at, now());
    NEW.next_action := COALESCE(NEW.next_action, 'Send onboarding email and assign tools');

    IF NOT EXISTS (SELECT 1 FROM public.checklist_items WHERE customer_id = NEW.id) THEN
      FOREACH item IN ARRAY default_items LOOP
        INSERT INTO public.checklist_items (customer_id, title, position)
        VALUES (NEW.id, item, pos);
        pos := pos + 1;
      END LOOP;
    END IF;

    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail)
    VALUES (NEW.id, 'implementation_started', 'Implementation add-on activated',
            'Workspace unlocked, default checklist created, ready for tool assignment.');
  END IF;

  -- P7.2.4: Maintain implementation_ended_at based on stage transitions.
  IF NEW.stage::text = 'implementation_complete'
     AND (OLD.stage IS DISTINCT FROM NEW.stage)
     AND NEW.implementation_ended_at IS NULL THEN
    NEW.implementation_ended_at := CURRENT_DATE;
  END IF;

  IF NEW.stage::text = ANY(active_impl_stages)
     AND (OLD.stage IS DISTINCT FROM NEW.stage)
     AND NEW.implementation_ended_at IS NOT NULL THEN
    NEW.implementation_ended_at := NULL;
  END IF;

  IF NEW.stage IN ('diagnostic_complete','follow_up_nurture') AND NEW.track = 'shared' THEN
    NEW.track := 'diagnostic_only';
  END IF;

  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.customer_timeline (customer_id, event_type, title, detail)
    VALUES (NEW.id, 'stage_change', 'Stage updated',
            COALESCE(OLD.stage::text, 'none') || ' → ' || NEW.stage::text);
  END IF;

  RETURN NEW;
END;
$function$;