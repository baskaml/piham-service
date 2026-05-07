-- =========================================================
-- 1. ENUMS
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.quote_status AS ENUM ('pending', 'approved', 'rejected');

-- =========================================================
-- 2. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 3. USER ROLES (separate table — security best practice)
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function — avoids RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- 4. QUOTE REQUESTS
-- =========================================================
CREATE TABLE public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  budget TEXT,
  status public.quote_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_requests_user ON public.quote_requests(user_id);
CREATE INDEX idx_quote_requests_status ON public.quote_requests(status);

-- =========================================================
-- 5. QUOTE FILES
-- =========================================================
CREATE TABLE public.quote_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quote_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quote_files_quote ON public.quote_files(quote_id);

-- =========================================================
-- 6. SITE CONTENT (CMS)
-- =========================================================
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'html')),
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 7. ADMIN LOGS
-- =========================================================
CREATE TABLE public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_admin_logs_admin ON public.admin_logs(admin_id);

-- =========================================================
-- 8. updated_at TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_content_updated BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 9. AUTO-CREATE PROFILE + DEFAULT ROLE ON SIGNUP
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 10. RLS POLICIES
-- =========================================================
-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- quote_requests
CREATE POLICY "Users view own quotes" ON public.quote_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all quotes" ON public.quote_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own quotes" ON public.quote_requests
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_blocked = true)
  );
CREATE POLICY "Users update own pending quotes" ON public.quote_requests
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update all quotes" ON public.quote_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete quotes" ON public.quote_requests
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- quote_files
CREATE POLICY "Users view own files" ON public.quote_files
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all files" ON public.quote_files
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users add own files" ON public.quote_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own files" ON public.quote_files
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins delete files" ON public.quote_files
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- site_content (public read, admin write)
CREATE POLICY "Public read site content" ON public.site_content
  FOR SELECT USING (true);
CREATE POLICY "Admins manage content" ON public.site_content
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- admin_logs
CREATE POLICY "Admins view logs" ON public.admin_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins create logs" ON public.admin_logs
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- =========================================================
-- 11. STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-files', 'quote-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (path layout: {user_id}/{quote_id}/{filename})
CREATE POLICY "Users read own quote files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins read all quote files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'quote-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users upload own quote files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own quote files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quote-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins delete any quote files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'quote-files' AND public.has_role(auth.uid(), 'admin'));