import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const siteContentQuery = (key: string) =>
  queryOptions({
    queryKey: ["site_content", key],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*").eq("key", key).maybeSingle();
      return data;
    },
  });

export const featuredTournamentQuery = queryOptions({
  queryKey: ["tournament", "featured"],
  queryFn: async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*, tournament_categories(*)")
      .in("status", ["published", "ongoing"])
      .order("start_date", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  },
});

export const tournamentsQuery = queryOptions({
  queryKey: ["tournaments"],
  queryFn: async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("*")
      .in("status", ["published", "ongoing", "completed"])
      .order("start_date", { ascending: false });
    return data ?? [];
  },
});

export const tournamentBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["tournament", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("tournaments")
        .select("*, tournament_categories(*)")
        .eq("slug", slug)
        .maybeSingle();
      return data;
    },
  });

export const sponsorsQuery = queryOptions({
  queryKey: ["sponsors"],
  queryFn: async () => {
    const { data } = await supabase
      .from("sponsors")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    return data ?? [];
  },
});

export const mediaQuery = queryOptions({
  queryKey: ["media"],
  queryFn: async () => {
    const { data } = await supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    return data ?? [];
  },
});

export const standingsQuery = (tournamentId: string) =>
  queryOptions({
    queryKey: ["standings", tournamentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("standings")
        .select("*, player:players(id, full_name, city, rating, slug)")
        .eq("tournament_id", tournamentId)
        .order("rank", { ascending: true });
      return data ?? [];
    },
  });

export const playerBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["player", slug],
    queryFn: async () => {
      const { data } = await supabase.from("players").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

export const playerHistoryQuery = (playerId: string) =>
  queryOptions({
    queryKey: ["player", playerId, "history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registrations")
        .select("id, status, tournament:tournaments(id,name,slug,start_date)")
        .eq("player_id", playerId)
        .eq("is_draft", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });
