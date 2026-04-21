
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TYPE public.pipeline_stage AS ENUM (
  'lead',
  'discovery_scheduled',
  'diagnostic_in_progress',
  'diagnostic_delivered',
  'awaiting_decision',
  'implementation',
  'work_in_progress',
  'work_completed'
);

CREATE TYPE public.resource_category AS ENUM (
  'diagnostic_templates',
  'revenue_worksheets',
  'financial_visibility',
  'scorecards',
  'client_specific'
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer to avoid recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  business_name TEXT,
  business_description TEXT,
  phone TEXT,
  service_type TEXT,
  stage pipeline_stage NOT NULL DEFAULT 'lead',
  stage_position INT NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  monthly_revenue TEXT,
  goals TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ============ NOTES (admin-only internal notes) ============
CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- ============ RESOURCES (worksheets/files) ============
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category resource_category NOT NULL DEFAULT 'client_specific',
  resource_type TEXT NOT NULL DEFAULT 'link', -- 'link' | 'file' | 'sheet'
  url TEXT,
  file_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- ============ ASSIGNMENTS ============
CREATE TABLE public.resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(resource_id, customer_id)
);
ALTER TABLE public.resource_assignments ENABLE ROW LEVEL SECURITY;

-- ============ ACTIVITY LOG ============
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- customers
CREATE POLICY "Admins manage all customers" ON public.customers FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own record" ON public.customers FOR SELECT USING (auth.uid() = user_id);

-- customer_notes (admin-only)
CREATE POLICY "Admins manage notes" ON public.customer_notes FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- resources
CREATE POLICY "Admins manage resources" ON public.resources FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view assigned resources" ON public.resources FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.resource_assignments ra
    JOIN public.customers c ON c.id = ra.customer_id
    WHERE ra.resource_id = resources.id AND c.user_id = auth.uid()
  )
);

-- assignments
CREATE POLICY "Admins manage assignments" ON public.resource_assignments FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Customers view own assignments" ON public.resource_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = resource_assignments.customer_id AND c.user_id = auth.uid())
);

-- activity_log
CREATE POLICY "Admins view activity" ON public.activity_log FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins insert activity" ON public.activity_log FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Default new signups to customer role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER resources_touch BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('resources', 'resources', false);

CREATE POLICY "Admins read resource files" ON storage.objects FOR SELECT USING (
  bucket_id = 'resources' AND public.is_admin(auth.uid())
);
CREATE POLICY "Admins upload resource files" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'resources' AND public.is_admin(auth.uid())
);
CREATE POLICY "Admins update resource files" ON storage.objects FOR UPDATE USING (
  bucket_id = 'resources' AND public.is_admin(auth.uid())
);
CREATE POLICY "Admins delete resource files" ON storage.objects FOR DELETE USING (
  bucket_id = 'resources' AND public.is_admin(auth.uid())
);
CREATE POLICY "Customers read assigned files" ON storage.objects FOR SELECT USING (
  bucket_id = 'resources' AND EXISTS (
    SELECT 1 FROM public.resources r
    JOIN public.resource_assignments ra ON ra.resource_id = r.id
    JOIN public.customers c ON c.id = ra.customer_id
    WHERE r.file_path = storage.objects.name AND c.user_id = auth.uid()
  )
);
