ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'dark';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_theme_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_theme_check CHECK (theme IN ('dark', 'light'));
  END IF;
END $$;

CREATE POLICY "Users create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_roles_user_id_role_key'
      AND conrelid = 'public.user_roles'::regclass
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;

CREATE POLICY "Users create own basic role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK ((auth.uid() = user_id) AND (role = 'user'::app_role));