CREATE OR REPLACE FUNCTION public.player_already_registered(
  _tournament_id uuid,
  _full_name text,
  _category_id uuid DEFAULT NULL,
  _dob date DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registrations r
    JOIN public.players p ON p.id = r.player_id
    WHERE r.tournament_id = _tournament_id
      AND r.status <> 'cancelled'
      AND lower(btrim(p.full_name)) = lower(btrim(_full_name))
      AND (
        (_category_id IS NOT NULL AND r.category_id = _category_id)
        OR (_dob IS NOT NULL AND p.dob = _dob)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.player_already_registered(uuid, text, uuid, date) TO anon, authenticated, service_role;