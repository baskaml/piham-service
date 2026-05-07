
-- Public bucket for site assets (logo, banner, images)
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read site-assets" ON storage.objects;
CREATE POLICY "Public read site-assets" ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

-- Admins write
DROP POLICY IF EXISTS "Admins upload site-assets" ON storage.objects;
CREATE POLICY "Admins upload site-assets" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update site-assets" ON storage.objects;
CREATE POLICY "Admins update site-assets" ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete site-assets" ON storage.objects;
CREATE POLICY "Admins delete site-assets" ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

-- Seed editable content keys (idempotent)
INSERT INTO public.site_content (key, type, value, description) VALUES
  ('brand.logo_url', 'image', '', 'URL du logo affiché dans la navigation (laisser vide pour l''icône par défaut)'),
  ('brand.name', 'text', 'PIHAM', 'Nom court affiché à côté du logo'),
  ('brand.tagline', 'text', 'Info Services', 'Sous-titre affiché sous le nom'),
  ('banner.message', 'text', '', 'Bannière défilante en haut du site (laisser vide pour la masquer)'),
  ('banner.enabled', 'text', 'false', 'Afficher la bannière défilante (true/false)')
ON CONFLICT (key) DO NOTHING;
