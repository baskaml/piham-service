UPDATE auth.users SET email_confirmed_at = now() WHERE id = '977b6d17-e9fb-4ee9-8529-f8afc490c58d' AND email_confirmed_at IS NULL;

INSERT INTO public.user_roles (user_id, role)
VALUES ('977b6d17-e9fb-4ee9-8529-f8afc490c58d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;