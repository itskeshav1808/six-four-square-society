-- 1. PLAYERS: column-level lockdown for public reads
REVOKE SELECT ON public.players FROM anon, authenticated;
GRANT SELECT (id, full_name, gender, city, state, school, fide_id, cda_id, rating, avatar_url, slug, created_at, updated_at) ON public.players TO anon, authenticated;
GRANT SELECT ON public.players TO service_role;

-- staff/self-only view for contact details
CREATE OR REPLACE VIEW public.player_contacts AS
SELECT p.id, p.full_name, p.email, p.phone, p.dob, p.parent_name, p.parent_phone, p.emergency_contact, p.user_id
FROM public.players p
WHERE public.is_admin(auth.uid())
   OR public.has_role(auth.uid(), 'volunteer')
   OR p.user_id = auth.uid();
GRANT SELECT ON public.player_contacts TO authenticated;

-- 2. REGISTRATIONS: column-level lockdown + staff view
REVOKE SELECT ON public.registrations FROM anon, authenticated;
GRANT SELECT (id, tournament_id, category_id, player_id, status, checkin_status, checked_in_at, created_at, updated_at) ON public.registrations TO anon, authenticated;
GRANT SELECT ON public.registrations TO service_role;

DROP POLICY IF EXISTS "read regs" ON public.registrations;
CREATE POLICY "read basic regs" ON public.registrations FOR SELECT TO anon, authenticated
USING (status = ANY (ARRAY['approved'::registration_status, 'pending'::registration_status])
       OR public.is_admin(auth.uid())
       OR public.has_role(auth.uid(), 'volunteer'));

CREATE OR REPLACE VIEW public.registrations_staff AS
SELECT r.* FROM public.registrations r
WHERE public.is_admin(auth.uid())
   OR public.has_role(auth.uid(), 'volunteer')
   OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = r.player_id AND p.user_id = auth.uid());
GRANT SELECT ON public.registrations_staff TO authenticated;

-- 3. CERTIFICATES: staff only
DROP POLICY IF EXISTS "public read certificates" ON public.certificates;
CREATE POLICY "staff read certificates" ON public.certificates FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'volunteer'));
REVOKE SELECT ON public.certificates FROM anon;

-- 4. Safe lookups for the confirmation page and QR check-in page
CREATE OR REPLACE FUNCTION public.get_registration_receipt(_id uuid)
RETURNS TABLE (
  id uuid, status registration_status, payment_status payment_status, payment_method payment_method,
  amount numeric, qr_token text, checkin_status checkin_status, created_at timestamptz,
  tournament_name text, tournament_start date, tournament_venue text,
  player_name text, player_email text, player_phone text, player_avatar text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.status, r.payment_status, r.payment_method, r.amount, r.qr_token, r.checkin_status, r.created_at,
         t.name, t.start_date, t.venue, p.full_name, p.email, p.phone, p.avatar_url
  FROM public.registrations r
  LEFT JOIN public.tournaments t ON t.id = r.tournament_id
  LEFT JOIN public.players p ON p.id = r.player_id
  WHERE r.id = _id;
$$;
GRANT EXECUTE ON FUNCTION public.get_registration_receipt(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.checkin_lookup(_token text)
RETURNS TABLE (
  id uuid, checkin_status checkin_status, status registration_status,
  tournament_name text, player_name text, player_city text, player_avatar text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.checkin_status, r.status, t.name, p.full_name, p.city, p.avatar_url
  FROM public.registrations r
  LEFT JOIN public.tournaments t ON t.id = r.tournament_id
  LEFT JOIN public.players p ON p.id = r.player_id
  WHERE r.qr_token = _token;
$$;
GRANT EXECUTE ON FUNCTION public.checkin_lookup(text) TO anon, authenticated;

-- 5. Abuse guards on public inserts
CREATE OR REPLACE FUNCTION public.guard_registration_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tournaments;
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  SELECT * INTO t FROM public.tournaments WHERE id = NEW.tournament_id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Unknown tournament'; END IF;
  IF t.status NOT IN ('published','ongoing') THEN RAISE EXCEPTION 'Registrations are not open for this tournament'; END IF;
  IF t.registration_deadline IS NOT NULL AND t.registration_deadline < current_date THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  NEW.status := 'pending';
  NEW.payment_status := 'pending';
  NEW.approved_by := NULL;
  NEW.approved_at := NULL;
  NEW.checkin_status := 'not_checked_in';
  NEW.checked_in_at := NULL;
  NEW.checked_in_by := NULL;
  IF NEW.amount IS NOT NULL AND (NEW.amount < 0 OR NEW.amount > 100000) THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_reg_insert ON public.registrations;
CREATE TRIGGER trg_guard_reg_insert BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.guard_registration_insert();

CREATE OR REPLACE FUNCTION public.guard_payment_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reg_amount numeric;
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.registration_id IS NULL AND NEW.group_id IS NULL THEN
    RAISE EXCEPTION 'Payment must belong to a registration or group';
  END IF;
  IF NEW.registration_id IS NOT NULL THEN
    SELECT amount INTO reg_amount FROM public.registrations WHERE id = NEW.registration_id;
    IF reg_amount IS NULL THEN RAISE EXCEPTION 'Unknown registration'; END IF;
    IF NEW.amount <> reg_amount THEN RAISE EXCEPTION 'Payment amount does not match the registration'; END IF;
  END IF;
  NEW.status := 'pending';
  NEW.verified_by := NULL;
  NEW.verified_at := NULL;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_payment_insert ON public.payments;
CREATE TRIGGER trg_guard_payment_insert BEFORE INSERT ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.guard_payment_insert();

CREATE OR REPLACE FUNCTION public.guard_player_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  NEW.full_name := btrim(NEW.full_name);
  IF length(NEW.full_name) < 2 OR length(NEW.full_name) > 80 THEN
    RAISE EXCEPTION 'Please enter a valid full name';
  END IF;
  IF NEW.email IS NOT NULL AND (length(NEW.email) > 254 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF NEW.phone IS NOT NULL AND length(regexp_replace(NEW.phone, '\D', '', 'g')) NOT BETWEEN 10 AND 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number';
  END IF;
  IF NEW.rating IS NOT NULL AND (NEW.rating < 0 OR NEW.rating > 3500) THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  NEW.user_id := CASE WHEN auth.uid() IS NULL THEN NULL ELSE NEW.user_id END;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_player_insert ON public.players;
CREATE TRIGGER trg_guard_player_insert BEFORE INSERT ON public.players
FOR EACH ROW EXECUTE FUNCTION public.guard_player_insert();