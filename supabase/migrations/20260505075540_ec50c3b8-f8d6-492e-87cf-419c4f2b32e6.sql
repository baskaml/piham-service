
INSERT INTO public.user_roles (user_id, role) 
VALUES ('04897fa0-bdec-477d-9819-bca2e5131564', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE auth.users 
SET encrypted_password = crypt('T9$k!vQ2@Lx#7mPz_4R!aW8', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'zx.piham_47@gmail.com';
