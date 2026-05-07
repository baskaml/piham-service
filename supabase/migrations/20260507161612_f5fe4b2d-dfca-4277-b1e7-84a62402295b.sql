
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'super_admin');
CREATE TYPE public.quote_status AS ENUM ('pending', 'approved', 'rejected', 'in_progress', 'quoted');
CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, phone TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER_ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

-- QUOTE_REQUESTS
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL,
  budget TEXT,
  status public.quote_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_requests_user ON public.quote_requests(user_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);

-- QUOTE_FILES
CREATE TABLE public.quote_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, file_name TEXT NOT NULL,
  mime_type TEXT, size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_files_quote ON public.quote_files(quote_id);

-- SITE_CONTENT
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('text','image','video','html')),
  value TEXT NOT NULL, description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- ADMIN_LOGS
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, target_type TEXT, target_id TEXT, details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_admin_logs_admin ON public.admin_logs(admin_id);

-- PAGES
CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE, title text NOT NULL,
  content text NOT NULL DEFAULT '', image_url text,
  published boolean NOT NULL DEFAULT true, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, display_name TEXT NOT NULL,
  rating SMALLINT NOT NULL, comment TEXT NOT NULL,
  status public.review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT reviews_comment_len CHECK (char_length(comment) BETWEEN 5 AND 1000),
  CONSTRAINT reviews_name_len CHECK (char_length(display_name) BETWEEN 2 AND 80)
);
CREATE INDEX idx_reviews_status_created ON public.reviews (status, created_at DESC);
CREATE INDEX idx_reviews_user ON public.reviews (user_id);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- SAVED_SERVICES
CREATE TABLE public.saved_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  service_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_slug)
);
ALTER TABLE public.saved_services ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saved_services_user_id ON public.saved_services (user_id);
CREATE INDEX idx_saved_services_service_slug ON public.saved_services (service_slug);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_content_updated BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER pages_set_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTO-PROMOTE SUPER_ADMIN ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_email CONSTANT TEXT := 'zx.piham_47@gmail.com';
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;

  IF LOWER(NEW.email) = LOWER(admin_email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin'), (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own basic role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id) AND (role = 'user'::app_role));

CREATE POLICY "Users view own quotes" ON public.quote_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all quotes" ON public.quote_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create quote requests" ON public.quote_requests FOR INSERT TO anon, authenticated WITH CHECK (
  (user_id IS NULL) OR (
    auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_blocked = true)
  )
);
CREATE POLICY "Users update own pending quotes" ON public.quote_requests FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update all quotes" ON public.quote_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete quotes" ON public.quote_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own files" ON public.quote_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all files" ON public.quote_files FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users add own files" ON public.quote_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own files" ON public.quote_files FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins delete files" ON public.quote_files FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins view logs" ON public.admin_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create logs" ON public.admin_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

CREATE POLICY "Public read published pages" ON public.pages FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pages" ON public.pages FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public read approved reviews" ON public.reviews FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users create own reviews" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = user_id AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_blocked = true)
);
CREATE POLICY "Users update own pending reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all reviews" ON public.reviews FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own saved services" ON public.saved_services FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users save own services" ON public.saved_services FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own saved services" ON public.saved_services FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view saved services" ON public.saved_services FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('quote-files','quote-files',false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets','site-assets',true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own quote files" ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all quote files" ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users upload own quote files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own quote files" ON storage.objects FOR DELETE
  USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins delete any quote files" ON storage.objects FOR DELETE
  USING (bucket_id = 'quote-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins upload site-assets" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update site-assets" ON storage.objects FOR UPDATE
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete site-assets" ON storage.objects FOR DELETE
  USING (bucket_id = 'site-assets' AND public.has_role(auth.uid(), 'admin'));

REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

ALTER TABLE public.site_content REPLICA IDENTITY FULL;
ALTER TABLE public.pages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_content;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;

INSERT INTO public.site_content (key, type, value, description) VALUES
  ('brand.logo_url','image','','URL du logo'),
  ('brand.name','text','PIHAM','Nom court'),
  ('brand.tagline','text','Info Services','Sous-titre'),
  ('banner.message','text','','Bannière défilante'),
  ('banner.enabled','text','false','Afficher bannière')
ON CONFLICT (key) DO NOTHING;
