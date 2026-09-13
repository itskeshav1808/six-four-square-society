-- Player usernames, account-linked entry batches, and unpaid draft expiry.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND length(btrim(username)) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone)
  WHERE phone IS NOT NULL AND length(btrim(phone)) > 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'username', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    username = COALESCE(public.profiles.username, EXCLUDED.username),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email)=lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE IF NOT EXISTS public.entry_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid', 'expired')),
  discount_applied boolean NOT NULL DEFAULT false,
  discount_per_entry numeric(10,2) NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  dummy_payment_id text,
  proof_url text,
  payment_method public.payment_method,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entry_batches_user_status_idx ON public.entry_batches (user_id, status);
CREATE INDEX IF NOT EXISTS entry_batches_tournament_idx ON public.entry_batches (tournament_id);

GRANT SELECT ON public.entry_batches TO authenticated;
GRANT ALL ON public.entry_batches TO service_role;
ALTER TABLE public.entry_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own batches read" ON public.entry_batches FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_entry_batches_updated BEFORE UPDATE ON public.entry_batches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.entry_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS registrations_batch_id_idx ON public.registrations (batch_id);
CREATE INDEX IF NOT EXISTS registrations_created_by_idx ON public.registrations (created_by);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.entry_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payments_batch_id_idx ON public.payments (batch_id);

CREATE OR REPLACE FUNCTION public.expire_draft_batches()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.registrations r
  SET status = 'cancelled', is_draft = false, updated_at = now()
  FROM public.entry_batches b
  WHERE r.batch_id = b.id
    AND b.status = 'draft'
    AND b.expires_at < now()
    AND r.is_draft = true;

  UPDATE public.entry_batches
  SET status = 'expired', updated_at = now()
  WHERE status = 'draft' AND expires_at < now();

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

GRANT EXECUTE ON FUNCTION public.expire_draft_batches() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.phone_already_registered(_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.player_private pp ON pp.player_id = r.player_id
    WHERE regexp_replace(coalesce(pp.phone,''), '\D', '', 'g') ILIKE '%' || regexp_replace(_phone, '\D', '', 'g')
      AND regexp_replace(_phone, '\D', '', 'g') <> ''
      AND r.status <> 'cancelled'
      AND coalesce(r.is_draft, false) = false
  );
$$;

INSERT INTO public.site_content (key, title, body)
VALUES (
  'draft_batch_expiry_days',
  '7',
  'Unpaid draft entries are cleared after this many days. Change the title to another whole number.'
)
ON CONFLICT (key) DO NOTHING;
