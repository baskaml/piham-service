CREATE TABLE IF NOT EXISTS public.saved_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_slug text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_slug)
);

ALTER TABLE public.saved_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved services"
ON public.saved_services
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users save own services"
ON public.saved_services
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove own saved services"
ON public.saved_services
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view saved services"
ON public.saved_services
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_saved_services_user_id
ON public.saved_services (user_id);

CREATE INDEX IF NOT EXISTS idx_saved_services_service_slug
ON public.saved_services (service_slug);