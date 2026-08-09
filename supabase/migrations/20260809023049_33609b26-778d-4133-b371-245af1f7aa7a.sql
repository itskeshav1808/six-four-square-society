CREATE TABLE public.registration_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.tournament_categories(id) ON DELETE SET NULL,
  organizer_name text NOT NULL,
  organizer_email text NOT NULL,
  organizer_phone text NOT NULL,
  organizer_city text,
  group_size integer NOT NULL,
  base_fee numeric NOT NULL DEFAULT 0,
  discount_per_entry numeric NOT NULL DEFAULT 0,
  per_entry_price numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method NOT NULL DEFAULT 'dummy_gateway',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  dummy_payment_id text,
  proof_url text,
  notes text,
  manage_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  terms_accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_groups TO authenticated;
GRANT ALL ON public.registration_groups TO service_role;
ALTER TABLE public.registration_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage group bookings" ON public.registration_groups FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Volunteers read group bookings" ON public.registration_groups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'volunteer'));

CREATE TABLE public.registration_group_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.registration_groups(id) ON DELETE CASCADE,
  slot_number integer NOT NULL,
  player_name text,
  player_phone text,
  player_dob date,
  registration_id uuid REFERENCES public.registrations(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (group_id, slot_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_group_members TO authenticated;
GRANT ALL ON public.registration_group_members TO service_role;
ALTER TABLE public.registration_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage group members" ON public.registration_group_members FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Volunteers read group members" ON public.registration_group_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'volunteer'));

CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.registration_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_group_members_updated BEFORE UPDATE ON public.registration_group_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payments ADD COLUMN group_id uuid REFERENCES public.registration_groups(id) ON DELETE SET NULL;