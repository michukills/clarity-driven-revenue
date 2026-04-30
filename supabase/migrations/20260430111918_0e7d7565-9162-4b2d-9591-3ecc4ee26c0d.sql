-- Fix: public.* security helper wrappers must be SECURITY DEFINER so RLS
-- policies that call them can resolve through to private.* without requiring
-- end-users to have USAGE on the private schema.
-- Symptom before fix: many admin queries returned 403 with
--   {"code":"42501","message":"permission denied for schema private"}
-- including the RGS Business Control Center initialization, which surfaced as
-- "RGS internal record could not be initialized. Contact engineering."

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.is_admin(_user_id) $function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.has_role(_user_id, _role) $function$;

CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.is_platform_owner(_user_id) $function$;

CREATE OR REPLACE FUNCTION public.user_owns_customer(_user_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.user_owns_customer(_user_id, _customer_id) $function$;

CREATE OR REPLACE FUNCTION public.user_has_resource_assignment(_user_id uuid, _resource_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.user_has_resource_assignment(_user_id, _resource_id) $function$;

CREATE OR REPLACE FUNCTION public.resource_visibility_for(_resource_id uuid)
RETURNS resource_visibility
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$ SELECT private.resource_visibility_for(_resource_id) $function$;