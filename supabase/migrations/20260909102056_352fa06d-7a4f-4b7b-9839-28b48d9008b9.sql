-- Remove the guarded views (replaced by a proper private table)
DROP VIEW IF EXISTS public.player_contacts;
DROP VIEW IF EXISTS public.registrations_staff;

-- 1. Private contact table
CREATE TABLE public.player_private (
  player_id uuid PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
  email text,
  phone text,
  dob date,
  parent_name text,
  parent_phone text,
  emergency_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_private TO authenticated;
GRANT INSERT ON public.player_private TO anon;
GRANT ALL ON public.player_private TO service_role;

ALTER TABLE public.player_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff or self read private" ON public.player_private FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'volunteer')
  OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_private.player_id AND p.user_id = auth.uid())
);
CREATE POLICY "anyone insert private" ON public.player_private FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "staff or self update private" ON public.player_private FOR UPDATE TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_private.player_id AND p.user_id = auth.uid())
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_private.player_id AND p.user_id = auth.uid())
);
CREATE POLICY "admin delete private" ON public.player_private FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_player_private_updated BEFORE UPDATE ON public.player_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Migrate existing data, then drop the sensitive columns from players
INSERT INTO public.player_private (player_id, email, phone, dob, parent_name, parent_phone, emergency_contact)
SELECT id, email, phone, dob, parent_name, parent_phone, emergency_contact FROM public.players
ON CONFLICT (player_id) DO NOTHING;

-- Recreate duplicate-check helpers against the new table before dropping columns
CREATE OR REPLACE FUNCTION public.phone_already_registered(_phone text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.player_private pp ON pp.player_id = r.player_id
    WHERE regexp_replace(coalesce(pp.phone,''), '\D', '', 'g') ILIKE '%' || regexp_replace(_phone, '\D', '', 'g')
      AND regexp_replace(_phone, '\D', '', 'g') <> ''
      AND r.status <> 'cancelled'
  );
$$;

CREATE OR REPLACE FUNCTION public.player_already_registered(_tournament_id uuid, _full_name text, _category_id uuid DEFAULT NULL, _dob date DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.players p ON p.id = r.player_id
    LEFT JOIN public.player_private pp ON pp.player_id = p.id
    WHERE r.tournament_id = _tournament_id
      AND r.status <> 'cancelled'
      AND lower(btrim(p.full_name)) = lower(btrim(_full_name))
      AND (
        (_category_id IS NOT NULL AND r.category_id = _category_id)
        OR (_dob IS NOT NULL AND pp.dob = _dob)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_registration_receipt(_id uuid)
RETURNS TABLE (
  id uuid, status registration_status, payment_status payment_status, payment_method payment_method,
  amount numeric, qr_token text, checkin_status checkin_status, created_at timestamptz,
  tournament_name text, tournament_start date, tournament_venue text,
  player_name text, player_email text, player_phone text, player_avatar text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.status, r.payment_status, r.payment_method, r.amount, r.qr_token, r.checkin_status, r.created_at,
         t.name, t.start_date, t.venue, p.full_name, pp.email, pp.phone, p.avatar_url
  FROM public.registrations r
  LEFT JOIN public.tournaments t ON t.id = r.tournament_id
  LEFT JOIN public.players p ON p.id = r.player_id
  LEFT JOIN public.player_private pp ON pp.player_id = p.id
  WHERE r.id = _id;
$$;

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
  IF NEW.rating IS NOT NULL AND (NEW.rating < 0 OR NEW.rating > 3500) THEN
    RAISE EXCEPTION 'Invalid rating';
  END IF;
  NEW.user_id := CASE WHEN auth.uid() IS NULL THEN NULL ELSE NEW.user_id END;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.guard_player_private_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_user IN ('service_role','postgres','supabase_admin') OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.email IS NOT NULL AND (length(NEW.email) > 254 OR NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  IF NEW.phone IS NOT NULL AND length(regexp_replace(NEW.phone, '\D', '', 'g')) NOT BETWEEN 10 AND 15 THEN
    RAISE EXCEPTION 'Please enter a valid phone number';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_player_private_insert ON public.player_private;
CREATE TRIGGER trg_guard_player_private_insert BEFORE INSERT ON public.player_private
FOR EACH ROW EXECUTE FUNCTION public.guard_player_private_insert();

ALTER TABLE public.players
  DROP COLUMN email,
  DROP COLUMN phone,
  DROP COLUMN dob,
  DROP COLUMN parent_name,
  DROP COLUMN parent_phone,
  DROP COLUMN emergency_contact;

-- 3. Players: restore normal full-table read (nothing sensitive is left)
REVOKE SELECT ON public.players FROM anon, authenticated;
GRANT SELECT ON public.players TO anon, authenticated, service_role;

-- 4. Registrations: anon sees only basic columns, staff/self see everything
REVOKE SELECT ON public.registrations FROM authenticated;
GRANT SELECT ON public.registrations TO authenticated;

DROP POLICY IF EXISTS "read basic regs" ON public.registrations;
CREATE POLICY "public read basic regs" ON public.registrations FOR SELECT TO anon
USING (status = ANY (ARRAY['approved'::registration_status, 'pending'::registration_status]));
CREATE POLICY "staff or self read regs" ON public.registrations FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'volunteer')
  OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = registrations.player_id AND p.user_id = auth.uid())
);