DROP POLICY IF EXISTS "allowlist read own" ON public.admin_allowlist;
CREATE POLICY "allowlist read own" ON public.admin_allowlist FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));