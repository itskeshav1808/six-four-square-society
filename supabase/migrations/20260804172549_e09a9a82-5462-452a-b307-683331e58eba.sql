ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storage_path text;

CREATE INDEX IF NOT EXISTS idx_players_phone ON public.players (phone);

CREATE OR REPLACE FUNCTION public.phone_already_registered(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.players p ON p.id = r.player_id
    WHERE regexp_replace(coalesce(p.phone,''), '\D', '', 'g') ILIKE '%' || regexp_replace(_phone, '\D', '', 'g')
      AND regexp_replace(_phone, '\D', '', 'g') <> ''
      AND r.status <> 'cancelled'
  );
$$;

GRANT EXECUTE ON FUNCTION public.phone_already_registered(text) TO anon, authenticated;