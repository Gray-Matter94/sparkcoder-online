
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Admins read all feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins update feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins read feedback screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Admins read all feedback screenshots" ON storage.objects;

DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;

CREATE POLICY "Admins read all feedback" ON public.feedback
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update feedback" ON public.feedback
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read all feedback screenshots" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'feedback-screenshots' AND private.has_role(auth.uid(), 'admin'));
