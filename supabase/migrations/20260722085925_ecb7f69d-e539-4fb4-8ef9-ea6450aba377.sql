-- 1) Allow reading pending regs too (still row-level; id is an unguessable UUID)
DROP POLICY IF EXISTS "read regs" ON public.registrations;
CREATE POLICY "read regs" ON public.registrations FOR SELECT
USING (
  status IN ('approved','pending')
  OR public.is_admin(auth.uid())
  OR public.has_role(auth.uid(),'volunteer')
  OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = registrations.player_id AND p.user_id = auth.uid())
);

-- 2) Terms acceptance
ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

-- 3) Certificate storage + QR
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS qr_target_url text;

-- 4) Optional custom puzzles table (admin-managed, otherwise Lichess API is used)
CREATE TABLE IF NOT EXISTS public.puzzles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fen text NOT NULL,
  solution text NOT NULL,
  side_to_move text NOT NULL DEFAULT 'white',
  hint text,
  source text DEFAULT 'custom',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.puzzles TO anon, authenticated;
GRANT ALL ON public.puzzles TO service_role;
ALTER TABLE public.puzzles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "puzzles public read" ON public.puzzles;
CREATE POLICY "puzzles public read" ON public.puzzles FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "puzzles admin write" ON public.puzzles;
CREATE POLICY "puzzles admin write" ON public.puzzles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));