
ALTER TABLE public.quote_requests ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users create own quotes" ON public.quote_requests;

CREATE POLICY "Anyone can create quote requests"
ON public.quote_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL)
  OR (
    auth.uid() = user_id
    AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.is_blocked = true)
  )
);
