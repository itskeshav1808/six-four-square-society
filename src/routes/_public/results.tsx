import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { tournamentsQuery, standingsQuery } from "@/lib/supabase-queries";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_public/results")({
  head: () => ({ meta: [{ title: "Results & Standings — 64 Squares Society" }] }),
  loader: ({ context }) => { context.queryClient.ensureQueryData(tournamentsQuery); },
  component: () => {
    const { data: tournaments } = useSuspenseQuery(tournamentsQuery);
    const active = tournaments.find((t) => t.status === "ongoing") ?? tournaments[0];
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="font-display text-5xl font-semibold">Results & Standings</h1>
        <p className="mt-2 text-muted-foreground">Live standings update automatically during tournaments.</p>
        {active ? <LiveStandings tournament={active} /> : <div className="mt-8 text-muted-foreground">No tournaments yet.</div>}
        <div className="mt-10 flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <Link key={t.id} to="/tournaments/$slug" params={{ slug: t.slug }} className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-accent/20">{t.name}</Link>
          ))}
        </div>
      </div>
    );
  },
});

function LiveStandings({ tournament }: { tournament: any }) {
  const { data, refetch } = useSuspenseQuery(standingsQuery(tournament.id));
  useEffect(() => {
    const ch = supabase.channel(`standings-${tournament.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "standings", filter: `tournament_id=eq.${tournament.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [tournament.id, refetch]);
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl">{tournament.name}</h2>
      {data.length === 0 ? (
        <div className="mt-4 text-muted-foreground">Standings will appear once the tournament begins.</div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left"><tr>
              <th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">City</th><th className="p-3">Points</th>
            </tr></thead>
            <tbody>
              {data.map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3 font-medium">#{s.rank}</td>
                  <td className="p-3">{s.player?.slug ? <Link to="/players/$slug" params={{ slug: s.player.slug }} className="hover:underline">{s.player.full_name}</Link> : s.player?.full_name}</td>
                  <td className="p-3">{s.player?.city}</td>
                  <td className="p-3 text-gold font-medium">{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
