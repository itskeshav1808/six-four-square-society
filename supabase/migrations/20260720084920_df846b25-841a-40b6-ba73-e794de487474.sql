
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','volunteer');
CREATE TYPE public.tournament_status AS ENUM ('draft','published','ongoing','completed','cancelled');
CREATE TYPE public.registration_status AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending','verified','failed','refunded');
CREATE TYPE public.payment_method AS ENUM ('dummy_gateway','manual_proof','cash','free');
CREATE TYPE public.checkin_status AS ENUM ('not_checked_in','checked_in');
CREATE TYPE public.volunteer_task_status AS ENUM ('pending','in_progress','completed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL, full_name TEXT, phone TEXT, avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid()=id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid()=id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid()=id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.admin_allowlist (
  email TEXT PRIMARY KEY, added_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allowlist read own" ON public.admin_allowlist FOR SELECT TO authenticated
  USING (email = (SELECT lower(email) FROM auth.users WHERE id=auth.uid()));

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role);
$$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id,'admin');
$$;

CREATE POLICY "admin manage allowlist" ON public.admin_allowlist FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id,email,full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email)=lower(NEW.email)) THEN
    INSERT INTO public.user_roles(user_id,role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT,
  venue TEXT, city TEXT, start_date DATE NOT NULL, end_date DATE, registration_deadline DATE,
  entry_fee NUMERIC(10,2) DEFAULT 0, prize_pool NUMERIC(12,2) DEFAULT 0,
  total_rounds INT DEFAULT 7, time_control TEXT, rules TEXT, prize_structure TEXT, cover_image_url TEXT,
  status public.tournament_status NOT NULL DEFAULT 'draft', is_featured BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tournaments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tournaments" ON public.tournaments FOR SELECT
  USING (status IN ('published','ongoing','completed') OR public.is_admin(auth.uid()));
CREATE POLICY "admin write tournaments" ON public.tournaments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_tournaments_updated BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tournament_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL, age_min INT, age_max INT, entry_fee NUMERIC(10,2) DEFAULT 0, max_participants INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tournament_categories(tournament_id);
GRANT SELECT ON public.tournament_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournament_categories TO authenticated;
GRANT ALL ON public.tournament_categories TO service_role;
ALTER TABLE public.tournament_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read categories" ON public.tournament_categories FOR SELECT USING (true);
CREATE POLICY "admin write categories" ON public.tournament_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL, dob DATE, gender TEXT, city TEXT, state TEXT, school TEXT,
  phone TEXT, email TEXT, parent_name TEXT, parent_phone TEXT,
  fide_id TEXT, cda_id TEXT, rating INT DEFAULT 0, emergency_contact TEXT, avatar_url TEXT, slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.players(email);
GRANT SELECT ON public.players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT INSERT ON public.players TO anon;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "self or admin update player" ON public.players FOR UPDATE TO authenticated
  USING (user_id=auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id=auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "anyone insert player" ON public.players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin delete player" ON public.players FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_players_updated BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.tournament_categories(id) ON DELETE SET NULL,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status public.registration_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  payment_method public.payment_method, amount NUMERIC(10,2) DEFAULT 0,
  dummy_order_id TEXT, dummy_payment_id TEXT,
  proof_url TEXT, proof_notes TEXT,
  qr_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  checkin_status public.checkin_status NOT NULL DEFAULT 'not_checked_in',
  checked_in_at TIMESTAMPTZ, checked_in_by UUID REFERENCES auth.users(id),
  notes TEXT, approved_by UUID REFERENCES auth.users(id), approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);
CREATE INDEX ON public.registrations(tournament_id);
CREATE INDEX ON public.registrations(qr_token);
GRANT SELECT ON public.registrations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT INSERT ON public.registrations TO anon;
GRANT ALL ON public.registrations TO service_role;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read regs" ON public.registrations FOR SELECT
  USING (status='approved' OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'volunteer')
         OR EXISTS (SELECT 1 FROM public.players p WHERE p.id=player_id AND p.user_id=auth.uid()));
CREATE POLICY "anyone insert reg" ON public.registrations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin or volunteer update reg" ON public.registrations FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'volunteer'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'volunteer'));
CREATE POLICY "admin delete reg" ON public.registrations FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INT NOT NULL, start_time TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT false, is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (tournament_id, round_number)
);
GRANT SELECT ON public.rounds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rounds TO authenticated;
GRANT ALL ON public.rounds TO service_role;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read rounds" ON public.rounds FOR SELECT USING (is_published OR public.is_admin(auth.uid()));
CREATE POLICY "admin write rounds" ON public.rounds FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  board_number INT,
  white_player_id UUID REFERENCES public.players(id),
  black_player_id UUID REFERENCES public.players(id),
  result TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pairings(round_id);
GRANT SELECT ON public.pairings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pairings TO authenticated;
GRANT ALL ON public.pairings TO service_role;
ALTER TABLE public.pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pairings" ON public.pairings FOR SELECT USING (true);
CREATE POLICY "admin write pairings" ON public.pairings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rank INT, points NUMERIC(4,1) DEFAULT 0, tiebreak NUMERIC(6,2) DEFAULT 0, games_played INT DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (tournament_id, player_id)
);
GRANT SELECT ON public.standings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.standings TO authenticated;
GRANT ALL ON public.standings TO service_role;
ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read standings" ON public.standings FOR SELECT USING (true);
CREATE POLICY "admin write standings" ON public.standings FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id),
  amount NUMERIC(10,2) NOT NULL,
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'pending',
  reference TEXT, proof_url TEXT,
  verified_by UUID REFERENCES auth.users(id), verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT INSERT ON public.payments TO anon;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read payments" ON public.payments FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "anyone insert payment" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin update payment" ON public.payments FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  category TEXT NOT NULL, description TEXT, amount NUMERIC(12,2) NOT NULL,
  incurred_on DATE DEFAULT CURRENT_DATE, created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, tier TEXT, logo_url TEXT, website_url TEXT,
  contribution NUMERIC(12,2) DEFAULT 0,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true, display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read sponsors" ON public.sponsors FOR SELECT USING (is_active=true OR public.is_admin(auth.uid()));
CREATE POLICY "admin write sponsors" ON public.sponsors FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, category TEXT, quantity INT DEFAULT 0, condition TEXT DEFAULT 'good',
  location TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin inventory" ON public.inventory_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_inv_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  change INT NOT NULL, reason TEXT,
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.inventory_logs TO authenticated;
GRANT ALL ON public.inventory_logs TO service_role;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin inventory logs" ON public.inventory_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cert_type TEXT NOT NULL, title TEXT NOT NULL, recipient_name TEXT NOT NULL,
  details TEXT, pdf_url TEXT, issued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.certificates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read certificates" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "admin write certificates" ON public.certificates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  album TEXT, url TEXT NOT NULL, caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_assets TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read media" ON public.media_assets FOR SELECT USING (true);
CREATE POLICY "admin write media" ON public.media_assets FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.volunteers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, role_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all volunteers" ON public.volunteers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "volunteer read self" ON public.volunteers FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.volunteer_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.volunteers(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, duty TEXT,
  reporting_time TIMESTAMPTZ, location TEXT,
  status public.volunteer_task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.volunteer_tasks(volunteer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_tasks TO authenticated;
GRANT ALL ON public.volunteer_tasks TO service_role;
ALTER TABLE public.volunteer_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin all tasks" ON public.volunteer_tasks FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "vol read own tasks" ON public.volunteer_tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id=volunteer_id AND v.user_id=auth.uid()));
CREATE POLICY "vol update own tasks" ON public.volunteer_tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id=volunteer_id AND v.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.volunteers v WHERE v.id=volunteer_id AND v.user_id=auth.uid()));
CREATE TRIGGER trg_task_updated BEFORE UPDATE ON public.volunteer_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'public',
  title TEXT NOT NULL, body TEXT,
  created_by UUID REFERENCES auth.users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read announcements" ON public.announcements FOR SELECT
  USING (audience='public' OR public.is_admin(auth.uid())
         OR (audience='volunteers' AND public.has_role(auth.uid(),'volunteer'))
         OR (audience='players' AND auth.uid() IS NOT NULL));
CREATE POLICY "admin write announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id), actor_email TEXT,
  action TEXT NOT NULL, entity_type TEXT, entity_id TEXT, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read audit" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "auth insert audit" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id=auth.uid());

CREATE TABLE public.site_content (
  key TEXT PRIMARY KEY, title TEXT, body TEXT,
  updated_by UUID REFERENCES auth.users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "admin write site content" ON public.site_content FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.standings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pairings;

INSERT INTO public.admin_allowlist(email) VALUES ('64squaressociety@gmail.com') ON CONFLICT DO NOTHING;

INSERT INTO public.site_content(key,title,body) VALUES
('about','About 64 Squares Society',E'64 Squares Society is a chess community dedicated to nurturing talent and celebrating the timeless game of chess. We organize tournaments across age groups and skill levels, where every move matters.\n\nOur mission is simple: create meaningful playing opportunities, foster sportsmanship, and grow the chess ecosystem in our region.'),
('rules','Tournament Rules',E'• FIDE Laws of Chess apply.\n• Swiss format with standard time control unless otherwise specified.\n• Players must report 15 minutes before each round.\n• Zero-tolerance policy for late arrival at Round 1.\n• Electronic devices are not permitted at boards.\n• Decisions of the Chief Arbiter are final.'),
('prize','Prize Structure',E'Prizes vary by tournament — see each event page for the exact breakdown.\n\nTypical structure:\n• Winner: 35% of the pool + trophy + certificate\n• Runner-up: 20% of the pool + trophy + certificate\n• 3rd place: 12% of the pool + trophy + certificate\n• Top 10 finishers: cash prizes + certificates\n• Category prizes: Best U-8, U-10, U-12, U-14, U-16, U-18, Girls, Veterans'),
('contact','Contact Us',E'Email: 64squaressociety@gmail.com\nPhone: +91-XXXXXXXXXX\n\nFor tournament queries, sponsorships, or partnerships, please reach out.'),
('home_hero_title','Every Move Matters',NULL),
('home_hero_subtitle','Premier chess tournaments by 64 Squares Society',NULL);

INSERT INTO public.tournaments(slug,name,description,venue,city,start_date,end_date,registration_deadline,entry_fee,prize_pool,total_rounds,time_control,status,is_featured)
VALUES ('inaugural-open-2026','64 Squares Inaugural Open 2026','Our flagship rated open tournament welcoming players of all ratings. Nine rounds of Swiss competition with generous prizes.','Grand Chess Hall','Mumbai','2026-09-15','2026-09-17','2026-09-10',500,50000,9,'60 min + 30 sec increment','published',true);

INSERT INTO public.tournament_categories(tournament_id,name,age_min,age_max,entry_fee)
SELECT id,'Open',NULL::INT,NULL::INT,500 FROM public.tournaments WHERE slug='inaugural-open-2026'
UNION ALL
SELECT id,'Under 12',NULL::INT,12,300 FROM public.tournaments WHERE slug='inaugural-open-2026'
UNION ALL
SELECT id,'Under 16',NULL::INT,16,400 FROM public.tournaments WHERE slug='inaugural-open-2026';
